/**
 * Map Utility Functions
 *
 * Helper functions for coordinate conversion, boundary checking,
 * and tile manipulation for the campus map system.
 */
import { DEFAULT_MAP_SETTINGS } from "@/lib/mapTypes";
import type { Rect, Point, TileType } from "@/lib/mapTypes";

// COORDINATE CONVERSION

/**
 * Convert 2D tile coordinates to 1D array index
 * @param x - X coordinate (0 to gridWidth-1)
 * @param y - Y coordinate (0 to gridHeight-1)
 * @param gridWidth - Width of the grid
 * @returns 1D index
 */
export function coordsToIndex(x: number, y: number, gridWidth: number) {
  return y * gridWidth + x;
}

/**
 * Convert 1D array index to 2D tile coordinates
 * @param index - 1D array index
 * @param gridWidth - Width of the grid
 * @returns {x, y} coordinates
 */
export function indexToCoords(index: number, gridWidth: number) {
  return {
    x: index % gridWidth,
    y: Math.floor(index / gridWidth),
  } satisfies Point;
}

/**
 * Convert pixel coordinates to tile coordinates
 * @param px - Pixel X position
 * @param py - Pixel Y position
 * @param tileSize - Size of each tile in pixels (default: 32)
 * @returns {x, y} tile coordinates
 */
export function pixelToTile(
  px: number,
  py: number,
  tileSize: number = DEFAULT_MAP_SETTINGS.tileSize
) {
  return {
    x: Math.floor(px / tileSize),
    y: Math.floor(py / tileSize),
  } satisfies Point;
}

/**
 * Convert tile coordinates to pixel coordinates (top-left corner)
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @param tileSize - Size of each tile in pixels (default: 32)
 * @returns {x, y} pixel coordinates
 */
export function tileToPixel(
  x: number,
  y: number,
  tileSize: number = DEFAULT_MAP_SETTINGS.tileSize
) {
  return {
    x: x * tileSize,
    y: y * tileSize,
  } satisfies Point;
}

/**
 * Convert tile coordinates to center pixel coordinates
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @param tileSize - Size of each tile in pixels (default: 32)
 * @returns {x, y} center pixel coordinates
 */
export function tileToCenterPixel(
  x: number,
  y: number,
  tileSize: number = DEFAULT_MAP_SETTINGS.tileSize
) {
  return {
    x: x * tileSize + tileSize / 2,
    y: y * tileSize + tileSize / 2,
  } satisfies Point;
}

// BOUNDARY CHECKING

/**
 * Check if tile coordinates are within grid bounds
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param gridWidth - Grid width (default: 80)
 * @param gridHeight - Grid height (default: 50)
 * @returns true if within bounds
 */
export function isWithinBounds(
  x: number,
  y: number,
  gridWidth: number = DEFAULT_MAP_SETTINGS.gridWidth,
  gridHeight: number = DEFAULT_MAP_SETTINGS.gridHeight
) {
  return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

/**
 * Check if a point is within a rectangular region
 * @param point - Point to check
 * @param rect - Rectangle bounds
 * @returns true if point is inside rectangle
 */
export function isPointInRect(point: Point, rect: Rect) {
  return (
    point.y < rect.y + rect.height &&
    point.x < rect.x + rect.width &&
    point.x >= rect.x &&
    point.y >= rect.y
  );
}

/**
 * Check if two rectangles intersect
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns true if rectangles overlap
 */
export function rectsIntersect(rect1: Rect, rect2: Rect) {
  return (
    rect1.y + rect1.height > rect2.y &&
    rect1.y < rect2.y + rect2.height &&
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x
  );
}

// NEIGHBOR & ADJACENT TILES

/**
 * Get coordinates of adjacent tiles (4-directional)
 * @param x - Center tile X
 * @param y - Center tile Y
 * @param gridWidth - Grid width
 * @param gridHeight - Grid height
 * @returns Array of adjacent tile coordinates
 */
export function getAdjacentTiles(
  x: number,
  y: number,
  gridWidth: number = DEFAULT_MAP_SETTINGS.gridWidth,
  gridHeight: number = DEFAULT_MAP_SETTINGS.gridHeight
) {
  const adjacent: Point[] = [];

  const directions = [
    { x: 0, y: -1 }, // North
    { x: 1, y: 0 }, // East
    { x: 0, y: 1 }, // South
    { x: -1, y: 0 }, // West
  ];

  for (const dir of directions) {
    const newX = x + dir.x;
    const newY = y + dir.y;

    if (isWithinBounds(newX, newY, gridWidth, gridHeight)) {
      adjacent.push({ x: newX, y: newY });
    }
  }

  return adjacent satisfies Point[];
}

/**
 * Get coordinates of adjacent tiles (8-directional, including diagonals)
 * @param x - Center tile X
 * @param y - Center tile Y
 * @param gridWidth - Grid width
 * @param gridHeight - Grid height
 * @returns Array of adjacent tile coordinates
 */
export function getAdjacentTiles8(
  x: number,
  y: number,
  gridWidth: number = DEFAULT_MAP_SETTINGS.gridWidth,
  gridHeight: number = DEFAULT_MAP_SETTINGS.gridHeight
) {
  const adjacent: Point[] = [];

  const directions = [
    { x: 0, y: -1 }, // North
    { x: 1, y: -1 }, // Northeast
    { x: 1, y: 0 }, // East
    { x: 1, y: 1 }, // Southeast
    { x: 0, y: 1 }, // South
    { x: -1, y: 1 }, // Southwest
    { x: -1, y: 0 }, // West
    { x: -1, y: -1 }, // Northwest
  ];

  for (const dir of directions) {
    const newX = x + dir.x;
    const newY = y + dir.y;

    if (isWithinBounds(newX, newY, gridWidth, gridHeight)) {
      adjacent.push({ x: newX, y: newY });
    }
  }

  return adjacent satisfies Point[];
}

// DISTANCE & PATHFINDING UTILITIES

/**
 * Calculate Manhattan distance between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Manhattan distance
 */
export function manhattanDistance(p1: Point, p2: Point) {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

/**
 * Calculate Euclidean distance between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance
 */
export function euclideanDistance(p1: Point, p2: Point) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Chebyshev distance (diagonal distance) between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Chebyshev distance
 */
export function chebyshevDistance(p1: Point, p2: Point) {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
}

// TILE KEY GENERATION

/**
 * Generate a unique string key for a tile coordinate
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns String key "x,y"
 */
export function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

/**
 * Parse a tile key back into coordinates
 * @param key - Tile key "x,y"
 * @returns {x, y} coordinates
 */
export function parseTileKey(key: string) {
  const [x, y] = key.split(",").map(Number);
  return { x, y } satisfies Point;
}

// ========================================
// REGION UTILITIES
// ========================================

/**
 * Get all tile coordinates within a rectangular region
 * @param region - Rectangle defining the region
 * @returns Array of tile coordinates
 */
export function getTilesInRegion(region: Rect) {
  const tiles: Point[] = [];

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      tiles.push({ x, y } satisfies Point);
    }
  }
  return tiles satisfies Point[];
}

/**
 * Get perimeter tiles of a rectangle (for walls)
 * @param rect - Rectangle bounds
 * @param includeCorners - Include corner tiles (default: true)
 * @returns Array of perimeter tile coordinates
 */
export function getPerimeterTiles(rect: Rect, includeCorners: boolean = true) {
  const perimeter: Point[] = [];

  // Top and bottom edges
  for (let x = rect.x; x < rect.x + rect.width; x++) {
    perimeter.push({ x, y: rect.y }); // Top
    perimeter.push({ x, y: rect.y + rect.height - 1 }); // Bottom
  }

  // Left and right edges (excluding corners if requested)
  const startY = includeCorners ? rect.y : rect.y + 1;
  const endY = includeCorners ? rect.y + rect.height : rect.y + rect.height - 1;

  for (let y = startY; y < endY; y++) {
    perimeter.push({ x: rect.x, y }); // Left
    perimeter.push({ x: rect.x + rect.width - 1, y }); // Right
  }

  return perimeter satisfies Point[];
}

/**
 * Get interior tiles of a rectangle (excluding perimeter)
 * @param rect - Rectangle bounds
 * @returns Array of interior tile coordinates
 */
export function getInteriorTiles(rect: Rect) {
  const interior: Point[] = [];

  for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
    for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
      interior.push({ x, y } satisfies Point);
    }
  }

  return interior satisfies Point[];
}

// TILE TYPE UTILITIES

/**
 * Check if a tile type is walkable
 * @param tileType - Tile type
 * @returns true if walkable
 */
export function isWalkableTileType(tileType: TileType) {
  const walkableTypes: TileType[] = ["floor", "door", "grass", "path"];
  return walkableTypes.includes(tileType);
}

/**
 * Get default walkability for a tile type
 * @param tileType - Tile type
 * @returns boolean walkability
 */
export function getDefaultWalkability(tileType: TileType) {
  return isWalkableTileType(tileType);
}

// RANDOM UTILITIES

/**
 * Seeded random number generator (simple LCG)
 * @param seed - Seed value
 * @returns Random number between 0 and 1
 */
export function seededRandom(seed: number) {
  let currentSeed = seed;

  return function () {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  } satisfies () => number;
}

/**
 * Get random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @param rng - Random number generator (default: Math.random)
 * @returns Random integer
 */
export function randomInt(
  min: number,
  max: number,
  rng: () => number = Math.random
) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Get random element from array
 * @param array - Array to select from
 * @param rng - Random number generator (default: Math.random)
 * @returns Random element
 */
export function randomElement<T>(array: T[], rng: () => number = Math.random) {
  return array[Math.floor(rng() * array.length)] satisfies T;
}
