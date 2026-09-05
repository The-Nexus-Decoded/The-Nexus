import * as THREE from "three";

/**
 * Where a body's torso surface actually is, measured from its own mesh.
 *
 * Worn gear -- a sling, a belt, a bandolier -- has to lie on the SURFACE, and the
 * surface belongs to the mesh, not the skeleton. Routing it from offsets off a
 * bone is a guess at where the surface is, and a guess fitted by eye on one body
 * fits exactly that body: the shipped sling assumed the chest stands 185 mm in
 * front of the spine, where this body measures 108-125 mm. Sixty millimetres of
 * daylight, on every clip.
 *
 * Scaling that guess by body height does not rescue it. Height scaling tracks the
 * axis; girth does not follow the axis, because a heavy body and a lean one of the
 * same height share a spine and share nothing else. The only number that survives
 * a change of build is one read off the body.
 *
 * Radii are stored as a FRACTION of the torso axis, so a caller multiplies by the
 * axis length it has in hand and no metres are stored anywhere. That is what makes
 * one measurement serve every height, and a re-measure serve every build.
 *
 * TWO RULES, both learned by getting them wrong:
 *
 * 1. Front hemisphere only. The arms hang at bearing 0 and 180, so a ray along the
 *    shoulder line hits a bicep and reports 200-416 mm of "torso". The front is the
 *    one arc no limb occludes, and it is the arc worn gear crosses.
 * 2. The median of a window, never the max. The max is the silhouette -- a lat
 *    edge, a shoulder cap. Gear lies on the surface, not on the silhouette.
 */

export type TorsoFrame = {
  origin: THREE.Vector3;
  axis: THREE.Vector3;
  right: THREE.Vector3;
  forward: THREE.Vector3;
  axisLength: number;
};

/** Bearing measured from the body's right toward its front. */
export const FRONT_BEARING = Math.PI / 2;
export const BACK_BEARING = -Math.PI / 2;

/** ±12.6°: wide enough to hold samples, narrow enough to stay off the arms. */
export const FRONT_ARC = 0.22;
export const PROFILE_BANDS = 8;
const MIN_BAND_SAMPLES = 6;

/**
 * Hips -> Neck, with the shoulder line as the angular reference. Both the runtime
 * and its tests build the frame here, so a lookup can never be done in a basis the
 * measurement did not use -- which is its own way to be 35 mm wrong.
 */
export function torsoFrame(
  hips: THREE.Object3D | null | undefined,
  neck: THREE.Object3D | null | undefined,
  leftShoulder: THREE.Object3D | null | undefined,
  rightShoulder: THREE.Object3D | null | undefined,
): TorsoFrame | null {
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
  return { origin, axis, right, forward: new THREE.Vector3().crossVectors(axis, right).normalize(), axisLength };
}

export type SurfaceSample = { height: number; bearing: number; radius: number };

/** Every posed vertex as (height along the axis, bearing around it, radius from it). */
export function sampleTorsoSurface(model: THREE.Object3D, frame: TorsoFrame, stride = 1): SurfaceSample[] {
  const out: SurfaceSample[] = [];
  const vertex = new THREE.Vector3();
  const radial = new THREE.Vector3();
  model.updateMatrixWorld(true);
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

const wrappedDelta = (value: number): number => {
  let delta = value;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta);
};

/**
 * Surface radius in world metres at a height fraction and a bearing, straight from
 * the samples. Returns null rather than a number nobody stood behind.
 */
export function surfaceRadiusAt(
  samples: SurfaceSample[],
  height: number,
  bearing: number,
  { heightWindow = 0.0625, arc = FRONT_ARC, minSamples = MIN_BAND_SAMPLES } = {},
): number | null {
  const hits = samples
    .filter((sample) => Math.abs(sample.height - height) <= heightWindow && wrappedDelta(sample.bearing - bearing) <= arc)
    .map((sample) => sample.radius)
    .sort((a, b) => a - b);
  if (hits.length < minSamples) return null;
  return hits[Math.floor(hits.length / 2)] ?? null;
}

/**
 * The bearings worth measuring: everything except the two the arms occupy.
 *
 * An arm hangs at bearing 0 (right) and 180 (left), so a window there reports a
 * bicep as torso -- 200 to 416 mm of it. Everything else, front through both back
 * quarters, is occlusion-free, and the back quarters are where a sling actually
 * returns to the quiver. Measuring only the front left those points guessed, and
 * they were the ones still standing 95 mm off the body.
 */
export const PROFILE_BEARINGS = [-150, -120, -90, -60, 60, 90, 120, 150].map((d) => (d * Math.PI) / 180);

export type FrontTorsoProfile = {
  /** Radius as a fraction of the torso axis, per (band, bearing). */
  ratios: Float32Array;
  measuredBands: number;
  /** The axis this was measured against, so a caller can prove it still applies. */
  axisLength: number;
};

/**
 * Build the front profile from a posed model. Stored as ratios of the axis, which
 * is what lets one measurement serve 1.5 m through 2.0 m without a table.
 */
export function buildFrontTorsoProfile(model: THREE.Object3D, frame: TorsoFrame): FrontTorsoProfile | null {
  const samples = sampleTorsoSurface(model, frame, 1);
  if (!samples.length) return null;
  const stride = PROFILE_BEARINGS.length;
  const ratios = new Float32Array(PROFILE_BANDS * stride);
  let measuredBands = 0;
  for (let band = 0; band < PROFILE_BANDS; band += 1) {
    const height = (band + 0.5) / PROFILE_BANDS;
    let measuredHere = false;
    PROFILE_BEARINGS.forEach((bearing, slot) => {
      const radius = surfaceRadiusAt(samples, height, bearing, { heightWindow: 0.5 / PROFILE_BANDS });
      if (radius === null) return;
      ratios[band * stride + slot] = radius / frame.axisLength;
      measuredHere = true;
    });
    if (measuredHere) measuredBands += 1;
  }
  if (!measuredBands) return null;
  // A cell too sparse to measure borrows the nearest measured band at the SAME
  // bearing. Never a neighbouring bearing: chest depth and flank depth are
  // different numbers and swapping them is how a strap ends up off the body.
  for (let slot = 0; slot < stride; slot += 1) {
    for (let band = 0; band < PROFILE_BANDS; band += 1) {
      if (ratios[band * stride + slot]! > 0) continue;
      for (let span = 1; span < PROFILE_BANDS; span += 1) {
        const below = band - span;
        const above = band + span;
        if (below >= 0 && ratios[below * stride + slot]! > 0) { ratios[band * stride + slot] = ratios[below * stride + slot]!; break; }
        if (above < PROFILE_BANDS && ratios[above * stride + slot]! > 0) { ratios[band * stride + slot] = ratios[above * stride + slot]!; break; }
      }
    }
  }
  return { ratios, measuredBands, axisLength: frame.axisLength };
}

/**
 * Front-of-torso radius in world metres, for the axis length the caller has now.
 * Passing the CURRENT axis is what re-expresses a measurement taken at one height
 * for a body standing at another.
 */
export function frontTorsoRadius(
  profile: FrontTorsoProfile | null,
  height: number,
  currentAxisLength: number,
  bearing: number = FRONT_BEARING,
): number | null {
  if (!profile) return null;
  const band = Math.min(PROFILE_BANDS - 1, Math.max(0, Math.floor(height * PROFILE_BANDS)));
  let slot = 0;
  let best = Infinity;
  PROFILE_BEARINGS.forEach((candidate, index) => {
    const delta = wrappedDelta(candidate - bearing);
    if (delta < best) { best = delta; slot = index; }
  });
  const ratio = profile.ratios[band * PROFILE_BEARINGS.length + slot];
  return ratio && ratio > 0 ? ratio * currentAxisLength : null;
}
