import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  AGE_FACIAL_MORPH_NAMES,
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
  DIALOGUE_FACIAL_MORPH_NAMES,
  FacialAnimationDriver,
  META_VISEME_NAMES,
  type TimedMetaVisemeCue,
} from "../src/game/facialAnimationDriver";

function morphRoot(names: readonly string[] = [
  ...DIALOGUE_FACIAL_MORPH_NAMES,
  ...AGE_FACIAL_MORPH_NAMES,
  "Face_SoftRound",
]): {
  root: THREE.Group;
  mesh: THREE.Mesh;
  index: Readonly<Record<string, number>>;
} {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  const index = Object.fromEntries(names.map((name, position) => [name, position]));
  mesh.morphTargetDictionary = index;
  mesh.morphTargetInfluences = names.map(() => 0);
  root.add(mesh);
  return { root, mesh, index };
}

function influence(mesh: THREE.Mesh, index: Readonly<Record<string, number>>, name: string): number {
  return mesh.morphTargetInfluences?.[index[name]!] ?? 0;
}

const directCue = (
  viseme: TimedMetaVisemeCue["viseme"],
  startsAtSeconds = 0,
  endsAtSeconds = 0.2,
): TimedMetaVisemeCue => ({ viseme, startsAtSeconds, peakAtSeconds: 0.1, endsAtSeconds });

describe("standardized fail-closed NPC facial animation driver", () => {
  it("locks the exact 52 ARKit and 15 Meta semantic names", () => {
    expect(ARKIT_FACIAL_MORPH_NAMES).toHaveLength(52);
    expect(new Set(ARKIT_FACIAL_MORPH_NAMES).size).toBe(52);
    expect(ARKIT_FACIAL_MORPH_NAMES).toContain("eyeBlinkLeft");
    expect(ARKIT_FACIAL_MORPH_NAMES).toContain("tongueOut");
    expect(META_VISEME_NAMES).toEqual([
      "viseme_sil", "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD",
      "viseme_kk", "viseme_CH", "viseme_SS", "viseme_nn", "viseme_RR",
      "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U",
    ]);
    expect(BAKED_META_VISEME_MORPH_NAMES).toHaveLength(14);
    expect(BAKED_META_VISEME_MORPH_NAMES).not.toContain("viseme_sil");
    expect(DIALOGUE_FACIAL_MORPH_NAMES).toHaveLength(66);
  });

  it("requires the complete 52 plus 14 asset contract for READY", () => {
    const complete = morphRoot();
    const completeDriver = new FacialAnimationDriver(complete.root, "ilyra");
    expect(completeDriver.capabilityStatus()).toMatchObject({
      status: "READY",
      animatedMeshCount: 1,
      availableMorphs: DIALOGUE_FACIAL_MORPH_NAMES,
      missingMorphs: [],
      availableAgeMorphs: AGE_FACIAL_MORPH_NAMES,
      capabilities: { blink: true, gaze: true, speech: true },
    });

    const missingExpression = morphRoot(DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => name !== "browInnerUp"));
    expect(new FacialAnimationDriver(missingExpression.root, "missing-arkit").capabilityStatus()).toMatchObject({
      status: "PARTIAL",
      missingMorphs: ["browInnerUp"],
      capabilities: { blink: true, gaze: true, speech: true },
    });

    const missingViseme = morphRoot(DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => name !== "viseme_U"));
    expect(new FacialAnimationDriver(missingViseme.root, "missing-viseme").capabilityStatus()).toMatchObject({
      status: "PARTIAL",
      missingMorphs: ["viseme_U"],
      capabilities: { speech: false },
    });
  });

  it("plays typed timed direct visemes without ARKit jaw or mouth overlays", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "canonical-cues");
    driver.beginDialogueWithVisemes([directCue("viseme_aa")], 3);
    driver.update(3.1);

    expect(influence(mesh, index, "viseme_aa")).toBe(1);
    ["jawOpen", "mouthClose", "mouthFunnel", "mouthPucker"].forEach((name) => {
      expect(influence(mesh, index, name)).toBe(0);
    });
  });

  it("represents viseme_sil by zeroing all 14 baked speech weights", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "silence");
    driver.beginDialogueWithVisemes([
      directCue("viseme_aa", 0, 0.3),
      directCue("viseme_sil", 0.08, 0.22),
    ], 0);
    driver.update(0.1);
    BAKED_META_VISEME_MORPH_NAMES.forEach((name) => expect(influence(mesh, index, name)).toBe(0));
  });

  it("coarticulates direct timed cues without overdriving their total weight", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "coarticulation");
    driver.beginDialogueWithVisemes([
      directCue("viseme_PP", 0, 0.25),
      { ...directCue("viseme_aa", 0.08, 0.3), peakAtSeconds: 0.18 },
    ], 0);

    for (let elapsed = 0; elapsed <= 0.3; elapsed += 1 / 120) {
      driver.update(elapsed);
      const total = BAKED_META_VISEME_MORPH_NAMES.reduce(
        (sum, name) => sum + influence(mesh, index, name),
        0,
      );
      expect(total).toBeLessThanOrEqual(1.000001);
    }
  });

  it("maps horizontal and vertical gaze into anatomically paired eye channels", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "orren");
    driver.beginDialogueWithVisemes([], 0);
    let sawHorizontal = false;
    let sawVertical = false;

    for (let elapsed = 0; elapsed <= 16; elapsed += 0.02) {
      driver.update(elapsed);
      const lookOutLeft = influence(mesh, index, "eyeLookOutLeft");
      const lookInRight = influence(mesh, index, "eyeLookInRight");
      const lookInLeft = influence(mesh, index, "eyeLookInLeft");
      const lookOutRight = influence(mesh, index, "eyeLookOutRight");
      const upLeft = influence(mesh, index, "eyeLookUpLeft");
      const upRight = influence(mesh, index, "eyeLookUpRight");
      const downLeft = influence(mesh, index, "eyeLookDownLeft");
      const downRight = influence(mesh, index, "eyeLookDownRight");
      expect(lookOutLeft).toBeCloseTo(lookInRight, 8);
      expect(lookInLeft).toBeCloseTo(lookOutRight, 8);
      expect(upLeft).toBeCloseTo(upRight, 8);
      expect(downLeft).toBeCloseTo(downRight, 8);
      expect(lookOutLeft * lookInLeft).toBe(0);
      expect(upLeft * downLeft).toBe(0);
      sawHorizontal ||= lookOutLeft + lookInLeft > 0;
      sawVertical ||= upLeft + downLeft > 0;
    }
    expect(sawHorizontal).toBe(true);
    expect(sawVertical).toBe(true);
  });

  it("blink owns only eyeBlinkLeft and eyeBlinkRight", () => {
    const { root, mesh, index } = morphRoot();
    mesh.morphTargetInfluences![index.eyeSquintLeft!] = 0.31;
    mesh.morphTargetInfluences![index.eyeWideRight!] = 0.22;
    mesh.morphTargetInfluences![index.browInnerUp!] = 0.4;
    const driver = new FacialAnimationDriver(root, "blink-ownership");
    driver.beginDialogueWithVisemes([], 0);
    let maximumBlink = 0;
    for (let elapsed = 0; elapsed <= 8; elapsed += 0.002) {
      driver.update(elapsed);
      const left = influence(mesh, index, "eyeBlinkLeft");
      const right = influence(mesh, index, "eyeBlinkRight");
      expect(left).toBeCloseTo(right, 8);
      maximumBlink = Math.max(maximumBlink, left);
      expect(influence(mesh, index, "eyeSquintLeft")).toBe(0.31);
      expect(influence(mesh, index, "eyeWideRight")).toBe(0.22);
      expect(influence(mesh, index, "browInnerUp")).toBe(0.4);
    }
    expect(maximumBlink).toBe(1);
  });

  it("never clobbers expression, Age_*, or Face_* weights", () => {
    const { root, mesh, index } = morphRoot();
    mesh.morphTargetInfluences![index.mouthSmileLeft!] = 0.42;
    mesh.morphTargetInfluences![index.Age_Middle!] = 0.35;
    mesh.morphTargetInfluences![index.Age_Elder!] = 0.6;
    mesh.morphTargetInfluences![index.Face_SoftRound!] = 0.8;
    const driver = new FacialAnimationDriver(root, "channel-ownership");

    driver.beginDialogueWithVisemes([directCue("viseme_E")], 2);
    driver.update(2.1);
    driver.closeDialogue();
    expect(influence(mesh, index, "mouthSmileLeft")).toBe(0.42);
    expect(influence(mesh, index, "Age_Middle")).toBe(0.35);
    expect(influence(mesh, index, "Age_Elder")).toBe(0.6);
    expect(influence(mesh, index, "Face_SoftRound")).toBe(0.8);
  });

  it("fails incomplete subsystems closed", () => {
    const missingBlink = morphRoot(DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => name !== "eyeBlinkRight"));
    const blinkDriver = new FacialAnimationDriver(missingBlink.root, "partial-blink");
    expect(blinkDriver.capabilityStatus().capabilities.blink).toBe(false);
    blinkDriver.beginDialogueWithVisemes([], 0);
    for (let elapsed = 0; elapsed <= 8; elapsed += 0.02) blinkDriver.update(elapsed);
    expect(influence(missingBlink.mesh, missingBlink.index, "eyeBlinkLeft")).toBe(0);

    const missingGaze = morphRoot(DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => name !== "eyeLookInRight"));
    const gazeDriver = new FacialAnimationDriver(missingGaze.root, "partial-gaze");
    expect(gazeDriver.capabilityStatus().capabilities.gaze).toBe(false);
    gazeDriver.beginDialogueWithVisemes([], 0);
    for (let elapsed = 0; elapsed <= 8; elapsed += 0.02) gazeDriver.update(elapsed);
    expect(influence(missingGaze.mesh, missingGaze.index, "eyeLookOutLeft")).toBe(0);

    const missingSpeech = morphRoot(DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => name !== "viseme_TH"));
    const speechDriver = new FacialAnimationDriver(missingSpeech.root, "partial-speech");
    expect(speechDriver.capabilityStatus().capabilities.speech).toBe(false);
    speechDriver.beginDialogueWithVisemes([directCue("viseme_aa")], 0);
    speechDriver.update(0.1);
    expect(influence(missingSpeech.mesh, missingSpeech.index, "viseme_aa")).toBe(0);
  });

  it("keeps deprecated text-only paths neutral while timed cues still drive speech", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "fail-closed-text-compatibility");

    driver.beginDialogue("This text has no trusted viseme timing.", 0);
    driver.update(0.1);
    BAKED_META_VISEME_MORPH_NAMES.forEach((name) => expect(influence(mesh, index, name)).toBe(0));

    driver.speakVisemeCues([directCue("viseme_PP")], 1);
    driver.update(1.1);
    expect(influence(mesh, index, "viseme_PP")).toBe(1);

    driver.speakLine("A replacement text line must also fail closed.", 2);
    driver.update(2.1);
    BAKED_META_VISEME_MORPH_NAMES.forEach((name) => expect(influence(mesh, index, name)).toBe(0));
  });

  it("reports unavailable controls and never changes bones or substitutes geometry", () => {
    const root = new THREE.Group();
    const bone = new THREE.Bone();
    bone.position.set(1, 2, 3);
    bone.rotation.set(0.1, 0.2, 0.3);
    root.add(bone);
    const beforePosition = bone.position.clone();
    const beforeQuaternion = bone.quaternion.clone();
    const beforeChildren = root.children.length;
    const driver = new FacialAnimationDriver(root, "missing-head-contract");

    driver.beginDialogueWithVisemes([directCue("viseme_aa")], 0);
    driver.update(4);
    driver.closeDialogue();

    expect(driver.capabilityStatus()).toMatchObject({
      status: "MORPH_TARGETS_UNAVAILABLE",
      animatedMeshCount: 0,
      availableMorphs: [],
      missingMorphs: DIALOGUE_FACIAL_MORPH_NAMES,
      capabilities: { blink: false, gaze: false, speech: false },
    });
    expect(bone.position).toEqual(beforePosition);
    expect(bone.quaternion.angleTo(beforeQuaternion)).toBeLessThan(1e-6);
    expect(root.children).toHaveLength(beforeChildren);
  });
});
