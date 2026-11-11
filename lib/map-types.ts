export type TileType =
  | 'floor'
  | 'wall'
  | 'door'
  | 'grass'
  | 'water'
  | 'path'
  | 'void'
  | 'tall_tree'
  | 'short_tree'
  | 'bush'
  | 'flower_bed'
  | 'concrete'
  | 'brick_path'
  | 'cafe_stall'
  | 'study_desk'
  | 'bookshelf'
  | 'lounge_chair'
  | 'laundry_machine'
  | 'lecture_seat'
  | 'library_desk'
  | 'dorm_bed'
  | 'kitchen_counter';

export const TILE_VISUALS: Record<TileType, { walkable: boolean }> = {
  door: { walkable: true },
  path: { walkable: true },
  bush: { walkable: true },
  floor: { walkable: true },
  wall: { walkable: false },
  grass: { walkable: true },
  void: { walkable: false },
  water: { walkable: false },
  concrete: { walkable: true },
  dorm_bed: { walkable: false },
  tall_tree: { walkable: false },
  flower_bed: { walkable: true },
  brick_path: { walkable: true },
  bookshelf: { walkable: false },
  short_tree: { walkable: false },
  cafe_stall: { walkable: false },
  study_desk: { walkable: false },
  lounge_chair: { walkable: false },
  lecture_seat: { walkable: false },
  library_desk: { walkable: false },
  laundry_machine: { walkable: false },
  kitchen_counter: { walkable: false },
};

export interface Tile {
  x: number;
  y: number;
  tileType: TileType;
  isWalkable: boolean;
  visualVariant?: number;
  placeId?: string;
  metadata?: { biome?: string; lightLevel?: number };
}

export interface MapSettings {
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  metersPerTile: number;
  version: number;
  lastRegeneratedAt?: number;
  seed?: string;
}
