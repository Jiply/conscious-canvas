import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics } from "pixi.js";

interface UsePixiAppOptions {
  width: number;
  height: number;
}

interface PixiAppRefs {
  app: Application | null;
  worldContainer: Container | null;
  tilesLayer: Container | null;
  skeletonLayer: Graphics | null;
  placesLayer: Container | null;
  agentsLayer: Container | null;
  renderer: any | null;
}

export function usePixiApp({ width, height }: UsePixiAppOptions) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const appRef = useRef<Application | null>(null);

  const worldContainerRef = useRef<Container | null>(null);

  const tilesLayerRef = useRef<Container | null>(null);

  const skeletonLayerRef = useRef<Graphics | null>(null);

  const placesLayerRef = useRef<Container | null>(null);

  const agentsLayerRef = useRef<Container | null>(null);

  const lastFrameTimeRef = useRef(performance.now());

  const [isInitialized, setIsInitialized] = useState(false);

  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!canvasRef.current || appRef.current || width === 0 || height === 0) {
      return;
    }

    const app = new Application();

    app
      .init({
        width,
        height,
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: window.devicePixelRatio * 1.5 || 2,
        autoDensity: true,
      })
      .then(() => {
        if (!canvasRef.current || !app.canvas) return;

        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;

        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        const skeletonLayer = new Graphics();
        const tilesLayer = new Container();
        const placesLayer = new Container();
        const agentsLayer = new Container();

        worldContainer.addChild(skeletonLayer);
        worldContainer.addChild(tilesLayer);
        worldContainer.addChild(placesLayer);
        worldContainer.addChild(agentsLayer);

        skeletonLayerRef.current = skeletonLayer;
        tilesLayerRef.current = tilesLayer;
        placesLayerRef.current = placesLayer;
        agentsLayerRef.current = agentsLayer;

        const fpsUpdate = () => {
          const now = performance.now();
          const delta = now - lastFrameTimeRef.current;
          const currentFps = 1000 / delta;
          setFps(Math.round(currentFps));
          lastFrameTimeRef.current = now;
        };
        app.ticker.add(fpsUpdate);

        setIsInitialized(true);
      });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        worldContainerRef.current = null;
        skeletonLayerRef.current = null;
        tilesLayerRef.current = null;
        placesLayerRef.current = null;
        agentsLayerRef.current = null;
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!appRef.current || width === 0 || height === 0) return;

    appRef.current.renderer.resize(width, height);
  }, [width, height]);

  const refs: PixiAppRefs = {
    app: appRef.current,
    worldContainer: worldContainerRef.current,
    tilesLayer: tilesLayerRef.current,
    skeletonLayer: skeletonLayerRef.current,
    placesLayer: placesLayerRef.current,
    agentsLayer: agentsLayerRef.current,
    renderer: appRef.current?.renderer || null,
  };

  return {
    canvasRef,
    refs,
    isInitialized,
    fps,
  };
}
