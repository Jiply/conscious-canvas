import type { Graphics } from 'pixi.js';
import type { TileType } from '@/lib/map-types';

interface TileRenderStyle {
  shadow?: boolean;
  baseColor: number;
  borderColor: number;
  borderWidth: number;
  patternColor?: number;
  opacity?: number;
  pattern?: 'solid' | 'grid' | 'diagonal' | 'dots' | 'brick';
}

const TILE_RENDER_STYLES: Record<TileType, TileRenderStyle> = {
  void: { pattern: 'solid', baseColor: 0x212121, borderColor: 0x000000, borderWidth: 0 },
  short_tree: { pattern: 'solid', baseColor: 0x558b2f, borderColor: 0x33691e, borderWidth: 1 },
  door: { opacity: 0.95, pattern: 'solid', baseColor: 0xa0826d, borderColor: 0x8b7355, borderWidth: 2 },
  tall_tree: { shadow: true, borderWidth: 1, pattern: 'solid', baseColor: 0x2e7d32, borderColor: 0x1b5e20 },
  dorm_bed: { opacity: 0.95, pattern: 'solid', baseColor: 0xce93d8, borderColor: 0xba68c8, borderWidth: 1 },
  cafe_stall: { opacity: 0.95, pattern: 'solid', baseColor: 0xd7ccc8, borderColor: 0xbcaaa4, borderWidth: 2 },
  study_desk: { opacity: 0.95, pattern: 'solid', baseColor: 0xbcaaa4, borderColor: 0xa1887f, borderWidth: 1 },
  path: { pattern: 'grid', baseColor: 0xbdbdbd, borderColor: 0x9e9e9e, borderWidth: 1, patternColor: 0xa8a8a8 },
  lounge_chair: { opacity: 0.95, pattern: 'solid', baseColor: 0xb39ddb, borderColor: 0x9575cd, borderWidth: 1 },
  lecture_seat: { opacity: 0.95, pattern: 'solid', baseColor: 0x9fa8da, borderColor: 0x7986cb, borderWidth: 1 },
  library_desk: { opacity: 0.95, pattern: 'solid', baseColor: 0xa1887f, borderColor: 0x8d6e63, borderWidth: 1 },
  bush: { pattern: 'dots', baseColor: 0x689f38, borderColor: 0x558b2f, borderWidth: 0.5, patternColor: 0x7cb342 },
  laundry_machine: { opacity: 1.0, pattern: 'solid', baseColor: 0x90caf9, borderColor: 0x64b5f6, borderWidth: 2 },
  grass: { pattern: 'dots', baseColor: 0x7cb342, borderColor: 0x689f38, borderWidth: 0.5, patternColor: 0x8bc34a },
  kitchen_counter: { opacity: 0.95, pattern: 'solid', baseColor: 0xffe082, borderColor: 0xffd54f, borderWidth: 1 },
  concrete: { pattern: 'grid', baseColor: 0x9e9e9e, borderColor: 0x757575, borderWidth: 1, patternColor: 0xbdbdbd },
  water: { pattern: 'diagonal', baseColor: 0x42a5f5, borderColor: 0x2196f3, borderWidth: 1, patternColor: 0x64b5f6 },
  flower_bed: { pattern: 'dots', baseColor: 0xf48fb1, borderColor: 0xf06292, borderWidth: 1, patternColor: 0xf8bbd0 },
  brick_path: { pattern: 'brick', baseColor: 0xa1887f, borderColor: 0x8d6e63, borderWidth: 1, patternColor: 0xbcaaa4 },
  bookshelf: { shadow: true, opacity: 1.0, borderWidth: 2, pattern: 'solid', baseColor: 0x8d6e63, borderColor: 0x6d4c41 },
  floor: {
    opacity: 0.95,
    borderWidth: 1,
    pattern: 'grid',
    baseColor: 0xe8e4d9,
    borderColor: 0xd0ccc0,
    patternColor: 0xd5d1c6,
  },
  wall: {
    shadow: true,
    opacity: 1.0,
    borderWidth: 2,
    pattern: 'brick',
    baseColor: 0x8b7355,
    borderColor: 0x6a5544,
    patternColor: 0x755f4a,
  },
};

export function renderTile(
  graphics: Graphics,
  x: number,
  y: number,
  tileSize: number,
  tileType: TileType,
  variant: number = 0
): void {
  const style = TILE_RENDER_STYLES[tileType];
  const alpha = style.opacity ?? 1.0;
  const colorVariation = variant * 0x0a0a0a;
  const baseColor = Math.max(0, style.baseColor - colorVariation);
  graphics.rect(x, y, tileSize, tileSize);
  graphics.fill({ alpha, color: baseColor });

  if (style.pattern && style.pattern !== 'solid' && style.patternColor)
    drawPattern(graphics, x, y, tileSize, style.pattern, style.patternColor, alpha);

  if (style.borderWidth > 0) {
    graphics.rect(x, y, tileSize, tileSize);
    graphics.stroke({ alpha: Math.min(0.6, alpha), color: style.borderColor, width: style.borderWidth });
  }
}

function drawPattern(
  graphics: Graphics,
  x: number,
  y: number,
  tileSize: number,
  pattern: 'grid' | 'diagonal' | 'dots' | 'brick',
  color: number,
  baseAlpha: number = 1.0
): void {
  const halfSize = tileSize / 2;
  const quarterSize = tileSize / 4;

  switch (pattern) {
    case 'grid':
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + halfSize, y + tileSize);
      graphics.moveTo(x, y + halfSize);
      graphics.lineTo(x + tileSize, y + halfSize);
      graphics.stroke({ alpha: 0.3 * baseAlpha, color, width: 0.5 });
      break;

    case 'diagonal':
      for (let i = -1; i <= 1; i++) {
        const offset = i * quarterSize;
        graphics.moveTo(x + offset, y + tileSize);
        graphics.lineTo(x + tileSize + offset, y);
      }

      graphics.stroke({ alpha: 0.2 * baseAlpha, color, width: 1 });
      break;

    case 'dots':
      const dotPositions = [
        [x + quarterSize, y + quarterSize],
        [x + tileSize - quarterSize, y + quarterSize],
        [x + halfSize, y + halfSize],
        [x + quarterSize, y + tileSize - quarterSize],
        [x + tileSize - quarterSize, y + tileSize - quarterSize],
      ];

      for (const [dotX, dotY] of dotPositions) {
        graphics.circle(dotX, dotY, 1.5);
        graphics.fill({ alpha: 0.4 * baseAlpha, color });
      }

      break;

    case 'brick':
      const brickHeight = tileSize / 3;
      graphics.moveTo(x, y + brickHeight);
      graphics.lineTo(x + tileSize, y + brickHeight);
      graphics.moveTo(x, y + 2 * brickHeight);
      graphics.lineTo(x + tileSize, y + 2 * brickHeight);
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + halfSize, y + brickHeight);
      graphics.moveTo(x + quarterSize, y + brickHeight);
      graphics.lineTo(x + quarterSize, y + 2 * brickHeight);
      graphics.moveTo(x + tileSize - quarterSize, y + brickHeight);
      graphics.lineTo(x + tileSize - quarterSize, y + 2 * brickHeight);
      graphics.moveTo(x + halfSize, y + 2 * brickHeight);
      graphics.lineTo(x + halfSize, y + tileSize);
      graphics.stroke({ alpha: 0.4 * baseAlpha, color, width: 1 });
      break;
  }
}

export function getTileColorString(tileType: TileType): string {
  const style = TILE_RENDER_STYLES[tileType];
  return `#${style.baseColor.toString(16).padStart(6, '0')}`;
}
