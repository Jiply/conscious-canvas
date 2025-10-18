// Import React hook for side effects
import { useEffect } from "react";
// Import PixiJS classes for rendering graphics and text
import { Container, Graphics, Text, TextStyle } from "pixi.js";
// Import type definitions for Place and MapSettings
import type { Place, MapSettings } from "@/lib/mapTypes";

// Define the required options for the usePlaceRenderer hook
interface UsePlaceRendererOptions {
  placesLayer: Container | null; // PixiJS container to render places into
  places: Place[] | undefined; // Array of places to render
  mapSettings: MapSettings | undefined; // Map configuration (tile size, grid dimensions)
  isCameraReady: boolean; // Flag indicating camera is initialized
}

/**
 * Custom hook that renders places (buildings, rooms) on the map
 * Creates visual representation with outlines, labels, and capacity info
 * Implements staggered fade-in animation for visual appeal
 */
export function usePlaceRenderer({
  placesLayer,
  places,
  mapSettings,
  isCameraReady,
}: UsePlaceRendererOptions) {
  // Effect: Render all places whenever data or dependencies change
  useEffect(() => {
    // Don't render if any required data is missing
    if (!placesLayer || !places || !mapSettings || !isCameraReady) {
      return;
    }

    // Clear all existing place graphics before re-rendering
    placesLayer.removeChildren();

    // Get tile size from map settings for coordinate conversion
    const tileSize = mapSettings.tileSize;

    // Filter out small subdivisions (rooms) to avoid cluttering the map
    // Only show main places like buildings and major areas
    const mainPlaces = places.filter(
      (p) =>
        p.kind !== "dorm_room" &&
        p.kind !== "common_room" &&
        p.kind !== "study_room"
    );

    // Render each place with staggered fade-in animation
    mainPlaces.forEach((place, index) => {
      // Get the rectangular bounds of this place
      const bounds = place.bounds;
      // Calculate center point in world coordinates (for label positioning)
      const centerX = (bounds.x + bounds.width / 2) * tileSize;
      const centerY = (bounds.y + bounds.height / 2) * tileSize;

      // Create a container for this place (allows animating everything together)
      const placeContainer = new Container();
      // Start fully transparent (will fade in)
      placeContainer.alpha = 0;
      // Add to places layer
      placesLayer.addChild(placeContainer);

      // Draw place outline (rectangle around the place)
      const outline = new Graphics();
      // Define rectangle in world coordinates
      outline.rect(
        bounds.x * tileSize, // Left edge
        bounds.y * tileSize, // Top edge
        bounds.width * tileSize, // Width
        bounds.height * tileSize // Height
      );
      // Draw white semi-transparent stroke
      outline.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
      // Add outline to place container
      placeContainer.addChild(outline);

      // Create text style for place label
      const labelStyle = new TextStyle({
        fontFamily: "Arial, sans-serif", // Font family
        fontSize: 14, // Font size in pixels
        fontWeight: "bold", // Bold text
        fill: 0xffffff, // White text color
        stroke: { color: 0x000000, width: 3 }, // Black outline for readability
        dropShadow: {
          // Shadow for depth
          alpha: 0.8, // Shadow opacity
          angle: Math.PI / 6, // Shadow angle
          blur: 2, // Shadow blur amount
          color: 0x000000, // Black shadow
          distance: 2, // Shadow distance from text
        },
      });

      // Create text object with place name
      const label = new Text({
        text: place.name, // Display place name
        style: labelStyle, // Apply text style
      });
      // Center the text anchor point (for centering)
      label.anchor.set(0.5);
      // Position at center of place
      label.x = centerX;
      label.y = centerY;
      // Add label to place container
      placeContainer.addChild(label);

      // Add capacity info for indoor places (if capacity is defined)
      if (place.isIndoor && place.capacity) {
        // Create text style for capacity info (smaller and lighter than main label)
        const infoStyle = new TextStyle({
          fontFamily: "Arial, sans-serif", // Font family
          fontSize: 10, // Smaller font size
          fill: 0xcccccc, // Light gray text
          stroke: { color: 0x000000, width: 2 }, // Black outline
        });

        // Create text object showing capacity
        const infoLabel = new Text({
          text: `Capacity: ${place.capacity}`, // Display capacity number
          style: infoStyle, // Apply info style
        });
        // Center the text anchor point
        infoLabel.anchor.set(0.5);
        // Position below main label
        infoLabel.x = centerX;
        infoLabel.y = centerY + 18; // 18 pixels below main label
        // Add to place container
        placeContainer.addChild(infoLabel);
      }

      // Staggered fade-in animation (each place animates slightly after the previous one)
      setTimeout(() => {
        // Record animation start time
        const startTime = Date.now();
        // Animation duration in milliseconds
        const duration = 300;

        // Animation loop function
        const animate = () => {
          // Calculate how much time has elapsed
          const elapsed = Date.now() - startTime;
          // Calculate progress (0 to 1)
          const progress = Math.min(elapsed / duration, 1);

          // Check if container was destroyed (cleanup safety)
          if (placeContainer.destroyed) return;

          // Update opacity based on progress
          placeContainer.alpha = progress;

          // Continue animation if not complete
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        // Start animation
        animate();
      }, index * 50); // Delay by 50ms per place (staggered effect)
    });
  }, [places, mapSettings, isCameraReady, placesLayer]); // Re-run when any of these change
}
