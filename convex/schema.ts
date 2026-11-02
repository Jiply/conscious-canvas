import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

export const mapSettingsFields = {
  gridWidth: v.number(),
  gridHeight: v.number(),
  tileSize: v.number(),
  metersPerTile: v.number(),
  version: v.number(),
  lastRegeneratedAt: v.optional(v.number()),
  seed: v.optional(v.string()),
};

export const mapTileFields = {
  x: v.number(),
  y: v.number(),
  tileType: v.union(
    v.literal("floor"),
    v.literal("wall"),
    v.literal("door"),
    v.literal("grass"),
    v.literal("water"),
    v.literal("path"),
    v.literal("void"),
    v.literal("tall_tree"),
    v.literal("short_tree"),
    v.literal("bush"),
    v.literal("flower_bed"),
    v.literal("concrete"),
    v.literal("brick_path"),
    v.literal("cafe_stall"),
    v.literal("study_desk"),
    v.literal("bookshelf"),
    v.literal("lounge_chair"),
    v.literal("laundry_machine"),
    v.literal("lecture_seat"),
    v.literal("library_desk"),
    v.literal("dorm_bed"),
    v.literal("kitchen_counter")
  ),
  isWalkable: v.boolean(),
  visualVariant: v.optional(v.number()),
  placeId: v.optional(v.id("places")),
  metadata: v.optional(
    v.object({
      biome: v.optional(v.string()),
      lightLevel: v.optional(v.number()),
    })
  ),
};

export const placeFields = {
  kind: v.string(),
  name: v.string(),
  description: v.optional(v.string()),

  bounds: v.object({
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
  }),

  entrances: v.array(
    v.object({
      x: v.number(),
      y: v.number(),
      facing: v.optional(v.string()),
    })
  ),

  capacity: v.optional(v.number()),
  isIndoor: v.boolean(),

  metadata: v.optional(
    v.object({
      realWorldInspiration: v.optional(v.string()),
      ambientSound: v.optional(v.string()),
    })
  ),
};

export const agentFields = {
  name: v.string(),
  role: v.union(
    v.literal("student"),
    v.literal("prof"),
    v.literal("barista")
  ),
  personality: v.optional(v.string()),
  profilePicture: v.optional(v.string()),

  pos: v.object({ x: v.number(), y: v.number() }),
  headingRad: v.number(),
  path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),

  state: v.union(
    v.literal("Idle"),
    v.literal("Transit"),
    v.literal("AtLocation"),
    v.literal("Interact"),
    v.literal("Sleep")
  ),
  nextDecisionAt: v.number(),

  currentConversationId: v.optional(v.id("conversations")),

  emotions: v.object({
    valence: v.number(),
    arousal: v.number(),
  }),
  needs: v.object({
    sleepiness: v.number(),
    hunger: v.number(),
    studyPressure: v.number(),
    socialDrive: v.number(),
  }),

  goals: v.array(
    v.object({
      name: v.string(),
      weight: v.number(),
    })
  ),
};

export const opinionFields = {
  agentId: v.id("agents"),
  targetAgentId: v.id("agents"),

  sentiment: v.number(),
  summary: v.string(),

  traits: v.optional(v.record(v.string(), v.number())),
};

export const decisionFields = {
  agentId: v.id("agents"),

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

  completedAt: v.optional(v.number()),

  llmLatencyMs: v.optional(v.number()),
};

export const conversationFields = {
  participantIds: v.array(v.id("agents")),
  status: v.union(v.literal("active"), v.literal("completed")),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  location: v.optional(v.object({ x: v.number(), y: v.number() })),
  nearestPlaceId: v.optional(v.id("places")),
  turnCount: v.number(),
};

export const messageFields = {
  conversationId: v.id("conversations"),
  agentId: v.id("agents"),
  content: v.string(),
  emotionSnapshot: v.optional(
    v.object({
      valence: v.number(),
      arousal: v.number(),
    })
  ),
  continueConversation: v.boolean(),
  reasonForLeaving: v.optional(v.string()),
};

export default defineSchema({
  map_settings: defineTable(mapSettingsFields),

  map_tiles: defineTable(mapTileFields)
    .index("by_coordinates", ["x", "y"])
    .index("by_place", ["placeId"])
    .index("by_type", ["tileType"])
    .index("by_walkable", ["isWalkable"]),

  places: defineTable(placeFields).index("by_kind", ["kind"]),

  world_settings: defineTable({
    isRunning: v.boolean(),
    observerCount: v.number(),
    adminEnabled: v.boolean(),
    tickHz: v.number(),
    currentTick: v.number(),
    simulationStartedAt: v.optional(v.number()),
    lastTickAt: v.optional(v.number()),
  }),

  observer: defineTable({
    sessionId: v.string(),
    lastHeartbeatAt: v.number(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        joinedAt: v.optional(v.number()),
      })
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_heartbeat", ["lastHeartbeatAt"]),

  agents: defineTable(agentFields),

  observations: defineTable({
    agentId: v.id("agents"),
    targetId: v.optional(v.id("agents")),
    targetType: v.union(
      v.literal("agent"),
      v.literal("place"),
      v.literal("event")
    ),

    location: v.object({ x: v.number(), y: v.number() }),
    distance: v.optional(v.number()),
    nearestPlaceId: v.optional(v.id("places")),
    timeOfDay: v.optional(v.string()),

    summary: v.optional(v.string()),
    salience: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_target", ["targetId"]),

  opinions: defineTable(opinionFields)
    .index("by_agent", ["agentId"])
    .index("by_target", ["targetAgentId"])
    .index("by_pair", ["agentId", "targetAgentId"]),

  decisions: defineTable(decisionFields)
    .index("by_agent", ["agentId"])
    .index("by_status", ["agentId", "completedAt"]),

  conversations: defineTable(conversationFields)
    .index("by_status", ["status"])
    .index("by_participant", ["participantIds"]),

  messages: defineTable(messageFields)
    .index("by_conversation", ["conversationId"])
    .index("by_agent", ["agentId"]),

  heartbeat_state: defineTable({
    isRunning: v.boolean(),
    lastStartedAt: v.number(),
    lastCompletedAt: v.number(),
    currentLeaderId: v.string(),
  }),

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
        severity: v.optional(v.string()),
      })
    ),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_type", ["type"]),
});
