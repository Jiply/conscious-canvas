import { useRef, useEffect } from 'react';
import type { Tile, MapSettings } from '@/lib/map-types';
import { type Renderer, type Container, Sprite } from 'pixi.js';
import { getTileTexture, preGenerateAllTileTextures } from '@/lib/texture-generator';

export function useTileRendererCached({
  tilesLayer,
  tiles,
  mapSettings,
  isLoading,
  renderer,
  camera,
  dimensions,
}: {
  isLoading: boolean;
  tiles: Map<string, Tile>;
  renderer: Renderer | null;
  tilesLayer: Container | null;
  mapSettings: MapSettings | undefined;
  dimensions: { width: number; height: number };
  camera: { x: number; y: number; scale: number };
}) {
  const renderedSprites = useRef<Map<string, Sprite>>(new Map());
  const hasPreRendered = useRef(false);

  useEffect(() => {
    if (!renderer || !mapSettings) return;
    preGenerateAllTileTextures(renderer, mapSettings.tileSize, 3);
  }, [renderer, mapSettings]);

  useEffect(() => {
    if (!tilesLayer || !mapSettings || isLoading || !renderer) return;
    if (hasPreRendered.current) return;
    if (tiles.size === 0) return;
    const tileSize = mapSettings.tileSize;

    try {
      for (const [key, tile] of tiles.entries()) {
        if (renderedSprites.current.has(key)) continue;
        const sprite = new Sprite(getTileTexture(renderer, tile.tileType, tileSize, tile.visualVariant || 0));
        sprite.x = tile.x * tileSize;
        sprite.y = tile.y * tileSize;
        sprite.visible = true;
        tilesLayer.addChild(sprite);
        renderedSprites.current.set(key, sprite);
      }

      hasPreRendered.current = true;
    } catch {}
  }, [tilesLayer, tiles, mapSettings, isLoading, renderer]);

  useEffect(() => {
    if (!hasPreRendered.current || !mapSettings) return;
    if (renderedSprites.current.size === 0) return;
    const tileSize = mapSettings.tileSize;
    const padding = 5;
    const viewportLeft = -camera.x / camera.scale;
    const viewportTop = -camera.y / camera.scale;
    const viewportRight = (dimensions.width - camera.x) / camera.scale;
    const viewportBottom = (dimensions.height - camera.y) / camera.scale;
    const minX = Math.max(0, Math.floor(viewportLeft / tileSize) - padding);
    const minY = Math.max(0, Math.floor(viewportTop / tileSize) - padding);
    const maxX = Math.min(mapSettings.gridWidth, Math.ceil(viewportRight / tileSize) + padding);
    const maxY = Math.min(mapSettings.gridHeight, Math.ceil(viewportBottom / tileSize) + padding);

    for (const [key, sprite] of renderedSprites.current.entries()) {
      if (sprite.destroyed) continue;
      const [xStr, yStr] = key.split(',');
      const tileX = parseInt(xStr);
      const tileY = parseInt(yStr);
      sprite.visible = tileX >= minX && tileX < maxX && tileY >= minY && tileY < maxY;
    }
  }, [camera, dimensions, mapSettings]);

  useEffect(
    () => () => {
      for (const sprite of renderedSprites.current.values()) {
        if (!sprite.destroyed) sprite.destroy();
      }

      renderedSprites.current.clear();
      hasPreRendered.current = false;
    },
    []
  );
}
