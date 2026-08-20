/**
 * BREACH-V2 generator invariants (runbook §4, issue #451).
 * Seeded generation from the flat-map-derived registry; the RNG chooses
 * subset + order, never what exists.
 */
import { describe, expect, it } from "vitest";
import {
  breachV2CellKey, generateBreachV2,
  type BreachV2PathId, type GeneratedBreachV2,
} from "../src/game/dungeons/breach-v2-generator";
import { BREACH_V2_REGISTRY as R } from "../src/game/dungeons/breach-v2-registry.mjs";

const NAV = R.units.navCellMeters;
const PATHS: BreachV2PathId[] = ["wayfarer", "oathbreaker"];

function cellAt(x: number, y: number) {
  return { col: Math.floor(x / NAV), row: Math.floor(y / NAV) };
}

function walkableKeys(gen: GeneratedBreachV2): Set<string> {
  const blocked = new Set(gen.blockedCells.map(breachV2CellKey));
  return new Set(
    gen.navCells.map(breachV2CellKey).filter((key) => !blocked.has(key)),
  );
}

function reachableCells(gen: GeneratedBreachV2): Set<string> {
  const walkable = walkableKeys(gen);
  const visited = new Set<string>();
  const start = cellAt(gen.playerStart.x, gen.playerStart.y);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = breachV2CellKey(cell);
    if (visited.has(key) || !walkable.has(key)) continue;
    visited.add(key);
    queue.push(
      { col: cell.col + 1, row: cell.row },
      { col: cell.col - 1, row: cell.row },
      { col: cell.col, row: cell.row + 1 },
      { col: cell.col, row: cell.row - 1 },
    );
  }
  return visited;
}

function hasReachableAdjacent(x: number, y: number, reachable: Set<string>): boolean {
  const cell = cellAt(x, y);
  return [
    { col: cell.col + 1, row: cell.row },
    { col: cell.col - 1, row: cell.row },
    { col: cell.col, row: cell.row + 1 },
    { col: cell.col, row: cell.row - 1 },
    cell,
  ].some((c) => reachable.has(breachV2CellKey(c)));
}

describe("BREACH-V2 seeded generator", () => {
  it("is deterministic for a recorded run seed (both paths)", () => {
    for (const pathId of PATHS) {
      expect(generateBreachV2(4182, pathId)).toEqual(generateBreachV2(4182, pathId));
    }
  });

  it("varies layout across seeds", () => {
    const a = generateBreachV2(4182, "wayfarer");
    const b = generateBreachV2(4183, "wayfarer");
    expect(a.chambers.map((c) => c.poolRoomId)).not.toEqual(b.chambers.map((c) => c.poolRoomId));
  });

  it("runs 3-5 chambers on every seed, both counts reachable across the sweep", () => {
    for (const pathId of PATHS) {
      const counts = new Set<number>();
      for (let seed = 1; seed <= 200; seed += 1) {
        const gen = generateBreachV2(seed, pathId);
        expect(gen.chamberCount).toBeGreaterThanOrEqual(3);
        expect(gen.chamberCount).toBeLessThanOrEqual(5);
        expect(gen.chambers).toHaveLength(gen.chamberCount);
        counts.add(gen.chamberCount);
      }
      expect(counts).toEqual(new Set([3, 4, 5]));
    }
  });

  it("honors pool separation and never duplicates rooms in a run", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const easy = generateBreachV2(seed, "wayfarer");
      const hard = generateBreachV2(seed, "oathbreaker");
      expect(easy.chambers.every((c) => c.poolRoomId.startsWith("E-"))).toBe(true);
      expect(hard.chambers.every((c) => c.poolRoomId.startsWith("H-"))).toBe(true);
      for (const gen of [easy, hard]) {
        expect(new Set(gen.chambers.map((c) => c.poolRoomId)).size).toBe(gen.chamberCount);
      }
    }
  });

  it("door/socket integrity: every corridor joins real door sockets", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const path = R.paths[pathId];
      // entry corridor: plaza door -> first chamber W door
      const entry = gen.corridors.find((c) => c.id === "corridor-entry")!;
      const doorLm = R.landmarks.find((l) => l.id === `door-${pathId}`)!;
      const plaza = R.fixedRooms.find((r) => r.id === "threshold-plaza")!;
      expect(entry.from.x).toBeCloseTo(plaza.x + doorLm.x, 6);
      expect(entry.from.y).toBeCloseTo(plaza.y + doorLm.y, 6);
      const first = gen.chambers[0]!;
      expect(Math.hypot(entry.to.x - first.x, entry.to.y - (first.y + first.h / 2))).toBeLessThanOrEqual(0.01);
      // out corridors: chamber E door -> next W door / convergence socket
      gen.corridors.filter((c) => c.id.startsWith("corridor-out-")).forEach((c, i) => {
        const ch = gen.chambers[i]!;
        expect(Math.hypot(c.from.x - (ch.x + ch.w), c.from.y - (ch.y + ch.h / 2))).toBeLessThanOrEqual(0.01);
        if (i + 1 < gen.chambers.length) {
          const next = gen.chambers[i + 1]!;
          expect(Math.hypot(c.to.x - next.x, c.to.y - (next.y + next.h / 2))).toBeLessThanOrEqual(0.01);
        } else {
          expect(c.to.x).toBeCloseTo(path.convergenceSocket[0], 6);
          expect(c.to.y).toBeCloseTo(path.convergenceSocket[1], 6);
        }
        expect(c.width).toBe(path.corridorWidthMeters);
      });
    }
  });

  it("keeps every objective and encounter reachable on a 500-seed sweep (both paths)", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      for (const pathId of PATHS) {
        const gen = generateBreachV2(seed, pathId);
        const reachable = reachableCells(gen);
        for (const ch of gen.chambers) {
          expect(hasReachableAdjacent(ch.x + ch.w / 2, ch.y + ch.h / 2, reachable),
            `chamber ${ch.poolRoomId} seed ${seed} ${pathId}`).toBe(true);
        }
        expect(hasReachableAdjacent(gen.boss.x, gen.boss.y, reachable), `boss seed ${seed}`).toBe(true);
        expect(hasReachableAdjacent(gen.firstMemory.x, gen.firstMemory.y, reachable), `memory ${seed}`).toBe(true);
        expect(hasReachableAdjacent(gen.exitPoint.x, gen.exitPoint.y, reachable), `exit ${seed}`).toBe(true);
        // NPCs, interactions, enemies, loot chests
        const vestibule = R.fixedRooms.find((r) => r.id === "vestibule")!;
        for (const lm of R.landmarks) {
          const room = R.fixedRooms.find((r) => r.id === lm.roomId)!;
          expect(hasReachableAdjacent(room.x + lm.x, room.y + lm.y, reachable),
            `landmark ${lm.id} seed ${seed} ${pathId}`).toBe(true);
        }
        for (const enemy of gen.enemies) {
          expect(hasReachableAdjacent(enemy.x, enemy.y, reachable),
            `enemy ${enemy.id} seed ${seed} ${pathId}`).toBe(true);
        }
        for (const chest of gen.placements.filter((p) => p.role === "loot-cache")) {
          expect(hasReachableAdjacent(chest.worldX, chest.worldY, reachable),
            `chest ${chest.roomId} seed ${seed} ${pathId}`).toBe(true);
        }
        expect(vestibule.kind).toBe("start");
      }
    }
  });

  it("never blocks doors, spawn sockets, or interaction approaches", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const pathId of PATHS) {
        const gen = generateBreachV2(seed, pathId);
        const blocked = new Set(gen.blockedCells.map(breachV2CellKey));
        const walkable = walkableKeys(gen);
        // every corridor endpoint cell stays walkable (door approach)
        for (const c of gen.corridors) {
          for (const p of [c.from, c.to]) {
            const key = breachV2CellKey(cellAt(p.x, p.y));
            expect(blocked.has(key), `door ${c.id} seed ${seed}`).toBe(false);
            expect(walkable.has(key), `door cell ${c.id} seed ${seed}`).toBe(true);
          }
        }
        // spawn sockets stay walkable
        for (const enemy of gen.enemies) {
          expect(blocked.has(breachV2CellKey(cellAt(enemy.x, enemy.y))), `spawn ${enemy.id}`).toBe(false);
        }
        // player start walkable
        expect(walkable.has(breachV2CellKey(cellAt(gen.playerStart.x, gen.playerStart.y)))).toBe(true);
      }
    }
  });

  it("exactly one boss per run, seeded pattern from the canon set", () => {
    const patterns = new Set(["cinder-sweep", "ash-call", "soul-tax"]);
    for (let seed = 1; seed <= 60; seed += 1) {
      const gen = generateBreachV2(seed, "wayfarer");
      expect(gen.boss.id).toBe("cinderbound-warden");
      expect(patterns.has(gen.boss.pattern)).toBe(true);
      expect(R.bossSet.anchorSockets.some(
        ([x, y]) => x === gen.boss.anchorSocket[0] && y === gen.boss.anchorSocket[1],
      )).toBe(true);
    }
  });

  it("easy vs hard is meaningful: enemies, pressure, rewards", () => {
    const easy = generateBreachV2(4182, "wayfarer");
    const hard = generateBreachV2(4182, "oathbreaker");
    expect(easy.enemies).toHaveLength(3);
    expect(hard.enemies).toHaveLength(5);
    expect(hard.galleryPressure).toBeGreaterThan(easy.galleryPressure);
    expect(hard.bossPressure).toBeGreaterThan(easy.bossPressure);
    expect(easy.bonusSkillAwakened).toBeNull();
    expect(typeof hard.bonusSkillAwakened).toBe("boolean");
    expect(easy.rewardId).toBe("tempered-training-gear");
    expect(hard.rewardId).toBe("grave-iron-class-implement");
  });

  it("comparison seed 4182 stays pinned (direct comparison with #450)", () => {
    // pinned snapshot — regenerate expectations ONLY via a conscious design change
    expect(generateBreachV2(4182, "wayfarer").chambers.map((c) => c.poolRoomId))
      .toEqual(["E-04", "E-05", "E-06", "E-07", "E-01"]);
    expect(generateBreachV2(4182, "oathbreaker").chambers.map((c) => c.poolRoomId))
      .toEqual(["H-04", "H-05", "H-06", "H-07", "H-01"]);
    expect(generateBreachV2(4182, "wayfarer").boss.pattern).toBe("cinder-sweep");
    expect(generateBreachV2(4182, "oathbreaker").boss.pattern).toBe("cinder-sweep");
    expect(generateBreachV2(4182, "oathbreaker").bonusSkillAwakened).toBe(true);
  });
});
