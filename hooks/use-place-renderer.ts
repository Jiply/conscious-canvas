import { useEffect } from "react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Place, MapSettings } from "@/lib/mapTypes";

interface UsePlaceRendererOptions {
  placesLayer: Container | null;
  places: Place[] | undefined;
  mapSettings: MapSettings | undefined;
  isCameraReady: boolean;
}

export function usePlaceRenderer({
  placesLayer,
  places,
  mapSettings,
  isCameraReady,
}: UsePlaceRendererOptions) {
  useEffect(() => {
    if (!placesLayer || !places || !mapSettings || !isCameraReady) {
      return;
    }

    placesLayer.removeChildren();

    const tileSize = mapSettings.tileSize;

    const mainPlaces = places.filter(
      (p) =>
        p.kind !== "dorm_room" &&
        p.kind !== "common_room" &&
        p.kind !== "study_room"
    );

    mainPlaces.forEach((place, index) => {
      const bounds = place.bounds;
      const centerX = (bounds.x + bounds.width / 2) * tileSize;
      const centerY = (bounds.y + bounds.height / 2) * tileSize;

      const placeContainer = new Container();
      placeContainer.alpha = 0;
      placesLayer.addChild(placeContainer);

      const outline = new Graphics();
      outline.rect(
        bounds.x * tileSize,
        bounds.y * tileSize,
        bounds.width * tileSize,
        bounds.height * tileSize
      );
      outline.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
      placeContainer.addChild(outline);

      const labelStyle = new TextStyle({
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 6,
          blur: 2,
          color: 0x000000,
          distance: 2,
        },
      });

      const label = new Text({
        text: place.name,
        style: labelStyle,
      });
      label.anchor.set(0.5);
      label.x = centerX;
      label.y = centerY;
      placeContainer.addChild(label);

      if (place.isIndoor && place.capacity) {
        const infoStyle = new TextStyle({
          fontFamily: "Arial, sans-serif",
          fontSize: 10,
          fill: 0xcccccc,
          stroke: { color: 0x000000, width: 2 },
        });

        const infoLabel = new Text({
          text: `Capacity: ${place.capacity}`,
          style: infoStyle,
        });
        infoLabel.anchor.set(0.5);
        infoLabel.x = centerX;
        infoLabel.y = centerY + 18;
        placeContainer.addChild(infoLabel);
      }

      setTimeout(() => {
        const startTime = Date.now();
        const duration = 300;

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (placeContainer.destroyed) return;

          placeContainer.alpha = progress;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }, index * 50);
    });
  }, [places, mapSettings, isCameraReady, placesLayer]);
}
