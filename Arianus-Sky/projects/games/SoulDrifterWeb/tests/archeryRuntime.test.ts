import { Group } from "three";
import { describe, expect, it, vi } from "vitest";
import { ARCHERY_RETRIEVAL_MARKERS } from "../src/game/archery/archeryActions";
import { ArcheryPresentation } from "../src/game/archery/archeryPresentation";
import { ArcheryRuntimeController } from "../src/game/archery/archeryRuntime";
import { createQuiverInventory } from "../src/game/archery/archeryInventory";

function fixture(count = 10) {
  const inventory = createQuiverInventory({ standard: count });
  const projectileWorld = new Group();
  const presentation = new ArcheryPresentation({
    bow: new Group(),
    quiver: new Group(),
    harness: new Group(),
    arrows: { standard: new Group(), fire: new Group(), ice: new Group(), poison: new Group() },
  }, {
    bowHand: new Group(),
    bowBack: new Group(),
    quiverBack: new Group(),
    harnessTorso: new Group(),
    arrowHand: new Group(),
    projectileWorld,
  }, { applyBowStringDraw: vi.fn() });
  return { inventory, presentation, projectileWorld, runtime: new ArcheryRuntimeController(inventory, presentation) };
}

function reachFullDraw(runtime: ArcheryRuntimeController, action: "single-shot" | "multishot") {
  runtime.begin(action);
  runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.nocked);
  return runtime.draw();
}

describe("archery runtime controller", () => {
  it("synchronizes retrieval ownership, release-time depletion, projectile flight, and recovery", () => {
    const { inventory, presentation, projectileWorld, runtime } = fixture();
    runtime.begin("single-shot");
    expect(presentation.quiverArrowInstanceCount()).toBe(10);
    runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.featherGrip);
    expect(runtime.state()?.phase).toBe("gripped");
    expect(presentation.quiverArrowInstanceCount()).toBe(9);
    expect(presentation.handArrowInstanceCount()).toBe(1);
    runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.nocked);
    runtime.draw();
    expect(inventory.arrows.standard).toBe(10);

    const released = runtime.release([0, 1, 0], [[4, 1, 0]]);
    expect(released.release.released).toBe(true);
    expect(inventory.arrows.standard).toBe(9);
    expect(runtime.state()?.phase).toBe("projectile");
    expect(projectileWorld.children).toHaveLength(1);
    expect(presentation.handArrowInstanceCount()).toBe(0);

    const events = runtime.step(0.1, [{ id: "target", center: [4, 0.9, 0], radiusMeters: 0.5 }]);
    expect(events).toEqual([{ type: "hit", targetId: "target", arrowType: "standard", projectileId: "arrow-1" }]);
    expect(projectileWorld.children).toHaveLength(0);
    expect(runtime.state()?.phase).toBe("recovered");
  });

  it("creates three independently simulated projectiles for multishot", () => {
    const { inventory, runtime } = fixture();
    reachFullDraw(runtime, "multishot");
    const released = runtime.release([0, 1, 0], [[5, 1.2, -0.4], [5, 1.2, 0], [5, 1.2, 0.4]]);
    expect(released.projectiles).toHaveLength(3);
    expect(new Set(released.projectiles.map(({ id }) => id)).size).toBe(3);
    expect(inventory.arrows.standard).toBe(7);
    expect(runtime.activeProjectiles()).toHaveLength(3);
  });

  it("does not consume arrows or spawn visuals when an atomic multishot loses inventory before release", () => {
    const { inventory, projectileWorld, runtime } = fixture(3);
    reachFullDraw(runtime, "multishot");
    inventory.arrows.standard = 2;
    const released = runtime.release([0, 1, 0], [[5, 1, -0.4], [5, 1, 0], [5, 1, 0.4]]);
    expect(released.release).toMatchObject({ released: false, reason: "insufficient-arrows" });
    expect(inventory.arrows.standard).toBe(2);
    expect(projectileWorld.children).toHaveLength(0);
    expect(runtime.state()?.phase).toBe("drawn");
  });

  it("rejects backward retrieval scrubbing and target-count mismatches", () => {
    const { runtime } = fixture();
    runtime.begin("single-shot");
    runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.overhead);
    expect(() => runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.featherGrip)).toThrow(/cannot move backward/i);
    runtime.setRetrievalTime(ARCHERY_RETRIEVAL_MARKERS.nocked);
    runtime.draw();
    expect(() => runtime.release([0, 1, 0], [])).toThrow(/Expected 1 projectile target/i);
  });
});
