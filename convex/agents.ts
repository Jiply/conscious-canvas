import { v } from 'convex/values';
import { agentFields } from './schema';
import { query, mutation } from './_generated/server';

export const updateAgentEmotions = mutation({
  returns: v.null(),
  args: { agentId: v.id('agents'), valence: v.optional(v.number()), arousal: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error('Agent not found');

    await ctx.db.patch(args.agentId, {
      emotions: { valence: args.valence ?? agent.emotions.valence, arousal: args.arousal ?? agent.emotions.arousal },
    });

    return null;
  },
});

export const setAgentPath = mutation({
  returns: v.null(),
  args: { agentId: v.id('agents'), state: agentFields.state, path: v.array(v.object({ x: v.number(), y: v.number() })) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, { path: args.path, state: args.state });

    return null;
  },
});

export const setNextDecisionTime = mutation({
  returns: v.null(),
  args: { agentId: v.id('agents'), nextDecisionAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, { nextDecisionAt: args.nextDecisionAt });

    return null;
  },
});

export const listAgents = query({
  args: {},
  returns: v.array(v.object({ _id: v.id('agents'), _creationTime: v.number(), ...agentFields })),
  handler: async ctx => await ctx.db.query('agents').collect(),
});

export const getAgent = query({
  args: { agentId: v.id('agents') },
  returns: v.union(v.object({ _id: v.id('agents'), _creationTime: v.number(), ...agentFields }), v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.agentId),
});

export const migrateAddConversationField = mutation({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const agents = await ctx.db.query('agents').collect();
    let count = 0;

    for (const agent of agents) {
      if (!('currentConversationId' in agent)) {
        await ctx.db.patch(agent._id, { currentConversationId: undefined });
        count++;
      }
    }

    return count;
  },
});
