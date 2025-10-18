import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========== MUTATIONS ==========

/**
 * Create a new decision for an agent
 */
export const addDecision = mutation({
  args: {
    agentId: v.id("agents"),
    action: v.union(
      v.literal("MoveTo"),
      v.literal("EngageConversation"),
      v.literal("Study"),
      v.literal("Eat"),
      v.literal("Idle"),
      v.literal("Sleep")
    ),
    targetPlaceId: v.optional(v.id("places")),
    targetAgentId: v.optional(v.id("agents")),
    utterance: v.optional(v.string()),
    innerThought: v.optional(v.string()),
    llmLatencyMs: v.optional(v.number()),
  },
  returns: v.id("decisions"),
  handler: async (ctx, args) => {
    const decisionId = await ctx.db.insert("decisions", {
      agentId: args.agentId,
      action: args.action,
      targetPlaceId: args.targetPlaceId,
      targetAgentId: args.targetAgentId,
      utterance: args.utterance,
      innerThought: args.innerThought,
      completedAt: undefined, // in progress
      llmLatencyMs: args.llmLatencyMs,
    });

    // Get agent info for event logging
    const agent = await ctx.db.get(args.agentId);
    if (agent) {
      let description = `${agent.name} `;

      switch (args.action) {
        case "MoveTo":
          const targetPlace = args.targetPlaceId
            ? await ctx.db.get(args.targetPlaceId)
            : null;
          description += `is heading to ${targetPlace?.name ?? "somewhere"}`;
          break;
        case "EngageConversation":
          const targetAgent = args.targetAgentId
            ? await ctx.db.get(args.targetAgentId)
            : null;
          description += `is chatting with ${targetAgent?.name ?? "someone"}`;
          break;
        case "Study":
          description += `is studying`;
          break;
        case "Eat":
          description += `is grabbing a bite to eat`;
          break;
        case "Sleep":
          description += `is going to sleep`;
          break;
        case "Idle":
          description += `is taking a moment to think`;
          break;
      }

      if (args.innerThought) {
        description += ` - "${args.innerThought}"`;
      }

      // Log decision event
      await ctx.db.insert("events", {
        timestamp: Date.now(),
        type: "decision",
        agentIds: [args.agentId],
        description,
        location: agent.pos,
        metadata: {
          placeId: args.targetPlaceId,
          severity: "info",
        },
      });
    }

    return decisionId;
  },
});

/**
 * Mark a decision as completed
 */
export const completeDecision = mutation({
  args: {
    decisionId: v.id("decisions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.decisionId, {
      completedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Complete all incomplete decisions (migration/cleanup helper)
 */
export const completeAllIncompleteDecisions = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx, args) => {
    const allDecisions = await ctx.db.query("decisions").collect();

    let count = 0;
    for (const decision of allDecisions) {
      if (decision.completedAt === undefined) {
        await ctx.db.patch(decision._id, {
          completedAt: Date.now(),
        });
        count++;
      }
    }

    console.log(`✓ Completed ${count} stuck decisions`);
    return count;
  },
});

/**
 * Get or create the current decision for an agent
 * Returns the most recent in-progress decision, or null if none
 */
export const getCurrentDecision = query({
  args: { agentId: v.id("agents") },
  returns: v.union(
    v.object({
      _id: v.id("decisions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      action: v.union(
        v.literal("MoveTo"),
        v.literal("EngageConversation"),
        v.literal("Study"),
        v.literal("Eat"),
        v.literal("Idle"),
        v.literal("Sleep")
      ),
      targetPlaceId: v.optional(v.id("places")),
      targetAgentId: v.optional(v.id("agents")),
      utterance: v.optional(v.string()),
      innerThought: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      llmLatencyMs: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get most recent decision with completedAt = undefined
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_status", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    // Find first in-progress decision
    const inProgress = decisions.find((d) => d.completedAt === undefined);
    return inProgress ?? null;
  },
});

/**
 * Get recent decision history for an agent
 */
export const getDecisionHistory = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("decisions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      action: v.union(
        v.literal("MoveTo"),
        v.literal("EngageConversation"),
        v.literal("Study"),
        v.literal("Eat"),
        v.literal("Idle"),
        v.literal("Sleep")
      ),
      targetPlaceId: v.optional(v.id("places")),
      targetAgentId: v.optional(v.id("agents")),
      utterance: v.optional(v.string()),
      innerThought: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      llmLatencyMs: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("decisions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all active conversations (decisions where action is EngageConversation and not completed)
 */
export const getActiveConversations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("decisions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      action: v.union(
        v.literal("MoveTo"),
        v.literal("EngageConversation"),
        v.literal("Study"),
        v.literal("Eat"),
        v.literal("Idle"),
        v.literal("Sleep")
      ),
      targetPlaceId: v.optional(v.id("places")),
      targetAgentId: v.optional(v.id("agents")),
      utterance: v.optional(v.string()),
      innerThought: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      llmLatencyMs: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const allDecisions = await ctx.db.query("decisions").collect();

    return allDecisions.filter(
      (d) => d.action === "EngageConversation" && d.completedAt === undefined
    );
  },
});
