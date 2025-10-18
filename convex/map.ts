/**
 * Map Queries and Mutations
 *
 * Public and internal functions for accessing and modifying the map data.
 */

import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ========================================
// PUBLIC QUERIES
// ========================================

/**
 * Get the global map settings
 */
export const getMapSettings = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("map_settings"),
      _creationTime: v.number(),
      gridWidth: v.number(),
      gridHeight: v.number(),
      tileSize: v.number(),
      metersPerTile: v.number(),
      version: v.number(),
      lastRegeneratedAt: v.optional(v.number()),
      seed: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const settings = await ctx.db.query("map_settings").first();
    return settings;
  },
});

/**
 * Get all tiles in the map (use with caution - 4000 tiles!)
 * For production, use getTilesByRegion instead
 */
export const getAllTiles = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("map_tiles"),
      _creationTime: v.number(),
      x: v.number(),
      y: v.number(),
      tileType: v.union(
        v.literal("floor"),
        v.literal("wall"),
        v.literal("door"),
        v.literal("grass"),
        v.literal("water"),
        v.literal("path"),
        v.literal("void")
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
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 4000;
    const tiles = await ctx.db.query("map_tiles").take(limit);
    return tiles;
  },
});

/**
 * Get tiles within a specific rectangular region (viewport-based fetching)
 * More efficient than getting all tiles
 */
export const getTilesByRegion = query({
  args: {
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("map_tiles"),
      _creationTime: v.number(),
      x: v.number(),
      y: v.number(),
      tileType: v.union(
        v.literal("floor"),
        v.literal("wall"),
        v.literal("door"),
        v.literal("grass"),
        v.literal("water"),
        v.literal("path"),
        v.literal("void")
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
    })
  ),
  handler: async (ctx, args) => {
    const { x, y, width, height } = args;
    const tiles = [];

    // Query tiles within the region
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        const tile = await ctx.db
          .query("map_tiles")
          .withIndex("by_coordinates", (q) => q.eq("x", col).eq("y", row))
          .first();
        if (tile) {
          tiles.push(tile);
        }
      }
    }

    return tiles;
  },
});

/**
 * Get a single tile at specific coordinates
 */
export const getTileAt = query({
  args: {
    x: v.number(),
    y: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("map_tiles"),
      _creationTime: v.number(),
      x: v.number(),
      y: v.number(),
      tileType: v.union(
        v.literal("floor"),
        v.literal("wall"),
        v.literal("door"),
        v.literal("grass"),
        v.literal("water"),
        v.literal("path"),
        v.literal("void")
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const tile = await ctx.db
      .query("map_tiles")
      .withIndex("by_coordinates", (q) => q.eq("x", args.x).eq("y", args.y))
      .first();
    return tile || null;
  },
});

/**
 * Get all places in the campus
 */
export const getPlaces = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("places"),
      _creationTime: v.number(),
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
    })
  ),
  handler: async (ctx) => {
    const places = await ctx.db.query("places").collect();
    return places;
  },
});

/**
 * Get a specific place by ID
 */
export const getPlaceById = query({
  args: {
    placeId: v.id("places"),
  },
  returns: v.union(
    v.object({
      _id: v.id("places"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const place = await ctx.db.get(args.placeId);
    return place;
  },
});

/**
 * Get places by kind (e.g., all "dorm" places)
 */
export const getPlacesByKind = query({
  args: {
    kind: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("places"),
      _creationTime: v.number(),
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
    })
  ),
  handler: async (ctx, args) => {
    const places = await ctx.db
      .query("places")
      .withIndex("by_kind", (q) => q.eq("kind", args.kind))
      .collect();
    return places;
  },
});

/**
 * Get all walkable tiles (for pathfinding initialization)
 */
export const getWalkableTiles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("map_tiles"),
      _creationTime: v.number(),
      x: v.number(),
      y: v.number(),
      tileType: v.union(
        v.literal("floor"),
        v.literal("wall"),
        v.literal("door"),
        v.literal("grass"),
        v.literal("water"),
        v.literal("path"),
        v.literal("void")
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
    })
  ),
  handler: async (ctx) => {
    const walkableTiles = await ctx.db
      .query("map_tiles")
      .withIndex("by_walkable", (q) => q.eq("isWalkable", true))
      .collect();
    return walkableTiles;
  },
});

// ========================================
// PUBLIC MUTATIONS
// ========================================

/**
 * Trigger map initialization (public for testing, should be internal in production)
 */
export const initMap = mutation({
  args: {
    seed: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    tilesCreated: v.optional(v.number()),
    placesCreated: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    message: string;
    tilesCreated?: number;
    placesCreated?: number;
  }> => {
    // Check if map already exists
    const existingSettings = await ctx.db.query("map_settings").first();

    if (existingSettings && !args.force) {
      return {
        success: false,
        message: "Map already initialized. Use force=true to regenerate.",
      };
    }

    // Clear existing data if force regeneration
    if (args.force && existingSettings) {
      console.log("🗑️  Clearing existing map data...");

      // Delete all tiles
      const tiles = await ctx.db.query("map_tiles").collect();
      for (const tile of tiles) {
        await ctx.db.delete(tile._id);
      }

      // Delete all places
      const places = await ctx.db.query("places").collect();
      for (const place of places) {
        await ctx.db.delete(place._id);
      }

      // Delete settings
      await ctx.db.delete(existingSettings._id);

      console.log("✓ Existing data cleared");
    }

    // Initialize map
    const result: { tilesCreated: number; placesCreated: number } =
      await ctx.runMutation(internal.seedMap.initializeMap, {
        seed: args.seed,
      });

    return {
      success: true,
      message: "Map initialized successfully!",
      tilesCreated: result.tilesCreated,
      placesCreated: result.placesCreated,
    };
  },
});

// ========================================
// INTERNAL MUTATIONS
// ========================================

/**
 * Update a single tile's properties
 */
export const updateTile = internalMutation({
  args: {
    x: v.number(),
    y: v.number(),
    updates: v.object({
      tileType: v.optional(
        v.union(
          v.literal("floor"),
          v.literal("wall"),
          v.literal("door"),
          v.literal("grass"),
          v.literal("water"),
          v.literal("path"),
          v.literal("void")
        )
      ),
      isWalkable: v.optional(v.boolean()),
      visualVariant: v.optional(v.number()),
      placeId: v.optional(v.id("places")),
    }),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const tile = await ctx.db
      .query("map_tiles")
      .withIndex("by_coordinates", (q) => q.eq("x", args.x).eq("y", args.y))
      .first();

    if (!tile) {
      return false;
    }

    await ctx.db.patch(tile._id, args.updates);
    return true;
  },
});

/**
 * Batch update multiple tiles
 */
export const batchUpdateTiles = internalMutation({
  args: {
    updates: v.array(
      v.object({
        x: v.number(),
        y: v.number(),
        tileType: v.optional(
          v.union(
            v.literal("floor"),
            v.literal("wall"),
            v.literal("door"),
            v.literal("grass"),
            v.literal("water"),
            v.literal("path"),
            v.literal("void")
          )
        ),
        isWalkable: v.optional(v.boolean()),
      })
    ),
  },
  returns: v.object({
    updated: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    let updated = 0;
    let failed = 0;

    for (const update of args.updates) {
      const tile = await ctx.db
        .query("map_tiles")
        .withIndex("by_coordinates", (q) =>
          q.eq("x", update.x).eq("y", update.y)
        )
        .first();

      if (tile) {
        await ctx.db.patch(tile._id, {
          tileType: update.tileType,
          isWalkable: update.isWalkable,
        });
        updated++;
      } else {
        failed++;
      }
    }

    return { updated, failed };
  },
});
