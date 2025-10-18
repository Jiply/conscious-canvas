/**
 * Tile Cache Hook - Fetches and caches all 30,000 tiles at startup
 *
 * This hook implements efficient parallel batch fetching:
 * 1. Fetches tiles in batches of ~4,000 in parallel
 * 2. Caches all tiles in memory for instant access
 * 3. Provides loading progress feedback
 * 4. Never refetches tiles after initial load (map is static)
 */

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Tile } from "@/lib/mapTypes";

interface TileCacheState {
  tiles: Map<string, Tile>; // Key: "x,y" -> Tile
  isLoading: boolean;
  progress: number; // 0-100
  totalTiles: number;
  error: string | null;
}

/**
 * Hook that fetches ALL tiles at startup and caches them permanently
 * Uses parallel batch fetching to avoid Convex read limits
 */
export function useTileCache(): TileCacheState {
  // Cache state
  const [tiles, setTiles] = useState<Map<string, Tile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalTiles, setTotalTiles] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track which batches we've loaded
  const [batchesLoaded, setBatchesLoaded] = useState<Set<number>>(new Set());
  const [totalBatches, setTotalBatches] = useState(0);
  const hasInitialized = useRef(false);

  // Query first batch to get total count
  const batch0 = useQuery(
    api.map.getTilesBatch,
    hasInitialized.current ? "skip" : { batchIndex: 0, batchSize: 4000 }
  );

  // Once we know how many batches, query them all in parallel
  const batch1 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 1 && !batchesLoaded.has(1)
      ? { batchIndex: 1, batchSize: 4000 }
      : "skip"
  );

  const batch2 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 2 && !batchesLoaded.has(2)
      ? { batchIndex: 2, batchSize: 4000 }
      : "skip"
  );

  const batch3 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 3 && !batchesLoaded.has(3)
      ? { batchIndex: 3, batchSize: 4000 }
      : "skip"
  );

  const batch4 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 4 && !batchesLoaded.has(4)
      ? { batchIndex: 4, batchSize: 4000 }
      : "skip"
  );

  const batch5 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 5 && !batchesLoaded.has(5)
      ? { batchIndex: 5, batchSize: 4000 }
      : "skip"
  );

  const batch6 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 6 && !batchesLoaded.has(6)
      ? { batchIndex: 6, batchSize: 4000 }
      : "skip"
  );

  const batch7 = useQuery(
    api.map.getTilesBatch,
    totalBatches > 7 && !batchesLoaded.has(7)
      ? { batchIndex: 7, batchSize: 4000 }
      : "skip"
  );

  // Process batch 0 and initialize
  useEffect(() => {
    if (!batch0 || hasInitialized.current) return;

    // Set total batches
    setTotalBatches(batch0.totalBatches);

    // Add batch 0 tiles to cache
    const newTiles = new Map<string, Tile>();
    for (const tile of batch0.tiles) {
      const key = `${tile.x},${tile.y}`;
      newTiles.set(key, tile);
    }

    setTiles(newTiles);
    setBatchesLoaded(new Set([0]));
    setTotalTiles(batch0.tiles.length);
    setProgress((1 / batch0.totalBatches) * 100);
    hasInitialized.current = true;
  }, [batch0]);

  // Helper function to process a batch
  const processBatch = (
    batchData:
      | {
          tiles: any[];
          batchIndex: number;
          totalBatches: number;
          hasMore: boolean;
        }
      | undefined
      | null,
    batchIndex: number
  ) => {
    if (!batchData || batchesLoaded.has(batchIndex)) return;

    setTiles((prevTiles) => {
      const newTiles = new Map(prevTiles);
      for (const tile of batchData.tiles) {
        const key = `${tile.x},${tile.y}`;
        newTiles.set(key, tile);
      }
      return newTiles;
    });

    setBatchesLoaded((prev) => new Set([...prev, batchIndex]));
    setTotalTiles((prev) => prev + batchData.tiles.length);
    setProgress(((batchIndex + 1) / batchData.totalBatches) * 100);
  };

  // Process all batches
  useEffect(() => {
    if (batch1) processBatch(batch1, 1);
  }, [batch1]);

  useEffect(() => {
    if (batch2) processBatch(batch2, 2);
  }, [batch2]);

  useEffect(() => {
    if (batch3) processBatch(batch3, 3);
  }, [batch3]);

  useEffect(() => {
    if (batch4) processBatch(batch4, 4);
  }, [batch4]);

  useEffect(() => {
    if (batch5) processBatch(batch5, 5);
  }, [batch5]);

  useEffect(() => {
    if (batch6) processBatch(batch6, 6);
  }, [batch6]);

  useEffect(() => {
    if (batch7) processBatch(batch7, 7);
  }, [batch7]);

  // Check if loading is complete
  useEffect(() => {
    if (totalBatches > 0 && batchesLoaded.size === totalBatches) {
      setIsLoading(false);
      setProgress(100);
    }
  }, [totalBatches, batchesLoaded.size, totalTiles]);

  return {
    tiles,
    isLoading,
    progress,
    totalTiles,
    error,
  };
}

/**
 * Helper function to get tiles in a region from the cache
 */
export function getTilesInRegion(
  tileCache: Map<string, Tile>,
  region: { x: number; y: number; width: number; height: number }
): Tile[] {
  const tiles: Tile[] = [];

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const key = `${x},${y}`;
      const tile = tileCache.get(key);
      if (tile) {
        tiles.push(tile);
      }
    }
  }

  return tiles;
}
