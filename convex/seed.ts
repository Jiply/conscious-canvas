import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Agent profile definitions
 */
const AGENT_PROFILES = [
  {
    name: "Maya Chen",
    role: "student" as const,
    personality:
      "Energetic computer science major who loves building apps and hackathons. Always has headphones on and codes late into the night.",
    pos: { x: 15, y: 12 },
    emotions: { valence: 0.7, arousal: 0.8 },
    needs: {
      sleepiness: 0.4,
      hunger: 0.5,
      studyPressure: 0.7,
      socialDrive: 0.6,
    },
    goals: [
      { name: "win hackathon", weight: 0.9 },
      { name: "land internship", weight: 0.8 },
    ],
  },
  {
    name: "Prof. James Wilson",
    role: "prof" as const,
    personality:
      "Enthusiastic philosophy professor who loves engaging students in Socratic dialogue. Drinks too much coffee.",
    pos: { x: 35, y: 20 },
    emotions: { valence: 0.6, arousal: 0.5 },
    needs: {
      sleepiness: 0.3,
      hunger: 0.6,
      studyPressure: 0.4,
      socialDrive: 0.7,
    },
    goals: [
      { name: "inspire students", weight: 0.9 },
      { name: "finish book", weight: 0.6 },
    ],
  },
  {
    name: "Zara Ahmed",
    role: "student" as const,
    personality:
      "Pre-med student juggling organic chemistry and volunteering. Stressed but incredibly organized with color-coded planners.",
    pos: { x: 55, y: 28 },
    emotions: { valence: 0.3, arousal: 0.8 },
    needs: {
      sleepiness: 0.8,
      hunger: 0.4,
      studyPressure: 0.9,
      socialDrive: 0.3,
    },
    goals: [
      { name: "ace MCAT", weight: 1.0 },
      { name: "maintain GPA", weight: 0.9 },
    ],
  },
  {
    name: "Liam O'Brien",
    role: "student" as const,
    personality:
      "Laid-back art major who's always sketching in his notebook. Philosophical and observant.",
    pos: { x: 25, y: 35 },
    emotions: { valence: 0.7, arousal: 0.3 },
    needs: {
      sleepiness: 0.2,
      hunger: 0.7,
      studyPressure: 0.3,
      socialDrive: 0.8,
    },
    goals: [
      { name: "finish portfolio", weight: 0.7 },
      { name: "make friends", weight: 0.9 },
    ],
  },
  {
    name: "Sofia Martinez",
    role: "barista" as const,
    personality:
      "Friendly barista and part-time psychology student. Knows everyone's coffee order and life story.",
    pos: { x: 45, y: 15 },
    emotions: { valence: 0.8, arousal: 0.6 },
    needs: {
      sleepiness: 0.5,
      hunger: 0.3,
      studyPressure: 0.5,
      socialDrive: 0.9,
    },
    goals: [
      { name: "connect with customers", weight: 0.9 },
      { name: "study psychology", weight: 0.6 },
    ],
  },
  {
    name: "Raj Patel",
    role: "student" as const,
    personality:
      "Economics major and debate team captain. Competitive, analytical, always ready for a good argument.",
    pos: { x: 65, y: 18 },
    emotions: { valence: 0.5, arousal: 0.7 },
    needs: {
      sleepiness: 0.4,
      hunger: 0.6,
      studyPressure: 0.6,
      socialDrive: 0.7,
    },
    goals: [
      { name: "win debate tournament", weight: 0.9 },
      { name: "network", weight: 0.7 },
    ],
  },
  {
    name: "Emma Kim",
    role: "student" as const,
    personality:
      "Biology major who's passionate about environmental conservation. Quiet but determined.",
    pos: { x: 20, y: 25 },
    emotions: { valence: 0.4, arousal: 0.5 },
    needs: {
      sleepiness: 0.6,
      hunger: 0.5,
      studyPressure: 0.7,
      socialDrive: 0.4,
    },
    goals: [
      { name: "research project", weight: 0.8 },
      { name: "join conservation club", weight: 0.7 },
    ],
  },
  {
    name: "Marcus Johnson",
    role: "student" as const,
    personality:
      "Engineering student and varsity athlete. Balancing practice, classes, and social life with impressive discipline.",
    pos: { x: 50, y: 32 },
    emotions: { valence: 0.6, arousal: 0.7 },
    needs: {
      sleepiness: 0.5,
      hunger: 0.8,
      studyPressure: 0.6,
      socialDrive: 0.8,
    },
    goals: [
      { name: "maintain athletic performance", weight: 0.8 },
      { name: "pass thermodynamics", weight: 0.7 },
    ],
  },
];

/**
 * Seed agents without profile pictures (add images later)
 */
export const seedAgents = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    agentCount: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🌱 Starting agent seeding...");

    // First, clear all existing data
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    const observations = await ctx.db.query("observations").collect();
    for (const obs of observations) {
      await ctx.db.delete(obs._id);
    }

    const opinions = await ctx.db.query("opinions").collect();
    for (const opinion of opinions) {
      await ctx.db.delete(opinion._id);
    }

    const decisions = await ctx.db.query("decisions").collect();
    for (const decision of decisions) {
      await ctx.db.delete(decision._id);
    }

    console.log("✅ Cleared existing data");

    const agentIds: string[] = [];

    // Create agents without profile pictures
    for (const profile of AGENT_PROFILES) {
      const agentId = await ctx.db.insert("agents", {
        ...profile,
        headingRad: Math.random() * Math.PI * 2, // Random facing direction
        state: "Idle",
        nextDecisionAt: Date.now() + Math.random() * 5000,
      });

      agentIds.push(agentId);
      console.log(`✅ Created ${profile.name}`);
    }

    // Seed some initial opinions between agents
    if (agentIds.length >= 3) {
      // Create a few random opinions between agents
      for (let i = 0; i < Math.min(5, agentIds.length); i++) {
        const agent1Idx = Math.floor(Math.random() * agentIds.length);
        let agent2Idx = Math.floor(Math.random() * agentIds.length);

        // Make sure they're different agents
        while (agent2Idx === agent1Idx) {
          agent2Idx = Math.floor(Math.random() * agentIds.length);
        }

        const sentiment = (Math.random() - 0.3) * 1.5; // Range from -0.45 to 1.05, clamped later

        await ctx.db.insert("opinions", {
          agentId: agentIds[agent1Idx] as any,
          targetAgentId: agentIds[agent2Idx] as any,
          sentiment: Math.max(-1, Math.min(1, sentiment)),
          summary: "Haven't interacted much yet",
          traits: {},
        });
      }

      console.log("✅ Seeded initial opinions");
    }

    console.log(`🎉 Successfully seeded ${agentIds.length} agents!`);

    return {
      success: true,
      agentCount: agentIds.length,
    };
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
