import { v } from 'convex/values';
import { conversationFields, messageFields } from './schema';
import { mutation, query } from './_generated/server';

export const createConversation = mutation({
  args: {
    initiatorId: v.id('agents'),
    targetId: v.id('agents'),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args) => {
    const initiator = await ctx.db.get(args.initiatorId);
    const target = await ctx.db.get(args.targetId);

    if (!initiator || !target) throw new Error('One or both agents not found');

    const conversationId = await ctx.db.insert('conversations', {
      participantIds: [args.initiatorId, args.targetId],
      status: 'active',
      startedAt: Date.now(),
      location: initiator.pos,
      turnCount: 0,
    });

    await ctx.db.patch(args.initiatorId, {
      currentConversationId: conversationId,
      state: 'Interact',
    });

    await ctx.db.patch(args.targetId, {
      currentConversationId: conversationId,
      state: 'Interact',
    });

    return conversationId;
  },
});

export const addMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    agentId: v.id('agents'),
    content: v.string(),
    continueConversation: v.boolean(),
    reasonForLeaving: v.optional(v.string()),
  },
  returns: v.id('messages'),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    if (conversation.status !== 'active') throw new Error('Cannot add message to completed conversation');

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error('Agent not found');

    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      agentId: args.agentId,
      content: args.content,
      emotionSnapshot: {
        valence: agent.emotions.valence,
        arousal: agent.emotions.arousal,
      },
      continueConversation: args.continueConversation,
      reasonForLeaving: args.reasonForLeaving,
    });

    await ctx.db.patch(args.conversationId, {
      turnCount: conversation.turnCount + 1,
    });

    return messageId;
  },
});

export const completeConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    await ctx.db.patch(args.conversationId, {
      status: 'completed',
      completedAt: Date.now(),
    });

    for (const participantId of conversation.participantIds) {
      const agent = await ctx.db.get(participantId);
      if (agent && agent.currentConversationId === args.conversationId) {
        await ctx.db.patch(participantId, {
          currentConversationId: undefined,
          state: 'Idle',
        });
      }
    }

    return null;
  },
});

export const getConversationMessages = query({
  args: {
    conversationId: v.id('conversations'),
  },
  returns: v.array(v.object({ _id: v.id('messages'), _creationTime: v.number(), ...messageFields })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();
  },
});

export const getAgentActiveConversation = query({
  args: {
    agentId: v.id('agents'),
  },
  returns: v.union(v.object({ _id: v.id('conversations'), _creationTime: v.number(), ...conversationFields }), v.null()),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || !agent.currentConversationId) return null;

    return await ctx.db.get(agent.currentConversationId);
  },
});

export const getRecentConversations = query({
  args: {
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('conversations'),
      _creationTime: v.number(),
      participantNames: v.array(v.string()),
      status: conversationFields.status,
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      turnCount: v.number(),
    })
  ),
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
        _creationTime: conversation._creationTime,
        participantNames,
        status: conversation.status,
        startedAt: conversation.startedAt,
        completedAt: conversation.completedAt,
        turnCount: conversation.turnCount,
      });
    }

    return conversationsWithNames;
  },
});
