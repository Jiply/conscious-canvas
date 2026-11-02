/**
 * Tile Rendering Utilities
 *
 * Provides visual styling for different tile types.
 * Supports both Graphics API (legacy) and Sprite-based rendering (performance).
 */

import type { TileType } from "@/lib/mapTypes";
import type { Graphics } from "pixi.js";

interface TileRenderStyle {
  shadow?: boolean;
  baseColor: number;
  borderColor: number;
  borderWidth: number;
  patternColor?: number;
  opacity?: number; // Alpha transparency (0-1)
  pattern?: "solid" | "grid" | "diagonal" | "dots" | "brick";
}

/**
 * Visual styles for each tile type
 */
const TILE_RENDER_STYLES: Record<TileType, TileRenderStyle> = {
  floor: {
    borderWidth: 1,
    pattern: "grid",
    baseColor: 0xe8e4d9,
    borderColor: 0xd0ccc0,
    patternColor: 0xd5d1c6,
    opacity: 0.95, // Higher opacity for buildings
  },
  wall: {
    shadow: true,
    borderWidth: 2,
    pattern: "brick",
    baseColor: 0x8b7355,
    borderColor: 0x6a5544,
    patternColor: 0x755f4a,
    opacity: 1.0, // Fully opaque for walls
  },
  door: {
    borderWidth: 2,
    pattern: "solid",
    baseColor: 0xa0826d,
    borderColor: 0x8b7355,
    opacity: 0.95, // Higher opacity for buildings
  },
  grass: {
    pattern: "dots",
    borderWidth: 0.5,
    baseColor: 0x7cb342,
    borderColor: 0x689f38,
    patternColor: 0x8bc34a,
  },
  water: {
    borderWidth: 1,
    pattern: "diagonal",
    baseColor: 0x42a5f5,
    borderColor: 0x2196f3,
    patternColor: 0x64b5f6,
  },
  path: {
    borderWidth: 1,
    pattern: "grid",
    baseColor: 0xbdbdbd,
    borderColor: 0x9e9e9e,
    patternColor: 0xa8a8a8,
  },
  void: {
    borderWidth: 0,
    pattern: "solid",
    baseColor: 0x212121,
    borderColor: 0x000000,
  },
  // Terrain variety
  tall_tree: {
    shadow: true,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0x2e7d32,
    borderColor: 0x1b5e20,
  },
  short_tree: {
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0x558b2f,
    borderColor: 0x33691e,
  },
  bush: {
    pattern: "dots",
    borderWidth: 0.5,
    baseColor: 0x689f38,
    borderColor: 0x558b2f,
    patternColor: 0x7cb342,
  },
  flower_bed: {
    borderWidth: 1,
    pattern: "dots",
    baseColor: 0xf48fb1,
    borderColor: 0xf06292,
    patternColor: 0xf8bbd0,
  },
  concrete: {
    borderWidth: 1,
    pattern: "grid",
    baseColor: 0x9e9e9e,
    borderColor: 0x757575,
    patternColor: 0xbdbdbd,
  },
  brick_path: {
    borderWidth: 1,
    pattern: "brick",
    baseColor: 0xa1887f,
    borderColor: 0x8d6e63,
    patternColor: 0xbcaaa4,
  },
  // Building interiors
  cafe_stall: {
    opacity: 0.95,
    borderWidth: 2,
    pattern: "solid",
    baseColor: 0xd7ccc8,
    borderColor: 0xbcaaa4,
  },
  study_desk: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0xbcaaa4,
    borderColor: 0xa1887f,
  },
  bookshelf: {
    shadow: true,
    opacity: 1.0,
    borderWidth: 2,
    pattern: "solid",
    baseColor: 0x8d6e63,
    borderColor: 0x6d4c41,
  },
  lounge_chair: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0xb39ddb,
    borderColor: 0x9575cd,
  },
  laundry_machine: {
    opacity: 1.0,
    borderWidth: 2,
    pattern: "solid",
    baseColor: 0x90caf9,
    borderColor: 0x64b5f6,
  },
  lecture_seat: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0x9fa8da,
    borderColor: 0x7986cb,
  },
  library_desk: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0xa1887f,
    borderColor: 0x8d6e63,
  },
  dorm_bed: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0xce93d8,
    borderColor: 0xba68c8,
  },
  kitchen_counter: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: "solid",
    baseColor: 0xffe082,
    borderColor: 0xffd54f,
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
  const alpha = style.opacity ?? 1.0;
  const colorVariation = variant * 0x0a0a0a;
  const baseColor = Math.max(0, style.baseColor - colorVariation);

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
 * Get a color string for UI display
 */
export function getTileColorString(tileType: TileType): string {
  const style = TILE_RENDER_STYLES[tileType];
  return `#${style.baseColor.toString(16).padStart(6, "0")}`;
}
