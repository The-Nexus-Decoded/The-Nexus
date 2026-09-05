import * as THREE from "three";

/**
 * Ground truth for the torso surface, measured the slow, obvious, hard-to-be-wrong
 * way: every skinned vertex, posed, with no binning and no bone filtering.
 *
 * This exists because attempt 1 at surface-seating the sling spent four iterations
 * tuning a profile that was reading the chest 30-40 mm fatter than the body. A
 * direct measurement takes seconds and would have caught it immediately. Anything
 * that claims to know where the body surface is gets checked against this before
 * it is allowed to move a waypoint.
 *
 * Deliberately not clever. If this and the profile disagree, the profile is wrong.
 */

export type TorsoFrame = {
  origin: THREE.Vector3;
  axis: THREE.Vector3;
  right: THREE.Vector3;
  forward: THREE.Vector3;
  axisLength: number;
};

/** Hips -> Neck, with the shoulder line as the angular reference. */
export function torsoFrame(bones: Map<string, THREE.Bone>, findBone: (b: Map<string, THREE.Bone>, s: string) => THREE.Bone | undefined): TorsoFrame | null {
  const hips = findBone(bones, "Hips");
  const neck = findBone(bones, "Neck");
  const leftShoulder = findBone(bones, "LeftShoulder");
  const rightShoulder = findBone(bones, "RightShoulder");
  if (!hips || !neck || !leftShoulder || !rightShoulder) return null;
  const origin = hips.getWorldPosition(new THREE.Vector3());
  const axis = neck.getWorldPosition(new THREE.Vector3()).sub(origin);
  const axisLength = axis.length();
  if (axisLength < 1e-4) return null;
  axis.divideScalar(axisLength);
  const right = rightShoulder.getWorldPosition(new THREE.Vector3())
    .sub(leftShoulder.getWorldPosition(new THREE.Vector3()));
  right.addScaledVector(axis, -right.dot(axis));
  if (right.lengthSq() < 1e-8) return null;
  right.normalize();
  const forward = new THREE.Vector3().crossVectors(axis, right).normalize();
  return { origin, axis, right, forward, axisLength };
}

export type SurfaceSample = { height: number; bearing: number; radius: number };

/** Every posed vertex, as (height along axis, bearing around it, radius from it). */
export function measureTorsoSurface(model: THREE.Object3D, frame: TorsoFrame, stride = 1): SurfaceSample[] {
  const out: SurfaceSample[] = [];
  const vertex = new THREE.Vector3();
  const radial = new THREE.Vector3();
  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const position = mesh.geometry.attributes.position;
    if (!position) return;
    for (let index = 0; index < position.count; index += stride) {
      vertex.fromBufferAttribute(position, index);
      mesh.applyBoneTransform(index, vertex);
      mesh.localToWorld(vertex);
      radial.copy(vertex).sub(frame.origin);
      const height = radial.dot(frame.axis) / frame.axisLength;
      radial.addScaledVector(frame.axis, -radial.dot(frame.axis));
      const radius = radial.length();
      if (radius < 1e-5) continue;
      out.push({ height, bearing: Math.atan2(radial.dot(frame.forward), radial.dot(frame.right)), radius });
    }
  });
  return out;
}

/**
 * True surface radius looking outward at `bearing`, at `height` up the torso.
 *
 * Takes the MEDIAN of the vertices in a narrow window rather than the max: the
 * max is the silhouette (a lat edge, a shoulder cap), and a strap lies on the
 * surface, not on the silhouette. That distinction is exactly what attempt 1 got
 * wrong. Returns null when the window is too sparse to answer honestly.
 */
export function trueRadiusAt(
  samples: SurfaceSample[],
  height: number,
  bearing: number,
  { heightWindow = 0.05, bearingWindow = 0.22, minSamples = 6 } = {},
): number | null {
  const wrapped = (value: number) => {
    let delta = value;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta);
  };
  const hits = samples
    .filter((s) => Math.abs(s.height - height) <= heightWindow && wrapped(s.bearing - bearing) <= bearingWindow)
    .map((s) => s.radius)
    .sort((a, b) => a - b);
  if (hits.length < minSamples) return null;
  return hits[Math.floor(hits.length / 2)] ?? null;
}

export const FRONT_BEARING = Math.PI / 2;
export const BACK_BEARING = -Math.PI / 2;
