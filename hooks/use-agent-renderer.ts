import { useRef, useEffect } from 'react';
import { getProfilePicture } from '@/lib/utils';
import type { Id, Doc } from '@/convex/_generated/dataModel';
import { Text, Assets, Sprite, Graphics, Container, TextStyle } from 'pixi.js';

type AgentData = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  wobbleSpeed: number;
  container: Container;
  wobbleOffsetX: number;
  wobbleOffsetY: number;
  animationStartTime: number;
};

export function useAgentRenderer({
  agents,
  agentsLayer,
  mapSettings,
  onAgentClick,
  isCameraReady,
}: {
  isCameraReady: boolean;
  agentsLayer: Container | null;
  agents: Doc<`agents`>[] | undefined;
  mapSettings: { tileSize: number } | undefined;
  onAgentClick?: (agentId: Id<`agents`>) => void;
}) {
  const agentContainersRef = useRef<Map<string, AgentData>>(new Map());

  useEffect(() => {
    if (!agents || !agentsLayer || !mapSettings || !isCameraReady) return;

    const tileSize = mapSettings.tileSize;
    const agentContainers = agentContainersRef.current;
    const activeAgentIds = new Set<string>();

    agents.forEach(a => {
      activeAgentIds.add(a._id);
      const targetX = a.pos.x * tileSize;
      const targetY = a.pos.y * tileSize;
      let agentData = agentContainers.get(a._id);

      if (!agentData) {
        const agentContainer = new Container();
        agentsLayer.addChild(agentContainer);

        const visionRadius = new Graphics();
        visionRadius.circle(0, 0, 20 * tileSize);
        visionRadius.fill({ alpha: 0.08, color: 0x3b82f6 });
        visionRadius.stroke({ width: 2, alpha: 0.25, color: 0x3b82f6 });
        visionRadius.eventMode = 'none';
        agentContainer.addChild(visionRadius);

        const profileContainer = new Container();
        profileContainer.eventMode = 'static';
        profileContainer.cursor = 'pointer';

        if (onAgentClick)
          profileContainer.on('pointerdown', event => {
            event.stopPropagation();
            onAgentClick(a._id as Id<'agents'>);
          });

        const profileSprite = new Sprite();
        profileSprite.anchor.set(0.5);

        const circleMask = new Graphics();
        circleMask.circle(0, 0, 16);
        circleMask.fill(0xffffff);
        circleMask.alpha = 0;

        profileContainer.addChild(profileSprite);
        profileContainer.addChild(circleMask);
        profileSprite.mask = circleMask;

        Assets.load(getProfilePicture(a.name))
          .then(texture => {
            if (profileSprite.destroyed) return;
            profileSprite.texture = texture;
            profileSprite.width = 32;
            profileSprite.height = 32;
          })
          .catch(error => console.error(`  ❌ Failed to load texture for ${a.name}:`, error));

        const border = new Graphics();
        border.circle(0, 0, 16);
        border.stroke({ width: 2, alpha: 0.8, color: 0xffffff });
        profileContainer.addChild(border);

        profileContainer.hitArea = { contains: (x: number, y: number) => Math.sqrt(x * x + y * y) <= 18 };

        agentContainer.addChild(profileContainer);

        const label = new Text({
          text: a.name,
          style: new TextStyle({
            fontSize: 11,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            stroke: { width: 2.5, color: 0x000000 },
          }),
        });
        label.anchor.set(0.5);
        label.y = -22;
        label.eventMode = 'none';
        agentContainer.addChild(label);

        agentContainer.x = targetX;
        agentContainer.y = targetY;

        agentData = {
          targetX,
          targetY,
          startX: targetX,
          startY: targetY,
          container: agentContainer,
          animationStartTime: performance.now(),
          wobbleSpeed: 0.8 + Math.random() * 0.4,
          wobbleOffsetX: Math.random() * Math.PI * 2,
          wobbleOffsetY: Math.random() * Math.PI * 2,
        };
        agentContainers.set(a._id, agentData);

        agentContainer.alpha = 0;
        const startTime = Date.now();
        const duration = 250;

        const fadeIn = () => {
          const progress = Math.min((Date.now() - startTime) / duration, 1);
          if (agentContainer.destroyed) return;
          agentContainer.alpha = progress;
          if (progress < 1) requestAnimationFrame(fadeIn);
        };
        requestAnimationFrame(fadeIn);
      } else if (
        (Math.abs(agentData.targetX - targetX) > 0.1 || Math.abs(agentData.targetY - targetY) > 0.1) &&
        !agentData.container.destroyed
      ) {
        agentData.startX = agentData.container.x;
        agentData.startY = agentData.container.y;
        agentData.targetX = targetX;
        agentData.targetY = targetY;
        agentData.animationStartTime = performance.now();
      }
    });

    for (const [agentId, agentData] of agentContainers.entries()) {
      const isActive = activeAgentIds.has(agentId);
      agentData.container.visible = isActive;
      agentData.container.alpha = isActive ? 1 : 0;
    }
  }, [agents, mapSettings, isCameraReady, agentsLayer]);

  useEffect(() => {
    if (!agentsLayer || !isCameraReady) return;

    let animationFrameId: number;
    const ANIMATION_DURATION = 5000;
    const WOBBLE_AMPLITUDE = 1;
    const WOBBLE_FREQUENCY = 2;

    const animate = () => {
      const now = performance.now();
      for (const agentData of agentContainersRef.current.values()) {
        if (agentData.container.destroyed || !agentData.container.visible) continue;

        const progress = Math.min((now - agentData.animationStartTime) / ANIMATION_DURATION, 1);
        const currentX = agentData.startX + (agentData.targetX - agentData.startX) * progress;
        const currentY = agentData.startY + (agentData.targetY - agentData.startY) * progress;

        const wobbleX =
          Math.sin(now * 0.001 * WOBBLE_FREQUENCY * agentData.wobbleSpeed + agentData.wobbleOffsetX) * WOBBLE_AMPLITUDE;
        const wobbleY =
          Math.sin(now * 0.001 * WOBBLE_FREQUENCY * agentData.wobbleSpeed + agentData.wobbleOffsetY) * WOBBLE_AMPLITUDE;

        agentData.container.x = currentX + wobbleX;
        agentData.container.y = currentY + wobbleY;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [agentsLayer, isCameraReady]);
}
