import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type MutationCtx, mutation } from './_generated/server';
const MAP_CENTER_X = 100;
const MAP_CENTER_Y = 75;
const CLUSTER_RADIUS = 8;

function getRandomCenterPosition() {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * CLUSTER_RADIUS;

  return {
    x: Math.round(MAP_CENTER_X + Math.cos(angle) * distance),
    y: Math.round(MAP_CENTER_Y + Math.sin(angle) * distance),
  };
}

async function clearSimulationData(ctx: MutationCtx) {
  for (const table of ['agents', 'observations', 'opinions', 'decisions'] as const) {
    for (const doc of await ctx.db.query(table).collect()) await ctx.db.delete(doc._id);
  }
}

const AGENT_PROFILE_TEMPLATES = [
  {
    name: 'Maya Chen',
    role: 'student' as const,
    goals: [
      { name: 'win hackathon', weight: 0.9 },
      { name: 'land internship', weight: 0.8 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    emotions: { arousal: 0.8, valence: 0.7 },
    personality: `Energetic computer science major who loves building apps and hackathons. Always has headphones on and codes late into the night.`,
  },
  {
    name: 'Prof. James Wilson',
    role: 'prof' as const,
    goals: [
      { name: 'inspire students', weight: 0.9 },
      { name: 'finish book', weight: 0.6 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.05 },
    emotions: { arousal: 0.5, valence: 0.6 },
    personality: `Enthusiastic philosophy professor who loves engaging students in Socratic dialogue. Drinks too much coffee.`,
  },
  {
    name: 'Zara Ahmed',
    role: 'student' as const,
    goals: [
      { name: 'ace MCAT', weight: 1.0 },
      { name: 'maintain GPA', weight: 0.9 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.1, socialDrive: 0.05, studyPressure: 0.15 },
    emotions: { arousal: 0.8, valence: 0.3 },
    personality: `Pre-med student juggling organic chemistry and volunteering. Stressed but incredibly organized with color-coded planners.`,
  },
  {
    name: "Liam O'Brien",
    role: 'student' as const,
    goals: [
      { name: 'finish portfolio', weight: 0.7 },
      { name: 'make friends', weight: 0.9 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.15, studyPressure: 0.05 },
    emotions: { arousal: 0.3, valence: 0.7 },
    personality: "Laid-back art major who's always sketching in his notebook. Philosophical and observant.",
  },
  {
    name: 'Sofia Martinez',
    role: 'barista' as const,
    goals: [
      { name: 'connect with customers', weight: 0.9 },
      { name: 'study psychology', weight: 0.6 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.15, studyPressure: 0.05 },
    emotions: { arousal: 0.6, valence: 0.8 },
    personality: "Friendly barista and part-time psychology student. Knows everyone's coffee order and life story.",
  },
  {
    name: 'Raj Patel',
    role: 'student' as const,
    goals: [
      { name: 'win debate tournament', weight: 0.9 },
      { name: 'network', weight: 0.7 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    emotions: { arousal: 0.7, valence: 0.5 },
    personality: 'Economics major and debate team captain. Competitive, analytical, always ready for a good argument.',
  },
  {
    name: 'Emma Kim',
    role: 'student' as const,
    goals: [
      { name: 'research project', weight: 0.8 },
      { name: 'join conservation club', weight: 0.7 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.05, studyPressure: 0.1 },
    emotions: { arousal: 0.5, valence: 0.4 },
    personality: "Biology major who's passionate about environmental conservation. Quiet but determined.",
  },
  {
    name: 'Marcus Johnson',
    role: 'student' as const,
    goals: [
      { name: 'maintain athletic performance', weight: 0.8 },
      { name: 'pass thermodynamics', weight: 0.7 },
    ],
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    emotions: { arousal: 0.7, valence: 0.6 },
    personality: `Engineering student and varsity athlete. Balancing practice, classes, and social life with impressive discipline.`,
  },
];

export const seedAgents = mutation({
  args: {},
  handler: async ctx => {
    console.log('🌱 Starting agent seeding...');
    await clearSimulationData(ctx);
    console.log('✅ Cleared existing data');
    const agentIds: Id<'agents'>[] = [];

    for (const template of AGENT_PROFILE_TEMPLATES) {
      const pos = getRandomCenterPosition();

      const agentId = await ctx.db.insert('agents', {
        ...template,
        pos,
        state: 'Idle',
        headingRad: Math.random() * Math.PI * 2,
        nextDecisionAt: Date.now() + Math.random() * 5000,
      });

      agentIds.push(agentId);
      console.log(`✅ Created ${template.name} at (${pos.x}, ${pos.y}) near map center`);
    }

    if (agentIds.length >= 3) {
      for (let i = 0; i < Math.min(5, agentIds.length); i++) {
        const agent1Idx = Math.floor(Math.random() * agentIds.length);
        let agent2Idx = Math.floor(Math.random() * agentIds.length);
        while (agent2Idx === agent1Idx) agent2Idx = Math.floor(Math.random() * agentIds.length);
        const sentiment = (Math.random() - 0.3) * 1.5;
        await ctx.db.insert('opinions', {
          traits: {},
          agentId: agentIds[agent1Idx],
          targetAgentId: agentIds[agent2Idx],
          summary: "Haven't interacted much yet",
          sentiment: Math.max(-1, Math.min(1, sentiment)),
        });
      }

      console.log('✅ Seeded initial opinions');
    }

    console.log(`🎉 Successfully seeded ${agentIds.length} agents!`);
    return { success: true, agentCount: agentIds.length };
  },
  returns: v.object({ success: v.boolean(), agentCount: v.number() }),
});

export const clearAllData = mutation({
  args: {},
  handler: async ctx => {
    await clearSimulationData(ctx);
    return null;
  },
  returns: v.null(),
});
