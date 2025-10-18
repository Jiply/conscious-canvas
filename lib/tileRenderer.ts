/**
 * Tile Rendering Utilities
 *
 * Provides visual styling for different tile types.
 * Supports both Graphics API (legacy) and Sprite-based rendering (performance).
 */

import { Graphics, Sprite, Container, Renderer } from "pixi.js";
import type { TileType } from "./mapTypes";
import { getTileTexture } from "./textureGenerator";

export interface TileRenderStyle {
  baseColor: number;
  borderColor: number;
  borderWidth: number;
  opacity?: number; // Alpha transparency (0-1)
  pattern?: "solid" | "grid" | "diagonal" | "dots" | "brick";
  patternColor?: number;
  shadow?: boolean;
}

/**
 * Visual styles for each tile type
 */
export const TILE_RENDER_STYLES: Record<TileType, TileRenderStyle> = {
  floor: {
    baseColor: 0xe8e4d9,
    borderColor: 0xd0ccc0,
    borderWidth: 1,
    opacity: 0.95, // Higher opacity for buildings
    pattern: "grid",
    patternColor: 0xd5d1c6,
  },
  wall: {
    baseColor: 0x8b7355,
    borderColor: 0x6a5544,
    borderWidth: 2,
    opacity: 1.0, // Fully opaque for walls
    pattern: "brick",
    patternColor: 0x755f4a,
    shadow: true,
  },
  door: {
    baseColor: 0xa0826d,
    borderColor: 0x8b7355,
    borderWidth: 2,
    opacity: 0.95, // Higher opacity for buildings
    pattern: "solid",
  },
  grass: {
    baseColor: 0x7cb342,
    borderColor: 0x689f38,
    borderWidth: 0.5,
    pattern: "dots",
    patternColor: 0x8bc34a,
  },
  water: {
    baseColor: 0x42a5f5,
    borderColor: 0x2196f3,
    borderWidth: 1,
    pattern: "diagonal",
    patternColor: 0x64b5f6,
  },
  path: {
    baseColor: 0xbdbdbd,
    borderColor: 0x9e9e9e,
    borderWidth: 1,
    pattern: "grid",
    patternColor: 0xa8a8a8,
  },
  void: {
    baseColor: 0x212121,
    borderColor: 0x000000,
    borderWidth: 0,
    pattern: "solid",
  },
};

/**
 * Render a single tile with its visual style
 */
export function renderTile(
  graphics: Graphics,
  x: number,
  y: number,
  tileSize: number,
  tileType: TileType,
  variant: number = 0
): void {
  const style = TILE_RENDER_STYLES[tileType];

  // Apply variant-based color variation
  const colorVariation = variant * 0x0a0a0a;
  const baseColor = Math.max(0, style.baseColor - colorVariation);
  const alpha = style.opacity ?? 1.0;

  // Draw base rectangle
  graphics.rect(x, y, tileSize, tileSize);
  graphics.fill({ color: baseColor, alpha });

  // Draw pattern overlay
  if (style.pattern && style.pattern !== "solid" && style.patternColor) {
    drawPattern(
      graphics,
      x,
      y,
      tileSize,
      style.pattern,
      style.patternColor,
      alpha
    );
  }

  // Draw border
  if (style.borderWidth > 0) {
    graphics.rect(x, y, tileSize, tileSize);
    graphics.stroke({
      width: style.borderWidth,
      color: style.borderColor,
      alpha: Math.min(0.6, alpha),
    });
  }
}

/**
 * Draw pattern overlay on a tile
 */
function drawPattern(
  graphics: Graphics,
  x: number,
  y: number,
  tileSize: number,
  pattern: "grid" | "diagonal" | "dots" | "brick",
  color: number,
  baseAlpha: number = 1.0
): void {
  const halfSize = tileSize / 2;
  const quarterSize = tileSize / 4;

  switch (pattern) {
    case "grid":
      // Draw grid lines
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + halfSize, y + tileSize);
      graphics.moveTo(x, y + halfSize);
      graphics.lineTo(x + tileSize, y + halfSize);
      graphics.stroke({ width: 0.5, color, alpha: 0.3 * baseAlpha });
      break;

    case "diagonal":
      // Draw diagonal stripes
      for (let i = -1; i <= 1; i++) {
        const offset = i * quarterSize;
        graphics.moveTo(x + offset, y + tileSize);
        graphics.lineTo(x + tileSize + offset, y);
      }
      graphics.stroke({ width: 1, color, alpha: 0.2 * baseAlpha });
      break;

    case "dots":
      // Draw dots at corners and center
      const dotPositions = [
        [x + quarterSize, y + quarterSize],
        [x + tileSize - quarterSize, y + quarterSize],
        [x + halfSize, y + halfSize],
        [x + quarterSize, y + tileSize - quarterSize],
        [x + tileSize - quarterSize, y + tileSize - quarterSize],
      ];

      for (const [dotX, dotY] of dotPositions) {
        graphics.circle(dotX, dotY, 1.5);
        graphics.fill({ color, alpha: 0.4 * baseAlpha });
      }
      break;

    case "brick":
      // Draw brick pattern
      const brickHeight = tileSize / 3;

      // Horizontal lines
      graphics.moveTo(x, y + brickHeight);
      graphics.lineTo(x + tileSize, y + brickHeight);
      graphics.moveTo(x, y + 2 * brickHeight);
      graphics.lineTo(x + tileSize, y + 2 * brickHeight);

      // Vertical lines (staggered)
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + halfSize, y + brickHeight);
      graphics.moveTo(x + quarterSize, y + brickHeight);
      graphics.lineTo(x + quarterSize, y + 2 * brickHeight);
      graphics.moveTo(x + tileSize - quarterSize, y + brickHeight);
      graphics.lineTo(x + tileSize - quarterSize, y + 2 * brickHeight);
      graphics.moveTo(x + halfSize, y + 2 * brickHeight);
      graphics.lineTo(x + halfSize, y + tileSize);

      graphics.stroke({ width: 1, color, alpha: 0.4 * baseAlpha });
      break;
  }
}

/**
 * Batch render multiple tiles efficiently using Graphics API (legacy)
 * Note: This is kept for reference but should be replaced with renderTilesAsSprites
 */
export function renderTiles(
  graphics: Graphics,
  tiles: Array<{
    x: number;
    y: number;
    tileType: TileType;
    visualVariant?: number;
  }>,
  tileSize: number
): void {
  graphics.clear();
  console.log(
    `🎨 renderTiles (Graphics): Rendering ${tiles.length} tiles at size ${tileSize}px`
  );

  // Sample first few tiles for debugging
  if (tiles.length > 0) {
    console.log("📊 First tile:", tiles[0]);
  }

  for (const tile of tiles) {
    const pixelX = tile.x * tileSize;
    const pixelY = tile.y * tileSize;
    renderTile(
      graphics,
      pixelX,
      pixelY,
      tileSize,
      tile.tileType,
      tile.visualVariant || 0
    );
  }

  console.log(`✅ renderTiles (Graphics): Completed rendering`);
}

/**
 * Get a human-readable description of a tile type
 */
export function getTileDescription(tileType: TileType): string {
  const descriptions: Record<TileType, string> = {
    floor: "Indoor floor surface",
    wall: "Solid wall or barrier",
    door: "Entrance or exit",
    grass: "Grass lawn or field",
    water: "Water feature (non-walkable)",
    path: "Paved walkway",
    void: "Empty space or boundary",
  };
  return descriptions[tileType];
}

/**
 * Get a color string for UI display
 */
export function getTileColorString(tileType: TileType): string {
  const style = TILE_RENDER_STYLES[tileType];
  return `#${style.baseColor.toString(16).padStart(6, "0")}`;
}

/**
 * Render tiles using Sprites with SMART REUSE (incremental updates)
 * Only creates/updates/removes sprites that changed - much faster for panning!
 */
export function renderTilesAsSprites(
  container: Container,
  renderer: Renderer,
  tiles: Array<{
    x: number;
    y: number;
    tileType: TileType;
    visualVariant?: number;
  }>,
  tileSize: number
): void {
  const startTime = performance.now();

  console.log(
    `🎨 renderTilesAsSprites: Rendering ${tiles.length} tiles at size ${tileSize}px`
  );

  // Build a map of new tiles by coordinate key
  const newTileMap = new Map<string, (typeof tiles)[0]>();
  for (const tile of tiles) {
    const key = `${tile.x},${tile.y}`;
    newTileMap.set(key, tile);
  }

  // Track existing sprites by coordinate key
  const existingSpriteMap = new Map<string, Sprite>();
  const childrenToRemove: Sprite[] = [];

  // Check existing sprites
  for (const child of container.children) {
    if (child instanceof Sprite) {
      const tileX = Math.round(child.x / tileSize);
      const tileY = Math.round(child.y / tileSize);
      const key = `${tileX},${tileY}`;

      if (newTileMap.has(key)) {
        // Keep this sprite, mark it as existing
        existingSpriteMap.set(key, child);
      } else {
        // This sprite is no longer needed
        childrenToRemove.push(child);
      }
    }
  }

  // Remove sprites that are no longer visible
  let removed = 0;
  for (const child of childrenToRemove) {
    container.removeChild(child);
    child.destroy();
    removed++;
  }

  // Add new sprites for tiles that don't exist yet
  let created = 0;
  let reused = 0;
  for (const [key, tile] of newTileMap) {
    if (existingSpriteMap.has(key)) {
      // Sprite already exists, reuse it
      reused++;
    } else {
      // Create new sprite
      const texture = getTileTexture(
        renderer,
        tile.tileType,
        tileSize,
        tile.visualVariant || 0
      );

      const sprite = new Sprite(texture);
      sprite.x = tile.x * tileSize;
      sprite.y = tile.y * tileSize;

      container.addChild(sprite);
      created++;
    }
  }

  const duration = performance.now() - startTime;
  console.log(
    `✅ renderTilesAsSprites: Completed in ${duration.toFixed(2)}ms | ♻️ Reused: ${reused} | ➕ Created: ${created} | ➖ Removed: ${removed}`
  );
}
