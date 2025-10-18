import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Register or update observer heartbeat
 * Called by frontend every 5 seconds while page is open
 */
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    observerCount: v.number(),
    isWorldRunning: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing observer by sessionId
    const existing = await ctx.db
      .query("observer")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      // Update existing observer's heartbeat
      await ctx.db.patch(existing._id, {
        lastHeartbeatAt: now,
      });
    } else {
      // Create new observer
      await ctx.db.insert("observer", {
        sessionId: args.sessionId,
        lastHeartbeatAt: now,
        metadata: {
          joinedAt: now,
        },
      });

      // Log observer join event
      await ctx.db.insert("events", {
        timestamp: now,
        type: "world",
        description: "👁️ A new observer has entered the simulation",
        metadata: {
          severity: "info",
        },
      });
    }

    // Count active observers (heartbeat within last 15 seconds)
    const cutoff = now - 15000; // 15 seconds timeout
    const activeObservers = await ctx.db
      .query("observer")
      .withIndex("by_heartbeat")
      .filter((q) => q.gte(q.field("lastHeartbeatAt"), cutoff))
      .collect();

    const observerCount = activeObservers.length;

    // Update world settings based on observer count
    let worldSettings = await ctx.db.query("world_settings").first();

    if (!worldSettings) {
      // Create world settings if it doesn't exist
      await ctx.db.insert("world_settings", {
        isRunning: observerCount > 0,
        observerCount: observerCount,
        adminEnabled: true,
        tickHz: 0.2, // 1 tick every 5 seconds
        currentTick: 0,
        simulationStartedAt: observerCount > 0 ? now : undefined,
        lastTickAt: undefined,
      });
    } else {
      const wasRunning = worldSettings.isRunning;
      const shouldRun = observerCount > 0 && worldSettings.adminEnabled;

      // Log state transitions with timestamp
      if (!wasRunning && shouldRun) {
        const timestamp = new Date(now).toLocaleTimeString("en-US", {
          hour12: false,
        });
        console.log(
          `⏰ [${timestamp}] 🌍 World AWAKENS: ${observerCount} ${observerCount === 1 ? "observer" : "observers"} watching`
        );

        // Log world start event
        await ctx.db.insert("events", {
          timestamp: now,
          type: "world",
          description: `🌍 Universe awakens: ${observerCount} ${observerCount === 1 ? "observer" : "observers"} watching`,
          metadata: {
            severity: "important",
          },
        });
      } else if (wasRunning && !shouldRun) {
        const timestamp = new Date(now).toLocaleTimeString("en-US", {
          hour12: false,
        });
        console.log(
          `⏰ [${timestamp}] 🧊 Universe FROZEN: No observers remain`
        );

        // Log world freeze event
        await ctx.db.insert("events", {
          timestamp: now,
          type: "world",
          description: `🧊 Universe frozen: No observers remain`,
          metadata: {
            severity: "important",
          },
        });
      }

      await ctx.db.patch(worldSettings._id, {
        isRunning: shouldRun,
        observerCount: observerCount,
        simulationStartedAt:
          !wasRunning && shouldRun ? now : worldSettings.simulationStartedAt,
      });
    }

    return {
      observerCount,
      isWorldRunning: observerCount > 0,
    };
  },
});

/**
 * Get current observer count
 */
export const getObserverCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - 15000; // 15 seconds timeout

    const activeObservers = await ctx.db
      .query("observer")
      .withIndex("by_heartbeat")
      .filter((q) => q.gte(q.field("lastHeartbeatAt"), cutoff))
      .collect();

    return activeObservers.length;
  },
});

/**
 * Get world running state
 */
export const getWorldState = query({
  args: {},
  returns: v.object({
    isRunning: v.boolean(),
    observerCount: v.number(),
    adminEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const worldSettings = await ctx.db.query("world_settings").first();

    if (!worldSettings) {
      return {
        isRunning: false,
        observerCount: 0,
        adminEnabled: true,
      };
    }

    return {
      isRunning: worldSettings.isRunning,
      observerCount: worldSettings.observerCount,
      adminEnabled: worldSettings.adminEnabled,
    };
  },
});

/**
 * Admin toggle to enable/disable simulation
 */
export const toggleAdmin = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const worldSettings = await ctx.db.query("world_settings").first();

    if (!worldSettings) {
      await ctx.db.insert("world_settings", {
        isRunning: false,
        observerCount: 0,
        adminEnabled: args.enabled,
        tickHz: 0.2,
        currentTick: 0,
      });
    } else {
      await ctx.db.patch(worldSettings._id, {
        adminEnabled: args.enabled,
        isRunning: args.enabled && worldSettings.observerCount > 0,
      });
    }

    // Log admin action
    await ctx.db.insert("events", {
      timestamp: now,
      type: "world",
      description: args.enabled
        ? "⚙️ Admin enabled simulation - universe can run"
        : "⚙️ Admin disabled simulation - universe force frozen",
      metadata: {
        severity: "critical",
      },
    });

    return null;
  },
});

/**
 * Clean up stale observers (optional maintenance)
 */
export const cleanupStaleObservers = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - 60000; // 1 minute timeout

    const staleObservers = await ctx.db
      .query("observer")
      .withIndex("by_heartbeat")
      .filter((q) => q.lt(q.field("lastHeartbeatAt"), cutoff))
      .collect();

    for (const observer of staleObservers) {
      await ctx.db.delete(observer._id);
    }

    return staleObservers.length;
  },
});
