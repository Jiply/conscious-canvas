// Import React hooks for side effects, refs, and state management
import { useEffect, useRef, useState } from "react";
// Import PixiJS classes for rendering 2D graphics
import { Application, Container, Graphics } from "pixi.js";

// Define the required options for the usePixiApp hook
interface UsePixiAppOptions {
  width: number; // Canvas width in pixels
  height: number; // Canvas height in pixels
}

// Define the structure of PixiJS references returned by the hook
interface PixiAppRefs {
  app: Application | null; // Main PixiJS application instance
  worldContainer: Container | null; // Container that holds all world content (camera transform applied here)
  tilesLayer: Container | null; // Container for tile sprites (changed from Graphics to Container for Sprite support)
  skeletonLayer: Graphics | null; // Graphics layer for drawing skeleton outlines (debugging)
  placesLayer: Container | null; // Container for place labels and outlines
  agentsLayer: Container | null; // Container for agent sprites
  renderer: any | null; // PixiJS WebGL renderer (needed for texture generation)
}

/**
 * Custom hook that initializes and manages a PixiJS application
 * Creates the canvas, renderer, and layered scene graph for map rendering
 * Handles initialization, resizing, and FPS monitoring
 */
export function usePixiApp({ width, height }: UsePixiAppOptions) {
  // Ref: Reference to the DOM div that will contain the PixiJS canvas
  const canvasRef = useRef<HTMLDivElement>(null);

  // Ref: Store the PixiJS Application instance (persists across renders)
  const appRef = useRef<Application | null>(null);

  // Ref: Store the world container (all map content, camera transform applied here)
  const worldContainerRef = useRef<Container | null>(null);

  // Ref: Store the tiles layer container (changed from Graphics to Container for Sprite support)
  const tilesLayerRef = useRef<Container | null>(null);

  // Ref: Store the skeleton graphics layer (for debugging tile outlines)
  const skeletonLayerRef = useRef<Graphics | null>(null);

  // Ref: Store the places layer container (for labels and building outlines)
  const placesLayerRef = useRef<Container | null>(null);

  // Ref: Store the agents layer container (for agent sprites)
  const agentsLayerRef = useRef<Container | null>(null);

  // Ref: Track last frame time for FPS calculation
  const lastFrameTimeRef = useRef(performance.now());

  // State: Track if PixiJS has finished initializing
  const [isInitialized, setIsInitialized] = useState(false);

  // State: Track current frames per second for performance monitoring
  const [fps, setFps] = useState(60);

  // Effect: Initialize PixiJS application ONCE
  useEffect(() => {
    // Don't initialize if:
    // - Canvas ref isn't ready
    // - Already initialized
    // - Width or height is 0 (invalid dimensions)
    if (!canvasRef.current || appRef.current || width === 0 || height === 0) {
      return;
    }

    console.log("🎨 Initializing Pixi app...");
    // Create new PixiJS Application instance
    const app = new Application();

    // Initialize the application asynchronously
    app
      .init({
        width, // Canvas width
        height, // Canvas height
        backgroundColor: 0xffffff, // White background
        antialias: true, // Enable anti-aliasing for smoother edges
        resolution: window.devicePixelRatio * 1.5 || 2, // High resolution for sharp rendering
        autoDensity: true, // Automatically adjust CSS size for pixel density
      })
      .then(() => {
        // Check refs are still valid after async init
        if (!canvasRef.current || !app.canvas) return;

        // Add PixiJS canvas to the DOM container
        canvasRef.current.appendChild(app.canvas);
        // Store application reference
        appRef.current = app;

        // Create world container (all map content goes here, camera transform applied here)
        const worldContainer = new Container();
        // Add world container to the stage (root of scene graph)
        app.stage.addChild(worldContainer);
        // Store reference to world container
        worldContainerRef.current = worldContainer;

        // Create rendering layers (order matters - rendered bottom to top)
        const skeletonLayer = new Graphics(); // For debugging tile outlines
        const tilesLayer = new Container(); // For tile sprites (changed from Graphics for better performance)
        const placesLayer = new Container(); // For place labels and outlines
        const agentsLayer = new Container(); // For agent sprites

        // Add layers to world container in correct order
        worldContainer.addChild(skeletonLayer); // Bottom layer
        worldContainer.addChild(tilesLayer); // Layer 2
        worldContainer.addChild(placesLayer); // Layer 3
        worldContainer.addChild(agentsLayer); // Top layer (agents on top)

        // Store references to layers
        skeletonLayerRef.current = skeletonLayer;
        tilesLayerRef.current = tilesLayer;
        placesLayerRef.current = placesLayer;
        agentsLayerRef.current = agentsLayer;

        // Setup FPS counter function (runs every frame)
        const fpsUpdate = () => {
          // Get current timestamp
          const now = performance.now();
          // Calculate time since last frame
          const delta = now - lastFrameTimeRef.current;
          // Calculate FPS (1000ms / delta)
          const currentFps = 1000 / delta;
          // Update FPS state (rounded to integer)
          setFps(Math.round(currentFps));
          // Store current time for next frame calculation
          lastFrameTimeRef.current = now;
        };
        // Add FPS counter to PixiJS ticker (runs every frame)
        app.ticker.add(fpsUpdate);

        console.log("✅ Pixi app initialized");
        // Mark as initialized so components can start rendering
        setIsInitialized(true);
      });

    // Cleanup function: Destroy PixiJS app when component unmounts
    return () => {
      if (appRef.current) {
        console.log("🗑️ Destroying Pixi app");
        // Destroy application and all children
        appRef.current.destroy(true, { children: true });
        // Clear all references
        appRef.current = null;
        worldContainerRef.current = null;
        skeletonLayerRef.current = null;
        tilesLayerRef.current = null;
        placesLayerRef.current = null;
        agentsLayerRef.current = null;
      }
    };
  }, [width, height]); // Re-run if dimensions change (will recreate canvas)

  // Effect: Resize canvas when dimensions change
  useEffect(() => {
    // Don't resize if app isn't initialized or dimensions are invalid
    if (!appRef.current || width === 0 || height === 0) return;

    console.log("🔄 Resizing canvas to:", width, "x", height);
    // Tell PixiJS renderer to resize (updates both canvas and internal buffers)
    appRef.current.renderer.resize(width, height);
  }, [width, height]); // Re-run when width or height changes

  // Collect all PixiJS references into a single object
  const refs: PixiAppRefs = {
    app: appRef.current, // Main application instance
    worldContainer: worldContainerRef.current, // World container (for camera)
    tilesLayer: tilesLayerRef.current, // Tiles layer
    skeletonLayer: skeletonLayerRef.current, // Skeleton layer
    placesLayer: placesLayerRef.current, // Places layer
    agentsLayer: agentsLayerRef.current, // Agents layer
    renderer: appRef.current?.renderer || null, // WebGL renderer
  };

  // Return everything needed by parent components
  return {
    canvasRef, // DOM ref to attach canvas to
    refs, // All PixiJS object references
    isInitialized, // Boolean indicating if initialization is complete
    fps, // Current frames per second
  };
}
