# Conscious Campus

**Observer-dependent, real-time campus simulation where emotionally-motivated agents form relationships and culture while the universe only runs when someone is watching.**

A 2D top-down campus simulation where the world clock advances only when ≥1 viewer is present. Agents are emotionally intelligent (valence/arousal), goal-driven (behavioral motivations), and socially aware (relationships). Emergent moments are narrated by an in-world Observer/World Historian.

## 🎯 Core Concept

The universe runs only under observation. When observers are present, the simulation advances; when they leave, time freezes. Agents have:

- Emotional states (valence, arousal)
- Biological needs (hunger, sleep, social drive)
- Memory and relationships
- Goal-driven behavior powered by LLM decision-making

## 🛠️ Tech Stack

### Frontend

- **Next.js 15.5** - React framework with App Router
- **React 19.1** - UI library
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Component library built on Radix UI
- **Pixi.js** (planned) - High-performance 2D rendering for the simulation canvas

### Backend & Real-time Data

- **Convex** - Real-time database with live queries and automatic sync
  - Observer heartbeat tracking
  - Agent state management
  - Event sourcing for simulation timeline
  - Scheduled actions for tick orchestration

### AI/LLM Integration (Planned)

- **Groq** - Low-latency inference for microdecisions (<400ms)
- **OpenAI/Anthropic** - Deeper planning and memory summarization
- **Structured outputs** for agent decision-making

## 📦 Convex Integration

This project uses **Convex** as its primary database and real-time backend:

### Setup

Convex is integrated via the `ConvexClientProvider` wrapper in the root layout:

```tsx
// app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Configuration

The Convex client connects using the `NEXT_PUBLIC_CONVEX_URL` environment variable:

```tsx
// app/ConvexClientProvider.tsx
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

### Planned Data Model

- `world_settings` - Simulation state (isRunning, observerCount, tickHz)
- `observer` - Active viewers tracking
- `agent` - Agent state, emotions, needs, goals, position
- `place` - Campus locations (Dorm, Library, Café, etc.)
- `memory` - Agent memories with salience decay
- `relationship` - Social graph (friendship, trust, attraction)
- `event` - Event sourcing log for replay
- `perception_cache` - Vision and spatial awareness

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm/yarn/pnpm/bun

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd conscious-canvas
```

2. Install dependencies:

```bash
npm install
```

3. Set up Convex:

```bash
npx convex dev
```

This will:

- Create a Convex project (or link to existing)
- Generate your `NEXT_PUBLIC_CONVEX_URL`
- Watch for function changes

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to `/sim`

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## 📁 Project Structure

```
conscious-canvas/
├── app/
│   ├── ConvexClientProvider.tsx  # Convex React provider
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Root redirect to /sim
│   └── sim/
│       └── page.tsx              # Main simulation page
├── components/
│   └── ui/                       # shadcn/ui components
├── convex/
│   ├── tasks.ts                  # Example Convex functions
│   └── _generated/               # Auto-generated Convex types
├── documentation/
│   ├── requirements.md           # Detailed spec (24h hackathon)
│   └── doc-list.md              # Tech stack reference links
├── hooks/
│   └── use-mobile.ts            # Responsive hook
└── lib/
    └── utils.ts                 # Utility functions (cn, etc.)
```

## 🎮 Current Features

- ✅ Sidebar layout with collapsible navigation
- ✅ Agent list panel (UI ready, awaiting data)
- ✅ Campus location quick access
- ✅ World state display (Running/Frozen, observer count)
- ✅ Convex real-time database integration
- ✅ Canvas area ready for Pixi.js rendering
- 🚧 Agent simulation loop
- 🚧 Pixi.js 2D rendering
- 🚧 LLM-powered agent decisions
- 🚧 Memory and relationship systems

## 📖 Documentation

See `/documentation/requirements.md` for the complete technical specification including:

- Observer-dependent time mechanics
- Agent activity FSM
- Emotion and biological homeostasis
- Perception geometry (20m radius, 120° FOV)
- LLM routing strategy
- Event sourcing and replay

## 🔧 Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx convex dev       # Start Convex backend in dev mode
npx convex deploy    # Deploy Convex functions to production
```

## 🏗️ Development Workflow

1. **Frontend Development**: Edit components in `app/` and `components/`
2. **Convex Functions**: Write queries/mutations in `convex/`
   - Auto-generated types in `convex/_generated/`
   - Use `useQuery()` and `useMutation()` in React components
3. **Styling**: Tailwind classes + shadcn/ui components
4. **Real-time Updates**: Convex automatically syncs data changes to all clients

## 📚 Learn More

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

### Convex

- [Convex Documentation](https://docs.convex.dev)
- [Convex with Next.js](https://docs.convex.dev/client/nextjs/app-router/)
- [Convex React Hooks](https://docs.convex.dev/client/react)

### UI Components

- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)

### Simulation & Rendering (Planned)

- [Pixi.js](https://pixijs.com)
- [React Pixi](https://react.pixijs.io)
- [PathFinding.js](https://github.com/qiao/PathFinding.js)

## 🤝 Contributing

This is a hackathon project (24-hour build). See `documentation/requirements.md` for the full vision.

## 📄 License

MIT
