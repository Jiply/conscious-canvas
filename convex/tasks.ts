import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Example query - returns a test message
 * This file is kept for reference but not actively used.
 * The tasks table was removed in favor of the map system.
 */
export const get = query({
  args: {},
  returns: v.array(v.object({ message: v.string() })),
  handler: async (ctx) => {
    // Return empty array since tasks table doesn't exist
    return [];
  },
});
