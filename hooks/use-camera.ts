import { useState, useCallback, useEffect, useRef } from "react";
import type { MapSettings } from "@/lib/mapTypes";

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface UseCameraOptions {
  dimensions: { width: number; height: number };
  mapSettings: MapSettings | undefined;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function useCamera({
  dimensions,
  mapSettings,
  canvasRef,
}: UseCameraOptions) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });

  const [debouncedCamera, setDebouncedCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [initialCameraPos, setInitialCameraPos] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const isDraggingRef = useRef(false);

  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCamera(camera);
    }, 50);

    return () => clearTimeout(timer);
  }, [camera]);

  const getMinScale = useCallback(() => {
    if (!mapSettings || dimensions.width === 0 || dimensions.height === 0) {
      return 0.1;
    }

    const mapWidth = mapSettings.gridWidth * mapSettings.tileSize;
    const mapHeight = mapSettings.gridHeight * mapSettings.tileSize;

    const scaleX = dimensions.width / mapWidth;
    const scaleY = dimensions.height / mapHeight;

    return Math.max(scaleX, scaleY);
  }, [mapSettings, dimensions]);

  const constrainCamera = useCallback(
    (newCamera: CameraState): CameraState => {
      if (!mapSettings) return newCamera;

      const minScale = getMinScale();
      const constrainedScale = Math.max(minScale, Math.min(5, newCamera.scale));

      const worldWidth =
        mapSettings.gridWidth * mapSettings.tileSize * constrainedScale;
      const worldHeight =
        mapSettings.gridHeight * mapSettings.tileSize * constrainedScale;

      const maxX = 0;
      const minX = dimensions.width - worldWidth;
      const maxY = 0;
      const minY = dimensions.height - worldHeight;

      return {
        x: Math.max(minX, Math.min(maxX, newCamera.x)),
        y: Math.max(minY, Math.min(maxY, newCamera.y)),
        scale: constrainedScale,
      };
    },
    [mapSettings, dimensions, getMinScale]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapSettings) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomSpeed = 0.001;
      const zoomFactor = 1 - e.deltaY * zoomSpeed;

      setCamera((prev) => {
        const minScale = getMinScale();
        const newScale = Math.max(
          minScale,
          Math.min(5, prev.scale * zoomFactor)
        );

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - prev.x) / prev.scale;
        const worldY = (mouseY - prev.y) / prev.scale;

        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        return constrainCamera({ x: newX, y: newY, scale: newScale });
      });
    };

    // passive: false lets handleWheel preventDefault page scroll
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [mapSettings, canvasRef, constrainCamera, getMinScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !mapSettings) return;

      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;

      setCamera((prev) => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        return constrainCamera({ ...prev, x: newX, y: newY });
      });

      lastPosRef.current = { x: e.clientX, y: e.clientY };
    },
    [mapSettings, constrainCamera]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const resetCamera = useCallback(() => {
    setCamera(initialCameraPos);
  }, [initialCameraPos]);

  return {
    camera,
    debouncedCamera,
    initialCameraPos,
    setCamera,
    setInitialCameraPos,
    constrainCamera,
    isDraggingRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetCamera,
  };
}
