/**
 * Map Queries and Mutations
 *
 * Public and internal functions for accessing and modifying the map data.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { query, mutation, internalMutation } from "./_generated/server";

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
    console.log("🔍 [CONVEX] getMapSettings query START");
    const settings = await ctx.db.query("map_settings").first();
    console.log(
      `✅ [CONVEX] getMapSettings query COMPLETE: ${settings ? "1 settings document" : "No settings found"}`
    );
    if (settings) {
      console.log(
        `   📐 Map dimensions: ${settings.gridWidth}x${settings.gridHeight} tiles (${settings.tileSize}px each)\n`
      );
    }
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
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 4000;
    console.log(`🔍 [CONVEX] getAllTiles query START (limit=${limit})`);
    const tiles = await ctx.db.query("map_tiles").take(limit);
    console.log(
      `✅ [CONVEX] getAllTiles query COMPLETE: ${tiles.length} tiles fetched\n`
    );
    return tiles;
  },
});

/**
 * Get tiles by batch index - for efficient parallel fetching of entire map
 * Splits 30,000 tiles into batches of ~4,000 for parallel loading
 */
export const getTilesBatch = query({
  args: {
    batchIndex: v.number(), // 0, 1, 2, 3, etc.
    batchSize: v.optional(v.number()), // defaults to 4000
  },
  returns: v.object({
    tiles: v.array(
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
      })
    ),
    batchIndex: v.number(),
    totalBatches: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 4000;
    const skip = args.batchIndex * batchSize;

    console.log(
      `🔍 [CONVEX] getTilesBatch query START: batch ${args.batchIndex} (skip ${skip}, take ${batchSize})`
    );

    // Get total count first
    const allTiles = await ctx.db.query("map_tiles").collect();
    const totalTiles = allTiles.length;
    const totalBatches = Math.ceil(totalTiles / batchSize);

    // Get this batch
    const tiles = allTiles.slice(skip, skip + batchSize);
    const hasMore = skip + batchSize < totalTiles;

    console.log(
      `✅ [CONVEX] getTilesBatch COMPLETE: ${tiles.length} tiles (batch ${args.batchIndex + 1}/${totalBatches})\n`
    );

    return {
      tiles,
      batchIndex: args.batchIndex,
      totalBatches,
      hasMore,
    };
  },
});

/**
 * Get tiles within a specific rectangular region (viewport-based fetching)
 * DEPRECATED: Use client-side filtering on cached tiles instead
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
    })
  ),
  handler: async (ctx, args) => {
    const { x, y, width, height } = args;
    const queryStart = Date.now();

    // Convex has a limit of 8,192 items in array responses
    const MAX_TILES = 8000;

    console.log(
      `🔍 [CONVEX] getTilesByRegion query START: region=(${x},${y}) size=${width}x${height} (${width * height} tiles requested)`
    );

    // OPTIMIZED: Single query with filter instead of nested loops!
    // This is 10-100x faster than the old nested loop approach
    console.log("   → Querying database for all tiles...");
    const allTiles = await ctx.db.query("map_tiles").collect();
    console.log(`   ✓ Database returned ${allTiles.length} total tiles`);

    console.log(`   → Filtering tiles for region bounds...`);
    let tiles = allTiles.filter(
      (tile) =>
        tile.x >= x && tile.x < x + width && tile.y >= y && tile.y < y + height
    );

    // Limit to prevent exceeding Convex's array size limit
    if (tiles.length > MAX_TILES) {
      console.log(
        `   ⚠️  Result too large (${tiles.length} tiles), limiting to ${MAX_TILES}`
      );
      tiles = tiles.slice(0, MAX_TILES);
    }

    console.log(`   ✓ Filter resulted in ${tiles.length} tiles within region`);

    const queryEnd = Date.now();
    const duration = queryEnd - queryStart;
    console.log(
      `✅ [CONVEX] getTilesByRegion query COMPLETE: ${tiles.length} tiles fetched in ${duration}ms ${tiles.length > 0 ? `(${(duration / tiles.length).toFixed(2)}ms/tile)` : ""}`
    );
    console.log(
      `   📊 Query breakdown: DB query + filter = ${duration}ms total\n`
    );

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
    console.log("🔍 [CONVEX] getPlaces query START");
    const places = await ctx.db.query("places").collect();
    console.log(
      `✅ [CONVEX] getPlaces query COMPLETE: ${places.length} places fetched`
    );
    if (places.length > 0) {
      const placeKinds = [...new Set(places.map((p) => p.kind))];
      console.log(`   📍 Place types: ${placeKinds.join(", ")}\n`);
    }
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
// CLEAR FUNCTIONS
// ========================================

/**
 * Clear all map tiles in batches (for large datasets)
 */
export const clearAllTiles = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    tilesDeleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 1000;
    console.log(`🗑️  Clearing map tiles (batch size: ${batchSize})...`);

    const tiles = await ctx.db.query("map_tiles").take(batchSize);
    let deletedCount = 0;

    for (const tile of tiles) {
      await ctx.db.delete(tile._id);
      deletedCount++;
    }

    const remaining = await ctx.db.query("map_tiles").first();
    const hasMore = remaining !== null;

    console.log(
      `✅ Deleted ${deletedCount} tiles${hasMore ? " (more remaining)" : ""}`
    );
    return {
      success: true,
      tilesDeleted: deletedCount,
      hasMore,
    };
  },
});

/**
 * Clear all places
 */
export const clearAllPlaces = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    placesDeleted: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🗑️  Clearing all places...");
    const places = await ctx.db.query("places").collect();
    let deletedCount = 0;

    for (const place of places) {
      await ctx.db.delete(place._id);
      deletedCount++;
    }

    console.log(`✅ Deleted ${deletedCount} places`);
    return {
      success: true,
      placesDeleted: deletedCount,
    };
  },
});

/**
 * Clear map settings
 */
export const clearMapSettings = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    settingsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🗑️  Clearing map settings...");
    const settings = await ctx.db.query("map_settings").collect();
    let deletedCount = 0;

    for (const setting of settings) {
      await ctx.db.delete(setting._id);
      deletedCount++;
    }

    console.log(`✅ Deleted ${deletedCount} map settings`);
    return {
      success: true,
      settingsDeleted: deletedCount,
    };
  },
});

/**
 * Clear all map-related data (tiles, places, settings)
 */
export const clearAllMapData = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    tilesDeleted: v.number(),
    placesDeleted: v.number(),
    settingsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🗑️  Clearing all map data...");

    // Clear tiles
    const tiles = await ctx.db.query("map_tiles").collect();
    let tilesDeleted = 0;
    for (const tile of tiles) {
      await ctx.db.delete(tile._id);
      tilesDeleted++;
    }

    // Clear places
    const places = await ctx.db.query("places").collect();
    let placesDeleted = 0;
    for (const place of places) {
      await ctx.db.delete(place._id);
      placesDeleted++;
    }

    // Clear settings
    const settings = await ctx.db.query("map_settings").collect();
    let settingsDeleted = 0;
    for (const setting of settings) {
      await ctx.db.delete(setting._id);
      settingsDeleted++;
    }

    console.log(
      `✅ Cleared: ${tilesDeleted} tiles, ${placesDeleted} places, ${settingsDeleted} settings`
    );
    return {
      success: true,
      tilesDeleted,
      placesDeleted,
      settingsDeleted,
    };
  },
});

/**
 * Get tile count for verification
 */
export const getTileCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const tiles = await ctx.db.query("map_tiles").collect();
    return tiles.length;
  },
});

/**
 * Get places count for verification
 */
export const getPlacesCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const places = await ctx.db.query("places").collect();
    return places.length;
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
