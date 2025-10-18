import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// ========== CONSTANTS ==========

const VISION_WIDTH = 7; // tiles wide (perpendicular to heading)
const VISION_DEPTH = 20; // tiles deep (in direction of heading)
const TALKING_RANGE = 2; // tiles
const STALE_LOCK_TIMEOUT = 30000; // 30 seconds

// ========== MAIN HEARTBEAT ==========

/**
 * Main heartbeat tick - processes all agents in parallel
 * Called by frontend leader every 5 seconds
 */
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

    // 1. Get or create heartbeat state (singleton)
    let state = await ctx.db.query("heartbeat_state").first();

    if (!state) {
      // First person to connect → become leader
      const stateId = await ctx.db.insert("heartbeat_state", {
        isRunning: false,
        currentLeaderId: args.leaderId,
        lastStartedAt: 0,
        lastCompletedAt: 0,
      });
      state = await ctx.db.get(stateId);
      if (!state) throw new Error("Failed to create heartbeat state");
    }

    // 2. Check if caller is the leader
    if (state.currentLeaderId !== args.leaderId) {
      return {
        success: false,
        processedAgents: 0,
        latencyMs: 0,
        isLeader: false,
      };
    }

    // 3. Check if already running
    if (state.isRunning) {
      // Check for stale lock (leader crashed)
      if (Date.now() - state.lastStartedAt > STALE_LOCK_TIMEOUT) {
        // Reset stale lock
        await ctx.db.patch(state._id, { isRunning: false });
      } else {
        // Still running, throw error so client retries in 1s
        throw new Error("Heartbeat already running");
      }
    }

    // 4. Acquire lock
    await ctx.db.patch(state._id, {
      isRunning: true,
      lastStartedAt: Date.now(),
    });

    try {
      // 5. Get all agents
      const agents = await ctx.db.query("agents").collect();

      // 6. Process all agents IN PARALLEL
      await Promise.all(
        agents.map((agent) => processAgentTick(ctx, agent, agents))
      );

      // 7. Update needs for all agents (homeostasis)
      // IMPORTANT: Fetch fresh agent data since processAgentTick may have modified needs
      const freshAgents = await ctx.db.query("agents").collect();
      await Promise.all(freshAgents.map((agent) => updateAgentNeeds(ctx, agent)));

      // 8. Release lock
      await ctx.db.patch(state._id, {
        isRunning: false,
        lastCompletedAt: Date.now(),
      });

      console.log(`🌍 World RUNNING: Processed ${agents.length} agents`);

      return {
        success: true,
        processedAgents: agents.length,
        latencyMs: Date.now() - startTime,
        isLeader: true,
      };
    } catch (error) {
      // Release lock on error
      await ctx.db.patch(state._id, { isRunning: false });
      throw error;
    }
  },
});

// ========== AGENT PROCESSING ==========

/**
 * Process one agent's perception → opinion → decision pipeline
 */
async function processAgentTick(
  ctx: any,
  agent: Doc<"agents">,
  allAgents: Doc<"agents">[]
) {
  // 1. PERCEPTION: Find agents in rectangular field of view with occlusion
  const visibleAgents = await getAgentsInVision(ctx, agent, allAgents);

  // 2. OBSERVATIONS: Record what agent sees
  const observations = visibleAgents.map((visible) => ({
    agentId: agent._id,
    targetId: visible.agent._id,
    targetType: "agent" as const,
    location: visible.agent.pos,
    distance: visible.distance,
    summary: `Saw ${visible.agent.name} at distance ${visible.distance.toFixed(1)} tiles`,
    salience: calculateSalience(visible.distance, visible.agent, agent),
  }));

  // Batch insert observations
  if (observations.length > 0) {
    await Promise.all(
      observations.map((obs) => ctx.db.insert("observations", obs))
    );
  }

  // Prune old observations (keep last 50)
  await pruneOldObservations(ctx, agent._id, 50);

  // 3. OPINIONS: Retrieve opinions for visible agents from database
  const visibleAgentIds = visibleAgents.map((v) => v.agent._id);

  // Get all opinions this agent has
  const allOpinions = await ctx.db
    .query("opinions")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
    .collect();

  // Filter to only opinions about visible agents
  const visibleOpinions = allOpinions.filter((op: any) =>
    visibleAgentIds.includes(op.targetAgentId)
  );

  // Log opinion retrieval
  console.log(
    `Agent ${agent.name} sees ${visibleAgents.length} agents, has ${visibleOpinions.length} opinions`
  );

  const nearbyAgents = visibleAgents.filter((v) => v.distance < TALKING_RANGE);

  // 3.5. CONVERSATION TURN: If agent is in active conversation, process conversation turn
  if (agent.currentConversationId) {
    await processConversationTurnForAgent(ctx, agent);
    return; // Skip other actions while in conversation
  }

  // 3.6. EXECUTE PREVIOUS DECISION: If agent has a path, walk along it
  if (agent.path && agent.path.length > 0) {
    await executePathMovement(ctx, agent);
    return; // Skip making new decision while executing path
  }

  // 4. DECISION: Decide what to do next (only if enough time has passed)
  const now = Date.now();
  if (now >= agent.nextDecisionAt) {
    await makeAgentDecision(
      ctx,
      agent,
      nearbyAgents,
      visibleAgents,
      visibleOpinions
    );
  } else {
    console.log(
      `⏰ ${agent.name} waiting for next decision (${Math.round((agent.nextDecisionAt - now) / 1000)}s remaining)`
    );
  }
}

/**
 * Update agent needs (simple decay towards baseline)
 */
async function updateAgentNeeds(ctx: any, agent: Doc<"agents">) {
  const TICK_INTERVAL = 5; // 5 real seconds
  const TIME_COMPRESSION = 20; // 20x faster than real-time
  const SIMULATED_SECONDS = TICK_INTERVAL * TIME_COMPRESSION; // 100 simulated seconds per tick
  const HOUR_IN_SECONDS = 3600;

  // Simple linear decay/growth rates (per simulated hour)
  // These happen 20x faster now, so agents get hungry/tired much quicker
  // Increased rates for more visible changes: 0→1 in ~2-3 minutes real time
  const hungerGrowthRate = 1.0 / HOUR_IN_SECONDS; // grow by 1.0 per hour (full in ~3 mins)
  const sleepinessGrowthRate = 0.8 / HOUR_IN_SECONDS; // grow by 0.8 per hour (full in ~4 mins)
  const studyPressureGrowthRate = 0.6 / HOUR_IN_SECONDS; // grow by 0.6 per hour (full in ~5 mins)
  const socialDriveGrowthRate = 0.5 / HOUR_IN_SECONDS; // grow by 0.5 per hour (full in ~6 mins)

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

  // Update needs only (movement will be handled by decision executor)
  await ctx.db.patch(agent._id, {
    needs: newNeeds,
  });
}

/**
 * Execute path movement - move agent one step along their path
 */
async function executePathMovement(ctx: any, agent: Doc<"agents">) {
  if (!agent.path || agent.path.length === 0) return;

  // Get the next position in the path (index 1, since index 0 is current position)
  const nextStep = agent.path.length > 1 ? agent.path[1] : agent.path[0];

  // Move agent to next position
  await ctx.db.patch(agent._id, {
    pos: { x: nextStep.x, y: nextStep.y },
    // Remove first step from path
    path: agent.path.slice(1),
  });

  console.log(
    `🚶 ${agent.name} moved to (${nextStep.x}, ${nextStep.y}), ${agent.path.length - 1} steps remaining`
  );

  // If path is now empty or has only 1 element (current position), reached destination
  if (agent.path.length <= 1) {
    await ctx.db.patch(agent._id, {
      path: undefined,
      state: "Idle",
    });
    console.log(`✅ ${agent.name} reached destination`);

    // Get the active decision to see what action to perform
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
      // Mark MoveTo as complete
      await ctx.db.patch(activeDecision._id, {
        completedAt: Date.now(),
      });
      console.log(`✓ Completed MoveTo decision for ${agent.name}`);

      // Now check if we should perform an action at this location
      if (activeDecision.targetPlaceId) {
        await performActionAtPlace(ctx, agent, activeDecision.targetPlaceId);
      }
    }
  }
}

/**
 * Check if agent is within a place's bounds
 */
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

/**
 * Perform action at a place (Eat at Café, Sleep at Dorm, Study at Library)
 */
async function performActionAtPlace(
  ctx: any,
  agent: Doc<"agents">,
  placeId: string
) {
  const place = await ctx.db.get(placeId);
  if (!place) {
    console.error(`❌ Place ${placeId} not found for ${agent.name}`);
    return;
  }

  // Check if agent is actually within the place bounds
  if (!isAgentInPlace(agent.pos, place.bounds)) {
    console.log(
      `⚠️ ${agent.name} is not within ${place.name} bounds (at ${agent.pos.x}, ${agent.pos.y}). Skipping action.`
    );
    return;
  }

  const placeKind = place.kind.toLowerCase();
  let actionPerformed = false;
  let decisionAction: "Eat" | "Sleep" | "Study" | null = null;
  const newNeeds = { ...agent.needs };

  // Determine action based on place type
  if (placeKind === "cafe" && agent.needs.hunger > 0.1) {
    // Eat at café - reduces hunger significantly
    newNeeds.hunger = Math.max(0, agent.needs.hunger - 0.4);
    decisionAction = "Eat";
    actionPerformed = true;
    console.log(
      `🍽️ ${agent.name} is eating at ${place.name} (hunger: ${agent.needs.hunger.toFixed(2)} → ${newNeeds.hunger.toFixed(2)})`
    );
  } else if (placeKind === "dorm" && agent.needs.sleepiness > 0.1) {
    // Sleep at dorm - reduces sleepiness significantly
    newNeeds.sleepiness = Math.max(0, agent.needs.sleepiness - 0.5);
    decisionAction = "Sleep";
    actionPerformed = true;
    console.log(
      `😴 ${agent.name} is sleeping at ${place.name} (sleepiness: ${agent.needs.sleepiness.toFixed(2)} → ${newNeeds.sleepiness.toFixed(2)})`
    );
  } else if (placeKind === "library" && agent.needs.studyPressure > 0.1) {
    // Study at library - reduces study pressure significantly
    newNeeds.studyPressure = Math.max(0, agent.needs.studyPressure - 0.3);
    decisionAction = "Study";
    actionPerformed = true;
    console.log(
      `📚 ${agent.name} is studying at ${place.name} (study pressure: ${agent.needs.studyPressure.toFixed(2)} → ${newNeeds.studyPressure.toFixed(2)})`
    );
  }

  // Update agent needs if action was performed
  if (actionPerformed && decisionAction) {
    await ctx.db.patch(agent._id, {
      needs: newNeeds,
    });

    // Create and immediately complete the action decision (Eat/Sleep/Study)
    const actionDecisionId = await ctx.db.insert("decisions", {
      agentId: agent._id,
      action: decisionAction,
      targetPlaceId: placeId,
      innerThought: `Performing ${decisionAction} at ${place.name}`,
      completedAt: Date.now(), // Complete immediately since action is instant
    });

    console.log(`✓ ${agent.name} completed ${decisionAction} action`);
  }
}

/**
 * Make a decision for the agent based on context
 */
async function makeAgentDecision(
  ctx: any,
  agent: Doc<"agents">,
  nearbyAgents: Array<{ agent: Doc<"agents">; distance: number }>,
  _visibleAgents: Array<{ agent: Doc<"agents">; distance: number }>,
  visibleOpinions: any[]
) {
  // Check if agent already has an active decision
  const activeDecision = await ctx.db
    .query("decisions")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
    .order("desc")
    .first();

  if (activeDecision && !activeDecision.completedAt) {
    // Already has active decision, skip for now
    console.log(
      `⏭️ ${agent.name} has active ${activeDecision.action} decision, skipping new decision`
    );
    return;
  }

  // Call LLM to make decision based on context
  // The LLM gets: agent stats, observations, decisions, opinions, available places
  console.log(
    `🧠 Scheduling LLM decision for ${agent.name} (${visibleOpinions.length} opinions, ${nearbyAgents.length} nearby agents)...`
  );

  try {
    await ctx.scheduler.runAfter(0, api.llm.makeAgentDecision, {
      agentId: agent._id,
    });
    console.log(`✅ LLM action scheduled for ${agent.name}`);
  } catch (error) {
    console.error(`❌ Error scheduling LLM decision for ${agent.name}:`, error);

    // Fallback to simple Idle decision if LLM fails
    const idleDecisionId = await ctx.db.insert("decisions", {
      agentId: agent._id,
      action: "Idle",
      innerThought: "Taking a moment to think...",
      completedAt: Date.now(), // Idle decisions complete immediately
    });
    console.log(`🔄 Created fallback Idle decision for ${agent.name}`);
  }
}

// ========== PERCEPTION SYSTEM ==========

/**
 * Get all agents visible to this agent (within FOV cone)
 */
/**
 * Get agents in rectangular field of view with line-of-sight occlusion
 * Vision is 20 tiles deep × 7 tiles wide in the direction agent is facing
 */
async function getAgentsInVision(
  ctx: any,
  agent: Doc<"agents">,
  allAgents: Doc<"agents">[]
): Promise<Array<{ agent: Doc<"agents">; distance: number }>> {
  const visible: Array<{ agent: Doc<"agents">; distance: number }> = [];

  // Direction vectors based on heading
  const headingX = Math.cos(agent.headingRad);
  const headingY = Math.sin(agent.headingRad);

  // Perpendicular vector (90 degrees counterclockwise)
  const perpX = -headingY;
  const perpY = headingX;

  for (const other of allAgents) {
    if (other._id === agent._id) continue; // Skip self

    // Vector from agent to target
    const dx = other.pos.x - agent.pos.x;
    const dy = other.pos.y - agent.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Project onto heading direction (forward distance)
    const forwardDist = dx * headingX + dy * headingY;

    // Project onto perpendicular direction (sideways distance)
    const sidewaysDist = Math.abs(dx * perpX + dy * perpY);

    // Check if within rectangular FOV
    if (forwardDist < 0 || forwardDist > VISION_DEPTH) continue; // Not in forward cone
    if (sidewaysDist > VISION_WIDTH / 2) continue; // Too far to the side

    // Check line of sight (occlusion by walls and other agents)
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

/**
 * Check if there's a clear line of sight between two points
 * Uses Bresenham's line algorithm and checks for:
 * 1. Non-walkable tiles (walls)
 * 2. Other agents blocking the view
 */
async function checkLineOfSight(
  ctx: any,
  from: { x: number; y: number },
  to: { x: number; y: number },
  allAgents: Doc<"agents">[],
  observerAgentId: Id<"agents">
): Promise<boolean> {
  // Bresenham's line algorithm
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
    // Don't check start and end points
    if ((x !== x0 || y !== y0) && (x !== x1 || y !== y1)) {
      // Check if this tile is walkable
      const tile = await ctx.db
        .query("map_tiles")
        .withIndex("by_coordinates", (q: any) => q.eq("x", x).eq("y", y))
        .first();

      if (tile && !tile.isWalkable) {
        return false; // Wall blocks line of sight
      }

      // Check if any agent is blocking at this position
      const blockingAgent = allAgents.find(
        (a) =>
          a._id !== observerAgentId &&
          Math.round(a.pos.x) === x &&
          Math.round(a.pos.y) === y
      );

      if (blockingAgent) {
        return false; // Agent blocks line of sight
      }
    }

    // Reached end point
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

  return true; // Clear line of sight
}

function getAgentsInFOV(
  agent: Doc<"agents">,
  allAgents: Doc<"agents">[]
): Array<{ agent: Doc<"agents">; distance: number }> {
  // This is now deprecated - using getAgentsInVision instead
  // Keeping for backwards compatibility temporarily
  return [];
}

/**
 * Process a conversation turn for an agent
 * Schedules the LLM action to generate next message
 */
async function processConversationTurnForAgent(ctx: any, agent: Doc<"agents">) {
  if (!agent.currentConversationId) return;

  // Schedule conversation turn processing (non-blocking)
  // This will call the LLM to generate the next message
  await ctx.scheduler.runAfter(
    0,
    internal.conversations.processConversationTurn,
    {
      agentId: agent._id,
      conversationId: agent.currentConversationId,
    }
  );

  console.log(`💬 Scheduled conversation turn for ${agent.name}`);
}

/**
 * Normalize angle to [-PI, PI]
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculate salience of an observation (how memorable it is)
 */
function calculateSalience(
  distance: number,
  target: Doc<"agents">,
  _observer: Doc<"agents">
): number {
  // Closer = more salient
  const distanceFactor = 1 - distance / VISION_DEPTH;

  // Emotional arousal of target increases salience
  const arousalFactor = target.emotions.arousal;

  // Base salience
  return Math.min(1, 0.3 + distanceFactor * 0.4 + arousalFactor * 0.3);
}

/**
 * Prune old observations, keep only the most recent N
 */
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

// ========== QUERIES ==========

/**
 * Get current heartbeat state (for UI display)
 */
export const getHeartbeatState = mutation({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("heartbeat_state"),
      _creationTime: v.number(),
      isRunning: v.boolean(),
      lastStartedAt: v.number(),
      lastCompletedAt: v.number(),
      currentLeaderId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await ctx.db.query("heartbeat_state").first();
  },
});
