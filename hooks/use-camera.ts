// Import React hooks for state management, memoization, side effects, and refs
import { useState, useCallback, useEffect, useRef } from "react";
// Import the MapSettings type that defines map dimensions and tile size
import type { MapSettings } from "@/lib/mapTypes";

// Define the shape of the camera state object
// This tracks the camera's position and zoom level
interface CameraState {
  x: number; // Camera's horizontal offset in pixels
  y: number; // Camera's vertical offset in pixels
  scale: number; // Camera's zoom level (1 = 100%, 2 = 200%, etc.)
}

// Define the required options for the useCamera hook
interface UseCameraOptions {
  dimensions: { width: number; height: number }; // Viewport dimensions in pixels
  mapSettings: MapSettings | undefined; // Map configuration (grid size, tile size)
  canvasRef: React.RefObject<HTMLDivElement | null>; // Reference to the canvas container DOM element
}

/**
 * Custom hook that manages camera state for a 2D map view
 * Handles camera position, zoom, panning, and constraints to keep the map within viewport
 */
export function useCamera({
  dimensions,
  mapSettings,
  canvasRef,
}: UseCameraOptions) {
  // State: Current camera position and zoom
  // Updated immediately on user interaction (pan/zoom)
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });

  // State: Debounced camera for expensive operations (like tile queries)
  // Updates 50ms after camera stops changing to avoid too many requests
  const [debouncedCamera, setDebouncedCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // State: Initial camera position to restore when user resets the view
  const [initialCameraPos, setInitialCameraPos] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Ref: Track if user is currently dragging the map
  // Using ref instead of state because we don't need re-renders when this changes
  const isDraggingRef = useRef(false);

  // Ref: Store last mouse position for calculating drag delta
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Effect: Debounce camera updates for expensive operations
  // This prevents making too many tile queries while the user is actively panning/zooming
  useEffect(() => {
    // Set a timer to update the debounced camera after 50ms of no changes
    const timer = setTimeout(() => {
      // Log the debounced camera update for debugging
      console.log(
        `🎥 [CAMERA] Debounced camera update: pos=(${camera.x.toFixed(0)},${camera.y.toFixed(0)}) scale=${camera.scale.toFixed(2)}`
      );
      // Update the debounced camera state (this triggers tile queries)
      setDebouncedCamera(camera);
    }, 50); // Reduced from 150ms to 50ms for faster tile loading

    // Cleanup: Clear the timer if camera changes before 50ms expires
    // This ensures we only update after user stops interacting
    return () => clearTimeout(timer);
  }, [camera]); // Re-run whenever camera changes

  // Callback: Calculate minimum scale to prevent white space around the map
  // This ensures the map always fills the entire viewport without gaps
  const getMinScale = useCallback(() => {
    // If map settings or dimensions aren't ready, return a default minimum scale
    if (!mapSettings || dimensions.width === 0 || dimensions.height === 0) {
      return 0.1;
    }

    // Calculate the total world size in pixels
    const mapWidth = mapSettings.gridWidth * mapSettings.tileSize;
    const mapHeight = mapSettings.gridHeight * mapSettings.tileSize;

    // Calculate the scale needed to fit the map width to viewport width
    const scaleX = dimensions.width / mapWidth;
    // Calculate the scale needed to fit the map height to viewport height
    const scaleY = dimensions.height / mapHeight;

    // Use the LARGER of the two scales to ensure map fills viewport in BOTH dimensions
    // This prevents white space in any dimension (the map will overflow in one dimension)
    return Math.max(scaleX, scaleY);
  }, [mapSettings, dimensions]); // Recalculate when map settings or viewport dimensions change

  // Callback: Constrain camera to valid bounds
  // Prevents camera from showing white space outside the map
  const constrainCamera = useCallback(
    (newCamera: CameraState): CameraState => {
      // If map settings aren't ready, return camera unchanged
      if (!mapSettings) return newCamera;

      // Get the minimum allowed scale (to prevent white space)
      const minScale = getMinScale();
      // Constrain scale between minimum and 5x zoom
      const constrainedScale = Math.max(minScale, Math.min(5, newCamera.scale));

      // Calculate the world size at the constrained scale
      const worldWidth =
        mapSettings.gridWidth * mapSettings.tileSize * constrainedScale;
      const worldHeight =
        mapSettings.gridHeight * mapSettings.tileSize * constrainedScale;

      // Calculate position bounds
      // maxX and maxY are 0 (top-left corner of map aligns with top-left of viewport)
      const maxX = 0;
      // minX is negative (bottom-right corner of map aligns with bottom-right of viewport)
      const minX = dimensions.width - worldWidth;
      const maxY = 0;
      const minY = dimensions.height - worldHeight;

      // Return constrained camera state
      return {
        // Clamp x position between minX and maxX
        x: Math.max(minX, Math.min(maxX, newCamera.x)),
        // Clamp y position between minY and maxY
        y: Math.max(minY, Math.min(maxY, newCamera.y)),
        // Use the constrained scale
        scale: constrainedScale,
      };
    },
    [mapSettings, dimensions, getMinScale] // Recalculate when dependencies change
  );

  // Effect: Set up wheel event listener for zooming
  useEffect(() => {
    // Get the canvas DOM element
    const canvas = canvasRef.current;
    // Don't set up listener if canvas or map settings aren't ready
    if (!canvas || !mapSettings) return;

    // Handler: Process mouse wheel events for zooming
    const handleWheel = (e: WheelEvent) => {
      // Prevent default scroll behavior
      e.preventDefault();

      // Configure zoom speed (smaller = slower zoom)
      const zoomSpeed = 0.001;
      // Calculate zoom factor from wheel delta (negative = zoom in, positive = zoom out)
      const zoomFactor = 1 - e.deltaY * zoomSpeed;

      // Update camera state
      setCamera((prev) => {
        // Get minimum allowed scale
        const minScale = getMinScale();
        // Calculate new scale, constrained between min and 5x
        const newScale = Math.max(
          minScale,
          Math.min(5, prev.scale * zoomFactor)
        );

        // Zoom towards mouse position (not center of viewport)
        // Get canvas position on screen
        const rect = canvas.getBoundingClientRect();
        // Calculate mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert mouse viewport position to world coordinates at old scale
        const worldX = (mouseX - prev.x) / prev.scale;
        const worldY = (mouseY - prev.y) / prev.scale;

        // Calculate new camera position to keep world position under mouse
        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        // Return constrained camera state
        return constrainCamera({ x: newX, y: newY, scale: newScale });
      });
    };

    // Add wheel event listener (passive: false allows preventDefault)
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    // Cleanup: Remove event listener when component unmounts or dependencies change
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [mapSettings, canvasRef, constrainCamera, getMinScale]); // Re-run when dependencies change

  // Callback: Handle mouse down event to start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Set dragging flag to true
    isDraggingRef.current = true;
    // Store initial mouse position for delta calculation
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []); // No dependencies, never needs to be recreated

  // Callback: Handle mouse move event for panning
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Only process if user is dragging and map is ready
      if (!isDraggingRef.current || !mapSettings) return;

      // Calculate how far mouse moved since last frame
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;

      // Update camera position
      setCamera((prev) => {
        // Add mouse delta to current camera position
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        // Return constrained camera to prevent going out of bounds
        return constrainCamera({ ...prev, x: newX, y: newY });
      });

      // Update last position for next frame's delta calculation
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    },
    [mapSettings, constrainCamera] // Recreate when these change
  );

  // Callback: Handle mouse up event to stop dragging
  const handleMouseUp = useCallback(() => {
    // Clear dragging flag
    isDraggingRef.current = false;
  }, []); // No dependencies, never needs to be recreated

  // Callback: Reset camera to initial position
  const resetCamera = useCallback(() => {
    // Restore camera to the initial position that was set
    setCamera(initialCameraPos);
  }, [initialCameraPos]); // Recreate when initial position changes

  // Return all camera state and handlers for use in components
  return {
    camera, // Current camera state (updated immediately)
    debouncedCamera, // Debounced camera state (for expensive operations)
    initialCameraPos, // Initial camera position (for reset)
    setCamera, // Function to update camera state
    setInitialCameraPos, // Function to set initial camera position
    constrainCamera, // Function to constrain camera to valid bounds
    isDraggingRef, // Ref tracking if user is dragging
    handleMouseDown, // Mouse down event handler
    handleMouseMove, // Mouse move event handler
    handleMouseUp, // Mouse up event handler
    resetCamera, // Function to reset camera to initial position
  };
}
