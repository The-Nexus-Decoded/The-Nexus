import { describe, expect, it } from "vitest";

import {
  ARMATURE_REST_ROTATION,
  CANONICAL_JOINTS,
  CANONICAL_JOINT_COUNT,
  GROUND_CHAIN_JOINTS,
  HIPS_UP_AXIS,
  HIPS_UP_SIGN,
  canonicalizeJointName,
  describeGltfSkeleton,
  validateGltfBody,
  validateHumanoidBody,
  type CandidateJoint,
} from "../src/rig/uniform/humanoidSkeletonContract.ts";
import {
  HEAVY_PROFILE,
  LIGHT_PROFILE,
  REFERENCE_HIP_HEIGHT,
  REFERENCE_MESH_BBOX_HEIGHT,
  REFERENCE_PALM,
  REFERENCE_PROFILE,
  REFERENCE_RIG_HEIGHT,
  SEGMENT_JOINTS,
  SHIPPED_PROFILES,
  SHORT_PROFILE,
  TALL_PROFILE,
  applyProportionProfile,
  assertSegmentPartition,
  deriveRigMetrics,
  isGroundLocked,
  jointAxisScale,
  legLengthIndex,
  makeProfile,
  metresPerRigUnit,
  validateProfile,
  type BodyProportionProfile,
} from "../src/rig/uniform/bodyProportionProfile.ts";
import {
  ROOT_MOTION_NODE,
  applyRootMotion,
  normalizeHumanoidLibrary,
  rootMotionScaleFor,
  type AnimationClipLike,
} from "../src/rig/uniform/libraryRootMotion.ts";
import {
  GROUND_SOLVER_JOINTS,
  GroundDropSolver,
  needsGroundCorrection,
  packGroundRest,
  solveGroundDrop,
} from "../src/rig/uniform/groundDropCorrection.ts";
import {
  PALM_SOCKET_FRACTIONS,
  REFERENCE_CLOSEST_APPROACH_MM,
  REFERENCE_PALM_METERS,
  TORSO_SOCKET_FRACTIONS,
  checkGripBudget,
  gripDriftMillimetres,
  handSocketOffsetMeters,
  palmMeters,
  toPalmFraction,
  torsoSocketOffsetMeters,
} from "../src/rig/uniform/gripAdaptation.ts";

import {
  MIXAMO,
  clipDuration,
  forwardKinematics,
  loadLibrary,
  loadRig,
  lowestSoleY,
  packGroundQuaternions,
  poseRig,
  restLocals,
  worldY,
  type Vec3,
} from "./helpers/uniformRigFixture.ts";

const rig = loadRig();
const library = loadLibrary();

/** Rest-translation override map for a profile, keyed by the rig's real node names. */
function restOverrideFor(profile: BodyProportionProfile): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  for (const joint of CANONICAL_JOINTS) {
    if (joint.parent === null) continue;
    const name = MIXAMO + joint.name;
    const index = rig.byName.get(name);
    if (index === undefined) throw new Error(`rig is missing ${name}`);
    const node = rig.nodes[index];
    const t: Vec3 = [node?.translation?.[0] ?? 0, node?.translation?.[1] ?? 0, node?.translation?.[2] ?? 0];
    const scale = jointAxisScale(profile, joint.name);
    out.set(name, [t[0] * scale[0], t[1] * scale[1], t[2] * scale[2]]);
  }
  return out;
}

/** Bind-pose hip height and rig height, by real forward kinematics. */
function bindMetricsByFk(profile: BodyProportionProfile): { hipHeight: number; rigHeight: number } {
  const locals = restLocals(rig);
  for (const [name, translation] of restOverrideFor(profile)) {
    const index = rig.byName.get(name);
    const local = index === undefined ? undefined : locals[index];
    if (local) local.t = [...translation] as Vec3;
  }
  const world = forwardKinematics(rig, locals);
  const sole = lowestSoleY(rig, world);
  return {
    hipHeight: worldY(rig, world, `${MIXAMO}Hips`) - sole,
    rigHeight: worldY(rig, world, `${MIXAMO}HeadTop_End`) - sole,
  };
}

const CLIPS = [
  "BasicLocomotion__Idle",
  "BasicLocomotion__Walking",
  "ProRifle__SprintForward",
  "GreatSword__GreatSwordIdle",
  "ProMagic__CrouchTurnLeft90",
  "ProRifle__CrouchingTurn90Left",
].filter((name) => library.clips.has(name));

const RULE_BREAKERS: BodyProportionProfile[] = [
  makeProfile("crural-.85/1.148", { thighBias: 0.85, shinBias: 1.148 }),
  makeProfile("feet-1.25x", { ground: 0.9, footBias: 1.25, toeBias: 1.25 }),
  makeProfile("dwarf-1.35", {
    heightMeters: 1.35, ground: 0.7, thighBias: 0.95, shinBias: 1.02, footBias: 1.12, toeBias: 1.12,
    pelvisBreadth: 1.25, spine: 0.95, skull: 1.22, upperArm: 0.92, foreArm: 0.9,
  }),
];

// ===========================================================================
describe("skeleton contract", () => {
  it("declares 65 joints whose parents always appear earlier", () => {
    expect(CANONICAL_JOINT_COUNT).toBe(65);
    const seen = new Set<string>();
    for (const joint of CANONICAL_JOINTS) {
      if (joint.parent !== null) expect(seen.has(joint.parent)).toBe(true);
      seen.add(joint.name);
    }
    expect(CANONICAL_JOINTS[0]?.name).toBe("Hips");
    expect(CANONICAL_JOINTS[0]?.parent).toBeNull();
  });

  it("canonicalizes every naming convention a body might arrive with", () => {
    for (const raw of ["mixamorig:Hips", "mixamorigHips", "mixamorig_Hips", "Armature|mixamorig:Hips", "Hips"]) {
      expect(canonicalizeJointName(raw)).toBe("Hips");
    }
    expect(canonicalizeJointName("HumanFoundation_Armature")).toBeNull();
    expect(canonicalizeJointName("LeftForeArmTwist")).toBeNull();
  });

  it("passes the shipped body GLB", () => {
    const report = validateGltfBody(rig.glb.json);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.foundOrder).toHaveLength(65);
    expect(report.extraJoints).toEqual([]);
  });

  it("reads the +90-degree-X armature off the shipped body", () => {
    const described = describeGltfSkeleton(rig.glb.json);
    expect(described.armatureRotation).toBeDefined();
    for (let i = 0; i < 4; i += 1) {
      expect(described.armatureRotation?.[i] ?? 0).toBeCloseTo(ARMATURE_REST_ROTATION[i] ?? 0, 5);
    }
  });

  it("confirms the shipped body's skin order IS the canonical order", () => {
    const names = rig.jointNodes.map((node) => canonicalizeJointName(rig.nodes[node]?.name ?? ""));
    expect(names).toEqual(CANONICAL_JOINTS.map((joint) => joint.name));
  });

  const baseline = (): CandidateJoint[] => describeGltfSkeleton(rig.glb.json).joints.map((joint) => ({ ...joint }));

  it("rejects a missing joint, naming it", () => {
    const joints = baseline().filter((joint) => canonicalizeJointName(joint.name) !== "LeftToeBase");
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "missing-joint" && i.joint === "LeftToeBase")).toBe(true);
  });

  it("rejects a reparented joint, naming both ends", () => {
    const joints = baseline().map((joint) =>
      canonicalizeJointName(joint.name) === "LeftHand" ? { ...joint, parentName: `${MIXAMO}LeftArm` } : joint);
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.code === "wrong-parent" && i.joint === "LeftHand");
    expect(issue?.detail).toContain("LeftForeArm");
  });

  it("rejects an INTERPOSED twist bone, which is why twists must be leaf siblings", () => {
    const joints = baseline().map((joint) =>
      canonicalizeJointName(joint.name) === "LeftHand" ? { ...joint, parentName: "LeftForeArmTwist" } : joint);
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "wrong-parent" && i.joint === "LeftHand")).toBe(true);
  });

  it("accepts extra joints as leaf siblings and reports them", () => {
    const joints = [
      ...baseline(),
      { name: "LeftForeArmTwist", parentName: `${MIXAMO}LeftForeArm` },
      { name: "Tail1", parentName: `${MIXAMO}Hips` },
    ];
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(true);
    expect(report.extraJoints).toEqual(["LeftForeArmTwist", "Tail1"]);
  });

  it("rejects an out-of-order skin array", () => {
    const joints = baseline();
    const a = joints[3];
    const b = joints[30];
    if (!a || !b) throw new Error("fixture");
    joints[3] = b;
    joints[30] = a;
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "out-of-order")).toBe(true);
  });

  it("rejects a wrong armature frame", () => {
    const report = validateHumanoidBody({ joints: baseline(), armatureRotation: [0, 0, 0, 1] });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "armature-rotation")).toBe(true);
  });

  it("rejects Hips parented to another canonical joint", () => {
    const joints = baseline().map((joint) =>
      canonicalizeJointName(joint.name) === "Hips" ? { ...joint, parentName: `${MIXAMO}Spine` } : joint);
    const report = validateHumanoidBody({ joints });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "root-parented-to-joint")).toBe(true);
  });

  it("rejects a ground-chain rest direction beyond tolerance", () => {
    const reference = new Map<string, readonly [number, number, number]>();
    for (const joint of baseline()) {
      const canonical = canonicalizeJointName(joint.name);
      if (canonical && joint.translation) reference.set(canonical, joint.translation);
    }
    // 3 degrees of tilt on the shin, which measured ~40 mm of planted-ankle drift
    const joints = baseline().map((joint) => {
      if (canonicalizeJointName(joint.name) !== "LeftFoot" || !joint.translation) return joint;
      const [x, y, z] = joint.translation;
      const a = (3 * Math.PI) / 180;
      return { ...joint, translation: [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z] as const };
    });
    const ok = validateHumanoidBody({ joints: baseline() }, { referenceRest: reference });
    expect(ok.ok).toBe(true);
    const report = validateHumanoidBody({ joints }, { referenceRest: reference });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "ground-direction" && i.joint === "LeftFoot")).toBe(true);
  });

  it("gives a human-readable reason on both outcomes", () => {
    expect(validateGltfBody(rig.glb.json).reason).toContain("passes");
    const joints = baseline().filter((joint) => canonicalizeJointName(joint.name) !== "Neck");
    expect(validateHumanoidBody({ joints }).reason).toContain("missing-joint @ Neck");
  });
});

// ===========================================================================
describe("library shape — the facts the contract rests on", () => {
  const animations = library.glb.json.animations ?? [];

  it("is 400 clips of 65 rotation + 65 translation + 65 scale", () => {
    expect(animations).toHaveLength(400);
    const shapes = new Set<string>();
    let total = 0;
    for (const animation of animations) {
      const counts = { rotation: 0, translation: 0, scale: 0 } as Record<string, number>;
      for (const channel of animation.channels) {
        counts[channel.target.path] = (counts[channel.target.path] ?? 0) + 1;
        total += 1;
      }
      shapes.add(`${counts.rotation}/${counts.translation}/${counts.scale}`);
    }
    expect(total).toBe(78000);
    expect([...shapes]).toEqual(["65/65/65"]);
  });

  it("targets exactly the 65 canonical joints and nothing else — which is what makes extra joints free", () => {
    const targets = new Set<string>();
    for (const animation of animations) {
      for (const channel of animation.channels) {
        targets.add(library.glb.json.nodes[channel.target.node]?.name ?? "?");
      }
    }
    expect(targets.size).toBe(65);
    for (const name of targets) expect(canonicalizeJointName(name)).not.toBeNull();
  });

  it("has 22 root-motion accessors shared between clips — the double-divide trap", () => {
    const users = new Map<number, number>();
    for (const animation of animations) {
      for (const channel of animation.channels) {
        if (channel.target.path !== "translation") continue;
        if ((library.glb.json.nodes[channel.target.node]?.name ?? "") !== `${MIXAMO}Hips`) continue;
        const sampler = animation.samplers[channel.sampler];
        if (!sampler) continue;
        users.set(sampler.output, (users.get(sampler.output) ?? 0) + 1);
      }
    }
    expect(users.size).toBeGreaterThan(0);
    expect([...users.values()].filter((n) => n > 1)).toHaveLength(22);
  });

  it("puts the library's floor at the lowest sole JOINT, not the mesh box", () => {
    let within = 0;
    for (const name of library.clips.keys()) {
      const duration = clipDuration(library, name);
      let lowest = Infinity;
      for (let k = 0; k < 8; k += 1) {
        lowest = Math.min(lowest, lowestSoleY(rig, poseRig(rig, library, name, (k / 8) * duration)));
      }
      if (Math.abs(lowest) < 0.02) within += 1;
    }
    expect(within).toBe(385);
  });
});

// ===========================================================================
describe("proportion profile", () => {
  it("partitions all 64 non-root joints exhaustively and disjointly", () => {
    expect(() => assertSegmentPartition()).not.toThrow();
    const owned = new Set<string>();
    for (const joints of Object.values(SEGMENT_JOINTS)) for (const joint of joints) owned.add(joint);
    expect(owned.size).toBe(64);
    expect(SEGMENT_JOINTS.ground).toEqual(GROUND_CHAIN_JOINTS);
    expect(SEGMENT_JOINTS.hand).toHaveLength(10);
    expect(SEGMENT_JOINTS.digit).toHaveLength(30);
  });

  it("matches the measured reference constants against real forward kinematics", () => {
    const measured = bindMetricsByFk(REFERENCE_PROFILE);
    expect(measured.hipHeight).toBeCloseTo(REFERENCE_HIP_HEIGHT, 6);
    expect(measured.rigHeight).toBeCloseTo(REFERENCE_RIG_HEIGHT, 6);
  });

  it("makes standing hip height EXACTLY reference x ground, at any pelvis breadth", () => {
    // the shipped constant is the FK value rounded to 6 dp
    const referenceByFk = bindMetricsByFk(REFERENCE_PROFILE).hipHeight;
    expect(referenceByFk).toBeCloseTo(REFERENCE_HIP_HEIGHT, 8);
    for (const ground of [0.7, 0.85, 1, 1.11, 1.3]) {
      for (const pelvisBreadth of [1, 1.3]) {
        const profile = makeProfile("t", { ground, pelvisBreadth, spine: 0.9, upperArm: 1.2, skull: 1.15 });
        // exact to floating point, and completely independent of pelvis breadth
        expect(bindMetricsByFk(profile).hipHeight / referenceByFk).toBeCloseTo(ground, 12);
        expect(deriveRigMetrics(profile).rootMotionScale).toBeCloseTo(ground, 9);
      }
    }
  });

  it("predicts hip height and stature in closed form, with no FK and no bounding box", () => {
    for (const profile of [...SHIPPED_PROFILES, ...RULE_BREAKERS]) {
      const measured = bindMetricsByFk(profile);
      const derived = deriveRigMetrics(profile);
      const mm = derived.metresPerRigUnit * 1000;
      expect(Math.abs(measured.hipHeight - derived.hipHeight) * mm).toBeLessThan(0.01);
      expect(Math.abs(measured.rigHeight - derived.rigHeight) * mm).toBeLessThan(0.01);
    }
  });

  it("gives every profile a DIFFERENT model scale, where a bounding box would give one", () => {
    const scales = new Set(SHIPPED_PROFILES.map((p) => metresPerRigUnit(p).toFixed(6)));
    expect(scales.size).toBe(SHIPPED_PROFILES.length);
    // the bbox is 1.0105x the joint height, and is identical for every profile
    expect(REFERENCE_MESH_BBOX_HEIGHT / REFERENCE_RIG_HEIGHT).toBeCloseTo(1.010512, 6);
  });

  it("ships reference, 1.50 m, 2.00 m, heavy and light — all ground-locked", () => {
    expect(SHIPPED_PROFILES.map((p) => p.id)).toEqual([
      "human-reference-1.80", "human-short-1.50", "human-tall-2.00", "human-heavy-1.78", "human-light-1.74",
    ]);
    for (const profile of SHIPPED_PROFILES) {
      expect(isGroundLocked(profile)).toBe(true);
      expect(validateProfile(profile)).toEqual([]);
      expect(deriveRigMetrics(profile).metresPerRigUnit * deriveRigMetrics(profile).rigHeight)
        .toBeCloseTo(profile.heightMeters, 9);
    }
    expect(legLengthIndex(REFERENCE_PROFILE)).toBeCloseTo(0.5577, 4);
    expect(legLengthIndex(SHORT_PROFILE)).toBeCloseTo(0.5348, 4);
    expect(legLengthIndex(TALL_PROFILE)).toBeCloseTo(0.5743, 4);
    expect(legLengthIndex(HEAVY_PROFILE)).toBeCloseTo(0.5457, 4);
    expect(legLengthIndex(LIGHT_PROFILE)).toBeCloseTo(0.5678, 4);
    // the leg-length index rises with stature, as it does in real humans
    expect(legLengthIndex(SHORT_PROFILE)).toBeLessThan(legLengthIndex(REFERENCE_PROFILE));
    expect(legLengthIndex(TALL_PROFILE)).toBeGreaterThan(legLengthIndex(REFERENCE_PROFILE));
  });

  it("flags a rule-breaking profile as unlocked", () => {
    for (const profile of RULE_BREAKERS) expect(isGroundLocked(profile)).toBe(false);
  });

  it("scales the pelvis joint anisotropically so breadth never moves the floor", () => {
    // breadth multiplies ON TOP of ground: 0.8 x 1.3 laterally, plain 0.8 vertically
    const scale = jointAxisScale(makeProfile("t", { ground: 0.8, pelvisBreadth: 1.3 }), "LeftUpLeg");
    expect(scale[0]).toBeCloseTo(1.04, 12);
    expect(scale[1]).toBeCloseTo(0.8, 12);
    expect(scale[2]).toBeCloseTo(1.04, 12);
    // at breadth 1 the whole offset scales by ground, so the chain is uniform
    expect(jointAxisScale(makeProfile("t", { ground: 0.8 }), "LeftUpLeg")).toEqual([0.8, 0.8, 0.8]);
    expect(jointAxisScale(makeProfile("t", { ground: 0.8 }), "LeftLeg")).toEqual([0.8, 0.8, 0.8]);
    expect(jointAxisScale(makeProfile("t", { ground: 0.8, shinBias: 1.1 }), "LeftFoot")[0]).toBeCloseTo(0.88, 12);
  });

  it("applies a profile to mutable joints and touches every non-root joint", () => {
    const joints = CANONICAL_JOINTS.map((joint) => ({
      name: MIXAMO + joint.name,
      position: { x: 1, y: 2, z: 3 },
    }));
    const profile = makeProfile("t", { ground: 0.5, spine: 0.5, neck: 0.5, skull: 0.5, chestBreadth: 0.5, clavicle: 0.5, upperArm: 0.5, foreArm: 0.5, hand: 0.5, digit: 0.5, pelvisBreadth: 0.5 });
    const touched = applyProportionProfile(joints, profile, canonicalizeJointName);
    expect(new Set(touched).size).toBe(64);
    expect(joints[0]?.position).toEqual({ x: 1, y: 2, z: 3 }); // Hips is never scaled
  });

  it("rejects nonsense profiles", () => {
    expect(validateProfile(makeProfile("t", { heightMeters: 0 })).some((p) => p.field === "heightMeters")).toBe(true);
    expect(validateProfile(makeProfile("t", { ground: 4 })).some((p) => p.field === "ground")).toBe(true);
    expect(validateProfile(makeProfile("t", { hand: Number.NaN })).some((p) => p.field === "hand")).toBe(true);
  });
});

// ===========================================================================
describe("library root-motion normalisation", () => {
  /** Build clip-likes from a slice of the real library, with real decoded values. */
  function realClips(count: number, only?: string): AnimationClipLike[] {
    const all = library.glb.json.animations ?? [];
    const animations = only ? all.filter((a) => a.name === only) : all.slice(0, count);
    const shared = new Map<number, Float64Array>();
    return animations.map((animation) => ({
      name: animation.name,
      tracks: animation.channels.flatMap((channel) => {
        const sampler = animation.samplers[channel.sampler];
        if (!sampler) return [];
        const node = library.glb.json.nodes[channel.target.node]?.name ?? "?";
        // glTF path names -> three.js property names, which is what track names use
        const property = channel.target.path === "rotation" ? "quaternion"
          : channel.target.path === "translation" ? "position" : "scale";
        let values = shared.get(sampler.output);
        if (!values) { values = library.accessor(sampler.output).slice(); shared.set(sampler.output, values); }
        return [{ name: `${node}.${property}`, times: library.accessor(sampler.input), values }];
      }),
    }));
  }

  it("strips exactly the inert channels and keeps rotation + one root track", () => {
    const clips = realClips(40);
    const before = clips.reduce((sum, clip) => sum + clip.tracks.length, 0);
    const report = normalizeHumanoidLibrary(clips);
    expect(before).toBe(40 * 195);
    expect(report.tracksBefore).toBe(40 * 195);
    expect(report.tracksAfter).toBe(40 * 66);
    expect(report.anomalies).toEqual([]);
    // 66.2% of bindings removed
    expect((report.tracksBefore - report.tracksAfter) / report.tracksBefore).toBeCloseTo(0.6615, 3);
  });

  it("rebinds the root onto the proxy node and drops every scale track", () => {
    const clips = realClips(3);
    normalizeHumanoidLibrary(clips);
    for (const clip of clips) {
      expect(clip.tracks.filter((t) => t.name.endsWith(".scale"))).toHaveLength(0);
      const positions = clip.tracks.filter((t) => t.name.endsWith(".position"));
      expect(positions).toHaveLength(1);
      expect(positions[0]?.name).toBe(`${ROOT_MOTION_NODE}.position`);
      expect(clip.tracks.filter((t) => t.name.endsWith(".quaternion"))).toHaveLength(65);
    }
  });

  it("makes the root track dimensionless — idle pelvis lands at 0.9967 hip heights", () => {
    const clips = realClips(1, "BasicLocomotion__Idle");
    expect(clips).toHaveLength(1);
    normalizeHumanoidLibrary(clips);
    const root = clips[0]?.tracks.find((t) => t.name === `${ROOT_MOTION_NODE}.position`);
    if (!root) throw new Error("no root track");
    let sum = 0;
    let n = 0;
    for (let i = 2; i < root.values.length; i += 3) { sum += -(root.values[i] ?? 0); n += 1; }
    expect(sum / n).toBeCloseTo(0.9967, 3);
  });

  it("divides an ALIASED root array exactly once (the 192 mm bug)", () => {
    const shared = new Float64Array([0, 0, -0.5023]);
    const clips: AnimationClipLike[] = ["a", "b"].map((name) => ({
      name,
      tracks: [{ name: `${MIXAMO}Hips.position`, times: [0], values: shared }],
    }));
    const report = normalizeHumanoidLibrary(clips, { referenceHipHeight: 0.551676 });
    expect(report.rootTracksNormalized).toBe(1);
    expect(report.aliasedRootArrays).toBe(1);
    expect(shared[2]).toBeCloseTo(-0.5023 / 0.551676, 9);
    // the naive double-divide would land here instead
    expect(shared[2]).not.toBeCloseTo(-0.5023 / 0.551676 / 0.551676, 4);
  });

  it("is idempotent — a second pass leaves the proxy alone", () => {
    const clips = realClips(2);
    normalizeHumanoidLibrary(clips);
    const before = clips.map((c) => [...(c.tracks.find((t) => t.name.endsWith(".position"))?.values ?? [])]);
    const second = normalizeHumanoidLibrary(clips);
    expect(second.anomalies.filter((a) => a.kind !== "missing-root-track")).toEqual([]);
    const after = clips.map((c) => [...(c.tracks.find((t) => t.name.endsWith(".position"))?.values ?? [])]);
    expect(after).toEqual(before);
  });

  it("reports, rather than silently drops, a position track that really animates", () => {
    const clips: AnimationClipLike[] = [{
      name: "bad",
      tracks: [
        { name: `${MIXAMO}Hips.position`, times: [0], values: new Float64Array([0, 0, -0.5]) },
        { name: `${MIXAMO}LeftLeg.position`, times: [0, 1], values: new Float64Array([0, 0, 0, 0, 0.9, 0]) },
      ],
    }];
    const report = normalizeHumanoidLibrary(clips);
    expect(report.anomalies.some((a) => a.kind === "animated-position")).toBe(true);
  });

  it("reports a non-unit scale track and a clip with no root motion", () => {
    const clips: AnimationClipLike[] = [{
      name: "bad",
      tracks: [{ name: `${MIXAMO}Spine.scale`, times: [0], values: new Float64Array([1, 1.5, 1]) }],
    }];
    const report = normalizeHumanoidLibrary(clips);
    expect(report.anomalies.map((a) => a.kind).sort()).toEqual(["missing-root-track", "non-unit-scale"]);
  });

  it("re-expands the root motion on a body, along the hips-local up axis", () => {
    expect(HIPS_UP_AXIS).toBe(2);
    expect(HIPS_UP_SIGN).toBe(-1);
    const metrics = deriveRigMetrics(SHORT_PROFILE);
    const hips = { x: 0, y: 0, z: 0 };
    applyRootMotion({ x: 0.1, y: 0.2, z: -0.9967 }, hips, metrics);
    expect(hips.x).toBeCloseTo(0.1 * metrics.hipHeight, 12);
    expect(hips.z).toBeCloseTo(-0.9967 * metrics.hipHeight, 12);
    applyRootMotion({ x: 0, y: 0, z: -1 }, hips, metrics, 0.01);
    expect(hips.z).toBeCloseTo(-metrics.hipHeight - 0.01, 12);
    expect(rootMotionScaleFor(SHORT_PROFILE)).toBeCloseTo(SHORT_PROFILE.ground, 9);
  });
});

// ===========================================================================
describe("ground-drop correction", () => {
  function solverFor(profile: BodyProportionProfile): GroundDropSolver {
    const override = restOverrideFor(profile);
    const lookup = (source: Map<string, Vec3> | null) => (joint: string): readonly [number, number, number] => {
      const name = MIXAMO + joint;
      if (source) {
        const value = source.get(name);
        if (value) return value;
      }
      const index = rig.byName.get(name);
      const node = index === undefined ? undefined : rig.nodes[index];
      return [node?.translation?.[0] ?? 0, node?.translation?.[1] ?? 0, node?.translation?.[2] ?? 0];
    };
    return new GroundDropSolver(
      packGroundRest(lookup(override)),
      packGroundRest(lookup(null)),
      profile.ground,
    );
  }

  it("uses the eleven-joint ground chain", () => {
    expect(GROUND_SOLVER_JOINTS).toHaveLength(11);
    expect(GROUND_SOLVER_JOINTS[0]).toBe("Hips");
    expect(new Set(GROUND_SOLVER_JOINTS.slice(1))).toEqual(new Set(GROUND_CHAIN_JOINTS));
  });

  it("is the exact algebraic correction", () => {
    expect(solveGroundDrop(0.5, 0.6, 0.8)).toBeCloseTo(0.5 - 0.8 * 0.6, 12);
    expect(solveGroundDrop(0.48, 0.6, 0.8)).toBeCloseTo(0, 12);
  });

  /** Worst |correction| over the clip set, in mm at the body's own display height. */
  function worstCorrectionMm(profile: BodyProportionProfile): number {
    const solver = solverFor(profile);
    const metres = deriveRigMetrics(profile).metresPerRigUnit * 1000;
    let worst = 0;
    for (const name of CLIPS) {
      const duration = clipDuration(library, name);
      for (let k = 0; k < 8; k += 1) {
        const q = packGroundQuaternions(rig, library, name, (k / 8) * duration, GROUND_SOLVER_JOINTS);
        worst = Math.max(worst, Math.abs(solver.solve(q)) * metres);
      }
    }
    return worst;
  }

  it("is identically zero when the Hips->sole chain is uniformly scaled", () => {
    for (const ground of [0.7, 0.94, 1, 1.05, 1.3]) {
      const profile = makeProfile("uniform", { ground, spine: 0.9, skull: 1.2, upperArm: 1.3 });
      expect(needsGroundCorrection(profile)).toBe(false);
      expect(worstCorrectionMm(profile)).toBeLessThan(0.001);
    }
  });

  it("needs no correction at all for the 1.50 m body — height was never the hard part", () => {
    expect(SHORT_PROFILE.pelvisBreadth).toBe(1);
    expect(needsGroundCorrection(SHORT_PROFILE)).toBe(false);
    expect(worstCorrectionMm(SHORT_PROFILE)).toBeLessThan(0.001);
  });

  it("is non-zero exactly where a build widens the pelvis relative to its legs", () => {
    for (const profile of SHIPPED_PROFILES) {
      const worst = worstCorrectionMm(profile);
      if (profile.pelvisBreadth === 1) {
        expect(needsGroundCorrection(profile)).toBe(false);
        expect(worst).toBeLessThan(0.001);
      } else {
        expect(needsGroundCorrection(profile)).toBe(true);
        expect(worst).toBeGreaterThan(0.1);
        expect(worst).toBeLessThan(8);
      }
    }
    // the heavy build has the widest pelvis and therefore the biggest residual
    // (5.90 mm over the denser 7-clip x 48-sample sweep; this sweep is coarser)
    const heavy = worstCorrectionMm(HEAVY_PROFILE);
    expect(heavy).toBeGreaterThan(4);
    for (const profile of SHIPPED_PROFILES) expect(worstCorrectionMm(profile)).toBeLessThanOrEqual(heavy);
  });

  it("drives the floor error to zero on RULE-BREAKING profiles, end to end through real FK", () => {
    for (const profile of RULE_BREAKERS) {
      const solver = solverFor(profile);
      const override = restOverrideFor(profile);
      const metres = deriveRigMetrics(profile).metresPerRigUnit * 1000;
      let uncorrected = 0;
      let corrected = 0;
      for (const name of CLIPS) {
        const duration = clipDuration(library, name);
        for (let k = 0; k < 16; k += 1) {
          const t = (k / 16) * duration;
          const reference = poseRig(rig, library, name, t);
          const target = profile.ground * lowestSoleY(rig, reference);

          const plain = poseRig(rig, library, name, t, { restOverride: override, hipsScale: profile.ground });
          uncorrected = Math.max(uncorrected, Math.abs(lowestSoleY(rig, plain) - target) * metres);

          const correction = solver.solve(packGroundQuaternions(rig, library, name, t, GROUND_SOLVER_JOINTS));
          const fixed = poseRig(rig, library, name, t, {
            restOverride: override, hipsScale: profile.ground, groundCorrection: correction,
          });
          corrected = Math.max(corrected, Math.abs(lowestSoleY(rig, fixed) - target) * metres);
        }
      }
      expect(uncorrected).toBeGreaterThan(5);
      expect(corrected).toBeLessThan(0.01);
    }
  });

  it("removes the pelvis-breadth residual on the heavy build too", () => {
    const profile = HEAVY_PROFILE;
    const override = restOverrideFor(profile);
    const solver = solverFor(profile);
    const metres = deriveRigMetrics(profile).metresPerRigUnit * 1000;
    let plainWorst = 0;
    let fixedWorst = 0;
    for (const name of CLIPS) {
      const duration = clipDuration(library, name);
      for (let k = 0; k < 16; k += 1) {
        const t = (k / 16) * duration;
        const target = profile.ground * lowestSoleY(rig, poseRig(rig, library, name, t));
        plainWorst = Math.max(plainWorst, Math.abs(
          lowestSoleY(rig, poseRig(rig, library, name, t, { restOverride: override, hipsScale: profile.ground })) - target,
        ) * metres);
        const correction = solver.solve(packGroundQuaternions(rig, library, name, t, GROUND_SOLVER_JOINTS));
        fixedWorst = Math.max(fixedWorst, Math.abs(lowestSoleY(rig, poseRig(rig, library, name, t, {
          restOverride: override, hipsScale: profile.ground, groundCorrection: correction,
        })) - target) * metres);
      }
    }
    expect(plainWorst).toBeGreaterThan(1);
    expect(fixedWorst).toBeLessThan(0.01);
  });

  it("beats the raw library by two orders of magnitude on a 1.50 m body", () => {
    const profile = SHORT_PROFILE;
    const override = restOverrideFor(profile);
    const metres = deriveRigMetrics(profile).metresPerRigUnit * 1000;
    let raw = 0;
    let scaled = 0;
    for (const name of CLIPS) {
      const duration = clipDuration(library, name);
      for (let k = 0; k < 16; k += 1) {
        const t = (k / 16) * duration;
        const target = profile.ground * lowestSoleY(rig, poseRig(rig, library, name, t));
        raw = Math.max(raw, Math.abs(lowestSoleY(rig, poseRig(rig, library, name, t, { restOverride: override })) - target) * metres);
        scaled = Math.max(scaled, Math.abs(
          lowestSoleY(rig, poseRig(rig, library, name, t, { restOverride: override, hipsScale: profile.ground })) - target,
        ) * metres);
      }
    }
    expect(raw).toBeGreaterThan(50);
    expect(scaled).toBeLessThan(3);
  });

  it("is a pure function — bit-identical regardless of how the clock got there", () => {
    const solver = solverFor(RULE_BREAKERS[2] as BodyProportionProfile);
    const name = "BasicLocomotion__Walking";
    const duration = clipDuration(library, name);
    for (const probe of [0.1, 0.35, 0.6, 0.9]) {
      const t = probe * duration;
      const values = [144, 60, 30].map(() =>
        solver.solve(packGroundQuaternions(rig, library, name, t, GROUND_SOLVER_JOINTS)));
      expect(values[0]).toBe(values[1]);
      expect(values[1]).toBe(values[2]);
    }
  });

  it("refuses malformed input rather than silently zero-filling", () => {
    expect(() => new GroundDropSolver(new Float64Array(3), new Float64Array(33), 1)).toThrow(/rest components/);
    const solver = solverFor(REFERENCE_PROFILE);
    expect(() => solver.solve(new Float64Array(8))).toThrow(/quaternion components/);
    expect(() => packGroundRest(() => undefined)).toThrow(/no rest translation/);
  });
});

// ===========================================================================
describe("grip adaptation", () => {
  it("reproduces the catalog's own metres on the reference body", () => {
    expect(REFERENCE_PALM * deriveRigMetrics(REFERENCE_PROFILE).metresPerRigUnit)
      .toBeCloseTo(REFERENCE_PALM_METERS, 6);
    const cases: [string, [number, number, number]][] = [
      ["longsword", [0, 0.04, 0]],
      ["shortsword", [0, 0.062, 0.03]],
      ["mace", [0, 0.0543, 0.0114]],
      ["rod", [0, 0.05, 0.021]],
      ["bowHand", [0, -0.01, 0.03]],
    ];
    for (const [weapon, original] of cases) {
      const fraction = PALM_SOCKET_FRACTIONS[weapon];
      if (!fraction) throw new Error(`no fraction for ${weapon}`);
      const resolved = handSocketOffsetMeters(fraction, REFERENCE_PROFILE);
      for (let i = 0; i < 3; i += 1) expect(resolved[i]).toBeCloseTo(original[i] ?? 0, 5);
    }
  });

  it("round-trips an absolute catalog offset through the palm fraction", () => {
    const round = handSocketOffsetMeters(toPalmFraction([0, 0.0543, 0.0114]), REFERENCE_PROFILE);
    expect(round[1]).toBeCloseTo(0.0543, 9);
    expect(round[2]).toBeCloseTo(0.0114, 9);
  });

  it("makes the socket follow the hand instead of standing still", () => {
    const short = handSocketOffsetMeters(PALM_SOCKET_FRACTIONS.longsword ?? [0, 0, 0], SHORT_PROFILE);
    const tall = handSocketOffsetMeters(PALM_SOCKET_FRACTIONS.longsword ?? [0, 0, 0], TALL_PROFILE);
    expect(short[1]).toBeLessThan(0.04);
    expect(tall[1]).toBeGreaterThan(0.04);
    expect(palmMeters(SHORT_PROFILE) / REFERENCE_PALM_METERS).toBeCloseTo(0.8330, 3);
    expect(palmMeters(TALL_PROFILE) / REFERENCE_PALM_METERS).toBeCloseTo(1.1114, 3);
    const exact = handSocketOffsetMeters(toPalmFraction([0, 0.04, 0]), SHORT_PROFILE);
    expect(exact[1] / 0.04).toBeCloseTo(palmMeters(SHORT_PROFILE) / REFERENCE_PALM_METERS, 12);
  });

  it("scales torso sockets by the spine, not the palm", () => {
    const quiver = TORSO_SOCKET_FRACTIONS.quiver;
    if (!quiver) throw new Error("no quiver fraction");
    const resolved = torsoSocketOffsetMeters(quiver, REFERENCE_PROFILE);
    expect(resolved[0]).toBeCloseTo(-0.09, 4);
    expect(resolved[1]).toBeCloseTo(-0.12, 4);
    expect(resolved[2]).toBeCloseTo(-0.115, 4);
  });

  it("predicts grip drift in closed form and keeps every shipped build inside the budget", () => {
    expect(gripDriftMillimetres(REFERENCE_PROFILE, "longsword")).toBeCloseTo(0, 9);
    // worst case is the shortest body against the loosest grip
    const short = checkGripBudget(SHORT_PROFILE);
    expect(short.worstWeapon).toBe("longsword");
    expect(short.worstDriftMm).toBeCloseTo(4.32, 1);
    expect(short.withinBudget).toBe(true);
    for (const profile of SHIPPED_PROFILES) expect(checkGripBudget(profile).withinBudget).toBe(true);
    // and the drift is exactly |palmRatio - 1| * reference closest approach
    const ratio = palmMeters(LIGHT_PROFILE) / REFERENCE_PALM_METERS;
    expect(gripDriftMillimetres(LIGHT_PROFILE, "mace"))
      .toBeCloseTo(Math.abs(ratio - 1) * (REFERENCE_CLOSEST_APPROACH_MM.mace ?? 0), 9);
  });

  it("catches a hand scale that would break the calibration window", () => {
    const huge = makeProfile("ogre", { heightMeters: 2.6, ground: 1.05, hand: 1.15, digit: 1.15 });
    const report = checkGripBudget(huge);
    expect(report.palmRatio).toBeGreaterThan(1.3);
    expect(report.withinBudget).toBe(false);
    expect(report.worstDriftMm).toBeGreaterThan(10);
  });

  it("rejects an unknown weapon rather than returning a wrong number", () => {
    expect(() => gripDriftMillimetres(REFERENCE_PROFILE, "trebuchet")).toThrow(/no reference closest approach/);
  });
});
