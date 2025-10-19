"use node";
import Groq from "groq-sdk";
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
      v.literal("Idle")
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

    // Get all opinions this agent holds
    const agentOpinions = await ctx.runQuery(api.opinions.getAgentOpinions, {
      agentId: args.agentId,
    });

    // Get available places
    const allPlaces = await ctx.runQuery(api.map.getPlaces, {});

    // Get all agents to find nearby ones
    const allAgents = await ctx.runQuery(api.agents.listAgents, {});

    // Filter for nearby agents (within 2 tiles) who are NOT in active conversations
    const TALKING_RANGE = 2;
    const nearbyAgents = allAgents
      .filter((other) => {
        if (other._id === args.agentId) return false; // Skip self
        if (other.currentConversationId) return false; // Skip agents already in conversation

        const dx = other.pos.x - agent.pos.x;
        const dy = other.pos.y - agent.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= TALKING_RANGE;
      })
      .map((other) => {
        const dx = other.pos.x - agent.pos.x;
        const dy = other.pos.y - agent.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Get opinion of this agent
        const opinion = agentOpinions.find(
          (op) => op.targetAgentId === other._id
        );

        return {
          agent: other,
          distance,
          opinion,
        };
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance, closest first

    // 2. Build LLM prompt with stats and consequences
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildDecisionPrompt(
      agent,
      recentObservations,
      recentDecisions,
      agentOpinions,
      allPlaces,
      nearbyAgents
    );

    // 3. PROXIMITY HEURISTIC: Force conversation when agents are within 2 tiles
    // This is the hackathon testing feature - agents MUST talk when close
    let decision: any;
    if (
      nearbyAgents.length > 0 &&
      agent.needs.hunger < 0.95 &&
      agent.needs.sleepiness < 0.95 &&
      Math.random() < 0.5
    ) {
      // There's someone within 2 tiles and no critical needs
      // Force them to engage in conversation (this is the heuristic!)
      const closestAgent = nearbyAgents[0]; // Already sorted by distance
      console.log(
        `🎯 PROXIMITY HEURISTIC: ${agent.name} MUST talk to ${closestAgent.agent.name} (distance: ${closestAgent.distance.toFixed(1)} tiles)`
      );

      decision = {
        action: "EngageConversation" as const,
        targetAgentId: closestAgent.agent._id,
        utterance: "Hey!",
        innerThought: `${closestAgent.agent.name} is right here - I should say hi and talk to them!`,
        emotionDelta: { valence: 0.1, arousal: 0.15 },
      };
    }
    // 4. Check for critical needs that require immediate action (override proximity heuristic)
    else if (agent.needs.hunger >= 0.95) {
      // Critical hunger - force MoveTo cafe
      const cafe = allPlaces.find((p: any) => p.kind.toLowerCase() === "cafe");
      if (cafe) {
        decision = {
          action: "MoveTo" as const,
          targetPlaceId: cafe._id,
          innerThought: `CRITICAL HUNGER! Must eat immediately or I'll collapse!`,
          emotionDelta: { valence: -0.3, arousal: 0.2 },
        };
      }
    } else if (agent.needs.sleepiness >= 0.95) {
      // Critical sleepiness - force MoveTo dorm
      const dorm = allPlaces.find((p: any) => p.kind.toLowerCase() === "dorm");
      if (dorm) {
        decision = {
          action: "MoveTo" as const,
          targetPlaceId: dorm._id,
          innerThought: `CRITICAL EXHAUSTION! Must sleep immediately or I'll collapse!`,
          emotionDelta: { valence: -0.3, arousal: -0.2 },
        };
      }
    } else if (agent.needs.studyPressure >= 0.95) {
      // Critical study pressure - force MoveTo library
      const library = allPlaces.find(
        (p: any) => p.kind.toLowerCase() === "library"
      );
      if (library) {
        decision = {
          action: "MoveTo" as const,
          targetPlaceId: library._id,
          innerThought: `CRITICAL DEADLINE! Must study immediately or I'll fail!`,
          emotionDelta: { valence: -0.2, arousal: 0.3 },
        };
      }
    }

    // 5. If no critical need or proximity heuristic, call LLM for decision-making
    if (!decision) {
      try {
        decision = await callGroqForDecision(systemPrompt, userPrompt);
        // Log the agent's decision for public display
        console.log(
          `🤖 ${agent.name}: "${decision.innerThought}" → ${decision.action}`
        );
        // Log utterance if present
        if (decision.utterance) {
          console.log(`💭 ${agent.name}: "${decision.utterance}"`);
        }
      } catch (error) {
        decision = heuristicFallback(agent);
      }
    } else {
      // Log heuristic decisions for public display
      console.log(
        `🤖 ${agent.name}: "${decision.innerThought}" → ${decision.action}`
      );
      // Log utterance if present
      if (decision.utterance) {
        console.log(`💭 ${agent.name}: "${decision.utterance}"`);
      }
    }

    const latency = Date.now() - startTime;

    // 6. Record decision in Convex
    const decisionId = await ctx.runMutation(api.decisions.addDecision, {
      agentId: args.agentId,
      action: decision.action,
      targetPlaceId: decision.targetPlaceId,
      targetAgentId: decision.targetAgentId,
      utterance: decision.utterance,
      innerThought: decision.innerThought,
      llmLatencyMs: latency,
    });

    // 7. If decision is Idle, mark it as complete immediately
    if (decision.action === "Idle") {
      await ctx.runMutation(api.decisions.completeDecision, {
        decisionId,
      });
    }

    // 8. If decision is EngageConversation, create conversation
    if (decision.action === "EngageConversation" && decision.targetAgentId) {
      try {
        // Check if target agent is available (not already in a conversation)
        const targetAgent = await ctx.runQuery(api.agents.getAgent, {
          agentId: decision.targetAgentId,
        });

        if (targetAgent && !targetAgent.currentConversationId) {
          // Create conversation between the two agents
          const conversationId = await ctx.runMutation(
            api.conversationsMutations.createConversation,
            {
              initiatorId: args.agentId,
              targetId: decision.targetAgentId,
            }
          );

          // Complete the EngageConversation decision since conversation is now active
          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        } else {
          // Mark decision as completed anyway
          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        }
      } catch (error) {
        // Silently handle error
      }
    }

    // 9. Execute MoveTo decision by calculating path
    if (decision.action === "MoveTo" && decision.targetPlaceId) {
      try {
        // Get the target place
        const targetPlace = allPlaces.find(
          (p: any) => p._id === decision.targetPlaceId
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
          }
        }
      } catch (error) {
        // Silently handle pathfinding errors
      }
    }

    // 10. Update agent state
    if (decision.emotionDelta) {
      await ctx.runMutation(api.agents.updateAgentEmotions, {
        agentId: args.agentId,
        valence: agent.emotions.valence + decision.emotionDelta.valence,
        arousal: agent.emotions.arousal + decision.emotionDelta.arousal,
      });
    }

    // 11. Schedule next decision (5-15 seconds from now)
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
  "toolName": "MoveTo" | "EngageConversation" | "Idle",
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
3. ALWAYS be proactive. Move around campus, explore, meet people. Standing still is for statues, not students.
4. To eat, sleep, or study, you MUST use MoveTo to go to Café/Dorm/Library. Actions happen automatically when you arrive at the place.
5. "Eat", "Sleep", and "Study" are NOT valid decisions. Only use MoveTo, EngageConversation, or Idle.`;
}

/**
 * User prompt - provides agent stats, consequences, and context
 */
function buildDecisionPrompt(
  agent: any,
  observations: any[],
  decisions: any[],
  opinions: any[],
  places: any[],
  nearbyAgents: Array<{ agent: any; distance: number; opinion?: any }>
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

  // Format nearby agents with opinions and conversation encouragement
  let nearbyAgentsSummary = "";
  let conversationBias = "";

  if (nearbyAgents.length > 0) {
    nearbyAgentsSummary = nearbyAgents
      .map((nearby, idx) => {
        const opinionText = nearby.opinion
          ? ` [You feel: ${nearby.opinion.summary} (sentiment: ${nearby.opinion.sentiment.toFixed(2)})]`
          : " [You haven't formed an opinion about them yet]";

        return `${idx + 1}. ${nearby.agent.name} (${nearby.agent.role}) - ${nearby.distance.toFixed(1)} tiles away${opinionText} [ID: ${nearby.agent._id}]`;
      })
      .join("\n");

    conversationBias = `
⚠️ IMPORTANT - PROXIMITY BIAS:
There ${nearbyAgents.length === 1 ? "is 1 person" : `are ${nearbyAgents.length} people`} VERY CLOSE TO YOU (within 2 tiles)!
As a social being, you should strongly consider engaging in conversation with nearby people, especially if:
- You're not urgently busy with critical needs (hunger > 0.9, sleepiness > 0.9, etc.)
- You have social drive (socialDrive > 0.3) or just want to be social
- They're available and not already in a conversation
- You find them interesting or want to get to know them better

This is a PRIME OPPORTUNITY for social interaction! Don't let it pass by unless you have a very good reason.
Use "EngageConversation" action with their ID to start talking to them.
`;
  } else {
    nearbyAgentsSummary = "None - you're alone right now";
    conversationBias = `
No one is nearby at the moment. Consider:
- Moving to a social location (Café, Quad, Library) to meet people
- Or focusing on your needs (eating, sleeping, studying)
`;
  }

  return `
AGENT: ${agent.name}
ROLE: ${agent.role}
${agent.personality ? `PERSONALITY: ${agent.personality}` : ""}

CURRENT STATE:
- Position: (${agent.pos.x}, ${agent.pos.y})
- State: ${agent.state}

INTERNAL STATS (0.0 - 1.0 scale):

1. HUNGER: ${agent.needs.hunger.toFixed(2)} ${agent.needs.hunger > 0.9 ? "🚨 CRITICAL! STARVING!" : agent.needs.hunger > 0.7 ? "⚠️ Very hungry" : ""}
   → Increases over time
   → At 0.7+: You are very hungry and need to eat soon
   → At 0.9+: CRITICAL! You are starving and MUST eat immediately or collapse!
   → Reduce by: Use "MoveTo" action to go to any Café location

2. SLEEPINESS: ${agent.needs.sleepiness.toFixed(2)} ${agent.needs.sleepiness > 0.9 ? "🚨 CRITICAL! EXHAUSTED!" : agent.needs.sleepiness > 0.7 ? "⚠️ Very tired" : ""}
   → Increases over time
   → At 0.7+: You are very tired and need rest soon
   → At 0.9+: CRITICAL! You are exhausted and MUST sleep immediately or collapse!
   → Reduce by: Use "MoveTo" action to go to any Dorm location

3. STUDY PRESSURE: ${agent.needs.studyPressure.toFixed(2)} ${agent.needs.studyPressure > 0.9 ? "🚨 CRITICAL! FAILING!" : agent.needs.studyPressure > 0.7 ? "⚠️ High pressure" : ""}
   → Increases over time (academic deadlines approaching)
   → At 0.7+: High academic pressure, should study soon
   → At 0.9+: CRITICAL! You are failing and MUST study immediately!
   → Reduce by: Use "MoveTo" action to go to Library location

4. SOCIAL DRIVE: ${agent.needs.socialDrive.toFixed(2)} ${agent.needs.socialDrive > 0.9 ? "🚨 Very lonely" : agent.needs.socialDrive > 0.7 ? "⚠️ Feeling isolated" : ""}
   → Increases over time (humans need social interaction)
   → At 0.7+: Feeling isolated, should socialize
   → At 0.9+: Very lonely, seek social interaction
   → Reduce by: Use "EngageConversation" with nearby agents

EMOTIONS:
- Mood (valence): ${agent.emotions.valence.toFixed(2)} (${agent.emotions.valence > 0 ? "positive" : "negative"})
- Energy (arousal): ${agent.emotions.arousal.toFixed(2)} (${agent.emotions.arousal > 0.5 ? "excited" : "calm"})

═══════════════════════════════════════════════════════════
NEARBY AGENTS (within 2 tiles - AVAILABLE FOR CONVERSATION):
${nearbyAgentsSummary}

${conversationBias}
═══════════════════════════════════════════════════════════

RECENT OBSERVATIONS (last 10):
${observationsSummary || "None"}

RECENT ACTIONS (last 5):
${recentActions || "None"}

AVAILABLE PLACES:
${placesList || "None"}

TASK: Analyze your stats and decide your next action. 
- If there are nearby agents and you don't have critical needs, strongly consider starting a conversation!
- Consider the consequences of letting any stat reach 1.0.
- Respond with JSON only.
  `.trim();
}

/**
 * Call Groq API for decision-making with JSON mode
 */
async function callGroqForDecision(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  action: "MoveTo" | "EngageConversation" | "Idle";
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

  const groq = new Groq({
    apiKey: apiKey,
  });

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

  // Parse JSON response
  const parsed = JSON.parse(content);

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
 * NOTE: Eat, Sleep, Study are NOT valid decision actions - agents must MoveTo appropriate places!
 */
function heuristicFallback(agent: any): {
  action: "MoveTo" | "EngageConversation" | "Idle";
  targetPlaceId?: any;
  targetAgentId?: any;
  utterance?: string;
  innerThought?: string;
  emotionDelta?: { valence: number; arousal: number };
} {
  const { needs } = agent;

  // NOTE: hunger, sleepiness, and studyPressure require MoveTo decisions
  // We can't perform Eat/Sleep/Study directly - that happens when agent reaches the place

  // Just default to Idle in fallback - LLM should handle proper decision making
  // If fallback is being called, something is wrong with LLM anyway
  return {
    action: "Idle",
    innerThought: "Taking a moment to assess my situation.",
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
