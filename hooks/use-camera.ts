import { useState, useCallback, useEffect, useRef } from 'react';
import type { MapSettings } from '@/lib/mapTypes';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

export function useCamera({
  dimensions,
  mapSettings,
  canvasRef,
}: {
  dimensions: { width: number; height: number };
  mapSettings: MapSettings | undefined;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
  const [debouncedCamera, setDebouncedCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
  const [initialCameraPos, setInitialCameraPos] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCamera(camera), 50);
    return () => clearTimeout(timer);
  }, [camera]);

  const getMinScale = useCallback(() => {
    if (!mapSettings || dimensions.width === 0 || dimensions.height === 0) return 0.1;
    return Math.max(
      dimensions.width / (mapSettings.gridWidth * mapSettings.tileSize),
      dimensions.height / (mapSettings.gridHeight * mapSettings.tileSize)
    );
  }, [mapSettings, dimensions]);

  const constrainCamera = useCallback(
    (newCamera: CameraState): CameraState => {
      if (!mapSettings) return newCamera;

      const scale = Math.max(getMinScale(), Math.min(5, newCamera.scale));
      const worldWidth = mapSettings.gridWidth * mapSettings.tileSize * scale;
      const worldHeight = mapSettings.gridHeight * mapSettings.tileSize * scale;

      return {
        x: Math.max(dimensions.width - worldWidth, Math.min(0, newCamera.x)),
        y: Math.max(dimensions.height - worldHeight, Math.min(0, newCamera.y)),
        scale,
      };
    },
    [mapSettings, dimensions, getMinScale]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapSettings) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.001;

      setCamera(prev => {
        const newScale = Math.max(getMinScale(), Math.min(5, prev.scale * zoomFactor));
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - prev.x) / prev.scale;
        const worldY = (mouseY - prev.y) / prev.scale;
        return constrainCamera({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale, scale: newScale });
      });
    };

    // passive: false lets handleWheel preventDefault page scroll
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
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
      setCamera(prev => constrainCamera({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    },
    [mapSettings, constrainCamera]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const resetCamera = useCallback(() => setCamera(initialCameraPos), [initialCameraPos]);

  return {
    camera,
    debouncedCamera,
    initialCameraPos,
    setCamera,
    setInitialCameraPos,
    isDraggingRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetCamera,
  };
}
