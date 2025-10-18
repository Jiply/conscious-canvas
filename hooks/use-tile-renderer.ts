// Import React hook for side effects
import { useEffect } from "react";
// Import PixiJS type definitions for Graphics and Container
import type { Graphics, Container } from "pixi.js";
// Import tile rendering function (uses GPU-accelerated sprites)
import { renderTilesAsSprites } from "@/lib/tileRenderer";
// Import texture pre-generation function (creates reusable textures)
import { preGenerateAllTileTextures } from "@/lib/textureGenerator";
// Import type definitions for Tile and MapSettings
import type { Tile, MapSettings } from "@/lib/mapTypes";

// Define the required options for the useTileRenderer hook
interface UseTileRendererOptions {
  tilesLayer: Container | null; // Container for tile sprites (changed from Graphics for performance)
  skeletonLayer: Graphics | null; // Graphics layer for debugging outlines
  tiles: Tile[] | undefined; // Array of tiles to render
  mapSettings: MapSettings | undefined; // Map configuration (tile size, grid dimensions)
  isCameraReady: boolean; // Flag indicating camera is initialized
  renderer: any | null; // PixiJS WebGL renderer (needed for texture generation)
}

/**
 * Custom hook that renders map tiles using GPU-accelerated sprites
 * Implements high-performance rendering by:
 * 1. Pre-generating reusable textures for each tile type
 * 2. Using PixiJS Sprites instead of Graphics (100-300x faster!)
 * 3. Clearing skeleton layer when real tiles are ready
 */
export function useTileRenderer({
  tilesLayer,
  skeletonLayer,
  tiles,
  mapSettings,
  isCameraReady,
  renderer,
}: UseTileRendererOptions) {
  // Effect: Debug logging for tile data and readiness status
  useEffect(() => {
    // Only log if we have tiles
    if (tiles && tiles.length > 0) {
      // Check if all dependencies are ready for rendering
      const canRender =
        !!tilesLayer && !!skeletonLayer && !!mapSettings && isCameraReady;

      // Get unique list of tile types for debugging
      const tileTypes = [...new Set(tiles.map((t) => t.tileType))];
      console.log(
        `📊 [TILES] ${tiles.length} tiles ready | Types: ${tileTypes.join(", ")}`
      );

      // If we can't render yet, log what's missing
      if (!canRender) {
        console.warn("⏳ [TILES] Waiting to render:", {
          hasTilesLayer: !!tilesLayer, // Check if tiles layer exists
          hasSkeletonLayer: !!skeletonLayer, // Check if skeleton layer exists
          hasMapSettings: !!mapSettings, // Check if map settings loaded
          isCameraReady, // Check if camera is ready
        });
      }
    }
  }, [tiles, tilesLayer, skeletonLayer, mapSettings, isCameraReady, renderer]); // Re-run when any dependency changes

  // Effect: Pre-generate tile textures once when ready
  // This creates reusable GPU textures for each tile type to avoid regenerating them every frame
  useEffect(() => {
    // Don't pre-generate if dependencies aren't ready
    if (!renderer || !mapSettings || !isCameraReady) return;

    // Pre-generate all tile textures (grass, dirt, stone, water, etc.)
    // Parameters: renderer (WebGL), tile size in pixels, grid line width
    preGenerateAllTileTextures(renderer, mapSettings.tileSize, 3);
  }, [renderer, mapSettings, isCameraReady]); // Only run once when all dependencies are ready

  // Effect: Render tiles using Sprites (100-300x faster than Graphics!)
  // This is the main rendering effect that draws all visible tiles
  useEffect(() => {
    // Early return if any required dependency is missing
    if (!tilesLayer || !skeletonLayer) return;
    if (!tiles || tiles.length === 0) return;
    if (!mapSettings) return;
    if (!isCameraReady) return;
    if (!renderer) return;

    // Start performance timing
    const perfStart = performance.now();
    console.log(
      `\n🎨 ========== SPRITE RENDER TRIGGERED (t=${perfStart.toFixed(0)}ms) ==========`
    );
    console.log(`   📊 Rendering ${tiles.length} tiles with SPRITES 🚀`);

    // Get tile size from map settings
    const tileSize = mapSettings.tileSize;

    try {
      // IMMEDIATE RENDERING - No delays for best performance!
      const renderStart = performance.now();
      console.log("   → Rendering tiles as SPRITES (GPU-accelerated) 🚀");

      // Clear skeleton layer (the placeholder outlines)
      // Once we have real tiles, we don't need the skeleton anymore
      skeletonLayer.clear();

      // Use Sprite-based rendering (100-300x faster than Graphics!)
      // This function creates Sprite instances that reuse pre-generated textures
      renderTilesAsSprites(tilesLayer, renderer, tiles, tileSize);

      // Calculate and log total render time
      const totalTime = performance.now() - perfStart;

      console.log(
        `✅ Complete SPRITE pipeline finished (${totalTime.toFixed(2)}ms total) - ${tiles.length} tiles 🎯\n`
      );
    } catch (error) {
      // Log any errors that occur during rendering
      console.error("❌ Error rendering tiles:", error);
    }
  }, [tiles, mapSettings, isCameraReady, tilesLayer, skeletonLayer, renderer]); // Re-run when any of these change
}
