import * as THREE from "three";

export type HumanGripSide = "Left" | "Right";
export type HumanFingerCurls = Readonly<Record<"Index" | "Middle" | "Ring" | "Pinky", number>>;

/** Owner-approved #435 lab calibration; distances are metres, not rig units. */
export const APPROVED_GREATSWORD_CALIBRATION = Object.freeze({
  socketPosition: Object.freeze([0, 0.04, 0] as const),
  socketRotation: Object.freeze([0, 0, -Math.PI / 2] as const),
  supportTarget: Object.freeze([-0.024, -0.09, 0.016] as const),
  supportWrist: Object.freeze([0.4, 0, 0] as const),
  curls: Object.freeze({ Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5 }),
  thumb: 0.1,
});

function findBone(bones: readonly THREE.Bone[], suffix: string): THREE.Bone | undefined {
  const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const exact = normalize(`mixamorig${suffix}`);
  return bones.find((bone) => normalize(bone.name) === exact)
    ?? bones.find((bone) => normalize(bone.name).endsWith(normalize(suffix)));
}

/**
 * The legacy/additive branch of the approved lab's hand overlay, unchanged.
 * The caller removes recorded deltas before evaluating the next source pose.
 * Fitted/bind-relative wand, staff and dagger overlays are deliberately separate.
 */
export function applyAdditiveHumanHandGrip(
  bones: readonly THREE.Bone[],
  side: HumanGripSide,
  curls: HumanFingerCurls,
  thumb: number,
  overlay: Map<THREE.Bone, THREE.Quaternion>,
): void {
  const apply = (suffix: string, euler: THREE.Euler): void => {
    const bone = findBone(bones, `${side}Hand${suffix}`);
    if (!bone) return;
    const additive = new THREE.Quaternion().setFromEuler(euler);
    bone.quaternion.multiply(additive);
    overlay.set(bone, additive);
  };
  for (const [finger, angle] of Object.entries(curls)) {
    for (const segment of [1, 2, 3]) {
      apply(`${finger}${segment}`, new THREE.Euler(angle, 0, 0, "XYZ"));
    }
  }
  const mirror = side === "Left" ? -1 : 1;
  apply("Thumb1", new THREE.Euler(thumb * 0.45, -thumb * mirror, thumb * 0.3 * mirror));
  apply("Thumb2", new THREE.Euler(thumb * 0.65, 0, -thumb * 0.25 * mirror));
}

/** Exact #435 support-hand CCD; source animation owns the primary/right hand. */
export function solveGreatswordSupportGrip(
  model: THREE.Object3D,
  bones: readonly THREE.Bone[],
  socket: THREE.Object3D,
  basePoses: Map<THREE.Bone, THREE.Quaternion>,
  target = new THREE.Vector3(...APPROVED_GREATSWORD_CALIBRATION.supportTarget),
  wrist = new THREE.Euler(...APPROVED_GREATSWORD_CALIBRATION.supportWrist, "XYZ"),
): boolean {
  const hand = findBone(bones, "LeftHand");
  const links = ["LeftForeArm", "LeftArm", "LeftShoulder"]
    .map((name) => findBone(bones, name))
    .filter((bone): bone is THREE.Bone => Boolean(bone));
  if (!hand || links.length < 2) return false;
  model.updateMatrixWorld(true);
  const targetWorld = socket.localToWorld(target.clone());
  for (const link of [...links, hand]) basePoses.set(link, link.quaternion.clone());
  const linkPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const towardHand = new THREE.Vector3();
  const towardTarget = new THREE.Vector3();
  const linkWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const deltaWorld = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();
  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (const link of links) {
      if (!link.parent) continue;
      model.updateMatrixWorld(true);
      link.getWorldPosition(linkPosition);
      hand.getWorldPosition(handPosition);
      towardHand.copy(handPosition).sub(linkPosition);
      towardTarget.copy(targetWorld).sub(linkPosition);
      if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
      deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
      link.getWorldQuaternion(linkWorld);
      desiredWorld.copy(deltaWorld).multiply(linkWorld);
      link.parent.getWorldQuaternion(parentWorld);
      link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
    }
  }
  hand.quaternion.multiply(new THREE.Quaternion().setFromEuler(wrist)).normalize();
  model.updateMatrixWorld(true);
  return true;
}
