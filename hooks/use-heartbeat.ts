// Import React hooks for side effects, refs, and state management
import { useEffect, useRef, useState } from "react";
// Import Convex client hook to make database mutations
import { useConvex } from "convex/react";
// Import generated API endpoints from Convex
import { api } from "@/convex/_generated/api";

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
 * Heartbeat hook with automatic leader election
 *
 * Implements a distributed leader election system where:
 * - The first client to connect becomes the leader and starts ticking every 5s
 * - If the heartbeat is already running, retries in 1s
 * - If another client is leader, this client stops trying
 * - The leader processes all agent actions on each tick
 *
 * @returns {{isLeader: boolean, stats: object | null}} Leadership status and performance stats
 */
export function useHeartbeat() {
  // Get the Convex client for making mutations
  const convex = useConvex();

  // State: Track if this client is the leader
  const [isLeader, setIsLeader] = useState(false);

  // State: Track heartbeat performance statistics
  const [stats, setStats] = useState<{
    processedAgents: number; // Number of agents processed in last tick
    latencyMs: number; // Time taken to process last tick
    lastTickAt: number; // Timestamp of last successful tick
  } | null>(null);

  // Ref: Store persistent leader ID (survives across renders)
  const leaderIdRef = useRef<string>(getLeaderId());

  // Ref: Store timeout for next heartbeat tick
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref: Track if component is still mounted (prevent state updates after unmount)
  const mountedRef = useRef(true);

  // Effect: Set up heartbeat system with leader election
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
          });

          // Log success for debugging
          console.log(
            `✓ Heartbeat: ${result.processedAgents} agents in ${result.latencyMs}ms`
          );

          // Schedule next tick in 5 seconds
          timeoutRef.current = setTimeout(heartbeat, 5000);
        } else if (!result.isLeader) {
          // Another client is leader, stop trying to become leader
          console.log("Not leader, stopping heartbeat");
          setIsLeader(false);
        }
      } catch (err) {
        // Check if still mounted before updating state
        if (!mountedRef.current) return;

        // Heartbeat collision (another tick already running) → retry in 1s
        // This happens when multiple clients try to become leader simultaneously
        console.warn("Heartbeat collision, retrying in 1s");
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
  }, [convex]); // Only re-run if convex client changes

  // Return leadership status and statistics for display in UI
  return {
    isLeader, // Boolean: true if this client is the leader
    stats, // Object: performance statistics or null if no ticks yet
  };
}
