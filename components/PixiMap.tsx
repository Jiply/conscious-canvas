"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCamera } from "@/hooks/use-camera";
import { usePixiApp } from "@/hooks/use-pixi-app";
import { useEffect, useRef, useState } from "react";
import { useTileCache } from "@/hooks/use-tile-cache";
import { MapOverlays } from "@/components/MapOverlays";
import type { Id } from "@/convex/_generated/dataModel";
import { usePlaceRenderer } from "@/hooks/use-place-renderer";
import { useAgentRenderer } from "@/hooks/use-agent-renderer";
import { useTileRendererCached } from "@/hooks/use-tile-renderer-cached";

interface PixiMapProps {
  className?: string;
  onWorldReady?: (isReady: boolean) => void;
  centerOnLocation?: { x: number; y: number } | null;
  onCenterComplete?: () => void;
  isWorldRunning?: boolean;
  observerCount?: number;
  onAgentClick?: (agentId: Id<"agents">) => void;
}

export function PixiMap({
  className,
  onWorldReady,
  centerOnLocation,
  onCenterComplete,
  isWorldRunning,
  observerCount,
  onAgentClick,
}: PixiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
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

  const { canvasRef, refs, isInitialized, fps } = usePixiApp({
    width: dimensions.width,
    height: dimensions.height,
  });

  const {
    tiles: tileCache,
    isLoading: tilesLoading,
    progress: tilesProgress,
    totalTiles,
  } = useTileCache();

  const mapSettings = useQuery(api.map.getMapSettings);
  const places = useQuery(api.map.getPlaces);

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

  const agents = useQuery(api.agents.listAgents);

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

  useTileRendererCached({
    tilesLayer: refs.tilesLayer,
    tiles: tileCache,
    mapSettings: mapSettings ?? undefined,
    isLoading: tilesLoading,
    renderer: refs.renderer,
    camera: debouncedCamera,
    dimensions,
  });

  usePlaceRenderer({
    placesLayer: refs.placesLayer,
    places: places as any,
    mapSettings: mapSettings ?? undefined,
    isCameraReady,
  });

  useAgentRenderer({
    agentsLayer: refs.agentsLayer,
    agents: agents,
    mapSettings: mapSettings ?? undefined,
    isCameraReady,
    onAgentClick,
  });

  useEffect(() => {
    if (!refs.worldContainer || !isCameraReady) return;

    if (refs.worldContainer && !refs.worldContainer.destroyed) {
      refs.worldContainer.x = camera.x;
      refs.worldContainer.y = camera.y;
      refs.worldContainer.scale.set(camera.scale);
    }
  }, [camera, isCameraReady, refs.worldContainer]);

  useEffect(() => {
    if (!centerOnLocation || !mapSettings || !isCameraReady) return;

    const tileSize = mapSettings.tileSize;
    const targetX = centerOnLocation.x * tileSize;
    const targetY = centerOnLocation.y * tileSize;

    const newX = dimensions.width / 2 - targetX * camera.scale;
    const newY = dimensions.height / 2 - targetY * camera.scale;

    setCamera({ ...camera, x: newX, y: newY });

    if (onCenterComplete) {
      onCenterComplete();
    }
  }, [centerOnLocation, mapSettings, isCameraReady, dimensions, camera.scale]);

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

  useEffect(() => {
    onWorldReady?.(!isLoading && isInitialized);
  }, [isLoading, isInitialized, onWorldReady]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ""}`}
      style={{ width: "100%", height: "100%" }}
    >
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
        isWorldRunning={isWorldRunning}
        observerCount={observerCount}
      />
    </div>
  );
}
