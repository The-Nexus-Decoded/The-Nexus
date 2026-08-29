import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  AGE_FACIAL_MORPH_NAMES,
  DIALOGUE_FACIAL_MORPH_NAMES,
  FacialAnimationDriver,
} from "../src/game/facialAnimationDriver";

function morphRoot(names: readonly string[] = [...DIALOGUE_FACIAL_MORPH_NAMES, ...AGE_FACIAL_MORPH_NAMES]): {
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

describe("fail-closed NPC facial animation driver", () => {
  it("recognizes the exact locked controls and keeps age morphs outside dialogue animation", () => {
    const { root, mesh, index } = morphRoot();
    mesh.morphTargetInfluences![index.Age_Middle!] = 0.35;
    mesh.morphTargetInfluences![index.Age_Elder!] = 0.6;
    const driver = new FacialAnimationDriver(root, "ilyra");

    expect(driver.capabilityStatus()).toMatchObject({
      status: "READY",
      animatedMeshCount: 1,
      availableMorphs: DIALOGUE_FACIAL_MORPH_NAMES,
      missingMorphs: [],
      availableAgeMorphs: AGE_FACIAL_MORPH_NAMES,
      capabilities: { blink: true, gaze: true, speech: true },
    });

    driver.beginDialogue("Welcome back, returned soul.", 2);
    driver.update(2.24);
    expect(DIALOGUE_FACIAL_MORPH_NAMES.some((name) => influence(mesh, index, name) > 0)).toBe(true);
    expect(influence(mesh, index, "Age_Middle")).toBe(0.35);
    expect(influence(mesh, index, "Age_Elder")).toBe(0.6);

    driver.closeDialogue();
    DIALOGUE_FACIAL_MORPH_NAMES.forEach((name) => expect(influence(mesh, index, name)).toBe(0));
    expect(influence(mesh, index, "Age_Middle")).toBe(0.35);
    expect(influence(mesh, index, "Age_Elder")).toBe(0.6);
  });

  it("uses a bounded deterministic text cycle and clears speech before idle dialogue continues", () => {
    const first = morphRoot();
    const second = morphRoot();
    const firstDriver = new FacialAnimationDriver(first.root, "orren");
    const secondDriver = new FacialAnimationDriver(second.root, "orren");

    firstDriver.beginDialogue("Move before the breach opens.", 5);
    secondDriver.beginDialogue("Move before the breach opens.", 5);
    firstDriver.update(5.31);
    secondDriver.update(5.31);
    expect(first.mesh.morphTargetInfluences).toEqual(second.mesh.morphTargetInfluences);

    firstDriver.update(13.1);
    ["JawOpen", "Viseme_AA", "Viseme_EE", "Viseme_OH", "Viseme_MBP", "LipSeal"].forEach((name) => {
      expect(influence(first.mesh, first.index, name)).toBe(0);
    });
  });

  it("resets a previous line before driving a selected-choice response", () => {
    const { root, mesh, index } = morphRoot();
    const driver = new FacialAnimationDriver(root, "brannoc");
    driver.beginDialogue("First line with open vowels.", 0);
    driver.update(0.22);
    expect(DIALOGUE_FACIAL_MORPH_NAMES.some((name) => influence(mesh, index, name) > 0)).toBe(true);

    driver.speakLine("Mbp", 1);
    DIALOGUE_FACIAL_MORPH_NAMES.forEach((name) => expect(influence(mesh, index, name)).toBe(0));
    driver.update(1.18);
    expect(influence(mesh, index, "Viseme_MBP") + influence(mesh, index, "LipSeal")).toBeGreaterThan(0);
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

    driver.beginDialogue("This must remain a no-op.", 0);
    driver.update(4);
    driver.speakLine("Still a no-op.", 5);
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
