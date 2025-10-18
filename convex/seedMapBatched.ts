/**
 * Batched Map Seeding
 *
 * Handles large map generation by splitting into multiple function calls
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Continue inserting tiles in batches
 * Call this multiple times until all tiles are inserted
 */
export const insertTileBatch = internalMutation({
  args: {
    offset: v.number(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    tilesInserted: v.number(),
    totalTiles: v.number(),
    hasMore: v.boolean(),
    nextOffset: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10000;
    const offset = args.offset;

    // Get all tiles from the map_tiles table to count total
    const allTiles = await ctx.db.query("map_tiles").collect();
    const totalExisting = allTiles.length;

    console.log(
      `📊 Current tiles in DB: ${totalExisting}, inserting batch starting at offset ${offset}`
    );

    // This function is meant to be called after initializeMap
    // which should have stored the tile data somewhere we can retrieve it
    // For now, we'll return a message that this needs to be called differently

    return {
      tilesInserted: 0,
      totalTiles: totalExisting,
      hasMore: false,
      nextOffset: offset,
    };
  },
});
