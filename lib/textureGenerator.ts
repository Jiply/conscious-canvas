/**
 * Texture Generation Utilities
 *
 * Generates reusable Pixi.js textures from Graphics rendering code.
 * This allows us to keep the exact tile styles (grass, walls, etc.)
 * while benefiting from Sprite performance (100-300x faster than Graphics).
 */

import type { TileType } from "@/lib/mapTypes";
import { renderTile } from "@/lib/tileRenderer";
import { Texture, Graphics, Renderer, RenderTexture } from "pixi.js";

/**
 * Cache of generated textures
 * Key format: "tileType_variant" (e.g., "grass_0", "wall_2")
 */
const textureCache = new Map<string, Texture>();

/**
 * Generate a texture for a specific tile type and variant
 * Uses the existing renderTile function to maintain visual consistency
 */
export function generateTileTexture(
  renderer: Renderer,
  tileType: TileType,
  tileSize: number,
  variant: number = 0
): Texture {
  const cacheKey = `${tileType}_${variant}`;

  // Return cached texture if available
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Create a Graphics object to render the tile
  const graphics = new Graphics();
  renderTile(graphics, 0, 0, tileSize, tileType, variant);

  // Render Graphics to a RenderTexture
  const renderTexture = RenderTexture.create({
    width: tileSize,
    height: tileSize,
  });

  renderer.render({
    container: graphics,
    target: renderTexture,
  });

  // Cache and return the texture
  textureCache.set(cacheKey, renderTexture);
  graphics.destroy();

  return renderTexture;
}

/**
 * Pre-generate all tile textures for better initial load performance
 * Call this once when the map initializes
 */
export function preGenerateAllTileTextures(
  renderer: Renderer,
  tileSize: number,
  maxVariants: number = 3
): void {
  const tileTypes: TileType[] = [
    "floor",
    "wall",
    "door",
    "grass",
    "water",
    "path",
    "void",
  ];

  for (const tileType of tileTypes) {
    for (let variant = 0; variant < maxVariants; variant++) {
      generateTileTexture(renderer, tileType, tileSize, variant);
    }
  }
}

/**
 * Get a texture for a tile (generates if not cached)
 */
export function getTileTexture(
  renderer: Renderer,
  tileType: TileType,
  tileSize: number,
  variant: number = 0
): Texture {
  return generateTileTexture(renderer, tileType, tileSize, variant);
}

/**
 * Clear all cached textures (useful for cleanup or tile size changes)
 */
export function clearTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.destroy();
  }
  textureCache.clear();
}

/**
 * Get cache statistics
 */
export function getTextureCacheStats(): {
  count: number;
  types: string[];
} {
  return {
    count: textureCache.size,
    types: Array.from(textureCache.keys()),
  };
}
