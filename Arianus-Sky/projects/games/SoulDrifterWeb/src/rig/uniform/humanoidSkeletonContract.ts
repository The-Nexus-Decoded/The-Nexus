/**
 * The skeleton contract: what a body has to be for the shared 400-clip library to
 * play on it correctly.
 *
 * This is the shopping list for whoever sources a new body. It is mechanically
 * checkable — `validateHumanoidBody` returns yes/no plus a named reason per
 * failing joint, so sourcing is a pass/fail step and never a judgement call.
 *
 * Everything asserted here was measured first-hand against the two shipped GLBs:
 *   body    public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb
 *   library public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb
 *
 * Measured facts the contract rests on:
 *   - The library is 400 clips x 195 channels = 78,000 channels, and every clip
 *     carries rotation + translation + scale on all 65 joints (shape "65/65/65"
 *     on all 400, no exceptions).
 *   - All 26,000 rotation channels target exactly the 65 canonical joints. Zero
 *     channels target anything else. That is what makes EXTRA joints free: a clip
 *     cannot drive a channel it does not have, so twist bones, tails, ears and
 *     wings can be added and driven procedurally while all 400 clips still play.
 *   - Because every one of the 65 joints carries a quaternion track in all 400
 *     clips, bind ROTATIONS are fully overwritten every frame and are therefore
 *     NOT part of the contract. A body may bind in an A-pose or a T-pose. Only
 *     bind TRANSLATIONS survive, which is exactly what the proportion profile
 *     is allowed to change.
 */

/** A canonical joint: its contract name and the parent it must hang off. */
export interface CanonicalJoint {
  readonly name: string;
  /** null only for `Hips`, which may hang off any NON-canonical node (an armature). */
  readonly parent: string | null;
}

/**
 * The 65 joints, in the exact skin order read out of the shipped body.
 * Verified: the animation library's own skin lists the same 65 names in the same
 * order (`joint order identical body<->lib: true`).
 */
export const CANONICAL_JOINTS: readonly CanonicalJoint[] = Object.freeze([
  { name: "Hips", parent: null },
  { name: "LeftUpLeg", parent: "Hips" },
  { name: "LeftLeg", parent: "LeftUpLeg" },
  { name: "LeftFoot", parent: "LeftLeg" },
  { name: "LeftToeBase", parent: "LeftFoot" },
  { name: "LeftToe_End", parent: "LeftToeBase" },
  { name: "RightUpLeg", parent: "Hips" },
  { name: "RightLeg", parent: "RightUpLeg" },
  { name: "RightFoot", parent: "RightLeg" },
  { name: "RightToeBase", parent: "RightFoot" },
  { name: "RightToe_End", parent: "RightToeBase" },
  { name: "Spine", parent: "Hips" },
  { name: "Spine1", parent: "Spine" },
  { name: "Spine2", parent: "Spine1" },
  { name: "LeftShoulder", parent: "Spine2" },
  { name: "LeftArm", parent: "LeftShoulder" },
  { name: "LeftForeArm", parent: "LeftArm" },
  { name: "LeftHand", parent: "LeftForeArm" },
  { name: "LeftHandIndex1", parent: "LeftHand" },
  { name: "LeftHandIndex2", parent: "LeftHandIndex1" },
  { name: "LeftHandIndex3", parent: "LeftHandIndex2" },
  { name: "LeftHandIndex4", parent: "LeftHandIndex3" },
  { name: "LeftHandMiddle1", parent: "LeftHand" },
  { name: "LeftHandMiddle2", parent: "LeftHandMiddle1" },
  { name: "LeftHandMiddle3", parent: "LeftHandMiddle2" },
  { name: "LeftHandMiddle4", parent: "LeftHandMiddle3" },
  { name: "LeftHandPinky1", parent: "LeftHand" },
  { name: "LeftHandPinky2", parent: "LeftHandPinky1" },
  { name: "LeftHandPinky3", parent: "LeftHandPinky2" },
  { name: "LeftHandPinky4", parent: "LeftHandPinky3" },
  { name: "LeftHandRing1", parent: "LeftHand" },
  { name: "LeftHandRing2", parent: "LeftHandRing1" },
  { name: "LeftHandRing3", parent: "LeftHandRing2" },
  { name: "LeftHandRing4", parent: "LeftHandRing3" },
  { name: "LeftHandThumb1", parent: "LeftHand" },
  { name: "LeftHandThumb2", parent: "LeftHandThumb1" },
  { name: "LeftHandThumb3", parent: "LeftHandThumb2" },
  { name: "LeftHandThumb4", parent: "LeftHandThumb3" },
  { name: "Neck", parent: "Spine2" },
  { name: "Head", parent: "Neck" },
  { name: "HeadTop_End", parent: "Head" },
  { name: "RightShoulder", parent: "Spine2" },
  { name: "RightArm", parent: "RightShoulder" },
  { name: "RightForeArm", parent: "RightArm" },
  { name: "RightHand", parent: "RightForeArm" },
  { name: "RightHandIndex1", parent: "RightHand" },
  { name: "RightHandIndex2", parent: "RightHandIndex1" },
  { name: "RightHandIndex3", parent: "RightHandIndex2" },
  { name: "RightHandIndex4", parent: "RightHandIndex3" },
  { name: "RightHandMiddle1", parent: "RightHand" },
  { name: "RightHandMiddle2", parent: "RightHandMiddle1" },
  { name: "RightHandMiddle3", parent: "RightHandMiddle2" },
  { name: "RightHandMiddle4", parent: "RightHandMiddle3" },
  { name: "RightHandPinky1", parent: "RightHand" },
  { name: "RightHandPinky2", parent: "RightHandPinky1" },
  { name: "RightHandPinky3", parent: "RightHandPinky2" },
  { name: "RightHandPinky4", parent: "RightHandPinky3" },
  { name: "RightHandRing1", parent: "RightHand" },
  { name: "RightHandRing2", parent: "RightHandRing1" },
  { name: "RightHandRing3", parent: "RightHandRing2" },
  { name: "RightHandRing4", parent: "RightHandRing3" },
  { name: "RightHandThumb1", parent: "RightHand" },
  { name: "RightHandThumb2", parent: "RightHandThumb1" },
  { name: "RightHandThumb3", parent: "RightHandThumb2" },
  { name: "RightHandThumb4", parent: "RightHandThumb3" },
]);

export const CANONICAL_JOINT_COUNT = CANONICAL_JOINTS.length;

export const CANONICAL_INDEX: ReadonlyMap<string, number> = new Map(
  CANONICAL_JOINTS.map((joint, index) => [joint.name, index] as const),
);

/**
 * The ground chain: the only joints whose lengths decide how far the pelvis sits
 * above the floor. Called out separately because the proportion profile locks
 * them to a single scalar (see `bodyProportionProfile.ts`).
 */
export const GROUND_CHAIN_JOINTS: readonly string[] = Object.freeze([
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "LeftToe_End",
  "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase", "RightToe_End",
]);

/**
 * The joints the floor is measured from. Measured: posing the shipped body with
 * the shipped clips puts the lowest of these at Y = 0 — median 0.000357 rig units
 * over all 400 clips, and 385 of 400 clips within +/-0.02. (The 15 outliers are
 * the ladder/rope/swim Interactions clips, which are genuinely off the ground.)
 *
 * This is why the floor reference is the lowest SOLE JOINT and not the mesh
 * bounding box: the mesh sole sits a further 0.004105 rig units (7.5 mm at 1.8 m)
 * below the lowest toe joint, and using it shifts every derived hip height.
 */
export const SOLE_JOINTS: readonly string[] = Object.freeze([
  "LeftFoot", "LeftToeBase", "LeftToe_End",
  "RightFoot", "RightToeBase", "RightToe_End",
]);

/**
 * The armature rest rotation, +90 degrees about X. Verified byte-identical in the
 * body (`HumanFoundation_Armature`) and the library (`Armature`) — only the NAME
 * differs, and `src/game/animationPacks.ts` already remaps by /armature$/i.
 *
 * Load-bearing: the root-motion track is expressed in this frame. Measured by
 * perturbing each hips-local axis and reading the world delta:
 *   local +x -> world (+0.1,  0,     0   )
 *   local +y -> world ( 0,    0,    +0.1 )
 *   local +z -> world ( 0,   -0.1,   0   )
 * so the hips VERTICAL channel is local z with a NEGATIVE sign.
 */
export const ARMATURE_REST_ROTATION: readonly [number, number, number, number] =
  Object.freeze([0.7071068, 0, 0, 0.7071068]) as unknown as readonly [number, number, number, number];

/** Index into a hips-local translation that maps to world up, and its sign. */
export const HIPS_UP_AXIS = 2 as const;
export const HIPS_UP_SIGN = -1 as const;

const CANONICAL_NAMES = new Set(CANONICAL_JOINTS.map((joint) => joint.name));

/**
 * Reduce a node name to its canonical stem. A body exported from any tool should
 * still be checkable, so all of these resolve to `Hips`:
 *   mixamorig:Hips   mixamorigHips   mixamorig_Hips   Armature|mixamorig:Hips   Hips
 * Returns null when the name is not a canonical joint (an extra joint, an
 * armature, a mesh node).
 */
export function canonicalizeJointName(raw: string): string | null {
  let name = raw;
  const bar = name.lastIndexOf("|");
  if (bar >= 0) name = name.slice(bar + 1);
  const colon = name.lastIndexOf(":");
  if (colon >= 0) name = name.slice(colon + 1);
  if (CANONICAL_NAMES.has(name)) return name;
  const stripped = name.replace(/^mixamorig[_-]?/i, "");
  return CANONICAL_NAMES.has(stripped) ? stripped : null;
}

export type ContractIssueCode =
  | "missing-joint"
  | "duplicate-joint"
  | "wrong-parent"
  | "root-parented-to-joint"
  | "out-of-order"
  | "armature-rotation"
  | "ground-direction";

export interface ContractIssue {
  readonly code: ContractIssueCode;
  readonly joint: string;
  readonly detail: string;
}

/** A body to check. Joints must be given in SKIN order (the order the skin's joint indices address). */
export interface CandidateJoint {
  readonly name: string;
  /** Raw name of the parent node, or null if the joint is a scene root. */
  readonly parentName: string | null;
  /** Local rest translation, if known. Needed only for the ground-direction clause. */
  readonly translation?: readonly [number, number, number] | undefined;
}

export interface CandidateSkeleton {
  readonly joints: readonly CandidateJoint[];
  /** Rest rotation of the node `Hips` hangs off. Checked when supplied. */
  readonly armatureRotation?: readonly [number, number, number, number] | undefined;
}

export interface ContractOptions {
  /**
   * Maximum ground-chain rest-direction deviation, in degrees, against the
   * reference rig. Measured on the shipped rig with the ground-drop correction
   * active: tilting every ground-chain rest offset by theta drifts the planted
   * ankle horizontally by 13.39 mm per degree (mean over 5 clips x 32 samples;
   * worst 14.17 mm), and the relationship is linear out to 10 degrees
   * (0.5deg 6.69 / 1deg 13.39 / 2deg 26.83 / 5deg 67.41 / 10deg 135.68 mm).
   *
   * 1 degree is the default because it buys a ~14 mm budget, which two-bone IK
   * can absorb. This is the one clause the proportion profile CANNOT fix: the
   * ground-drop correction makes bone LENGTHS exact, and leaves DIRECTIONS alone.
   */
  readonly groundDirectionToleranceDeg?: number;
  /** Reference rest translations, keyed by canonical name, for the direction clause. */
  readonly referenceRest?: ReadonlyMap<string, readonly [number, number, number]> | undefined;
}

export interface ContractReport {
  readonly ok: boolean;
  readonly issues: readonly ContractIssue[];
  /** Canonical joints found, in the order they appeared. */
  readonly foundOrder: readonly string[];
  /** Non-canonical joints. Always legal — this is where twist bones and tails live. */
  readonly extraJoints: readonly string[];
  /** One-line human-readable verdict. */
  readonly reason: string;
}

function angleBetweenDeg(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
}

/**
 * Validate a candidate body against the contract.
 *
 * Clauses:
 *   C1 all 65 canonical joints present, exactly once (name matched on the stem)
 *   C2 each joint's parent is its canonical parent; `Hips` must NOT hang off
 *      another canonical joint (it may hang off any non-canonical node)
 *   C3 canonical joints appear in ascending canonical order within the skin's
 *      joint array — that array is what the skin's joint indices address
 *   C4 the armature carries the +90-degree-X rest rotation, when supplied
 *   C5 extra joints are allowed and are never targeted by the library
 *   C6 ground-chain rest DIRECTIONS within tolerance of the reference, when a
 *      reference is supplied
 */
export function validateHumanoidBody(
  candidate: CandidateSkeleton,
  options: ContractOptions = {},
): ContractReport {
  const issues: ContractIssue[] = [];
  const foundOrder: string[] = [];
  const extraJoints: string[] = [];
  const seen = new Map<string, CandidateJoint>();

  for (const joint of candidate.joints) {
    const canonical = canonicalizeJointName(joint.name);
    if (canonical === null) {
      extraJoints.push(joint.name);
      continue;
    }
    if (seen.has(canonical)) {
      issues.push({ code: "duplicate-joint", joint: canonical, detail: `appears more than once (as "${joint.name}")` });
      continue;
    }
    seen.set(canonical, joint);
    foundOrder.push(canonical);
  }

  // C1 — presence
  for (const joint of CANONICAL_JOINTS) {
    if (!seen.has(joint.name)) {
      issues.push({ code: "missing-joint", joint: joint.name, detail: "not present in the skin's joint list" });
    }
  }

  // C2 — parentage
  for (const joint of CANONICAL_JOINTS) {
    const found = seen.get(joint.name);
    if (!found) continue;
    const parentCanonical = found.parentName === null ? null : canonicalizeJointName(found.parentName);
    if (joint.parent === null) {
      if (parentCanonical !== null) {
        issues.push({
          code: "root-parented-to-joint",
          joint: joint.name,
          detail: `Hips must hang off a non-canonical node; found parent "${found.parentName}"`,
        });
      }
      continue;
    }
    if (parentCanonical !== joint.parent) {
      issues.push({
        code: "wrong-parent",
        joint: joint.name,
        detail: `expected parent "${joint.parent}", found "${found.parentName ?? "(none)"}"`,
      });
    }
  }

  // C3 — ordering
  let previous = -1;
  for (const name of foundOrder) {
    const index = CANONICAL_INDEX.get(name);
    if (index === undefined) continue;
    if (index < previous) {
      issues.push({
        code: "out-of-order",
        joint: name,
        detail: `canonical index ${index} appears after ${previous}; the skin's joint array must be in canonical order`,
      });
      break;
    }
    previous = index;
  }

  // C4 — armature frame
  const armature = candidate.armatureRotation;
  if (armature) {
    let worst = 0;
    for (let i = 0; i < 4; i += 1) {
      worst = Math.max(worst, Math.abs((armature[i] ?? 0) - (ARMATURE_REST_ROTATION[i] ?? 0)));
    }
    if (worst > 1e-3) {
      issues.push({
        code: "armature-rotation",
        joint: "Hips",
        detail: `armature rest rotation must be +90deg about X (${ARMATURE_REST_ROTATION.join(", ")}); found (${armature.join(", ")})`,
      });
    }
  }

  // C6 — ground-chain rest directions
  const reference = options.referenceRest;
  const tolerance = options.groundDirectionToleranceDeg ?? 1;
  if (reference) {
    for (const name of GROUND_CHAIN_JOINTS) {
      const found = seen.get(name);
      const expected = reference.get(name);
      if (!found?.translation || !expected) continue;
      const deviation = angleBetweenDeg(found.translation, expected);
      if (deviation > tolerance) {
        issues.push({
          code: "ground-direction",
          joint: name,
          detail: `rest direction is ${deviation.toFixed(2)}deg off the reference (tolerance ${tolerance}deg; ~13.4 mm of planted-ankle drift per degree)`,
        });
      }
    }
  }

  const ok = issues.length === 0;
  const reason = ok
    ? `passes: all ${CANONICAL_JOINT_COUNT} canonical joints present, in order, correctly parented` +
      (extraJoints.length > 0 ? `; ${extraJoints.length} extra joint(s) ignored by the library` : "")
    : issues.map((issue) => `${issue.code} @ ${issue.joint}: ${issue.detail}`).join("; ");

  return { ok, issues, foundOrder, extraJoints, reason };
}

// ---------------------------------------------------------------------------
// glTF adapter — so the check can be run directly against a candidate body GLB.
// ---------------------------------------------------------------------------

/** The subset of glTF JSON the contract reads. */
export interface GltfNodeLike {
  readonly name?: string | undefined;
  readonly children?: readonly number[] | undefined;
  readonly translation?: readonly number[] | undefined;
  readonly rotation?: readonly number[] | undefined;
}
export interface GltfDocumentLike {
  readonly nodes?: readonly GltfNodeLike[] | undefined;
  readonly skins?: readonly { readonly joints: readonly number[] }[] | undefined;
}

/**
 * Build a `CandidateSkeleton` from parsed glTF JSON, reading the FIRST skin's
 * joint array — that array, not traversal order, is what the skin's joint
 * indices address, so it is the thing clause C3 must be checked against.
 */
export function describeGltfSkeleton(document: GltfDocumentLike, skinIndex = 0): CandidateSkeleton {
  const nodes = document.nodes ?? [];
  const skin = (document.skins ?? [])[skinIndex];
  if (!skin) throw new Error(`glTF has no skin at index ${skinIndex}`);

  const parentOf = new Map<number, number>();
  nodes.forEach((node, index) => {
    for (const child of node.children ?? []) parentOf.set(child, index);
  });

  const joints: CandidateJoint[] = skin.joints.map((nodeIndex) => {
    const node = nodes[nodeIndex];
    const parentIndex = parentOf.get(nodeIndex);
    const parent = parentIndex === undefined ? undefined : nodes[parentIndex];
    const translation = node?.translation;
    return {
      name: node?.name ?? `node-${nodeIndex}`,
      parentName: parent?.name ?? null,
      translation:
        translation && translation.length >= 3
          ? ([translation[0] ?? 0, translation[1] ?? 0, translation[2] ?? 0] as const)
          : undefined,
    };
  });

  // The armature is whatever `Hips` hangs off.
  let armatureRotation: readonly [number, number, number, number] | undefined;
  for (const nodeIndex of skin.joints) {
    const node = nodes[nodeIndex];
    if (!node?.name || canonicalizeJointName(node.name) !== "Hips") continue;
    const parentIndex = parentOf.get(nodeIndex);
    const rotation = parentIndex === undefined ? undefined : nodes[parentIndex]?.rotation;
    if (rotation && rotation.length >= 4) {
      armatureRotation = [rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0, rotation[3] ?? 1] as const;
    }
    break;
  }

  return { joints, armatureRotation };
}

/** Convenience: validate a parsed body GLB in one call. */
export function validateGltfBody(
  document: GltfDocumentLike,
  options: ContractOptions = {},
): ContractReport {
  return validateHumanoidBody(describeGltfSkeleton(document), options);
}
