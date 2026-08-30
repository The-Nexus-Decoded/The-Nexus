import { describe, expect, it } from "vitest";
import {
  advanceArcheryPhase,
  beginArcheryAction,
  bowRangeDecision,
  cancelArcheryAction,
  commitArcheryRelease,
  displayedQuiverCount,
} from "../src/game/archery/archeryActions";
import {
  ARCHERY_ASSET_PATHS,
  CANONICAL_ARROW_LENGTH_METERS,
  CANONICAL_QUIVER_LENGTH_METERS,
  validateArcheryAssetMetrics,
} from "../src/game/archery/archeryAssetContract";
import { createQuiverInventory } from "../src/game/archery/archeryInventory";

function reachFullDraw(action: ReturnType<typeof beginArcheryAction>) {
  let state = advanceArcheryPhase(action, "reaching");
  state = advanceArcheryPhase(state, "gripped");
  state = advanceArcheryPhase(state, "extracted");
  state = advanceArcheryPhase(state, "nocked");
  return advanceArcheryPhase(state, "drawn");
}

describe("archery action ownership", () => {
  it("moves an arrow through retrieval, nock, draw, release, and projectile ownership", () => {
    const inventory = createQuiverInventory({ standard: 10 });
    let state = beginArcheryAction(inventory, "single-shot");
    expect(displayedQuiverCount(inventory, state)).toBe(10);
    state = advanceArcheryPhase(state, "reaching");
    state = advanceArcheryPhase(state, "gripped");
    expect(displayedQuiverCount(inventory, state)).toBe(9);
    state = advanceArcheryPhase(state, "extracted");
    state = advanceArcheryPhase(state, "nocked");
    state = advanceArcheryPhase(state, "drawn");
    expect(state.stringDraw).toBe(1);

    const release = commitArcheryRelease(inventory, state);
    expect(release.release.released).toBe(true);
    expect(release.state.phase).toBe("released");
    expect(release.state.stringDraw).toBe(0);
    expect(inventory.arrows.standard).toBe(9);
    expect(advanceArcheryPhase(release.state, "projectile").phase).toBe("projectile");
  });

  it("reserves three visible arrows during multishot and commits all three atomically", () => {
    const inventory = createQuiverInventory({ standard: 10 });
    const drawn = reachFullDraw(beginArcheryAction(inventory, "multishot"));
    expect(displayedQuiverCount(inventory, drawn)).toBe(7);
    expect(commitArcheryRelease(inventory, drawn).release.count).toBe(3);
    expect(inventory.arrows.standard).toBe(7);
  });

  it("can cancel retrieval without consuming inventory", () => {
    const inventory = createQuiverInventory({ standard: 10 });
    const reaching = advanceArcheryPhase(beginArcheryAction(inventory, "single-shot"), "reaching");
    expect(cancelArcheryAction(reaching).phase).toBe("stored");
    expect(inventory.arrows.standard).toBe(10);
  });

  it("uses bow strike inside minimum ranged distance", () => {
    expect(bowRangeDecision(0.5)).toBe("bow-strike");
    expect(bowRangeDecision(0.5, false)).toBe("switch-to-melee");
    expect(bowRangeDecision(4)).toBe("shoot");
  });
});

describe("archery asset acceptance contract", () => {
  it("requires independent shipping paths for quiver, harness, and four arrow types", () => {
    expect(new Set(Object.values(ARCHERY_ASSET_PATHS)).size).toBe(6);
    expect(Object.keys(ARCHERY_ASSET_PATHS)).toEqual([
      "quiver",
      "harness",
      "arrow-standard",
      "arrow-fire",
      "arrow-ice",
      "arrow-poison",
    ]);
  });

  it("accepts a thin, correctly oriented 0.94m arrow", () => {
    expect(validateArcheryAssetMetrics({
      role: "arrow-fire",
      lengthMeters: CANONICAL_ARROW_LENGTH_METERS,
      shaftRadiusMeters: 0.0045,
      forwardAxis: "+Y",
      rearAxis: "-Y",
      bakedArrowCount: 0,
      pbrMaterialCount: 2,
      rootObjectCount: 1,
    })).toEqual({ accepted: true, failures: [] });
  });

  it("rejects the thick arrow and combined quiver-arrow placeholder defects", () => {
    expect(validateArcheryAssetMetrics({
      role: "arrow-standard",
      lengthMeters: 0.8,
      shaftRadiusMeters: 0.012,
      forwardAxis: "+Y",
      rearAxis: "-Y",
      bakedArrowCount: 0,
      pbrMaterialCount: 1,
      rootObjectCount: 1,
    }).failures).toEqual(expect.arrayContaining([expect.stringMatching(/0\.94m/), expect.stringMatching(/too thick/i)]));

    expect(validateArcheryAssetMetrics({
      role: "quiver",
      lengthMeters: CANONICAL_QUIVER_LENGTH_METERS,
      forwardAxis: "+Y",
      rearAxis: "-Y",
      bakedArrowCount: 10,
      pbrMaterialCount: 1,
      rootObjectCount: 2,
    }).failures).toEqual(expect.arrayContaining([
      expect.stringMatching(/independent root/i),
      expect.stringMatching(/must not contain baked arrows/i),
    ]));
  });
});
