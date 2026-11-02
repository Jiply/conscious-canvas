import { useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

function getSessionId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("observer_session_id");
    if (stored) return stored;

    const newId = crypto.randomUUID();
    localStorage.setItem("observer_session_id", newId);
    return newId;
  }
  return crypto.randomUUID();
}

function getLeaderId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("heartbeat_leader_id");
    if (stored) return stored;

    const newId = crypto.randomUUID();
    localStorage.setItem("heartbeat_leader_id", newId);
    return newId;
  }
  return crypto.randomUUID();
}

export function useHeartbeat() {
  const convex = useConvex();

  const [isLeader, setIsLeader] = useState(false);

  const [observerCount, setObserverCount] = useState(0);

  const [startTime, setStartTime] = useState<number | null>(null);

  const [stats, setStats] = useState<{
    processedAgents: number;
    latencyMs: number;
    lastTickAt: number;
    observerCount: number;
  } | null>(null);

  const sessionIdRef = useRef<string>(getSessionId());

  const leaderIdRef = useRef<string>(getLeaderId());

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const hasObserversAPI =
      "observers" in api && "heartbeat" in (api.observers as any);

    if (!hasObserversAPI) {
      setObserverCount(1);
      return;
    }

    async function sendObserverHeartbeat() {
      if (!mountedRef.current) return;

      try {
        const result = await convex.mutation((api as any).observers.heartbeat, {
          sessionId: sessionIdRef.current,
        });

        if (!mountedRef.current) return;

        setObserverCount(result.observerCount);

        if (startTime === null) {
          setStartTime(Date.now());
        }
      } catch (err) {
        setObserverCount(1);
        if (startTime === null) {
          setStartTime(Date.now());
        }
      }
    }

    sendObserverHeartbeat();

    const observerInterval = setInterval(sendObserverHeartbeat, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(observerInterval);
    };
  }, [convex]);

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
          setStats({
            processedAgents: result.processedAgents,
            latencyMs: result.latencyMs,
            lastTickAt: Date.now(),
            observerCount: observerCount,
          });

          timeoutRef.current = setTimeout(heartbeat, 5000);
        } else if (!result.isLeader) {
          setIsLeader(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        timeoutRef.current = setTimeout(heartbeat, 1000);
      }
    }

    heartbeat();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [convex, observerCount]);

  return {
    isLeader,
    stats,
    startTime,
  };
}
