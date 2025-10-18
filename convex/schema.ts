import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========== CORE TABLES ==========

  agents: defineTable({
    name: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("prof"),
      v.literal("barista")
    ),
    personality: v.optional(v.string()), // LLM-friendly bio

    // Position & movement
    pos: v.object({ x: v.number(), y: v.number() }),
    headingRad: v.number(), // which way they're facing (radians)
    path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))), // current A* path, discarded when destination reached

    // State machine
    state: v.union(
      v.literal("Idle"),
      v.literal("Transit"),
      v.literal("AtLocation"),
      v.literal("Interact"),
      v.literal("Sleep")
    ),
    nextDecisionAt: v.number(), // timestamp (ms) when LLM should run next

    // Emotions & needs (all 0-1 for LLM reasoning)
    emotions: v.object({
      valence: v.number(), // -1 to 1 (negative to positive mood)
      arousal: v.number(), // 0 to 1 (calm to excited/energized)
    }),
    needs: v.object({
      sleepiness: v.number(), // 0 to 1
      hunger: v.number(), // 0 to 1
      studyPressure: v.number(), // 0 to 1
      socialDrive: v.number(), // 0 to 1
    }),

    // Goals (dynamic weights)
    goals: v.array(
      v.object({
        name: v.string(),
        weight: v.number(), // 0 to 1
      })
    ),
  }),

  // ========== OBSERVATIONS ==========

  observations: defineTable({
    agentId: v.id("agents"), // who observed
    targetId: v.optional(v.id("agents")), // what they saw (if agent)
    targetType: v.union(
      v.literal("agent"),
      v.literal("place"),
      v.literal("event")
    ),

    location: v.object({ x: v.number(), y: v.number() }),
    distance: v.optional(v.number()),

    summary: v.optional(v.string()), // "Saw Bob near library, looking stressed"
    salience: v.number(), // 0 to 1, how important/memorable
  })
    .index("by_agent", ["agentId"])
    .index("by_target", ["targetId"])
    .index("by_agent_and_time", ["agentId", "_creationTime"]),

  // ========== OPINIONS ==========

  opinions: defineTable({
    agentId: v.id("agents"), // who has the opinion
    targetAgentId: v.id("agents"), // about whom

    sentiment: v.number(), // -1 to 1 (dislike to like)
    summary: v.string(), // "Smart but unreliable"

    // Optional: structured traits
    traits: v.optional(v.record(v.string(), v.number())), // {"smart": 0.8, "funny": 0.3}
  })
    .index("by_agent", ["agentId"])
    .index("by_target", ["targetAgentId"])
    .index("by_pair", ["agentId", "targetAgentId"]),

  // ========== DECISIONS ==========

  decisions: defineTable({
    agentId: v.id("agents"),

    // What they decided to do
    action: v.union(
      v.literal("MoveTo"),
      v.literal("EngageConversation"),
      v.literal("Study"),
      v.literal("Eat"),
      v.literal("Idle"),
      v.literal("Sleep")
    ),

    // Action context
    targetPlaceId: v.optional(v.id("places")),
    targetAgentId: v.optional(v.id("agents")),

    // Speech/thought
    utterance: v.optional(v.string()), // what they say out loud (speech bubble)
    innerThought: v.optional(v.string()), // internal monologue (brain panel)

    // Timing
    completedAt: v.optional(v.number()), // timestamp when action finished (null = in progress)

    // LLM metadata (for debugging/optimization)
    llmLatencyMs: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_and_time", ["agentId", "_creationTime"])
    .index("by_status", ["agentId", "completedAt"]), // find in-progress decisions

  // ========== PLACES (Jeremy is handling, placeholder structure) ==========

  places: defineTable({
    name: v.string(),
    kind: v.union(
      v.literal("dorm"),
      v.literal("lecture"),
      v.literal("cafe"),
      v.literal("library"),
      v.literal("quad")
    ),

    // Tile-based collision rectangle
    tileRect: v.object({
      x: v.number(),
      y: v.number(),
      w: v.number(),
      h: v.number(),
    }),

    // Entrance points (where agents pathfind to)
    entrances: v.array(v.object({ x: v.number(), y: v.number() })),
  }),
});
