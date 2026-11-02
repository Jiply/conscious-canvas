'use node';
import OpenAI from 'openai';
import { v } from 'convex/values';
import { api } from './_generated/api';
import { action } from './_generated/server';

export const makeAgentDecision = action({
  args: {
    agentId: v.id('agents'),
  },
  returns: v.object({
    action: v.union(v.literal('MoveTo'), v.literal('EngageConversation'), v.literal('Idle')),
    targetPlaceId: v.optional(v.id('places')),
    targetAgentId: v.optional(v.id('agents')),
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

    const agent = await ctx.runQuery(api.agents.getAgent, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error('Agent not found');

    const recentObservations = await ctx.runQuery(api.observations.getRecentObservations, {
      agentId: args.agentId,
      limit: 10,
    });

    const recentDecisions = await ctx.runQuery(api.decisions.getDecisionHistory, {
      agentId: args.agentId,
      limit: 5,
    });

    const agentOpinions = await ctx.runQuery(api.opinions.getAgentOpinions, {
      agentId: args.agentId,
    });

    const allPlaces = await ctx.runQuery(api.map.getPlaces, {});

    const allAgents = await ctx.runQuery(api.agents.listAgents, {});

    const TALKING_RANGE = 2;
    const nearbyAgents = allAgents
      .filter(other => {
        if (other._id === args.agentId) return false;
        if (other.currentConversationId) return false;

        const dx = other.pos.x - agent.pos.x;
        const dy = other.pos.y - agent.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= TALKING_RANGE;
      })
      .map(other => {
        const dx = other.pos.x - agent.pos.x;
        const dy = other.pos.y - agent.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const opinion = agentOpinions.find(op => op.targetAgentId === other._id);

        return {
          agent: other,
          distance,
          opinion,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildDecisionPrompt(
      agent,
      recentObservations,
      recentDecisions,
      agentOpinions,
      allPlaces,
      nearbyAgents
    );

    let decision: any;
    if (nearbyAgents.length > 0 && agent.needs.hunger < 0.95 && agent.needs.sleepiness < 0.95 && Math.random() < 0.5) {
      const closestAgent = nearbyAgents[0];
      console.log(
        `🎯 PROXIMITY HEURISTIC: ${agent.name} MUST talk to ${closestAgent.agent.name} (distance: ${closestAgent.distance.toFixed(1)} tiles)`
      );

      decision = {
        action: 'EngageConversation' as const,
        targetAgentId: closestAgent.agent._id,
        utterance: 'Hey!',
        innerThought: `${closestAgent.agent.name} is right here - I should say hi and talk to them!`,
        emotionDelta: { valence: 0.1, arousal: 0.15 },
      };
    } else {
      const urgent = (
        [
          ['hunger', 'cafe', `CRITICAL HUNGER! Must eat immediately or I'll collapse!`, -0.3, 0.2],
          ['sleepiness', 'dorm', `CRITICAL EXHAUSTION! Must sleep immediately or I'll collapse!`, -0.3, -0.2],
          ['studyPressure', 'library', `CRITICAL DEADLINE! Must study immediately or I'll fail!`, -0.2, 0.3],
        ] as const
      ).find(([need]) => agent.needs[need] >= 0.95);
      const place = urgent && allPlaces.find(p => p.kind.toLowerCase() === urgent[1]);
      if (urgent && place) {
        decision = {
          action: 'MoveTo' as const,
          targetPlaceId: place._id,
          innerThought: urgent[2],
          emotionDelta: { valence: urgent[3], arousal: urgent[4] },
        };
      }
    }

    if (!decision) {
      try {
        decision = await callOpenAIForDecision(systemPrompt, userPrompt);
        console.log(`🤖 ${agent.name}: "${decision.innerThought}" → ${decision.action}`);
        if (decision.utterance) {
          console.log(`💭 ${agent.name}: "${decision.utterance}"`);
        }
      } catch (error) {
        decision = heuristicFallback();
      }
    } else {
      console.log(`🤖 ${agent.name}: "${decision.innerThought}" → ${decision.action}`);
      if (decision.utterance) {
        console.log(`💭 ${agent.name}: "${decision.utterance}"`);
      }
    }

    const latency = Date.now() - startTime;

    const decisionId = await ctx.runMutation(api.decisions.addDecision, {
      agentId: args.agentId,
      action: decision.action,
      targetPlaceId: decision.targetPlaceId,
      targetAgentId: decision.targetAgentId,
      utterance: decision.utterance,
      innerThought: decision.innerThought,
      llmLatencyMs: latency,
    });

    if (decision.action === 'Idle') {
      await ctx.runMutation(api.decisions.completeDecision, {
        decisionId,
      });
    }

    if (decision.action === 'EngageConversation' && decision.targetAgentId) {
      try {
        const targetAgent = await ctx.runQuery(api.agents.getAgent, {
          agentId: decision.targetAgentId,
        });

        if (targetAgent && !targetAgent.currentConversationId) {
          await ctx.runMutation(api.conversationsMutations.createConversation, {
            initiatorId: args.agentId,
            targetId: decision.targetAgentId,
          });

          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        } else {
          await ctx.runMutation(api.decisions.completeDecision, {
            decisionId,
          });
        }
      } catch (error) {}
    }

    if (decision.action === 'MoveTo' && decision.targetPlaceId) {
      try {
        const targetPlace = allPlaces.find(p => p._id === decision.targetPlaceId);

        if (targetPlace && targetPlace.entrances && targetPlace.entrances.length > 0) {
          const entrance = targetPlace.entrances[0];

          const path = await ctx.runQuery(api.pathfinding.findPath, {
            startX: agent.pos.x,
            startY: agent.pos.y,
            goalX: entrance.x,
            goalY: entrance.y,
          });

          if (path) {
            await ctx.runMutation(api.agents.setAgentPath, {
              agentId: args.agentId,
              path,
              state: 'Transit',
            });
          }
        }
      } catch (error) {}
    }

    if (decision.emotionDelta) {
      await ctx.runMutation(api.agents.updateAgentEmotions, {
        agentId: args.agentId,
        valence: agent.emotions.valence + decision.emotionDelta.valence,
        arousal: agent.emotions.arousal + decision.emotionDelta.arousal,
      });
    }

    const nextDecisionDelay = 5000 + Math.random() * 10000;
    await ctx.runMutation(api.agents.setNextDecisionTime, {
      agentId: args.agentId,
      nextDecisionAt: Date.now() + nextDecisionDelay,
    });

    return decision;
  },
});

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

function buildDecisionPrompt(
  agent: any,
  observations: any[],
  decisions: any[],
  opinions: any[],
  places: any[],
  nearbyAgents: Array<{ agent: any; distance: number; opinion?: any }>
): string {
  const observationsSummary = observations
    .map((obs, idx) => {
      let line = `${idx + 1}. ${obs.summary ?? 'observed something'}`;
      if (obs.targetId) {
        const opinion = opinions.find(op => op.targetAgentId === obs.targetId);
        if (opinion) {
          line += ` [Opinion: ${opinion.summary} (sentiment: ${opinion.sentiment.toFixed(2)})]`;
        }
      }
      return line;
    })
    .join('\n');

  const recentActions = decisions
    .map((d, idx) => {
      const timestamp = new Date(d._creationTime).toLocaleTimeString();
      return `${idx + 1}. ${d.action} at ${timestamp}${d.innerThought ? ` - "${d.innerThought}"` : ''}`;
    })
    .join('\n');

  const placesList = places.map(p => `- ${p.name} (${p.kind}) [ID: ${p._id}]`).join('\n');

  let nearbyAgentsSummary = '';
  let conversationBias = '';

  if (nearbyAgents.length > 0) {
    nearbyAgentsSummary = nearbyAgents
      .map((nearby, idx) => {
        const opinionText = nearby.opinion
          ? ` [You feel: ${nearby.opinion.summary} (sentiment: ${nearby.opinion.sentiment.toFixed(2)})]`
          : " [You haven't formed an opinion about them yet]";

        return `${idx + 1}. ${nearby.agent.name} (${nearby.agent.role}) - ${nearby.distance.toFixed(1)} tiles away${opinionText} [ID: ${nearby.agent._id}]`;
      })
      .join('\n');

    conversationBias = `
⚠️ IMPORTANT - PROXIMITY BIAS:
There ${nearbyAgents.length === 1 ? 'is 1 person' : `are ${nearbyAgents.length} people`} VERY CLOSE TO YOU (within 2 tiles)!
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
${agent.personality ? `PERSONALITY: ${agent.personality}` : ''}

CURRENT STATE:
- Position: (${agent.pos.x}, ${agent.pos.y})
- State: ${agent.state}

INTERNAL STATS (0.0 - 1.0 scale):

1. HUNGER: ${agent.needs.hunger.toFixed(2)} ${agent.needs.hunger > 0.9 ? '🚨 CRITICAL! STARVING!' : agent.needs.hunger > 0.7 ? '⚠️ Very hungry' : ''}
   → Increases over time
   → At 0.7+: You are very hungry and need to eat soon
   → At 0.9+: CRITICAL! You are starving and MUST eat immediately or collapse!
   → Reduce by: Use "MoveTo" action to go to any Café location

2. SLEEPINESS: ${agent.needs.sleepiness.toFixed(2)} ${agent.needs.sleepiness > 0.9 ? '🚨 CRITICAL! EXHAUSTED!' : agent.needs.sleepiness > 0.7 ? '⚠️ Very tired' : ''}
   → Increases over time
   → At 0.7+: You are very tired and need rest soon
   → At 0.9+: CRITICAL! You are exhausted and MUST sleep immediately or collapse!
   → Reduce by: Use "MoveTo" action to go to any Dorm location

3. STUDY PRESSURE: ${agent.needs.studyPressure.toFixed(2)} ${agent.needs.studyPressure > 0.9 ? '🚨 CRITICAL! FAILING!' : agent.needs.studyPressure > 0.7 ? '⚠️ High pressure' : ''}
   → Increases over time (academic deadlines approaching)
   → At 0.7+: High academic pressure, should study soon
   → At 0.9+: CRITICAL! You are failing and MUST study immediately!
   → Reduce by: Use "MoveTo" action to go to Library location

4. SOCIAL DRIVE: ${agent.needs.socialDrive.toFixed(2)} ${agent.needs.socialDrive > 0.9 ? '🚨 Very lonely' : agent.needs.socialDrive > 0.7 ? '⚠️ Feeling isolated' : ''}
   → Increases over time (humans need social interaction)
   → At 0.7+: Feeling isolated, should socialize
   → At 0.9+: Very lonely, seek social interaction
   → Reduce by: Use "EngageConversation" with nearby agents

EMOTIONS:
- Mood (valence): ${agent.emotions.valence.toFixed(2)} (${agent.emotions.valence > 0 ? 'positive' : 'negative'})
- Energy (arousal): ${agent.emotions.arousal.toFixed(2)} (${agent.emotions.arousal > 0.5 ? 'excited' : 'calm'})

═══════════════════════════════════════════════════════════
NEARBY AGENTS (within 2 tiles - AVAILABLE FOR CONVERSATION):
${nearbyAgentsSummary}

${conversationBias}
═══════════════════════════════════════════════════════════

RECENT OBSERVATIONS (last 10):
${observationsSummary || 'None'}

RECENT ACTIONS (last 5):
${recentActions || 'None'}

AVAILABLE PLACES:
${placesList || 'None'}

TASK: Analyze your stats and decide your next action. 
- If there are nearby agents and you don't have critical needs, strongly consider starting a conversation!
- Consider the consequences of letting any stat reach 1.0.
- Respond with JSON only.
  `.trim();
}

async function callOpenAIForDecision(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  action: 'MoveTo' | 'EngageConversation' | 'Idle';
  targetPlaceId?: string;
  targetAgentId?: string;
  utterance?: string;
  innerThought?: string;
  emotionDelta?: { valence: number; arousal: number };
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'gpt-3.5-turbo',
    temperature: 1.0,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No content in OpenAI response');

  const parsed = JSON.parse(content);

  return {
    action: parsed.toolName,
    targetPlaceId: parsed.parameters?.targetPlaceId,
    targetAgentId: parsed.parameters?.targetAgentId,
    utterance: parsed.parameters?.utterance,
    innerThought: parsed.parameters?.innerThought || 'Thinking...',
    emotionDelta: calculateEmotionDelta(parsed.toolName),
  };
}

function calculateEmotionDelta(action: string): {
  valence: number;
  arousal: number;
} {
  switch (action) {
    case 'Eat':
      return { valence: 0.2, arousal: -0.1 };
    case 'Sleep':
      return { valence: 0.1, arousal: -0.3 };
    case 'Study':
      return { valence: -0.05, arousal: 0.1 };
    case 'EngageConversation':
      return { valence: 0.15, arousal: 0.2 };
    case 'MoveTo':
      return { valence: 0, arousal: 0.05 };
    case 'Idle':
      return { valence: 0, arousal: -0.05 };
    default:
      return { valence: 0, arousal: 0 };
  }
}

function heuristicFallback(): {
  action: 'MoveTo' | 'EngageConversation' | 'Idle';
  targetPlaceId?: any;
  targetAgentId?: any;
  utterance?: string;
  innerThought?: string;
  emotionDelta?: { valence: number; arousal: number };
} {
  return {
    action: 'Idle',
    innerThought: 'Taking a moment to assess my situation.',
    emotionDelta: { valence: 0, arousal: -0.05 },
  };
}
