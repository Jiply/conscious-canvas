import { v } from 'convex/values';
import { query, type QueryCtx } from './_generated/server';

const heuristic = (x1: number, y1: number, x2: number, y2: number): number => Math.abs(x1 - x2) + Math.abs(y1 - y2);
interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export const findPath = query({
  returns: v.union(v.array(v.object({ x: v.number(), y: v.number() })), v.null()),
  args: { goalX: v.number(), goalY: v.number(), startX: v.number(), startY: v.number() },
  handler: async (ctx, args) => {
    const startNode: PathNode = {
      g: 0,
      f: 0,
      parent: null,
      x: Math.round(args.startX),
      y: Math.round(args.startY),
      h: heuristic(args.startX, args.startY, args.goalX, args.goalY),
    };
    startNode.f = startNode.g + startNode.h;

    const goalX = Math.round(args.goalX);
    const goalY = Math.round(args.goalY);

    const openList: PathNode[] = [startNode];

    const closedSet = new Set<string>();

    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (openList.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      if (current.x === goalX && current.y === goalY) return reconstructPath(current);

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = await getWalkableNeighbors(ctx, current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(neighborKey)) continue;

        const g = current.g + 1;
        const h = heuristic(neighbor.x, neighbor.y, goalX, goalY);
        const f = g + h;

        const existingNode = openList.find(node => node.x === neighbor.x && node.y === neighbor.y);

        if (existingNode) {
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else openList.push({ g, h, f, x: neighbor.x, y: neighbor.y, parent: current });
      }
    }

    return null;
  },
});

async function getWalkableNeighbors(ctx: QueryCtx, x: number, y: number): Promise<Array<{ x: number; y: number }>> {
  const neighbors: Array<{ x: number; y: number }> = [];

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dy: 0, dx: -1 },
    { dx: 1, dy: 0 },
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    const tile = await ctx.db
      .query('map_tiles')
      .withIndex('by_coordinates', q => q.eq('x', nx).eq('y', ny))
      .first();

    if (tile && tile.isWalkable) neighbors.push({ x: nx, y: ny });
  }

  return neighbors;
}

function reconstructPath(goalNode: PathNode): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let current: PathNode | null = goalNode;

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
}
