import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRef, useState, useEffect } from 'react';

function getStoredId(key: string) {
  if (typeof window === 'undefined') return crypto.randomUUID();
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const newId = crypto.randomUUID();
  localStorage.setItem(key, newId);
  return newId;
}

export function useHeartbeat() {
  const convex = useConvex();
  const [isLeader, setIsLeader] = useState(false);
  const [observerCount, setObserverCount] = useState(0);
  const [stats, setStats] = useState<{
    latencyMs: number;
    lastTickAt: number;
    observerCount: number;
    processedAgents: number;
  } | null>(null);
  // Still persists the observer session id the unreachable observer API used to send.
  getStoredId('observer_session_id');
  const leaderIdRef = useRef(getStoredId('heartbeat_leader_id'));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    setObserverCount(1);
  }, [convex]);

  useEffect(() => {
    mountedRef.current = true;

    async function heartbeat() {
      if (!mountedRef.current) return;

      try {
        const result = await convex.mutation(api.heartbeat.tick, { leaderId: leaderIdRef.current });
        if (!mountedRef.current) return;

        setIsLeader(result.isLeader);
        if (result.isLeader && result.success) {
          setStats({
            processedAgents: result.processedAgents,
            latencyMs: result.latencyMs,
            lastTickAt: Date.now(),
            observerCount,
          });
          timeoutRef.current = setTimeout(heartbeat, 5000);
        } else if (!result.isLeader) setIsLeader(false);
      } catch {
        if (!mountedRef.current) return;
        timeoutRef.current = setTimeout(heartbeat, 1000);
      }
    }

    heartbeat();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [convex, observerCount]);

  return { stats, isLeader };
}
