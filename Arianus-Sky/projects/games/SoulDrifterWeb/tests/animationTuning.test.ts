import { describe, expect, it } from "vitest";
import {
  AnimationTuningRegistry,
  MAX_ANIMATION_SPEED,
  MIN_ANIMATION_SPEED,
  normalizeAnimationTuningDocument,
  resolveAnimationPlaybackRate,
} from "../src/game/animationTuning";

describe("animation tuning", () => {
  it("composes global, race, calling, race-calling, animation, and animation-calling speeds", () => {
    const document = normalizeAnimationTuningDocument({
      schemaVersion: 1,
      revision: "admin-42",
      globalSpeed: 0.9,
      raceSpeed: { Elf: 1.1 },
      callingSpeed: { Shadowknight: 0.95 },
      raceCallingSpeed: { "Elf:Shadowknight": 1.05 },
      animationSpeed: { WeaponStrikeBaseline: 0.8 },
      animationCallingSpeed: { WeaponStrikeBaseline: { Shadowknight: 0.75 } },
    });
    expect(resolveAnimationPlaybackRate(1, {
      clipName: "WeaponStrikeBaseline",
      raceId: "elf",
      callingId: "shadowknight",
    }, document)).toBeCloseTo(0.9 * 1.1 * 0.95 * 1.05 * 0.8 * 0.75, 8);
  });

  it("clamps unsafe admin values and falls back from malformed documents", () => {
    const malformed = normalizeAnimationTuningDocument({ schemaVersion: 99, globalSpeed: 100 });
    expect(resolveAnimationPlaybackRate(100, { clipName: "Idle", raceId: "human", callingId: "mage" }, malformed)).toBe(MAX_ANIMATION_SPEED);
    expect(resolveAnimationPlaybackRate(0.001, { clipName: "Idle", raceId: "human", callingId: "mage" }, malformed)).toBe(MIN_ANIMATION_SPEED);
  });

  it("lets a future admin/backend replace the live document without rebuilding assets", () => {
    const registry = new AnimationTuningRegistry();
    expect(registry.resolve(1, { clipName: "RunBaseline", raceId: "human", callingId: "warrior" })).toBe(1);
    registry.replace({ schemaVersion: 1, revision: "admin-live", globalSpeed: 0.8, animationSpeed: { RunBaseline: 1.25 } });
    expect(registry.resolve(1, { clipName: "RunBaseline", raceId: "human", callingId: "warrior" })).toBe(1);
    expect(registry.snapshot().revision).toBe("admin-live");
  });
});
