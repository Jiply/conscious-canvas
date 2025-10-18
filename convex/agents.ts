import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========== MUTATIONS ==========

/**
 * Create a new agent with default starting values
 */
export const createAgent = mutation({
  args: {
    name: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("prof"),
      v.literal("barista")
    ),
    personality: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    startPos: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  returns: v.id("agents"),
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert("agents", {
      name: args.name,
      role: args.role,
      personality: args.personality,
      profilePicture: args.profilePicture,

      // Default position (center of map if not specified)
      pos: args.startPos ?? { x: 40, y: 25 },
      headingRad: 0,
      path: undefined,

      // Default state
      state: "Idle",
      nextDecisionAt: Date.now() + 5000, // make decision in 5 seconds
      currentConversationId: undefined, // no conversation initially

      // Default emotions (neutral, calm)
      emotions: {
        valence: 0,
        arousal: 0.3,
      },

      // Default needs (moderate)
      needs: {
        sleepiness: 0.2,
        hunger: 0.3,
        studyPressure: 0.5,
        socialDrive: 0.4,
      },

      // Default goals
      goals: [
        { name: "maintain social connections", weight: 0.5 },
        { name: "succeed academically", weight: 0.6 },
        { name: "stay healthy", weight: 0.4 },
      ],
    });

    return agentId;
  },
});

/**
 * Update agent position and heading
 */
export const updateAgentPosition = mutation({
  args: {
    agentId: v.id("agents"),
    pos: v.object({ x: v.number(), y: v.number() }),
    headingRad: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.agentId, {
      pos: args.pos,
      headingRad: args.headingRad ?? agent.headingRad,
    });

    return null;
  },
});

/**
 * Update agent emotional state
 */
export const updateAgentEmotions = mutation({
  args: {
    agentId: v.id("agents"),
    valence: v.optional(v.number()),
    arousal: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.agentId, {
      emotions: {
        valence: args.valence ?? agent.emotions.valence,
        arousal: args.arousal ?? agent.emotions.arousal,
      },
    });

    return null;
  },
});

/**
 * Update agent needs (homeostasis tick)
 */
export const updateAgentNeeds = mutation({
  args: {
    agentId: v.id("agents"),
    needs: v.object({
      sleepiness: v.number(),
      hunger: v.number(),
      studyPressure: v.number(),
      socialDrive: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      needs: args.needs,
    });

    return null;
  },
});

/**
 * Set agent path (after pathfinding)
 */
export const setAgentPath = mutation({
  args: {
    agentId: v.id("agents"),
    path: v.array(v.object({ x: v.number(), y: v.number() })),
    state: v.union(
      v.literal("Idle"),
      v.literal("Transit"),
      v.literal("AtLocation"),
      v.literal("Interact"),
      v.literal("Sleep")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      path: args.path,
      state: args.state,
    });

    return null;
  },
});

/**
 * Clear agent path (when destination reached or interrupted)
 */
export const clearAgentPath = mutation({
  args: {
    agentId: v.id("agents"),
    newState: v.union(
      v.literal("Idle"),
      v.literal("Transit"),
      v.literal("AtLocation"),
      v.literal("Interact"),
      v.literal("Sleep")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      path: undefined,
      state: args.newState,
    });

    return null;
  },
});

/**
 * Update when agent should make next decision
 */
export const setNextDecisionTime = mutation({
  args: {
    agentId: v.id("agents"),
    nextDecisionAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      nextDecisionAt: args.nextDecisionAt,
    });

    return null;
  },
});

// ========== QUERIES ==========

/**
 * Get all agents
 */
export const listAgents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("agents"),
      _creationTime: v.number(),
      name: v.string(),
      role: v.union(
        v.literal("student"),
        v.literal("prof"),
        v.literal("barista")
      ),
      personality: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      pos: v.object({ x: v.number(), y: v.number() }),
      headingRad: v.number(),
      path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      state: v.union(
        v.literal("Idle"),
        v.literal("Transit"),
        v.literal("AtLocation"),
        v.literal("Interact"),
        v.literal("Sleep")
      ),
      nextDecisionAt: v.number(),
      currentConversationId: v.optional(v.id("conversations")),
      emotions: v.object({
        valence: v.number(),
        arousal: v.number(),
      }),
      needs: v.object({
        sleepiness: v.number(),
        hunger: v.number(),
        studyPressure: v.number(),
        socialDrive: v.number(),
      }),
      goals: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

/**
 * Get a single agent by ID
 */
export const getAgent = query({
  args: { agentId: v.id("agents") },
  returns: v.union(
    v.object({
      _id: v.id("agents"),
      _creationTime: v.number(),
      name: v.string(),
      role: v.union(
        v.literal("student"),
        v.literal("prof"),
        v.literal("barista")
      ),
      personality: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      pos: v.object({ x: v.number(), y: v.number() }),
      headingRad: v.number(),
      path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      state: v.union(
        v.literal("Idle"),
        v.literal("Transit"),
        v.literal("AtLocation"),
        v.literal("Interact"),
        v.literal("Sleep")
      ),
      nextDecisionAt: v.number(),
      currentConversationId: v.optional(v.id("conversations")),
      emotions: v.object({
        valence: v.number(),
        arousal: v.number(),
      }),
      needs: v.object({
        sleepiness: v.number(),
        hunger: v.number(),
        studyPressure: v.number(),
        socialDrive: v.number(),
      }),
      goals: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

/**
 * Get agents that need decisions (nextDecisionAt <= now)
 */
export const getAgentsNeedingDecisions = query({
  args: { now: v.number() },
  returns: v.array(v.id("agents")),
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();
    return agents
      .filter((agent) => agent.nextDecisionAt <= args.now)
      .map((agent) => agent._id);
  },
});

// ========== MIGRATION HELPERS ==========

/**
 * Migration: Add currentConversationId field to all existing agents
 * This can be safely run multiple times (idempotent)
 */
export const migrateAddConversationField = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    let count = 0;

    for (const agent of agents) {
      // Only update if the field doesn't exist (undefined check)
      if (!("currentConversationId" in agent)) {
        await ctx.db.patch(agent._id, {
          currentConversationId: undefined,
        });
        count++;
      }
    }

    console.log(
      `✓ Migrated ${count} agents to have currentConversationId field`
    );
    return count;
  },
});
