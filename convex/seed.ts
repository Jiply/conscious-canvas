import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx } from './_generated/server';

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
    emotions: { valence: 0.7, arousal: 0.8 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    goals: [
      { weight: 0.9, name: 'win hackathon' },
      { weight: 0.8, name: 'land internship' },
    ],
    personality:
      'Energetic computer science major who loves building apps and hackathons. Always has headphones on and codes late into the night.',
  },
  {
    role: 'prof' as const,
    name: 'Prof. James Wilson',
    emotions: { valence: 0.6, arousal: 0.5 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.05 },
    goals: [
      { weight: 0.9, name: 'inspire students' },
      { weight: 0.6, name: 'finish book' },
    ],
    personality:
      'Enthusiastic philosophy professor who loves engaging students in Socratic dialogue. Drinks too much coffee.',
  },
  {
    name: 'Zara Ahmed',
    role: 'student' as const,
    emotions: { valence: 0.3, arousal: 0.8 },
    needs: { hunger: 0.05, sleepiness: 0.1, socialDrive: 0.05, studyPressure: 0.15 },
    goals: [
      { weight: 1.0, name: 'ace MCAT' },
      { weight: 0.9, name: 'maintain GPA' },
    ],
    personality:
      'Pre-med student juggling organic chemistry and volunteering. Stressed but incredibly organized with color-coded planners.',
  },
  {
    name: `Liam O'Brien`,
    role: 'student' as const,
    emotions: { valence: 0.7, arousal: 0.3 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.15, studyPressure: 0.05 },
    goals: [
      { weight: 0.7, name: 'finish portfolio' },
      { weight: 0.9, name: 'make friends' },
    ],
    personality: `Laid-back art major who's always sketching in his notebook. Philosophical and observant.`,
  },
  {
    name: 'Sofia Martinez',
    role: 'barista' as const,
    emotions: { valence: 0.8, arousal: 0.6 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.15, studyPressure: 0.05 },
    goals: [
      { weight: 0.9, name: 'connect with customers' },
      { weight: 0.6, name: 'study psychology' },
    ],
    personality: `Friendly barista and part-time psychology student. Knows everyone's coffee order and life story.`,
  },
  {
    name: 'Raj Patel',
    role: 'student' as const,
    emotions: { valence: 0.5, arousal: 0.7 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    goals: [
      { weight: 0.9, name: 'win debate tournament' },
      { weight: 0.7, name: 'network' },
    ],
    personality: 'Economics major and debate team captain. Competitive, analytical, always ready for a good argument.',
  },
  {
    name: 'Emma Kim',
    role: 'student' as const,
    emotions: { valence: 0.4, arousal: 0.5 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.05, studyPressure: 0.1 },
    personality: `Biology major who's passionate about environmental conservation. Quiet but determined.`,
    goals: [
      { weight: 0.8, name: 'research project' },
      { weight: 0.7, name: 'join conservation club' },
    ],
  },
  {
    name: 'Marcus Johnson',
    role: 'student' as const,
    emotions: { valence: 0.6, arousal: 0.7 },
    needs: { hunger: 0.05, sleepiness: 0.05, socialDrive: 0.1, studyPressure: 0.1 },
    goals: [
      { weight: 0.8, name: 'maintain athletic performance' },
      { weight: 0.7, name: 'pass thermodynamics' },
    ],
    personality:
      'Engineering student and varsity athlete. Balancing practice, classes, and social life with impressive discipline.',
  },
];

export const seedAgents = mutation({
  args: {},
  returns: v.object({ success: v.boolean(), agentCount: v.number() }),
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
          summary: `Haven't interacted much yet`,
          sentiment: Math.max(-1, Math.min(1, sentiment)),
        });
      }

      console.log('✅ Seeded initial opinions');
    }

    console.log(`🎉 Successfully seeded ${agentIds.length} agents!`);

    return { success: true, agentCount: agentIds.length };
  },
});

export const clearAllData = mutation({
  args: {},
  returns: v.null(),
  handler: async ctx => {
    await clearSimulationData(ctx);

    return null;
  },
});
