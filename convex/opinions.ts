import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const existing = await ctx.db
      .query("opinions")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("targetAgentId", args.targetAgentId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sentiment: args.sentiment,
        summary: args.summary,
        traits: args.traits,
      });
      return existing._id;
    } else {
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
