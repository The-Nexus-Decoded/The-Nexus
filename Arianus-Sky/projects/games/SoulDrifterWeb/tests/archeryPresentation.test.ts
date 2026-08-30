import { Group } from "three";
import { describe, expect, it, vi } from "vitest";
import { advanceArcheryPhase, beginArcheryAction, commitArcheryRelease } from "../src/game/archery/archeryActions";
import { createQuiverInventory } from "../src/game/archery/archeryInventory";
import { ArcheryPresentation } from "../src/game/archery/archeryPresentation";

function fixture() {
  const assets = {
    bow: new Group(),
    quiver: new Group(),
    harness: new Group(),
    arrows: {
      standard: new Group(),
      fire: new Group(),
      ice: new Group(),
      poison: new Group(),
    },
  };
  const roots = {
    bowHand: new Group(),
    bowBack: new Group(),
    quiverBack: new Group(),
    harnessTorso: new Group(),
    arrowHand: new Group(),
    projectileWorld: new Group(),
  };
  const applyBowStringDraw = vi.fn();
  return { assets, roots, applyBowStringDraw, presentation: new ArcheryPresentation(assets, roots, { applyBowStringDraw }) };
}

describe("archery presentation ownership", () => {
  it("keeps quiver, harness, and arrows as separate runtime objects", () => {
    const { assets, roots, presentation } = fixture();
    const inventory = createQuiverInventory({ standard: 8, fire: 1, ice: 1 });
    presentation.sync(inventory);

    expect(roots.quiverBack.getObjectByName("quiver-visual-empty")).toBeDefined();
    expect(roots.harnessTorso.getObjectByName("quiver-harness-visual")).toBeDefined();
    expect(presentation.quiverArrowInstanceCount()).toBe(10);
    expect(assets.quiver.parent).toBeNull();
    expect(assets.arrows.standard.parent).toBeNull();
  });

  it("removes only the held arrow from the visible quiver during retrieval", () => {
    const { presentation } = fixture();
    const inventory = createQuiverInventory({ standard: 10 });
    let state = advanceArcheryPhase(beginArcheryAction(inventory, "single-shot"), "reaching");
    state = advanceArcheryPhase(state, "gripped");
    presentation.sync(inventory, state);
    expect(presentation.quiverArrowInstanceCount()).toBe(9);
    expect(presentation.handArrowInstanceCount()).toBe(1);
  });

  it("draws the bow string with the nocked arrow and resets it on release", () => {
    const { presentation, applyBowStringDraw } = fixture();
    const inventory = createQuiverInventory({ standard: 10 });
    let state = beginArcheryAction(inventory, "single-shot");
    for (const phase of [
      "reaching",
      "gripped",
      "extracted",
      "overhead",
      "forward-staged",
      "nocked",
      "drawn",
    ] as const) {
      state = advanceArcheryPhase(state, phase);
    }
    presentation.sync(inventory, state);
    expect(applyBowStringDraw).toHaveBeenLastCalledWith(1);

    const released = commitArcheryRelease(inventory, state).state;
    presentation.sync(inventory, released);
    expect(applyBowStringDraw).toHaveBeenLastCalledWith(0);
    expect(presentation.handArrowInstanceCount()).toBe(0);
    expect(presentation.quiverArrowInstanceCount()).toBe(9);
  });

  it("moves one bow between hand and back without cloning or affecting quiver placement", () => {
    const { presentation, roots } = fixture();
    presentation.setBowCarryState("hand");
    expect(roots.bowHand.getObjectByName("bow-visual")).toBeDefined();
    expect(roots.bowBack.getObjectByName("bow-visual")).toBeUndefined();
    presentation.setBowCarryState("back");
    expect(roots.bowHand.getObjectByName("bow-visual")).toBeUndefined();
    expect(roots.bowBack.getObjectByName("bow-visual")).toBeDefined();
    expect(roots.quiverBack.getObjectByName("quiver-visual-empty")).toBeDefined();
  });

  it("spawns the selected elemental arrow as an independent projectile", () => {
    const { presentation, roots } = fixture();
    const projectile = presentation.spawnProjectile("poison", "shot-7");
    expect(projectile.name).toBe("projectile-arrow-shot-7");
    expect(projectile.parent).toBe(roots.projectileWorld);
  });
});
