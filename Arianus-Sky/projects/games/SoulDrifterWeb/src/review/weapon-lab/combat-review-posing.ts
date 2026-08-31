import * as THREE from "three";
import { ReviewContactSurface } from "./combat-review-contact";
import type { ReviewActorAdapter, ReviewPoseSample } from "./combat-review-types";

interface NodePose { node: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }

/** Absolute sampling with a shared, deterministic skeletal crossfade. No timers. */
export function sampleReviewPoses(
  actor: ReviewActorAdapter,
  poses: readonly ReviewPoseSample[],
  settleConstraints?: () => void,
): void {
  if (!poses.length || poses.some((pose) => !Number.isFinite(pose.weight) || pose.weight < 0
    || !Number.isFinite(pose.timeSeconds) || pose.timeSeconds < 0)) throw new Error("Invalid review pose samples");
  const weighted = poses.filter((pose) => pose.weight > 0);
  if (!weighted.length) throw new Error("Review pose weights must have positive total");
  // Sample the dominant action last so its discrete attachments/visibility win.
  const ordered = [...weighted].sort((a, b) => a.weight - b.weight);
  const blended: NodePose[] = [];
  let total = 0;
  for (const pose of ordered) {
    actor.sample(pose.actionId, pose.timeSeconds);
    const alpha = pose.weight / (total + pose.weight);
    if (!total) actor.model.traverse((node) => {
      if (node === actor.model || (node as THREE.Bone).isBone) blended.push({ node,
        position: node.position.clone(), quaternion: node.quaternion.clone().normalize(), scale: node.scale.clone() });
    });
    else for (const value of blended) {
      value.position.lerp(value.node.position, alpha);
      value.quaternion.slerp(value.node.quaternion.clone().normalize(), alpha);
      value.scale.lerp(value.node.scale, alpha);
    }
    total += pose.weight;
  }
  if (weighted.length > 1) {
    for (const value of blended) {
      value.node.position.copy(value.position);
      value.node.quaternion.copy(value.quaternion);
      value.node.scale.copy(value.scale);
    }
    // The actor-specific approved grip/IK constraints can settle after blending.
    // A skeletal crossfade by itself is not a foot-contact or grip solver.
    settleConstraints?.();
  }
  actor.root.updateWorldMatrix(true, true);
  actor.root.updateMatrixWorld(true);
}

/** Swept rendered-triangle bounds, not just the idle pose or orphan vertices. */
export async function measureReviewMotionBounds(
  actor: ReviewActorAdapter,
  frames: readonly (readonly ReviewPoseSample[])[],
  options: { signal?: AbortSignal; restore?: readonly ReviewPoseSample[]; settleConstraints?: () => void } = {},
): Promise<THREE.Box3> {
  const surface = new ReviewContactSurface(actor.root);
  const bounds = new THREE.Box3();
  try {
    for (let index = 0; index < frames.length; index++) {
      if (options.signal?.aborted) throw new DOMException("Bounds review cancelled", "AbortError");
      sampleReviewPoses(actor, frames[index]!, options.settleConstraints);
      surface.update();
      bounds.union(surface.bounds());
      if (index % 8 === 7) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return bounds;
  } finally {
    surface.dispose();
    if (options.restore) sampleReviewPoses(actor, options.restore, options.settleConstraints);
  }
}
