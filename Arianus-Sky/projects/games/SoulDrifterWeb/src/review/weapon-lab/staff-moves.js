import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

export const STAFF_NEW_ACTIONS = [
  ["Ready guard — staff fighting (authored)", "GapAuthored__StaffReadyGuard"],
  ["Forward thrust — staff fighting (authored)", "GapAuthored__StaffForwardThrust"],
  ["Diagonal strike — staff fighting (authored)", "GapAuthored__StaffDiagonalStrike"],
  ["Horizontal strike — staff fighting (authored)", "GapAuthored__StaffHorizontalStrike"],
  ["Vertical block — staff fighting (authored)", "GapAuthored__StaffVerticalBlock"],
  ["High block — staff fighting (authored)", "GapAuthored__StaffHighBlock"],
];

const GUARD = { right: [-0.30, 0.10, 0.38], left: [0.25, 0.16, 0.44], turn: 0 };
const pose = (right, left, turn = 0) => ({ right, left, turn });
const key = (time, value) => ({ time, ...value });
const DEFINITIONS = [
  { duration: 2.4, keys: [key(0, GUARD), key(0.5, pose([-0.30, 0.11, 0.38], [0.25, 0.17, 0.44])), key(1, GUARD)] },
  { duration: 1.5, keys: [key(0, GUARD), key(0.25, pose([-0.34, 0.08, 0.24], [-0.02, 0.20, 0.54], -0.12)), key(0.52, pose([-0.30, 0.12, 0.32], [0.12, 0.27, 0.64], 0.14)), key(0.68, pose([-0.30, 0.12, 0.32], [0.12, 0.27, 0.64], 0.14)), key(1, GUARD)] },
  { duration: 1.8, keys: [key(0, GUARD), key(0.30, pose([-0.35, 0.63, 0.26], [-0.08, 0.40, 0.44], -0.2)), key(0.57, pose([-0.14, 0.17, 0.40], [0.32, 0.09, 0.27], 0.28)), key(0.72, pose([-0.10, 0.13, 0.38], [0.34, 0.06, 0.24], 0.3)), key(1, GUARD)] },
  { duration: 1.8, keys: [key(0, GUARD), key(0.28, pose([-0.40, 0.18, 0.28], [0.10, 0.18, 0.52], -0.25)), key(0.57, pose([-0.22, 0.18, 0.47], [0.32, 0.18, 0.44], 0.28)), key(0.74, pose([-0.20, 0.18, 0.50], [0.35, 0.18, 0.38], 0.30)), key(1, GUARD)] },
  { duration: 2.0, keys: [key(0, GUARD), key(0.3, pose([-0.19, -0.03, 0.40], [-0.10, 0.51, 0.43], -0.12)), key(0.72, pose([-0.19, -0.03, 0.40], [-0.10, 0.51, 0.43], -0.12)), key(1, GUARD)] },
  { duration: 2.0, keys: [key(0, GUARD), key(0.3, pose([-0.28, 0.94, 0.26], [0.30, 0.94, 0.27])), key(0.72, pose([-0.28, 0.94, 0.26], [0.30, 0.94, 0.27])), key(1, GUARD)] },
];

function sample(keys, time) {
  const end = keys.findIndex((frame) => frame.time >= time);
  const b = keys[Math.max(0, end)];
  const a = keys[Math.max(0, end - 1)];
  const t = a === b ? 0 : THREE.MathUtils.smoothstep(time, a.time, b.time);
  return { right: new THREE.Vector3().fromArray(a.right).lerp(new THREE.Vector3().fromArray(b.right), t), left: new THREE.Vector3().fromArray(a.left).lerp(new THREE.Vector3().fromArray(b.left), t), turn: THREE.MathUtils.lerp(a.turn, b.turn, t) };
}

function solveArm(model, bones, side, target) {
  const hand = bones.get(`${side}Hand`);
  const links = [bones.get(`${side}ForeArm`), bones.get(`${side}Arm`)];
  model.updateMatrixWorld(true);
  const origin = links[1].getWorldPosition(new THREE.Vector3());
  const elbow = links[0].getWorldPosition(new THREE.Vector3());
  const reach = origin.distanceTo(elbow) + elbow.distanceTo(hand.getWorldPosition(new THREE.Vector3()));
  const offset = target.clone().sub(origin);
  if (offset.length() > reach * 0.96) target = origin.add(offset.setLength(reach * 0.96));
  for (let iteration = 0; iteration < 18; iteration++) {
    for (const bone of links) {
      model.updateMatrixWorld(true);
      const joint = bone.getWorldPosition(new THREE.Vector3());
      const towardHand = hand.getWorldPosition(new THREE.Vector3()).sub(joint).normalize();
      const towardTarget = target.clone().sub(joint).normalize();
      const desired = new THREE.Quaternion().setFromUnitVectors(towardHand, towardTarget).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
    }
  }
}

export function buildStaffFightingClips(actor) {
  const source = actor.clips.get("Interactions__HumanMasculineAthleticMuscularStaffButtSmash");
  if (!source) throw new Error("Staff reference moves require the original staff interaction; no existing action is replaced.");
  const model = cloneSkeleton(actor.model);
  const mixer = new THREE.AnimationMixer(model);
  const baseAction = mixer.clipAction(source).play();
  baseAction.paused = true;
  mixer.update(0);
  const bones = new Map();
  const allBones = [];
  model.traverse((object) => {
    if (!object.isBone) return;
    allBones.push(object);
    for (const name of ["Hips", "Spine1", "RightArm", "RightForeArm", "RightHand", "LeftArm", "LeftForeArm", "LeftHand"]) {
      if (object.name.toLowerCase().replace(/[^a-z0-9]/g, "") === `mixamorig${name}`.toLowerCase()) bones.set(name, object);
    }
  });
  if (bones.size !== 8) throw new Error("Staff reference moves require the complete V2 arm rig.");
  const base = new Map(allBones.map((bone) => [bone, { position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }]));
  const clips = DEFINITIONS.map((definition, index) => {
    const samples = Math.ceil(definition.duration * 30);
    const times = [], rotations = new Map(allBones.map((bone) => [bone, []]));
    for (let frame = 0; frame <= samples; frame++) {
      for (const [bone, state] of base) { bone.position.copy(state.position); bone.quaternion.copy(state.quaternion); bone.scale.copy(state.scale); }
      const current = sample(definition.keys, frame / samples);
      bones.get("Spine1").quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), current.turn));
      model.updateMatrixWorld(true);
      const origin = bones.get("Hips").getWorldPosition(new THREE.Vector3());
      solveArm(model, bones, "Right", current.right.add(origin));
      solveArm(model, bones, "Left", current.left.add(origin));
      times.push(frame / samples * definition.duration);
      for (const bone of allBones) rotations.get(bone).push(...bone.quaternion.toArray());
    }
    const tracks = [];
    for (const bone of allBones) {
      const state = base.get(bone);
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, rotations.get(bone)));
      tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, [0, definition.duration], [...state.position.toArray(), ...state.position.toArray()]));
      tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.scale`, [0, definition.duration], [...state.scale.toArray(), ...state.scale.toArray()]));
    }
    const clip = new THREE.AnimationClip(STAFF_NEW_ACTIONS[index][1], definition.duration, tracks);
    clip.userData = { status: "draft", sources: [source.name], gap: "Additional staff fighting study authored from the approved reference sheet; not motion capture. Existing staff and caster clips remain intact." };
    return clip;
  });
  mixer.stopAllAction(); mixer.uncacheRoot(model);
  return clips;
}
