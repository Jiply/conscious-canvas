"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCamera } from "@/hooks/use-camera";
import { usePixiApp } from "@/hooks/use-pixi-app";
import { useEffect, useRef, useState } from "react";
import { useTileCache } from "@/hooks/use-tile-cache";
import { MapOverlays } from "@/components/MapOverlays";
import { usePlaceRenderer } from "@/hooks/use-place-renderer";
import { useAgentRenderer } from "@/hooks/use-agent-renderer";
import { useTileRendererCached } from "@/hooks/use-tile-renderer-cached";

interface PixiMapProps {
  className?: string;
  onWorldReady?: (isReady: boolean) => void;
}

export function PixiMap({ className, onWorldReady }: PixiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showStats, setShowStats] = useState(false);

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

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Initialize Pixi app
  const { canvasRef, refs, isInitialized, fps } = usePixiApp({
    width: dimensions.width,
    height: dimensions.height,
  });

  // Fetch ALL tiles at startup using cached batch fetching
  const {
    tiles: tileCache,
    isLoading: tilesLoading,
    progress: tilesProgress,
    totalTiles,
  } = useTileCache();

  // Query map settings and places
  const mapSettings = useQuery(api.map.getMapSettings);
  const places = useQuery(api.map.getPlaces);

  // Initialize camera with mapSettings
  const {
    camera,
    debouncedCamera,
    initialCameraPos,
    setCamera,
    setInitialCameraPos,
    isDraggingRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetCamera,
  } = useCamera({
    dimensions,
    mapSettings: mapSettings ?? undefined,
    canvasRef,
  });

  // Query agents
  const agents = useQuery(api.agents.listAgents);

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

      const initialPos = {
        x: dimensions.width / 2 - centerX,
        y: dimensions.height / 2 - centerY,
        scale: 1,
      };

      console.log("📍 Centering camera on Central Green:", centerX, centerY);
      setCamera(initialPos);
      setInitialCameraPos(initialPos);
      setIsCameraReady(true);
    }
  }, [
    mapSettings,
    places,
    dimensions.width,
    dimensions.height,
    isCameraReady,
    setCamera,
    setInitialCameraPos,
  ]);

  // Render tiles using cached pre-rendering approach
  useTileRendererCached({
    tilesLayer: refs.tilesLayer,
    tiles: tileCache,
    mapSettings: mapSettings ?? undefined,
    isLoading: tilesLoading,
    renderer: refs.renderer,
    camera: debouncedCamera, // Use debounced camera for viewport culling
    dimensions,
  });

  // Render places
  usePlaceRenderer({
    placesLayer: refs.placesLayer,
    places: places as any, // Type cast to handle Convex document types
    mapSettings: mapSettings ?? undefined,
    isCameraReady,
  });

  // Render agents
  useAgentRenderer({
    agentsLayer: refs.agentsLayer,
    agents: agents,
    mapSettings: mapSettings ?? undefined,
    isCameraReady,
  });

  // Update camera transform
  useEffect(() => {
    if (!refs.worldContainer || !isCameraReady) return;

    // Double-check container is still valid before setting properties
    if (refs.worldContainer && !refs.worldContainer.destroyed) {
      refs.worldContainer.x = camera.x;
      refs.worldContainer.y = camera.y;
      refs.worldContainer.scale.set(camera.scale);
    }
  }, [camera, isCameraReady, refs.worldContainer]);

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

  const isLoading = !mapSettings || !isCameraReady || tilesLoading;

  // Notify parent when world is ready
  useEffect(() => {
    onWorldReady?.(!isLoading && isInitialized);
  }, [isLoading, isInitialized, onWorldReady]);

  // Log tile loading progress
  useEffect(() => {
    if (tilesLoading) {
      console.log(
        `📥 [PIXI MAP] Loading tiles: ${tilesProgress.toFixed(1)}% (${totalTiles} tiles loaded)`
      );
    } else if (totalTiles > 0) {
      console.log(`✅ [PIXI MAP] All ${totalTiles} tiles loaded and cached!`);
    }
  }, [tilesLoading, tilesProgress, totalTiles]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Pixi canvas */}
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

      {/* All overlays */}
      <MapOverlays
        isLoading={isLoading}
        mapSettings={mapSettings ?? undefined}
        places={places as any}
        camera={camera}
        initialCameraPos={initialCameraPos}
        showStats={showStats}
        fps={fps}
        onResetCamera={resetCamera}
        tilesProgress={tilesProgress}
        totalTiles={totalTiles}
      />
    </div>
  );
}
