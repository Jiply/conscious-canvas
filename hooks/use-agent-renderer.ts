import { useEffect, useRef } from "react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
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

  // Helper function to get agent color based on role
  const getAgentColor = (role: string): number => {
    const colorMap: Record<string, number> = {
      student: 0x3b82f6, // blue
      prof: 0x8b5cf6, // purple
      barista: 0x10b981, // green
    };
    return colorMap[role.toLowerCase()] || 0x6b7280; // gray default
  };

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

        // Draw agent circle (16px radius = 32px diameter, 2x larger)
        const agentCircle = new Graphics();
        agentCircle.circle(0, 0, 16);
        agentCircle.fill({ color: getAgentColor(agent.role) });

        // Add a white border for visibility
        agentCircle.circle(0, 0, 16);
        agentCircle.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

        agentContainer.addChild(agentCircle);

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

        if (targetChanged) {
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

    console.log(`✅ Agent rendering: ${agents.length} agents active`);
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
