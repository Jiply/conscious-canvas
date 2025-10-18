"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TILE_VISUALS } from "@/lib/mapTypes";
import { renderTiles, getTileColorString } from "@/lib/tileRenderer";
import type { Tile, MapSettings, Place } from "@/lib/mapTypes";

interface PixiMapProps {
  className?: string;
}

export function PixiMap({ className }: PixiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const tilesLayerRef = useRef<Graphics | null>(null);
  const placesLayerRef = useRef<Container | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Camera state - will be set once places load
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [debouncedCamera, setDebouncedCamera] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(false);
  const [fps, setFps] = useState(60);
  const lastFrameTimeRef = useRef(performance.now());

  // Query map data from Convex
  const mapSettings = useQuery(api.map.getMapSettings);
  const places = useQuery(api.map.getPlaces);

  // Debounce camera for tile queries (reduces query spam while panning)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCamera(camera);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [camera]);

  // Calculate visible tile region based on debounced camera (not live camera)
  const getVisibleRegion = useCallback(() => {
    if (!mapSettings || !isCameraReady || dimensions.width === 0) return null;

    const tileSize = mapSettings.tileSize;
    const padding = 10; // Larger padding for smoother loading

    // Calculate world coordinates of viewport corners (using debounced camera)
    const viewportLeft = -debouncedCamera.x / debouncedCamera.scale;
    const viewportTop = -debouncedCamera.y / debouncedCamera.scale;
    const viewportRight =
      (dimensions.width - debouncedCamera.x) / debouncedCamera.scale;
    const viewportBottom =
      (dimensions.height - debouncedCamera.y) / debouncedCamera.scale;

    // Convert to tile coordinates
    const minX = Math.max(0, Math.floor(viewportLeft / tileSize) - padding);
    const minY = Math.max(0, Math.floor(viewportTop / tileSize) - padding);
    const maxX = Math.min(
      mapSettings.gridWidth,
      Math.ceil(viewportRight / tileSize) + padding
    );
    const maxY = Math.min(
      mapSettings.gridHeight,
      Math.ceil(viewportBottom / tileSize) + padding
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [debouncedCamera, dimensions, mapSettings, isCameraReady]);

  const visibleRegion = getVisibleRegion();

  // Query only visible tiles
  const tiles = useQuery(
    api.map.getTilesByRegion,
    visibleRegion
      ? {
          x: visibleRegion.x,
          y: visibleRegion.y,
          width: visibleRegion.width,
          height: visibleRegion.height,
        }
      : "skip"
  );

  // Debug: Log tile data
  useEffect(() => {
    if (tiles && tiles.length > 0) {
      console.log("📊 Tiles loaded:", tiles.length);
      console.log("📊 Sample tile:", tiles[0]);
      console.log("📊 Tile types:", [...new Set(tiles.map((t) => t.tileType))]);
    }
  }, [tiles]);

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          console.log("📐 Container size:", width, "x", height);
          setDimensions({ width, height });
        }
      }
    };

    // Initial measurement
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    // Also listen to window resize
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "s" || e.key === "S") {
        setShowStats((prev) => !prev);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, []);

  // Wheel event for zooming (non-passive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomSpeed = 0.001;
      const zoomFactor = 1 - e.deltaY * zoomSpeed;

      setCamera((prev) => {
        const newScale = Math.max(0.1, Math.min(5, prev.scale * zoomFactor));

        // Zoom towards mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - prev.x) / prev.scale;
        const worldY = (mouseY - prev.y) / prev.scale;

        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        return { x: newX, y: newY, scale: newScale };
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Initialize Pixi application ONCE
  useEffect(() => {
    console.log("🔍 Pixi init effect triggered:", {
      hasCanvasRef: !!canvasRef.current,
      hasAppRef: !!appRef.current,
      width: dimensions.width,
      height: dimensions.height,
    });

    if (!canvasRef.current) {
      console.warn("❌ No canvas ref for Pixi");
      return;
    }
    if (appRef.current) {
      console.warn("⚠️ Pixi app already exists");
      return;
    }
    if (dimensions.width === 0 || dimensions.height === 0) {
      console.warn("❌ Invalid dimensions:", dimensions);
      return;
    }

    console.log("🎨 Initializing Pixi app...");
    const app = new Application();

    app
      .init({
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: 0x1a1a1a,
        antialias: true, // Enable antialiasing for smoother graphics
        resolution: window.devicePixelRatio * 1.5 || 2, // Higher resolution
        autoDensity: true,
      })
      .then(() => {
        if (!canvasRef.current || !app.canvas) return;

        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;

        // Create world container for camera (persistent)
        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        // Create layers (persistent)
        const tilesLayer = new Graphics();
        const placesLayer = new Container();
        worldContainer.addChild(tilesLayer);
        worldContainer.addChild(placesLayer);
        tilesLayerRef.current = tilesLayer;
        placesLayerRef.current = placesLayer;

        // Setup FPS counter
        const fpsUpdate = () => {
          const now = performance.now();
          const delta = now - lastFrameTimeRef.current;
          const currentFps = 1000 / delta;
          setFps(Math.round(currentFps));
          lastFrameTimeRef.current = now;
        };
        app.ticker.add(fpsUpdate);

        console.log("✅ Pixi app initialized");
        setIsInitialized(true);
      });

    return () => {
      if (appRef.current) {
        console.log("🗑️ Destroying Pixi app");
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        worldContainerRef.current = null;
        tilesLayerRef.current = null;
        placesLayerRef.current = null;
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Resize canvas when dimensions change
  useEffect(() => {
    if (!appRef.current || dimensions.width === 0 || dimensions.height === 0)
      return;
    console.log(
      "🔄 Resizing canvas to:",
      dimensions.width,
      "x",
      dimensions.height
    );
    appRef.current.renderer.resize(dimensions.width, dimensions.height);
  }, [dimensions.width, dimensions.height]);

  // Initialize camera position to Central Green (ONCE)
  useEffect(() => {
    if (!mapSettings || !places || isCameraReady || dimensions.width === 0)
      return;

    const tileSize = mapSettings.tileSize;
    const centralGreen = places.find((p) => p.kind === "quad");

    if (centralGreen) {
      const centerX =
        (centralGreen.bounds.x + centralGreen.bounds.width / 2) * tileSize;
      const centerY =
        (centralGreen.bounds.y + centralGreen.bounds.height / 2) * tileSize;

      console.log("📍 Centering camera on Central Green:", centerX, centerY);
      setCamera({
        x: dimensions.width / 2 - centerX,
        y: dimensions.height / 2 - centerY,
        scale: 1,
      });
      setIsCameraReady(true);
    }
  }, [mapSettings, places, dimensions.width, dimensions.height, isCameraReady]);

  // Render tiles (update layer, don't recreate container)
  useEffect(() => {
    console.log("🔍 Render tiles effect triggered:", {
      hasTilesLayer: !!tilesLayerRef.current,
      tilesCount: tiles?.length || 0,
      hasMapSettings: !!mapSettings,
      isCameraReady,
    });

    if (!tilesLayerRef.current) {
      console.warn("❌ No tiles layer ref");
      return;
    }
    if (!tiles || tiles.length === 0) {
      console.warn("❌ No tiles data");
      return;
    }
    if (!mapSettings) {
      console.warn("❌ No map settings");
      return;
    }
    if (!isCameraReady) {
      console.warn("❌ Camera not ready");
      return;
    }

    console.log("🎨 Rendering", tiles.length, "tiles");
    const tilesLayer = tilesLayerRef.current;
    const tileSize = mapSettings.tileSize;

    try {
      // Use the new tile renderer with visual styles and patterns
      renderTiles(tilesLayer, tiles, tileSize);

      // MANUAL TEST: Draw test rectangles AFTER renderTiles
      console.log("🧪 Drawing manual test rectangles on top...");
      tilesLayer.rect(100, 100, 200, 200);
      tilesLayer.fill({ color: 0xff0000 }); // Red square
      tilesLayer.rect(350, 100, 200, 200);
      tilesLayer.fill({ color: 0x00ff00 }); // Green square
      console.log("✅ Manual test rectangles drawn");

      console.log("✅ Tiles rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering tiles:", error);
    }
  }, [tiles, mapSettings, isCameraReady]);

  // Render places (update layer, don't recreate container)
  useEffect(() => {
    if (!placesLayerRef.current || !places || !mapSettings || !isCameraReady) {
      return;
    }

    console.log("🏢 Rendering", places.length, "places");
    const placesLayer = placesLayerRef.current;
    placesLayer.removeChildren();

    const tileSize = mapSettings.tileSize;

    for (const place of places) {
      // Skip dorm_room and other small subdivisions for main labels
      if (
        place.kind === "dorm_room" ||
        place.kind === "common_room" ||
        place.kind === "study_room"
      ) {
        continue;
      }

      const bounds = place.bounds;
      const centerX = (bounds.x + bounds.width / 2) * tileSize;
      const centerY = (bounds.y + bounds.height / 2) * tileSize;

      // Draw place outline with new v8 API
      const outline = new Graphics();
      outline.rect(
        bounds.x * tileSize,
        bounds.y * tileSize,
        bounds.width * tileSize,
        bounds.height * tileSize
      );
      outline.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
      placesLayer.addChild(outline);

      // Add place label
      const labelStyle = new TextStyle({
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 6,
          blur: 2,
          color: 0x000000,
          distance: 2,
        },
      });

      const label = new Text({
        text: place.name,
        style: labelStyle,
      });
      label.anchor.set(0.5);
      label.x = centerX;
      label.y = centerY;
      placesLayer.addChild(label);

      // Add capacity/info label for indoor places
      if (place.isIndoor && place.capacity) {
        const infoStyle = new TextStyle({
          fontFamily: "Arial, sans-serif",
          fontSize: 10,
          fill: 0xcccccc,
          stroke: { color: 0x000000, width: 2 },
        });

        const infoLabel = new Text({
          text: `Capacity: ${place.capacity}`,
          style: infoStyle,
        });
        infoLabel.anchor.set(0.5);
        infoLabel.x = centerX;
        infoLabel.y = centerY + 18;
        placesLayer.addChild(infoLabel);
      }
    }
    console.log("✅ Places rendered");
  }, [places, mapSettings, isCameraReady]);

  // Update camera transform (separate from rendering)
  useEffect(() => {
    if (!worldContainerRef.current || !isCameraReady) return;

    const worldContainer = worldContainerRef.current;
    worldContainer.x = camera.x;
    worldContainer.y = camera.y;
    worldContainer.scale.set(camera.scale);
  }, [camera, isCameraReady]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;

    setCamera((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleResetCamera = () => {
    if (!mapSettings || !places || dimensions.width === 0) return;

    const tileSize = mapSettings.tileSize;
    const centralGreen = places.find((p) => p.kind === "quad");

    if (centralGreen) {
      const centerX =
        (centralGreen.bounds.x + centralGreen.bounds.width / 2) * tileSize;
      const centerY =
        (centralGreen.bounds.y + centralGreen.bounds.height / 2) * tileSize;

      setCamera({
        x: dimensions.width / 2 - centerX,
        y: dimensions.height / 2 - centerY,
        scale: 1,
      });
    }
  };

  const isLoading = !mapSettings || !isCameraReady;

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Always render canvas div so ref is available */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: "100%",
          height: "100%",
          cursor: isDraggingRef.current ? "grabbing" : "grab",
          touchAction: "none",
          visibility: isLoading ? "hidden" : "visible",
        }}
        className="rounded-lg overflow-hidden"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <div className="text-center">
            <div className="text-muted-foreground">Initializing map...</div>
            {!mapSettings && (
              <div className="text-xs text-muted-foreground mt-2">
                Fetching map settings
              </div>
            )}
            {!places && (
              <div className="text-xs text-muted-foreground mt-2">
                Fetching places
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      {!isLoading && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            className="px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded-md text-sm hover:bg-accent transition-colors"
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
            {tiles?.length || 0} tiles loaded
          </div>
          <div className="text-muted-foreground">
            {places?.length || 0} places
          </div>
          {visibleRegion && (
            <div className="text-muted-foreground mt-1 text-[10px]">
              Viewport: {visibleRegion.width}×{visibleRegion.height} tiles
            </div>
          )}
        </div>
      )}

      {/* Stats overlay (toggle with 'S' key) */}
      {showStats && !isLoading && (
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
            <div>Tiles: {tiles?.length || 0} loaded</div>
            <div>
              Viewport: {visibleRegion?.width}×{visibleRegion?.height}
            </div>
            <div>Resolution: {(window.devicePixelRatio * 1.5).toFixed(1)}x</div>
            <div className="pt-1 border-t border-green-500/30">
              {camera.x !== debouncedCamera.x ||
              camera.y !== debouncedCamera.y ? (
                <span className="text-yellow-400">⏳ Loading tiles...</span>
              ) : (
                <span className="text-green-400">✓ Tiles loaded</span>
              )}
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
                  className="w-4 h-4 border border-gray-600 rounded-sm flex-shrink-0"
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
                <span className="text-muted-foreground text-[10px]">
                  {config.walkable ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
            Press 'S' for stats
          </div>
        </div>
      )}
    </div>
  );
}
