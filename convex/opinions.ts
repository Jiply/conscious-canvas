import { v } from 'convex/values';
import { opinionFields } from './schema';
import { query, mutation } from './_generated/server';

export const upsertOpinion = mutation({
  returns: v.id('opinions'),
  args: {
    summary: v.string(),
    sentiment: v.number(),
    agentId: v.id('agents'),
    targetAgentId: v.id('agents'),
    traits: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('opinions')
      .withIndex('by_pair', q => q.eq('agentId', args.agentId).eq('targetAgentId', args.targetAgentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { traits: args.traits, summary: args.summary, sentiment: args.sentiment });
      return existing._id;
    } else {
      const opinionId = await ctx.db.insert('opinions', {
        traits: args.traits,
        agentId: args.agentId,
        summary: args.summary,
        sentiment: args.sentiment,
        targetAgentId: args.targetAgentId,
      });
      return opinionId;
    }
  },
});

export const getAgentOpinions = query({
  args: { agentId: v.id('agents') },
  returns: v.array(v.object({ _id: v.id('opinions'), _creationTime: v.number(), ...opinionFields })),
  handler: async (ctx, args) =>
    await ctx.db
      .query('opinions')
      .withIndex('by_agent', q => q.eq('agentId', args.agentId))
      .collect(),
});
