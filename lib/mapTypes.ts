/**
 * Map Type Definitions
 *
 * TypeScript types for the tile-based map system.
 * These types mirror the Convex schema for client-side usage.
 */

// ========================================
// TILE TYPES
// ========================================

/**
 * Tile types representing different surfaces in the campus
 */
export type TileType =
  | "floor" // Indoor floor (inside buildings)
  | "wall" // Solid wall (buildings, barriers)
  | "door" // Entrance/exit (walkable)
  | "grass" // Grass/lawn (walkable)
  | "water" // Water feature (not walkable)
  | "path" // Paved walkway (walkable)
  | "void" // Empty/boundary (not walkable)
  // Terrain variety
  | "tall_tree" // Tall trees (not walkable)
  | "short_tree" // Short trees (not walkable)
  | "bush" // Bushes (walkable)
  | "flower_bed" // Flower beds (walkable)
  | "concrete" // Concrete areas (walkable)
  | "brick_path" // Decorative brick paths (walkable)
  // Building interiors
  | "cafe_stall" // Café food stalls
  | "study_desk" // Study desks
  | "bookshelf" // Library bookshelves
  | "lounge_chair" // Lounge seating
  | "laundry_machine" // Laundry facilities
  | "lecture_seat" // Lecture hall seating
  | "library_desk" // Library study desks
  | "dorm_bed" // Dorm room beds
  | "kitchen_counter"; // Kitchen areas

/**
 * Visual configuration for rendering tiles
 */
export interface TileVisualConfig {
  tileType: TileType;
  color: string; // Base color for rendering
  walkable: boolean; // Is this tile type walkable?
  variants: number; // Number of visual variants (0-3)
}

/**
 * Tile visual configuration lookup
 */
export const TILE_VISUALS: Record<TileType, TileVisualConfig> = {
  floor: { tileType: "floor", color: "#E8E4D9", walkable: true, variants: 3 },
  wall: { tileType: "wall", color: "#8B7355", walkable: false, variants: 2 },
  door: { tileType: "door", color: "#A0826D", walkable: true, variants: 1 },
  grass: { tileType: "grass", color: "#7CB342", walkable: true, variants: 4 },
  water: { tileType: "water", color: "#42A5F5", walkable: false, variants: 2 },
  path: { tileType: "path", color: "#BDBDBD", walkable: true, variants: 2 },
  void: { tileType: "void", color: "#212121", walkable: false, variants: 1 },
  // Terrain variety
  tall_tree: {
    tileType: "tall_tree",
    color: "#2E7D32",
    walkable: false,
    variants: 3,
  },
  short_tree: {
    tileType: "short_tree",
    color: "#558B2F",
    walkable: false,
    variants: 3,
  },
  bush: { tileType: "bush", color: "#689F38", walkable: true, variants: 2 },
  flower_bed: {
    tileType: "flower_bed",
    color: "#F48FB1",
    walkable: true,
    variants: 2,
  },
  concrete: {
    tileType: "concrete",
    color: "#9E9E9E",
    walkable: true,
    variants: 2,
  },
  brick_path: {
    tileType: "brick_path",
    color: "#A1887F",
    walkable: true,
    variants: 2,
  },
  // Building interiors
  cafe_stall: {
    tileType: "cafe_stall",
    color: "#D7CCC8",
    walkable: false,
    variants: 2,
  },
  study_desk: {
    tileType: "study_desk",
    color: "#BCAAA4",
    walkable: false,
    variants: 2,
  },
  bookshelf: {
    tileType: "bookshelf",
    color: "#8D6E63",
    walkable: false,
    variants: 2,
  },
  lounge_chair: {
    tileType: "lounge_chair",
    color: "#B39DDB",
    walkable: false,
    variants: 2,
  },
  laundry_machine: {
    tileType: "laundry_machine",
    color: "#90CAF9",
    walkable: false,
    variants: 1,
  },
  lecture_seat: {
    tileType: "lecture_seat",
    color: "#9FA8DA",
    walkable: false,
    variants: 2,
  },
  library_desk: {
    tileType: "library_desk",
    color: "#A1887F",
    walkable: false,
    variants: 2,
  },
  dorm_bed: {
    tileType: "dorm_bed",
    color: "#CE93D8",
    walkable: false,
    variants: 2,
  },
  kitchen_counter: {
    tileType: "kitchen_counter",
    color: "#FFE082",
    walkable: false,
    variants: 2,
  },
};

/**
 * Individual tile data
 */
export interface Tile {
  x: number;
  y: number;
  tileType: TileType;
  isWalkable: boolean;
  visualVariant?: number;
  placeId?: string;
  metadata?: {
    biome?: string;
    lightLevel?: number;
  };
}

// ========================================
// GEOMETRY TYPES
// ========================================

/**
 * 2D point in tile coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Rectangle bounds in tile coordinates
 */
export interface Rect {
  x: number; // Top-left X
  y: number; // Top-left Y
  width: number; // Width in tiles
  height: number; // Height in tiles
}

/**
 * Direction enum for entrances
 */
export type Direction = "north" | "south" | "east" | "west";

/**
 * Entrance point with direction
 */
export interface Entrance extends Point {
  facing?: Direction;
}

// ========================================
// PLACE TYPES
// ========================================

/**
 * Place kinds (campus locations)
 */
export type PlaceKind =
  | "dorm"
  | "lecture"
  | "cafe"
  | "library"
  | "quad"
  | "outdoor"
  | "hallway"
  | "custom";

/**
 * Campus place/location data
 */
export interface Place {
  _id: string;
  kind: PlaceKind | string;
  name: string;
  description?: string;
  bounds: Rect;
  entrances: Entrance[];
  capacity?: number;
  isIndoor: boolean;
  metadata?: {
    realWorldInspiration?: string;
    ambientSound?: string;
  };
}

// ========================================
// MAP CONFIGURATION
// ========================================

/**
 * Global map configuration
 */
export interface MapSettings {
  gridWidth: number; // Default: 80
  gridHeight: number; // Default: 50
  tileSize: number; // Default: 32 pixels
  metersPerTile: number; // Default: 1 meter per tile
  version: number;
  lastRegeneratedAt?: number;
  seed?: string;
}

/**
 * Default map configuration
 */
export const DEFAULT_MAP_SETTINGS: MapSettings = {
  gridWidth: 80,
  gridHeight: 50,
  tileSize: 32,
  metersPerTile: 1,
  version: 1,
};

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Region for querying a subset of tiles
 */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tile grid - full 2D array representation
 */
export type TileGrid = Tile[][];

/**
 * Sparse tile map - coordinate key to tile
 */
export type TileMap = Map<string, Tile>;

// ========================================
// NUS UTOWN REFERENCE DATA
// ========================================

/**
 * NUS UTown inspired place definitions
 * Real-world scale: ~400m × 300m → 80×50 tiles (5m per tile equivalent)
 */
export interface UTownPlaceDefinition {
  kind: PlaceKind;
  name: string;
  realWorldName: string;
  bounds: Rect;
  entrances: Entrance[];
  description: string;
}

/**
 * UTown reference layout
 */
export const UTOWN_PLACES: UTownPlaceDefinition[] = [
  {
    kind: "library",
    name: "Education Resource Centre",
    realWorldName: "NUS UTown ERC Library",
    bounds: { x: 55, y: 5, width: 20, height: 15 },
    entrances: [
      { x: 65, y: 20, facing: "south" },
      { x: 55, y: 12, facing: "west" },
    ],
    description:
      "Modern learning hub with study spaces and collaboration areas",
  },
  {
    kind: "lecture",
    name: "Lecture Theatre Complex",
    realWorldName: "NUS UTown Lecture Halls",
    bounds: { x: 10, y: 15, width: 15, height: 13 },
    entrances: [
      { x: 25, y: 21, facing: "east" },
      { x: 17, y: 28, facing: "south" },
    ],
    description: "Large lecture halls for classes and presentations",
  },
  {
    kind: "cafe",
    name: "Town Plaza Café",
    realWorldName: "NUS UTown Town Plaza",
    bounds: { x: 30, y: 20, width: 15, height: 10 },
    entrances: [
      { x: 30, y: 25, facing: "west" },
      { x: 45, y: 25, facing: "east" },
      { x: 37, y: 20, facing: "north" },
    ],
    description: "Central dining and social hub with multiple food options",
  },
  {
    kind: "quad",
    name: "Central Green",
    realWorldName: "NUS UTown Central Green",
    bounds: { x: 35, y: 32, width: 20, height: 12 },
    entrances: [
      { x: 35, y: 38, facing: "west" },
      { x: 55, y: 38, facing: "east" },
      { x: 45, y: 32, facing: "north" },
      { x: 45, y: 44, facing: "south" },
    ],
    description: "Open grass field for recreation and outdoor gatherings",
  },
  {
    kind: "dorm",
    name: "Student Residence",
    realWorldName: "NUS UTown Residential Halls",
    bounds: { x: 5, y: 35, width: 20, height: 13 },
    entrances: [
      { x: 25, y: 41, facing: "east" },
      { x: 12, y: 35, facing: "north" },
    ],
    description: "Student housing with common areas and study lounges",
  },
];
