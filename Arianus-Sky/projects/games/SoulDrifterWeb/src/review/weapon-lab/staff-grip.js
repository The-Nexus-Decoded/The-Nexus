import * as THREE from "three";
import { isStaffCarryClip } from "./weapon-locomotion.js";

// The socket stays in the primary palm. Slide only the staff mesh so its
// lengthwise midpoint lies between the two palms (or in the carrying palm).
// Always derive this from the prepared bounds: accumulating offsets drifts
// during playback, grip transitions, and weapon-scale changes.
export function centerStaffVisual(actor, primaryAlongShaft = 0, supportAlongShaft = primaryAlongShaft) {
  const record = actor.primary;
  if (record?.asset !== "staff" || !record.visual || !record.prepared) return;
  const bounds = record.prepared.normalizedBounds;
  const preparedScaleY = record.prepared.visual.scale.y;
  const scale = record.visual.scale.y / preparedScaleY;
  const assetCenter = (bounds.min.y + bounds.max.y) * 0.5;
  record.visual.position.y = (primaryAlongShaft + supportAlongShaft) * 0.5 - assetCenter * scale;
  record.visual.updateMatrixWorld(true);
}

// These are grip overlays, never replacement animation clips. Caster actions
// and single-hand strikes deliberately retain their free-hand source motion.
export function staffUsesSupportHand(clipName) {
  return clipName === "Interactions__HumanMasculineAthleticMuscularStaffButtSmash"
    || isStaffCarryClip(clipName)
    || clipName === "ProMeleeAxe__StandingBlockIdle"
    || /^GapAuthored__Staff(ReadyGuard|ForwardThrust|DiagonalStrike|HorizontalStrike|VerticalBlock|HighBlock)$/.test(clipName);
}

export function maceUsesSupportHand(clipName) {
  return clipName === "ProMeleeAxe__StandingBlockIdle";
}

export function fitCasterStaffHand(actor, findBone) {
  const hand = findBone(actor.bones, "RightHand");
  if (!hand || actor.primary?.asset !== "staff") return;
  actor.model.updateMatrixWorld(true);
  if (!actor.ikBase.has(hand)) actor.ikBase.set(hand, hand.quaternion.clone());
  const source = hand.getWorldQuaternion(new THREE.Quaternion()).normalize();
  // A caster carries the staff upright, not sideways across a kneeling leg.
  // Only the carrying wrist turns: both authored arms and the free gesture stay.
  const upright = new THREE.Vector3(-0.08, 1, 0.08).normalize();
  const sourceAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(source).normalize();
  const desired = new THREE.Quaternion().setFromUnitVectors(sourceAxis, upright).multiply(source);
  hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
  actor.model.updateMatrixWorld(true);
}

function solveSupportArm(actor, hand, arm, forearm, target) {
  actor.model.updateMatrixWorld(true);
  const a = arm.getWorldPosition(new THREE.Vector3());
  const b = forearm.getWorldPosition(new THREE.Vector3());
  const c = hand.getWorldPosition(new THREE.Vector3());
  const upper = a.distanceTo(b), lower = b.distanceTo(c);
  const axis = target.clone().sub(a).normalize();
  const distance = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(upper - lower) + 1e-5, upper + lower - 1e-5);
  const bend = b.clone().sub(a); bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < 1e-8) bend.crossVectors(axis, new THREE.Vector3(0, 0, 1));
  if (bend.lengthSq() < 1e-8) bend.crossVectors(axis, new THREE.Vector3(0, 1, 0));
  bend.normalize();
  const cosine = THREE.MathUtils.clamp((upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1);
  const elbow = a.clone().addScaledVector(axis, upper * cosine).addScaledVector(bend, upper * Math.sqrt(1 - cosine * cosine));
  const rotate = (bone, from, to) => {
    const desired = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize()).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
    actor.model.updateMatrixWorld(true);
  };
  rotate(arm, b.clone().sub(a), elbow.clone().sub(a));
  const actualElbow = forearm.getWorldPosition(new THREE.Vector3());
  rotate(forearm, hand.getWorldPosition(new THREE.Vector3()).sub(actualElbow), target.clone().sub(actualElbow));
}

export function fitMaceBlockSupport(actor, findBone) {
  const hand = findBone(actor.bones, "LeftHand");
  const links = ["LeftForeArm", "LeftArm"].map((name) => findBone(actor.bones, name));
  if (!hand || links.some((link) => !link) || actor.primary?.asset !== "mace") return null;
  actor.model.updateMatrixWorld(true);
  const socket = actor.primary.socket;
  const shaftAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(socket.getWorldQuaternion(new THREE.Quaternion()));
  const sourceWorld = hand.getWorldQuaternion(new THREE.Quaternion());
  const sourceAxis = new THREE.Vector3(-1, 0, 0).applyQuaternion(sourceWorld);
  const desiredHand = new THREE.Quaternion().setFromUnitVectors(sourceAxis, shaftAxis).multiply(sourceWorld);
  // The axe proxy's open hand intersects the mace head. Put only that supporting
  // hand on the wooden shaft below the metal; keep the primary block trajectory.
  const gripWorld = socket.localToWorld(new THREE.Vector3(0, 0.24, 0));
  const target = gripWorld.clone().sub(new THREE.Vector3(0, 0.062, 0.018).applyQuaternion(desiredHand));
  for (const bone of [...links, hand]) {
    if (!actor.ikBase.has(bone)) actor.ikBase.set(bone, bone.quaternion.clone());
  }
  solveSupportArm(actor, hand, links[1], links[0], target);
  hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desiredHand)).normalize();
  actor.model.updateMatrixWorld(true);
  return { supportAlongShaft: 0.24, wristPositionError: hand.getWorldPosition(new THREE.Vector3()).distanceTo(target) };
}

export function fitStaffToSourceHands(actor, findBone, style = { spread: 0, roll: 0 }) {
  const right = findBone(actor.bones, "RightHand");
  const left = findBone(actor.bones, "LeftHand");
  if (!right || !left || actor.primary?.asset !== "staff") return null;
  actor.model.updateMatrixWorld(true);
  const hands = [right, left];
  const sourceWorld = hands.map((hand) => hand.getWorldQuaternion(new THREE.Quaternion()).normalize());
  const sourcePosition = hands.map((hand) => hand.getWorldPosition(new THREE.Vector3()));
  const palmLocal = new THREE.Vector3(0, 0.062, 0.03);
  const centers = hands.map((hand) => hand.localToWorld(palmLocal.clone().divideScalar(actor.model.scale.x)));
  const direction = centers[1].clone().sub(centers[0]);
  if (direction.lengthSq() < 0.01) return null;
  direction.normalize();
  const signs = sourceWorld.map((q, index) => new THREE.Vector3(index === 0 ? 1 : -1, 0, 0).applyQuaternion(q).dot(direction) < 0 ? -1 : 1);
  for (const hand of hands) {
    if (!actor.ikBase.has(hand)) actor.ikBase.set(hand, hand.quaternion.clone());
  }
  // Align the shaft to the authored hand spacing instead of dragging a shoulder
  // across the chest to a fixed staff-relative point. Preserve source wrist roll
  // with the shortest swing correction; shoulders, elbows and timing are intact.
  for (let iteration = 0; iteration < 32; iteration += 1) {
    direction.lerp(centers[1].clone().sub(centers[0]).normalize(), 0.5).normalize();
    hands.forEach((hand, index) => {
      const sourceAxis = new THREE.Vector3(index === 0 ? 1 : -1, 0, 0).applyQuaternion(sourceWorld[index]).normalize();
      const desired = new THREE.Quaternion().setFromUnitVectors(sourceAxis, direction.clone().multiplyScalar(signs[index])).multiply(sourceWorld[index]);
      hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
    });
    actor.model.updateMatrixWorld(true);
    hands.forEach((hand, index) => {
      centers[index].copy(hand.localToWorld(palmLocal.clone().divideScalar(actor.model.scale.x)));
    });
  }
  const socket = actor.primary.socket;
  if (style.spread > 1e-5 || Math.abs(style.roll) > 1e-5) {
    const axis = centers[1].clone().sub(centers[0]).normalize();
    const desiredHand = new THREE.Quaternion().setFromAxisAngle(axis, style.roll)
      .multiply(left.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const palmOffset = palmLocal.clone().applyQuaternion(desiredHand);
    const arm = findBone(actor.bones, "LeftArm");
    const forearm = findBone(actor.bones, "LeftForeArm");
    const shoulder = arm.getWorldPosition(new THREE.Vector3());
    const elbow = forearm.getWorldPosition(new THREE.Vector3());
    const reach = shoulder.distanceTo(elbow) + elbow.distanceTo(left.getWorldPosition(new THREE.Vector3()));
    const target = centers[1].clone().sub(palmOffset);
    const spacing = centers[0].distanceTo(centers[1]);
    const along = shoulder.clone().sub(target).dot(axis);
    const perpendicularSq = target.clone().addScaledVector(axis, along).distanceToSquared(shoulder);
    const interval = Math.sqrt(Math.max(0, (reach * 0.995) ** 2 - perpendicularSq));
    const slide = THREE.MathUtils.clamp(style.spread, Math.max(0.16 - spacing, along - interval), Math.min(0.75 - spacing, along + interval));
    target.addScaledVector(axis, slide);
    for (const bone of [forearm, arm]) if (!actor.ikBase.has(bone)) actor.ikBase.set(bone, bone.quaternion.clone());
    solveSupportArm(actor, left, arm, forearm, target);
    left.quaternion.copy(left.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desiredHand)).normalize();
    actor.model.updateMatrixWorld(true);
    centers[1].copy(left.localToWorld(palmLocal.clone().divideScalar(actor.model.scale.x)));
  }
  const leftLocal = socket.worldToLocal(centers[1].clone());
  const rightLocal = socket.worldToLocal(centers[0].clone());
  centerStaffVisual(actor, rightLocal.y, leftLocal.y);
  return {
    supportAlongShaft: leftLocal.y,
    supportRadialError: Math.hypot(leftLocal.x, leftLocal.z),
    handSpacing: centers[0].distanceTo(centers[1]),
    axisError: new THREE.Vector3(0, 1, 0).applyQuaternion(socket.getWorldQuaternion(new THREE.Quaternion())).angleTo(centers[1].clone().sub(centers[0])),
    wristPositionError: Math.max(...hands.map((hand, index) => hand.getWorldPosition(new THREE.Vector3()).distanceTo(sourcePosition[index]))),
  };
}
