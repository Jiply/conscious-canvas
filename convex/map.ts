import { v } from "convex/values";
import { internal } from "./_generated/api";
import { query, mutation } from "./_generated/server";

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

export const getTilesBatch = query({
  args: {
    batchIndex: v.number(),
    batchSize: v.optional(v.number()),
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

    const allTiles = await ctx.db.query("map_tiles").collect();
    const totalTiles = allTiles.length;
    const totalBatches = Math.ceil(totalTiles / batchSize);

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

    const MAX_TILES = 8000;

    console.log(
      `🔍 [CONVEX] getTilesByRegion query START: region=(${x},${y}) size=${width}x${height} (${width * height} tiles requested)`
    );

    console.log("   → Querying database for all tiles...");
    const allTiles = await ctx.db.query("map_tiles").collect();
    console.log(`   ✓ Database returned ${allTiles.length} total tiles`);

    console.log(`   → Filtering tiles for region bounds...`);
    let tiles = allTiles.filter(
      (tile) =>
        tile.x >= x && tile.x < x + width && tile.y >= y && tile.y < y + height
    );

    // stays under Convex's array size limit
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
    const existingSettings = await ctx.db.query("map_settings").first();

    if (existingSettings && !args.force) {
      return {
        success: false,
        message: "Map already initialized. Use force=true to regenerate.",
      };
    }

    if (args.force && existingSettings) {
      console.log("🗑️  Clearing existing map data...");

      const tiles = await ctx.db.query("map_tiles").collect();
      for (const tile of tiles) {
        await ctx.db.delete(tile._id);
      }

      const places = await ctx.db.query("places").collect();
      for (const place of places) {
        await ctx.db.delete(place._id);
      }

      await ctx.db.delete(existingSettings._id);

      console.log("✓ Existing data cleared");
    }

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

    const tiles = await ctx.db.query("map_tiles").collect();
    let tilesDeleted = 0;
    for (const tile of tiles) {
      await ctx.db.delete(tile._id);
      tilesDeleted++;
    }

    const places = await ctx.db.query("places").collect();
    let placesDeleted = 0;
    for (const place of places) {
      await ctx.db.delete(place._id);
      placesDeleted++;
    }

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

