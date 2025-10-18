"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TILE_VISUALS } from "@/lib/mapTypes";
import { renderTiles, getTileColorString } from "@/lib/tileRenderer";

interface PixiMapProps {
  className?: string;
  onWorldReady?: (isReady: boolean) => void;
}

export function PixiMap({ className, onWorldReady }: PixiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const tilesLayerRef = useRef<Graphics | null>(null);
  const placesLayerRef = useRef<Container | null>(null);
  const agentsLayerRef = useRef<Container | null>(null);
  const agentContainersRef = useRef<Map<string, {
    container: Container;
    targetX: number;
    targetY: number;
    startX: number;
    startY: number;
    animationStartTime: number;
    wobbleOffsetX: number;
    wobbleOffsetY: number;
    wobbleSpeed: number;
  }>>(new Map());

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
  const [initialCameraPos, setInitialCameraPos] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const skeletonLayerRef = useRef<Graphics | null>(null);

  // Query map data from Convex
  const mapSettings = useQuery(api.map.getMapSettings);
  const places = useQuery(api.map.getPlaces);
  const agents = useQuery(api.agents.listAgents);

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

  // Debug: Log tile data and rendering state
  useEffect(() => {
    if (tiles && tiles.length > 0) {
      const loadTime = performance.now();
      const canRender =
        !!tilesLayerRef.current &&
        !!skeletonLayerRef.current &&
        !!mapSettings &&
        isCameraReady;

      console.log(
        `📊 Tiles loaded from DB: ${tiles.length} tiles (t=${loadTime.toFixed(0)}ms)`
      );
      console.log("📊 Sample tile:", tiles[0]);
      console.log("📊 Tile types:", [...new Set(tiles.map((t) => t.tileType))]);

      if (!canRender) {
        console.warn(
          "⏳ Tiles loaded but WAITING to render (WHITE SCREEN GAP):",
          {
            hasTilesLayer: !!tilesLayerRef.current,
            hasSkeletonLayer: !!skeletonLayerRef.current,
            hasMapSettings: !!mapSettings,
            isCameraReady,
            message:
              "Tiles are in memory but not yet visible - THIS IS THE WHITE SCREEN DELAY!",
          }
        );
      } else {
        console.log(
          `✅ Tiles loaded and READY to render immediately (no white screen gap)`
        );
      }
    }
  }, [
    tiles,
    tilesLayerRef.current,
    skeletonLayerRef.current,
    mapSettings,
    isCameraReady,
  ]);

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
    if (!canvas || !mapSettings) return;

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

        let newX = mouseX - worldX * newScale;
        let newY = mouseY - worldY * newScale;

        // Constrain camera to map boundaries
        const worldWidth =
          mapSettings.gridWidth * mapSettings.tileSize * newScale;
        const worldHeight =
          mapSettings.gridHeight * mapSettings.tileSize * newScale;

        const maxX = 0;
        const minX = dimensions.width - worldWidth;
        const maxY = 0;
        const minY = dimensions.height - worldHeight;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        return { x: newX, y: newY, scale: newScale };
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [mapSettings, dimensions]);

  // Initialize Pixi application ONCE
  useEffect(() => {
    // Silent early returns for invalid state (normal during component lifecycle)
    if (
      !canvasRef.current ||
      appRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return;
    }

    console.log("🎨 Initializing Pixi app...");
    const app = new Application();

    app
      .init({
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: 0xffffff, // White background
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
        const skeletonLayer = new Graphics();
        const tilesLayer = new Graphics();
        const placesLayer = new Container();
        const agentsLayer = new Container();
        worldContainer.addChild(skeletonLayer);
        worldContainer.addChild(tilesLayer);
        worldContainer.addChild(placesLayer);
        worldContainer.addChild(agentsLayer);
        skeletonLayerRef.current = skeletonLayer;
        tilesLayerRef.current = tilesLayer;
        placesLayerRef.current = placesLayer;
        agentsLayerRef.current = agentsLayer;

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
        skeletonLayerRef.current = null;
        tilesLayerRef.current = null;
        placesLayerRef.current = null;
        agentsLayerRef.current = null;
        agentContainersRef.current.clear();
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
  }, [mapSettings, places, dimensions.width, dimensions.height, isCameraReady]);

  // Render tiles (update layer, don't recreate container)
  useEffect(() => {
    // Silent early returns for invalid state (normal during component lifecycle)
    if (!tilesLayerRef.current || !skeletonLayerRef.current) return;
    if (!tiles || tiles.length === 0) return;
    if (!mapSettings) return;
    if (!isCameraReady) return;

    const perfStart = performance.now();
    console.log(
      `\n🎨 ========== RENDER EFFECT TRIGGERED (t=${perfStart.toFixed(0)}ms) ==========`
    );
    console.log(`   Rendering ${tiles.length} tiles`);
    console.log("   ⏱️  Performance timing enabled - watch for delays!");

    const tilesLayer = tilesLayerRef.current;
    const skeletonLayer = skeletonLayerRef.current;
    const tileSize = mapSettings.tileSize;

    try {
      // IMMEDIATE: Draw a simple loading overlay first (non-blocking)
      const overlayStart = performance.now();
      skeletonLayer.clear();
      skeletonLayer.rect(0, 0, 10000, 10000); // Cover entire view
      skeletonLayer.fill({ color: 0xf5f5f5, alpha: 0.5 });
      console.log(
        `   ✓ Initial overlay drawn (${(performance.now() - overlayStart).toFixed(2)}ms)`
      );

      // Use requestAnimationFrame to avoid blocking
      requestAnimationFrame(() => {
        const skeletonStart = performance.now();
        console.log(
          "   → Step 1: Drawing",
          tiles.length,
          "skeleton placeholders (this may take time...)"
        );

        skeletonLayer.clear();
        skeletonLayer.alpha = 1;

        // Draw skeleton tiles in batches to avoid blocking
        const batchSize = 500; // Draw 500 tiles at a time
        let currentBatch = 0;

        const drawBatch = () => {
          const startIdx = currentBatch * batchSize;
          const endIdx = Math.min(startIdx + batchSize, tiles.length);

          for (let i = startIdx; i < endIdx; i++) {
            const tile = tiles[i];
            const x = tile.x * tileSize;
            const y = tile.y * tileSize;

            // Draw more visible gray placeholder with shimmer effect
            skeletonLayer.rect(x, y, tileSize, tileSize);
            skeletonLayer.fill({ color: 0xe8e8e8, alpha: 0.8 });

            // Add more visible border
            skeletonLayer.rect(x, y, tileSize, tileSize);
            skeletonLayer.stroke({ width: 1, color: 0xd0d0d0, alpha: 0.6 });
          }

          currentBatch++;

          if (endIdx < tiles.length) {
            console.log(
              `      ⏳ Batch ${currentBatch}/${Math.ceil(tiles.length / batchSize)} (${endIdx}/${tiles.length} tiles)`
            );
            requestAnimationFrame(drawBatch);
          } else {
            const skeletonTime = performance.now() - skeletonStart;
            console.log(
              `   ✓ Skeleton placeholders drawn (${skeletonTime.toFixed(2)}ms for ${tiles.length} tiles = ${(skeletonTime / tiles.length).toFixed(3)}ms/tile)`
            );
            console.log(
              "   → Step 2: Animating pulse effect (600ms visible pulsing)"
            );
            startPulseAnimation();
          }
        };

        const startPulseAnimation = () => {
          // Animate skeleton pulse with more pronounced effect
          let pulseTime = 0;
          const pulseInterval = setInterval(() => {
            if (!skeletonLayer.destroyed) {
              pulseTime += 0.12; // Faster pulse
              skeletonLayer.alpha = 0.6 + Math.sin(pulseTime) * 0.3; // More pronounced (0.3 to 0.9)
            }
          }, 40); // Slightly slower interval for smoother pulse

          // Step 2: Render actual tiles (with longer delay to show pulsing skeletons)
          setTimeout(() => {
            const renderStart = performance.now();
            console.log(
              "   → Step 3: Rendering actual tiles with textures/patterns (after",
              tiles.length,
              "tiles pulsed)"
            );
            // Animate tile layer fade-in
            tilesLayer.alpha = 0;
            const startTime = Date.now();
            const duration = 400; // 400ms fade-in (faster now that we show skeletons longer)

            const animate = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);

              if (tilesLayer.destroyed) return;

              tilesLayer.alpha = progress;
              // Fade out skeleton as tiles fade in (starting from last pulse state)
              if (!skeletonLayer.destroyed) {
                const currentAlpha = 0.6 + Math.sin(pulseTime) * 0.3;
                skeletonLayer.alpha = Math.max(
                  0,
                  currentAlpha - progress * currentAlpha
                );
              }

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                clearInterval(pulseInterval);
                if (!skeletonLayer.destroyed) {
                  skeletonLayer.clear();
                }
              }
            };

            // Use the new tile renderer with visual styles and patterns
            renderTiles(tilesLayer, tiles, tileSize);
            const renderTime = performance.now() - renderStart;
            console.log(
              `   ✓ Actual tiles drawn to canvas (${renderTime.toFixed(2)}ms = ${(renderTime / tiles.length).toFixed(3)}ms/tile)`
            );
            console.log(
              "   → Step 4: Fading in tiles (400ms) & fading out skeletons"
            );

            // Start fade-in animation
            animate();

            const totalTime = performance.now() - perfStart;
            console.log(
              `✅ Complete render pipeline finished (${totalTime.toFixed(2)}ms total) - tiles now visible!`
            );
          }, 600); // 600ms delay to show pulsing skeletons before real tiles
        };

        // Start drawing batches
        drawBatch();
      });
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

    // Filter out small subdivisions
    const mainPlaces = places.filter(
      (p) =>
        p.kind !== "dorm_room" &&
        p.kind !== "common_room" &&
        p.kind !== "study_room"
    );

    // Render places with staggered fade-in animation
    mainPlaces.forEach((place, index) => {
      const bounds = place.bounds;
      const centerX = (bounds.x + bounds.width / 2) * tileSize;
      const centerY = (bounds.y + bounds.height / 2) * tileSize;

      // Container for this place (for animation)
      const placeContainer = new Container();
      placeContainer.alpha = 0;
      placesLayer.addChild(placeContainer);

      // Draw place outline with new v8 API
      const outline = new Graphics();
      outline.rect(
        bounds.x * tileSize,
        bounds.y * tileSize,
        bounds.width * tileSize,
        bounds.height * tileSize
      );
      outline.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
      placeContainer.addChild(outline);

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
      placeContainer.addChild(label);

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
        placeContainer.addChild(infoLabel);
      }

      // Staggered fade-in animation
      setTimeout(() => {
        const startTime = Date.now();
        const duration = 300; // 300ms fade-in

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (placeContainer.destroyed) return;

          placeContainer.alpha = progress;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }, index * 50); // 50ms delay between each place
    });

    console.log("✅ Places rendered with fade-in animation");
  }, [places, mapSettings, isCameraReady]);

  // Update agent targets when agent data changes
  useEffect(() => {
    if (!agentsLayerRef.current || !agents || !mapSettings || !isCameraReady) {
      return;
    }

    const agentsLayer = agentsLayerRef.current;
    const tileSize = mapSettings.tileSize;
    const agentContainers = agentContainersRef.current;

    // Helper function to get agent color based on role
    const getAgentColor = (role: string): number => {
      const colorMap: Record<string, number> = {
        student: 0x3b82f6, // blue
        professor: 0x8b5cf6, // purple
        staff: 0x10b981, // green
        visitor: 0xf59e0b, // amber
      };
      return colorMap[role.toLowerCase()] || 0x6b7280; // gray default
    };

    // Track which agents we've seen in this update
    const activeAgentIds = new Set<string>();

    agents.forEach((agent) => {
      activeAgentIds.add(agent._id);

      const targetX = agent.pos.x * tileSize;
      const targetY = agent.pos.y * tileSize;

      let agentData = agentContainers.get(agent._id);

      if (!agentData) {
        // Create new agent container
        const agentContainer = new Container();
        agentsLayer.addChild(agentContainer);

        // Draw agent circle
        const agentCircle = new Graphics();
        agentCircle.circle(0, 0, 8);
        agentCircle.fill({ color: getAgentColor(agent.role) });

        // Add a white border for visibility
        agentCircle.circle(0, 0, 8);
        agentCircle.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

        agentContainer.addChild(agentCircle);

        // Add agent name label
        const labelStyle = new TextStyle({
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          fontWeight: "bold",
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 2.5 },
        });

        const label = new Text({
          text: agent.name,
          style: labelStyle,
        });
        label.anchor.set(0.5);
        label.y = -14;
        agentContainer.addChild(label);

        // Set initial position (no animation for first appearance)
        agentContainer.x = targetX;
        agentContainer.y = targetY;

        // Store the container with position tracking
        agentData = {
          container: agentContainer,
          targetX,
          targetY,
          startX: targetX,
          startY: targetY,
          animationStartTime: performance.now(),
          wobbleOffsetX: Math.random() * Math.PI * 2, // Random phase offset
          wobbleOffsetY: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.8 + Math.random() * 0.4, // Random speed between 0.8-1.2
        };
        agentContainers.set(agent._id, agentData);

        // Fade in animation
        agentContainer.alpha = 0;
        const startTime = Date.now();
        const duration = 250;

        const fadeIn = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (agentContainer.destroyed) return;

          agentContainer.alpha = progress;

          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          }
        };
        requestAnimationFrame(fadeIn);
      } else {
        // Update target position for existing agent (if it changed)
        const targetChanged = Math.abs(agentData.targetX - targetX) > 0.1 || Math.abs(agentData.targetY - targetY) > 0.1;

        if (targetChanged) {
          // Start new animation from current position
          agentData.startX = agentData.container.x;
          agentData.startY = agentData.container.y;
          agentData.targetX = targetX;
          agentData.targetY = targetY;
          agentData.animationStartTime = performance.now();
        }
      }
    });

    // Remove agents that no longer exist
    for (const [agentId, agentData] of agentContainers.entries()) {
      if (!activeAgentIds.has(agentId)) {
        agentData.container.destroy();
        agentContainers.delete(agentId);
      }
    }

    console.log("✅ Agent targets updated");
  }, [agents, mapSettings, isCameraReady]);

  // Linear position interpolation (runs every frame) - no easing + wobble
  useEffect(() => {
    if (!appRef.current || !isCameraReady) return;

    const app = appRef.current;
    const agentContainers = agentContainersRef.current;

    const MOVEMENT_DURATION = 5000; // 5 seconds in milliseconds
    const WOBBLE_AMPLITUDE = 1.5; // Max wobble distance in pixels
    const WOBBLE_FREQUENCY = 3; // Wobbles per second

    const animate = () => {
      const now = performance.now();

      for (const agentData of agentContainers.values()) {
        const { container, targetX, targetY, startX, startY, animationStartTime, wobbleOffsetX, wobbleOffsetY, wobbleSpeed } = agentData;

        if (container.destroyed) continue;

        // Calculate linear progress (0 to 1)
        const elapsed = now - animationStartTime;
        const progress = Math.min(elapsed / MOVEMENT_DURATION, 1);

        // Linear interpolation - constant speed, no easing
        const baseX = startX + (targetX - startX) * progress;
        const baseY = startY + (targetY - startY) * progress;

        // Add subtle wobble effect
        const time = now / 1000; // Convert to seconds
        const wobbleX = Math.sin(time * WOBBLE_FREQUENCY * wobbleSpeed + wobbleOffsetX) * WOBBLE_AMPLITUDE;
        const wobbleY = Math.cos(time * WOBBLE_FREQUENCY * wobbleSpeed * 1.3 + wobbleOffsetY) * WOBBLE_AMPLITUDE * 0.7; // Slightly different frequency and amplitude for Y

        // Update container position with wobble
        container.x = baseX + wobbleX;
        container.y = baseY + wobbleY;
      }
    };

    app.ticker.add(animate);

    return () => {
      app.ticker.remove(animate);
    };
  }, [isCameraReady]);

  // Update camera transform (separate from rendering)
  useEffect(() => {
    if (!worldContainerRef.current || !isCameraReady) return;

    const worldContainer = worldContainerRef.current;
    worldContainer.x = camera.x;
    worldContainer.y = camera.y;
    worldContainer.scale.set(camera.scale);
  }, [camera, isCameraReady]);

  // Mouse interaction handlers
  function handleMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current || !mapSettings) return;

    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;

    setCamera((prev) => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;

      // Constrain camera to map boundaries
      const worldWidth =
        mapSettings.gridWidth * mapSettings.tileSize * prev.scale;
      const worldHeight =
        mapSettings.gridHeight * mapSettings.tileSize * prev.scale;

      const maxX = 0;
      const minX = dimensions.width - worldWidth;
      const maxY = 0;
      const minY = dimensions.height - worldHeight;

      return {
        ...prev,
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      };
    });

    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() {
    isDraggingRef.current = false;
  }

  function handleResetCamera() {
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
  }

  const isLoading = !mapSettings || !isCameraReady;

  // Notify parent when world is ready
  useEffect(() => {
    onWorldReady?.(!isLoading && isInitialized);
  }, [isLoading, isInitialized, onWorldReady]);

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
                {!isCameraReady && mapSettings && places && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    Centering camera
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
            onClick={handleResetCamera}
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
            {tiles?.length || 0} tiles loaded
          </div>
          <div className="text-muted-foreground">
            {places?.length || 0} places
          </div>
          <div className="text-muted-foreground">
            {agents?.length || 0} agents
          </div>
          {visibleRegion && (
            <div className="text-muted-foreground mt-1 text-[10px]">
              Viewport: {visibleRegion.width}×{visibleRegion.height} tiles
            </div>
          )}
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
            <div>Tiles: {tiles?.length || 0} loaded</div>
            <div>
              Viewport: {visibleRegion?.width}×{visibleRegion?.height} tiles
            </div>
            <div>Resolution: {(window.devicePixelRatio * 1.5).toFixed(1)}x</div>
            <div className="pt-1 border-t border-green-500/30 mt-1">
              <div className="text-cyan-300 font-semibold mb-1">📏 Scale</div>
              <div>1 tile = {mapSettings.metersPerTile}m</div>
              {visibleRegion && (
                <>
                  <div>
                    View:{" "}
                    {(visibleRegion.width * mapSettings.metersPerTile).toFixed(
                      0
                    )}
                    m ×{" "}
                    {(visibleRegion.height * mapSettings.metersPerTile).toFixed(
                      0
                    )}
                    m
                  </div>
                  <div className="text-muted-foreground">
                    (
                    {(
                      visibleRegion.width *
                      visibleRegion.height *
                      mapSettings.metersPerTile *
                      mapSettings.metersPerTile
                    ).toFixed(0)}
                    m²)
                  </div>
                </>
              )}
            </div>
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
