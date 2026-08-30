import type { ArrowType } from "./archeryInventory";

export type ProjectileVec3 = readonly [number, number, number];

export interface ArrowProjectile {
  id: string;
  arrowType: ArrowType;
  position: ProjectileVec3;
  previousPosition: ProjectileVec3;
  velocity: ProjectileVec3;
  tipDirection: ProjectileVec3;
  ageSeconds: number;
  lifetimeSeconds: number;
  state: "flying" | "hit" | "expired";
  hitTargetId?: string;
}

export interface ArrowProjectileTarget {
  id: string;
  center: ProjectileVec3;
  radiusMeters: number;
}

export interface ArrowProjectileStep {
  projectile: ArrowProjectile;
  event?: { type: "hit"; targetId: string; arrowType: ArrowType } | { type: "expired" };
}

function subtract(a: ProjectileVec3, b: ProjectileVec3): ProjectileVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function magnitude(vector: ProjectileVec3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: ProjectileVec3): ProjectileVec3 {
  const length = magnitude(vector);
  if (length <= Number.EPSILON) throw new Error("Arrow projectile requires a non-zero flight direction.");
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function distancePointToSegment(point: ProjectileVec3, start: ProjectileVec3, end: ProjectileVec3): number {
  const segment = subtract(end, start);
  const toPoint = subtract(point, start);
  const lengthSquared = segment[0] ** 2 + segment[1] ** 2 + segment[2] ** 2;
  const projection = lengthSquared <= Number.EPSILON
    ? 0
    : Math.max(0, Math.min(1, (
      toPoint[0] * segment[0] + toPoint[1] * segment[1] + toPoint[2] * segment[2]
    ) / lengthSquared));
  const closest: ProjectileVec3 = [
    start[0] + segment[0] * projection,
    start[1] + segment[1] * projection,
    start[2] + segment[2] * projection,
  ];
  return magnitude(subtract(point, closest));
}

export function createArrowProjectile(input: {
  id: string;
  arrowType: ArrowType;
  origin: ProjectileVec3;
  target: ProjectileVec3;
  speedMetersPerSecond?: number;
  lifetimeSeconds?: number;
}): ArrowProjectile {
  const direction = normalize(subtract(input.target, input.origin));
  const speed = input.speedMetersPerSecond ?? 42;
  if (!Number.isFinite(speed) || speed <= 0) throw new Error("Arrow projectile speed must be positive.");
  return {
    id: input.id,
    arrowType: input.arrowType,
    position: [...input.origin],
    previousPosition: [...input.origin],
    velocity: [direction[0] * speed, direction[1] * speed, direction[2] * speed],
    tipDirection: direction,
    ageSeconds: 0,
    lifetimeSeconds: input.lifetimeSeconds ?? 5,
    state: "flying",
  };
}

export function advanceArrowProjectile(
  projectile: ArrowProjectile,
  deltaSeconds: number,
  targets: readonly ArrowProjectileTarget[] = [],
  gravityMetersPerSecondSquared = 9.81,
): ArrowProjectileStep {
  if (projectile.state !== "flying" || deltaSeconds <= 0) return { projectile: structuredClone(projectile) };
  const previousPosition: ProjectileVec3 = [...projectile.position];
  const velocity: ProjectileVec3 = [
    projectile.velocity[0],
    projectile.velocity[1] - gravityMetersPerSecondSquared * deltaSeconds,
    projectile.velocity[2],
  ];
  const position: ProjectileVec3 = [
    previousPosition[0] + velocity[0] * deltaSeconds,
    previousPosition[1] + velocity[1] * deltaSeconds,
    previousPosition[2] + velocity[2] * deltaSeconds,
  ];
  const ageSeconds = projectile.ageSeconds + deltaSeconds;
  const next: ArrowProjectile = {
    ...structuredClone(projectile),
    previousPosition,
    position,
    velocity,
    tipDirection: normalize(velocity),
    ageSeconds,
  };
  const hit = targets.find((target) => distancePointToSegment(target.center, previousPosition, position) <= target.radiusMeters);
  if (hit) {
    next.state = "hit";
    next.hitTargetId = hit.id;
    return { projectile: next, event: { type: "hit", targetId: hit.id, arrowType: next.arrowType } };
  }
  if (ageSeconds >= next.lifetimeSeconds) {
    next.state = "expired";
    return { projectile: next, event: { type: "expired" } };
  }
  return { projectile: next };
}
