import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { messageFields, conversationFields } from './schema';

export const createConversation = mutation({
  args: { targetId: v.id('agents'), initiatorId: v.id('agents') },
  handler: async (ctx, args) => {
    const initiator = await ctx.db.get(args.initiatorId);
    const target = await ctx.db.get(args.targetId);
    if (!initiator || !target) throw new Error('One or both agents not found');

    const conversationId = await ctx.db.insert('conversations', {
      turnCount: 0,
      status: 'active',
      startedAt: Date.now(),
      location: initiator.pos,
      participantIds: [args.initiatorId, args.targetId],
    });

    await ctx.db.patch(args.initiatorId, { state: 'Interact', currentConversationId: conversationId });
    await ctx.db.patch(args.targetId, { state: 'Interact', currentConversationId: conversationId });
    return conversationId;
  },
  returns: v.id('conversations'),
});

export const addMessage = mutation({
  args: {
    content: v.string(),
    agentId: v.id('agents'),
    continueConversation: v.boolean(),
    conversationId: v.id('conversations'),
    reasonForLeaving: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error('Conversation not found');
    if (conversation.status !== 'active') throw new Error('Cannot add message to completed conversation');
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error('Agent not found');

    const messageId = await ctx.db.insert('messages', {
      agentId: args.agentId,
      content: args.content,
      conversationId: args.conversationId,
      reasonForLeaving: args.reasonForLeaving,
      continueConversation: args.continueConversation,
      emotionSnapshot: { valence: agent.emotions.valence, arousal: agent.emotions.arousal },
    });

    await ctx.db.patch(args.conversationId, { turnCount: conversation.turnCount + 1 });
    return messageId;
  },
  returns: v.id('messages'),
});

export const completeConversation = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error('Conversation not found');
    await ctx.db.patch(args.conversationId, { status: 'completed', completedAt: Date.now() });

    for (const participantId of conversation.participantIds) {
      const agent = await ctx.db.get(participantId);

      if (agent && agent.currentConversationId === args.conversationId)
        await ctx.db.patch(participantId, { state: 'Idle', currentConversationId: undefined });
    }

    return null;
  },
  returns: v.null(),
});

export const getConversationMessages = query({
  args: { conversationId: v.id('conversations') },
  returns: v.array(v.object({ _id: v.id('messages'), _creationTime: v.number(), ...messageFields })),
  handler: async (ctx, args) =>
    await ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect(),
});

export const getAgentActiveConversation = query({
  args: { agentId: v.id('agents') },
  returns: v.union(v.object({ _creationTime: v.number(), _id: v.id('conversations'), ...conversationFields }), v.null()),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || !agent.currentConversationId) return null;
    return await ctx.db.get(agent.currentConversationId);
  },
});

export const getRecentConversations = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query('conversations').order('desc').take(args.limit);
    const conversationsWithNames = [];

    for (const conversation of conversations) {
      const participantNames: Array<string> = [];

      for (const participantId of conversation.participantIds) {
        const agent = await ctx.db.get(participantId);
        if (agent) participantNames.push(agent.name);
      }

      conversationsWithNames.push({
        _id: conversation._id,
        status: conversation.status,
        startedAt: conversation.startedAt,
        turnCount: conversation.turnCount,
        completedAt: conversation.completedAt,
        _creationTime: conversation._creationTime,
        participantNames,
      });
    }

    return conversationsWithNames;
  },
  returns: v.array(
    v.object({
      _id: v.id('conversations'),
      status: conversationFields.status,
      startedAt: v.number(),
      turnCount: v.number(),
      completedAt: v.optional(v.number()),
      _creationTime: v.number(),
      participantNames: v.array(v.string()),
    })
  ),
});
