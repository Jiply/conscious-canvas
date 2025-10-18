// Import React hooks for side effects, refs, and state management
import { useEffect, useRef, useState } from "react";
// Import Convex client hook to make database mutations
import { useConvex, useQuery } from "convex/react";
// Import generated API endpoints from Convex
import { api } from "@/convex/_generated/api";

/**
 * Get or create persistent session ID from localStorage
 * This ID persists across page reloads to track same observer
 * @returns {string} A unique UUID for this session
 */
function getSessionId(): string {
  // Check if we're in a browser environment (not server-side rendering)
  if (typeof window !== "undefined") {
    // Try to get existing session ID from localStorage
    const stored = localStorage.getItem("observer_session_id");
    // If we have one, return it to maintain persistent identity
    if (stored) return stored;

    // Generate a new random UUID for this session
    const newId = crypto.randomUUID();
    // Store it in localStorage for future page loads
    localStorage.setItem("observer_session_id", newId);
    // Return the new ID
    return newId;
  }
  // If running on server, just generate a temporary UUID
  return crypto.randomUUID();
}

/**
 * Get or create persistent leader ID from localStorage
 * This ID persists across page reloads so the same client can reclaim leadership
 * @returns {string} A unique UUID for this client
 */
function getLeaderId(): string {
  // Check if we're in a browser environment (not server-side rendering)
  if (typeof window !== "undefined") {
    // Try to get existing leader ID from localStorage
    const stored = localStorage.getItem("heartbeat_leader_id");
    // If we have one, return it to maintain persistent identity
    if (stored) return stored;

    // Generate a new random UUID for this client
    const newId = crypto.randomUUID();
    // Store it in localStorage for future page loads
    localStorage.setItem("heartbeat_leader_id", newId);
    // Return the new ID
    return newId;
  }
  // If running on server, just generate a temporary UUID
  return crypto.randomUUID();
}

/**
 * Heartbeat hook with observer tracking and automatic leader election
 *
 * Implements a distributed observer + leader election system where:
 * - Every client sends observer heartbeat every 5s (tracks "who is watching")
 * - The first client to connect becomes the leader and processes ticks
 * - World only runs when observerCount > 0
 * - When last observer leaves, world freezes
 *
 * @returns {{isLeader: boolean, stats: object | null, observerCount: number, startTime: number | null}} Leadership status, stats, observer count, and start time
 */
export function useHeartbeat() {
  // Get the Convex client for making mutations
  const convex = useConvex();

  // State: Track if this client is the leader
  const [isLeader, setIsLeader] = useState(false);

  // State: Track observer count
  const [observerCount, setObserverCount] = useState(0);

  // State: Track when the first heartbeat connected
  const [startTime, setStartTime] = useState<number | null>(null);

  // State: Track heartbeat performance statistics
  const [stats, setStats] = useState<{
    processedAgents: number; // Number of agents processed in last tick
    latencyMs: number; // Time taken to process last tick
    lastTickAt: number; // Timestamp of last successful tick
    observerCount: number; // Current observer count
  } | null>(null);

  // Ref: Store persistent session ID for observer tracking
  const sessionIdRef = useRef<string>(getSessionId());

  // Ref: Store persistent leader ID (survives across renders)
  const leaderIdRef = useRef<string>(getLeaderId());

  // Ref: Store timeout for next heartbeat tick
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref: Track if component is still mounted (prevent state updates after unmount)
  const mountedRef = useRef(true);

  // Effect: Set up observer heartbeat (every 5 seconds)
  useEffect(() => {
    mountedRef.current = true;

    // Check if observers API exists (may not if schema hasn't deployed yet)
    const hasObserversAPI =
      "observers" in api && "heartbeat" in (api.observers as any);

    if (!hasObserversAPI) {
      // Set default observer count of 1 (this client)
      setObserverCount(1);
      return;
    }

    // Send observer heartbeat to track "who is watching"
    async function sendObserverHeartbeat() {
      if (!mountedRef.current) return;

      try {
        const result = await convex.mutation((api as any).observers.heartbeat, {
          sessionId: sessionIdRef.current,
        });

        if (!mountedRef.current) return;

        setObserverCount(result.observerCount);

        // Set start time on first successful heartbeat
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } catch (err) {
        // Fallback: assume we're the only observer
        setObserverCount(1);
        // Set start time on first connection attempt
        if (startTime === null) {
          setStartTime(Date.now());
        }
      }
    }

    // Send first heartbeat immediately
    sendObserverHeartbeat();

    // Send heartbeat every 5 seconds
    const observerInterval = setInterval(sendObserverHeartbeat, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(observerInterval);
    };
  }, [convex]);

  // Effect: Set up leader tick processing (only if leader AND world is running)
  useEffect(() => {
    // Mark component as mounted
    mountedRef.current = true;

    // Async function: Execute one heartbeat tick
    async function heartbeat() {
      // Don't proceed if component was unmounted
      if (!mountedRef.current) return;

      try {
        // Call the heartbeat tick mutation with this client's leader ID
        const result = await convex.mutation(api.heartbeat.tick, {
          leaderId: leaderIdRef.current,
        });

        // Check again if still mounted (mutation could take time)
        if (!mountedRef.current) return;

        // Update leadership status
        setIsLeader(result.isLeader);

        // If we're the leader and tick was successful
        if (result.isLeader && result.success) {
          // Update performance statistics
          setStats({
            processedAgents: result.processedAgents, // How many agents processed
            latencyMs: result.latencyMs, // How long it took
            lastTickAt: Date.now(), // When this tick completed
            observerCount: observerCount, // Current observer count
          });

          // Schedule next tick in 5 seconds
          timeoutRef.current = setTimeout(heartbeat, 5000);
        } else if (!result.isLeader) {
          // Another client is leader, stop trying to become leader
          setIsLeader(false);
        }
      } catch (err) {
        // Check if still mounted before updating state
        if (!mountedRef.current) return;

        // Heartbeat collision (another tick already running) → retry in 1s
        // This happens when multiple clients try to become leader simultaneously
        timeoutRef.current = setTimeout(heartbeat, 1000);
      }
    }

    // Start first heartbeat immediately when hook mounts
    heartbeat();

    // Cleanup function: Run when component unmounts
    return () => {
      // Mark component as unmounted to prevent state updates
      mountedRef.current = false;
      // Clear any pending timeout to stop further heartbeats
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [convex, observerCount]); // Re-run if observer count changes

  // Return leadership status and statistics for display in UI
  return {
    isLeader, // Boolean: true if this client is the leader
    stats, // Object: performance statistics or null if no ticks yet
    observerCount, // Number: current observer count
    startTime, // Number: timestamp when first heartbeat connected
  };
}
