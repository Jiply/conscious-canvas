import { v } from 'convex/values';
import { decisionFields } from './schema';
import { query, mutation } from './_generated/server';

export const addDecision = mutation({
  args: {
    agentId: v.id('agents'),
    action: decisionFields.action,
    utterance: v.optional(v.string()),
    innerThought: v.optional(v.string()),
    llmLatencyMs: v.optional(v.number()),
    targetPlaceId: v.optional(v.id('places')),
    targetAgentId: v.optional(v.id('agents')),
  },
  handler: async (ctx, args) => {
    const decisionId = await ctx.db.insert('decisions', {
      action: args.action,
      agentId: args.agentId,
      completedAt: undefined,
      utterance: args.utterance,
      innerThought: args.innerThought,
      llmLatencyMs: args.llmLatencyMs,
      targetPlaceId: args.targetPlaceId,
      targetAgentId: args.targetAgentId,
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
          description += 'is studying';
          break;
        case 'Eat':
          description += 'is grabbing a bite to eat';
          break;
        case 'Sleep':
          description += 'is going to sleep';
          break;
        case 'Idle':
          description += 'is taking a moment to think';
          break;
      }

      if (args.innerThought) description += ` - "${args.innerThought}"`;

      await ctx.db.insert('events', {
        description,
        type: 'decision',
        location: agent.pos,
        timestamp: Date.now(),
        agentIds: [args.agentId],
        metadata: { severity: 'info', placeId: args.targetPlaceId },
      });
    }

    return decisionId;
  },
  returns: v.id('decisions'),
});

export const completeDecision = mutation({
  args: { decisionId: v.id('decisions') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.decisionId, { completedAt: Date.now() });
    return null;
  },
  returns: v.null(),
});

export const completeAllIncompleteDecisions = mutation({
  args: {},
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
  returns: v.number(),
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
