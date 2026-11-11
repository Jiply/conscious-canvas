import type { TileType } from '@/lib/map-types';
import { renderTile } from '@/lib/tile-renderer';
import { type Texture, type Renderer, Graphics, RenderTexture } from 'pixi.js';
const textureCache = new Map<string, Texture>();

export function getTileTexture(renderer: Renderer, tileType: TileType, tileSize: number, variant: number = 0): Texture {
  const cacheKey = `${tileType}_${variant}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;
  const graphics = new Graphics();
  renderTile(graphics, 0, 0, tileSize, tileType, variant);
  const renderTexture = RenderTexture.create({ width: tileSize, height: tileSize });
  renderer.render({ container: graphics, target: renderTexture });
  textureCache.set(cacheKey, renderTexture);
  graphics.destroy();
  return renderTexture;
}

export function preGenerateAllTileTextures(renderer: Renderer, tileSize: number, maxVariants: number = 3): void {
  const tileTypes: TileType[] = ['floor', 'wall', 'door', 'grass', 'water', 'path', 'void'];

  for (const tileType of tileTypes) {
    for (let variant = 0; variant < maxVariants; variant++) getTileTexture(renderer, tileType, tileSize, variant);
  }
}
