"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import Groq from "groq-sdk";

// ========== ACTIONS ==========

/**
 * Generate a new opinion using Groq LLM
 * Called when an agent observes someone they don't have an opinion about
 */
export const generateOpinion: any = internalAction({
  args: {
    observerAgentId: v.id("agents"),
    targetAgentId: v.id("agents"),
  },
  returns: v.id("opinions"),
  handler: async (ctx, args): Promise<any> => {
    // Get both agents' data
    const observer = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.observerAgentId,
    });
    const target = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.targetAgentId,
    });

    if (!observer || !target) {
      throw new Error("Agent not found");
    }

    // Get recent observations of the target by the observer
    const recentObservations = await ctx.runQuery(
      api.observations.getRecentObservations,
      {
        agentId: args.observerAgentId,
        limit: 5,
      }
    );

    const targetObservations = recentObservations.filter(
      (obs) => obs.targetId === args.targetAgentId
    );

    // Build prompt for Groq
    const systemPrompt = buildOpinionSystemPrompt();
    const userPrompt = buildOpinionUserPrompt(
      observer,
      target,
      targetObservations
    );

    // Call Groq API
    const opinion = await callGroqForOpinion(systemPrompt, userPrompt);

    // Store the opinion in the database
    const opinionId: any = await ctx.runMutation(api.opinions.upsertOpinion, {
      agentId: args.observerAgentId,
      targetAgentId: args.targetAgentId,
      sentiment: opinion.sentiment,
      summary: opinion.summary,
      traits: opinion.traits,
    });

    return opinionId;
  },
});

// ========== HELPER FUNCTIONS ==========

/**
 * Build system prompt for opinion generation
 */
function buildOpinionSystemPrompt(): string {
  return `You are generating first impressions and opinions for autonomous agents in a campus simulation.

Your job is to create a realistic opinion that one agent forms about another agent they've observed.

You must respond with ONLY a valid JSON object matching this exact schema:
{
  "sentiment": number, // -1 to 1 (-1 = strong dislike, 0 = neutral, 1 = strong like)
  "summary": "string", // 1-2 sentence summary of the opinion
  "traits": {
    "trait1": number, // 0 to 1, perceived strength of this trait
    "trait2": number,
    // Include 2-4 relevant personality traits
  }
}

Rules:
1. Base opinions on observable behavior, role, and personality
2. Be realistic - most first impressions are neutral to slightly positive
3. Consider role compatibility (students might admire profs, etc.)
4. Trait examples: "smart", "friendly", "organized", "energetic", "quiet", "focused", "approachable"
5. Keep summary concise and natural`;
}

/**
 * Build user prompt with agent context
 */
function buildOpinionUserPrompt(
  observer: any,
  target: any,
  observations: any[]
): string {
  const observationsSummary = observations
    .map((obs, idx) => `${idx + 1}. ${obs.summary || "Observed them"}`)
    .join("\n");

  return `
OBSERVER: ${observer.name}
ROLE: ${observer.role}
${observer.personality ? `PERSONALITY: ${observer.personality}` : ""}

OBSERVED TARGET: ${target.name}
TARGET ROLE: ${target.role}
${target.personality ? `TARGET PERSONALITY: ${target.personality}` : ""}

TARGET STATE: ${target.state}
TARGET EMOTIONS:
- Mood: ${target.emotions.valence > 0 ? "Positive" : "Negative"} (${target.emotions.valence.toFixed(2)})
- Energy: ${target.emotions.arousal > 0.5 ? "Energetic" : "Calm"} (${target.emotions.arousal.toFixed(2)})

RECENT OBSERVATIONS:
${observationsSummary || "Just noticed them for the first time"}

TASK: Generate ${observer.name}'s first impression and opinion of ${target.name}. Respond with JSON only.
  `.trim();
}

/**
 * Call Groq API to generate opinion
 */
async function callGroqForOpinion(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  sentiment: number;
  summary: string;
  traits: Record<string, number>;
}> {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No content in Groq response");
  }

  const parsed = JSON.parse(content);

  return {
    sentiment: Math.max(-1, Math.min(1, parsed.sentiment || 0)),
    summary: parsed.summary || "No strong opinion yet",
    traits: parsed.traits || {},
  };
}
