import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { api } from '@/convex/_generated/api';
const PRESENCE_INTERVAL_MS = 5000;

// Tells the server this page is watching, under an id of its own so every open page counts once; the server runs the world while anyone watches.
export function useObserverPresence() {
  const convex = useConvex();
  const [presence, setPresence] = useState<{ observerCount: number; isWorldRunning: boolean } | null>(null);

  useEffect(() => {
    const sessionId = crypto.randomUUID();
    let isMounted = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function reportPresence() {
      try {
        const result = await convex.mutation(api.observers.heartbeat, { sessionId });
        if (isMounted) setPresence(result);
      } catch (error) {
        console.error('Observer heartbeat failed', error);
      }

      if (isMounted) timeout = setTimeout(reportPresence, PRESENCE_INTERVAL_MS);
    }

    reportPresence();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [convex]);

  return presence;
}
