import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

export const clearOldEvents = internalMutation({
  returns: v.number(),
  args: { olderThanMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;

    const oldEvents = await ctx.db
      .query('events')
      .withIndex('by_timestamp')
      .filter(q => q.lt(q.field('timestamp'), cutoff))
      .collect();

    for (const event of oldEvents) await ctx.db.delete(event._id);
    return oldEvents.length;
  },
});
