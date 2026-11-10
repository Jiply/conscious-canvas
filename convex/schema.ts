import { v } from 'convex/values';
import { defineTable, defineSchema } from 'convex/server';

export const mapSettingsFields = {
  version: v.number(),
  tileSize: v.number(),
  gridWidth: v.number(),
  gridHeight: v.number(),
  metersPerTile: v.number(),
  seed: v.optional(v.string()),
  lastRegeneratedAt: v.optional(v.number()),
};

export const mapTileFields = {
  x: v.number(),
  y: v.number(),
  isWalkable: v.boolean(),
  placeId: v.optional(v.id('places')),
  visualVariant: v.optional(v.number()),
  metadata: v.optional(v.object({ biome: v.optional(v.string()), lightLevel: v.optional(v.number()) })),
  tileType: v.union(
    v.literal('floor'),
    v.literal('wall'),
    v.literal('door'),
    v.literal('grass'),
    v.literal('water'),
    v.literal('path'),
    v.literal('void'),
    v.literal('tall_tree'),
    v.literal('short_tree'),
    v.literal('bush'),
    v.literal('flower_bed'),
    v.literal('concrete'),
    v.literal('brick_path'),
    v.literal('cafe_stall'),
    v.literal('study_desk'),
    v.literal('bookshelf'),
    v.literal('lounge_chair'),
    v.literal('laundry_machine'),
    v.literal('lecture_seat'),
    v.literal('library_desk'),
    v.literal('dorm_bed'),
    v.literal('kitchen_counter')
  ),
};

export const placeFields = {
  kind: v.string(),
  name: v.string(),
  isIndoor: v.boolean(),
  capacity: v.optional(v.number()),
  description: v.optional(v.string()),
  bounds: v.object({ x: v.number(), y: v.number(), width: v.number(), height: v.number() }),
  entrances: v.array(v.object({ x: v.number(), y: v.number(), facing: v.optional(v.string()) })),
  metadata: v.optional(v.object({ ambientSound: v.optional(v.string()), realWorldInspiration: v.optional(v.string()) })),
};

export const agentFields = {
  name: v.string(),
  headingRad: v.number(),
  nextDecisionAt: v.number(),
  personality: v.optional(v.string()),
  profilePicture: v.optional(v.string()),
  pos: v.object({ x: v.number(), y: v.number() }),
  currentConversationId: v.optional(v.id('conversations')),
  emotions: v.object({ valence: v.number(), arousal: v.number() }),
  goals: v.array(v.object({ name: v.string(), weight: v.number() })),
  path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
  role: v.union(v.literal('student'), v.literal('prof'), v.literal('barista')),
  needs: v.object({ hunger: v.number(), sleepiness: v.number(), socialDrive: v.number(), studyPressure: v.number() }),
  state: v.union(v.literal('Idle'), v.literal('Transit'), v.literal('AtLocation'), v.literal('Interact'), v.literal('Sleep')),
};

export const opinionFields = {
  summary: v.string(),
  sentiment: v.number(),
  agentId: v.id('agents'),
  targetAgentId: v.id('agents'),
  traits: v.optional(v.record(v.string(), v.number())),
};

export const decisionFields = {
  agentId: v.id('agents'),
  utterance: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  innerThought: v.optional(v.string()),
  llmLatencyMs: v.optional(v.number()),
  targetPlaceId: v.optional(v.id('places')),
  targetAgentId: v.optional(v.id('agents')),
  action: v.union(
    v.literal('MoveTo'),
    v.literal('EngageConversation'),
    v.literal('Study'),
    v.literal('Eat'),
    v.literal('Idle'),
    v.literal('Sleep')
  ),
};

export const conversationFields = {
  startedAt: v.number(),
  turnCount: v.number(),
  completedAt: v.optional(v.number()),
  participantIds: v.array(v.id('agents')),
  nearestPlaceId: v.optional(v.id('places')),
  status: v.union(v.literal('active'), v.literal('completed')),
  location: v.optional(v.object({ x: v.number(), y: v.number() })),
};

export const messageFields = {
  content: v.string(),
  agentId: v.id('agents'),
  continueConversation: v.boolean(),
  conversationId: v.id('conversations'),
  reasonForLeaving: v.optional(v.string()),
  emotionSnapshot: v.optional(v.object({ valence: v.number(), arousal: v.number() })),
};

export default defineSchema({
  agents: defineTable(agentFields),
  map_settings: defineTable(mapSettingsFields),
  places: defineTable(placeFields).index('by_kind', ['kind']),
  messages: defineTable(messageFields).index('by_conversation', ['conversationId']).index('by_agent', ['agentId']),
  decisions: defineTable(decisionFields).index('by_agent', ['agentId']).index('by_status', ['agentId', 'completedAt']),
  conversations: defineTable(conversationFields).index('by_status', ['status']).index('by_participant', ['participantIds']),
  heartbeat_state: defineTable({
    isRunning: v.boolean(),
    lastStartedAt: v.number(),
    lastCompletedAt: v.number(),
    currentLeaderId: v.string(),
  }),
  opinions: defineTable(opinionFields)
    .index('by_agent', ['agentId'])
    .index('by_target', ['targetAgentId'])
    .index('by_pair', ['agentId', 'targetAgentId']),
  map_tiles: defineTable(mapTileFields)
    .index('by_coordinates', ['x', 'y'])
    .index('by_place', ['placeId'])
    .index('by_type', ['tileType'])
    .index('by_walkable', ['isWalkable']),
  world_settings: defineTable({
    tickHz: v.number(),
    isRunning: v.boolean(),
    currentTick: v.number(),
    observerCount: v.number(),
    adminEnabled: v.boolean(),
    lastTickAt: v.optional(v.number()),
    simulationStartedAt: v.optional(v.number()),
  }),
  observer: defineTable({
    sessionId: v.string(),
    lastHeartbeatAt: v.number(),
    metadata: v.optional(v.object({ joinedAt: v.optional(v.number()), userAgent: v.optional(v.string()) })),
  })
    .index('by_session', ['sessionId'])
    .index('by_heartbeat', ['lastHeartbeatAt']),
  observations: defineTable({
    salience: v.number(),
    agentId: v.id('agents'),
    summary: v.optional(v.string()),
    distance: v.optional(v.number()),
    timeOfDay: v.optional(v.string()),
    targetId: v.optional(v.id('agents')),
    nearestPlaceId: v.optional(v.id('places')),
    location: v.object({ x: v.number(), y: v.number() }),
    targetType: v.union(v.literal('agent'), v.literal('place'), v.literal('event')),
  })
    .index('by_agent', ['agentId'])
    .index('by_target', ['targetId']),
  events: defineTable({
    timestamp: v.number(),
    description: v.string(),
    agentIds: v.optional(v.array(v.id('agents'))),
    location: v.optional(v.object({ x: v.number(), y: v.number() })),
    metadata: v.optional(v.object({ severity: v.optional(v.string()), placeId: v.optional(v.id('places')) })),
    type: v.union(
      v.literal('decision'),
      v.literal('conversation'),
      v.literal('observation'),
      v.literal('world'),
      v.literal('movement')
    ),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_type', ['type']),
});
