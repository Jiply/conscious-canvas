import { v } from 'convex/values';
import { internal } from './_generated/api';
import { type MutationCtx, query, mutation } from './_generated/server';
import { placeFields, mapTileFields, mapSettingsFields } from './schema';

async function deleteAll(ctx: MutationCtx, table: 'map_tiles' | 'places' | 'map_settings') {
  const docs = await ctx.db.query(table).collect();
  for (const doc of docs) await ctx.db.delete(doc._id);
  return docs.length;
}

export const getMapSettings = query({
  args: {},
  returns: v.union(v.object({ _id: v.id('map_settings'), _creationTime: v.number(), ...mapSettingsFields }), v.null()),
  handler: async ctx => {
    console.log('🔍 [CONVEX] getMapSettings query START');
    const settings = await ctx.db.query('map_settings').first();
    console.log(`✅ [CONVEX] getMapSettings query COMPLETE: ${settings ? '1 settings document' : 'No settings found'}`);

    if (settings)
      console.log(`   📐 Map dimensions: ${settings.gridWidth}x${settings.gridHeight} tiles (${settings.tileSize}px each)\n`);

    return settings;
  },
});

export const getTilesBatch = query({
  args: { batchIndex: v.number(), batchSize: v.optional(v.number()) },
  returns: v.object({
    tiles: v.array(v.object({ _id: v.id('map_tiles'), _creationTime: v.number(), ...mapTileFields })),
    hasMore: v.boolean(),
    batchIndex: v.number(),
    totalBatches: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 4000;
    const skip = args.batchIndex * batchSize;
    console.log(`🔍 [CONVEX] getTilesBatch query START: batch ${args.batchIndex} (skip ${skip}, take ${batchSize})`);
    const allTiles = await ctx.db.query('map_tiles').collect();
    const totalTiles = allTiles.length;
    const totalBatches = Math.ceil(totalTiles / batchSize);
    const tiles = allTiles.slice(skip, skip + batchSize);
    const hasMore = skip + batchSize < totalTiles;
    console.log(`✅ [CONVEX] getTilesBatch COMPLETE: ${tiles.length} tiles (batch ${args.batchIndex + 1}/${totalBatches})\n`);
    return { tiles, hasMore, batchIndex: args.batchIndex, totalBatches };
  },
});

export const getTilesByRegion = query({
  args: { x: v.number(), y: v.number(), width: v.number(), height: v.number() },
  returns: v.array(v.object({ _id: v.id('map_tiles'), _creationTime: v.number(), ...mapTileFields })),
  handler: async (ctx, args) => {
    const { x, y, width, height } = args;
    const queryStart = Date.now();
    const CONVEX_ARRAY_SAFE_TILE_LIMIT = 8000;

    console.log(
      `🔍 [CONVEX] getTilesByRegion query START: region=(${x},${y}) size=${width}x${height} (${width * height} tiles requested)`
    );

    console.log('   → Querying database for all tiles...');
    const allTiles = await ctx.db.query('map_tiles').collect();
    console.log(`   ✓ Database returned ${allTiles.length} total tiles`);
    console.log('   → Filtering tiles for region bounds...');
    let tiles = allTiles.filter(tile => tile.x >= x && tile.x < x + width && tile.y >= y && tile.y < y + height);

    if (tiles.length > CONVEX_ARRAY_SAFE_TILE_LIMIT) {
      console.log(`   ⚠️  Result too large (${tiles.length} tiles), limiting to ${CONVEX_ARRAY_SAFE_TILE_LIMIT}`);
      tiles = tiles.slice(0, CONVEX_ARRAY_SAFE_TILE_LIMIT);
    }

    console.log(`   ✓ Filter resulted in ${tiles.length} tiles within region`);
    const queryEnd = Date.now();
    const duration = queryEnd - queryStart;
    console.log(
      `✅ [CONVEX] getTilesByRegion query COMPLETE: ${tiles.length} tiles fetched in ${duration}ms ${tiles.length > 0 ? `(${(duration / tiles.length).toFixed(2)}ms/tile)` : ''}`
    );

    console.log(`   📊 Query breakdown: DB query + filter = ${duration}ms total\n`);
    return tiles;
  },
});

export const getPlaces = query({
  args: {},
  returns: v.array(v.object({ _id: v.id('places'), _creationTime: v.number(), ...placeFields })),
  handler: async ctx => {
    console.log('🔍 [CONVEX] getPlaces query START');
    const places = await ctx.db.query('places').collect();
    console.log(`✅ [CONVEX] getPlaces query COMPLETE: ${places.length} places fetched`);

    if (places.length > 0) {
      const placeKinds = [...new Set(places.map(p => p.kind))];
      console.log(`   📍 Place types: ${placeKinds.join(', ')}\n`);
    }

    return places;
  },
});

export const initMap = mutation({
  args: { seed: v.optional(v.string()), force: v.optional(v.boolean()) },
  handler: async (
    ctx,
    args
  ): Promise<{ message: string; success: boolean; tilesCreated?: number; placesCreated?: number }> => {
    const existingSettings = await ctx.db.query('map_settings').first();

    if (existingSettings && !args.force)
      return { success: false, message: 'Map already initialized. Use force=true to regenerate.' };

    if (args.force && existingSettings) {
      console.log('🗑️  Clearing existing map data...');
      await deleteAll(ctx, 'map_tiles');
      await deleteAll(ctx, 'places');
      await ctx.db.delete(existingSettings._id);
      console.log('✓ Existing data cleared');
    }

    const result: { tilesCreated: number; placesCreated: number } = await ctx.runMutation(internal.seedMap.initializeMap, {
      seed: args.seed,
    });

    return {
      message: 'Map initialized successfully!',
      success: true,
      tilesCreated: result.tilesCreated,
      placesCreated: result.placesCreated,
    };
  },
  returns: v.object({
    message: v.string(),
    success: v.boolean(),
    tilesCreated: v.optional(v.number()),
    placesCreated: v.optional(v.number()),
  }),
});

export const clearAllTiles = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 1000;
    console.log(`🗑️  Clearing map tiles (batch size: ${batchSize})...`);
    const tiles = await ctx.db.query('map_tiles').take(batchSize);
    for (const tile of tiles) await ctx.db.delete(tile._id);
    const hasMore = (await ctx.db.query('map_tiles').first()) !== null;
    console.log(`✅ Deleted ${tiles.length} tiles${hasMore ? ' (more remaining)' : ''}`);
    return { hasMore, success: true, tilesDeleted: tiles.length };
  },
  returns: v.object({ hasMore: v.boolean(), success: v.boolean(), tilesDeleted: v.number() }),
});

export const clearAllPlaces = mutation({
  args: {},
  handler: async ctx => {
    console.log('🗑️  Clearing all places...');
    const deletedCount = await deleteAll(ctx, 'places');
    console.log(`✅ Deleted ${deletedCount} places`);
    return { success: true, placesDeleted: deletedCount };
  },
  returns: v.object({ success: v.boolean(), placesDeleted: v.number() }),
});

export const clearMapSettings = mutation({
  args: {},
  handler: async ctx => {
    console.log('🗑️  Clearing map settings...');
    const deletedCount = await deleteAll(ctx, 'map_settings');
    console.log(`✅ Deleted ${deletedCount} map settings`);
    return { success: true, settingsDeleted: deletedCount };
  },
  returns: v.object({ success: v.boolean(), settingsDeleted: v.number() }),
});

export const clearAllMapData = mutation({
  args: {},
  handler: async ctx => {
    console.log('🗑️  Clearing all map data...');
    const tilesDeleted = await deleteAll(ctx, 'map_tiles');
    const placesDeleted = await deleteAll(ctx, 'places');
    const settingsDeleted = await deleteAll(ctx, 'map_settings');
    console.log(`✅ Cleared: ${tilesDeleted} tiles, ${placesDeleted} places, ${settingsDeleted} settings`);
    return { success: true, tilesDeleted, placesDeleted, settingsDeleted };
  },
  returns: v.object({
    success: v.boolean(),
    tilesDeleted: v.number(),
    placesDeleted: v.number(),
    settingsDeleted: v.number(),
  }),
});
