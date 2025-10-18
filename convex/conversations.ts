"use node";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { internalAction } from "./_generated/server";

// ========== ACTIONS ==========

/**
 * Engage in a conversation between two agents
 * For now, just returns a placeholder conversation string
 * Later: Will use Groq to generate realistic dialogue based on personalities and opinions
 */
export const engageConversation: any = internalAction({
  args: {
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    utterance: v.optional(v.string()), // What the initiating agent says
  },
  returns: v.object({
    conversationSummary: v.string(),
    sentimentDelta: v.number(), // How much opinion changed (-1 to 1)
    newTraits: v.optional(v.record(v.string(), v.number())),
  }),
  handler: async (ctx, args): Promise<any> => {
    // Get both agents
    const agent: any = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.agentId,
    });
    const target: any = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.targetAgentId,
    });

    if (!agent || !target) {
      throw new Error("Agent not found");
    }

    // Placeholder conversation - will be replaced with Groq generation later
    const conversationSummary: string = `${agent.name}: "${args.utterance || "Hey there!"}"
${target.name}: "Hey ${agent.name}! How's it going?"
${agent.name}: "Pretty good! Just thought I'd say hi."
${target.name}: "Nice chatting with you!"`;

    // Simple sentiment delta (slightly positive for now)
    const sentimentDelta = 0.1;

    // Some discovered traits from the conversation
    const newTraits = {
      friendly: 0.8,
      approachable: 0.7,
    };

    return {
      conversationSummary,
      sentimentDelta,
      newTraits,
    };
  },
});

/**
 * Update opinion after conversation
 * This will be called after engageConversation completes
 */
export const updateOpinionFromConversation: any = internalAction({
  args: {
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    conversationSummary: v.string(),
    sentimentDelta: v.number(),
    newTraits: v.optional(v.record(v.string(), v.number())),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<any> => {
    // Get existing opinion (if any)
    const existingOpinion = await ctx.runQuery(
      api.opinions.getOpinionOfTarget,
      {
        agentId: args.agentId,
        targetAgentId: args.targetAgentId,
      }
    );

    if (existingOpinion) {
      // Update existing opinion
      await ctx.runMutation(api.opinions.updateOpinionFromConversation, {
        agentId: args.agentId,
        targetAgentId: args.targetAgentId,
        conversationSummary: args.conversationSummary,
        sentimentDelta: args.sentimentDelta,
        newTraits: args.newTraits,
      });

      console.log(
        `Updated ${args.agentId}'s opinion of ${args.targetAgentId} after conversation`
      );
    } else {
      // Create new opinion from conversation
      const sentiment = Math.max(-1, Math.min(1, args.sentimentDelta));

      await ctx.runMutation(api.opinions.upsertOpinion, {
        agentId: args.agentId,
        targetAgentId: args.targetAgentId,
        sentiment,
        summary: `First conversation: ${args.conversationSummary.slice(0, 100)}`,
        traits: args.newTraits,
      });

      console.log(
        `Created new opinion for ${args.agentId} about ${args.targetAgentId} from conversation`
      );
    }

    return null;
  },
});
