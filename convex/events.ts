import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get recent events for the event feed
 */
export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      timestamp: v.number(),
      type: v.string(),
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
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const events = await ctx.db
      .query("events")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return events;
  },
});

/**
 * Log a new event
 */
export const logEvent = mutation({
  args: {
    type: v.union(
      v.literal("decision"),
      v.literal("conversation"),
      v.literal("observation"),
      v.literal("world"),
      v.literal("movement")
    ),
    description: v.string(),
    agentIds: v.optional(v.array(v.id("agents"))),
    location: v.optional(v.object({ x: v.number(), y: v.number() })),
    metadata: v.optional(
      v.object({
        placeId: v.optional(v.id("places")),
        severity: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      timestamp: Date.now(),
      type: args.type,
      description: args.description,
      agentIds: args.agentIds,
      location: args.location,
      metadata: args.metadata,
    });

    return eventId;
  },
});

/**
 * Clear old events (optional cleanup)
 */
export const clearOldEvents = mutation({
  args: {
    olderThanMs: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const oldEvents = await ctx.db
      .query("events")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .collect();

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }

    return oldEvents.length;
  },
});
