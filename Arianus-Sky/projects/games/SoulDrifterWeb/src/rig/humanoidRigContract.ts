/**
 * The humanoid rig contract.
 *
 * One animation library serves every body — every build, every presentation, every race,
 * every height — provided each body satisfies this contract. The contract is deliberately
 * mechanical: a body either passes `validateHumanoidRig` or it does not, and the report
 * says exactly which joint is wrong.
 *
 * Measured against the shipped pair on 2026-09-04:
 *   body     public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb
 *   library  public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb
 * Both carry these 65 joints, in this order, with these parents.
 *
 * WHY NAMES ARE STORED WITHOUT A PREFIX
 * The GLB stores `mixamorig:Hips`; three.js sanitises that to `mixamorigHips` when it
 * builds the scene, because `:` is reserved in animation track paths. A body sourced from
 * somewhere else may use `mixamorig_Hips`, `Hips`, or `Armature|Hips`. The contract is
 * defined on the canonical stem so that all of those forms can be checked and bound.
 */

/** A joint's canonical stem: no rig prefix, no separators, no namespace. */
export function canonicalizeJointName(raw: string): string {
  const afterNamespace = raw.slice(raw.lastIndexOf("|") + 1);
  return afterNamespace.replace(/^mixamorig[:_\s]*/i, "").trim();
}

/** The minimum a node must expose to be checked. Three.js `Bone` satisfies it structurally. */
export interface RigNodeLike {
  readonly name: string;
  readonly parent?: { readonly name: string; readonly isBone?: boolean } | null;
}

export interface CanonicalJoint {
  readonly name: string;
  /** null only for the root joint, `Hips`. */
  readonly parent: string | null;
  /** Position in the required joint order. */
  readonly index: number;
}

const JOINT_TABLE: ReadonlyArray<readonly [string, string | null]> = [
  ["Hips", null],
  ["LeftUpLeg", "Hips"],
  ["LeftLeg", "LeftUpLeg"],
  ["LeftFoot", "LeftLeg"],
  ["LeftToeBase", "LeftFoot"],
  ["LeftToe_End", "LeftToeBase"],
  ["RightUpLeg", "Hips"],
  ["RightLeg", "RightUpLeg"],
  ["RightFoot", "RightLeg"],
  ["RightToeBase", "RightFoot"],
  ["RightToe_End", "RightToeBase"],
  ["Spine", "Hips"],
  ["Spine1", "Spine"],
  ["Spine2", "Spine1"],
  ["LeftShoulder", "Spine2"],
  ["LeftArm", "LeftShoulder"],
  ["LeftForeArm", "LeftArm"],
  ["LeftHand", "LeftForeArm"],
  ["LeftHandIndex1", "LeftHand"],
  ["LeftHandIndex2", "LeftHandIndex1"],
  ["LeftHandIndex3", "LeftHandIndex2"],
  ["LeftHandIndex4", "LeftHandIndex3"],
  ["LeftHandMiddle1", "LeftHand"],
  ["LeftHandMiddle2", "LeftHandMiddle1"],
  ["LeftHandMiddle3", "LeftHandMiddle2"],
  ["LeftHandMiddle4", "LeftHandMiddle3"],
  ["LeftHandPinky1", "LeftHand"],
  ["LeftHandPinky2", "LeftHandPinky1"],
  ["LeftHandPinky3", "LeftHandPinky2"],
  ["LeftHandPinky4", "LeftHandPinky3"],
  ["LeftHandRing1", "LeftHand"],
  ["LeftHandRing2", "LeftHandRing1"],
  ["LeftHandRing3", "LeftHandRing2"],
  ["LeftHandRing4", "LeftHandRing3"],
  ["LeftHandThumb1", "LeftHand"],
  ["LeftHandThumb2", "LeftHandThumb1"],
  ["LeftHandThumb3", "LeftHandThumb2"],
  ["LeftHandThumb4", "LeftHandThumb3"],
  ["Neck", "Spine2"],
  ["Head", "Neck"],
  ["HeadTop_End", "Head"],
  ["RightShoulder", "Spine2"],
  ["RightArm", "RightShoulder"],
  ["RightForeArm", "RightArm"],
  ["RightHand", "RightForeArm"],
  ["RightHandIndex1", "RightHand"],
  ["RightHandIndex2", "RightHandIndex1"],
  ["RightHandIndex3", "RightHandIndex2"],
  ["RightHandIndex4", "RightHandIndex3"],
  ["RightHandMiddle1", "RightHand"],
  ["RightHandMiddle2", "RightHandMiddle1"],
  ["RightHandMiddle3", "RightHandMiddle2"],
  ["RightHandMiddle4", "RightHandMiddle3"],
  ["RightHandPinky1", "RightHand"],
  ["RightHandPinky2", "RightHandPinky1"],
  ["RightHandPinky3", "RightHandPinky2"],
  ["RightHandPinky4", "RightHandPinky3"],
  ["RightHandRing1", "RightHand"],
  ["RightHandRing2", "RightHandRing1"],
  ["RightHandRing3", "RightHandRing2"],
  ["RightHandRing4", "RightHandRing3"],
  ["RightHandThumb1", "RightHand"],
  ["RightHandThumb2", "RightHandThumb1"],
  ["RightHandThumb3", "RightHandThumb2"],
  ["RightHandThumb4", "RightHandThumb3"],
];

export const CANONICAL_JOINTS: readonly CanonicalJoint[] = JOINT_TABLE.map(
  ([name, parent], index) => ({ name, parent, index }),
);

export const CANONICAL_JOINT_COUNT = CANONICAL_JOINTS.length;

export const CANONICAL_JOINT_INDEX: ReadonlyMap<string, number> = new Map(
  CANONICAL_JOINTS.map((joint) => [joint.name, joint.index]),
);

export const CANONICAL_PARENT: ReadonlyMap<string, string | null> = new Map(
  CANONICAL_JOINTS.map((joint) => [joint.name, joint.parent]),
);

/**
 * The ground chain: the joints whose bone lengths decide how far the pelvis sits above the
 * floor. Their lengths must all scale by ONE scalar (see `proportionProfile.ts`); that is
 * what makes the shared library's root-motion track exact on any body.
 *
 * `LeftUpLeg` / `RightUpLeg` are in the chain because the Hips -> UpLeg offset carries a
 * measured 0.031352 rig-unit vertical drop as well as its 0.052001 lateral half-width. Only
 * the vertical axis is locked; pelvis breadth stays free.
 */
export const GROUND_CHAIN_JOINTS: readonly string[] = [
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "LeftToe_End",
  "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase", "RightToe_End",
];

export interface RigContractIssue {
  readonly joint: string;
  readonly kind: "missing" | "duplicated" | "wrong-parent" | "out-of-order";
  readonly detail: string;
}

export interface RigContractReport {
  readonly ok: boolean;
  readonly canonicalJointCount: number;
  readonly foundJointCount: number;
  readonly issues: readonly RigContractIssue[];
  /** Joints present on the body that the library never targets. Always allowed: twist bones live here. */
  readonly extraJoints: readonly string[];
  /** Canonical name -> the raw node name it was matched to. */
  readonly resolved: ReadonlyMap<string, string>;
}

export interface ValidateOptions {
  /**
   * Require the canonical joints to appear in the canonical order. Joint order is what the
   * skin's `JOINTS_0` indices reference, so a body whose order differs will skin to the
   * wrong bones unless its own inverse-bind matrices are re-indexed to match.
   */
  readonly requireOrder?: boolean;
}

/**
 * Check a skeleton against the contract.
 *
 * `nodes` must be supplied in the skeleton's own joint order — for three.js that is
 * `skinnedMesh.skeleton.bones`, NOT scene traversal order, because the skin indices address
 * `skeleton.bones`. (On the shipped body the two happen to agree; do not rely on that.)
 */
export function validateHumanoidRig(
  nodes: readonly RigNodeLike[],
  options: ValidateOptions = {},
): RigContractReport {
  const requireOrder = options.requireOrder ?? true;
  const issues: RigContractIssue[] = [];
  const resolved = new Map<string, string>();
  const extraJoints: string[] = [];
  const canonicalOrder: string[] = [];

  for (const node of nodes) {
    const canonical = canonicalizeJointName(node.name);
    if (!CANONICAL_JOINT_INDEX.has(canonical)) {
      extraJoints.push(node.name);
      continue;
    }
    if (resolved.has(canonical)) {
      issues.push({
        joint: canonical,
        kind: "duplicated",
        detail: `matched by both "${resolved.get(canonical) ?? "?"}" and "${node.name}"`,
      });
      continue;
    }
    resolved.set(canonical, node.name);
    canonicalOrder.push(canonical);

    const expectedParent = CANONICAL_PARENT.get(canonical) ?? null;
    const rawParent = node.parent?.name;
    const actualParent = rawParent === undefined ? null : canonicalizeJointName(rawParent);
    if (expectedParent === null) {
      // Hips may hang off an armature node; only a *canonical* parent would be wrong.
      if (actualParent !== null && CANONICAL_JOINT_INDEX.has(actualParent)) {
        issues.push({
          joint: canonical,
          kind: "wrong-parent",
          detail: `root joint must not be parented to another canonical joint, found "${actualParent}"`,
        });
      }
    } else if (actualParent !== expectedParent) {
      issues.push({
        joint: canonical,
        kind: "wrong-parent",
        detail: `expected parent "${expectedParent}", found "${actualParent ?? "(none)"}"`,
      });
    }
  }

  for (const joint of CANONICAL_JOINTS) {
    if (!resolved.has(joint.name)) {
      issues.push({ joint: joint.name, kind: "missing", detail: "not present on this body" });
    }
  }

  if (requireOrder) {
    let previous = -1;
    for (const name of canonicalOrder) {
      const index = CANONICAL_JOINT_INDEX.get(name) ?? -1;
      if (index < previous) {
        issues.push({
          joint: name,
          kind: "out-of-order",
          detail: `canonical index ${index} follows ${previous}; joint order must be ascending`,
        });
      }
      previous = Math.max(previous, index);
    }
  }

  return {
    ok: issues.length === 0,
    canonicalJointCount: CANONICAL_JOINT_COUNT,
    foundJointCount: resolved.size,
    issues,
    extraJoints,
    resolved,
  };
}
