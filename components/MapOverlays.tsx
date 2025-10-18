import { TILE_VISUALS } from "@/lib/mapTypes";
import { getTileColorString } from "@/lib/tileRenderer";
import type { MapSettings, Place } from "@/lib/mapTypes";

interface MapOverlaysProps {
  isLoading: boolean;
  mapSettings: MapSettings | undefined;
  places: Place[] | undefined;
  camera: { x: number; y: number; scale: number };
  initialCameraPos: { x: number; y: number; scale: number };
  showStats: boolean;
  fps: number;
  onResetCamera: () => void;
  tilesProgress?: number;
  totalTiles?: number;
  isWorldRunning?: boolean;
  observerCount?: number;
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
  isWorldRunning = true,
  observerCount = 0,
}: MapOverlaysProps) {
  return (
    <>
      {/* World Frozen Banner - shown when simulation is paused */}
      {!isLoading && !isWorldRunning && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-background/95 backdrop-blur-md border-4 border-yellow-500 rounded-2xl p-10 shadow-2xl text-center max-w-lg">
            <div className="text-6xl mb-4">🧊</div>
            <h2 className="text-4xl font-bold mb-3">WORLD FROZEN</h2>
            <p className="text-lg text-muted-foreground mb-4">
              The universe is paused
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">
                {observerCount} {observerCount === 1 ? "observer" : "observers"}{" "}
                watching
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-4 opacity-60">
              Waiting for observers to start simulation...
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay with tile grid animation */}
      {isLoading && (
        <div className="absolute inset-0 bg-background overflow-hidden rounded-lg">
          {/* Animated tile grid */}
          <div className="grid grid-cols-12 gap-1 h-full w-full p-4">
            {Array.from({ length: 120 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted/60 rounded-sm animate-pulse"
                style={{
                  animationDelay: `${(i % 12) * 0.08}s`,
                  animationDuration: "1.5s",
                }}
              />
            ))}
          </div>

          {/* Loading text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-background/95 backdrop-blur-md px-8 py-6 rounded-lg border border-border shadow-xl">
              <div className="text-lg font-semibold mb-3">
                Initializing map...
              </div>
              <div className="space-y-2 text-sm">
                {!mapSettings && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Fetching map settings
                  </div>
                )}
                {!places && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Fetching places
                  </div>
                )}
                {tilesProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      Loading tiles: {tilesProgress.toFixed(0)}%
                    </div>
                    <div className="w-48 h-2 bg-muted rounded-full overflow-hidden relative">
                      {/* Animated shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-shimmer" />
                      {/* Actual progress bar */}
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-500 ease-out"
                        style={{ width: `${tilesProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalTiles.toLocaleString()} tiles loaded
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      {!isLoading && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={onResetCamera}
            disabled={
              Math.abs(camera.x - initialCameraPos.x) < 5 &&
              Math.abs(camera.y - initialCameraPos.y) < 5 &&
              Math.abs(camera.scale - initialCameraPos.scale) < 0.01
            }
            className="px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded-md text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background/90"
          >
            Reset View
          </button>
          <div className="px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded-md text-xs">
            <div>Zoom: {(camera.scale * 100).toFixed(0)}%</div>
            <div className="text-muted-foreground mt-1">Scroll to zoom</div>
            <div className="text-muted-foreground">Drag to pan</div>
          </div>
        </div>
      )}

      {/* Map info overlay */}
      {mapSettings && !isLoading && (
        <div className="absolute bottom-4 left-4 px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded-md text-xs pointer-events-none">
          <div className="font-semibold mb-1">NUS UTown Campus</div>
          <div className="text-muted-foreground">
            {mapSettings.gridWidth} × {mapSettings.gridHeight} tiles
          </div>
          <div className="text-muted-foreground">
            {totalTiles.toLocaleString()} tiles cached
          </div>
          <div className="text-muted-foreground">
            {places?.length || 0} places
          </div>
        </div>
      )}

      {/* Stats overlay (toggle with 'S' key) */}
      {showStats && !isLoading && mapSettings && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-black/80 backdrop-blur-sm border border-green-500/50 rounded-md text-xs font-mono text-green-400 pointer-events-none">
          <div className="font-semibold mb-2 text-green-300">
            📊 Stats for Nerds
          </div>
          <div className="space-y-1">
            <div>FPS: {fps}</div>
            <div>Zoom: {(camera.scale * 100).toFixed(0)}%</div>
            <div>
              Camera: ({Math.round(camera.x)}, {Math.round(camera.y)})
            </div>
            <div>Tiles: {totalTiles.toLocaleString()} cached</div>
            <div>Resolution: {(window.devicePixelRatio * 1.5).toFixed(1)}x</div>
            <div className="pt-1 border-t border-green-500/30 mt-1">
              <div className="text-cyan-300 font-semibold mb-1">📏 Scale</div>
              <div>1 tile = {mapSettings.metersPerTile}m</div>
              <div>
                Map:{" "}
                {(mapSettings.gridWidth * mapSettings.metersPerTile).toFixed(0)}
                m ×{" "}
                {(mapSettings.gridHeight * mapSettings.metersPerTile).toFixed(
                  0
                )}
                m
              </div>
            </div>
            <div className="pt-1 border-t border-green-500/30">
              <span className="text-green-400">✓ All tiles pre-rendered</span>
            </div>
          </div>
        </div>
      )}

      {/* Tile legend overlay */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded-md text-xs max-h-[300px] overflow-y-auto pointer-events-none">
          <div className="font-semibold mb-2">Tile Types</div>
          <div className="space-y-1.5">
            {Object.entries(TILE_VISUALS).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: getTileColorString(type as any),
                    boxShadow:
                      type === "wall"
                        ? "inset 0 0 4px rgba(0,0,0,0.3)"
                        : "none",
                  }}
                />
                <span className="capitalize text-[11px] min-w-[50px]">
                  {type}
                </span>
                <span className="text-muted-foreground text-[10px] ml-auto">
                  {config.walkable ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
            Press &apos;S&apos; for stats
          </div>
        </div>
      )}
    </>
  );
}
