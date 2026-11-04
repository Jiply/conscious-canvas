import { v } from 'convex/values';
import { decisionFields } from './schema';
import { query, mutation } from './_generated/server';

export const addDecision = mutation({
  args: {
    agentId: v.id('agents'),
    action: decisionFields.action,
    targetPlaceId: v.optional(v.id('places')),
    targetAgentId: v.optional(v.id('agents')),
    utterance: v.optional(v.string()),
    innerThought: v.optional(v.string()),
    llmLatencyMs: v.optional(v.number()),
  },
  returns: v.id('decisions'),
  handler: async (ctx, args) => {
    const decisionId = await ctx.db.insert('decisions', {
      agentId: args.agentId,
      action: args.action,
      targetPlaceId: args.targetPlaceId,
      targetAgentId: args.targetAgentId,
      utterance: args.utterance,
      innerThought: args.innerThought,
      completedAt: undefined,
      llmLatencyMs: args.llmLatencyMs,
    });

    const agent = await ctx.db.get(args.agentId);
    if (agent) {
      let description = `${agent.name} `;

      switch (args.action) {
        case 'MoveTo':
          const targetPlace = args.targetPlaceId ? await ctx.db.get(args.targetPlaceId) : null;
          description += `is heading to ${targetPlace?.name ?? 'somewhere'}`;
          break;
        case 'EngageConversation':
          const targetAgent = args.targetAgentId ? await ctx.db.get(args.targetAgentId) : null;
          description += `is chatting with ${targetAgent?.name ?? 'someone'}`;
          break;
        case 'Study':
          description += `is studying`;
          break;
        case 'Eat':
          description += `is grabbing a bite to eat`;
          break;
        case 'Sleep':
          description += `is going to sleep`;
          break;
        case 'Idle':
          description += `is taking a moment to think`;
          break;
      }

      if (args.innerThought) description += ` - "${args.innerThought}"`;

      await ctx.db.insert('events', {
        timestamp: Date.now(),
        type: 'decision',
        agentIds: [args.agentId],
        description,
        location: agent.pos,
        metadata: { placeId: args.targetPlaceId, severity: 'info' },
      });
    }

    return decisionId;
  },
});

export const completeDecision = mutation({
  args: { decisionId: v.id('decisions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.decisionId, { completedAt: Date.now() });

    return null;
  },
});

export const completeAllIncompleteDecisions = mutation({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const allDecisions = await ctx.db.query('decisions').collect();

    let count = 0;
    for (const decision of allDecisions) {
      if (decision.completedAt === undefined) {
        await ctx.db.patch(decision._id, { completedAt: Date.now() });
        count++;
      }
    }

    return count;
  },
});

export const getDecisionHistory = query({
  args: { agentId: v.id('agents'), limit: v.optional(v.number()) },
  returns: v.array(v.object({ _id: v.id('decisions'), _creationTime: v.number(), ...decisionFields })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query('decisions')
      .withIndex('by_agent', q => q.eq('agentId', args.agentId))
      .order('desc')
      .take(limit);
  },
});
