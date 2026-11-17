import { v } from 'convex/values';
import { OBSERVER_TIMEOUT_MS, startTickLoopIfStopped } from './world';
import { type MutationCtx, query, mutation, internalMutation } from './_generated/server';
const MAX_SESSION_ID_LENGTH = 64;
// Pages report every 5 seconds; this only stops a script from writing a row faster than that.
const MIN_HEARTBEAT_WRITE_GAP_MS = 2000;
// Each report reads every active observer to count them, so the cap also bounds that read.
const MAX_ACTIVE_OBSERVERS = 50;
const STALE_OBSERVER_MS = 60000;
const STALE_OBSERVERS_DELETED_PER_JOIN = 10;

// Public because every open /sim page reports itself here; it can only keep the world running, never stop or own it.
export const heartbeat = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (args.sessionId.length === 0 || args.sessionId.length > MAX_SESSION_ID_LENGTH) throw new Error('Invalid session id');
    const now = Date.now();
    const cutoff = now - OBSERVER_TIMEOUT_MS;

    const activeObservers = await ctx.db
      .query('observer')
      .withIndex('by_heartbeat', q => q.gte('lastHeartbeatAt', cutoff))
      .take(MAX_ACTIVE_OBSERVERS);

    const existing = await ctx.db
      .query('observer')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .first();

    if (existing) {
      if (existing.lastHeartbeatAt < now - MIN_HEARTBEAT_WRITE_GAP_MS)
        await ctx.db.patch(existing._id, { lastHeartbeatAt: now });
    } else if (activeObservers.length < MAX_ACTIVE_OBSERVERS) {
      await deleteStaleObservers(ctx, now);
      await ctx.db.insert('observer', { lastHeartbeatAt: now, sessionId: args.sessionId, metadata: { joinedAt: now } });
    }

    const isCounted = existing !== null || activeObservers.length < MAX_ACTIVE_OBSERVERS;
    const observerCount = activeObservers.filter(o => o.sessionId !== args.sessionId).length + (isCounted ? 1 : 0);
    const worldSettings = await getOrCreateWorldSettings(ctx);
    const wasRunning = worldSettings.isRunning;
    const isWorldRunning = worldSettings.adminEnabled;

    if (!wasRunning && isWorldRunning) {
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
    }

    if (worldSettings.observerCount !== observerCount || wasRunning !== isWorldRunning)
      await ctx.db.patch(worldSettings._id, {
        observerCount,
        isRunning: isWorldRunning,
        simulationStartedAt: !wasRunning && isWorldRunning ? now : worldSettings.simulationStartedAt,
      });

    if (isWorldRunning) await startTickLoopIfStopped(ctx);
    return null;
  },
  returns: v.null(),
});

async function getOrCreateWorldSettings(ctx: MutationCtx) {
  const existing = await ctx.db.query('world_settings').first();
  if (existing) return existing;

  const worldSettingsId = await ctx.db.insert('world_settings', {
    tickHz: 0.2,
    currentTick: 0,
    isRunning: false,
    observerCount: 0,
    adminEnabled: true,
  });

  const created = await ctx.db.get(worldSettingsId);
  if (!created) throw new Error('Failed to create world settings');
  return created;
}

async function deleteStaleObservers(ctx: MutationCtx, now: number) {
  const staleObservers = await ctx.db
    .query('observer')
    .withIndex('by_heartbeat', q => q.lt('lastHeartbeatAt', now - STALE_OBSERVER_MS))
    .take(STALE_OBSERVERS_DELETED_PER_JOIN);

  for (const observer of staleObservers) await ctx.db.delete(observer._id);
}

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

export const toggleAdmin = internalMutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const worldSettings = await getOrCreateWorldSettings(ctx);
    // Disabling freezes at once; re-enabling a frozen world leaves it frozen until the next observer heartbeat wakes it.
    await ctx.db.patch(worldSettings._id, { adminEnabled: args.enabled, isRunning: args.enabled && worldSettings.isRunning });

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
