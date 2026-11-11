import { useEffect } from 'react';
import type { MapSettings } from '@/lib/map-types';
import type { Doc } from '@/convex/_generated/dataModel';
import { Text, Graphics, Container, TextStyle } from 'pixi.js';

export function usePlaceRenderer({
  placesLayer,
  places,
  mapSettings,
  isCameraReady,
}: {
  isCameraReady: boolean;
  placesLayer: Container | null;
  places: Doc<'places'>[] | undefined;
  mapSettings: MapSettings | undefined;
}) {
  useEffect(() => {
    if (!placesLayer || !places || !mapSettings || !isCameraReady) return;
    placesLayer.removeChildren();
    const tileSize = mapSettings.tileSize;
    places
      .filter(p => p.kind !== 'dorm_room' && p.kind !== 'common_room' && p.kind !== 'study_room')
      .forEach((place, index) => {
        const bounds = place.bounds;
        const centerX = (bounds.x + bounds.width / 2) * tileSize;
        const centerY = (bounds.y + bounds.height / 2) * tileSize;
        const placeContainer = new Container();
        placeContainer.alpha = 0;
        placesLayer.addChild(placeContainer);
        const outline = new Graphics();
        outline.rect(bounds.x * tileSize, bounds.y * tileSize, bounds.width * tileSize, bounds.height * tileSize);
        outline.stroke({ width: 2, alpha: 0.6, color: 0xffffff });
        placeContainer.addChild(outline);

        const label = new Text({
          text: place.name,
          style: new TextStyle({
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            stroke: { color: 0x000000, width: 3 },
            dropShadow: { blur: 2, alpha: 0.8, distance: 2, color: 0x000000, angle: Math.PI / 6 },
          }),
        });

        label.anchor.set(0.5);
        label.x = centerX;
        label.y = centerY;
        placeContainer.addChild(label);

        if (place.isIndoor && place.capacity) {
          const infoLabel = new Text({
            text: `Capacity: ${place.capacity}`,
            style: new TextStyle({
              fontSize: 10,
              fill: 0xcccccc,
              fontFamily: 'Arial, sans-serif',
              stroke: { color: 0x000000, width: 2 },
            }),
          });

          infoLabel.anchor.set(0.5);
          infoLabel.x = centerX;
          infoLabel.y = centerY + 18;
          placeContainer.addChild(infoLabel);
        }

        setTimeout(() => {
          const startTime = Date.now();

          const animate = () => {
            const progress = Math.min((Date.now() - startTime) / 300, 1);
            if (placeContainer.destroyed) return;
            placeContainer.alpha = progress;
            if (progress < 1) requestAnimationFrame(animate);
          };

          animate();
        }, index * 50);
      });
  }, [places, mapSettings, isCameraReady, placesLayer]);
}
