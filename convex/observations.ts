import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ========== MUTATIONS ==========

/**
 * Add an observation for an agent
 */
export const addObservation = mutation({
  args: {
    agentId: v.id("agents"),
    targetId: v.optional(v.id("agents")),
    targetType: v.union(
      v.literal("agent"),
      v.literal("place"),
      v.literal("event")
    ),
    location: v.object({ x: v.number(), y: v.number() }),
    distance: v.optional(v.number()),
    summary: v.optional(v.string()),
    salience: v.number(),
  },
  returns: v.id("observations"),
  handler: async (ctx, args) => {
    const observationId = await ctx.db.insert("observations", {
      agentId: args.agentId,
      targetId: args.targetId,
      targetType: args.targetType,
      location: args.location,
      distance: args.distance,
      summary: args.summary,
      salience: args.salience,
    });

    return observationId;
  },
});

/**
 * Batch add observations (for perception sweep)
 */
export const addObservationBatch = mutation({
  args: {
    observations: v.array(
      v.object({
        agentId: v.id("agents"),
        targetId: v.optional(v.id("agents")),
        targetType: v.union(
          v.literal("agent"),
          v.literal("place"),
          v.literal("event")
        ),
        location: v.object({ x: v.number(), y: v.number() }),
        distance: v.optional(v.number()),
        summary: v.optional(v.string()),
        salience: v.number(),
      })
    ),
  },
  returns: v.array(v.id("observations")),
  handler: async (ctx, args) => {
    const ids = [];
    for (const obs of args.observations) {
      const id = await ctx.db.insert("observations", obs);
      ids.push(id);
    }
    return ids;
  },
});

/**
 * Prune old observations (keep only last N per agent)
 */
export const pruneObservations = mutation({
  args: {
    agentId: v.id("agents"),
    keepCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const observations = await ctx.db
      .query("observations")
      .withIndex("by_agent_and_time", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    // Delete all except the most recent keepCount
    const toDelete = observations.slice(args.keepCount);
    for (const obs of toDelete) {
      await ctx.db.delete(obs._id);
    }

    return null;
  },
});

// ========== QUERIES ==========

/**
 * Get recent observations for an agent
 */
export const getRecentObservations = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("observations"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetId: v.optional(v.id("agents")),
      targetType: v.union(
        v.literal("agent"),
        v.literal("place"),
        v.literal("event")
      ),
      location: v.object({ x: v.number(), y: v.number() }),
      distance: v.optional(v.number()),
      summary: v.optional(v.string()),
      salience: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("observations")
      .withIndex("by_agent_and_time", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get observations of a specific target agent
 */
export const getObservationsOfTarget = query({
  args: {
    targetId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("observations"),
      _creationTime: v.number(),
      agentId: v.id("agents"),
      targetId: v.optional(v.id("agents")),
      targetType: v.union(
        v.literal("agent"),
        v.literal("place"),
        v.literal("event")
      ),
      location: v.object({ x: v.number(), y: v.number() }),
      distance: v.optional(v.number()),
      summary: v.optional(v.string()),
      salience: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("observations")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(limit);
  },
});
