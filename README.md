# Conscious Campus

Observer-dependent, real-time campus simulation where emotionally-motivated agents form relationships and culture while the universe only runs when someone is watching.

Next.js + Convex + Pixi.js, with OpenAI-driven agent decisions and conversations.

## Getting Started

```bash
npm install
npx convex dev
npm run dev
```

`.env.local` needs `NEXT_PUBLIC_CONVEX_URL`; the Convex deployment needs `OPENAI_API_KEY`.

Open [http://localhost:3000](http://localhost:3000) to be redirected to `/sim`.

The world runs on the server only while a `/sim` page is open. Setup and admin functions are internal, so run them from the Convex dashboard or CLI:

```bash
npx convex run map:initMap          # build the campus map once
npx convex run seed:seedAgents      # replace all agents with the starting cast
npx convex run observers:toggleAdmin '{"enabled": false}'   # freeze the world
```

## License

MIT
