import { describe, expect, it } from "vitest";
import {
  CANONICAL_JOINTS,
  CANONICAL_JOINT_COUNT,
  GROUND_CHAIN_JOINTS,
  canonicalizeJointName,
  validateHumanoidRig,
  type RigNodeLike,
} from "../src/rig/humanoidRigContract";
import {
  REFERENCE_METRICS,
  REFERENCE_PROFILE,
  applyProportionProfile,
  deriveRigMetrics,
  jointAxisScale,
  makeProfile,
  segmentGroupOf,
  validateProfile,
  type MutableBoneLike,
} from "../src/rig/proportionProfile";
import {
  CONSTANT_TRACK_EPSILON,
  ROOT_MOTION_NODE,
  applyRootMotion,
  normalizeHumanoidLibrary,
  type ClipLike,
} from "../src/rig/humanoidLibraryNormalizer";
import {
  FOREARM_TWIST_JOINTS,
  driveTwistJoint,
  predictedCollapseRatio,
  rollAngleAbout,
  twistAbout,
  twistNamesAreExtraJoints,
} from "../src/rig/twistJoints";

/** Build a contract-satisfying skeleton, optionally mutated. */
function canonicalNodes(mutate?: (nodes: RigNodeLike[]) => RigNodeLike[]): RigNodeLike[] {
  const byName = new Map<string, { name: string; isBone: boolean }>();
  for (const joint of CANONICAL_JOINTS) byName.set(joint.name, { name: `mixamorig:${joint.name}`, isBone: true });
  const nodes: RigNodeLike[] = CANONICAL_JOINTS.map((joint) => ({
    name: `mixamorig:${joint.name}`,
    parent: joint.parent === null
      ? { name: "Armature", isBone: false }
      : byName.get(joint.parent) ?? null,
  }));
  return mutate ? mutate(nodes) : nodes;
}

describe("humanoid rig contract", () => {
  it("declares exactly the 65 joints the shipped body and library share", () => {
    expect(CANONICAL_JOINT_COUNT).toBe(65);
    expect(CANONICAL_JOINTS[0]?.name).toBe("Hips");
    expect(CANONICAL_JOINTS[0]?.parent).toBeNull();
    // every non-root parent must itself be a declared joint that appears earlier
    const seen = new Set<string>();
    for (const joint of CANONICAL_JOINTS) {
      if (joint.parent !== null) expect(seen.has(joint.parent)).toBe(true);
      seen.add(joint.name);
    }
  });

  it("canonicalises every prefix form a sourced body might use", () => {
    for (const raw of ["mixamorig:Hips", "mixamorigHips", "mixamorig_Hips", "Armature|mixamorig:Hips", "Hips"]) {
      expect(canonicalizeJointName(raw)).toBe("Hips");
    }
    expect(canonicalizeJointName("mixamorig:LeftToe_End")).toBe("LeftToe_End");
  });

  it("passes a conforming skeleton", () => {
    const report = validateHumanoidRig(canonicalNodes());
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.foundJointCount).toBe(65);
    expect(report.resolved.get("LeftHand")).toBe("mixamorig:LeftHand");
  });

  it("allows extra joints, because that is where twist bones live", () => {
    const report = validateHumanoidRig(canonicalNodes((nodes) => [
      ...nodes,
      { name: "LeftForeArmTwist", parent: { name: "mixamorig:LeftForeArm", isBone: true } },
      { name: "LeftUpLegTwist", parent: { name: "mixamorig:LeftUpLeg", isBone: true } },
    ]));
    expect(report.ok).toBe(true);
    expect(report.extraJoints).toEqual(["LeftForeArmTwist", "LeftUpLegTwist"]);
  });

  it("names the missing joint rather than just failing", () => {
    const report = validateHumanoidRig(canonicalNodes((nodes) => nodes.filter((n) => n.name !== "mixamorig:LeftToeBase")));
    expect(report.ok).toBe(false);
    const missing = report.issues.filter((i) => i.kind === "missing");
    expect(missing.map((i) => i.joint)).toEqual(["LeftToeBase"]);
  });

  it("catches a twist bone interposed into the chain instead of hung off it", () => {
    // LeftHand reparented under a twist bone: the library's LeftHand rotations would then be
    // relative to the twist, not the forearm, and the whole hand would follow the twist.
    const report = validateHumanoidRig(canonicalNodes((nodes) => nodes.map((n) => (
      n.name === "mixamorig:LeftHand" ? { ...n, parent: { name: "LeftForeArmTwist", isBone: true } } : n
    ))));
    expect(report.ok).toBe(false);
    const wrong = report.issues.find((i) => i.kind === "wrong-parent");
    expect(wrong?.joint).toBe("LeftHand");
    expect(wrong?.detail).toContain("LeftForeArm");
  });

  it("catches a reordered joint array, because skin indices address that order", () => {
    const report = validateHumanoidRig(canonicalNodes((nodes) => {
      const copy = [...nodes];
      const [spine] = copy.splice(11, 1);
      if (spine) copy.push(spine);
      return copy;
    }));
    expect(report.issues.some((i) => i.kind === "out-of-order")).toBe(true);
    expect(validateHumanoidRig(canonicalNodes((nodes) => {
      const copy = [...nodes];
      const [spine] = copy.splice(11, 1);
      if (spine) copy.push(spine);
      return copy;
    }), { requireOrder: false }).ok).toBe(true);
  });

  it("puts every ground-chain joint in the contract", () => {
    const names = new Set(CANONICAL_JOINTS.map((j) => j.name));
    for (const joint of GROUND_CHAIN_JOINTS) expect(names.has(joint)).toBe(true);
    expect(GROUND_CHAIN_JOINTS).toHaveLength(10);
  });
});

describe("proportion profile", () => {
  it("groups joints so that only the ground chain is locked", () => {
    expect(segmentGroupOf("mixamorig:LeftLeg")).toBe("ground");
    expect(segmentGroupOf("mixamorig:LeftToe_End")).toBe("ground");
    expect(segmentGroupOf("mixamorig:LeftUpLeg")).toBe("pelvis");
    expect(segmentGroupOf("mixamorig:Hips")).toBe("rootOffset");
    expect(segmentGroupOf("mixamorig:LeftHandThumb2")).toBe("hand");
    expect(segmentGroupOf("mixamorig:Spine2")).toBe("spine");
  });

  it("locks the pelvis vertical axis to the ground scalar and frees its breadth", () => {
    const profile = makeProfile("wide", { ground: 0.62, pelvisBreadth: 1.15 });
    expect(jointAxisScale("mixamorig:LeftUpLeg", profile)).toEqual([1.15, 0.62, 1.15]);
    expect(jointAxisScale("mixamorig:LeftLeg", profile)).toEqual([0.62, 0.62, 0.62]);
    // the Hips offset is a rigid placement of the whole skeleton and must never be scaled
    expect(jointAxisScale("mixamorig:Hips", profile)).toEqual([1, 1, 1]);
  });

  it("rewrites bind translations without touching rotations", () => {
    const bones: MutableBoneLike[] = [
      { name: "mixamorig:Hips", position: { x: 0.004829, y: 0, z: -0.056026 } },
      { name: "mixamorig:LeftUpLeg", position: { x: 0.052001, y: -0.031352, z: 0.001114 } },
      { name: "mixamorig:LeftLeg", position: { x: 0, y: 0.239064, z: 0 } },
      { name: "mixamorig:LeftHandMiddle1", position: { x: 0.03, y: 0.01, z: 0 } },
    ];
    const changed = applyProportionProfile(bones, makeProfile("dwarf", { ground: 0.62, pelvisBreadth: 1.15, hand: 0.85 }));
    expect(changed).toBe(3);
    expect(bones[0]?.position.z).toBeCloseTo(-0.056026, 9);
    expect(bones[1]?.position.x).toBeCloseTo(0.052001 * 1.15, 9);
    expect(bones[1]?.position.y).toBeCloseTo(-0.031352 * 0.62, 9);
    expect(bones[2]?.position.y).toBeCloseTo(0.239064 * 0.62, 9);
    expect(bones[3]?.position.x).toBeCloseTo(0.03 * 0.85, 9);
  });

  it("reproduces the measured reference height from the profile alone", () => {
    const metrics = deriveRigMetrics(REFERENCE_PROFILE);
    // measured mesh height 0.999512 rig units; the analytic sum agrees to 8e-6 rig units
    expect(metrics.rigHeight).toBeCloseTo(REFERENCE_METRICS.rigHeight, 4);
    expect(metrics.hipHeight).toBeCloseTo(REFERENCE_METRICS.hipHeight, 9);
    expect(metrics.metresPerRigUnit).toBeCloseTo(1.800879, 3);
  });

  it("makes the root-motion scale exactly the ground scalar", () => {
    for (const ground of [0.62, 0.8, 0.99, 1.0, 1.11, 1.3]) {
      const metrics = deriveRigMetrics(makeProfile("g", { ground, spine: 1.25, neck: 0.9, skull: 1.3, pelvisBreadth: 1.4 }));
      expect(metrics.rootMotionScale).toBe(ground);
      // and hip height scales by exactly that factor, whatever the free groups do
      expect(metrics.hipHeight / REFERENCE_METRICS.hipHeight).toBeCloseTo(ground, 12);
    }
  });

  it("treats a pure height change as a single number", () => {
    const short = deriveRigMetrics(makeProfile("short", { heightMeters: 1.5 }));
    const tall = deriveRigMetrics(makeProfile("tall", { heightMeters: 2.0 }));
    // same shape: identical rig height in rig units, only the metre conversion differs
    expect(short.rigHeight).toBeCloseTo(tall.rigHeight, 12);
    expect(short.metresPerRigUnit / tall.metresPerRigUnit).toBeCloseTo(1.5 / 2.0, 12);
    expect(short.rootMotionScale).toBe(1);
  });

  it("rejects profiles outside the range the residuals were measured over", () => {
    expect(validateProfile(REFERENCE_PROFILE)).toEqual([]);
    expect(validateProfile(makeProfile("x", { ground: 0.2 })).map((v) => v.field)).toContain("ground");
    expect(validateProfile(makeProfile("x", { heightMeters: 5 })).map((v) => v.field)).toContain("heightMeters");
    expect(validateProfile(makeProfile("x", { hand: 0 })).map((v) => v.field)).toContain("hand");
  });
});

/** A miniature library shaped like the real one: constant positions, unit scales, one live hips track. */
function fixtureLibrary(): ClipLike[] {
  return [{
    name: "Fixture__Walk",
    tracks: [
      { name: "mixamorigHips.position", values: [0, 0, -0.5558, 0, 0.4705, -0.5502] },
      { name: "mixamorigHips.quaternion", values: [0, 0, 0, 1, 0, 0, 0, 1] },
      { name: "mixamorigLeftLeg.position", values: [0, 0.239064, 0, 0, 0.239064, 0] },
      { name: "mixamorigLeftLeg.quaternion", values: [0, 0, 0, 1, 0, 0, 0, 1] },
      { name: "mixamorigLeftLeg.scale", values: [1, 1, 1, 1, 1, 1] },
      { name: "mixamorigLeftFoot.position", values: [0, 0.231324, 0, 0, 0.231324, 0] },
      { name: "mixamorigLeftFoot.scale", values: [1, 1, 1, 1, 1, 1] },
    ],
  }];
}

describe("humanoid library normaliser", () => {
  it("drops the constant position and unit scale tracks that would stamp source proportions onto every body", () => {
    const clips = fixtureLibrary();
    const report = normalizeHumanoidLibrary(clips);
    expect(report.droppedConstantPosition).toBe(2);
    expect(report.droppedUnitScale).toBe(2);
    expect(report.rootMotionTracks).toBe(1);
    expect(report.anomalies).toEqual([]);
    expect(report.tracksBefore).toBe(7);
    expect(report.tracksAfter).toBe(3);
    expect(clips[0]?.tracks.map((t) => t.name)).toEqual([
      `${ROOT_MOTION_NODE}.position`,
      "mixamorigHips.quaternion",
      "mixamorigLeftLeg.quaternion",
    ]);
  });

  it("rewrites the hips track into hip-height units", () => {
    const clips = fixtureLibrary();
    normalizeHumanoidLibrary(clips);
    const track = clips[0]?.tracks[0];
    // 0.5558 rig units of pelvis height is 1.0 standing hip heights, by construction
    expect(track?.values[2]).toBeCloseTo(-0.5558 / REFERENCE_METRICS.hipHeight, 6);
    expect(track?.values[4]).toBeCloseTo(0.4705 / REFERENCE_METRICS.hipHeight, 6);
  });

  it("round-trips to the source values on the reference body and to k*source on a scaled one", () => {
    const clips = fixtureLibrary();
    normalizeHumanoidLibrary(clips);
    const track = clips[0]?.tracks[0];
    const normalized = { x: track?.values[3] ?? 0, y: track?.values[4] ?? 0, z: track?.values[5] ?? 0 };
    const hips = { x: 0, y: 0, z: 0 };

    applyRootMotion(normalized, hips, deriveRigMetrics(REFERENCE_PROFILE).hipHeight);
    expect(hips.y).toBeCloseTo(0.4705, 9);
    expect(hips.z).toBeCloseTo(-0.5502, 6); // float32 accessor precision

    const dwarf = makeProfile("dwarf", { heightMeters: 1.35, ground: 0.62, pelvisBreadth: 1.15 });
    applyRootMotion(normalized, hips, deriveRigMetrics(dwarf).hipHeight);
    expect(hips.y).toBeCloseTo(0.4705 * 0.62, 9);
    expect(hips.z).toBeCloseTo(-0.5502 * 0.62, 9);
  });

  it("is a no-op the second time, so a shared library can be normalised defensively", () => {
    const clips = fixtureLibrary();
    normalizeHumanoidLibrary(clips);
    const before = clips[0]?.tracks.map((t) => ({ name: t.name, values: [...(t.values as unknown as number[])] }));
    const second = normalizeHumanoidLibrary(clips);
    expect(second.droppedConstantPosition).toBe(0);
    expect(second.droppedUnitScale).toBe(0);
    expect(second.rootMotionTracks).toBe(0);
    expect(clips[0]?.tracks.map((t) => ({ name: t.name, values: [...(t.values as unknown as number[])] }))).toEqual(before);
  });

  it("reports rather than silently discards a position track that actually animates", () => {
    const clips = fixtureLibrary();
    const leg = clips[0]?.tracks[2];
    if (leg) leg.values[4] = 0.239064 + 10 * CONSTANT_TRACK_EPSILON;
    const report = normalizeHumanoidLibrary(clips);
    expect(report.droppedConstantPosition).toBe(1);
    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0]).toContain("ANIMATED position track");
    expect(clips[0]?.tracks.some((t) => t.name === "mixamorigLeftLeg.position")).toBe(true);
  });

  it("reports a constant position track that disagrees with the body it will play on", () => {
    const clips = fixtureLibrary();
    const report = normalizeHumanoidLibrary(clips, {
      referenceBind: new Map([
        ["LeftLeg", [0, 0.239064, 0]],
        ["LeftFoot", [0, 0.199000, 0]], // a body with a 32 mm shorter shin than the library expects
      ]),
    });
    expect(report.droppedConstantPosition).toBe(1);
    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0]).toContain("disagrees with the body bind");
  });

  it("keeps a non-unit scale track instead of throwing away squash and stretch", () => {
    const clips = fixtureLibrary();
    const scale = clips[0]?.tracks[4];
    if (scale) scale.values[1] = 1.4;
    const report = normalizeHumanoidLibrary(clips);
    expect(report.droppedUnitScale).toBe(1);
    expect(report.anomalies[0]).toContain("non-unit scale track");
    expect(clips[0]?.tracks.some((t) => t.name === "mixamorigLeftLeg.scale")).toBe(true);
  });
});

describe("twist joints", () => {
  const AXIS = { x: 0, y: 1, z: 0 };
  const rollQuat = (angle: number) => ({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) });
  const swingQuat = (angle: number) => ({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) });

  it("extracts a pure roll exactly and reports no twist for a pure swing", () => {
    expect(rollAngleAbout(rollQuat(1.1), AXIS)).toBeCloseTo(1.1, 12);
    expect(rollAngleAbout(rollQuat(-2.3), AXIS)).toBeCloseTo(-2.3, 12);
    expect(rollAngleAbout(swingQuat(1.0), AXIS)).toBeCloseTo(0, 12);
    const t = twistAbout(swingQuat(1.0), AXIS, { x: 0, y: 0, z: 0, w: 1 });
    expect(t.w).toBeCloseTo(1, 12);
  });

  it("splits a combined swing and roll back into just the roll", () => {
    // roll then swing, as a bent-and-pronated forearm would be
    const roll = rollQuat(1.4);
    const swing = swingQuat(0.7);
    const combined = {
      x: swing.w * roll.x + swing.x * roll.w,
      y: swing.w * roll.y - swing.x * roll.z,
      z: swing.w * roll.z + swing.x * roll.y,
      w: swing.w * roll.w - swing.x * roll.x,
    };
    expect(rollAngleAbout(combined, AXIS)).toBeCloseTo(1.4, 9);
  });

  it("hands the twist bone the configured fraction of the wrist roll", () => {
    const spec = FOREARM_TWIST_JOINTS[0];
    expect(spec).toBeDefined();
    if (!spec) return;
    const twistLocalRotation = { x: 0, y: 0, z: 0, w: 1 };
    const angle = driveTwistJoint(spec, { driverLocalRotation: rollQuat(Math.PI), twistLocalRotation });
    expect(angle).toBeCloseTo(Math.PI, 9);
    expect(rollAngleAbout(twistLocalRotation, AXIS)).toBeCloseTo(Math.PI * spec.factor, 9);
  });

  it("reproduces the measured collapse law and prices each extra twist bone", () => {
    // measured on the shipped body: worst radius / bind radius at these rolls
    const measured: ReadonlyArray<readonly [number, number]> = [
      [30, 0.9659], [45, 0.9239], [60, 0.8660], [90, 0.7071], [120, 0.5000], [150, 0.2588],
    ];
    for (const [deg, ratio] of measured) {
      expect(predictedCollapseRatio((deg * Math.PI) / 180, 0)).toBeCloseTo(ratio, 4);
    }
    const pi = Math.PI;
    expect(predictedCollapseRatio(pi, 0)).toBeCloseTo(0, 6);
    expect(predictedCollapseRatio(pi, 1)).toBeCloseTo(0.70711, 5);
    expect(predictedCollapseRatio(pi, 2)).toBeCloseTo(0.86603, 5);
  });

  it("keeps twist bones out of the canonical namespace so the library never targets them", () => {
    expect(twistNamesAreExtraJoints(FOREARM_TWIST_JOINTS)).toBe(true);
    const nodes = [
      ...CANONICAL_JOINTS.map((joint) => ({
        name: `mixamorig:${joint.name}`,
        parent: joint.parent === null ? { name: "Armature", isBone: false } : { name: `mixamorig:${joint.parent}`, isBone: true },
      })),
      ...FOREARM_TWIST_JOINTS.map((spec) => ({ name: spec.name, parent: { name: `mixamorig:${spec.parent}`, isBone: true } })),
    ];
    const report = validateHumanoidRig(nodes);
    expect(report.ok).toBe(true);
    expect(report.extraJoints).toEqual(["LeftForeArmTwist", "RightForeArmTwist"]);
  });
});

describe("humanoid library normaliser, accessor aliasing", () => {
  it("scales a values array shared by duplicate clips exactly once", () => {
    // The shipped glTF deduplicates identical accessors: 18,191 of its 78,000 tracks share a
    // values array with another track, and BasicLocomotion__Walking and MaleLocomotion__Walking
    // are byte-identical duplicates. An unguarded in-place rewrite divides those twice.
    const shared = new Float32Array([0, 0, -0.5558, 0, 0.4705, -0.5502]);
    const clips: ClipLike[] = [
      { name: "A__Walk", tracks: [{ name: "mixamorigHips.position", values: shared }] },
      { name: "B__Walk", tracks: [{ name: "mixamorigHips.position", values: shared }] },
    ];
    const report = normalizeHumanoidLibrary(clips);
    expect(report.rootMotionTracks).toBe(2);
    expect(report.rootMotionTracksAliased).toBe(1);
    expect(report.anomalies).toEqual([]);
    expect(shared[2]).toBeCloseTo(-0.5558 / REFERENCE_METRICS.hipHeight, 6);
    expect(clips[1]?.tracks[0]?.name).toBe(`${ROOT_MOTION_NODE}.position`);
    // both clips must reconstruct the same pelvis height, not one half the other's
    const hips = { x: 0, y: 0, z: 0 };
    applyRootMotion({ x: shared[3] ?? 0, y: shared[4] ?? 0, z: shared[5] ?? 0 }, hips, REFERENCE_METRICS.hipHeight);
    expect(hips.z).toBeCloseTo(-0.5502, 6); // float32 accessor precision
  });

  it("refuses to rewrite an array that a non-root-motion track also points at", () => {
    const shared = new Float32Array([0, 0.239064, 0, 0, 0.239064, 0]);
    const clips: ClipLike[] = [{
      name: "A", tracks: [
        { name: "mixamorigLeftLeg.position", values: shared },
        { name: "mixamorigHips.position", values: shared },
      ],
    }];
    const report = normalizeHumanoidLibrary(clips);
    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0]).toContain("shares its values array");
    expect(shared[1]).toBeCloseTo(0.239064, 6); // float32 accessor precision
  });

  it("leaves an already-normalised library completely alone", () => {
    const clips = fixtureLibrary();
    normalizeHumanoidLibrary(clips);
    const snapshot = clips[0]?.tracks.map((t) => ({ name: t.name, values: Array.from(t.values as unknown as ArrayLike<number>) }));
    const second = normalizeHumanoidLibrary(clips);
    expect(second.rootMotionTracks).toBe(0);
    expect(second.rootMotionTracksAlreadyNormalized).toBe(1);
    expect(second.anomalies).toEqual([]);
    expect(clips[0]?.tracks.map((t) => ({ name: t.name, values: Array.from(t.values as unknown as ArrayLike<number>) }))).toEqual(snapshot);
  });
});
