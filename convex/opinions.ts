import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ========== MUTATIONS ==========

/**
 * Create or update an agent's opinion of another agent
 */
export const upsertOpinion = mutation({
  args: {
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    sentiment: v.number(),
    summary: v.string(),
    traits: v.optional(v.record(v.string(), v.number())),
  },
  returns: v.id("opinions"),
  handler: async (ctx, args) => {
    // Check if opinion already exists
    const existing = await ctx.db
      .query("opinions")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("targetAgentId", args.targetAgentId)
      )
      .unique();

    if (existing) {
      // Update existing opinion
      await ctx.db.patch(existing._id, {
        sentiment: args.sentiment,
        summary: args.summary,
        traits: args.traits,
      });
      return existing._id;
    } else {
      // Create new opinion
      const opinionId = await ctx.db.insert("opinions", {
        agentId: args.agentId,
        targetAgentId: args.targetAgentId,
        sentiment: args.sentiment,
        summary: args.summary,
        traits: args.traits,
      });
      return opinionId;
    }
  },
});

/**
 * Update opinion based on conversation (merge with existing)
 * This is called after a conversation tool call
 */
export const updateOpinionFromConversation = mutation({
  args: {
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    conversationSummary: v.string(),
    sentimentDelta: v.number(), // -1 to 1, how much sentiment changed
    newTraits: v.optional(v.record(v.string(), v.number())),
  },
  returns: v.id("opinions"),
  handler: async (ctx, args) => {
    // Get existing opinion or create default
    const existing = await ctx.db
      .query("opinions")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("targetAgentId", args.targetAgentId)
      )
      .unique();

    let newSentiment: number;
    let newSummary: string;
    let newTraits: Record<string, number> | undefined;

    if (existing) {
      // Merge with existing
      newSentiment = Math.max(
        -1,
        Math.min(1, existing.sentiment + args.sentimentDelta)
      );

      // Merge traits (average with new observations)
      if (args.newTraits) {
        newTraits = { ...(existing.traits ?? {}) };
        for (const [trait, value] of Object.entries(args.newTraits)) {
          const existingValue = newTraits[trait] ?? 0.5;
          newTraits[trait] = (existingValue + value) / 2; // simple average
        }
      } else {
        newTraits = existing.traits;
      }

      // Update summary with conversation context
      newSummary = `${existing.summary} Recently: ${args.conversationSummary}`;

      await ctx.db.patch(existing._id, {
        sentiment: newSentiment,
        summary: newSummary,
        traits: newTraits,
      });

      return existing._id;
    } else {
      // Create new opinion from conversation
      newSentiment = args.sentimentDelta;
      newSummary = args.conversationSummary;
      newTraits = args.newTraits;

      const opinionId = await ctx.db.insert("opinions", {
        agentId: args.agentId,
        targetAgentId: args.targetAgentId,
        sentiment: newSentiment,
        summary: newSummary,
        traits: newTraits,
      });

      return opinionId;
    }
  },
});

// ========== QUERIES ==========

/**
 * Get all opinions held by an agent
 */
export const getAgentOpinions = query({
  args: { agentId: v.id("agents") },
  returns: v.array(
    v.object({
      _id: v.id("opinions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetAgentId: v.id("agents"),
      sentiment: v.number(),
      summary: v.string(),
      traits: v.optional(v.record(v.string(), v.number())),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opinions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

/**
 * Get opinion of a specific target agent
 */
export const getOpinionOfTarget = query({
  args: {
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
  },
  returns: v.union(
    v.object({
      _id: v.id("opinions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetAgentId: v.id("agents"),
      sentiment: v.number(),
      summary: v.string(),
      traits: v.optional(v.record(v.string(), v.number())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opinions")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("targetAgentId", args.targetAgentId)
      )
      .unique();
  },
});

/**
 * Get all opinions about a target agent (what others think of them)
 */
export const getOpinionsAboutAgent = query({
  args: { targetAgentId: v.id("agents") },
  returns: v.array(
    v.object({
      _id: v.id("opinions"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetAgentId: v.id("agents"),
      sentiment: v.number(),
      summary: v.string(),
      traits: v.optional(v.record(v.string(), v.number())),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opinions")
      .withIndex("by_target", (q) => q.eq("targetAgentId", args.targetAgentId))
      .collect();
  },
});
