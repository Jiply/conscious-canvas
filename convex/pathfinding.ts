import { v } from "convex/values";
import { query } from "./_generated/server";

// ========== TYPES ==========

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

// ========== QUERIES ==========

/**
 * Find a path from start to goal using A* algorithm
 * Uses map tiles with isWalkable flag to determine valid paths
 */
export const findPath = query({
  args: {
    startX: v.number(),
    startY: v.number(),
    goalX: v.number(),
    goalY: v.number(),
  },
  returns: v.union(
    v.array(v.object({ x: v.number(), y: v.number() })),
    v.null()
  ),
  handler: async (ctx, args) => {
    const startNode: PathNode = {
      x: Math.round(args.startX),
      y: Math.round(args.startY),
      g: 0,
      h: heuristic(args.startX, args.startY, args.goalX, args.goalY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    const goalX = Math.round(args.goalX);
    const goalY = Math.round(args.goalY);

    // Open list (nodes to explore) - using array as priority queue
    const openList: PathNode[] = [startNode];

    // Closed set (explored nodes) - using Set for O(1) lookup
    const closedSet = new Set<string>();

    // Keep track of best node found so far
    let iterations = 0;
    const MAX_ITERATIONS = 2000; // Prevent infinite loops

    while (openList.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      // Get node with lowest f score
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      // Check if we reached the goal
      if (current.x === goalX && current.y === goalY) {
        // Reconstruct path
        return reconstructPath(current);
      }

      // Mark as explored
      closedSet.add(`${current.x},${current.y}`);

      // Get walkable neighbors
      const neighbors = await getWalkableNeighbors(ctx, current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        // Skip if already explored
        if (closedSet.has(neighborKey)) continue;

        // Calculate costs
        const g = current.g + 1; // Cost is 1 per tile (can be adjusted for diagonal)
        const h = heuristic(neighbor.x, neighbor.y, goalX, goalY);
        const f = g + h;

        // Check if neighbor is already in open list
        const existingNode = openList.find(
          (node) => node.x === neighbor.x && node.y === neighbor.y
        );

        if (existingNode) {
          // Update if we found a better path
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else {
          // Add new node to open list
          openList.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    // No path found
    console.log(
      `No path found from (${args.startX}, ${args.startY}) to (${args.goalX}, ${args.goalY}) after ${iterations} iterations`
    );
    return null;
  },
});

// ========== HELPER FUNCTIONS ==========

/**
 * Get all walkable neighbor tiles (4-directional: up, down, left, right)
 */
async function getWalkableNeighbors(
  ctx: any,
  x: number,
  y: number
): Promise<Array<{ x: number; y: number }>> {
  const neighbors: Array<{ x: number; y: number }> = [];

  // Four cardinal directions (not including diagonals for now)
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }, // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 }, // Right
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    // Query the tile from database
    const tile = await ctx.db
      .query("map_tiles")
      .withIndex("by_coordinates", (q: any) => q.eq("x", nx).eq("y", ny))
      .first();

    // Add if tile exists and is walkable
    if (tile && tile.isWalkable) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

/**
 * Manhattan distance heuristic (good for grid-based movement)
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(goalNode: PathNode): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let current: PathNode | null = goalNode;

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
}

/**
 * Calculate path length (for debugging/optimization)
 */
export const calculatePathLength = query({
  args: {
    path: v.array(v.object({ x: v.number(), y: v.number() })),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let length = 0;
    for (let i = 1; i < args.path.length; i++) {
      const dx = args.path[i].x - args.path[i - 1].x;
      const dy = args.path[i].y - args.path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  },
});
