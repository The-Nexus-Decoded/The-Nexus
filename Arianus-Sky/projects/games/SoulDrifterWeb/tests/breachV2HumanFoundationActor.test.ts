import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS,
  createBreachV2HumanFoundationActor,
} from "../src/game/dungeons/breach-v2-human-foundation-actor";

function clip(name: string, hipY = 1): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1], [0, hipY, 0, 0.5, hipY + 0.1, 0.25]),
  ]);
}

function sourceModel(): THREE.Group {
  const model = new THREE.Group();
  const hips = new THREE.Bone();
  hips.name = "mixamorigHips";
  const hand = new THREE.Bone();
  hand.name = "mixamorigRightHand";
  hips.add(hand);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  body.position.y = 1;
  model.add(hips, body);
  return model;
}

function sourceWeapon(): THREE.Group {
  const weapon = new THREE.Group();
  weapon.name = "weapon-sword-longsword-starter-v001";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.03), new THREE.MeshBasicMaterial());
  mesh.position.y = 0.525;
  weapon.add(mesh);
  return weapon;
}

describe("BREACH-V2 Human Foundation actor", () => {
  it("keeps the visible actor separate from navigation and exposes grounded actions", () => {
    const animations = [
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawSword),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordCombatIdle),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack),
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.sheatheSword),
    ];
    const actor = createBreachV2HumanFoundationActor(
      sourceModel(),
      animations,
      "test",
      2.06,
      sourceWeapon(),
    );
    expect(actor.root.userData.breachV2VisibleActor).toBe(true);
    expect(actor.root.userData.spatialAuditExcluded).toBe("runtime-humanoid-avatar");
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle);
    expect(actor.snapshot().weaponState).toBe("sheathed");
    expect(actor.model.getObjectByName("weapon-socket-hand-r")?.visible).toBe(false);
    expect(actor.model.getObjectByName("weapon-socket-hip-l")?.visible).toBe(true);

    actor.update(1 / 60);
    actor.update(1 / 60);
    actor.update(1 / 60);
    expect(actor.snapshot().groundingStatus).toBe("calibrated-live-pose");

    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle, 0.5);
    const scrubbedIdleTime = actor.snapshot().timeSeconds;
    actor.setMoving(false);
    actor.update(0.25);
    expect(actor.snapshot().timeSeconds).toBe(scrubbedIdleTime);
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle);
    expect(actor.snapshot().timeSeconds).toBe(0);
    actor.update(0.1);
    expect(actor.snapshot().timeSeconds).toBeGreaterThan(0);

    actor.setMoving(true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk);
    actor.setMoving(true, true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run);
    expect(actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack)).toBe(1);
    actor.setMoving(false);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack);
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack, 0.5);
    expect(actor.snapshot().timeSeconds).toBeCloseTo(0.5, 6);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawSword);
    expect(actor.snapshot().weaponState).toBe("sheathed");
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawSword, 0.75);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.sheatheSword);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.sheatheSword, 0.75);
    expect(actor.snapshot().weaponState).toBe("sheathed");
    actor.dispose();
  });

  it("fails closed when the core locomotion inventory is incomplete", () => {
    expect(() => createBreachV2HumanFoundationActor(sourceModel(), [
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle),
    ])).toThrow(/core pack is missing/);
  });
});
