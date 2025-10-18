/**
 * Map Seeding and Generation
 *
 * Generates the initial campus map inspired by NUS UTown Singapore.
 * Creates a 80×50 tile grid with buildings, paths, grass, and water features.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Tile type definition (matches schema)
 */
type TileType = "floor" | "wall" | "door" | "grass" | "water" | "path" | "void";

/**
 * Entrance definition
 */
interface Entrance {
  x: number;
  y: number;
  facing?: string;
}

/**
 * Place definition for seeding
 */
interface PlaceDefinition {
  kind: string;
  name: string;
  description: string;
  bounds: { x: number; y: number; width: number; height: number };
  entrances: Entrance[];
  isIndoor: boolean;
  realWorldInspiration: string;
}

/**
 * NUS UTown inspired place definitions
 */
const UTOWN_PLACES: PlaceDefinition[] = [
  {
    kind: "library",
    name: "Education Resource Centre",
    description:
      "Modern learning hub with study spaces and collaboration areas",
    bounds: { x: 55, y: 5, width: 20, height: 15 },
    entrances: [
      { x: 65, y: 20, facing: "south" },
      { x: 55, y: 12, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown ERC Library",
  },
  {
    kind: "lecture",
    name: "Lecture Theatre Complex",
    description: "Large lecture halls for classes and presentations",
    bounds: { x: 10, y: 15, width: 15, height: 13 },
    entrances: [
      { x: 25, y: 21, facing: "east" },
      { x: 17, y: 28, facing: "south" },
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Lecture Halls",
  },
  {
    kind: "cafe",
    name: "Town Plaza Café",
    description: "Central dining and social hub with multiple food options",
    bounds: { x: 30, y: 20, width: 15, height: 10 },
    entrances: [
      { x: 30, y: 25, facing: "west" },
      { x: 45, y: 25, facing: "east" },
      { x: 37, y: 20, facing: "north" },
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Town Plaza",
  },
  {
    kind: "quad",
    name: "Central Green",
    description: "Open grass field for recreation and outdoor gatherings",
    bounds: { x: 35, y: 32, width: 20, height: 12 },
    entrances: [
      { x: 35, y: 38, facing: "west" },
      { x: 55, y: 38, facing: "east" },
      { x: 45, y: 32, facing: "north" },
      { x: 45, y: 44, facing: "south" },
    ],
    isIndoor: false,
    realWorldInspiration: "NUS UTown Central Green",
  },
  {
    kind: "dorm",
    name: "Student Residence",
    description: "Student housing with common areas and study lounges",
    bounds: { x: 5, y: 35, width: 20, height: 13 },
    entrances: [
      { x: 25, y: 41, facing: "east" },
      { x: 12, y: 35, facing: "north" },
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Residential Halls",
  },
];

/**
 * Dorm room definitions (subdivisions within the main dorm building)
 * These create individual rooms for students to have "home" behavior
 */
const DORM_ROOMS: PlaceDefinition[] = [
  // Row 1 - Top floor rooms (4 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 101",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 7, y: 36, width: 4, height: 3 },
    entrances: [{ x: 10, y: 38, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 102",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 11, y: 36, width: 4, height: 3 },
    entrances: [{ x: 14, y: 38, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 103",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 15, y: 36, width: 4, height: 3 },
    entrances: [{ x: 18, y: 38, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 104",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 19, y: 36, width: 4, height: 3 },
    entrances: [{ x: 22, y: 38, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Row 2 - Middle floor rooms (4 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 201",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 7, y: 39, width: 4, height: 3 },
    entrances: [{ x: 10, y: 39, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 202",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 11, y: 39, width: 4, height: 3 },
    entrances: [{ x: 14, y: 39, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 203",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 15, y: 39, width: 4, height: 3 },
    entrances: [{ x: 18, y: 39, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 204",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 19, y: 39, width: 4, height: 3 },
    entrances: [{ x: 22, y: 39, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Row 3 - Bottom floor rooms (4 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 301",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 7, y: 42, width: 4, height: 3 },
    entrances: [{ x: 10, y: 44, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 302",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 11, y: 42, width: 4, height: 3 },
    entrances: [{ x: 14, y: 44, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 303",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 15, y: 42, width: 4, height: 3 },
    entrances: [{ x: 18, y: 44, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 304",
    description: "Single student bedroom with desk and bed",
    bounds: { x: 19, y: 42, width: 4, height: 3 },
    entrances: [{ x: 22, y: 44, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Common areas
  {
    kind: "common_room",
    name: "Common Lounge",
    description: "Shared living space with sofas and TV for socializing",
    bounds: { x: 7, y: 45, width: 8, height: 2 },
    entrances: [
      { x: 7, y: 46, facing: "west" },
      { x: 14, y: 46, facing: "east" },
    ],
    isIndoor: true,
    realWorldInspiration: "UTown Common Lounge",
  },
  {
    kind: "study_room",
    name: "Study Lounge",
    description: "Quiet study area with desks and whiteboards",
    bounds: { x: 15, y: 45, width: 8, height: 2 },
    entrances: [
      { x: 15, y: 46, facing: "west" },
      { x: 22, y: 46, facing: "east" },
    ],
    isIndoor: true,
    realWorldInspiration: "UTown Study Room",
  },
];

/**
 * Initialize the map with UTown-inspired layout
 */
export const initializeMap = internalMutation({
  args: {
    seed: v.optional(v.string()),
  },
  returns: v.object({
    tilesCreated: v.number(),
    placesCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    const gridWidth = 80;
    const gridHeight = 50;
    const seed = args.seed || `utown_${Date.now()}`;

    console.log(`🗺️  Initializing map with seed: ${seed}`);
    console.log(
      `📊 Total landmarks to generate: ${UTOWN_PLACES.length + DORM_ROOMS.length}`
    );

    // Create map settings
    await ctx.db.insert("map_settings", {
      gridWidth,
      gridHeight,
      tileSize: 32,
      metersPerTile: 1,
      version: 1,
      lastRegeneratedAt: Date.now(),
      seed,
    });

    // Step 1: Generate base grid (all grass by default)
    console.log("📍 Generating base grid (80×50 = 4000 tiles)...");
    const tiles: Array<{
      x: number;
      y: number;
      tileType: TileType;
      isWalkable: boolean;
      visualVariant?: number;
    }> = [];

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        tiles.push({
          x,
          y,
          tileType: "grass",
          isWalkable: true,
          visualVariant: ((x + y) * 7) % 4, // Pseudo-random variant
        });
      }
    }

    // Step 2: Create main places and insert them
    console.log("🏢 Creating main landmarks...");
    const placeIdMap = new Map<string, string>();

    for (const placeDef of UTOWN_PLACES) {
      const placeId = await ctx.db.insert("places", {
        kind: placeDef.kind,
        name: placeDef.name,
        description: placeDef.description,
        bounds: placeDef.bounds,
        entrances: placeDef.entrances,
        capacity: placeDef.isIndoor
          ? placeDef.bounds.width * placeDef.bounds.height
          : undefined,
        isIndoor: placeDef.isIndoor,
        metadata: {
          realWorldInspiration: placeDef.realWorldInspiration,
        },
      });
      placeIdMap.set(`${placeDef.kind}_${placeDef.name}`, placeId);
      console.log(`  ✓ Created ${placeDef.name} (${placeDef.kind})`);
    }

    // Step 2b: Create dorm rooms
    console.log("🚪 Creating dorm rooms...");
    for (const roomDef of DORM_ROOMS) {
      const roomId = await ctx.db.insert("places", {
        kind: roomDef.kind,
        name: roomDef.name,
        description: roomDef.description,
        bounds: roomDef.bounds,
        entrances: roomDef.entrances,
        capacity: 2, // Small rooms have lower capacity
        isIndoor: roomDef.isIndoor,
        metadata: {
          realWorldInspiration: roomDef.realWorldInspiration,
        },
      });
      placeIdMap.set(`${roomDef.kind}_${roomDef.name}`, roomId);
      console.log(`  ✓ Created ${roomDef.name} (${roomDef.kind})`);
    }

    // Step 3: Generate tiles for main places
    console.log("🎨 Generating main landmark tiles...");

    for (const placeDef of UTOWN_PLACES) {
      const placeId = placeIdMap.get(`${placeDef.kind}_${placeDef.name}`);
      const { bounds, isIndoor, entrances, kind } = placeDef;

      // Create entrance set for quick lookup
      const entranceSet = new Set(entrances.map((e) => `${e.x},${e.y}`));

      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          const tileIndex = y * gridWidth + x;
          const isEntrance = entranceSet.has(`${x},${y}`);

          // Determine tile type
          let tileType: TileType;
          let isWalkable: boolean;

          if (isIndoor) {
            // Indoor buildings
            const isPerimeter =
              x === bounds.x ||
              x === bounds.x + bounds.width - 1 ||
              y === bounds.y ||
              y === bounds.y + bounds.height - 1;

            if (isPerimeter) {
              tileType = isEntrance ? "door" : "wall";
              isWalkable = isEntrance;
            } else {
              // For dorm, we'll override interior tiles with rooms later
              if (kind === "dorm") {
                tileType = "floor";
                isWalkable = true;
              } else {
                tileType = "floor";
                isWalkable = true;
              }
            }
          } else {
            // Outdoor areas (quad)
            tileType = "grass";
            isWalkable = true;
          }

          tiles[tileIndex] = {
            x,
            y,
            tileType,
            isWalkable,
            visualVariant: (x * 13 + y * 17) % 3,
          };

          // Associate with place if indoor (but not for dorm interior - rooms will override)
          if (isIndoor && placeId && kind !== "dorm") {
            (tiles[tileIndex] as any).placeId = placeId;
          }
        }
      }
    }

    // Step 3b: Generate tiles for dorm rooms (subdivide the dorm interior)
    console.log("🚪 Generating dorm room tiles...");

    for (const roomDef of DORM_ROOMS) {
      const roomId = placeIdMap.get(`${roomDef.kind}_${roomDef.name}`);
      const { bounds, entrances } = roomDef;

      // Create entrance set for quick lookup
      const entranceSet = new Set(entrances.map((e) => `${e.x},${e.y}`));

      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          const tileIndex = y * gridWidth + x;
          const isEntrance = entranceSet.has(`${x},${y}`);

          // Determine tile type for room
          const isPerimeter =
            x === bounds.x ||
            x === bounds.x + bounds.width - 1 ||
            y === bounds.y ||
            y === bounds.y + bounds.height - 1;

          let tileType: TileType;
          let isWalkable: boolean;

          if (isPerimeter) {
            tileType = isEntrance ? "door" : "wall";
            isWalkable = isEntrance;
          } else {
            tileType = "floor";
            isWalkable = true;
          }

          tiles[tileIndex] = {
            x,
            y,
            tileType,
            isWalkable,
            visualVariant: (x * 7 + y * 11) % 2, // Different pattern for rooms
          };

          // Associate with room
          if (roomId) {
            (tiles[tileIndex] as any).placeId = roomId;
          }
        }
      }
    }

    // Step 4: Add connecting paths
    console.log("🛤️  Adding connecting paths...");
    addConnectingPaths(tiles, gridWidth, gridHeight);

    // Step 5: Add water features
    console.log("💧 Adding water features...");
    addWaterFeatures(tiles, gridWidth, gridHeight);

    // Step 6: Add void boundaries (optional decorative borders)
    console.log("🌌 Adding boundary tiles...");
    addBoundaryVoid(tiles, gridWidth, gridHeight);

    // Step 7: Insert all tiles in batches
    console.log("💾 Inserting tiles into database...");
    const batchSize = 500;
    let tilesCreated = 0;

    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      await Promise.all(
        batch.map((tile) => ctx.db.insert("map_tiles", tile as any))
      );
      tilesCreated += batch.length;
      console.log(`  ✓ Inserted ${tilesCreated}/${tiles.length} tiles`);
    }

    console.log("✅ Map initialization complete!");

    return {
      tilesCreated,
      placesCreated: UTOWN_PLACES.length + DORM_ROOMS.length,
    };
  },
});

/**
 * Add connecting paths between buildings
 */
function addConnectingPaths(
  tiles: any[],
  gridWidth: number,
  gridHeight: number
): void {
  // Path width
  const pathWidth = 2;

  // Main horizontal path (connecting left to right)
  const mainPathY = 25;
  for (let x = 0; x < gridWidth; x++) {
    for (let dy = 0; dy < pathWidth; dy++) {
      const y = mainPathY + dy;
      if (y < gridHeight) {
        const idx = y * gridWidth + x;
        if (tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Vertical path connecting dorm to main path
  for (let y = 30; y < 42; y++) {
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = 27 + dx;
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Path from cafe to quad
  for (let y = 30; y < 35; y++) {
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = 40 + dx;
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Path from library to main area
  for (let y = 20; y < 27; y++) {
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = 60 + dx;
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }
}

/**
 * Add decorative water features
 */
function addWaterFeatures(
  tiles: any[],
  gridWidth: number,
  gridHeight: number
): void {
  // Small pond near library (top right area)
  const pondX = 75;
  const pondY = 22;
  const pondWidth = 4;
  const pondHeight = 3;

  for (let y = pondY; y < pondY + pondHeight; y++) {
    for (let x = pondX; x < pondX + pondWidth; x++) {
      if (x < gridWidth && y < gridHeight) {
        const idx = y * gridWidth + x;
        if (tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "water";
          tiles[idx].isWalkable = false;
          tiles[idx].visualVariant = (x + y) % 2;
        }
      }
    }
  }

  // Decorative fountain near cafe entrance
  const fountainX = 28;
  const fountainY = 24;
  const idx = fountainY * gridWidth + fountainX;
  if (tiles[idx].tileType === "grass" || tiles[idx].tileType === "path") {
    tiles[idx].tileType = "water";
    tiles[idx].isWalkable = false;
  }
}

/**
 * Add void tiles at the map boundaries (optional)
 */
function addBoundaryVoid(
  tiles: any[],
  gridWidth: number,
  gridHeight: number
): void {
  // Top and bottom borders
  for (let x = 0; x < gridWidth; x++) {
    // Top border
    const topIdx = 0 * gridWidth + x;
    if (tiles[topIdx].tileType === "grass") {
      tiles[topIdx].tileType = "void";
      tiles[topIdx].isWalkable = false;
    }

    // Bottom border
    const bottomIdx = (gridHeight - 1) * gridWidth + x;
    if (tiles[bottomIdx].tileType === "grass") {
      tiles[bottomIdx].tileType = "void";
      tiles[bottomIdx].isWalkable = false;
    }
  }

  // Left and right borders
  for (let y = 0; y < gridHeight; y++) {
    // Left border
    const leftIdx = y * gridWidth + 0;
    if (tiles[leftIdx].tileType === "grass") {
      tiles[leftIdx].tileType = "void";
      tiles[leftIdx].isWalkable = false;
    }

    // Right border
    const rightIdx = y * gridWidth + (gridWidth - 1);
    if (tiles[rightIdx].tileType === "grass") {
      tiles[rightIdx].tileType = "void";
      tiles[rightIdx].isWalkable = false;
    }
  }
}
