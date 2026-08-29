import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BREACH_V2_HUMAN_FOUNDATION_MODEL_URL,
  createBreachV2HumanFoundationActor,
} from "../src/game/dungeons/breach-v2-human-foundation-actors";

function foundationFixture(): THREE.Group {
  const root = new THREE.Group();
  const armature = new THREE.Group();
  armature.name = "HumanFoundation_Armature";
  const hips = new THREE.Group();
  hips.name = "mixamorigHips";
  hips.position.y = 1;
  armature.add(hips);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8d6758 }),
  );
  body.name = "HumanFoundation_Body";
  body.position.y = 1;
  const helper = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  helper.name = "Cube";
  const camera = new THREE.PerspectiveCamera();
  const light = new THREE.PointLight();
  root.add(armature, body, helper, camera, light);
  return root;
}

function groundedClip(name: string): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack(
      "mixamorigHips.position",
      [0, 1],
      [0, 1, 0, 0.2, 1.05, 0.1],
    ),
  ]);
}

describe("BREACH-V2 visible Human foundation actors", () => {
  it("clones, strips helpers, scales, and grounds a visible actor without owning collision", () => {
    const source = foundationFixture();
    const actor = createBreachV2HumanFoundationActor(
      source,
      groundedClip("MaleLocomotion__Idle"),
      groundedClip("MaleLocomotion__Walking"),
      { id: "ilyra", heightMeters: 1.98, role: "npc" },
    );

    for (let frame = 0; frame < 3; frame += 1) actor.update(1 / 60);
    actor.root.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(actor.model, true);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.98, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(actor.root.userData).toMatchObject({
      breachV2VisibleActor: true,
      actorRole: "npc",
      actorId: "ilyra",
      sourceModelUrl: BREACH_V2_HUMAN_FOUNDATION_MODEL_URL,
      spatialAuditExcluded: "runtime-humanoid-avatar",
      groundingStatus: "calibrated-live-pose",
      grounding: {
        clearanceMeters: expect.closeTo(0, 5),
      },
    });
    expect(actor.model.getObjectByName("HumanFoundation_Body")).toBeInstanceOf(THREE.Mesh);
    expect(actor.model.getObjectByName("Cube")).toBeUndefined();
    expect(actor.model.getObjectByProperty("type", "PerspectiveCamera")).toBeUndefined();
    expect(actor.model.getObjectByProperty("type", "PointLight")).toBeUndefined();
    expect(source.getObjectByName("Cube")).toBeDefined();

    actor.setMoving(true);
    actor.update(0.5);
    expect(actor.model.getObjectByName("mixamorigHips")!.position.toArray()).toEqual([0, 1, 0]);
    actor.setMoving(false);
    actor.dispose();
  });

  it("creates independent visible player and NPC actors from the same foundation", () => {
    const source = foundationFixture();
    const idle = groundedClip("MaleLocomotion__Idle");
    const walk = groundedClip("MaleLocomotion__Walking");
    const player = createBreachV2HumanFoundationActor(
      source,
      idle,
      walk,
      { id: "player", heightMeters: 2.06, role: "player" },
    );
    const npc = createBreachV2HumanFoundationActor(
      source,
      idle,
      walk,
      { id: "orren", heightMeters: 1.94, role: "npc" },
    );

    for (let frame = 0; frame < 3; frame += 1) {
      player.update(1 / 60);
      npc.update(1 / 60);
    }

    expect(player.root.name).toBe("breach-v2-human-foundation-player");
    expect(player.root.userData).toMatchObject({ actorId: "player", actorRole: "player" });
    expect(npc.root.name).toBe("breach-v2-human-foundation-orren");
    expect(npc.root.userData).toMatchObject({ actorId: "orren", actorRole: "npc" });
    expect(player.model).not.toBe(npc.model);
    expect(player.model.getObjectByName("Cube")).toBeUndefined();
    expect(npc.model.getObjectByName("Cube")).toBeUndefined();

    player.dispose();
    npc.dispose();
  });
});
