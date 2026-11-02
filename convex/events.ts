import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
