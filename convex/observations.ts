import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const pruneObservations = mutation({
  returns: v.null(),
  args: { keepCount: v.number(), agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const observations = await ctx.db
      .query('observations')
      .withIndex('by_agent', q => q.eq('agentId', args.agentId))
      .order('desc')
      .collect();

    const toDelete = observations.slice(args.keepCount);
    for (const obs of toDelete) await ctx.db.delete(obs._id);

    return null;
  },
});

export const getRecentObservations = query({
  args: { agentId: v.id('agents'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query('observations')
      .withIndex('by_agent', q => q.eq('agentId', args.agentId))
      .order('desc')
      .take(limit);
  },
  returns: v.array(
    v.object({
      salience: v.number(),
      agentId: v.id('agents'),
      _id: v.id('observations'),
      _creationTime: v.number(),
      summary: v.optional(v.string()),
      distance: v.optional(v.number()),
      targetId: v.optional(v.id('agents')),
      location: v.object({ x: v.number(), y: v.number() }),
      targetType: v.union(v.literal('agent'), v.literal('place'), v.literal('event')),
    })
  ),
});
