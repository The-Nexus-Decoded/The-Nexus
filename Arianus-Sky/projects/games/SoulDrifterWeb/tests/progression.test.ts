import { describe, expect, it } from "vitest";

import {
  awardXp,
  createProgression,
  groupXpShare,
  maxHpAtLevel,
  monsterXp,
  xpForNextLevel,
  xpToReachLevel,
} from "../src/game/progression";

describe("progression", () => {
  it("uses a monotonic level curve", () => {
    for (let level = 1; level < 12; level += 1) {
      expect(xpForNextLevel(level + 1)).toBeGreaterThan(xpForNextLevel(level));
    }
    expect(xpForNextLevel(1)).toBe(100);
  });

  it("pins the level-10 budget the Heartvale zone is tuned against", () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(10)).toBe(6420);
    expect(xpToReachLevel(11)).toBeGreaterThan(xpToReachLevel(10));
  });

  it("awards XP across multiple level-ups and grants stat points", () => {
    const start = createProgression();
    const { state, levelsGained } = awardXp(start, xpToReachLevel(4));
    expect(levelsGained).toBe(3);
    expect(state.level).toBe(4);
    expect(state.xp).toBe(0);
    expect(state.unspentStatPoints).toBe(6);
    expect(state.totalXp).toBe(xpToReachLevel(4));
  });

  it("scales monster XP by tier", () => {
    const normal = monsterXp(5, "normal");
    expect(monsterXp(5, "elite")).toBe(normal * 3);
    expect(monsterXp(5, "boss")).toBe(normal * 8);
    expect(monsterXp(1)).toBeLessThan(monsterXp(10));
  });

  it("rewards grouping instead of punishing it", () => {
    const solo = groupXpShare(100, 1);
    expect(groupXpShare(100, 3)).toBeGreaterThan(solo);
    expect(groupXpShare(100, 5)).toBeGreaterThan(groupXpShare(100, 3));
  });

  it("grows derived hp with level without touching base identity", () => {
    expect(maxHpAtLevel(30, 1)).toBe(30);
    expect(maxHpAtLevel(30, 10)).toBe(57);
  });

  it("rejects negative XP awards", () => {
    expect(() => awardXp(createProgression(), -5)).toThrow();
  });
});
