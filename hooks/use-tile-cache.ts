import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Tile } from '@/lib/mapTypes';

// Parallel 4000-tile batches stay under Convex read limits
export function useTileCache() {
  const [tiles, setTiles] = useState<Map<string, Tile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalTiles, setTotalTiles] = useState(0);
  const [batchesLoaded, setBatchesLoaded] = useState<Set<number>>(new Set());
  const [totalBatches, setTotalBatches] = useState(0);
  const hasInitialized = useRef(false);

  const batch0 = useQuery(api.map.getTilesBatch, hasInitialized.current ? 'skip' : { batchIndex: 0, batchSize: 4000 });
  const batches = [1, 2, 3, 4, 5, 6, 7].map(batchIndex =>
    useQuery(
      api.map.getTilesBatch,
      totalBatches > batchIndex && !batchesLoaded.has(batchIndex) ? { batchIndex, batchSize: 4000 } : 'skip'
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

  return { tiles, isLoading, progress, totalTiles };
}
