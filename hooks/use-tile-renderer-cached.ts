/**
 * Cached Tile Renderer - Pre-renders ALL tiles and uses viewport culling
 *
 * This renderer implements a completely different strategy:
 * 1. Pre-renders ALL 30,000 tiles as Pixi Sprites once at startup
 * 2. Keeps all sprites in memory (never destroys them)
 * 3. Uses viewport culling to show/hide sprites based on camera position
 * 4. Much faster panning since sprites are already rendered
 */

import { useEffect, useRef } from "react";
import { Sprite } from "pixi.js";
import type { Container } from "pixi.js";
import {
  preGenerateAllTileTextures,
  getTileTexture,
} from "@/lib/textureGenerator";
import type { Tile, MapSettings } from "@/lib/mapTypes";

interface UseTileRendererCachedOptions {
  tilesLayer: Container | null;
  tiles: Map<string, Tile>; // All tiles from cache
  mapSettings: MapSettings | undefined;
  isLoading: boolean; // Is tile cache still loading?
  renderer: any | null;
  camera: { x: number; y: number; scale: number }; // For viewport culling
  dimensions: { width: number; height: number }; // Viewport size
}

/**
 * Custom hook that pre-renders ALL tiles and uses viewport culling
 * This is much faster than the old approach which destroyed/recreated sprites
 */
export function useTileRendererCached({
  tilesLayer,
  tiles,
  mapSettings,
  isLoading,
  renderer,
  camera,
  dimensions,
}: UseTileRendererCachedOptions) {
  // Track which tiles have been rendered
  const renderedSprites = useRef<Map<string, Sprite>>(new Map());
  const hasPreRendered = useRef(false);

  // Effect: Pre-generate tile textures once when ready
  useEffect(() => {
    if (!renderer || !mapSettings) return;

    preGenerateAllTileTextures(renderer, mapSettings.tileSize, 3);
  }, [renderer, mapSettings]);

  // Effect: Pre-render ALL tiles once when cache is loaded
  useEffect(() => {
    if (!tilesLayer || !mapSettings || isLoading || !renderer) return;
    if (hasPreRendered.current) return;
    if (tiles.size === 0) return;

    const tileSize = mapSettings.tileSize;
    let spritesCreated = 0;

    try {
      // Pre-render ALL tiles at once
      for (const [key, tile] of tiles.entries()) {
        // Skip if already rendered
        if (renderedSprites.current.has(key)) continue;

        // Get texture for this tile type
        const texture = getTileTexture(
          renderer,
          tile.tileType,
          tileSize,
          tile.visualVariant || 0
        );

        // Create sprite
        const sprite = new Sprite(texture);
        sprite.x = tile.x * tileSize;
        sprite.y = tile.y * tileSize;

        // Initially visible (we'll cull later)
        sprite.visible = true;

        // Add to layer and cache
        tilesLayer.addChild(sprite);
        renderedSprites.current.set(key, sprite);
        spritesCreated++;
      }

      hasPreRendered.current = true;
    } catch (error) {
      // Error pre-rendering tiles
    }
  }, [tilesLayer, tiles, mapSettings, isLoading, renderer]);

  // Effect: Viewport culling - show/hide sprites based on camera position
  // This runs on every camera movement but is VERY fast (just setting visibility flags)
  useEffect(() => {
    if (!hasPreRendered.current || !mapSettings) return;
    if (renderedSprites.current.size === 0) return;

    const tileSize = mapSettings.tileSize;
    const padding = 5; // Extra tiles to render outside viewport

    // Calculate visible tile region
    const viewportLeft = -camera.x / camera.scale;
    const viewportTop = -camera.y / camera.scale;
    const viewportRight = (dimensions.width - camera.x) / camera.scale;
    const viewportBottom = (dimensions.height - camera.y) / camera.scale;

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

    let visibleCount = 0;
    let hiddenCount = 0;

    // Update visibility for all sprites (VERY fast, just boolean flags)
    for (const [key, sprite] of renderedSprites.current.entries()) {
      if (sprite.destroyed) continue;

      // Parse tile coordinates from key
      const [xStr, yStr] = key.split(",");
      const tileX = parseInt(xStr);
      const tileY = parseInt(yStr);

      // Check if tile is in visible region
      const isVisible =
        tileX >= minX && tileX < maxX && tileY >= minY && tileY < maxY;

      sprite.visible = isVisible;

      if (isVisible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    }
  }, [camera, dimensions, mapSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const sprite of renderedSprites.current.values()) {
        if (!sprite.destroyed) {
          sprite.destroy();
        }
      }
      renderedSprites.current.clear();
      hasPreRendered.current = false;
    };
  }, []);
}
