// Import React hooks for memoization, side effects, and refs
import { useCallback, useEffect, useRef } from "react";
// Import Convex hook for querying data reactively
import { useQuery } from "convex/react";
// Import generated API endpoints from Convex
import { api } from "@/convex/_generated/api";
// Import MapSettings type definition
import type { MapSettings } from "@/lib/mapTypes";

// Define the required options for the useMapData hook
interface UseMapDataOptions {
  debouncedCamera: { x: number; y: number; scale: number }; // Camera position (debounced to reduce queries)
  dimensions: { width: number; height: number }; // Viewport dimensions in pixels
  mapSettings: MapSettings | undefined; // Optional map settings from parent (if available)
  isCameraReady: boolean; // Flag indicating camera is initialized and ready
}

/**
 * Custom hook that queries and manages map data from Convex
 * Calculates visible tile region based on camera position and queries only those tiles
 * Implements smart logging to avoid duplicate console messages
 */
export function useMapData({
  debouncedCamera,
  dimensions,
  mapSettings: mapSettingsFromParent,
  isCameraReady,
}: UseMapDataOptions) {
  // Ref: Track last query parameters to avoid duplicate log messages
  const lastQueryRef = useRef<string>("");

  // Ref: Track last tile count to avoid duplicate log messages
  const lastTileCountRef = useRef<number>(0);

  // Query: Get map settings from Convex (grid size, tile size, etc.)
  const settings = useQuery(api.map.getMapSettings);

  // Query: Get all places (buildings, rooms) from Convex
  const places = useQuery(api.map.getPlaces);

  // Use parent's map settings if provided, otherwise use queried settings
  // This allows parent to pass cached settings to avoid extra queries
  const mapSettings = mapSettingsFromParent ?? settings;

  // Callback: Calculate which tile region is visible in the current viewport
  // This is used to query only the tiles we need to render, reducing data transfer
  const getVisibleRegion = useCallback(() => {
    // Don't calculate if we're not ready or dimensions are invalid
    if (!mapSettings || !isCameraReady || dimensions.width === 0) return null;

    // Get tile size from map settings
    const tileSize = mapSettings.tileSize;
    // Add padding to load tiles slightly outside viewport for smooth panning
    const padding = 10; // Balanced padding to load ~2000 tiles per query (sweet spot for performance)

    // Convert viewport corners from screen space to world space
    // Left edge of viewport in world coordinates
    const viewportLeft = -debouncedCamera.x / debouncedCamera.scale;
    // Top edge of viewport in world coordinates
    const viewportTop = -debouncedCamera.y / debouncedCamera.scale;
    // Right edge of viewport in world coordinates
    const viewportRight =
      (dimensions.width - debouncedCamera.x) / debouncedCamera.scale;
    // Bottom edge of viewport in world coordinates
    const viewportBottom =
      (dimensions.height - debouncedCamera.y) / debouncedCamera.scale;

    // Convert world coordinates to tile grid coordinates, with padding
    // Minimum X tile index (clamped to 0)
    const minX = Math.max(0, Math.floor(viewportLeft / tileSize) - padding);
    // Minimum Y tile index (clamped to 0)
    const minY = Math.max(0, Math.floor(viewportTop / tileSize) - padding);
    // Maximum X tile index (clamped to grid width)
    const maxX = Math.min(
      mapSettings.gridWidth,
      Math.ceil(viewportRight / tileSize) + padding
    );
    // Maximum Y tile index (clamped to grid height)
    const maxY = Math.min(
      mapSettings.gridHeight,
      Math.ceil(viewportBottom / tileSize) + padding
    );

    // Return rectangular region of tiles to query
    return {
      x: minX, // Starting X tile coordinate
      y: minY, // Starting Y tile coordinate
      width: maxX - minX, // Number of tiles in X direction
      height: maxY - minY, // Number of tiles in Y direction
    };
  }, [debouncedCamera, dimensions, mapSettings, isCameraReady]); // Recalculate when any of these change

  // Calculate the current visible region
  const visibleRegion = getVisibleRegion();

  // Effect: Log query parameters only when region changes (avoid spam)
  useEffect(() => {
    // Only log if we have a valid region and camera is ready
    if (visibleRegion && isCameraReady) {
      // Calculate how many tiles we expect to receive
      const expectedTiles = visibleRegion.width * visibleRegion.height;
      // Create a unique key for this query to detect changes
      const queryKey = `${visibleRegion.x},${visibleRegion.y},${visibleRegion.width},${visibleRegion.height}`;

      // Only update last query if the query parameters have changed
      if (queryKey !== lastQueryRef.current) {
        // Update last query to prevent duplicate logs
        lastQueryRef.current = queryKey;
      }
    }
  }, [visibleRegion, isCameraReady]); // Re-run when visible region or camera readiness changes

  // Query: Get only the tiles in the visible region from Convex
  // This is a reactive query that automatically updates when data changes
  const tiles = useQuery(
    api.map.getTilesByRegion, // The Convex function to call
    visibleRegion // Pass the visible region as parameters
      ? {
          x: visibleRegion.x, // Region starting X coordinate
          y: visibleRegion.y, // Region starting Y coordinate
          width: visibleRegion.width, // Region width in tiles
          height: visibleRegion.height, // Region height in tiles
        }
      : "skip" // Skip query if visible region hasn't been calculated yet
  );

  // Effect: Track tile count changes
  useEffect(() => {
    // Only update if we have tiles and the count has changed
    if (
      tiles &&
      tiles.length > 0 &&
      tiles.length !== lastTileCountRef.current
    ) {
      // Update last count to prevent duplicate logs
      lastTileCountRef.current = tiles.length;
    }
  }, [tiles]); // Re-run when tiles change

  // Return all queried data for use in components
  return {
    mapSettings: settings, // Map configuration (grid size, tile size)
    places, // Array of places (buildings, rooms)
    tiles, // Array of visible tiles
    visibleRegion, // Current visible tile region
  };
}
