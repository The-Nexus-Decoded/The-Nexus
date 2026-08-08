import { gridKey } from "./iso";
import type { GridPoint } from "./types";

const DIRECTIONS: ReadonlyArray<GridPoint> = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function findPath(
  start: GridPoint,
  destination: GridPoint,
  canEnter: (point: GridPoint) => boolean,
): GridPoint[] {
  if (start.x === destination.x && start.y === destination.y) {
    return [];
  }

  const queue: GridPoint[] = [{ x: start.x, y: start.y }];
  const cameFrom = new Map<string, GridPoint | null>([[gridKey(start), null]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = gridKey(next);
      if (cameFrom.has(key) || !canEnter(next)) continue;

      cameFrom.set(key, current);
      if (next.x === destination.x && next.y === destination.y) {
        return reconstructPath(start, next, cameFrom);
      }
      queue.push(next);
    }
  }

  return [];
}

function reconstructPath(
  start: GridPoint,
  destination: GridPoint,
  cameFrom: Map<string, GridPoint | null>,
): GridPoint[] {
  const reversed: GridPoint[] = [destination];
  let cursor = cameFrom.get(gridKey(destination)) ?? null;

  while (cursor && (cursor.x !== start.x || cursor.y !== start.y)) {
    reversed.push(cursor);
    cursor = cameFrom.get(gridKey(cursor)) ?? null;
  }

  return reversed.reverse();
}
