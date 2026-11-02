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
  floor: { walkable: true },
  wall: { walkable: false },
  door: { walkable: true },
  grass: { walkable: true },
  water: { walkable: false },
  path: { walkable: true },
  void: { walkable: false },
  tall_tree: { walkable: false },
  short_tree: { walkable: false },
  bush: { walkable: true },
  flower_bed: { walkable: true },
  concrete: { walkable: true },
  brick_path: { walkable: true },
  cafe_stall: { walkable: false },
  study_desk: { walkable: false },
  bookshelf: { walkable: false },
  lounge_chair: { walkable: false },
  laundry_machine: { walkable: false },
  lecture_seat: { walkable: false },
  library_desk: { walkable: false },
  dorm_bed: { walkable: false },
  kitchen_counter: { walkable: false },
};

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

export interface MapSettings {
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  metersPerTile: number;
  version: number;
  lastRegeneratedAt?: number;
  seed?: string;
}
