import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed 3 test agents at different locations on the map
 */
export const seedAgents = mutation({
  args: {},
  returns: v.object({
    agentIds: v.array(v.id("agents")),
  }),
  handler: async (ctx) => {
    const agentIds = [];

    // Agent 1: Alice - Northwest area
    const alice = await ctx.db.insert("agents", {
      name: "Alice",
      role: "student",
      personality: "Ambitious CS major, always stressed about deadlines",
      pos: { x: 15, y: 10 },
      headingRad: Math.PI / 4, // facing northeast
      state: "Idle",
      nextDecisionAt: Date.now() + 2000,
      emotions: { valence: 0.2, arousal: 0.6 },
      needs: {
        sleepiness: 0.3,
        hunger: 0.4,
        studyPressure: 0.8,
        socialDrive: 0.5,
      },
      goals: [
        { name: "ace upcoming exam", weight: 0.9 },
        { name: "maintain friendships", weight: 0.6 },
      ],
    });
    agentIds.push(alice);

    // Agent 2: Bob - Center area
    const bob = await ctx.db.insert("agents", {
      name: "Bob",
      role: "student",
      personality: "Chill philosophy major, loves deep conversations",
      pos: { x: 40, y: 25 },
      headingRad: Math.PI / 2, // facing south
      state: "Idle",
      nextDecisionAt: Date.now() + 3000,
      emotions: { valence: 0.6, arousal: 0.3 },
      needs: {
        sleepiness: 0.2,
        hunger: 0.6,
        studyPressure: 0.3,
        socialDrive: 0.8,
      },
      goals: [
        { name: "connect with others", weight: 0.9 },
        { name: "explore ideas", weight: 0.7 },
      ],
    });
    agentIds.push(bob);

    // Agent 3: Charlie - Southeast area
    const charlie = await ctx.db.insert("agents", {
      name: "Charlie",
      role: "student",
      personality: "Pre-med student, chronically sleep-deprived but determined",
      pos: { x: 60, y: 35 },
      headingRad: Math.PI, // facing west
      state: "Idle",
      nextDecisionAt: Date.now() + 4000,
      emotions: { valence: -0.2, arousal: 0.7 },
      needs: {
        sleepiness: 0.9,
        hunger: 0.5,
        studyPressure: 0.9,
        socialDrive: 0.2,
      },
      goals: [
        { name: "get into med school", weight: 1.0 },
        { name: "survive this semester", weight: 0.8 },
      ],
    });
    agentIds.push(charlie);

    // Seed some initial opinions so they know each other
    await ctx.db.insert("opinions", {
      agentId: alice,
      targetAgentId: bob,
      sentiment: 0.6,
      summary: "Bob is chill and fun to talk to, though sometimes too relaxed",
      traits: { chill: 0.9, thoughtful: 0.8, reliable: 0.5 },
    });

    await ctx.db.insert("opinions", {
      agentId: bob,
      targetAgentId: alice,
      sentiment: 0.7,
      summary: "Alice is super smart but too stressed all the time",
      traits: { smart: 0.9, ambitious: 1.0, stressed: 0.9 },
    });

    await ctx.db.insert("opinions", {
      agentId: charlie,
      targetAgentId: bob,
      sentiment: 0.4,
      summary: "Bob seems nice but I don't have time to hang out",
      traits: { friendly: 0.7, relaxed: 0.9, focused: 0.3 },
    });

    return { agentIds };
  },
});

/**
 * Clear all agents and related data
 */
export const clearAllData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Delete all agents
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    // Delete all observations
    const observations = await ctx.db.query("observations").collect();
    for (const obs of observations) {
      await ctx.db.delete(obs._id);
    }

    // Delete all opinions
    const opinions = await ctx.db.query("opinions").collect();
    for (const opinion of opinions) {
      await ctx.db.delete(opinion._id);
    }

    // Delete all decisions
    const decisions = await ctx.db.query("decisions").collect();
    for (const decision of decisions) {
      await ctx.db.delete(decision._id);
    }

    return null;
  },
});
