/**
 * Continue Map Seeding
 *
 * Inserts remaining tiles after initial seed
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Continue inserting tiles by re-running the seed logic
 * but only inserting tiles that don't already exist
 */
export const continueInsertion = internalMutation({
  args: {},
  returns: v.object({
    tilesInserted: v.number(),
    totalTiles: v.number(),
    complete: v.boolean(),
  }),
  handler: async (ctx) => {
    // Get current tile count
    const existingTiles = await ctx.db.query("map_tiles").collect();
    const existingCount = existingTiles.length;

    console.log(`📊 Current tiles in DB: ${existingCount}/30000`);

    if (existingCount >= 30000) {
      console.log("✅ All tiles already inserted!");
      return {
        tilesInserted: 0,
        totalTiles: existingCount,
        complete: true,
      };
    }

    // Create a set of existing tile coordinates for fast lookup
    const existingCoords = new Set(existingTiles.map((t) => `${t.x},${t.y}`));

    console.log("🔄 Regenerating tile data to find missing tiles...");

    // We need to regenerate the tiles to know which ones to insert
    // This is not ideal, but it's the simplest approach without storing state
    // For now, return a message that we need a different approach

    console.log(
      "⚠️  This function needs to regenerate tiles - not yet implemented"
    );
    console.log(
      "→ For now, manually call initializeMap again with offset support"
    );

    return {
      tilesInserted: 0,
      totalTiles: existingCount,
      complete: false,
    };
  },
});
