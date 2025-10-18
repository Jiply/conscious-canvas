"use node";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

// ========== LLM DECISION MAKING ==========

/**
 * Make a decision for an agent using LLM
 * This calls Groq for fast microdecisions
 */
export const makeAgentDecision = action({
  args: {
    agentId: v.id("agents"),
  },
  returns: v.object({
    action: v.union(
      v.literal("MoveTo"),
      v.literal("EngageConversation"),
      v.literal("Study"),
      v.literal("Eat"),
      v.literal("Idle"),
      v.literal("Sleep")
    ),
    targetPlaceId: v.optional(v.id("places")),
    targetAgentId: v.optional(v.id("agents")),
    utterance: v.optional(v.string()),
    innerThought: v.optional(v.string()),
    emotionDelta: v.optional(
      v.object({
        valence: v.number(),
        arousal: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // 1. Gather context from Convex
    const agent = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const recentObservations = await ctx.runQuery(
      api.observations.getRecentObservations,
      {
        agentId: args.agentId,
        limit: 10,
      }
    );

    const recentDecisions = await ctx.runQuery(
      api.decisions.getDecisionHistory,
      {
        agentId: args.agentId,
        limit: 5,
      }
    );

    // 2. Build LLM prompt
    const prompt = buildDecisionPrompt(
      agent,
      recentObservations,
      recentDecisions
    );

    // 3. Call LLM (placeholder for now - you'll integrate Groq/OpenAI here)
    // For now, use a simple heuristic fallback
    const decision = heuristicFallback(agent);

    const latency = Date.now() - startTime;

    // 4. Record decision in Convex
    await ctx.runMutation(api.decisions.addDecision, {
      agentId: args.agentId,
      action: decision.action,
      targetPlaceId: decision.targetPlaceId,
      targetAgentId: decision.targetAgentId,
      utterance: decision.utterance,
      innerThought: decision.innerThought,
      llmLatencyMs: latency,
    });

    // 5. Update agent state
    if (decision.emotionDelta) {
      await ctx.runMutation(api.agents.updateAgentEmotions, {
        agentId: args.agentId,
        valence: agent.emotions.valence + decision.emotionDelta.valence,
        arousal: agent.emotions.arousal + decision.emotionDelta.arousal,
      });
    }

    // Schedule next decision (5-15 seconds from now)
    const nextDecisionDelay = 5000 + Math.random() * 10000;
    await ctx.runMutation(api.agents.setNextDecisionTime, {
      agentId: args.agentId,
      nextDecisionAt: Date.now() + nextDecisionDelay,
    });

    return decision;
  },
});

// ========== HELPER FUNCTIONS ==========

function buildDecisionPrompt(
  agent: any,
  observations: any[],
  decisions: any[]
): string {
  // TODO: Build proper prompt for Groq
  const observationsSummary = observations
    .map((o) => o.summary ?? "observed something")
    .join("; ");

  const recentActions = decisions
    .map(
      (d) => `${d.action} at ${new Date(d._creationTime).toLocaleTimeString()}`
    )
    .join("; ");

  return `
You are ${agent.name}, a ${agent.role} on campus.
${agent.personality ? `Personality: ${agent.personality}` : ""}

Current state:
- Location: (${agent.pos.x}, ${agent.pos.y})
- Mood: ${agent.emotions.valence > 0 ? "positive" : "negative"} (${agent.emotions.valence.toFixed(2)})
- Energy: ${(1 - agent.emotions.arousal).toFixed(2)}
- Hunger: ${agent.needs.hunger.toFixed(2)}
- Sleepiness: ${agent.needs.sleepiness.toFixed(2)}
- Study pressure: ${agent.needs.studyPressure.toFixed(2)}
- Social drive: ${agent.needs.socialDrive.toFixed(2)}

Recent observations:
${observationsSummary || "none"}

Recent actions:
${recentActions || "none"}

What should you do next? Choose one:
- MoveTo (specify place)
- EngageConversation (specify target agent)
- Study
- Eat
- Idle
- Sleep

Respond with your choice and any thoughts/utterances.
  `.trim();
}

/**
 * Heuristic fallback when LLM is unavailable or too slow
 */
function heuristicFallback(agent: any): {
  action: "MoveTo" | "EngageConversation" | "Study" | "Eat" | "Idle" | "Sleep";
  targetPlaceId?: any;
  targetAgentId?: any;
  utterance?: string;
  innerThought?: string;
  emotionDelta?: { valence: number; arousal: number };
} {
  const { needs } = agent;

  // Simple utility-based decision
  if (needs.hunger > 0.7) {
    return {
      action: "Eat",
      innerThought: "I'm really hungry, need to grab something to eat.",
      emotionDelta: { valence: 0.1, arousal: -0.1 },
    };
  }

  if (needs.sleepiness > 0.8) {
    return {
      action: "Sleep",
      innerThought: "So tired... need to rest.",
      emotionDelta: { valence: -0.1, arousal: -0.2 },
    };
  }

  if (needs.studyPressure > 0.6) {
    return {
      action: "Study",
      innerThought: "Better hit the books for a bit.",
      emotionDelta: { valence: -0.05, arousal: 0.1 },
    };
  }

  if (needs.socialDrive > 0.6) {
    return {
      action: "Idle",
      innerThought: "Maybe I should find someone to hang out with.",
      emotionDelta: { valence: 0, arousal: 0 },
    };
  }

  // Default: idle
  return {
    action: "Idle",
    innerThought: "Just taking a moment to myself.",
    emotionDelta: { valence: 0, arousal: -0.05 },
  };
}

/**
 * TODO: Integrate actual LLM call
 * Example with Groq (you'll need to add API key and install SDK):
 *
 * import Groq from "groq-sdk";
 *
 * async function callGroq(prompt: string) {
 *   const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
 *   const completion = await groq.chat.completions.create({
 *     messages: [{ role: "user", content: prompt }],
 *     model: "llama-3.3-70b-versatile",
 *     temperature: 0.7,
 *     max_tokens: 200,
 *   });
 *   return completion.choices[0].message.content;
 * }
 */
