import type { GridPoint } from "./types";

export const TILE_WIDTH = 96;
export const TILE_HEIGHT = 48;
export const LIFT_HEIGHT = 24;

export interface ScreenPoint {
  x: number;
  y: number;
}

export function isoToScreen({ x, y, z = 0 }: GridPoint): ScreenPoint {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2) - z * LIFT_HEIGHT,
  };
}

export function screenToIso(screenX: number, screenY: number, z = 0): GridPoint {
  const liftedY = screenY + z * LIFT_HEIGHT;
  return {
    x: Math.round(screenX / TILE_WIDTH + liftedY / TILE_HEIGHT),
    y: Math.round(liftedY / TILE_HEIGHT - screenX / TILE_WIDTH),
    z,
  };
}

export function gridKey({ x, y }: GridPoint): string {
  return `${x},${y}`;
}

export function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
