import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  SIPHON_CLEAVE_PACK,
  WEAPON_STRIKE_PACK,
  HUMANOID_ACTIVE_ANIMATION_PACKS,
  bindOptionalCompatibleAnimationClip,
  bindCompatibleAnimationClip,
  loadCachedAnimationPack,
  measureAnimatedPoseGrounding,
  normalizeAnimationPackRootMotion,
  placeAnimatedPoseOnFloor,
  trimAnimationPackClipEnvelope,
  validateAnimationClipCompatibility,
} from "../src/game/animationPacks";

function rig(): THREE.Group {
  const root = new THREE.Group();
  root.name = "ElfShadowknight_Armature";
  for (const name of ["pelvis", "spine_01", "hand_l", "hand_r", "foot_l", "foot_r"]) {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  }
  return root;
}

function sourceClip(): THREE.AnimationClip {
  return new THREE.AnimationClip("ElfShadowknight_Armature|mixamo.com|Layer0", 2, [
    new THREE.VectorKeyframeTrack("pelvis.position", [0, 2], [0, 1, 0, 0.4, 1, -0.3]),
    new THREE.QuaternionKeyframeTrack("hand_r.quaternion", [0, 2], [0, 0, 0, 1, 0, 0.5, 0, 0.866]),
    new THREE.QuaternionKeyframeTrack("mixamorig:hand_l.quaternion", [0, 2], [0, 0, 0, 1, 0.2, 0, 0, 0.98]),
  ]);
}

describe("external animation packs", () => {
  it("declares the raw same-rig Outward pack as the Siphon semantic source", () => {
    expect(SIPHON_CLEAVE_PACK).toMatchObject({
      url: "/assets/3d/animations/elf-shadowknight/siphon-cleave-baseline.glb",
      sourceClipName: "ElfShadowknight_Armature|mixamo.com|Layer0",
      semanticClipName: "SiphonCleaveBaseline",
      sourceSha256: "77C91BD70CD06D6B8BF452E0C66BF8A0B6CA200B21957B7E7A2A3ABC23C60BC5",
      rootPolicy: "in-place",
      rootNodeName: "ElfShadowknight_Armature",
      sourceFps: 30,
      sourceFrameWindow: [15, 31],
      sourceContactNormalizedTime: 0.46,
    });
  });

  it("declares the approved raw Mixamo basic-strike window and every active humanoid action", () => {
    expect(WEAPON_STRIKE_PACK).toMatchObject({
      semanticClipName: "WeaponStrikeBaseline",
      sourceFrameWindow: [17, 36],
      sourceContactNormalizedTime: 0.82,
      rootPolicy: "in-place",
    });
    expect(new Set(HUMANOID_ACTIVE_ANIMATION_PACKS.map((pack) => pack.semanticClipName))).toEqual(new Set([
      "IdleRelaxed", "WalkBaseline", "RunBaseline", "DrawSword", "SheatheSword",
      "UnarmedPunch", "UnarmedKick", "CastWard", "CastSummon", "CastProjectile",
      "DoorOpenInward", "DoorOpenOutward", "PickupWaist", "PickupGround", "PullLever",
      "HitReactionMixamo", "DeathMixamo",
    ]));
  });

  it("skips an incompatible optional presentation pack instead of crashing a saved avatar", () => {
    const source = sourceClip();
    source.tracks.push(new THREE.QuaternionKeyframeTrack("missing_weapon_hand.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]));
    expect(bindOptionalCompatibleAnimationClip(source, rig(), "Optional")).toBeNull();
  });

  it("binds exact and namespace-prefixed tracks without changing authored values", () => {
    const source = sourceClip();
    const report = validateAnimationClipCompatibility(source, rig());
    expect(report.compatible).toBe(true);
    expect(report.missingNodes).toEqual([]);
    expect(report.remappedTracks).toContainEqual({ from: "mixamorig:hand_l", to: "hand_l" });

    const bound = bindCompatibleAnimationClip(source, rig(), "SiphonCleaveBaseline");
    expect(bound.name).toBe("SiphonCleaveBaseline");
    expect(bound.duration).toBe(source.duration);
    expect(bound.tracks.map((track) => track.name)).toEqual([
      "pelvis.position",
      "hand_r.quaternion",
      "hand_l.quaternion",
    ]);
    expect(Array.from(bound.tracks[0]!.values)).toEqual(Array.from(source.tracks[0]!.values));
    expect(bound.tracks[0]!.values).not.toBe(source.tracks[0]!.values);
  });

  it("rejects a pack before playback when any animated node is absent", () => {
    const source = sourceClip();
    source.tracks.push(new THREE.QuaternionKeyframeTrack("missing_weapon_hand.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]));
    expect(validateAnimationClipCompatibility(source, rig())).toMatchObject({
      compatible: false,
      missingNodes: ["missing_weapon_hand"],
    });
    expect(() => bindCompatibleAnimationClip(source, rig(), "SiphonCleaveBaseline"))
      .toThrow(/missing_weapon_hand/);
  });

  it("caches a pack load and evicts a rejected promise for retry", async () => {
    const cache = new Map<string, Promise<readonly THREE.AnimationClip[]>>();
    const load = vi.fn(async () => [sourceClip()] as const);
    const first = loadCachedAnimationPack(cache, "pack", load);
    const second = loadCachedAnimationPack(cache, "pack", load);
    expect(first).toBe(second);
    await expect(first).resolves.toHaveLength(1);
    expect(load).toHaveBeenCalledTimes(1);

    const rejectedCache = new Map<string, Promise<readonly THREE.AnimationClip[]>>();
    const rejected = vi.fn(async () => { throw new Error("bad pack"); });
    await expect(loadCachedAnimationPack(rejectedCache, "pack", rejected)).rejects.toThrow("bad pack");
    expect(rejectedCache.has("pack")).toBe(false);
  });

  it("neutralizes only top-level horizontal travel and preserves all 195 authored bone arrays byte-for-byte", () => {
    const target = new THREE.Group();
    const armature = new THREE.Group();
    armature.name = "ElfShadowknight_Armature";
    target.add(armature);
    const tracks: THREE.KeyframeTrack[] = [
      new THREE.VectorKeyframeTrack("ElfShadowknight_Armature.position", [0, 1], [0, 0, 0, 1, 2, 3]),
      new THREE.QuaternionKeyframeTrack("ElfShadowknight_Armature.quaternion", [0, 1], [0, 0, 0, 1, 0, 0.1, 0, 0.995]),
      new THREE.VectorKeyframeTrack("ElfShadowknight_Armature.scale", [0, 1], [1, 1, 1, 1, 1, 1]),
    ];
    for (let boneIndex = 0; boneIndex < 65; boneIndex += 1) {
      const bone = new THREE.Bone();
      bone.name = `bone_${boneIndex}`;
      armature.add(bone);
      tracks.push(
        new THREE.VectorKeyframeTrack(`${bone.name}.position`, [0, 1], [boneIndex, 0, 0, boneIndex + 0.25, 0.1, -0.2]),
        new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, [0, 1], [0, 0, 0, 1, 0, 0.1, 0, 0.995]),
        new THREE.VectorKeyframeTrack(`${bone.name}.scale`, [0, 1], [1, 1, 1, 1, 1, 1]),
      );
    }
    const source = new THREE.AnimationClip("raw", 1, tracks);
    const bound = bindCompatibleAnimationClip(source, target, "SiphonCleaveBaseline");
    const normalized = normalizeAnimationPackRootMotion(
      bound,
      "ElfShadowknight_Armature",
      new THREE.Vector3(7, 1.25, -3),
    );
    const authored = bound.tracks.filter((track) => !track.name.startsWith("ElfShadowknight_Armature."));

    expect(authored).toHaveLength(195);
    expect(normalized.tracks).toHaveLength(198);
    authored.forEach((track) => {
      const normalizedTrack = normalized.tracks.find((candidate) => candidate.name === track.name);
      expect(normalizedTrack).toBeDefined();
      expect(Array.from(normalizedTrack!.values)).toEqual(Array.from(track.values));
    });
    expect(Array.from(normalized.tracks.find((track) => track.name.endsWith(".quaternion"))!.values))
      .toEqual(Array.from(bound.tracks.find((track) => track.name.endsWith(".quaternion"))!.values));
    expect(Array.from(normalized.tracks.find((track) => track.name.endsWith(".scale"))!.values))
      .toEqual(Array.from(bound.tracks.find((track) => track.name.endsWith(".scale"))!.values));
    expect(Array.from(normalized.tracks.find((track) => track.name.endsWith(".position"))!.values))
      .toEqual([7, 1.25, -3, 7, 3.25, -3]);
  });

  it("measures a posed lower bound against the actor floor without changing placement", () => {
    const actorRoot = new THREE.Group();
    actorRoot.position.set(8, 3, -4);
    const animatedModel = new THREE.Group();
    animatedModel.position.y = 1;
    animatedModel.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));
    actorRoot.add(animatedModel);

    const measurement = measureAnimatedPoseGrounding(actorRoot, animatedModel);

    expect(measurement).toEqual({ floorWorldY: 3, lowerBoundWorldY: 3, clearanceMeters: 0 });
    expect(actorRoot.position.toArray()).toEqual([8, 3, -4]);
  });

  it("preserves authored airborne and falling Y deltas while removing the source baseline", () => {
    const source = new THREE.AnimationClip("jump-and-fall", 2, [
      new THREE.VectorKeyframeTrack("Rig_Armature.position", [0, 1, 2], [2, 96, -5, 8, 99.5, 4, 11, 95.25, 9]),
    ]);
    const normalized = normalizeAnimationPackRootMotion(
      source,
      "Rig_Armature",
      new THREE.Vector3(0, 0.5, 0),
    );

    expect(Array.from(normalized.tracks[0]!.values)).toEqual([
      0, 0.5, 0,
      0, 4, 0,
      0, -0.25, 0,
    ]);
  });

  it("locks grounded root Y to the target rest position", () => {
    const source = new THREE.AnimationClip("idle-with-source-drift", 2, [
      new THREE.VectorKeyframeTrack("Rig_Armature.position", [0, 1, 2], [2, 96, -5, 8, 99.5, 4, 11, 95.25, 9]),
    ]);
    const normalized = normalizeAnimationPackRootMotion(
      source,
      "Rig_Armature",
      new THREE.Vector3(0, 0.5, 0),
      "lock-to-rest",
    );

    expect(Array.from(normalized.tracks[0]!.values)).toEqual([
      0, 0.5, 0,
      0, 0.5, 0,
      0, 0.5, 0,
    ]);
  });

  it("resets a skinned hierarchy before every precise bound and never accumulates across thousands of frames", () => {
    const actorRoot = new THREE.Group();
    actorRoot.position.y = 4;
    const pivot = new THREE.Group();
    const model = new THREE.Group();
    model.scale.setScalar(2.061005562562551);
    const armature = new THREE.Group();
    const rootBone = new THREE.Bone();
    rootBone.name = "Runtime_Armature";
    armature.add(rootBone);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.5, -1, -0.5,
      0.5, -1, -0.5,
      0.5, 1, 0.5,
      -0.5, 1, 0.5,
    ], 3));
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ], 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ], 4));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeBoundingBox();
    const material = new THREE.MeshBasicMaterial();
    const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
    model.add(armature, skinnedMesh);
    pivot.add(model);
    actorRoot.add(pivot);
    actorRoot.updateWorldMatrix(true, true);
    skinnedMesh.bind(new THREE.Skeleton([rootBone]));

    const basePivotY = -1;
    const placements = Array.from({ length: 2_000 }, () => (
      placeAnimatedPoseOnFloor(actorRoot, model, pivot, basePivotY)
    ));

    const first = placements[0]!;
    expect(new Set(placements.map((placement) => placement.appliedPivotY))).toEqual(new Set([first.appliedPivotY]));
    expect(new Set(placements.map((placement) => placement.floorCorrectionMeters)))
      .toEqual(new Set([first.floorCorrectionMeters]));
    expect(first.pivotResponseMetersPerMeter).toBeGreaterThan(1);
    expect(first.appliedPivotY).toBe(basePivotY + first.floorCorrectionMeters);
    expect(new Set(placements.map((placement) => placement.clearanceMeters)))
      .toEqual(new Set([first.clearanceMeters]));
    expect(Math.abs(first.clearanceMeters)).toBeLessThan(1e-9);
    expect(pivot.position.y).toBe(first.appliedPivotY);
    actorRoot.updateWorldMatrix(true, true);
    skinnedMesh.skeleton.update();
    expect(new THREE.Box3().setFromObject(model, true).min.y).toBeCloseTo(first.lowerBoundWorldY, 9);

    geometry.dispose();
    material.dispose();
  });

  it("trims a nondestructive frame envelope without resampling skeletal values", () => {
    const times = Array.from({ length: 62 }, (_, index) => (index + 1) / 30);
    const values = times.flatMap((_, index) => [0, index / 100, 0, Math.sqrt(1 - (index / 100) ** 2)]);
    const source = new THREE.AnimationClip("SiphonCleaveBaseline", 62 / 30, [
      new THREE.QuaternionKeyframeTrack("hand_r.quaternion", times, values),
      new THREE.VectorKeyframeTrack("hand_r.position", [1 / 30, 62 / 30], [1, 2, 3, 1, 2, 3]),
    ]);
    const trimmed = trimAnimationPackClipEnvelope(source, SIPHON_CLEAVE_PACK.sourceFrameWindow, 30);
    const rotation = trimmed.tracks.find((track) => track.name === "hand_r.quaternion")!;

    expect(trimmed.name).toBe("SiphonCleaveBaseline");
    expect(trimmed.duration).toBeCloseTo(16 / 30, 5);
    expect(rotation.times).toHaveLength(17);
    expect(Array.from(rotation.values)).toEqual(Array.from(source.tracks[0]!.values.slice(14 * 4, 31 * 4)));
    expect(Array.from(rotation.times)[0]).toBeCloseTo(0, 5);
    expect(Array.from(rotation.times).at(-1)).toBeCloseTo(16 / 30, 5);
  });
});
