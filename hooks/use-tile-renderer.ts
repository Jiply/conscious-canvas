// Import React hook for side effects and refs
import { useEffect, useRef } from "react";
// Import PixiJS classes and types
import { Sprite } from "pixi.js";
import type { Graphics, Container } from "pixi.js";
// Import texture pre-generation function (creates reusable textures)
import {
  preGenerateAllTileTextures,
  getTileTexture,
} from "@/lib/textureGenerator";
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
  // Cache for rendered tile sprites - key is "x,y" coordinate
  const renderedSpritesCache = useRef<Map<string, any>>(new Map());
  // Effect: Pre-generate tile textures once when ready
  // This creates reusable GPU textures for each tile type to avoid regenerating them every frame
  useEffect(() => {
    // Don't pre-generate if dependencies aren't ready
    if (!renderer || !mapSettings || !isCameraReady) return;

    // Pre-generate all tile textures (grass, dirt, stone, water, etc.)
    // Parameters: renderer (WebGL), tile size in pixels, grid line width
    preGenerateAllTileTextures(renderer, mapSettings.tileSize, 3);
  }, [renderer, mapSettings, isCameraReady]); // Only run once when all dependencies are ready

  // Effect: Render tiles using SMART SPRITE CACHING
  // Only creates/removes sprites that changed, reuses existing ones
  useEffect(() => {
    // Early return if any required dependency is missing
    if (!tilesLayer || !skeletonLayer) return;
    if (!tiles || tiles.length === 0) return;
    if (!mapSettings) return;
    if (!isCameraReady) return;
    if (!renderer) return;

    // Get tile size from map settings
    const tileSize = mapSettings.tileSize;

    try {
      // Clear skeleton layer (the placeholder outlines)
      if (skeletonLayer) {
        skeletonLayer.clear();
      }

      // Build map of tiles we need to render
      const neededTiles = new Map<string, Tile>();
      for (const tile of tiles) {
        const key = `${tile.x},${tile.y}`;
        neededTiles.set(key, tile);
      }

      // Track what we need to do
      let spritesToCreate = 0;
      let spritesToRemove = 0;
      let spritesToReuse = 0;

      // Check existing sprites and remove ones we don't need
      const existingSprites = renderedSpritesCache.current;
      const spritesToDestroy: any[] = [];

      for (const [key, sprite] of existingSprites) {
        if (neededTiles.has(key)) {
          // Keep this sprite - we still need it
          spritesToReuse++;
        } else {
          // Remove this sprite - we don't need it anymore
          spritesToDestroy.push(sprite);
          spritesToRemove++;
        }
      }

      // Remove sprites we don't need
      for (const sprite of spritesToDestroy) {
        // Get coordinates before destroying the sprite (with null check)
        if (sprite && !sprite.destroyed) {
          const key = `${Math.round(sprite.x / tileSize)},${Math.round(sprite.y / tileSize)}`;
          tilesLayer.removeChild(sprite);
          sprite.destroy();
          existingSprites.delete(key);
        }
      }

      // Create sprites for tiles we need but don't have
      for (const [key, tile] of neededTiles) {
        if (!existingSprites.has(key)) {
          const texture = getTileTexture(
            renderer,
            tile.tileType,
            tileSize,
            tile.visualVariant || 0
          );

          const sprite = new Sprite(texture);
          sprite.x = tile.x * tileSize;
          sprite.y = tile.y * tileSize;

          tilesLayer.addChild(sprite);
          existingSprites.set(key, sprite);
          spritesToCreate++;
        }
      }
    } catch (error) {
      // Error rendering tiles
    }
  }, [tiles, mapSettings, isCameraReady, tilesLayer, skeletonLayer, renderer]); // Re-run when any of these change
}
