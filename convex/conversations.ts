"use node";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Groq from "groq-sdk";
import { internalAction } from "./_generated/server";

// ========== INTERNAL ACTIONS (LLM-POWERED) ==========

/**
 * Process a conversation turn for an agent
 * This is called by the heartbeat system for agents in active conversations
 */
export const processConversationTurn = internalAction({
  args: {
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
  },
  returns: v.object({
    continueConversation: v.boolean(),
    messageContent: v.string(),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // 1. Gather context
    const agent = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const conversation = await ctx.runQuery(
      api.conversationsMutations.getAgentActiveConversation,
      {
        agentId: args.agentId,
      }
    );
    if (!conversation) throw new Error("No active conversation");

    // Get conversation history
    const messages = await ctx.runQuery(
      api.conversationsMutations.getConversationMessages,
      {
        conversationId: args.conversationId,
      }
    );

    // Get the other participant
    const otherParticipantId = conversation.participantIds.find(
      (id) => id !== args.agentId
    );
    if (!otherParticipantId) throw new Error("No other participant found");

    const otherAgent = await ctx.runQuery(api.agents.getAgent, {
      agentId: otherParticipantId,
    });
    if (!otherAgent) throw new Error("Other agent not found");

    // Get opinion of the other agent
    const opinions = await ctx.runQuery(api.opinions.getAgentOpinions, {
      agentId: args.agentId,
    });
    const opinionOfOther = opinions.find(
      (op) => op.targetAgentId === otherParticipantId
    );

    // Get recent observations
    const observations = await ctx.runQuery(
      api.observations.getRecentObservations,
      {
        agentId: args.agentId,
        limit: 5,
      }
    );

    // Get recent decisions
    const decisions = await ctx.runQuery(api.decisions.getDecisionHistory, {
      agentId: args.agentId,
      limit: 3,
    });

    console.log(
      `💬 Processing conversation turn for ${agent.name} with ${otherAgent.name}`
    );

    // 2. Call LLM to generate next message
    let response;
    try {
      response = await generateConversationMessage(
        agent,
        otherAgent,
        opinionOfOther,
        messages,
        observations,
        decisions
      );
      console.log(
        `✅ LLM response: "${response.message}" (continue: ${response.continueConversation})`
      );
    } catch (error) {
      console.error(`❌ LLM error for ${agent.name}, using fallback:`, error);
      response = fallbackConversationResponse(agent);
    }

    const latency = Date.now() - startTime;
    console.log(`⏱️  Conversation turn latency: ${latency}ms`);

    // 3. Add message to conversation
    await ctx.runMutation(api.conversationsMutations.addMessage, {
      conversationId: args.conversationId,
      agentId: args.agentId,
      content: response.message,
      continueConversation: response.continueConversation,
      reasonForLeaving: response.reasonForLeaving,
    });

    // 4. Update emotion if provided
    if (response.emotionDelta) {
      await ctx.runMutation(api.agents.updateAgentEmotions, {
        agentId: args.agentId,
        valence: Math.max(
          -1,
          Math.min(1, agent.emotions.valence + response.emotionDelta.valence)
        ),
        arousal: Math.max(
          0,
          Math.min(1, agent.emotions.arousal + response.emotionDelta.arousal)
        ),
      });
    }

    // 5. If agent wants to leave, complete the conversation
    if (!response.continueConversation) {
      await ctx.runMutation(api.conversationsMutations.completeConversation, {
        conversationId: args.conversationId,
      });
      console.log(
        `👋 ${agent.name} left conversation: ${response.reasonForLeaving}`
      );
    }

    return {
      continueConversation: response.continueConversation,
      messageContent: response.message,
    };
  },
});

// ========== HELPER FUNCTIONS ==========

/**
 * Build system prompt for conversation
 */
function buildConversationSystemPrompt(): string {
  return `You are an autonomous agent in a campus simulation having a conversation with another agent.

You must respond with ONLY a valid JSON object matching this schema:
{
  "message": "string (what you say to the other person)",
  "continueConversation": boolean (true if you want to keep talking, false if you need to leave),
  "reasonForLeaving": "string (optional, only if continueConversation is false)",
  "emotionDelta": {
    "valence": number (-0.2 to 0.2),
    "arousal": number (-0.2 to 0.2)
  }
}

IMPORTANT RULES:
1. Be natural and conversational. Respond to what the other person said.
2. Keep messages relatively short (1-3 sentences).
3. Consider your needs (hunger, sleepiness, etc.). If a need is urgent (> 0.8), you should politely end the conversation.
4. Consider your opinion of the other person. Be friendly or distant based on your sentiment toward them.
5. Use your personality to guide your responses.
6. If you have nothing more to say or the conversation feels done, set continueConversation to false.`;
}

/**
 * Build user prompt for conversation turn
 */
function buildConversationPrompt(
  agent: any,
  otherAgent: any,
  opinion: any,
  messages: any[],
  observations: any[],
  decisions: any[]
): string {
  // Format conversation history
  const conversationHistory = messages
    .map((msg, idx) => {
      const speaker = msg.agentId === agent._id ? "You" : otherAgent.name;
      return `${idx + 1}. ${speaker}: "${msg.content}"`;
    })
    .join("\n");

  // Format recent context
  const recentObservations = observations
    .slice(0, 3)
    .map((obs) => obs.summary)
    .join("; ");

  return `
YOU: ${agent.name}
YOUR ROLE: ${agent.role}
${agent.personality ? `YOUR PERSONALITY: ${agent.personality}` : ""}

TALKING TO: ${otherAgent.name} (${otherAgent.role})
${opinion ? `YOUR OPINION OF THEM: ${opinion.summary} (sentiment: ${opinion.sentiment.toFixed(2)})` : "No strong opinion yet"}

YOUR CURRENT STATE:
- Hunger: ${agent.needs.hunger.toFixed(2)} ${agent.needs.hunger > 0.8 ? "(URGENT!)" : ""}
- Sleepiness: ${agent.needs.sleepiness.toFixed(2)} ${agent.needs.sleepiness > 0.8 ? "(URGENT!)" : ""}
- Study Pressure: ${agent.needs.studyPressure.toFixed(2)} ${agent.needs.studyPressure > 0.8 ? "(URGENT!)" : ""}
- Social Drive: ${agent.needs.socialDrive.toFixed(2)}
- Mood: ${agent.emotions.valence.toFixed(2)} (${agent.emotions.valence > 0 ? "positive" : "negative"})

CONVERSATION SO FAR (${messages.length} messages):
${conversationHistory || "Just started"}

RECENT CONTEXT:
${recentObservations || "Nothing notable"}

TASK: Respond to the conversation naturally. Decide if you want to continue talking or need to leave.
  `.trim();
}

/**
 * Call Groq API for conversation message generation
 */
async function generateConversationMessage(
  agent: any,
  otherAgent: any,
  opinion: any,
  messages: any[],
  observations: any[],
  decisions: any[]
): Promise<{
  message: string;
  continueConversation: boolean;
  reasonForLeaving?: string;
  emotionDelta?: { valence: number; arousal: number };
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = buildConversationSystemPrompt();
  const userPrompt = buildConversationPrompt(
    agent,
    otherAgent,
    opinion,
    messages,
    observations,
    decisions
  );

  console.log(`📤 Calling Groq for conversation turn...`);

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "kimi-k2",
    temperature: 1.0,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No content in Groq response");
  }

  const parsed = JSON.parse(content);

  return {
    message: parsed.message || "...",
    continueConversation: parsed.continueConversation ?? true,
    reasonForLeaving: parsed.reasonForLeaving,
    emotionDelta: parsed.emotionDelta || { valence: 0, arousal: 0 },
  };
}

/**
 * Fallback response when LLM fails
 */
function fallbackConversationResponse(agent: any): {
  message: string;
  continueConversation: boolean;
  reasonForLeaving?: string;
  emotionDelta: { valence: number; arousal: number };
} {
  const { needs } = agent;

  // Check if urgent needs require leaving
  if (needs.hunger > 0.8) {
    return {
      message: "Sorry, I really need to grab some food. Talk later!",
      continueConversation: false,
      reasonForLeaving: "Urgent hunger",
      emotionDelta: { valence: -0.1, arousal: 0.1 },
    };
  }

  if (needs.sleepiness > 0.8) {
    return {
      message: "I'm really tired, I should go rest. Catch you later!",
      continueConversation: false,
      reasonForLeaving: "Urgent sleepiness",
      emotionDelta: { valence: -0.1, arousal: -0.1 },
    };
  }

  if (needs.studyPressure > 0.8) {
    return {
      message: "I need to hit the books. See you around!",
      continueConversation: false,
      reasonForLeaving: "Urgent study pressure",
      emotionDelta: { valence: -0.05, arousal: 0.05 },
    };
  }

  // Default: continue conversation
  return {
    message: "Yeah, I hear you.",
    continueConversation: true,
    emotionDelta: { valence: 0, arousal: 0 },
  };
}
