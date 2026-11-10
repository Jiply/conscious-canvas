import { v, type Infer } from 'convex/values';
import type { mapTileFields } from './schema';
import { internalMutation } from './_generated/server';

type TileType = Infer<typeof mapTileFields.tileType>;

interface Entrance {
  x: number;
  y: number;
  facing?: string;
}

interface PlaceDefinition {
  kind: string;
  name: string;
  description: string;
  bounds: { x: number; y: number; width: number; height: number };
  entrances: Entrance[];
  isIndoor: boolean;
  realWorldInspiration: string;
}

const UTOWN_PLACES: PlaceDefinition[] = [
  {
    isIndoor: true,
    kind: 'library',
    name: 'Education Resource Centre',
    realWorldInspiration: 'NUS UTown ERC Library',
    bounds: { y: 20, x: 120, width: 60, height: 40 },
    description: 'Modern 3-story learning hub with study spaces, computer labs, and collaboration areas',
    entrances: [
      { y: 60, x: 150, facing: 'south' },
      { y: 40, x: 120, facing: 'west' },
      { y: 40, x: 180, facing: 'east' },
    ],
  },
  {
    isIndoor: true,
    kind: 'lecture',
    name: 'Lecture Theatre Complex',
    bounds: { x: 20, y: 40, width: 50, height: 30 },
    realWorldInspiration: 'NUS UTown Lecture Halls',
    description: 'Large lecture halls with seating for 200+ students each',
    entrances: [
      { x: 45, y: 70, facing: 'south' },
      { x: 20, y: 55, facing: 'west' },
      { x: 70, y: 55, facing: 'east' },
    ],
  },
  {
    kind: 'cafe',
    isIndoor: true,
    name: 'Town Plaza Café',
    realWorldInspiration: 'NUS UTown Town Plaza',
    bounds: { x: 80, y: 50, width: 30, height: 20 },
    description: 'Central dining hall with multiple food stations and seating areas',
    entrances: [
      { x: 80, y: 60, facing: 'west' },
      { y: 60, x: 110, facing: 'east' },
      { x: 95, y: 50, facing: 'north' },
    ],
  },
  {
    kind: 'quad',
    isIndoor: false,
    name: 'Central Green',
    bounds: { x: 90, y: 90, width: 60, height: 40 },
    realWorldInspiration: 'NUS UTown Central Green',
    description: 'Large open grass field for recreation, outdoor gatherings, and events',
    entrances: [
      { x: 90, y: 110, facing: 'west' },
      { x: 150, y: 110, facing: 'east' },
      { y: 90, x: 120, facing: 'north' },
      { x: 120, y: 130, facing: 'south' },
    ],
  },
  {
    kind: 'dorm',
    isIndoor: true,
    name: 'Student Residence',
    bounds: { x: 10, y: 90, width: 80, height: 50 },
    realWorldInspiration: 'NUS UTown Residential Halls',
    description: 'Multi-story residential building with student rooms and common areas',
    entrances: [
      { x: 50, y: 140, facing: 'south' },
      { x: 10, y: 115, facing: 'west' },
      { x: 90, y: 115, facing: 'east' },
    ],
  },
];

const INTERNAL_AREAS: PlaceDefinition[] = [
  {
    isIndoor: true,
    name: 'Computer Lab',
    kind: 'library_section',
    realWorldInspiration: 'Library Computer Lab',
    bounds: { y: 25, x: 130, width: 20, height: 15 },
    description: 'Modern computer lab with workstations and group study areas',
    entrances: [
      { y: 40, x: 140, facing: 'south' },
      { y: 32, x: 130, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'library_section',
    name: 'Quiet Study Area',
    realWorldInspiration: 'Library Quiet Zone',
    bounds: { y: 25, x: 150, width: 20, height: 15 },
    description: 'Silent study zone with individual desks and reading lamps',
    entrances: [
      { y: 40, x: 160, facing: 'south' },
      { y: 32, x: 170, facing: 'east' },
    ],
  },
  {
    isIndoor: true,
    kind: 'library_section',
    name: 'Group Study Rooms',
    realWorldInspiration: 'Library Study Rooms',
    entrances: [{ y: 40, x: 175, facing: 'south' }],
    bounds: { y: 25, x: 170, width: 10, height: 15 },
    description: 'Bookable study rooms for collaborative work',
  },

  {
    isIndoor: true,
    kind: 'cafe_stall',
    name: 'Coffee Corner',
    realWorldInspiration: 'Café Coffee Bar',
    bounds: { x: 85, y: 52, width: 8, height: 6 },
    description: 'Specialty coffee bar with espresso machines and pastries',
    entrances: [
      { x: 89, y: 58, facing: 'south' },
      { x: 85, y: 55, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'cafe_stall',
    name: 'Asian Cuisine',
    realWorldInspiration: 'Café Asian Station',
    bounds: { x: 95, y: 52, width: 8, height: 6 },
    description: 'Asian food station with rice bowls, noodles, and stir-fries',
    entrances: [
      { x: 99, y: 58, facing: 'south' },
      { x: 95, y: 55, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'cafe_stall',
    name: 'Western Grill',
    realWorldInspiration: 'Café Grill Station',
    bounds: { y: 52, x: 105, width: 8, height: 6 },
    description: 'Grill station with burgers, sandwiches, and hot meals',
    entrances: [
      { y: 58, x: 109, facing: 'south' },
      { y: 55, x: 105, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    name: 'Salad Bar',
    kind: 'cafe_stall',
    realWorldInspiration: 'Café Salad Bar',
    bounds: { x: 85, y: 60, width: 8, height: 6 },
    description: 'Fresh salad station with healthy options and dressings',
    entrances: [
      { x: 89, y: 60, facing: 'north' },
      { x: 85, y: 63, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'cafe_stall',
    name: 'Dessert Counter',
    realWorldInspiration: 'Café Dessert Station',
    bounds: { x: 95, y: 60, width: 8, height: 6 },
    description: 'Sweet treats, ice cream, and baked goods',
    entrances: [
      { x: 99, y: 60, facing: 'north' },
      { x: 95, y: 63, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'cafe_stall',
    name: 'Beverage Station',
    realWorldInspiration: 'Café Beverage Station',
    bounds: { y: 60, x: 105, width: 8, height: 6 },
    description: 'Self-serve drinks, juices, and water fountain',
    entrances: [
      { y: 60, x: 109, facing: 'north' },
      { y: 63, x: 105, facing: 'west' },
    ],
  },

  {
    isIndoor: true,
    kind: 'lecture_section',
    name: 'Main Lecture Hall A',
    realWorldInspiration: 'Lecture Hall A',
    bounds: { x: 25, y: 45, width: 20, height: 15 },
    description: 'Large lecture hall with tiered seating for 150+ students',
    entrances: [
      { x: 35, y: 60, facing: 'south' },
      { x: 25, y: 52, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    kind: 'lecture_section',
    name: 'Main Lecture Hall B',
    realWorldInspiration: 'Lecture Hall B',
    bounds: { x: 45, y: 45, width: 20, height: 15 },
    description: 'Large lecture hall with tiered seating for 150+ students',
    entrances: [
      { x: 55, y: 60, facing: 'south' },
      { x: 45, y: 52, facing: 'west' },
    ],
  },
  {
    isIndoor: true,
    name: 'Seminar Room',
    kind: 'lecture_section',
    realWorldInspiration: 'Seminar Room',
    entrances: [{ x: 32, y: 60, facing: 'south' }],
    bounds: { x: 25, y: 50, width: 15, height: 10 },
    description: 'Smaller seminar room for discussion-based classes',
  },
  {
    isIndoor: true,
    name: 'Tutorial Room',
    kind: 'lecture_section',
    realWorldInspiration: 'Tutorial Room',
    entrances: [{ x: 47, y: 60, facing: 'south' }],
    bounds: { x: 40, y: 50, width: 15, height: 10 },
    description: 'Small tutorial room for group work and presentations',
  },
];

const DORM_ROOMS: PlaceDefinition[] = [
  ...[1, 2, 3].flatMap(floor =>
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
      isIndoor: true,
      kind: 'dorm_room',
      name: `Room ${floor}0${i + 1}`,
      realWorldInspiration: 'UTown Student Room',
      description: 'Single student bedroom with desk, bed, and storage',
      bounds: { width: 6, height: 4, x: 15 + 7 * i, y: 90 + 5 * floor },
      entrances: [{ x: 18 + 7 * i, y: [99, 100, 109][floor - 1], facing: floor === 2 ? 'north' : 'south' }],
    }))
  ),
  {
    isIndoor: true,
    kind: 'common_room',
    name: 'Common Lounge',
    realWorldInspiration: 'UTown Common Lounge',
    bounds: { x: 15, y: 110, width: 20, height: 8 },
    description: 'Large shared living space with sofas, TV, and social areas',
    entrances: [
      { x: 15, y: 114, facing: 'west' },
      { x: 35, y: 114, facing: 'east' },
    ],
  },
  {
    isIndoor: true,
    kind: 'study_room',
    name: 'Study Lounge',
    realWorldInspiration: 'UTown Study Room',
    bounds: { x: 40, y: 110, width: 20, height: 8 },
    description: 'Quiet study area with desks, whiteboards, and group study spaces',
    entrances: [
      { x: 40, y: 114, facing: 'west' },
      { x: 60, y: 114, facing: 'east' },
    ],
  },
  {
    isIndoor: true,
    kind: 'laundry_room',
    name: 'Laundry Room',
    realWorldInspiration: 'UTown Laundry Room',
    bounds: { x: 65, y: 110, width: 10, height: 8 },
    entrances: [{ x: 70, y: 110, facing: 'north' }],
    description: 'Shared laundry facilities with washers and dryers',
  },
];

export const initializeMap = internalMutation({
  args: { seed: v.optional(v.string()), tileOffset: v.optional(v.number()) },
  returns: v.object({ tilesCreated: v.number(), placesCreated: v.number() }),
  handler: async (ctx, args) => {
    const gridWidth = 200;
    const gridHeight = 150;
    const seed = args.seed || `utown_${Date.now()}`;
    const tileOffset = args.tileOffset || 0;

    console.log(`🗺️  Initializing map with seed: ${seed}${tileOffset > 0 ? ` (tile offset: ${tileOffset})` : ''}`);
    console.log(`📊 Total landmarks to generate: ${UTOWN_PLACES.length + DORM_ROOMS.length + INTERNAL_AREAS.length}`);

    if (tileOffset === 0)
      await ctx.db.insert('map_settings', {
        seed,
        gridWidth,
        gridHeight,
        version: 1,
        tileSize: 32,
        metersPerTile: 1,
        lastRegeneratedAt: Date.now(),
      });

    console.log(`📍 Generating base grid (${gridWidth}×${gridHeight} = ${gridWidth * gridHeight} tiles)...`);
    const tiles: Array<{ x: number; y: number; tileType: TileType; isWalkable: boolean; visualVariant?: number }> = [];

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++)
        tiles.push({ x, y, isWalkable: true, tileType: 'grass', visualVariant: ((x + y) * 7) % 4 });
    }

    const placeIdMap = new Map<string, string>();

    if (tileOffset === 0) {
      const groups: [string, PlaceDefinition[], (d: PlaceDefinition) => number | undefined][] = [
        ['🏢 Creating main landmarks...', UTOWN_PLACES, d => (d.isIndoor ? d.bounds.width * d.bounds.height : undefined)],
        ['🚪 Creating dorm rooms...', DORM_ROOMS, () => 2],
        ['🏢 Creating internal building areas...', INTERNAL_AREAS, d => d.bounds.width * d.bounds.height],
      ];
      for (const [label, defs, capacity] of groups) {
        console.log(label);
        for (const def of defs) {
          const placeId = await ctx.db.insert('places', {
            kind: def.kind,
            name: def.name,
            bounds: def.bounds,
            isIndoor: def.isIndoor,
            capacity: capacity(def),
            entrances: def.entrances,
            description: def.description,
            metadata: { realWorldInspiration: def.realWorldInspiration },
          });
          placeIdMap.set(`${def.kind}_${def.name}`, placeId);
          console.log(`  ✓ Created ${def.name} (${def.kind})`);
        }
      }
    }

    const stamp = (
      def: PlaceDefinition,
      walled: boolean,
      placeId: string | undefined,
      interior: (x: number, y: number) => TileType,
      variant: (x: number, y: number) => number
    ) => {
      const { bounds } = def;
      const entranceSet = new Set(def.entrances.map(e => `${e.x},${e.y}`));

      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          const isEntrance = entranceSet.has(`${x},${y}`);
          const isPerimeter =
            walled &&
            (x === bounds.x || x === bounds.x + bounds.width - 1 || y === bounds.y || y === bounds.y + bounds.height - 1);
          const tile: any = {
            x,
            y,
            visualVariant: variant(x, y),
            isWalkable: isPerimeter ? isEntrance : true,
            tileType: isPerimeter ? (isEntrance ? 'door' : 'wall') : interior(x, y),
          };
          if (placeId) tile.placeId = placeId;
          tiles[y * gridWidth + x] = tile;
        }
      }
    };
    const placeIdOf = (def: PlaceDefinition) => placeIdMap.get(`${def.kind}_${def.name}`);

    console.log('🎨 Generating main landmark tiles...');
    for (const def of UTOWN_PLACES)
      stamp(
        def,
        def.isIndoor,
        def.isIndoor && def.kind !== 'dorm' ? placeIdOf(def) : undefined,
        () => (def.isIndoor ? 'floor' : 'grass'),
        (x, y) => (x * 13 + y * 17) % 3
      );

    console.log('🚪 Generating dorm room tiles...');
    for (const def of DORM_ROOMS)
      stamp(
        def,
        true,
        placeIdOf(def),
        (x, y) => (['dorm_bed', 'floor', 'study_desk', 'floor'] as const)[(x + y) % 4],
        (x, y) => (x * 7 + y * 11) % 2
      );

    console.log('🏢 Generating internal area tiles...');
    for (const def of INTERNAL_AREAS)
      stamp(
        def,
        true,
        placeIdOf(def),
        (x, y) =>
          def.kind === 'cafe_stall'
            ? 'cafe_stall'
            : def.kind === 'library_section'
              ? (['library_desk', 'bookshelf', 'floor'] as const)[(x + y) % 3]
              : def.kind === 'lecture_section'
                ? 'lecture_seat'
                : 'floor',
        (x, y) => (x * 13 + y * 17) % 3
      );

    console.log('🛤️  Adding connecting paths...');
    addConnectingPaths(tiles, gridWidth, gridHeight);

    console.log('🌳 Adding terrain variety...');
    addTerrainVariety(tiles, gridWidth, gridHeight);

    console.log('💧 Adding water features...');
    addWaterFeatures(tiles, gridWidth, gridHeight);

    console.log('🌌 Adding boundary tiles...');
    addBoundaryVoid(tiles, gridWidth, gridHeight);

    console.log('💾 Preparing tiles for database insertion...');
    const validTiles = tiles.filter(tile => tile !== undefined && tile !== null);
    console.log(`  📊 Total tiles to insert: ${validTiles.length} (filtered from ${tiles.length})`);

    const maxTilesPerCall = 15000;
    const batchSize = 100;
    let tilesCreated = 0;
    const startIdx = tileOffset;
    const endIdx = Math.min(startIdx + maxTilesPerCall, validTiles.length);

    console.log(`  → Inserting tiles ${startIdx} to ${endIdx}...`);

    for (let i = startIdx; i < endIdx; i += batchSize) {
      const batch = validTiles.slice(i, Math.min(i + batchSize, endIdx));
      await Promise.all(batch.map(tile => ctx.db.insert('map_tiles', tile as any)));
      tilesCreated += batch.length;
      if (tilesCreated % 1000 === 0 || i + batchSize >= endIdx)
        console.log(`  ✓ Inserted ${startIdx + tilesCreated}/${validTiles.length} tiles`);
    }

    if (endIdx < validTiles.length) {
      console.log(`  ⚠️  More tiles remaining: ${validTiles.length - endIdx}`);
      console.log(`  → Run: npx convex run --prod seedMap:initializeMap '{"tileOffset": ${endIdx}}'`);
    } else console.log(`  ✅ All tiles inserted!`);

    console.log('✅ Map initialization complete!');

    return { tilesCreated, placesCreated: UTOWN_PLACES.length + DORM_ROOMS.length + INTERNAL_AREAS.length };
  },
});

function convertTiles(
  tiles: any[],
  gridWidth: number,
  gridHeight: number,
  [x, y, width, height]: number[],
  to: TileType,
  isWalkable: boolean,
  variant?: (x: number, y: number) => number,
  from: TileType[] = ['grass']
): void {
  for (let ty = y; ty < Math.min(y + height, gridHeight); ty++) {
    for (let tx = x; tx < Math.min(x + width, gridWidth); tx++) {
      const tile = tiles[ty * gridWidth + tx];
      if (!tile || !from.includes(tile.tileType)) continue;
      tile.tileType = to;
      tile.isWalkable = isWalkable;
      if (variant) tile.visualVariant = variant(tx, ty);
    }
  }
}

function addConnectingPaths(tiles: any[], gridWidth: number, gridHeight: number): void {
  const w = (f: number) => Math.floor(gridWidth * f);
  const h = (f: number) => Math.floor(gridHeight * f);
  const path = (rect: number[], from?: TileType[], to: TileType = 'path') =>
    convertTiles(tiles, gridWidth, gridHeight, rect, to, true, undefined, from);

  path([0, h(0.6), gridWidth, 3]);
  path([w(0.6), h(0.7), 3, gridHeight - h(0.7)]);
  path([w(0.7), h(0.5), 3, h(0.7) - h(0.5)]);
  path([w(0.8), h(0.4), 3, h(0.6) - h(0.4)]);
  path([w(0.3), h(0.5), 3, h(0.6) - h(0.5)]);

  for (let i = 0; i < Math.min(gridWidth, gridHeight); i++) {
    const x = w(0.25) + i;
    const y = h(0.6) + i;
    if (x < gridWidth && y < gridHeight) path([x, y, 3, 3]);
  }

  for (const rect of [
    [125, 35, 55, 5],
    [140, 25, 5, 35],
    [80, 55, 35, 5],
    [95, 50, 5, 20],
    [20, 42, 50, 3],
    [35, 40, 5, 30],
    [15, 100, 70, 5],
    [35, 90, 5, 50],
    [55, 90, 5, 50],
  ])
    path(rect, ['floor']);

  for (const rect of [
    [90, 100, 60, 5],
    [90, 120, 60, 5],
    [110, 90, 5, 40],
    [130, 90, 5, 40],
  ])
    path(rect, ['grass'], 'brick_path');
}

function addTerrainVariety(tiles: any[], gridWidth: number, gridHeight: number): void {
  const w = (f: number) => Math.floor(gridWidth * f);
  const h = (f: number) => Math.floor(gridHeight * f);
  const convert = (rects: number[][], to: TileType, isWalkable: boolean, modulo: number) => {
    for (const rect of rects) convertTiles(tiles, gridWidth, gridHeight, rect, to, isWalkable, (x, y) => (x + y) % modulo);
  };

  convert(
    [
      [w(0.06), h(0.2), w(0.1), h(0.12)],
      [w(0.85), h(0.2), w(0.1), h(0.12)],
      [w(0.06), h(0.8), w(0.1), h(0.12)],
      [w(0.85), h(0.8), w(0.1), h(0.12)],
      [w(0.3), h(0.1), w(0.08), h(0.08)],
      [w(0.6), h(0.1), w(0.08), h(0.08)],
    ],
    'tall_tree',
    false,
    3
  );

  for (let y = 0; y < gridHeight; y += 8) {
    for (let x = 0; x < gridWidth; x += 12) {
      if (Math.random() < 0.3) {
        const treeX = x + Math.floor(Math.random() * 6);
        const treeY = y + Math.floor(Math.random() * 6);
        if (treeX < gridWidth && treeY < gridHeight) {
          const idx = treeY * gridWidth + treeX;
          if (tiles[idx].tileType === 'grass') {
            const treeType = Math.random() < 0.6 ? 'short_tree' : 'bush';
            tiles[idx].tileType = treeType;
            tiles[idx].isWalkable = treeType === 'bush';
            tiles[idx].visualVariant = (treeX + treeY) % 2;
          }
        }
      }
    }
  }

  convert(
    [
      [w(0.4), h(0.5), w(0.05), h(0.06)],
      [w(0.7), h(0.3), w(0.05), h(0.06)],
      [w(0.1), h(0.4), w(0.05), h(0.06)],
      [w(0.5), h(0.7), w(0.05), h(0.06)],
    ],
    'flower_bed',
    true,
    4
  );
  convert(
    [
      [w(0.5), h(0.6), w(0.1), h(0.15)],
      [w(0.2), h(0.3), w(0.08), h(0.12)],
    ],
    'concrete',
    true,
    2
  );
  convert(
    [
      [w(0.3), h(0.25), w(0.15), 2],
      [w(0.25), h(0.7), 2, h(0.2)],
      [w(0.6), h(0.75), w(0.12), 2],
    ],
    'brick_path',
    true,
    3
  );
}

function addWaterFeatures(tiles: any[], gridWidth: number, gridHeight: number): void {
  const w = (f: number) => Math.floor(gridWidth * f);
  const h = (f: number) => Math.floor(gridHeight * f);
  const variant = (x: number, y: number) => (x + y) % 2;

  convertTiles(tiles, gridWidth, gridHeight, [w(0.85), h(0.15), w(0.1), h(0.12)], 'water', false, variant);
  convertTiles(tiles, gridWidth, gridHeight, [w(0.5), h(0.6), 1, 1], 'water', false, undefined, ['grass', 'path']);
  convertTiles(tiles, gridWidth, gridHeight, [w(0.6), h(0.75), w(0.05), h(0.06)], 'water', false, variant);
}

function addBoundaryVoid(tiles: any[], gridWidth: number, gridHeight: number): void {
  for (const rect of [
    [0, 0, gridWidth, 1],
    [0, gridHeight - 1, gridWidth, 1],
    [0, 0, 1, gridHeight],
    [gridWidth - 1, 0, 1, gridHeight],
  ])
    convertTiles(tiles, gridWidth, gridHeight, rect, 'void', false);
}
