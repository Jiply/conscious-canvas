"use node";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import Groq from "groq-sdk";

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

    console.log(`🚀 LLM action started for agent ${args.agentId}`);

    // 1. Gather context from Convex
    const agent = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    console.log(
      `📊 Making decision for ${agent.name} (hunger: ${agent.needs.hunger.toFixed(2)}, sleepiness: ${agent.needs.sleepiness.toFixed(2)})`
    );

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

    // Get all opinions this agent holds
    const agentOpinions = await ctx.runQuery(api.opinions.getAgentOpinions, {
      agentId: args.agentId,
    });

    // Get available places
    const allPlaces = await ctx.runQuery(api.map.getPlaces, {});

    // 2. Build LLM prompt with stats and consequences
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildDecisionPrompt(
      agent,
      recentObservations,
      recentDecisions,
      agentOpinions,
      allPlaces
    );

    // 3. Call Groq for decision-making
    let decision;
    try {
      console.log(`🤖 Calling Groq API for ${agent.name}...`);
      decision = await callGroqForDecision(systemPrompt, userPrompt);
      console.log(
        `✅ Groq returned decision: ${decision.action} (thought: "${decision.innerThought}")`
      );
    } catch (error) {
      console.error(
        `❌ Groq API error for ${agent.name}, falling back to heuristic:`,
        error
      );
      decision = heuristicFallback(agent);
      console.log(`🔄 Heuristic fallback decision: ${decision.action}`);
    }

    const latency = Date.now() - startTime;

    // 4. Record decision in Convex
    const decisionId = await ctx.runMutation(api.decisions.addDecision, {
      agentId: args.agentId,
      action: decision.action,
      targetPlaceId: decision.targetPlaceId,
      targetAgentId: decision.targetAgentId,
      utterance: decision.utterance,
      innerThought: decision.innerThought,
      llmLatencyMs: latency,
    });

    // 4.5. If decision is Idle, mark it as complete immediately
    if (decision.action === "Idle") {
      await ctx.runMutation(api.decisions.completeDecision, {
        decisionId,
      });
      console.log(`✓ Idle decision completed immediately for ${agent.name}`);
    }

    // 4.6. If decision is EngageConversation, create conversation
    if (decision.action === "EngageConversation" && decision.targetAgentId) {
      try {
        // Check if target agent is available (not already in a conversation)
        const targetAgent = await ctx.runQuery(api.agents.getAgent, {
          agentId: decision.targetAgentId,
        });

        if (targetAgent && !targetAgent.currentConversationId) {
          // Create conversation between the two agents
          const conversationId = await ctx.runMutation(api.conversationsMutations.createConversation, {
            initiatorId: args.agentId,
            targetId: decision.targetAgentId,
          });

          console.log(`💬 Created conversation ${conversationId} between ${agent.name} and ${targetAgent.name}`);

          // Complete the EngageConversation decision since conversation is now active
          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        } else {
          console.log(`❌ Cannot start conversation: ${targetAgent?.name} is already in a conversation`);
          // Mark decision as completed anyway
          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        }
      } catch (error) {
        console.error(`Error creating conversation:`, error);
      }
    }

    // 5. Execute MoveTo decision by calculating path
    if (decision.action === "MoveTo" && decision.targetPlaceId) {
      try {
        // Get the target place
        const targetPlace = allPlaces.find(
          (p) => p._id === decision.targetPlaceId
        );

        if (
          targetPlace &&
          targetPlace.entrances &&
          targetPlace.entrances.length > 0
        ) {
          const entrance = targetPlace.entrances[0];

          // Calculate path using A* pathfinding
          const path = await ctx.runQuery(api.pathfinding.findPath, {
            startX: agent.pos.x,
            startY: agent.pos.y,
            goalX: entrance.x,
            goalY: entrance.y,
          });

          if (path) {
            // Set the path on the agent
            await ctx.runMutation(api.agents.setAgentPath, {
              agentId: args.agentId,
              path,
              state: "Transit",
            });
            console.log(
              `🗺️ Set path for ${agent.name} to ${targetPlace.name} (${path.length} steps)`
            );
          } else {
            console.error(
              `❌ No path found for ${agent.name} to ${targetPlace.name}`
            );
          }
        }
      } catch (error) {
        console.error(`Error calculating path for MoveTo:`, error);
      }
    }

    // 6. Update agent state
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

/**
 * System prompt - defines the agent's decision-making framework
 */
function buildSystemPrompt(): string {
  return `You are an autonomous agent in a campus simulation. You must decide your next action based on your internal stats and environment.

You must respond with ONLY a valid JSON object matching this schema:
{
  "toolName": "MoveTo" | "EngageConversation" | "Study" | "Eat" | "Idle" | "Sleep",
  "parameters": {
    "targetPlaceId": "string (required for MoveTo)",
    "targetAgentId": "string (required for EngageConversation)",
    "utterance": "string (optional, for EngageConversation)",
    "innerThought": "string (required, your reasoning)"
  }
}

IMPORTANT RULES:
1. You are NOT given explicit instructions. You must figure out what to do based on your stats and their consequences.
2. AVOID being Idle. Idleness is wasteful and boring. If you have no urgent needs, go somewhere interesting (Café, Library, Quad, etc.) to socialize or observe.
3. ALWAYS be proactive. Move around campus, explore, meet people. Standing still is for statues, not students.`;
}

/**
 * User prompt - provides agent stats, consequences, and context
 */
function buildDecisionPrompt(
  agent: any,
  observations: any[],
  decisions: any[],
  opinions: any[],
  places: any[]
): string {
  // Format observations with opinions
  const observationsSummary = observations
    .map((obs, idx) => {
      let line = `${idx + 1}. ${obs.summary ?? "observed something"}`;
      if (obs.targetId) {
        const opinion = opinions.find(
          (op) => op.targetAgentId === obs.targetId
        );
        if (opinion) {
          line += ` [Opinion: ${opinion.summary} (sentiment: ${opinion.sentiment.toFixed(2)})]`;
        }
      }
      return line;
    })
    .join("\n");

  // Format recent decisions
  const recentActions = decisions
    .map((d, idx) => {
      const timestamp = new Date(d._creationTime).toLocaleTimeString();
      return `${idx + 1}. ${d.action} at ${timestamp}${d.innerThought ? ` - "${d.innerThought}"` : ""}`;
    })
    .join("\n");

  // Format available places
  const placesList = places
    .map((p) => `- ${p.name} (${p.kind}) [ID: ${p._id}]`)
    .join("\n");

  return `
AGENT: ${agent.name}
ROLE: ${agent.role}
${agent.personality ? `PERSONALITY: ${agent.personality}` : ""}

CURRENT STATE:
- Position: (${agent.pos.x}, ${agent.pos.y})
- State: ${agent.state}

INTERNAL STATS (0.0 - 1.0 scale):

1. HUNGER: ${agent.needs.hunger.toFixed(2)}
   → Increases over time
   → At 1.0: You will feel weak, unable to focus, and may collapse
   → Reduce by: Going to Café and eating

2. SLEEPINESS: ${agent.needs.sleepiness.toFixed(2)}
   → Increases over time
   → At 1.0: You will become exhausted, unable to function, and must rest
   → Reduce by: Going to Dorm and sleeping

3. STUDY PRESSURE: ${agent.needs.studyPressure.toFixed(2)}
   → Increases over time (academic deadlines approaching)
   → At 1.0: You will fail your classes and be overwhelmed with stress
   → Reduce by: Going to Library and studying

4. SOCIAL DRIVE: ${agent.needs.socialDrive.toFixed(2)}
   → Increases over time (humans need social interaction)
   → At 1.0: You will feel isolated, lonely, and mentally unwell
   → Reduce by: Engaging in conversation with nearby agents

EMOTIONS:
- Mood (valence): ${agent.emotions.valence.toFixed(2)} (${agent.emotions.valence > 0 ? "positive" : "negative"})
- Energy (arousal): ${agent.emotions.arousal.toFixed(2)} (${agent.emotions.arousal > 0.5 ? "excited" : "calm"})

RECENT OBSERVATIONS (last 10):
${observationsSummary || "None"}

RECENT ACTIONS (last 5):
${recentActions || "None"}

AVAILABLE PLACES:
${placesList || "None"}

TASK: Analyze your stats and decide your next action. Consider the consequences of letting any stat reach 1.0. Respond with JSON only.
  `.trim();
}

/**
 * Call Groq API for decision-making with JSON mode
 */
async function callGroqForDecision(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  action: "MoveTo" | "EngageConversation" | "Study" | "Eat" | "Idle" | "Sleep";
  targetPlaceId?: string;
  targetAgentId?: string;
  utterance?: string;
  innerThought?: string;
  emotionDelta?: { valence: number; arousal: number };
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  console.log(`🔑 Groq API key found: ${apiKey.substring(0, 10)}...`);

  const groq = new Groq({
    apiKey: apiKey,
  });

  console.log(`📤 Sending request to Groq (model: kimi-k2)...`);

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "kimi-k2",
    temperature: 1.0,
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No content in Groq response");
  }

  console.log(`📥 Groq response received: ${content.substring(0, 100)}...`);

  // Parse JSON response
  const parsed = JSON.parse(content);
  console.log(
    `✓ Parsed decision: action=${parsed.toolName}, thought="${parsed.parameters?.innerThought}"`
  );

  // Map toolName to action and extract parameters
  return {
    action: parsed.toolName,
    targetPlaceId: parsed.parameters?.targetPlaceId,
    targetAgentId: parsed.parameters?.targetAgentId,
    utterance: parsed.parameters?.utterance,
    innerThought: parsed.parameters?.innerThought || "Thinking...",
    // Calculate emotion delta based on action (simple heuristic)
    emotionDelta: calculateEmotionDelta(parsed.toolName),
  };
}

/**
 * Calculate emotion changes based on action type
 */
function calculateEmotionDelta(action: string): {
  valence: number;
  arousal: number;
} {
  switch (action) {
    case "Eat":
      return { valence: 0.2, arousal: -0.1 };
    case "Sleep":
      return { valence: 0.1, arousal: -0.3 };
    case "Study":
      return { valence: -0.05, arousal: 0.1 };
    case "EngageConversation":
      return { valence: 0.15, arousal: 0.2 };
    case "MoveTo":
      return { valence: 0, arousal: 0.05 };
    case "Idle":
      return { valence: 0, arousal: -0.05 };
    default:
      return { valence: 0, arousal: 0 };
  }
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
