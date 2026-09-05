import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";

import {
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS,
  BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL,
  BREACH_V2_HUMAN_FOUNDATION_MODEL_URL,
  BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL,
  createBreachV2HumanFoundationActor,
  createBreachV2HumanFoundationActorFactory,
} from "../src/game/dungeons/breach-v2-human-foundation-actor";
import { APPROVED_GREATSWORD_BACK_CARRY, CALIBRATION_HEIGHT_METERS } from "../src/game/humanWeaponCalibration";

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
  // The shipped 65-bone rig carries Spine2; the back carry mounts on it.
  const spine2 = new THREE.Bone();
  spine2.name = "mixamorigSpine2";
  spine2.position.y = 0.4;
  hips.add(spine2);
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
    const animations = Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name));
    const originalTracks = animations.map((animation) => [...animation.tracks[0]!.values]);
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
    expect(actor.snapshot().weaponState).toBe("unequipped");
    expect(actor.model.getObjectByName("weapon-socket-hand-r")?.visible).toBe(false);
    expect(actor.model.getObjectByName("weapon-socket-hip-l")).toBeUndefined();

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
    expect(actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack)).toBe(1);
    actor.setMoving(false);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack);
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack, 0.5);
    expect(actor.snapshot().timeSeconds).toBeCloseTo(0.5, 6);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawGreatsword);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawGreatsword, 0.4);
    expect(actor.snapshot().weaponState).toBe("drawn");
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle);
    actor.setMoving(true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk);
    actor.setMoving(true, true);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun);
    actor.setMoving(false);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle);
    actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle, 0.5);
    expect(actor.snapshot().weaponState).toBe("unequipped");
    expect(actor.model.getObjectByName("mixamorigHips")?.position.x).toBe(0);
    expect(actor.model.getObjectByName("mixamorigHips")?.position.z).toBe(0);
    expect(actor.model.getObjectByName("mixamorigHips")?.position.y).toBeCloseTo(0.05, 6);
    expect(animations.map((animation) => [...animation.tracks[0]!.values])).toEqual(originalTracks);
    actor.dispose();
    expect(() => actor.dispose()).not.toThrow();
  });

  it("fails closed when the shared locomotion inventory is incomplete", () => {
    expect(() => createBreachV2HumanFoundationActor(sourceModel(), [
      clip(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle),
    ])).toThrow(/animation library is missing/);
  });

  it("does not relabel the canonical sword as a bow, staff or shield", () => {
    const rejected = ["ProLongbow__StandingDrawArrow", "Interactions__HumanMasculineAthleticMuscularStaffButtSmash",
      "ProSwordAndShield__SwordAndShieldAttack", "ProSwordAndShield__SheathSword1", "GreatSword__DrawAGreatSword1"];
    const actor = createBreachV2HumanFoundationActor(sourceModel(), [
      ...Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)),
      ...rejected.map((name) => clip(name)),
    ], "honest-equipment", 2.06, sourceWeapon());
    expect(actor.animationNames()).toHaveLength(14);
    for (const name of rejected) {
      expect(actor.animationNames()).not.toContain(name);
      expect(() => actor.play(name)).toThrow(/Unknown Human Foundation action/);
    }
    actor.dispose();
  });

  // Two invariants that pull opposite ways at any height but 2.06. The blade is
  // modelled to scale and stays 1.05 m for every wielder; the seat is wrist to
  // fist centre, which is anatomy and tracks the body. This previously asserted
  // an absolute 0.04 m seat at all three heights -- the review lane measured that
  // same absolute seat sliding the haft 4.1-7.4 mm off the fist centre.
  it("scales the socket seat with the body and keeps the weapon its modelled length", () => {
    for (const height of [1.6, 2.06, 2.4]) {
      const actor = createBreachV2HumanFoundationActor(sourceModel(),
        Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)),
        "scale", height, sourceWeapon());
      actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle, 0.4);
      const socket = actor.model.getObjectByName("weapon-socket-hand-r")!;
      expect(socket.position.y * actor.model.scale.x, `${height} m seat`)
        .toBeCloseTo(0.04 * height / CALIBRATION_HEIGHT_METERS, 10);
      expect(socket.rotation.z).toBeCloseTo(-Math.PI / 2, 10);
      expect(socket.getWorldScale(new THREE.Vector3()).toArray()).toEqual([1, 1, 1]);
      expect(socket.localToWorld(new THREE.Vector3(0, 1.05, 0))
        .distanceTo(socket.localToWorld(new THREE.Vector3()))).toBeCloseTo(1.05, 10);
      actor.dispose();
    }
  });

  // A bare back carry: undrawn no longer means invisible. Exactly one copy shows at
  // a time, the blade keeps its modelled length at every body height, and the seat
  // tracks the body the same way the hand seat does.
  it("carries the greatsword on the back whenever it is not drawn", () => {
    for (const height of [1.5, 2.06, 2.4]) {
      const actor = createBreachV2HumanFoundationActor(sourceModel(),
        Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)),
        "back-carry", height, sourceWeapon());
      const hand = actor.model.getObjectByName("weapon-socket-hand-r")!;
      const back = actor.model.getObjectByName("weapon-socket-back")!;
      expect(back, `${height} m back socket`).toBeDefined();
      expect(back.parent?.name).toMatch(/Spine2$/);

      // Undrawn: on the back, not gone.
      actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle, 0.2);
      expect(back.visible, `${height} m undrawn back`).toBe(true);
      expect(hand.visible, `${height} m undrawn hand`).toBe(false);

      // Drawn: in the hand, and never two swords at once.
      actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle, 0.2);
      expect(hand.visible, `${height} m drawn hand`).toBe(true);
      expect(back.visible, `${height} m drawn back`).toBe(false);

      // Seat is anatomy and scales; blade is absolute and does not.
      const units = height / CALIBRATION_HEIGHT_METERS;
      APPROVED_GREATSWORD_BACK_CARRY.position.forEach((value, axis) => {
        expect(back.position.getComponent(axis) * actor.model.scale.x, `${height} m back axis ${axis}`)
          .toBeCloseTo(value * units, 10);
      });
      back.getWorldScale(new THREE.Vector3()).toArray().forEach((value, axis) => {
        expect(value, `${height} m back world scale ${axis}`).toBeCloseTo(1, 12);
      });
      expect(back.localToWorld(new THREE.Vector3(0, 1.05, 0))
        .distanceTo(back.localToWorld(new THREE.Vector3()))).toBeCloseTo(1.05, 10);
      actor.dispose();
    }
  });

  it("loads the approved body, complete library and canonical sword without the retired subset", async () => {
    const loaded: string[] = [];
    const loadAsync = vi.fn(async (url: string) => {
      loaded.push(url);
      return { scene: url.includes("weapons/") ? sourceWeapon() : sourceModel(),
        animations: Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)) } as GLTF;
    });
    const factory = await createBreachV2HumanFoundationActorFactory({ loadAsync });
    expect(loaded).toEqual([BREACH_V2_HUMAN_FOUNDATION_MODEL_URL,
      BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL, BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL]);
    const first = factory.createPlayer("first");
    const second = factory.createPlayer("second");
    first.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle, 0.5);
    expect(first.snapshot().weaponState).toBe("drawn");
    expect(second.snapshot().weaponState).toBe("unequipped");
    factory.dispose();
    expect(() => factory.createPlayer("after-dispose")).toThrow(/factory is disposed/);
  });

  it("keeps sustained armed and unarmed walking/running on one looping action for more than three cycles", () => {
    for (const armed of [false, true]) for (const running of [false, true]) {
      const actor = createBreachV2HumanFoundationActor(sourceModel(),
        Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)), "continuous", 2.06, sourceWeapon());
      if (armed) actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle);
      actor.setMoving(true, running);
      const started = actor.snapshot();
      for (let frame = 0; frame < 211; frame += 1) {
        actor.setMoving(true, running);
        actor.update(1 / 60);
        const state = actor.snapshot();
        expect(state.animation).toBe(started.animation);
        expect(state.playback.activation).toBe(started.playback.activation);
        expect(state.playback.loop).toBe("repeat");
        expect(state.timeSeconds).toBeCloseTo(((frame + 1) / 60) % 1, 8);
      }
      expect(actor.snapshot().playback.completedCycles).toBe(3);
      const phase = actor.snapshot().playback.phase;
      actor.setMoving(true, !running);
      expect(actor.snapshot().playback.phase).toBeCloseTo(phase, 10);
      actor.setMoving(false);
      expect(actor.snapshot().animation).toBe(armed
        ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle);
      actor.dispose();
    }
  });

  it("recovers a one-shot attack directly into the still-requested armed gait", () => {
    const actor = createBreachV2HumanFoundationActor(sourceModel(),
      Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).map((name) => clip(name)), "attack-recovery", 2.06, sourceWeapon());
    actor.play(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack);
    expect(actor.snapshot().playback.loop).toBe("once");
    actor.setMoving(true, true);
    actor.update(1.01);
    expect(actor.snapshot().animation).toBe(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun);
    expect(actor.snapshot().playback.loop).toBe("repeat");
    actor.dispose();
  });

  it("cleans completed downloads when another required asset fails instead of using an old fallback", async () => {
    const model = sourceModel();
    const mesh = model.children.find((node): node is THREE.Mesh => node instanceof THREE.Mesh)!;
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");
    const material = mesh.material as THREE.Material;
    const disposeMaterial = vi.spyOn(material, "dispose");
    const loadAsync = vi.fn(async (url: string) => {
      if (url === BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL) throw new Error("library unavailable");
      return { scene: model, animations: [] } as unknown as GLTF;
    });
    await expect(createBreachV2HumanFoundationActorFactory({ loadAsync })).rejects.toThrow("library unavailable");
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(loadAsync).toHaveBeenCalledTimes(3);
  });
});
