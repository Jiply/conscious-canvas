import { Container, Application } from 'pixi.js';
import { useRef, useState, useEffect } from 'react';

export function usePixiApp({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const tilesLayerRef = useRef<Container | null>(null);
  const placesLayerRef = useRef<Container | null>(null);
  const agentsLayerRef = useRef<Container | null>(null);
  const lastFrameTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(60);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || appRef.current || width === 0 || height === 0) return;
    const app = new Application();
    app
      .init({
        width,
        height,
        antialias: true,
        autoDensity: true,
        backgroundColor: 0xffffff,
        resolution: window.devicePixelRatio * 1.5 || 2,
      })
      .then(() => {
        if (!canvasRef.current || !app.canvas) return;
        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;
        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;
        const tilesLayer = new Container();
        const placesLayer = new Container();
        const agentsLayer = new Container();
        worldContainer.addChild(tilesLayer, placesLayer, agentsLayer);
        tilesLayerRef.current = tilesLayer;
        placesLayerRef.current = placesLayer;
        agentsLayerRef.current = agentsLayer;

        app.ticker.add(() => {
          const now = performance.now();
          setFps(Math.round(1000 / (now - lastFrameTimeRef.current)));
          lastFrameTimeRef.current = now;
        });

        setIsInitialized(true);
      });

    return () => {
      if (!appRef.current) return;
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
      worldContainerRef.current = null;
      tilesLayerRef.current = null;
      placesLayerRef.current = null;
      agentsLayerRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    if (!appRef.current || width === 0 || height === 0) return;
    appRef.current.renderer.resize(width, height);
  }, [width, height]);

  return {
    fps,
    canvasRef,
    isInitialized,
    refs: {
      tilesLayer: tilesLayerRef.current,
      placesLayer: placesLayerRef.current,
      agentsLayer: agentsLayerRef.current,
      worldContainer: worldContainerRef.current,
      renderer: appRef.current?.renderer || null,
    },
  };
}
