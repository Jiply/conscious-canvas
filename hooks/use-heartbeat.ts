import { useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Heartbeat hook with automatic leader election
 *
 * The first client to connect becomes the leader and starts ticking every 5s.
 * If the heartbeat is already running, retries in 1s.
 * If another client is leader, this client stops trying.
 */
export function useHeartbeat() {
  const convex = useConvex();
  const [isLeader, setIsLeader] = useState(false);
  const [stats, setStats] = useState<{
    processedAgents: number;
    latencyMs: number;
    lastTickAt: number;
  } | null>(null);
  const leaderIdRef = useRef<string>(crypto.randomUUID());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function heartbeat() {
      if (!mountedRef.current) return;

      try {
        const result = await convex.mutation(api.heartbeat.tick, {
          leaderId: leaderIdRef.current,
        });

        if (!mountedRef.current) return;

        setIsLeader(result.isLeader);

        if (result.isLeader && result.success) {
          // Update stats
          setStats({
            processedAgents: result.processedAgents,
            latencyMs: result.latencyMs,
            lastTickAt: Date.now(),
          });

          console.log(
            `✓ Heartbeat: ${result.processedAgents} agents in ${result.latencyMs}ms`
          );

          // Success → tick again in 5s
          timeoutRef.current = setTimeout(heartbeat, 5000);
        } else if (!result.isLeader) {
          // Not leader, stop trying
          console.log("Not leader, stopping heartbeat");
          setIsLeader(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        // Heartbeat collision (already running) → retry in 1s
        console.warn("Heartbeat collision, retrying in 1s");
        timeoutRef.current = setTimeout(heartbeat, 1000);
      }
    }

    // Start heartbeat immediately
    heartbeat();

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [convex]);

  return { isLeader, stats };
}
