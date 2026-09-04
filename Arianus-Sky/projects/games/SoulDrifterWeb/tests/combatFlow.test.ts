import { describe, expect, it } from "vitest";
import {
  enemyDefeatVisibilityMs,
  planPursuitPath,
  planSoulwellRespawn,
  resolveMeleeTarget,
  shouldAdvanceRealTimeEnemies,
} from "../src/game/combatFlow";

describe("shared combat-flow boundaries", () => {
  it("keeps a defeated actor visible for its effective death clip plus a terminal hold", () => {
    expect(enemyDefeatVisibilityMs(2_292)).toBe(2_512);
    expect(enemyDefeatVisibilityMs(2_292, 0)).toBe(2_292);
    expect(enemyDefeatVisibilityMs(-100)).toBe(220);
  });

  it("uses an adjacent selected target, otherwise the nearest eligible adjacent target", () => {
    const targets = [
      { id: "selected-far", grid: { x: 4, y: 0 }, alive: true },
      { id: "adjacent", grid: { x: 1, y: 0 }, alive: true },
      { id: "dead-adjacent", grid: { x: 0, y: 1 }, alive: false },
    ];

    expect(resolveMeleeTarget({ x: 0, y: 0 }, "selected-far", targets, 1)?.id).toBe("adjacent");
    expect(resolveMeleeTarget({ x: 3, y: 0 }, "selected-far", targets, 1)?.id).toBe("selected-far");
  });

  it("plans pursuit to a reachable open adjacent tile around walls", () => {
    const blocked = new Set(["1,1", "2,1", "3,1"]);
    const canEnter = ({ x, y }: { x: number; y: number }): boolean => (
      x >= 0 && x <= 4 && y >= 0 && y <= 2 && !blocked.has(`${x},${y}`) && !(x === 4 && y === 1)
    );

    const path = planPursuitPath({ x: 0, y: 1 }, { x: 4, y: 1 }, canEnter);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path.at(-1)).toEqual({ x: 4, y: 0 });
  });

  it("continues earning real-time pursuit pulses while the player is running", () => {
    expect(shouldAdvanceRealTimeEnemies({
      combatStyle: "real-time",
      encounter: "skirmish",
      combatState: "resolution",
      actionBusy: false,
      playerMoving: true,
      elapsedMs: 1_500,
      intervalMs: 1_450,
    })).toBe(true);
    expect(shouldAdvanceRealTimeEnemies({
      combatStyle: "real-time",
      encounter: "skirmish",
      combatState: "defeat",
      actionBusy: false,
      playerMoving: true,
      elapsedMs: 1_500,
      intervalMs: 1_450,
    })).toBe(false);
  });

  it("recalls the actor at the Soulwell without replacing the active run state", () => {
    expect(planSoulwellRespawn({
      checkpoint: { grid: { x: 6, y: 11 }, room: "training" },
      maxHp: 50,
      maxStability: 97,
      resource: 38,
      encounter: "skirmish",
    })).toEqual({
      grid: { x: 6, y: 11 },
      room: "training",
      hp: 50,
      stability: 97,
      resource: 38,
      encounter: "skirmish",
    });
  });
});
