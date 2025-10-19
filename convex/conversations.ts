"use node";
import Groq from "groq-sdk";
import { v } from "convex/values";
import { api } from "./_generated/api";
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
      // Log conversation thoughts and message for public display
      if ((response as any).thoughts) {
        console.log(
          `💭 ${agent.name} (thinking): ${(response as any).thoughts}`
        );
      }
      console.log(
        `💬 ${agent.name} → ${otherAgent.name}: "${response.message}"`
      );
    } catch (error) {
      response = fallbackConversationResponse(agent);
      console.log(
        `💬 ${agent.name} → ${otherAgent.name}: "${response.message}" (fallback)`
      );
    }

    const latency = Date.now() - startTime;

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
  return `You are a real human being partaking in campus life.
Now, you are talking in real lifeto someone else who can be found on campus.
Prefer lexically rich responses that take up few words and/or phrases, over verbose ones.
It is helpful to consider that slang, nuance, subtext, and other cues may be embedded in what others say to you.

You must respond with ONLY a valid JSON object matching this schema:
\`\`\`
{
  "thoughts": "string (your internal thoughts about context, subtext, literal meanings, etc.)",
  "message": "string (what you say to the other person)",
  "continueConversation": boolean (true if you want to keep talking, false if you need to leave),
  "reasonForLeaving": "string (optional, only if continueConversation is false)",
  "emotionDelta": {
    "valence": number (-0.2 to 0.2),
    "arousal": number (-0.2 to 0.2)
  }
}
\`\`\`

IMPORTANT RULES:
1. Use Theory of Mind to understand your conversation partner's emotions and intentions.
2. Keep your personal goals, beliefs, priorities, values, and personality in mind when responding.
3. Consider your basic biological needs (hunger, sleepiness, sexual arousal) a fundamental need that colors all your affect and state. If a need is urgent (> 0.8), you should politely end the conversation.
4. Consider your opinion of, relationship to, and overall knowledge of your conversation partner. Your response should reflect your attitude towards your conversation partner, at a given point in time, given all that you know.
5. If you have nothing more to say to your conversation partner (which can include not wanting to ask more questions), or the conversation feels done (judged generally by Grice's Maxims), set continueConversation to false, so you can go about your way.`;
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
  // Format conversation history with emotional context
  const conversationHistory = messages
    .map((msg, idx) => {
      const speaker = msg.agentId === agent._id ? "You" : otherAgent.name;
      const emotion = msg.emotionSnapshot
        ? ` [felt ${interpretValence(msg.emotionSnapshot.valence)}, ${interpretArousal(msg.emotionSnapshot.arousal)}]`
        : "";
      return `${idx + 1}. ${speaker}: "${msg.content}"${emotion}`;
    })
    .join("\n");

  // Format recent observations with salience
  const recentObservations = observations
    .slice(0, 5)
    .map((obs, idx) => {
      const salience = obs.salience > 0.7 ? "⭐ " : "";
      return `${salience}${obs.summary}`;
    })
    .join("\n  ");

  // Format recent decisions for context
  const recentDecisions = decisions
    .slice(0, 3)
    .map((d) => `${d.action}${d.innerThought ? ` ("${d.innerThought}")` : ""}`)
    .join(", ");

  // Interpret agent's current emotional state
  const myMood = interpretValence(agent.emotions.valence);
  const myEnergy = interpretArousal(agent.emotions.arousal);
  const emotionalState = `You feel ${myMood} and ${myEnergy}`;

  // Interpret other agent's emotional state (emotional contagion context)
  const theirMood = interpretValence(otherAgent.emotions.valence);
  const theirEnergy = interpretArousal(otherAgent.emotions.arousal);
  const theirEmotionalState = `They seem ${theirMood} and ${theirEnergy}`;

  // Format goals with weights
  const activeGoals = agent.goals
    .sort((a: any, b: any) => b.weight - a.weight)
    .slice(0, 3)
    .map((g: any) => `${g.name} (priority: ${(g.weight * 100).toFixed(0)}%)`)
    .join(", ");

  // Relationship dynamics (from opinion)
  let relationshipContext = "";
  if (opinion) {
    const sentiment = opinion.sentiment;
    if (sentiment > 0.6) {
      relationshipContext = `You genuinely like ${otherAgent.name} (sentiment: ${sentiment.toFixed(2)}). ${opinion.summary}`;
    } else if (sentiment > 0.2) {
      relationshipContext = `You feel neutral-positive toward ${otherAgent.name} (sentiment: ${sentiment.toFixed(2)}). ${opinion.summary}`;
    } else if (sentiment > -0.2) {
      relationshipContext = `You're unsure about ${otherAgent.name} (sentiment: ${sentiment.toFixed(2)}). ${opinion.summary}`;
    } else if (sentiment > -0.6) {
      relationshipContext = `You're not fond of ${otherAgent.name} (sentiment: ${sentiment.toFixed(2)}). ${opinion.summary}`;
    } else {
      relationshipContext = `You dislike ${otherAgent.name} (sentiment: ${sentiment.toFixed(2)}). ${opinion.summary}`;
    }
  } else {
    relationshipContext = `You have no strong opinion of ${otherAgent.name} yet. This is a chance to form an impression.`;
  }

  // Urgent needs warnings
  const urgentNeeds = [];
  if (agent.needs.hunger > 0.8)
    urgentNeeds.push("HUNGRY - You're starving and need food soon");
  if (agent.needs.sleepiness > 0.8)
    urgentNeeds.push("EXHAUSTED - You're extremely tired and need rest");
  if (agent.needs.studyPressure > 0.8)
    urgentNeeds.push("STRESSED - Academic pressure is crushing you");
  if (agent.needs.socialDrive > 0.8)
    urgentNeeds.push("LONELY - You desperately need social connection");

  const urgentWarning =
    urgentNeeds.length > 0
      ? `\nURGENT NEEDS:\n${urgentNeeds.map((n) => `  - ${n}`).join("\n")}\n`
      : "";

  return `
═══════════════════════════════════════════════════════════
YOU: ${agent.name} (${agent.role})
${agent.personality ? `PERSONALITY: ${agent.personality}` : ""}
═══════════════════════════════════════════════════════════

╔══ YOUR EMOTIONAL STATE ══╗
│ ${emotionalState}
│ • Mood: ${myMood} (valence: ${agent.emotions.valence.toFixed(2)})
│ • Energy: ${myEnergy} (arousal: ${agent.emotions.arousal.toFixed(2)})
╚═══════════════════════════╝

╔══ YOUR NEEDS ══╗
│ • Hunger: ${renderMeter(agent.needs.hunger)} ${agent.needs.hunger.toFixed(2)} ${agent.needs.hunger > 0.8 ? "🚨 CRITICAL" : agent.needs.hunger > 0.6 ? "⚠️ High" : ""}
│ • Sleepiness: ${renderMeter(agent.needs.sleepiness)} ${agent.needs.sleepiness.toFixed(2)} ${agent.needs.sleepiness > 0.8 ? "🚨 CRITICAL" : agent.needs.sleepiness > 0.6 ? "⚠️ High" : ""}
│ • Study Pressure: ${renderMeter(agent.needs.studyPressure)} ${agent.needs.studyPressure.toFixed(2)} ${agent.needs.studyPressure > 0.8 ? "🚨 CRITICAL" : agent.needs.studyPressure > 0.6 ? "⚠️ High" : ""}
│ • Social Drive: ${renderMeter(agent.needs.socialDrive)} ${agent.needs.socialDrive.toFixed(2)} ${agent.needs.socialDrive > 0.8 ? "🚨 Very High" : ""}
╚═════════════════╝
${urgentWarning}
╔══ YOUR GOALS ══╗
│ ${activeGoals || "No specific goals right now"}
╚═════════════════╝

═══════════════════════════════════════════════════════════
TALKING TO: ${otherAgent.name} (${otherAgent.role})
═══════════════════════════════════════════════════════════

╔══ THEIR EMOTIONAL STATE ══╗
│ ${theirEmotionalState}
│ • Mood: ${theirMood} (valence: ${otherAgent.emotions.valence.toFixed(2)})
│ • Energy: ${theirEnergy} (arousal: ${otherAgent.emotions.arousal.toFixed(2)})
╚════════════════════════════╝

╔══ YOUR RELATIONSHIP ══╗
│ ${relationshipContext}
╚════════════════════════╝

╔══ CONVERSATION HISTORY (${messages.length} messages) ══╗
${conversationHistory || "│ [Just started - no messages yet]"}
╚═══════════════════════════════════════════════════════╝

╔══ RECENT OBSERVATIONS ══╗
${recentObservations ? `  ${recentObservations}` : "  Nothing notable recently"}
╚══════════════════════════╝

╔══ YOUR RECENT ACTIONS ══╗
│ ${recentDecisions || "No recent actions"}
╚══════════════════════════╝

═══════════════════════════════════════════════════════════
TASK: Respond naturally to this conversation based on:
• Your emotional state and how you're feeling RIGHT NOW
• Your relationship with ${otherAgent.name} and your opinion of them
• Your current needs (especially if any are urgent)
• What they just said and how they seem to be feeling
• Your personality and goals
• Whether you want to continue talking or need to leave

Consider emotional contagion - their ${theirMood} ${theirEnergy} energy may influence how you respond.
═══════════════════════════════════════════════════════════`.trim();
}

/**
 * Interpret valence value to human-readable mood
 */
function interpretValence(valence: number): string {
  if (valence > 0.6) return "very happy";
  if (valence > 0.3) return "content";
  if (valence > 0.1) return "slightly positive";
  if (valence > -0.1) return "neutral";
  if (valence > -0.3) return "slightly down";
  if (valence > -0.6) return "unhappy";
  return "very upset";
}

/**
 * Interpret arousal value to human-readable energy level
 */
function interpretArousal(arousal: number): string {
  if (arousal > 0.8) return "extremely energized";
  if (arousal > 0.6) return "quite energetic";
  if (arousal > 0.4) return "alert";
  if (arousal > 0.2) return "relaxed";
  return "very calm";
}

/**
 * Render a visual meter for needs
 */
function renderMeter(value: number): string {
  const filled = Math.round(value * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
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

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 200,
    temperature: 1.0,
    model: "moonshotai/kimi-k2-instruct",
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
