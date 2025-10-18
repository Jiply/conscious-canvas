/**
 * Tile Rendering Utilities
 *
 * Provides visual styling for different tile types using Pixi.js Graphics.
 * Designed to be easily replaceable with Sprite-based rendering later.
 */

import { Graphics } from "pixi.js";
import type { TileType } from "./mapTypes";

export interface TileRenderStyle {
  baseColor: number;
  borderColor: number;
  borderWidth: number;
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
    pattern: "grid",
    patternColor: 0xd5d1c6,
  },
  wall: {
    baseColor: 0x8b7355,
    borderColor: 0x6a5544,
    borderWidth: 2,
    pattern: "brick",
    patternColor: 0x755f4a,
    shadow: true,
  },
  door: {
    baseColor: 0xa0826d,
    borderColor: 0x8b7355,
    borderWidth: 2,
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

  // Draw base rectangle
  graphics.rect(x, y, tileSize, tileSize);
  graphics.fill({ color: baseColor });

  // Draw pattern overlay
  if (style.pattern && style.pattern !== "solid" && style.patternColor) {
    drawPattern(graphics, x, y, tileSize, style.pattern, style.patternColor);
  }

  // Draw border
  if (style.borderWidth > 0) {
    graphics.rect(x, y, tileSize, tileSize);
    graphics.stroke({
      width: style.borderWidth,
      color: style.borderColor,
      alpha: 0.6,
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
  color: number
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
      graphics.stroke({ width: 0.5, color, alpha: 0.3 });
      break;

    case "diagonal":
      // Draw diagonal stripes
      for (let i = -1; i <= 1; i++) {
        const offset = i * quarterSize;
        graphics.moveTo(x + offset, y + tileSize);
        graphics.lineTo(x + tileSize + offset, y);
      }
      graphics.stroke({ width: 1, color, alpha: 0.2 });
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
        graphics.fill({ color, alpha: 0.4 });
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

      graphics.stroke({ width: 1, color, alpha: 0.4 });
      break;
  }
}

/**
 * Batch render multiple tiles efficiently
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
    `🎨 renderTiles: Rendering ${tiles.length} tiles at size ${tileSize}px`
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

  console.log(`✅ renderTiles: Completed rendering`);
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
