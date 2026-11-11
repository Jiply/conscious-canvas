import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getTileColorString } from '@/lib/tile-renderer';
import type { Doc } from '@/convex/_generated/dataModel';
import { type MapSettings, TILE_VISUALS } from '@/lib/map-types';

interface MapOverlaysProps {
  isLoading: boolean;
  mapSettings: MapSettings | undefined;
  places: Doc<'places'>[] | undefined;
  camera: { x: number; y: number; scale: number };
  initialCameraPos: { x: number; y: number; scale: number };
  showStats: boolean;
  fps: number;
  onResetCamera: () => void;
  tilesProgress?: number;
  totalTiles?: number;
}

export function MapOverlays({
  isLoading,
  mapSettings,
  places,
  camera,
  initialCameraPos,
  showStats,
  fps,
  onResetCamera,
  tilesProgress = 0,
  totalTiles = 0,
}: MapOverlaysProps) {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 overflow-hidden rounded-lg bg-background">
          <div className="grid h-full w-full grid-cols-12 gap-1 p-4">
            {Array.from({ length: 120 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-sm bg-muted/60"
                style={{ animationDuration: '1.5s', animationDelay: `${(i % 12) * 0.08}s` }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-border bg-background/95 px-8 py-6 text-center shadow-xl backdrop-blur-md">
              <div className="mb-3 text-lg font-semibold">Initializing map...</div>
              <div className="space-y-2 text-sm">
                {!mapSettings && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    Fetching map settings
                  </div>
                )}
                {!places && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Fetching places
                  </div>
                )}
                {tilesProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                      Loading tiles: {tilesProgress.toFixed(0)}%
                    </div>
                    <Progress
                      value={tilesProgress}
                      aria-label="Loading map tiles"
                      className="w-48 bg-muted"
                      indicatorClassName="bg-gradient-to-r from-purple-600 to-purple-500 duration-500 ease-out"
                    >
                      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
                    </Progress>
                    <div className="text-xs text-muted-foreground">{totalTiles.toLocaleString()} tiles loaded</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {!isLoading && (
        <div className="pointer-events-auto absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onResetCamera}
            disabled={
              Math.abs(camera.x - initialCameraPos.x) < 5 &&
              Math.abs(camera.y - initialCameraPos.y) < 5 &&
              Math.abs(camera.scale - initialCameraPos.scale) < 0.01
            }
            className="h-auto border-border bg-background/90 px-3 py-2 font-normal shadow-none backdrop-blur-sm transition-colors disabled:pointer-events-auto disabled:cursor-not-allowed disabled:hover:bg-background/90"
          >
            Reset View
          </Button>
          <div className="rounded-md border border-border bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
            <div>Zoom: {(camera.scale * 100).toFixed(0)}%</div>
            <div className="mt-1 text-muted-foreground">Scroll to zoom</div>
            <div className="text-muted-foreground">Drag to pan</div>
          </div>
        </div>
      )}
      {mapSettings && !isLoading && (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
          <div className="mb-1 font-semibold">NUS UTown Campus</div>
          <div className="text-muted-foreground">
            {mapSettings.gridWidth} × {mapSettings.gridHeight} tiles
          </div>
          <div className="text-muted-foreground">{totalTiles.toLocaleString()} tiles cached</div>
          <div className="text-muted-foreground">{places?.length || 0} places</div>
        </div>
      )}
      {showStats && !isLoading && mapSettings && (
        <div className="pointer-events-none absolute top-4 left-4 rounded-md border border-green-500/50 bg-black/80 px-3 py-2 font-mono text-xs text-green-400 backdrop-blur-sm">
          <div className="mb-2 font-semibold text-green-300">📊 Stats for Nerds</div>
          <div className="space-y-1">
            <div>FPS: {fps}</div>
            <div>Zoom: {(camera.scale * 100).toFixed(0)}%</div>
            <div>
              Camera: ({Math.round(camera.x)}, {Math.round(camera.y)})
            </div>
            <div>Tiles: {totalTiles.toLocaleString()} cached</div>
            <div>Resolution: {(window.devicePixelRatio * 1.5).toFixed(1)}x</div>
            <div className="mt-1 border-t border-green-500/30 pt-1">
              <div className="mb-1 font-semibold text-cyan-300">📏 Scale</div>
              <div>1 tile = {mapSettings.metersPerTile}m</div>
              <div>
                Map: {(mapSettings.gridWidth * mapSettings.metersPerTile).toFixed(0)}m ×{' '}
                {(mapSettings.gridHeight * mapSettings.metersPerTile).toFixed(0)}m
              </div>
            </div>
            <div className="border-t border-green-500/30 pt-1">
              <span className="text-green-400">✓ All tiles pre-rendered</span>
            </div>
          </div>
        </div>
      )}
      {!isLoading && (
        <div className="pointer-events-none absolute right-4 bottom-4 max-h-[300px] overflow-y-auto rounded-md border border-border bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
          <div className="mb-2 font-semibold">Tile Types</div>
          <div className="space-y-1.5">
            {Object.entries(TILE_VISUALS).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 flex-shrink-0 rounded-sm"
                  style={{
                    backgroundColor: getTileColorString(type as any),
                    boxShadow: type === 'wall' ? 'inset 0 0 4px rgba(0,0,0,0.3)' : 'none',
                  }}
                />
                <span className="min-w-[50px] text-[11px] capitalize">{type}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{config.walkable ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
            Press &apos;S&apos; for stats
          </div>
        </div>
      )}
    </>
  );
}
