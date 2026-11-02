import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updateAgentEmotions = mutation({
  args: {
    agentId: v.id("agents"),
    valence: v.optional(v.number()),
    arousal: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.agentId, {
      emotions: {
        valence: args.valence ?? agent.emotions.valence,
        arousal: args.arousal ?? agent.emotions.arousal,
      },
    });

    return null;
  },
});

export const setAgentPath = mutation({
  args: {
    agentId: v.id("agents"),
    path: v.array(v.object({ x: v.number(), y: v.number() })),
    state: v.union(
      v.literal("Idle"),
      v.literal("Transit"),
      v.literal("AtLocation"),
      v.literal("Interact"),
      v.literal("Sleep")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      path: args.path,
      state: args.state,
    });

    return null;
  },
});

export const setNextDecisionTime = mutation({
  args: {
    agentId: v.id("agents"),
    nextDecisionAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      nextDecisionAt: args.nextDecisionAt,
    });

    return null;
  },
});

export const listAgents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("agents"),
      _creationTime: v.number(),
      name: v.string(),
      role: v.union(
        v.literal("student"),
        v.literal("prof"),
        v.literal("barista")
      ),
      personality: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      pos: v.object({ x: v.number(), y: v.number() }),
      headingRad: v.number(),
      path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      state: v.union(
        v.literal("Idle"),
        v.literal("Transit"),
        v.literal("AtLocation"),
        v.literal("Interact"),
        v.literal("Sleep")
      ),
      nextDecisionAt: v.number(),
      currentConversationId: v.optional(v.id("conversations")),
      emotions: v.object({
        valence: v.number(),
        arousal: v.number(),
      }),
      needs: v.object({
        sleepiness: v.number(),
        hunger: v.number(),
        studyPressure: v.number(),
        socialDrive: v.number(),
      }),
      goals: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getAgent = query({
  args: { agentId: v.id("agents") },
  returns: v.union(
    v.object({
      _id: v.id("agents"),
      _creationTime: v.number(),
      name: v.string(),
      role: v.union(
        v.literal("student"),
        v.literal("prof"),
        v.literal("barista")
      ),
      personality: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      pos: v.object({ x: v.number(), y: v.number() }),
      headingRad: v.number(),
      path: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      state: v.union(
        v.literal("Idle"),
        v.literal("Transit"),
        v.literal("AtLocation"),
        v.literal("Interact"),
        v.literal("Sleep")
      ),
      nextDecisionAt: v.number(),
      currentConversationId: v.optional(v.id("conversations")),
      emotions: v.object({
        valence: v.number(),
        arousal: v.number(),
      }),
      needs: v.object({
        sleepiness: v.number(),
        hunger: v.number(),
        studyPressure: v.number(),
        socialDrive: v.number(),
      }),
      goals: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

export const migrateAddConversationField = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    let count = 0;

    for (const agent of agents) {
      if (!("currentConversationId" in agent)) {
        await ctx.db.patch(agent._id, {
          currentConversationId: undefined,
        });
        count++;
      }
    }

    return count;
  },
});
