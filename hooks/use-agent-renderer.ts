import { useEffect, useRef } from "react";
import { Container, Graphics, Text, TextStyle, Sprite, Assets } from "pixi.js";
import type { Doc } from "@/convex/_generated/dataModel";

interface AgentRendererProps {
  agentsLayer: Container | null;
  agents: Doc<"agents">[] | undefined;
  mapSettings:
    | {
        tileSize: number;
        gridWidth: number;
        gridHeight: number;
      }
    | undefined;
  isCameraReady: boolean;
}

/**
 * Map agent names to profile picture assets in /public folder
 * Only use the actual PNG files that exist: 01.png through 10.png
 */
const AGENT_PROFILE_PICTURES: Record<string, string> = {
  "Maya Chen": "/01.png",
  "Prof. James Wilson": "/02.png",
  "Zara Ahmed": "/03.png",
  "Liam O'Brien": "/04.png",
  "Sofia Martinez": "/05.png",
  "Raj Patel": "/06.png",
  "Emma Kim": "/07.png",
  "Marcus Johnson": "/08.png",
};

/**
 * Get profile picture URL for an agent
 */
const getProfilePicture = (agentName: string): string => {
  return AGENT_PROFILE_PICTURES[agentName] || "/01.png"; // Default to 01.png
};

interface AgentData {
  container: Container;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  animationStartTime: number;
  wobbleOffsetX: number;
  wobbleOffsetY: number;
  wobbleSpeed: number;
  headingRad: number;
}

export function useAgentRenderer({
  agentsLayer,
  agents,
  mapSettings,
  isCameraReady,
}: AgentRendererProps) {
  const agentContainersRef = useRef<Map<string, AgentData>>(new Map());

  // Update agent positions and create/remove agents
  useEffect(() => {
    if (!agentsLayer || !agents || !mapSettings || !isCameraReady) {
      return;
    }

    const tileSize = mapSettings.tileSize;
    const agentContainers = agentContainersRef.current;

    // Track which agents we've seen in this update
    const activeAgentIds = new Set<string>();

    agents.forEach((agent) => {
      activeAgentIds.add(agent._id);

      const targetX = agent.pos.x * tileSize;
      const targetY = agent.pos.y * tileSize;

      let agentData = agentContainers.get(agent._id);

      if (!agentData) {
        // Create new agent container
        const agentContainer = new Container();
        agentsLayer.addChild(agentContainer);

        // Draw vision radius (20 tiles = 20 * tileSize pixels)
        const visionRadius = new Graphics();
        const radiusInPixels = 20 * tileSize;
        visionRadius.circle(0, 0, radiusInPixels);
        visionRadius.fill({ color: 0x3b82f6, alpha: 0.08 }); // Blue with low opacity
        visionRadius.stroke({ width: 2, color: 0x3b82f6, alpha: 0.25 }); // Blue border
        agentContainer.addChild(visionRadius);

        // Create profile picture sprite using client-side mapping
        const profilePicUrl = getProfilePicture(agent.name);

        console.log(
          `Loading profile picture for ${agent.name}: ${profilePicUrl}`
        );

        // Create a placeholder sprite first
        const profileSprite = new Sprite();
        profileSprite.anchor.set(0.5);
        profileSprite.position.set(0, 0);

        // Create circular mask
        const circleMask = new Graphics();
        circleMask.circle(0, 0, 16);
        circleMask.fill(0xffffff);
        circleMask.alpha = 0; // Hide the mask but keep it functional

        // Add to container
        agentContainer.addChild(profileSprite);
        agentContainer.addChild(circleMask);
        profileSprite.mask = circleMask;

        // Load texture asynchronously using PixiJS Assets API
        console.log(
          `🖼️ Loading texture for ${agent.name} from: ${profilePicUrl}`
        );

        Assets.load(profilePicUrl)
          .then((texture) => {
            console.log(`  ✅ Texture loaded for ${agent.name}:`, texture);

            if (!profileSprite.destroyed) {
              profileSprite.texture = texture;

              // Size the sprite to 32px diameter (16px radius)
              const diameter = 32;
              profileSprite.width = diameter;
              profileSprite.height = diameter;

              console.log(`  ✅ Sprite updated - ${diameter}x${diameter}`);
            }
          })
          .catch((error) => {
            console.error(
              `  ❌ Failed to load texture for ${agent.name}:`,
              error
            );
          });

        // Add a white border for visibility (drawn on top)
        const border = new Graphics();
        border.circle(0, 0, 16);
        border.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
        agentContainer.addChild(border);

        // Add agent name label
        const labelStyle = new TextStyle({
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          fontWeight: "bold",
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 2.5 },
        });

        const label = new Text({
          text: agent.name,
          style: labelStyle,
        });
        label.anchor.set(0.5);
        label.y = -22; // Moved further up to accommodate larger circle
        agentContainer.addChild(label);

        // Set initial position (no animation for first appearance)
        agentContainer.x = targetX;
        agentContainer.y = targetY;

        // Store the container with position tracking
        agentData = {
          container: agentContainer,
          targetX,
          targetY,
          startX: targetX,
          startY: targetY,
          animationStartTime: performance.now(),
          wobbleOffsetX: Math.random() * Math.PI * 2, // Random phase offset
          wobbleOffsetY: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.8 + Math.random() * 0.4, // Random speed between 0.8-1.2
          headingRad: agent.headingRad,
        };
        agentContainers.set(agent._id, agentData);

        // Fade in animation
        agentContainer.alpha = 0;
        const startTime = Date.now();
        const duration = 250;

        const fadeIn = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (agentContainer.destroyed) return;

          agentContainer.alpha = progress;

          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          }
        };
        requestAnimationFrame(fadeIn);
      } else {
        // Update target position for existing agent (if it changed)
        const targetChanged =
          Math.abs(agentData.targetX - targetX) > 0.1 ||
          Math.abs(agentData.targetY - targetY) > 0.1;

        if (
          targetChanged &&
          agentData.container &&
          !agentData.container.destroyed
        ) {
          // Start new animation from current position
          agentData.startX = agentData.container.x;
          agentData.startY = agentData.container.y;
          agentData.targetX = targetX;
          agentData.targetY = targetY;
          agentData.animationStartTime = performance.now();
        }

        // Update heading if it changed
        if (Math.abs(agentData.headingRad - agent.headingRad) > 0.01) {
          agentData.headingRad = agent.headingRad;
        }
      }
    });

    // Hide agents that no longer exist (don't destroy them)
    for (const [agentId, agentData] of agentContainers.entries()) {
      if (!activeAgentIds.has(agentId)) {
        // Hide the container instead of destroying it
        agentData.container.visible = false;
        agentData.container.alpha = 0;
      } else {
        // Show the container if it exists
        agentData.container.visible = true;
        agentData.container.alpha = 1;
      }
    }
  }, [agents, mapSettings, isCameraReady, agentsLayer]);

  // Animation loop for smooth movement with wobble
  useEffect(() => {
    if (!agentsLayer || !isCameraReady) return;

    let animationFrameId: number;
    const ANIMATION_DURATION = 5000; // 5 seconds for smooth movement
    const WOBBLE_AMPLITUDE = 1; // pixels
    const WOBBLE_FREQUENCY = 2; // Hz

    const animate = () => {
      const now = performance.now();
      const agentContainers = agentContainersRef.current;

      // Clean up invalid agent data and animate valid ones
      const validAgentData: AgentData[] = [];

      for (const agentData of agentContainers.values()) {
        // Skip if container is null, destroyed, or not visible
        if (
          !agentData.container ||
          agentData.container.destroyed ||
          !agentData.container.visible
        ) {
          continue;
        }

        validAgentData.push(agentData);

        const elapsed = now - agentData.animationStartTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        // Linear interpolation for position
        const currentX =
          agentData.startX + (agentData.targetX - agentData.startX) * progress;
        const currentY =
          agentData.startY + (agentData.targetY - agentData.startY) * progress;

        // Add subtle wobble effect
        const wobbleX =
          Math.sin(
            now * 0.001 * WOBBLE_FREQUENCY * agentData.wobbleSpeed +
              agentData.wobbleOffsetX
          ) * WOBBLE_AMPLITUDE;
        const wobbleY =
          Math.sin(
            now * 0.001 * WOBBLE_FREQUENCY * agentData.wobbleSpeed +
              agentData.wobbleOffsetY
          ) * WOBBLE_AMPLITUDE;

        // Double-check container is still valid before setting position
        if (agentData.container && !agentData.container.destroyed) {
          agentData.container.x = currentX + wobbleX;
          agentData.container.y = currentY + wobbleY;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [agentsLayer, isCameraReady]);
}
