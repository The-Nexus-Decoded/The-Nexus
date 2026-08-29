import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS,
  createBreachV2HumanFoundationActor,
} from "../src/game/dungeons/breach-v2-human-foundation-actor";

function clip(name: string, hipY = 1): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack("mixamorig:Hips.position", [0, 1], [0, hipY, 0, 0.5, hipY + 0.1, 0.25]),
  ]);
}

function sourceModel(): THREE.Group {
  const model = new THREE.Group();
  const hips = new THREE.Bone();
  hips.name = "mixamorig:Hips";
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  body.position.y = 1;
  model.add(hips, body);
  return model;
}

describe("BREACH-V2 Human Foundation actor", () => {
  it("keeps the visible actor separate from navigation and exposes grounded actions", () => {
    const animations = [
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack),
    ];
    const actor = createBreachV2HumanFoundationActor(sourceModel(), animations, "test", 2.06);
    expect(actor.root.userData.breachV2VisibleActor).toBe(true);
    expect(actor.root.userData.spatialAuditExcluded).toBe("runtime-humanoid-avatar");
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle);

    actor.update(1 / 60);
    actor.update(1 / 60);
    actor.update(1 / 60);
    expect(actor.snapshot().groundingStatus).toBe("calibrated-live-pose");

    actor.setMoving(true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk);
    actor.setMoving(true, true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run);
    expect(actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack)).toBe(1);
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack, 0.5);
    expect(actor.snapshot().timeSeconds).toBeCloseTo(0.5, 6);
    actor.dispose();
  });

  it("fails closed when the core locomotion inventory is incomplete", () => {
    expect(() => createBreachV2HumanFoundationActor(sourceModel(), [
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle),
    ])).toThrow(/core pack is missing/);
  });
});
