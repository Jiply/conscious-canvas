/**
 * Map Seeding and Generation
 *
 * Generates the initial campus map inspired by NUS UTown Singapore.
 * Creates a 200×150 tile grid with realistic building sizes and proper entrances.
 * Scale: 1 tile = 1 meter, so this is a 200m × 150m campus area.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Tile type definition (matches schema)
 */
type TileType =
  | "floor"
  | "wall"
  | "door"
  | "grass"
  | "water"
  | "path"
  | "void"
  | "tall_tree"
  | "short_tree"
  | "bush"
  | "flower_bed"
  | "concrete"
  | "brick_path"
  | "cafe_stall"
  | "study_desk"
  | "bookshelf"
  | "lounge_chair"
  | "laundry_machine"
  | "lecture_seat"
  | "library_desk"
  | "dorm_bed"
  | "kitchen_counter";

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
 * NUS UTown inspired place definitions - REALISTIC SCALE
 *
 * Scale: 1 tile = 1 meter
 * Grid: 200×150 tiles (200m × 150m campus)
 *
 * Realistic building sizes:
 * - Library: 60×40m (typical university library)
 * - Lecture Hall: 50×30m (large lecture theatre)
 * - Café: 30×20m (campus dining hall)
 * - Dorm: 80×50m (residential building with multiple floors)
 * - Quad: 60×40m (central green space)
 */
const UTOWN_PLACES: PlaceDefinition[] = [
  {
    kind: "library",
    name: "Education Resource Centre",
    description:
      "Modern 3-story learning hub with study spaces, computer labs, and collaboration areas",
    bounds: { x: 120, y: 20, width: 60, height: 40 },
    entrances: [
      { x: 150, y: 60, facing: "south" }, // Main entrance
      { x: 120, y: 40, facing: "west" }, // Side entrance
      { x: 180, y: 40, facing: "east" }, // East entrance
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown ERC Library",
  },
  {
    kind: "lecture",
    name: "Lecture Theatre Complex",
    description: "Large lecture halls with seating for 200+ students each",
    bounds: { x: 20, y: 40, width: 50, height: 30 },
    entrances: [
      { x: 45, y: 70, facing: "south" }, // Main entrance
      { x: 20, y: 55, facing: "west" }, // West entrance
      { x: 70, y: 55, facing: "east" }, // East entrance
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Lecture Halls",
  },
  {
    kind: "cafe",
    name: "Town Plaza Café",
    description:
      "Central dining hall with multiple food stations and seating areas",
    bounds: { x: 80, y: 50, width: 30, height: 20 },
    entrances: [
      { x: 80, y: 60, facing: "west" }, // West entrance
      { x: 110, y: 60, facing: "east" }, // East entrance
      { x: 95, y: 50, facing: "north" }, // North entrance
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Town Plaza",
  },
  {
    kind: "quad",
    name: "Central Green",
    description:
      "Large open grass field for recreation, outdoor gatherings, and events",
    bounds: { x: 90, y: 90, width: 60, height: 40 },
    entrances: [
      { x: 90, y: 110, facing: "west" }, // West entrance
      { x: 150, y: 110, facing: "east" }, // East entrance
      { x: 120, y: 90, facing: "north" }, // North entrance
      { x: 120, y: 130, facing: "south" }, // South entrance
    ],
    isIndoor: false,
    realWorldInspiration: "NUS UTown Central Green",
  },
  {
    kind: "dorm",
    name: "Student Residence",
    description:
      "Multi-story residential building with student rooms and common areas",
    bounds: { x: 10, y: 90, width: 80, height: 50 },
    entrances: [
      { x: 50, y: 140, facing: "south" }, // Main entrance
      { x: 10, y: 115, facing: "west" }, // West entrance
      { x: 90, y: 115, facing: "east" }, // East entrance
    ],
    isIndoor: true,
    realWorldInspiration: "NUS UTown Residential Halls",
  },
];

/**
 * Internal building areas - detailed layouts for emergent behaviors
 */
const INTERNAL_AREAS: PlaceDefinition[] = [
  // Library internal areas
  {
    kind: "library_section",
    name: "Computer Lab",
    description: "Modern computer lab with workstations and group study areas",
    bounds: { x: 130, y: 25, width: 20, height: 15 },
    entrances: [
      { x: 140, y: 40, facing: "south" },
      { x: 130, y: 32, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Library Computer Lab",
  },
  {
    kind: "library_section",
    name: "Quiet Study Area",
    description: "Silent study zone with individual desks and reading lamps",
    bounds: { x: 150, y: 25, width: 20, height: 15 },
    entrances: [
      { x: 160, y: 40, facing: "south" },
      { x: 170, y: 32, facing: "east" },
    ],
    isIndoor: true,
    realWorldInspiration: "Library Quiet Zone",
  },
  {
    kind: "library_section",
    name: "Group Study Rooms",
    description: "Bookable study rooms for collaborative work",
    bounds: { x: 170, y: 25, width: 10, height: 15 },
    entrances: [{ x: 175, y: 40, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "Library Study Rooms",
  },

  // Café internal areas
  {
    kind: "cafe_stall",
    name: "Coffee Corner",
    description: "Specialty coffee bar with espresso machines and pastries",
    bounds: { x: 85, y: 52, width: 8, height: 6 },
    entrances: [
      { x: 89, y: 58, facing: "south" },
      { x: 85, y: 55, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Coffee Bar",
  },
  {
    kind: "cafe_stall",
    name: "Asian Cuisine",
    description: "Asian food station with rice bowls, noodles, and stir-fries",
    bounds: { x: 95, y: 52, width: 8, height: 6 },
    entrances: [
      { x: 99, y: 58, facing: "south" },
      { x: 95, y: 55, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Asian Station",
  },
  {
    kind: "cafe_stall",
    name: "Western Grill",
    description: "Grill station with burgers, sandwiches, and hot meals",
    bounds: { x: 105, y: 52, width: 8, height: 6 },
    entrances: [
      { x: 109, y: 58, facing: "south" },
      { x: 105, y: 55, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Grill Station",
  },
  {
    kind: "cafe_stall",
    name: "Salad Bar",
    description: "Fresh salad station with healthy options and dressings",
    bounds: { x: 85, y: 60, width: 8, height: 6 },
    entrances: [
      { x: 89, y: 60, facing: "north" },
      { x: 85, y: 63, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Salad Bar",
  },
  {
    kind: "cafe_stall",
    name: "Dessert Counter",
    description: "Sweet treats, ice cream, and baked goods",
    bounds: { x: 95, y: 60, width: 8, height: 6 },
    entrances: [
      { x: 99, y: 60, facing: "north" },
      { x: 95, y: 63, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Dessert Station",
  },
  {
    kind: "cafe_stall",
    name: "Beverage Station",
    description: "Self-serve drinks, juices, and water fountain",
    bounds: { x: 105, y: 60, width: 8, height: 6 },
    entrances: [
      { x: 109, y: 60, facing: "north" },
      { x: 105, y: 63, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Café Beverage Station",
  },

  // Lecture hall internal areas
  {
    kind: "lecture_section",
    name: "Main Lecture Hall A",
    description: "Large lecture hall with tiered seating for 150+ students",
    bounds: { x: 25, y: 45, width: 20, height: 15 },
    entrances: [
      { x: 35, y: 60, facing: "south" },
      { x: 25, y: 52, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Lecture Hall A",
  },
  {
    kind: "lecture_section",
    name: "Main Lecture Hall B",
    description: "Large lecture hall with tiered seating for 150+ students",
    bounds: { x: 45, y: 45, width: 20, height: 15 },
    entrances: [
      { x: 55, y: 60, facing: "south" },
      { x: 45, y: 52, facing: "west" },
    ],
    isIndoor: true,
    realWorldInspiration: "Lecture Hall B",
  },
  {
    kind: "lecture_section",
    name: "Seminar Room",
    description: "Smaller seminar room for discussion-based classes",
    bounds: { x: 25, y: 50, width: 15, height: 10 },
    entrances: [{ x: 32, y: 60, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "Seminar Room",
  },
  {
    kind: "lecture_section",
    name: "Tutorial Room",
    description: "Small tutorial room for group work and presentations",
    bounds: { x: 40, y: 50, width: 15, height: 10 },
    entrances: [{ x: 47, y: 60, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "Tutorial Room",
  },
];

/**
 * Dorm room definitions (subdivisions within the main dorm building)
 * These create individual rooms for students to have "home" behavior
 *
 * Realistic room sizes: 6×4m (24m²) - typical student room size
 * Dorm building: 80×50m with multiple floors
 */
const DORM_ROOMS: PlaceDefinition[] = [
  // Floor 1 - Ground floor rooms (8 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 101",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 15, y: 95, width: 6, height: 4 },
    entrances: [{ x: 18, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 102",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 22, y: 95, width: 6, height: 4 },
    entrances: [{ x: 25, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 103",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 29, y: 95, width: 6, height: 4 },
    entrances: [{ x: 32, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 104",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 36, y: 95, width: 6, height: 4 },
    entrances: [{ x: 39, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 105",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 43, y: 95, width: 6, height: 4 },
    entrances: [{ x: 46, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 106",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 50, y: 95, width: 6, height: 4 },
    entrances: [{ x: 53, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 107",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 57, y: 95, width: 6, height: 4 },
    entrances: [{ x: 60, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 108",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 64, y: 95, width: 6, height: 4 },
    entrances: [{ x: 67, y: 99, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Floor 2 - Second floor rooms (8 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 201",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 15, y: 100, width: 6, height: 4 },
    entrances: [{ x: 18, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 202",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 22, y: 100, width: 6, height: 4 },
    entrances: [{ x: 25, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 203",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 29, y: 100, width: 6, height: 4 },
    entrances: [{ x: 32, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 204",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 36, y: 100, width: 6, height: 4 },
    entrances: [{ x: 39, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 205",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 43, y: 100, width: 6, height: 4 },
    entrances: [{ x: 46, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 206",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 50, y: 100, width: 6, height: 4 },
    entrances: [{ x: 53, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 207",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 57, y: 100, width: 6, height: 4 },
    entrances: [{ x: 60, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 208",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 64, y: 100, width: 6, height: 4 },
    entrances: [{ x: 67, y: 100, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Floor 3 - Third floor rooms (8 bedrooms)
  {
    kind: "dorm_room",
    name: "Room 301",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 15, y: 105, width: 6, height: 4 },
    entrances: [{ x: 18, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 302",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 22, y: 105, width: 6, height: 4 },
    entrances: [{ x: 25, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 303",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 29, y: 105, width: 6, height: 4 },
    entrances: [{ x: 32, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 304",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 36, y: 105, width: 6, height: 4 },
    entrances: [{ x: 39, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 305",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 43, y: 105, width: 6, height: 4 },
    entrances: [{ x: 46, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 306",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 50, y: 105, width: 6, height: 4 },
    entrances: [{ x: 53, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 307",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 57, y: 105, width: 6, height: 4 },
    entrances: [{ x: 60, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },
  {
    kind: "dorm_room",
    name: "Room 308",
    description: "Single student bedroom with desk, bed, and storage",
    bounds: { x: 64, y: 105, width: 6, height: 4 },
    entrances: [{ x: 67, y: 109, facing: "south" }],
    isIndoor: true,
    realWorldInspiration: "UTown Student Room",
  },

  // Common areas - larger and more realistic
  {
    kind: "common_room",
    name: "Common Lounge",
    description: "Large shared living space with sofas, TV, and social areas",
    bounds: { x: 15, y: 110, width: 20, height: 8 },
    entrances: [
      { x: 15, y: 114, facing: "west" },
      { x: 35, y: 114, facing: "east" },
    ],
    isIndoor: true,
    realWorldInspiration: "UTown Common Lounge",
  },
  {
    kind: "study_room",
    name: "Study Lounge",
    description:
      "Quiet study area with desks, whiteboards, and group study spaces",
    bounds: { x: 40, y: 110, width: 20, height: 8 },
    entrances: [
      { x: 40, y: 114, facing: "west" },
      { x: 60, y: 114, facing: "east" },
    ],
    isIndoor: true,
    realWorldInspiration: "UTown Study Room",
  },
  {
    kind: "laundry_room",
    name: "Laundry Room",
    description: "Shared laundry facilities with washers and dryers",
    bounds: { x: 65, y: 110, width: 10, height: 8 },
    entrances: [{ x: 70, y: 110, facing: "north" }],
    isIndoor: true,
    realWorldInspiration: "UTown Laundry Room",
  },
];

/**
 * Initialize the map with UTown-inspired layout
 */
export const initializeMap = internalMutation({
  args: {
    seed: v.optional(v.string()),
    tileOffset: v.optional(v.number()), // Start inserting tiles from this offset
  },
  returns: v.object({
    tilesCreated: v.number(),
    placesCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    const gridWidth = 200;
    const gridHeight = 150;
    const seed = args.seed || `utown_${Date.now()}`;
    const tileOffset = args.tileOffset || 0;

    console.log(
      `🗺️  Initializing map with seed: ${seed}${tileOffset > 0 ? ` (tile offset: ${tileOffset})` : ""}`
    );
    console.log(
      `📊 Total landmarks to generate: ${UTOWN_PLACES.length + DORM_ROOMS.length + INTERNAL_AREAS.length}`
    );

    // Create map settings (only if not continuing)
    if (tileOffset === 0) {
      await ctx.db.insert("map_settings", {
        gridWidth,
        gridHeight,
        tileSize: 32,
        metersPerTile: 1,
        version: 1,
        lastRegeneratedAt: Date.now(),
        seed,
      });
    }

    // Step 1: Generate base grid (all grass by default)
    console.log(
      `📍 Generating base grid (${gridWidth}×${gridHeight} = ${gridWidth * gridHeight} tiles)...`
    );
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

    // Step 2: Create main places and insert them (skip if continuing)
    const placeIdMap = new Map<string, string>();

    if (tileOffset === 0) {
      console.log("🏢 Creating main landmarks...");

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

      // Step 2c: Create internal areas
      console.log("🏢 Creating internal building areas...");
      for (const areaDef of INTERNAL_AREAS) {
        const areaId = await ctx.db.insert("places", {
          kind: areaDef.kind,
          name: areaDef.name,
          description: areaDef.description,
          bounds: areaDef.bounds,
          entrances: areaDef.entrances,
          capacity: areaDef.bounds.width * areaDef.bounds.height, // Capacity based on size
          isIndoor: areaDef.isIndoor,
          metadata: {
            realWorldInspiration: areaDef.realWorldInspiration,
          },
        });
        placeIdMap.set(`${areaDef.kind}_${areaDef.name}`, areaId);
        console.log(`  ✓ Created ${areaDef.name} (${areaDef.kind})`);
      }
    } // End of tileOffset === 0 check

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
            // Add variety to room interiors
            const roomVariant = (x + y) % 4;
            if (roomVariant === 0) tileType = "dorm_bed";
            else if (roomVariant === 1) tileType = "floor";
            else if (roomVariant === 2) tileType = "study_desk";
            else tileType = "floor";
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

    // Step 3c: Generate tiles for internal areas
    console.log("🏢 Generating internal area tiles...");

    for (const areaDef of INTERNAL_AREAS) {
      const areaId = placeIdMap.get(`${areaDef.kind}_${areaDef.name}`);
      const { bounds, entrances, kind } = areaDef;

      // Create entrance set for quick lookup
      const entranceSet = new Set(entrances.map((e) => `${e.x},${e.y}`));

      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          const tileIndex = y * gridWidth + x;
          const isEntrance = entranceSet.has(`${x},${y}`);

          // Determine tile type based on area kind
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
            // Special tile types based on area function
            if (kind === "cafe_stall") {
              tileType = "cafe_stall";
            } else if (kind === "library_section") {
              const variant = (x + y) % 3;
              if (variant === 0) tileType = "library_desk";
              else if (variant === 1) tileType = "bookshelf";
              else tileType = "floor";
            } else if (kind === "lecture_section") {
              tileType = "lecture_seat";
            } else {
              tileType = "floor";
            }
            isWalkable = true;
          }

          tiles[tileIndex] = {
            x,
            y,
            tileType,
            isWalkable,
            visualVariant: (x * 13 + y * 17) % 3,
          };

          // Associate with area
          if (areaId) {
            (tiles[tileIndex] as any).placeId = areaId;
          }
        }
      }
    }

    // Step 4: Add connecting paths
    console.log("🛤️  Adding connecting paths...");
    addConnectingPaths(tiles, gridWidth, gridHeight);

    // Step 5: Add terrain variety
    console.log("🌳 Adding terrain variety...");
    addTerrainVariety(tiles, gridWidth, gridHeight);

    // Step 6: Add water features
    console.log("💧 Adding water features...");
    addWaterFeatures(tiles, gridWidth, gridHeight);

    // Step 7: Add void boundaries (optional decorative borders)
    console.log("🌌 Adding boundary tiles...");
    addBoundaryVoid(tiles, gridWidth, gridHeight);

    // Step 7: Filter out undefined tiles
    console.log("💾 Preparing tiles for database insertion...");
    const validTiles = tiles.filter(
      (tile) => tile !== undefined && tile !== null
    );
    console.log(
      `  📊 Total tiles to insert: ${validTiles.length} (filtered from ${tiles.length})`
    );

    // Insert tiles in batches to stay under 16,000 write limit
    // We'll insert 15,000 tiles per function call, starting from tileOffset
    const maxTilesPerCall = 15000;
    const batchSize = 100;
    let tilesCreated = 0;
    const startIdx = tileOffset;
    const endIdx = Math.min(startIdx + maxTilesPerCall, validTiles.length);

    console.log(`  → Inserting tiles ${startIdx} to ${endIdx}...`);

    for (let i = startIdx; i < endIdx; i += batchSize) {
      const batch = validTiles.slice(i, Math.min(i + batchSize, endIdx));
      await Promise.all(
        batch.map((tile) => ctx.db.insert("map_tiles", tile as any))
      );
      tilesCreated += batch.length;
      if (tilesCreated % 1000 === 0 || i + batchSize >= endIdx) {
        console.log(
          `  ✓ Inserted ${startIdx + tilesCreated}/${validTiles.length} tiles`
        );
      }
    }

    if (endIdx < validTiles.length) {
      console.log(`  ⚠️  More tiles remaining: ${validTiles.length - endIdx}`);
      console.log(
        `  → Run: npx convex run --prod seedMap:initializeMap '{"tileOffset": ${endIdx}}'`
      );
    } else {
      console.log(`  ✅ All tiles inserted!`);
    }

    console.log("✅ Map initialization complete!");

    return {
      tilesCreated,
      placesCreated:
        UTOWN_PLACES.length + DORM_ROOMS.length + INTERNAL_AREAS.length,
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
  const pathWidth = 3; // Wider paths for larger campus

  // Main horizontal path (connecting left to right across campus)
  const mainPathY = Math.floor(gridHeight * 0.6); // 30 for 50 height
  for (let x = 0; x < gridWidth; x++) {
    for (let dy = 0; dy < pathWidth; dy++) {
      const y = mainPathY + dy;
      if (y < gridHeight) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Vertical path connecting dorm to main path
  for (let y = Math.floor(gridHeight * 0.7); y < gridHeight; y++) {
    // 35 to 50
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = Math.floor(gridWidth * 0.6) + dx; // 48 for 80 width
      if (x < gridWidth) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Path from cafe to quad
  for (
    let y = Math.floor(gridHeight * 0.5);
    y < Math.floor(gridHeight * 0.7);
    y++
  ) {
    // 25 to 35
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = Math.floor(gridWidth * 0.7) + dx; // 56 for 80 width
      if (x < gridWidth) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Path from library to main area
  for (
    let y = Math.floor(gridHeight * 0.4);
    y < Math.floor(gridHeight * 0.6);
    y++
  ) {
    // 20 to 30
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = Math.floor(gridWidth * 0.8) + dx; // 64 for 80 width
      if (x < gridWidth) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Path from lecture hall to main area
  for (
    let y = Math.floor(gridHeight * 0.5);
    y < Math.floor(gridHeight * 0.6);
    y++
  ) {
    // 25 to 30
    for (let dx = 0; dx < pathWidth; dx++) {
      const x = Math.floor(gridWidth * 0.3) + dx; // 24 for 80 width
      if (x < gridWidth) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "path";
          tiles[idx].isWalkable = true;
        }
      }
    }
  }

  // Cross-campus diagonal path
  for (let i = 0; i < Math.min(gridWidth, gridHeight); i++) {
    const x = Math.floor(gridWidth * 0.25) + i; // 20 for 80 width
    const y = Math.floor(gridHeight * 0.6) + i; // 30 for 50 height
    if (x < gridWidth && y < gridHeight) {
      for (let dx = 0; dx < pathWidth; dx++) {
        for (let dy = 0; dy < pathWidth; dy++) {
          const pathX = x + dx;
          const pathY = y + dy;
          if (pathX < gridWidth && pathY < gridHeight) {
            const idx = pathY * gridWidth + pathX;
            if (tiles[idx] && tiles[idx].tileType === "grass") {
              tiles[idx].tileType = "path";
              tiles[idx].isWalkable = true;
            }
          }
        }
      }
    }
  }

  // Add micro-paths within buildings for more detailed navigation
  addMicroPaths(tiles, gridWidth, gridHeight);
}

/**
 * Add micro-paths within buildings for detailed navigation
 */
function addMicroPaths(
  tiles: any[],
  gridWidth: number,
  gridHeight: number
): void {
  // Library internal paths
  // Main corridor through library
  for (let x = 125; x < 180; x++) {
    for (let y = 35; y < 40; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Cross-corridors in library
  for (let y = 25; y < 60; y++) {
    for (let x = 140; x < 145; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Café internal paths - connecting all stalls
  // Main café corridor
  for (let x = 80; x < 115; x++) {
    for (let y = 55; y < 60; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Cross-corridor in café
  for (let y = 50; y < 70; y++) {
    for (let x = 95; x < 100; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Lecture hall internal paths
  // Main corridor through lecture complex
  for (let x = 20; x < 70; x++) {
    for (let y = 42; y < 45; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Cross-corridor in lecture complex
  for (let y = 40; y < 70; y++) {
    for (let x = 35; x < 40; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Dorm internal paths
  // Main corridor through dorm
  for (let x = 15; x < 85; x++) {
    for (let y = 100; y < 105; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Cross-corridors in dorm
  for (let y = 90; y < 140; y++) {
    for (let x = 35; x < 40; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  for (let y = 90; y < 140; y++) {
    for (let x = 55; x < 60; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "floor") {
        tiles[idx].tileType = "path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  // Quad internal paths - create a network of walking paths
  // Main quad paths
  for (let x = 90; x < 150; x++) {
    for (let y = 100; y < 105; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "brick_path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  for (let x = 90; x < 150; x++) {
    for (let y = 120; y < 125; y++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "brick_path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  for (let y = 90; y < 130; y++) {
    for (let x = 110; x < 115; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "brick_path";
        tiles[idx].isWalkable = true;
      }
    }
  }

  for (let y = 90; y < 130; y++) {
    for (let x = 130; x < 135; x++) {
      const idx = y * gridWidth + x;
      if (tiles[idx].tileType === "grass") {
        tiles[idx].tileType = "brick_path";
        tiles[idx].isWalkable = true;
      }
    }
  }
}

/**
 * Add terrain variety for more interesting environments
 */
function addTerrainVariety(
  tiles: any[],
  gridWidth: number,
  gridHeight: number
): void {
  // Add tall trees around campus perimeter and in clusters (proportional to grid size)
  const tallTreeClusters = [
    {
      x: Math.floor(gridWidth * 0.06),
      y: Math.floor(gridHeight * 0.2),
      width: Math.floor(gridWidth * 0.1),
      height: Math.floor(gridHeight * 0.12),
    },
    {
      x: Math.floor(gridWidth * 0.85),
      y: Math.floor(gridHeight * 0.2),
      width: Math.floor(gridWidth * 0.1),
      height: Math.floor(gridHeight * 0.12),
    },
    {
      x: Math.floor(gridWidth * 0.06),
      y: Math.floor(gridHeight * 0.8),
      width: Math.floor(gridWidth * 0.1),
      height: Math.floor(gridHeight * 0.12),
    },
    {
      x: Math.floor(gridWidth * 0.85),
      y: Math.floor(gridHeight * 0.8),
      width: Math.floor(gridWidth * 0.1),
      height: Math.floor(gridHeight * 0.12),
    },
    {
      x: Math.floor(gridWidth * 0.3),
      y: Math.floor(gridHeight * 0.1),
      width: Math.floor(gridWidth * 0.08),
      height: Math.floor(gridHeight * 0.08),
    },
    {
      x: Math.floor(gridWidth * 0.6),
      y: Math.floor(gridHeight * 0.1),
      width: Math.floor(gridWidth * 0.08),
      height: Math.floor(gridHeight * 0.08),
    },
  ];

  for (const cluster of tallTreeClusters) {
    for (let y = cluster.y; y < cluster.y + cluster.height; y++) {
      for (let x = cluster.x; x < cluster.x + cluster.width; x++) {
        if (x < gridWidth && y < gridHeight) {
          const idx = y * gridWidth + x;
          if (tiles[idx].tileType === "grass") {
            tiles[idx].tileType = "tall_tree";
            tiles[idx].isWalkable = false;
            tiles[idx].visualVariant = (x + y) % 3;
          }
        }
      }
    }
  }

  // Add short trees and bushes in scattered patterns
  for (let y = 0; y < gridHeight; y += 8) {
    for (let x = 0; x < gridWidth; x += 12) {
      if (Math.random() < 0.3) {
        // 30% chance
        const treeX = x + Math.floor(Math.random() * 6);
        const treeY = y + Math.floor(Math.random() * 6);
        if (treeX < gridWidth && treeY < gridHeight) {
          const idx = treeY * gridWidth + treeX;
          if (tiles[idx].tileType === "grass") {
            const treeType = Math.random() < 0.6 ? "short_tree" : "bush";
            tiles[idx].tileType = treeType;
            tiles[idx].isWalkable = treeType === "bush"; // bushes are walkable
            tiles[idx].visualVariant = (treeX + treeY) % 2;
          }
        }
      }
    }
  }

  // Add flower beds near buildings (proportional to grid size)
  const flowerBedAreas = [
    {
      x: Math.floor(gridWidth * 0.4),
      y: Math.floor(gridHeight * 0.5),
      width: Math.floor(gridWidth * 0.05),
      height: Math.floor(gridHeight * 0.06),
    },
    {
      x: Math.floor(gridWidth * 0.7),
      y: Math.floor(gridHeight * 0.3),
      width: Math.floor(gridWidth * 0.05),
      height: Math.floor(gridHeight * 0.06),
    },
    {
      x: Math.floor(gridWidth * 0.1),
      y: Math.floor(gridHeight * 0.4),
      width: Math.floor(gridWidth * 0.05),
      height: Math.floor(gridHeight * 0.06),
    },
    {
      x: Math.floor(gridWidth * 0.5),
      y: Math.floor(gridHeight * 0.7),
      width: Math.floor(gridWidth * 0.05),
      height: Math.floor(gridHeight * 0.06),
    },
  ];

  for (const bed of flowerBedAreas) {
    for (let y = bed.y; y < bed.y + bed.height; y++) {
      for (let x = bed.x; x < bed.x + bed.width; x++) {
        if (x < gridWidth && y < gridHeight) {
          const idx = y * gridWidth + x;
          if (tiles[idx].tileType === "grass") {
            tiles[idx].tileType = "flower_bed";
            tiles[idx].isWalkable = true;
            tiles[idx].visualVariant = (x + y) % 4;
          }
        }
      }
    }
  }

  // Add concrete areas (plazas, courtyards)
  const concreteAreas = [
    {
      x: Math.floor(gridWidth * 0.5),
      y: Math.floor(gridHeight * 0.6),
      width: Math.floor(gridWidth * 0.1),
      height: Math.floor(gridHeight * 0.15),
    },
    {
      x: Math.floor(gridWidth * 0.2),
      y: Math.floor(gridHeight * 0.3),
      width: Math.floor(gridWidth * 0.08),
      height: Math.floor(gridHeight * 0.12),
    },
  ];

  for (const area of concreteAreas) {
    for (let y = area.y; y < area.y + area.height; y++) {
      for (let x = area.x; x < area.x + area.width; x++) {
        if (x < gridWidth && y < gridHeight) {
          const idx = y * gridWidth + x;
          if (tiles[idx].tileType === "grass") {
            tiles[idx].tileType = "concrete";
            tiles[idx].isWalkable = true;
            tiles[idx].visualVariant = (x + y) % 2;
          }
        }
      }
    }
  }

  // Add brick paths as decorative elements (proportional to grid size)
  const brickPaths = [
    {
      x: Math.floor(gridWidth * 0.3),
      y: Math.floor(gridHeight * 0.25),
      width: Math.floor(gridWidth * 0.15),
      height: 2,
    },
    {
      x: Math.floor(gridWidth * 0.25),
      y: Math.floor(gridHeight * 0.7),
      width: 2,
      height: Math.floor(gridHeight * 0.2),
    },
    {
      x: Math.floor(gridWidth * 0.6),
      y: Math.floor(gridHeight * 0.75),
      width: Math.floor(gridWidth * 0.12),
      height: 2,
    },
  ];

  for (const path of brickPaths) {
    for (let y = path.y; y < path.y + path.height; y++) {
      for (let x = path.x; x < path.x + path.width; x++) {
        if (x < gridWidth && y < gridHeight) {
          const idx = y * gridWidth + x;
          if (tiles[idx].tileType === "grass") {
            tiles[idx].tileType = "brick_path";
            tiles[idx].isWalkable = true;
            tiles[idx].visualVariant = (x + y) % 3;
          }
        }
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
  // Large pond near library (proportional to grid size)
  const pondX = Math.floor(gridWidth * 0.85);
  const pondY = Math.floor(gridHeight * 0.15);
  const pondWidth = Math.floor(gridWidth * 0.1);
  const pondHeight = Math.floor(gridHeight * 0.12);

  for (let y = pondY; y < pondY + pondHeight; y++) {
    for (let x = pondX; x < pondX + pondWidth; x++) {
      if (x < gridWidth && y < gridHeight) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "water";
          tiles[idx].isWalkable = false;
          tiles[idx].visualVariant = (x + y) % 2;
        }
      }
    }
  }

  // Decorative fountain near cafe entrance
  const fountainX = Math.floor(gridWidth * 0.5);
  const fountainY = Math.floor(gridHeight * 0.6);
  if (fountainX < gridWidth && fountainY < gridHeight) {
    const idx = fountainY * gridWidth + fountainX;
    if (
      tiles[idx] &&
      (tiles[idx].tileType === "grass" || tiles[idx].tileType === "path")
    ) {
      tiles[idx].tileType = "water";
      tiles[idx].isWalkable = false;
    }
  }

  // Small decorative pond near quad
  const quadPondX = Math.floor(gridWidth * 0.6);
  const quadPondY = Math.floor(gridHeight * 0.75);
  const quadPondWidth = Math.floor(gridWidth * 0.05);
  const quadPondHeight = Math.floor(gridHeight * 0.06);

  for (let y = quadPondY; y < quadPondY + quadPondHeight; y++) {
    for (let x = quadPondX; x < quadPondX + quadPondWidth; x++) {
      if (x < gridWidth && y < gridHeight) {
        const idx = y * gridWidth + x;
        if (tiles[idx] && tiles[idx].tileType === "grass") {
          tiles[idx].tileType = "water";
          tiles[idx].isWalkable = false;
          tiles[idx].visualVariant = (x + y) % 2;
        }
      }
    }
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
