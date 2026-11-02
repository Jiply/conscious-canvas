import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const pruneObservations = mutation({
  args: {
    agentId: v.id("agents"),
    keepCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const observations = await ctx.db
      .query("observations")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    const toDelete = observations.slice(args.keepCount);
    for (const obs of toDelete) {
      await ctx.db.delete(obs._id);
    }

    return null;
  },
});

export const getRecentObservations = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("observations"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetId: v.optional(v.id("agents")),
      targetType: v.union(
        v.literal("agent"),
        v.literal("place"),
        v.literal("event")
      ),
      location: v.object({ x: v.number(), y: v.number() }),
      distance: v.optional(v.number()),
      summary: v.optional(v.string()),
      salience: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("observations")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});
