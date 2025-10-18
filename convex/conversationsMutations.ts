import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========== MUTATIONS ==========

/**
 * Create a new conversation between two agents
 * Called when an agent decides to EngageConversation
 */
export const createConversation = mutation({
  args: {
    initiatorId: v.id("agents"),
    targetId: v.id("agents"),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    // Get agent positions for location tracking
    const initiator = await ctx.db.get(args.initiatorId);
    const target = await ctx.db.get(args.targetId);

    if (!initiator || !target) {
      throw new Error("One or both agents not found");
    }

    // Create conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: [args.initiatorId, args.targetId],
      status: "active",
      startedAt: Date.now(),
      location: initiator.pos, // Use initiator's position
      turnCount: 0,
    });

    // Update both agents to reference this conversation
    await ctx.db.patch(args.initiatorId, {
      currentConversationId: conversationId,
      state: "Interact",
    });

    await ctx.db.patch(args.targetId, {
      currentConversationId: conversationId,
      state: "Interact",
    });

    return conversationId;
  },
});

/**
 * Add a message to an active conversation
 */
export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.id("agents"),
    content: v.string(),
    continueConversation: v.boolean(),
    reasonForLeaving: v.optional(v.string()),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.status !== "active") {
      throw new Error("Cannot add message to completed conversation");
    }

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Create message with emotion snapshot
    const messageId = await ctx.db.insert("messages", {
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

    // Increment turn count
    await ctx.db.patch(args.conversationId, {
      turnCount: conversation.turnCount + 1,
    });

    return messageId;
  },
});

/**
 * Complete a conversation and clean up agent references
 */
export const completeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Mark conversation as completed
    await ctx.db.patch(args.conversationId, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Clear conversation references from all participants
    for (const participantId of conversation.participantIds) {
      const agent = await ctx.db.get(participantId);
      if (agent && agent.currentConversationId === args.conversationId) {
        await ctx.db.patch(participantId, {
          currentConversationId: undefined,
          state: "Idle",
        });
      }
    }

    return null;
  },
});

// ========== QUERIES ==========

/**
 * Get all messages in a conversation (ordered by creation time)
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      conversationId: v.id("conversations"),
      agentId: v.id("agents"),
      content: v.string(),
      emotionSnapshot: v.optional(
        v.object({
          valence: v.number(),
          arousal: v.number(),
        })
      ),
      continueConversation: v.boolean(),
      reasonForLeaving: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get active conversation for an agent (if any)
 */
export const getAgentActiveConversation = query({
  args: {
    agentId: v.id("agents"),
  },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      participantIds: v.array(v.id("agents")),
      status: v.union(v.literal("active"), v.literal("completed")),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      location: v.optional(v.object({ x: v.number(), y: v.number() })),
      nearestPlaceId: v.optional(v.id("places")),
      turnCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || !agent.currentConversationId) {
      return null;
    }

    return await ctx.db.get(agent.currentConversationId);
  },
});

/**
 * Get all active conversations
 */
export const getActiveConversations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      participantIds: v.array(v.id("agents")),
      status: v.union(v.literal("active"), v.literal("completed")),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      location: v.optional(v.object({ x: v.number(), y: v.number() })),
      nearestPlaceId: v.optional(v.id("places")),
      turnCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});
