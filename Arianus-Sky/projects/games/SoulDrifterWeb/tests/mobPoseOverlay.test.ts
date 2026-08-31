import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createMobPoseOverlay } from "../src/review/weapon-lab/mob-pose-overlay";

/** Small real skin: each influence row belongs to one vertex. */
function rig(names: string[], rows?: number[][]) {
  const model = new THREE.Group();
  const bones = names.map((name) => Object.assign(new THREE.Bone(), { name }));
  for (const bone of bones) model.add(bone);
  const influences = rows ?? names.map((_, index) => [index]);
  const indices = influences.flatMap((row) => [...row, 0, 0, 0, 0].slice(0, 4));
  const weights = influences.flatMap((row) => [0, 1, 2, 3].map((slot) => slot < row.length ? 1 / row.length : 0));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(influences.length * 3), 3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  model.add(mesh);
  mesh.bind(new THREE.Skeleton(bones));
  return { model, mesh, bones };
}

describe("mob draft pose overlay", () => {
  it("uses actual loaded and source bone spellings, not dummy groups or unknown anatomy", () => {
    const { model } = rig(["front_hand.R", "front_handL", "rear_thighR", "tail005", "spine001", "unknown"]);
    const dummy = new THREE.Group();
    dummy.name = "jaw";
    model.add(dummy);
    const overlay = createMobPoseOverlay(model, "breachling");
    expect(overlay.controls.map((control) => control.id)).toEqual([
      "rightPawPitch", "rightPawSpread", "rightHipPitch", "leftPawPitch", "leftPawSpread",
      "spineBend", "tail5Sweep", "tail5Pitch",
    ]);
    expect(overlay.controls.find((control) => control.id === "rightPawPitch")?.bone).toBe("front_hand.R");
    expect(overlay.controls.find((control) => control.id === "leftPawPitch")?.bone).toBe("front_handL");
    expect(overlay.audit().bones).toHaveLength(6);
    expect(overlay.audit().skippedControls).toContainEqual({
      id: "jawOpen", bone: "jaw", reason: "bone not present in skin",
    });
    expect(Object.isFrozen(overlay.controls)).toBe(true);
    expect(Object.isFrozen(overlay.controls[0])).toBe(true);
  });

  it("counts a vertex only once per joint and permits weighted descendants but no fake Warden hand", () => {
    const { model, bones } = rig(["upper_arm_R", "lower_arm_R", "hand_R", "hand_L"], [[1, 1], [1], [3]]);
    bones[0]!.add(bones[1]!);
    bones[1]!.add(bones[2]!);
    const overlay = createMobPoseOverlay(model, "warden");
    expect(overlay.audit().bones).toContainEqual({ name: "upper_arm_R", directWeightedVertices: 0, hasWeightedDescendants: true });
    expect(overlay.audit().bones).toContainEqual({ name: "lower_arm_R", directWeightedVertices: 2, hasWeightedDescendants: false });
    expect(overlay.audit().bones).toContainEqual({ name: "hand_R", directWeightedVertices: 0, hasWeightedDescendants: false });
    expect(overlay.controls.map((control) => control.id)).toContain("rightShoulderPitch");
    expect(overlay.controls.find((control) => control.id === "rightBladeAngle")?.bone).toBe("lower_arm_R");
    expect(overlay.controls.map((control) => control.id)).toContain("leftHandPitch");
    expect(overlay.controls.some((control) => control.bone === "hand_R")).toBe(false);
    expect(overlay.audit().warnings.some((warning) => warning.includes("not independently weighted"))).toBe(true);
  });

  it("does not expose an empty, malformed or ambiguously named rig as functional", () => {
    const empty = createMobPoseOverlay(new THREE.Group(), "breachling");
    expect(empty.controls).toHaveLength(0);
    expect(() => { empty.apply(); empty.restore(); empty.reset(); empty.dispose(); }).not.toThrow();
    const ambiguous = rig(["front_hand.R", "front_handR"]);
    const overlay = createMobPoseOverlay(ambiguous.model, "breachling");
    expect(overlay.controls).toHaveLength(0);
    expect(overlay.audit().skippedControls).toContainEqual({
      id: "rightPawPitch", bone: "front_hand.R", reason: "ambiguous bone name",
    });
    ambiguous.mesh.geometry.deleteAttribute("skinWeight");
    const malformed = createMobPoseOverlay(ambiguous.model, "breachling");
    expect(malformed.controls).toHaveLength(0);
    expect(malformed.audit().warnings.some((warning) => warning.includes("Skin attributes unavailable"))).toBe(true);
  });

  it("applies independent local quaternion offsets without root translation or paused drift", () => {
    const { model, bones } = rig(["front_handR", "front_handL"]);
    const right = bones[0]!;
    const left = bones[1]!;
    right.rotation.set(0.2, -0.1, 0.3);
    left.rotation.set(-0.3, 0.2, 0.1);
    model.position.set(4, 8, 12);
    const original = right.quaternion.clone();
    const untouched = left.quaternion.clone();
    const overlay = createMobPoseOverlay(model, "breachling");
    overlay.apply();
    expect(right.quaternion.toArray()).toEqual(original.toArray());
    overlay.setValues({ rightPawPitch: 20, rightPawSpread: -10 });
    const expected = original.clone()
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(20)))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-10)));
    for (let sample = 0; sample < 100; sample += 1) overlay.apply();
    expect(right.quaternion.toArray()).toEqual(expected.toArray());
    expect(left.quaternion.toArray()).toEqual(untouched.toArray());
    expect(model.position.toArray()).toEqual([4, 8, 12]);
    overlay.restore();
    overlay.restore();
    expect(right.quaternion.toArray()).toEqual(original.toArray());
    overlay.setValue("leftPawPitch", 12);
    overlay.apply();
    expect(left.quaternion.toArray()).not.toEqual(untouched.toArray());
    overlay.reset();
    expect(right.quaternion.toArray()).toEqual(original.toArray());
    expect(left.quaternion.toArray()).toEqual(untouched.toArray());
    expect(Object.values(overlay.values()).every((value) => value === 0)).toBe(true);
  });

  it("restores before the mixer and retains fresh clip poses without changing clip arrays", () => {
    const { model, bones } = rig(["front_handR", "front_handL"]);
    const right = bones[0]!;
    const first = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.2, 0.3));
    const second = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.1, -0.2));
    const clip = new THREE.AnimationClip("first", 1, [
      new THREE.QuaternionKeyframeTrack("front_handR.quaternion", [0, 1], [...first.toArray(), ...second.toArray()]),
    ]);
    const source = Array.from(clip.tracks[0]!.values);
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(clip).play();
    const overlay = createMobPoseOverlay(model, "breachling");
    overlay.setValues({ rightPawPitch: 10, leftPawPitch: 15 });
    for (let sample = 0; sample < 100; sample += 1) {
      overlay.restore();
      action.time = 0.5;
      mixer.update(0);
      const evaluated = right.quaternion.clone();
      overlay.apply();
      overlay.restore();
      expect(right.quaternion.toArray()).toEqual(evaluated.toArray());
      expect(bones[1]!.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    }
    expect(Array.from(clip.tracks[0]!.values)).toEqual(source);
    overlay.restore();
    mixer.stopAllAction();
    const nextClip = new THREE.AnimationClip("next", 1, [
      new THREE.QuaternionKeyframeTrack("front_handR.quaternion", [0, 1], [...second.toArray(), ...second.toArray()]),
    ]);
    mixer.clipAction(nextClip).play();
    mixer.update(0);
    const cleanNextPose = right.quaternion.clone();
    overlay.setValues({});
    overlay.apply();
    expect(right.quaternion.toArray()).toEqual(cleanNextPose.toArray());
    mixer.stopAllAction();
  });

  it("validates and clamps atomically and never shares draft values or audits", () => {
    const overlay = createMobPoseOverlay(rig(["front_handR", "front_handL"]).model, "breachling");
    const other = createMobPoseOverlay(rig(["front_handR", "front_handL"]).model, "breachling");
    const source = { rightPawPitch: 14, leftPawPitch: 7 };
    overlay.setValues(source);
    source.rightPawPitch = 29;
    const exported = overlay.values();
    exported.leftPawPitch = 29;
    expect(overlay.values().rightPawPitch).toBe(14);
    expect(overlay.values().leftPawPitch).toBe(7);
    expect(other.values().rightPawPitch).toBe(0);
    expect(() => overlay.setValues({ rightPawPitch: 25, invalid: 1 })).toThrow("Unknown");
    expect(() => overlay.setValues({ rightPawPitch: 25, leftPawPitch: NaN })).toThrow("finite");
    expect(overlay.values().rightPawPitch).toBe(14);
    expect(() => overlay.setValue("rightPawPitch", Infinity)).toThrow("finite");
    expect(() => overlay.setValue("leftGripCurl", 5)).toThrow("Unknown");
    overlay.setValue("rightPawPitch", 1000);
    expect(overlay.values().rightPawPitch).toBe(30);
    overlay.setValue("rightPawPitch", -1000);
    expect(overlay.values().rightPawPitch).toBe(-30);
    overlay.setValues({ leftPawPitch: 11 });
    expect(overlay.values().rightPawPitch).toBe(0);
    const audit = overlay.audit();
    audit.bones[0]!.directWeightedVertices = 999;
    audit.availableControls.length = 0;
    expect(overlay.audit().bones[0]!.directWeightedVertices).toBe(1);
    expect(overlay.audit().availableControls.length).toBeGreaterThan(0);
  });

  it("restores applied offsets on disposal without disposing shared rig resources", () => {
    const { model, bones, mesh } = rig(["front_handR"]);
    const original = bones[0]!.quaternion.clone();
    const overlay = createMobPoseOverlay(model, "breachling");
    overlay.setValue("rightPawPitch", 20);
    overlay.apply();
    overlay.dispose();
    overlay.dispose();
    overlay.apply();
    expect(bones[0]!.quaternion.toArray()).toEqual(original.toArray());
    expect(mesh.skeleton.bones).toEqual(bones);
    expect(mesh.geometry.getAttribute("skinWeight").count).toBe(1);
    expect(overlay.audit().disposed).toBe(true);
    expect(() => overlay.setValue("rightPawPitch", 10)).toThrow("disposed");
    expect(() => overlay.setValues({})).toThrow("disposed");
  });
});
