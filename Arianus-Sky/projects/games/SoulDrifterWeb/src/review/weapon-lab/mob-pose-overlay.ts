import * as THREE from "three";

export type MobPoseFamily = "breachling" | "warden";
export interface MobPoseControl {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  /** Actual loaded bone name, including GLTFLoader's name sanitization. */
  readonly bone: string;
  readonly axis: "x" | "y" | "z";
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface MobPoseOverlayAudit {
  family: MobPoseFamily;
  status: "draft";
  disposed: boolean;
  skinnedMeshCount: number;
  bones: Array<{ name: string; directWeightedVertices: number; hasWeightedDescendants: boolean }>;
  availableControls: string[];
  skippedControls: Array<{ id: string; bone: string; reason: string }>;
  warnings: string[];
}

export interface MobPoseOverlay {
  readonly controls: readonly MobPoseControl[];
  values(): Record<string, number>;
  setValue(id: string, degrees: number): void;
  /** Replace all values; omitted controls become zero. Validation is atomic. */
  setValues(values: Readonly<Record<string, number>>): void;
  reset(): void;
  restore(): void;
  apply(): void;
  dispose(): void;
  audit(): MobPoseOverlayAudit;
}

function definitions(family: MobPoseFamily): MobPoseControl[] {
  const result: MobPoseControl[] = [];
  const add = (id: string, label: string, group: string, bone: string,
    axis: MobPoseControl["axis"], limit = 30) => {
    result.push({ id, label: `${label} (local ${axis.toUpperCase()})`, group, bone,
      axis, min: -limit, max: limit, step: 1 });
  };
  for (const [side, suffix] of [["right", "R"], ["left", "L"]] as const) {
    const title = side === "right" ? "Right" : "Left";
    const group = family === "breachling" ? `${title} forelimb / paw` : `${title} arm / weapon`;
    const upper = family === "breachling" ? `front_upper.${suffix}` : `upper_arm_${suffix}`;
    const lower = family === "breachling" ? `front_lower.${suffix}` : `lower_arm_${suffix}`;
    const hand = family === "breachling" ? `front_hand.${suffix}` : `hand_${suffix}`;
    add(`${side}ShoulderPitch`, "Shoulder pitch", group, upper, "x");
    add(`${side}ShoulderSpread`, "Shoulder spread", group, upper, "z");
    add(`${side}ElbowBend`, "Elbow bend", group, lower, "x", 45);
    if (family === "breachling") {
      add(`${side}PawPitch`, "Paw pitch", group, hand, "x");
      add(`${side}PawSpread`, "Whole-paw turn", group, hand, "y");
    } else {
      add(`${side}ForearmTurn`, "Forearm turn", group, lower, "y");
      if (side === "right") add("rightBladeAngle", "Blade / forearm angle", group, lower, "z");
      // Availability is checked against real skin weights; current hand_R is
      // unweighted and has no weighted descendants, so no fake grip is shown.
      add(`${side}HandPitch`, "Whole-hand pitch", group, hand, "x");
      add(`${side}HandTurn`, "Whole-hand turn", group, hand, "y");
    }
    const legGroup = family === "breachling" ? `${title} hindlimb` : `${title} leg`;
    add(`${side}HipPitch`, "Hip pitch", legGroup,
      family === "breachling" ? `rear_thigh.${suffix}` : `thigh_${suffix}`, "x");
    add(`${side}KneeBend`, "Knee bend", legGroup,
      family === "breachling" ? `rear_shin.${suffix}` : `lower_leg_${suffix}`, "x");
    add(`${side}FootPitch`, "Whole-foot pitch", legGroup,
      family === "breachling" ? `rear_foot.${suffix}` : `foot_${suffix}`, "x");
  }
  add("pelvisTilt", "Pelvis tilt", "Torso / head", "pelvis", "x", 15);
  add("spineBend", "Spine bend", "Torso / head", family === "breachling" ? "spine.001" : "spine", "x", 20);
  add("chestTurn", "Chest turn", "Torso / head", family === "breachling" ? "spine.002" : "chest", "y", 20);
  add("neckPitch", "Neck pitch", "Torso / head", "neck", "x", 20);
  add("headTurn", "Head turn", "Torso / head", "head", "y");
  if (family === "breachling") {
    add("jawOpen", "Jaw angle", "Jaw / tail", "jaw", "x");
    for (let segment = 1; segment <= 5; segment += 1) {
      add(`tail${segment}Sweep`, `Tail ${segment} sweep`, "Jaw / tail", `tail.00${segment}`, "z", 45);
      add(`tail${segment}Pitch`, `Tail ${segment} pitch`, "Jaw / tail", `tail.00${segment}`, "x");
    }
  }
  return result;
}

/** Draft joint offsets only. This is not IK, per-finger rigging or a contact solver. */
export function createMobPoseOverlay(model: THREE.Object3D, family: MobPoseFamily): MobPoseOverlay {
  if (family !== "breachling" && family !== "warden") throw new Error(`Unsupported mob family: ${family}`);
  let root: THREE.Object3D | null = model;
  let disposed = false;
  let skinnedMeshCount = 0;
  const weights = new Map<THREE.Bone, number>();
  const meshes: THREE.SkinnedMesh[] = [];
  const warnings = new Set<string>([
    "Draft local-joint offsets only; source clips and assets are unchanged.",
    "No individual finger/claw joints exist in these rigs; paw/hand controls rotate the whole part.",
    "Skin-weight availability does not certify anatomy, support contacts, grip or collision clearance.",
  ]);
  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    meshes.push(mesh);
    skinnedMeshCount += 1;
    for (const bone of mesh.skeleton.bones) if (bone.isBone) weights.set(bone, 0);
  });
  for (const mesh of meshes) {
    const indices = mesh.geometry.getAttribute("skinIndex");
    const influence = mesh.geometry.getAttribute("skinWeight");
    if (!indices || !influence || indices.count !== influence.count || indices.itemSize !== influence.itemSize) {
      warnings.add(`Skin attributes unavailable or mismatched on ${mesh.name || "unnamed mesh"}.`);
      continue;
    }
    for (let vertex = 0; vertex < indices.count; vertex += 1) {
      const counted = new Set<THREE.Bone>();
      for (let slot = 0; slot < indices.itemSize; slot += 1) {
        const weight = influence.getComponent(vertex, slot);
        const index = indices.getComponent(vertex, slot);
        const bone = Number.isInteger(index) ? mesh.skeleton.bones[index] : undefined;
        if (!Number.isFinite(weight) || weight < 0 || (weight > 0 && !bone?.isBone)) {
          warnings.add(`Invalid skin influence on ${mesh.name || "unnamed mesh"}.`);
          continue;
        }
        if (weight > 0 && bone && !counted.has(bone)) {
          counted.add(bone);
          weights.set(bone, (weights.get(bone) ?? 0) + 1);
        }
      }
    }
  }
  const hasWeightedDescendants = (bone: THREE.Bone) => {
    let found = false;
    bone.traverse((child) => {
      if (child !== bone && (weights.get(child as THREE.Bone) ?? 0) > 0) found = true;
    });
    return found;
  };
  const boneAudit = [...weights].map(([bone, count]) => ({
    name: bone.name, directWeightedVertices: count, hasWeightedDescendants: hasWeightedDescendants(bone),
  }));
  const byName = new Map<string, THREE.Bone[]>();
  for (const bone of weights.keys()) {
    const name = THREE.PropertyBinding.sanitizeNodeName(bone.name);
    byName.set(name, [...(byName.get(name) ?? []), bone]);
  }
  const skippedControls: MobPoseOverlayAudit["skippedControls"] = [];
  const bindings: Array<{ definition: MobPoseControl; bone: THREE.Bone }> = [];
  for (const definition of definitions(family)) {
    const candidates = byName.get(THREE.PropertyBinding.sanitizeNodeName(definition.bone)) ?? [];
    const bone = candidates[0];
    const reason = candidates.length !== 1 ? (candidates.length ? "ambiguous bone name" : "bone not present in skin")
      : !weights.get(bone!) && !hasWeightedDescendants(bone!) ? "no weighted vertices in this chain" : null;
    if (reason || !bone) {
      skippedControls.push({ id: definition.id, bone: definition.bone, reason: reason! });
    } else {
      bindings.push({ definition: Object.freeze({ ...definition, bone: bone.name }), bone });
    }
  }
  if (!bindings.length) warnings.add("No functional controls: this model has no supported weighted rig.");
  if (family === "warden" && skippedControls.some((control) => control.bone === "hand_R")) {
    warnings.add("Right hand is not independently weighted; use the right forearm/blade angle, not a finger grip.");
  }
  const controls = Object.freeze(bindings.map(({ definition }) => definition));
  const controlById = new Map(controls.map((control) => [control.id, control]));
  let settings = Object.fromEntries(controls.map((control) => [control.id, 0]));
  const saved = new Map<THREE.Bone, THREE.Quaternion>();
  const axes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const delta = new THREE.Quaternion();
  const validate = (id: string, degrees: number) => {
    if (disposed) throw new Error("Mob pose overlay is disposed.");
    const control = controlById.get(id);
    if (!control) throw new Error(`Unknown mob pose control: ${id}`);
    if (!Number.isFinite(degrees)) throw new Error(`Mob pose control ${id} requires finite degrees.`);
    return THREE.MathUtils.clamp(degrees, control.min, control.max);
  };
  const restore = () => {
    if (!saved.size) return;
    for (const [bone, quaternion] of saved) bone.quaternion.copy(quaternion);
    saved.clear();
    root?.updateMatrixWorld(true);
  };
  return {
    controls,
    values: () => ({ ...settings }),
    setValue(id, degrees) { settings[id] = validate(id, degrees); },
    setValues(values) {
      if (disposed) throw new Error("Mob pose overlay is disposed.");
      const next = Object.fromEntries(controls.map((control) => [control.id, 0]));
      for (const [id, value] of Object.entries(values)) next[id] = validate(id, value);
      settings = next;
    },
    reset() {
      restore();
      settings = Object.fromEntries(controls.map((control) => [control.id, 0]));
    },
    restore,
    apply() {
      if (disposed) return;
      // Caller restores before mixer evaluation/clip activation. Restoring here
      // additionally makes repeated paused apply() calls exactly idempotent.
      restore();
      for (const { definition, bone } of bindings) {
        const degrees = settings[definition.id] ?? 0;
        if (!degrees) continue;
        if (!saved.has(bone)) saved.set(bone, bone.quaternion.clone());
        bone.quaternion.multiply(delta.setFromAxisAngle(axes[definition.axis], THREE.MathUtils.degToRad(degrees)));
      }
      if (saved.size) root?.updateMatrixWorld(true);
    },
    dispose() {
      restore();
      disposed = true;
      root = null;
      bindings.length = 0;
      meshes.length = 0;
      weights.clear();
      byName.clear();
    },
    audit: () => ({ family, status: "draft", disposed, skinnedMeshCount,
      bones: boneAudit.map((bone) => ({ ...bone })), availableControls: controls.map((control) => control.id),
      skippedControls: skippedControls.map((control) => ({ ...control })), warnings: [...warnings] }),
  };
}
