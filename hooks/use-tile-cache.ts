import { useQuery } from 'convex/react';
import type { Tile } from '@/lib/map-types';
import { api } from '@/convex/_generated/api';
import { useRef, useState, useEffect } from 'react';
const CONVEX_READ_SAFE_BATCH_SIZE = 4000;

export function useTileCache() {
  const [progress, setProgress] = useState(0);
  const [totalTiles, setTotalTiles] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBatches, setTotalBatches] = useState(0);
  const [tiles, setTiles] = useState<Map<string, Tile>>(new Map());
  const [batchesLoaded, setBatchesLoaded] = useState<Set<number>>(new Set());
  const hasInitialized = useRef(false);

  const batch0 = useQuery(
    api.map.getTilesBatch,
    hasInitialized.current ? 'skip' : { batchSize: CONVEX_READ_SAFE_BATCH_SIZE, batchIndex: 0 }
  );

  const batches = [1, 2, 3, 4, 5, 6, 7].map(batchIndex =>
    useQuery(
      api.map.getTilesBatch,
      totalBatches > batchIndex && !batchesLoaded.has(batchIndex)
        ? { batchSize: CONVEX_READ_SAFE_BATCH_SIZE, batchIndex }
        : 'skip'
    )
  );

  useEffect(() => {
    if (!batch0 || hasInitialized.current) return;
    setTotalBatches(batch0.totalBatches);
    setTiles(new Map(batch0.tiles.map(tile => [`${tile.x},${tile.y}`, tile])));
    setBatchesLoaded(new Set([0]));
    setTotalTiles(batch0.tiles.length);
    setProgress((1 / batch0.totalBatches) * 100);
    hasInitialized.current = true;
  }, [batch0]);

  batches.forEach((batch, i) =>
    useEffect(() => {
      const batchIndex = i + 1;
      if (!batch || batchesLoaded.has(batchIndex)) return;

      setTiles(prevTiles => {
        const newTiles = new Map(prevTiles);
        for (const tile of batch.tiles) newTiles.set(`${tile.x},${tile.y}`, tile);
        return newTiles;
      });

      setBatchesLoaded(prev => new Set([...prev, batchIndex]));
      setTotalTiles(prev => prev + batch.tiles.length);
      setProgress(((batchIndex + 1) / batch.totalBatches) * 100);
    }, [batch])
  );

  useEffect(() => {
    if (totalBatches > 0 && batchesLoaded.size === totalBatches) {
      setIsLoading(false);
      setProgress(100);
    }
  }, [totalBatches, batchesLoaded.size, totalTiles]);

  return { tiles, progress, isLoading, totalTiles };
}
