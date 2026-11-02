import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

const VISION_WIDTH = 7;
const VISION_DEPTH = 20;
const TALKING_RANGE = 2;
const STALE_LOCK_TIMEOUT = 30000;

export const tick = mutation({
  args: { leaderId: v.string() },
  returns: v.object({
    success: v.boolean(),
    processedAgents: v.number(),
    latencyMs: v.number(),
    isLeader: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();

    let state = await ctx.db.query("heartbeat_state").first();

    if (!state) {
      const stateId = await ctx.db.insert("heartbeat_state", {
        isRunning: false,
        currentLeaderId: args.leaderId,
        lastStartedAt: 0,
        lastCompletedAt: 0,
      });
      state = await ctx.db.get(stateId);
      if (!state) throw new Error("Failed to create heartbeat state");
    }

    if (state.currentLeaderId !== args.leaderId) {
      return {
        success: false,
        processedAgents: 0,
        latencyMs: 0,
        isLeader: false,
      };
    }

    if (state.isRunning) {
      if (Date.now() - state.lastStartedAt > STALE_LOCK_TIMEOUT) {
        await ctx.db.patch(state._id, { isRunning: false });
      } else {
        throw new Error("Heartbeat already running");
      }
    }

    await ctx.db.patch(state._id, {
      isRunning: true,
      lastStartedAt: Date.now(),
    });

    try {
      const agents = await ctx.db.query("agents").collect();

      await Promise.all(
        agents.map((agent) => processAgentTick(ctx, agent, agents))
      );

      // processAgentTick may have modified needs, so re-read agents
      const freshAgents = await ctx.db.query("agents").collect();
      await Promise.all(
        freshAgents.map((agent) => updateAgentNeeds(ctx, agent))
      );

      await ctx.db.patch(state._id, {
        isRunning: false,
        lastCompletedAt: Date.now(),
      });

      return {
        success: true,
        processedAgents: agents.length,
        latencyMs: Date.now() - startTime,
        isLeader: true,
      };
    } catch (error) {
      await ctx.db.patch(state._id, { isRunning: false });
      throw error;
    }
  },
});

async function processAgentTick(
  ctx: any,
  agent: Doc<"agents">,
  allAgents: Doc<"agents">[]
) {
  const visibleAgents = await getAgentsInVision(ctx, agent, allAgents);

  const observations = visibleAgents.map((visible) => ({
    agentId: agent._id,
    targetId: visible.agent._id,
    targetType: "agent" as const,
    location: visible.agent.pos,
    distance: visible.distance,
    summary: `Saw ${visible.agent.name} at distance ${visible.distance.toFixed(1)} tiles`,
    salience: calculateSalience(visible.distance, visible.agent, agent),
  }));

  if (observations.length > 0) {
    await Promise.all(
      observations.map((obs) => ctx.db.insert("observations", obs))
    );

    for (const obs of observations) {
      console.log(`👁️  ${agent.name}: ${obs.summary}`);
    }
  }

  await pruneOldObservations(ctx, agent._id, 50);

  const visibleAgentIds = visibleAgents.map((v) => v.agent._id);

  const allOpinions = await ctx.db
    .query("opinions")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
    .collect();

  const visibleOpinions = allOpinions.filter((op: any) =>
    visibleAgentIds.includes(op.targetAgentId)
  );

  const nearbyAgents = visibleAgents.filter((v) => v.distance < TALKING_RANGE);

  if (agent.currentConversationId) {
    await processConversationTurnForAgent(ctx, agent);
    return;
  }

  if (agent.path && agent.path.length > 0) {
    await executePathMovement(ctx, agent);
    return;
  }

  const now = Date.now();
  if (now >= agent.nextDecisionAt) {
    await makeAgentDecision(
      ctx,
      agent,
      nearbyAgents,
      visibleAgents,
      visibleOpinions
    );
  }
}

async function updateAgentNeeds(ctx: any, agent: Doc<"agents">) {
  const TICK_INTERVAL = 5;
  const TIME_COMPRESSION = 2;
  const SIMULATED_SECONDS = TICK_INTERVAL * TIME_COMPRESSION;
  const HOUR_IN_SECONDS = 3600;

  const hungerGrowthRate = 0.01 / HOUR_IN_SECONDS;
  const sleepinessGrowthRate = 0.008 / HOUR_IN_SECONDS;
  const studyPressureGrowthRate = 0.005 / HOUR_IN_SECONDS;
  const socialDriveGrowthRate = 0.015 / HOUR_IN_SECONDS;

  const newNeeds = {
    hunger: Math.min(
      1,
      agent.needs.hunger + hungerGrowthRate * SIMULATED_SECONDS
    ),
    sleepiness: Math.min(
      1,
      agent.needs.sleepiness + sleepinessGrowthRate * SIMULATED_SECONDS
    ),
    studyPressure: Math.min(
      1,
      agent.needs.studyPressure + studyPressureGrowthRate * SIMULATED_SECONDS
    ),
    socialDrive: Math.min(
      1,
      agent.needs.socialDrive + socialDriveGrowthRate * SIMULATED_SECONDS
    ),
  };

  console.log(
    `🔄 ${agent.name} needs: hunger ${agent.needs.hunger.toFixed(3)} → ${newNeeds.hunger.toFixed(3)}, sleep ${agent.needs.sleepiness.toFixed(3)} → ${newNeeds.sleepiness.toFixed(3)}`
  );

  await ctx.db.patch(agent._id, {
    needs: newNeeds,
  });
}

async function executePathMovement(ctx: any, agent: Doc<"agents">) {
  if (!agent.path || agent.path.length === 0) return;

  const nextStep = agent.path.length > 1 ? agent.path[1] : agent.path[0];

  await ctx.db.patch(agent._id, {
    pos: { x: nextStep.x, y: nextStep.y },
    path: agent.path.slice(1),
  });

  if (agent.path.length <= 1) {
    await ctx.db.patch(agent._id, {
      path: undefined,
      state: "Idle",
    });

    const activeDecision = await ctx.db
      .query("decisions")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .order("desc")
      .first();

    if (
      activeDecision &&
      !activeDecision.completedAt &&
      activeDecision.action === "MoveTo"
    ) {
      await ctx.db.patch(activeDecision._id, {
        completedAt: Date.now(),
      });

      if (activeDecision.targetPlaceId) await performActionAtPlace(ctx, agent, activeDecision.targetPlaceId);
    }
  }
}

function isAgentInPlace(
  agentPos: { x: number; y: number },
  placeBounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    agentPos.x >= placeBounds.x &&
    agentPos.x < placeBounds.x + placeBounds.width &&
    agentPos.y >= placeBounds.y &&
    agentPos.y < placeBounds.y + placeBounds.height
  );
}

async function performActionAtPlace(
  ctx: any,
  agent: Doc<"agents">,
  placeId: string
) {
  const place = await ctx.db.get(placeId);
  if (!place) return;

  if (!isAgentInPlace(agent.pos, place.bounds)) return;

  const placeKind = place.kind.toLowerCase();
  let actionPerformed = false;
  let decisionAction: "Eat" | "Sleep" | "Study" | null = null;
  const newNeeds = { ...agent.needs };

  if (placeKind === "cafe" && agent.needs.hunger > 0.1) {
    newNeeds.hunger = Math.max(0, agent.needs.hunger - 0.4);
    decisionAction = "Eat";
    actionPerformed = true;
  } else if (placeKind === "dorm" && agent.needs.sleepiness > 0.1) {
    newNeeds.sleepiness = Math.max(0, agent.needs.sleepiness - 0.5);
    decisionAction = "Sleep";
    actionPerformed = true;
  } else if (placeKind === "library" && agent.needs.studyPressure > 0.1) {
    newNeeds.studyPressure = Math.max(0, agent.needs.studyPressure - 0.3);
    decisionAction = "Study";
    actionPerformed = true;
  }

  if (actionPerformed && decisionAction) {
    await ctx.db.patch(agent._id, {
      needs: newNeeds,
    });

    console.log(`🍽️  ${agent.name}: ${decisionAction} at ${place.name}`);

    await ctx.db.insert("decisions", {
      agentId: agent._id,
      action: decisionAction,
      targetPlaceId: placeId,
      innerThought: `Performing ${decisionAction} at ${place.name}`,
      completedAt: Date.now(),
    });
  }
}

async function makeAgentDecision(
  ctx: any,
  agent: Doc<"agents">,
  nearbyAgents: Array<{ agent: Doc<"agents">; distance: number }>,
  _visibleAgents: Array<{ agent: Doc<"agents">; distance: number }>,
  visibleOpinions: any[]
) {
  const activeDecision = await ctx.db
    .query("decisions")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
    .order("desc")
    .first();

  if (activeDecision && !activeDecision.completedAt) return;

  try {
    await ctx.scheduler.runAfter(0, api.llm.makeAgentDecision, {
      agentId: agent._id,
    });
  } catch (error) {
    await ctx.db.insert("decisions", {
      agentId: agent._id,
      action: "Idle",
      innerThought: "Taking a moment to think...",
      completedAt: Date.now(),
    });
  }
}

async function getAgentsInVision(
  ctx: any,
  agent: Doc<"agents">,
  allAgents: Doc<"agents">[]
): Promise<Array<{ agent: Doc<"agents">; distance: number }>> {
  const visible: Array<{ agent: Doc<"agents">; distance: number }> = [];

  const headingX = Math.cos(agent.headingRad);
  const headingY = Math.sin(agent.headingRad);

  const perpX = -headingY;
  const perpY = headingX;

  for (const other of allAgents) {
    if (other._id === agent._id) continue;

    const dx = other.pos.x - agent.pos.x;
    const dy = other.pos.y - agent.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const forwardDist = dx * headingX + dy * headingY;

    const sidewaysDist = Math.abs(dx * perpX + dy * perpY);

    if (forwardDist < 0 || forwardDist > VISION_DEPTH) continue;
    if (sidewaysDist > VISION_WIDTH / 2) continue;

    const hasLineOfSight = await checkLineOfSight(
      ctx,
      agent.pos,
      other.pos,
      allAgents,
      agent._id
    );

    if (!hasLineOfSight) continue;

    visible.push({ agent: other, distance });
  }

  return visible;
}

async function checkLineOfSight(
  ctx: any,
  from: { x: number; y: number },
  to: { x: number; y: number },
  allAgents: Doc<"agents">[],
  observerAgentId: Id<"agents">
): Promise<boolean> {
  const x0 = Math.round(from.x);
  const y0 = Math.round(from.y);
  const x1 = Math.round(to.x);
  const y1 = Math.round(to.y);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    if ((x !== x0 || y !== y0) && (x !== x1 || y !== y1)) {
      const tile = await ctx.db
        .query("map_tiles")
        .withIndex("by_coordinates", (q: any) => q.eq("x", x).eq("y", y))
        .first();

      if (tile && !tile.isWalkable) return false;

      const blockingAgent = allAgents.find(
        (a) =>
          a._id !== observerAgentId &&
          Math.round(a.pos.x) === x &&
          Math.round(a.pos.y) === y
      );

      if (blockingAgent) return false;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return true;
}

async function processConversationTurnForAgent(ctx: any, agent: Doc<"agents">) {
  if (!agent.currentConversationId) return;

  await ctx.scheduler.runAfter(
    0,
    internal.conversations.processConversationTurn,
    {
      agentId: agent._id,
      conversationId: agent.currentConversationId,
    }
  );
}

function calculateSalience(
  distance: number,
  target: Doc<"agents">,
  _observer: Doc<"agents">
): number {
  const distanceFactor = 1 - distance / VISION_DEPTH;

  const arousalFactor = target.emotions.arousal;

  return Math.min(1, 0.3 + distanceFactor * 0.4 + arousalFactor * 0.3);
}

async function pruneOldObservations(
  ctx: any,
  agentId: Id<"agents">,
  keepCount: number
) {
  const observations = await ctx.db
    .query("observations")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
    .order("desc")
    .collect();

  const toDelete = observations.slice(keepCount);
  await Promise.all(toDelete.map((obs: any) => ctx.db.delete(obs._id)));
}

