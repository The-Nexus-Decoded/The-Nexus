import { describe, expect, it } from "vitest";
import {
  MULTISHOT_ARROW_COUNT,
  QUIVER_CAPACITY,
  addArrowsToQuiver,
  commitArrowRelease,
  createQuiverInventory,
  selectArrowType,
  visibleQuiverArrowCount,
} from "../src/game/archery/archeryInventory";
import { advanceArrowProjectile, createArrowProjectile } from "../src/game/archery/arrowProjectile";

describe("archery inventory", () => {
  it("keeps separate arrow types inside a 100-arrow quiver", () => {
    const quiver = createQuiverInventory({ standard: 90, fire: 5, ice: 3, poison: 2 });
    expect(quiver.capacity).toBe(QUIVER_CAPACITY);
    expect(visibleQuiverArrowCount(quiver)).toBe(100);
    expect(addArrowsToQuiver(quiver, "fire", 10)).toBe(0);
  });

  it("depletes the visible count on committed release and preserves selection", () => {
    const quiver = createQuiverInventory({ standard: 10, ice: 4 });
    expect(selectArrowType(quiver, "ice")).toBe(true);
    expect(commitArrowRelease(quiver)).toEqual({
      released: true,
      arrowType: "ice",
      count: 1,
      remaining: 3,
    });
    expect(visibleQuiverArrowCount(quiver)).toBe(13);
  });

  it("consumes multishot atomically and never invents partial ammunition", () => {
    const quiver = createQuiverInventory({ standard: 4 });
    expect(commitArrowRelease(quiver, MULTISHOT_ARROW_COUNT).released).toBe(true);
    expect(quiver.arrows.standard).toBe(1);
    expect(commitArrowRelease(quiver, MULTISHOT_ARROW_COUNT)).toMatchObject({
      released: false,
      count: 0,
      remaining: 1,
      reason: "insufficient-arrows",
    });
    expect(quiver.arrows.standard).toBe(1);
  });
});

describe("arrow projectile", () => {
  it("flies tip-first, preserves elemental type, and emits a target hit", () => {
    const projectile = createArrowProjectile({
      id: "ice-1",
      arrowType: "ice",
      origin: [0, 1, 0],
      target: [10, 1, 0],
      speedMetersPerSecond: 20,
    });
    expect(projectile.tipDirection).toEqual([1, 0, 0]);

    const step = advanceArrowProjectile(projectile, 0.5, [{ id: "target-1", center: [10, 0.5, 0], radiusMeters: 1 }], 0);
    expect(step.projectile.state).toBe("hit");
    expect(step.projectile.tipDirection[0]).toBeCloseTo(1);
    expect(step.event).toEqual({ type: "hit", targetId: "target-1", arrowType: "ice" });
  });

  it("expires projectiles after their bounded lifetime", () => {
    const projectile = createArrowProjectile({
      id: "standard-1",
      arrowType: "standard",
      origin: [0, 0, 0],
      target: [1, 0, 0],
      lifetimeSeconds: 0.1,
    });
    const step = advanceArrowProjectile(projectile, 0.2, [], 0);
    expect(step.projectile.state).toBe("expired");
    expect(step.event).toEqual({ type: "expired" });
  });
});
