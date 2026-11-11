import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const heartbeat = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query('observer')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .first();

    if (existing) await ctx.db.patch(existing._id, { lastHeartbeatAt: now });
    else {
      await ctx.db.insert('observer', { lastHeartbeatAt: now, sessionId: args.sessionId, metadata: { joinedAt: now } });

      await ctx.db.insert('events', {
        type: 'world',
        metadata: { severity: 'info' },
        timestamp: now,
        description: '👁️ A new observer has entered the simulation',
      });
    }

    const cutoff = now - 15000;

    const activeObservers = await ctx.db
      .query('observer')
      .withIndex('by_heartbeat')
      .filter(q => q.gte(q.field('lastHeartbeatAt'), cutoff))
      .collect();

    const observerCount = activeObservers.length;
    const worldSettings = await ctx.db.query('world_settings').first();

    if (!worldSettings)
      await ctx.db.insert('world_settings', {
        tickHz: 0.2,
        observerCount,
        currentTick: 0,
        adminEnabled: true,
        lastTickAt: undefined,
        isRunning: observerCount > 0,
        simulationStartedAt: observerCount > 0 ? now : undefined,
      });
    else {
      const wasRunning = worldSettings.isRunning;
      const shouldRun = observerCount > 0 && worldSettings.adminEnabled;

      if (!wasRunning && shouldRun) {
        const timestamp = new Date(now).toLocaleTimeString('en-US', { hour12: false });
        console.log(
          `⏰ [${timestamp}] 🌍 World AWAKENS: ${observerCount} ${observerCount === 1 ? 'observer' : 'observers'} watching`
        );

        await ctx.db.insert('events', {
          type: 'world',
          metadata: { severity: 'important' },
          timestamp: now,
          description: `🌍 Universe awakens: ${observerCount} ${observerCount === 1 ? 'observer' : 'observers'} watching`,
        });
      } else if (wasRunning && !shouldRun) {
        const timestamp = new Date(now).toLocaleTimeString('en-US', { hour12: false });
        console.log(`⏰ [${timestamp}] 🧊 Universe FROZEN: No observers remain`);

        await ctx.db.insert('events', {
          type: 'world',
          metadata: { severity: 'important' },
          timestamp: now,
          description: '🧊 Universe frozen: No observers remain',
        });
      }

      await ctx.db.patch(worldSettings._id, {
        observerCount,
        isRunning: shouldRun,
        simulationStartedAt: !wasRunning && shouldRun ? now : worldSettings.simulationStartedAt,
      });
    }

    return { observerCount, isWorldRunning: observerCount > 0 };
  },
  returns: v.object({ observerCount: v.number(), isWorldRunning: v.boolean() }),
});

export const getWorldState = query({
  args: {},
  handler: async ctx => {
    const worldSettings = await ctx.db.query('world_settings').first();
    if (!worldSettings) return { isRunning: false, adminEnabled: true, observerCount: 0 };

    return {
      isRunning: worldSettings.isRunning,
      adminEnabled: worldSettings.adminEnabled,
      observerCount: worldSettings.observerCount,
    };
  },
  returns: v.object({ isRunning: v.boolean(), adminEnabled: v.boolean(), observerCount: v.number() }),
});

export const toggleAdmin = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const worldSettings = await ctx.db.query('world_settings').first();

    if (!worldSettings)
      await ctx.db.insert('world_settings', {
        tickHz: 0.2,
        currentTick: 0,
        isRunning: false,
        observerCount: 0,
        adminEnabled: args.enabled,
      });
    else
      await ctx.db.patch(worldSettings._id, {
        adminEnabled: args.enabled,
        isRunning: args.enabled && worldSettings.observerCount > 0,
      });

    await ctx.db.insert('events', {
      type: 'world',
      metadata: { severity: 'critical' },
      timestamp: now,
      description: args.enabled
        ? '⚙️ Admin enabled simulation - universe can run'
        : '⚙️ Admin disabled simulation - universe force frozen',
    });

    return null;
  },
  returns: v.null(),
});

export const cleanupStaleObservers = mutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const cutoff = now - 60000;

    const staleObservers = await ctx.db
      .query('observer')
      .withIndex('by_heartbeat')
      .filter(q => q.lt(q.field('lastHeartbeatAt'), cutoff))
      .collect();

    for (const observer of staleObservers) await ctx.db.delete(observer._id);
    return staleObservers.length;
  },
  returns: v.number(),
});
