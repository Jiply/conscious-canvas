import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

/**
 * Conscious Campus - Convex Database Schema
 *
 * This schema defines the map/tile system for the campus simulation.
 * Inspired by NUS UTown Singapore layout.
 */

export default defineSchema({
  // ========================================
  // MAP SYSTEM
  // ========================================

  /**
   * Map Settings - Global configuration for the tile grid
   * Singleton table - should only have one document
   */
  map_settings: defineTable({
    gridWidth: v.number(), // Number of tiles horizontally (default: 200)
    gridHeight: v.number(), // Number of tiles vertically (default: 150)
    tileSize: v.number(), // Pixel size of each tile (default: 32)
    metersPerTile: v.number(), // Real-world scale: 1 tile = 1 meter
    version: v.number(), // Schema version for migrations
    lastRegeneratedAt: v.optional(v.number()), // Timestamp of last regeneration
    seed: v.optional(v.string()), // Random seed used for generation
  }),

  /**
   * Map Tiles - Individual tiles in the grid
   * Full 200×150 grid = 30000 tiles
   */
  map_tiles: defineTable({
    x: v.number(), // X coordinate (0-199)
    y: v.number(), // Y coordinate (0-149)
    tileType: v.union(
      v.literal("floor"), // Indoor floor (inside buildings)
      v.literal("wall"), // Solid wall (buildings, barriers)
      v.literal("door"), // Entrance/exit (walkable)
      v.literal("grass"), // Grass/lawn (walkable)
      v.literal("water"), // Water feature (not walkable)
      v.literal("path"), // Paved walkway (walkable)
      v.literal("void"), // Empty/boundary (not walkable)
      // Terrain variety
      v.literal("tall_tree"), // Tall trees (not walkable)
      v.literal("short_tree"), // Short trees (not walkable)
      v.literal("bush"), // Bushes (walkable)
      v.literal("flower_bed"), // Flower beds (walkable)
      v.literal("concrete"), // Concrete areas (walkable)
      v.literal("brick_path"), // Decorative brick paths (walkable)
      // Building interiors
      v.literal("cafe_stall"), // Café food stalls
      v.literal("study_desk"), // Study desks
      v.literal("bookshelf"), // Library bookshelves
      v.literal("lounge_chair"), // Lounge seating
      v.literal("laundry_machine"), // Laundry facilities
      v.literal("lecture_seat"), // Lecture hall seating
      v.literal("library_desk"), // Library study desks
      v.literal("dorm_bed"), // Dorm room beds
      v.literal("kitchen_counter") // Kitchen areas
    ),
    isWalkable: v.boolean(), // Can agents walk on this tile?
    visualVariant: v.optional(v.number()), // Visual variation (0-3) for same type
    placeId: v.optional(v.id("places")), // Associated place (if inside building)
    metadata: v.optional(
      v.object({
        // Additional properties
        biome: v.optional(v.string()), // e.g., "indoor", "outdoor", "garden"
        lightLevel: v.optional(v.number()), // 0-1 for lighting effects
      })
    ),
  })
    .index("by_coordinates", ["x", "y"]) // Fast lookup by position
    .index("by_place", ["placeId"]) // Get all tiles in a place
    .index("by_type", ["tileType"]) // Query by tile type
    .index("by_walkable", ["isWalkable"]), // Pathfinding optimization

  /**
   * Places - Campus locations (buildings, outdoor areas)
   * Based on NUS UTown landmarks
   */
  places: defineTable({
    kind: v.string(), // 'dorm', 'lecture', 'cafe', 'library', 'quad', etc.
    name: v.string(), // Display name e.g., "Student Residence"
    description: v.optional(v.string()), // Optional description

    // Spatial boundaries (in tile coordinates)
    bounds: v.object({
      x: v.number(), // Top-left X
      y: v.number(), // Top-left Y
      width: v.number(), // Width in tiles
      height: v.number(), // Height in tiles
    }),

    // Entrance/exit points for pathfinding (tile coordinates)
    entrances: v.array(
      v.object({
        x: v.number(),
        y: v.number(),
        facing: v.optional(v.string()), // Direction: "north", "south", "east", "west"
      })
    ),

    // Capacity and properties
    capacity: v.optional(v.number()), // Max agents
    isIndoor: v.boolean(), // Indoor vs outdoor

    // Real-world inspiration metadata
    metadata: v.optional(
      v.object({
        realWorldInspiration: v.optional(v.string()), // e.g., "NUS UTown ERC Library"
        ambientSound: v.optional(v.string()), // Background audio
      })
    ),
  }).index("by_kind", ["kind"]), // Query by place type

  // ========================================
  // WORLD STATE (from requirements.md)
  // ========================================

  /**
   * World Settings - Observer-dependent time and simulation state
   */
  world_settings: defineTable({
    isRunning: v.boolean(), // Is the simulation running?
    observerCount: v.number(), // Number of active observers
    adminEnabled: v.boolean(), // Admin controls enabled?
    tickHz: v.number(), // Tick rate (default: 2 Hz = 500ms)
    currentTick: v.number(), // Current simulation tick
    simulationStartedAt: v.optional(v.number()), // Timestamp
    lastTickAt: v.optional(v.number()), // Last tick timestamp
  }),

  /**
   * Observers - Active viewers watching the simulation
   */
  observer: defineTable({
    sessionId: v.string(), // Unique session identifier
    lastHeartbeatAt: v.number(), // Last heartbeat timestamp
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        joinedAt: v.optional(v.number()),
      })
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_heartbeat", ["lastHeartbeatAt"]),

  agents: defineTable({
    name: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("prof"),
      v.literal("barista")
    ),
    personality: v.optional(v.string()), // LLM-friendly bio
    profilePicture: v.optional(v.string()), // Base64 encoded image data

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

    // Conversation state
    currentConversationId: v.optional(v.id("conversations")), // active conversation (if any)

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
    nearestPlaceId: v.optional(v.id("places")), // nearest place to the observation
    timeOfDay: v.optional(v.string()), // "day", "night", etc.

    summary: v.optional(v.string()), // "Saw Bob near library, looking stressed"
    salience: v.number(), // 0 to 1, how important/memorable
  })
    .index("by_agent", ["agentId"])
    .index("by_target", ["targetId"]),

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
    .index("by_status", ["agentId", "completedAt"]), // find in-progress decisions

  // ========== CONVERSATIONS ==========

  /**
   * Conversations - Multi-turn dialogue sessions between agents
   * Supports 2+ participants for potential group conversations
   */
  conversations: defineTable({
    participantIds: v.array(v.id("agents")), // 2+ agents in conversation
    status: v.union(v.literal("active"), v.literal("completed")),
    startedAt: v.number(), // timestamp when conversation began
    completedAt: v.optional(v.number()), // timestamp when conversation ended
    location: v.optional(v.object({ x: v.number(), y: v.number() })), // where conversation took place
    nearestPlaceId: v.optional(v.id("places")), // nearby landmark
    turnCount: v.number(), // number of messages exchanged (for analytics)
  })
    .index("by_status", ["status"]) // find active conversations
    .index("by_participant", ["participantIds"]), // find agent's conversations

  /**
   * Messages - Individual utterances within a conversation
   * Each message represents one agent's turn in the dialogue
   */
  messages: defineTable({
    conversationId: v.id("conversations"), // which conversation this belongs to
    agentId: v.id("agents"), // who said this
    content: v.string(), // what they said
    emotionSnapshot: v.optional(
      v.object({
        valence: v.number(), // agent's emotion when they said this
        arousal: v.number(),
      })
    ),
    continueConversation: v.boolean(), // does speaker want to keep talking?
    reasonForLeaving: v.optional(v.string()), // why they're ending conversation (if continueConversation=false)
  })
    .index("by_conversation", ["conversationId"]) // get all messages in conversation
    .index("by_agent", ["agentId"]), // get all messages by agent

  // ========== HEARTBEAT SYSTEM ==========

  heartbeat_state: defineTable({
    isRunning: v.boolean(), // whether a tick is currently processing
    lastStartedAt: v.number(), // timestamp when last tick started
    lastCompletedAt: v.number(), // timestamp when last tick completed
    currentLeaderId: v.string(), // UUID of the current leader client
  }),

  // ========== EVENT SYSTEM ==========

  events: defineTable({
    timestamp: v.number(),
    type: v.union(
      v.literal("decision"),
      v.literal("conversation"),
      v.literal("observation"),
      v.literal("world"),
      v.literal("movement")
    ),
    agentIds: v.optional(v.array(v.id("agents"))),
    description: v.string(),
    location: v.optional(v.object({ x: v.number(), y: v.number() })),
    metadata: v.optional(
      v.object({
        placeId: v.optional(v.id("places")),
        severity: v.optional(v.string()), // "info", "important", "critical"
      })
    ),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_type", ["type"]),
});
