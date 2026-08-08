import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  cameraPanBounds,
  cloneActorMaterial,
  screenPanToWorld,
  sanitizeAttackClip,
} from "../src/game/presentation";

describe("actor presentation boundaries", () => {
  it("preserves authored player color and emissive channels on an isolated clone", () => {
    const source = new THREE.MeshStandardMaterial({
      color: 0x98959a,
      emissive: 0x982709,
      emissiveIntensity: 1.4,
      roughness: 0.72,
      metalness: 0.05,
    });
    source.name = "SK_ashen_skin";

    const material = cloneActorMaterial(source, 0xc92f28, true) as THREE.MeshStandardMaterial;

    expect(material).not.toBe(source);
    expect(material.color.getHex()).toBe(source.color.getHex());
    expect(material.emissive.getHex()).toBe(source.emissive.getHex());
    expect(material.emissiveIntensity).toBe(source.emissiveIntensity);
    expect(material.roughness).toBe(source.roughness);
    expect(material.metalness).toBe(source.metalness);
  });

  it("anchors the root, hips, and lower body in attack clips", () => {
    const times = [0, 1];
    const positions = [0, 0, 0, 0.25, 0.1, -0.4];
    const clip = new THREE.AnimationClip("SiphonCleave", 1, [
      new THREE.VectorKeyframeTrack("root.position", times, positions),
      new THREE.VectorKeyframeTrack("ElfShadowknight_Armature.position", times, positions),
      new THREE.VectorKeyframeTrack("pelvis.position", times, positions),
      new THREE.VectorKeyframeTrack("Hips.position", times, positions),
      new THREE.VectorKeyframeTrack("spine_01.position", times, positions),
      new THREE.QuaternionKeyframeTrack("spine_01.quaternion", times, [0, 0, 0, 1, 0.2, 0.2, 0, 0.96]),
      new THREE.QuaternionKeyframeTrack("upperarm_r.quaternion", times, [0, 0, 0, 1, 0.3, 0.1, 0, 0.94]),
      new THREE.QuaternionKeyframeTrack("root.quaternion", times, [0, 0, 0, 1, 0, 0.2, 0, 0.98]),
      new THREE.QuaternionKeyframeTrack("thigh_l.quaternion", times, [0, 0, 0, 1, 0.1, 0.2, 0, 0.97]),
      new THREE.QuaternionKeyframeTrack("foot_r.quaternion", times, [0, 0, 0, 1, 0.2, 0, 0, 0.98]),
    ]);

    const sanitized = sanitizeAttackClip(clip);

    expect(sanitized).not.toBe(clip);
    expect(sanitized.tracks.map((track) => track.name)).toEqual(["upperarm_r.quaternion"]);
    expect(clip.tracks).toHaveLength(10);
  });
});

describe("camera pan boundaries", () => {
  it("maps screen-relative pan directions into world X/Z at the active azimuth", () => {
    const azimuth = Math.PI / 2;

    const right = screenPanToWorld(azimuth, 2, 0);
    const up = screenPanToWorld(azimuth, 0, 3);

    expect(right.x).toBeCloseTo(0, 6);
    expect(right.y).toBeCloseTo(-2, 6);
    expect(up.x).toBeCloseTo(3, 6);
    expect(up.y).toBeCloseTo(0, 6);
  });

  it("provides bounded reach to both sides of the authored training room", () => {
    const bounds = cameraPanBounds(16, 14, 1.75, 2);

    expect(bounds.x).toBeCloseTo(10.5);
    expect(bounds.y).toBeCloseTo(8.75);
    expect(new THREE.Vector2(99, -99).clamp(bounds.clone().multiplyScalar(-1), bounds).toArray())
      .toEqual([10.5, -8.75]);
  });
});
