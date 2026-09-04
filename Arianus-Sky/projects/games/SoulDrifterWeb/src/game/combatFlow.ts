import { findPath } from "./pathfinding";
import type { CombatStyle, GridPoint, RuntimeState } from "./types";

export type ActiveEncounter = "none" | "skirmish" | "boss";

export interface CombatTargetLike {
  id: string;
  grid: GridPoint;
  alive: boolean;
}

/** Keeps the defeated actor visible through its effective clip and final pose. */
export function enemyDefeatVisibilityMs(deathDurationMs: number, terminalHoldMs = 220): number {
  const clipDuration = Number.isFinite(deathDurationMs) ? Math.max(0, deathDurationMs) : 0;
  const terminalHold = Number.isFinite(terminalHoldMs) ? Math.max(0, terminalHoldMs) : 0;
  return clipDuration + terminalHold;
}

function distance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** One target boundary for selection, range validation, facing, effects, and damage. */
export function resolveMeleeTarget<T extends CombatTargetLike>(
  attacker: GridPoint,
  selectedId: string | null,
  targets: readonly T[],
  range: number,
): T | undefined {
  const eligible = targets
    .filter((target) => target.alive && distance(attacker, target.grid) <= range)
    .sort((a, b) => distance(attacker, a.grid) - distance(attacker, b.grid) || a.id.localeCompare(b.id));
  return eligible.find((target) => target.id === selectedId) ?? eligible[0];
}

/**
 * Pursues an open tile adjacent to the moving target instead of asking A* to
 * terminate on the target's occupied tile. Every pulse calls this again, so a
 * crowd or newly occupied corridor produces a new route rather than stale steps.
 */
export function planPursuitPath(
  start: GridPoint,
  target: GridPoint,
  canEnter: (point: GridPoint) => boolean,
): GridPoint[] {
  const adjacent = [
    { x: target.x + 1, y: target.y },
    { x: target.x - 1, y: target.y },
    { x: target.x, y: target.y + 1 },
    { x: target.x, y: target.y - 1 },
  ];
  return adjacent
    .filter((point) => canEnter(point) || (point.x === start.x && point.y === start.y))
    .map((point) => ({
      point,
      path: point.x === start.x && point.y === start.y ? [] : findPath(start, point, canEnter),
    }))
    .filter(({ point, path }) => path.length > 0 || (point.x === start.x && point.y === start.y))
    .sort((a, b) => a.path.length - b.path.length
      || distance(a.point, target) - distance(b.point, target)
      || a.point.y - b.point.y
      || a.point.x - b.point.x)[0]?.path ?? [];
}

export interface RealTimePursuitState {
  combatStyle: CombatStyle;
  encounter: ActiveEncounter;
  combatState: RuntimeState;
  actionBusy: boolean;
  playerMoving: boolean;
  elapsedMs: number;
  intervalMs: number;
}

/** Player locomotion is intentionally not a pause condition for hostile AI. */
export function shouldAdvanceRealTimeEnemies(state: RealTimePursuitState): boolean {
  return state.combatStyle === "real-time"
    && state.encounter !== "none"
    && state.combatState !== "defeat"
    && !state.actionBusy
    && state.elapsedMs >= state.intervalMs;
}

export interface SoulwellCheckpoint {
  grid: GridPoint;
  room: "training" | "skirmish" | "boss";
}

export interface SoulwellRespawnInput {
  checkpoint: SoulwellCheckpoint;
  maxHp: number;
  maxStability: number;
  resource: number;
  encounter: ActiveEncounter;
}

/** Computes only actor/combat restoration; the owning World3D run is retained. */
export function planSoulwellRespawn(input: SoulwellRespawnInput): {
  grid: GridPoint;
  room: SoulwellCheckpoint["room"];
  hp: number;
  stability: number;
  resource: number;
  encounter: ActiveEncounter;
} {
  return {
    grid: { ...input.checkpoint.grid },
    room: input.checkpoint.room,
    hp: input.maxHp,
    stability: input.maxStability,
    resource: input.resource,
    encounter: input.encounter,
  };
}
