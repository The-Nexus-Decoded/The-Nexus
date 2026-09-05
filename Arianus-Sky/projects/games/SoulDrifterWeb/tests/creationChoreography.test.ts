import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AWAKEN_CLIP_CAP_MS,
  CREATOR_CUE_AMPLITUDE,
  CREATOR_CUE_REGION_HEADS,
  CREATOR_CUE_REGION_PX,
  CREATOR_CUE_TIMING,
  CREATOR_GAZE_DRIFT,
  CREATOR_GAZE_OVERRIDE_CAP,
  CREATOR_MEMORY_GLANCE,
  CREATOR_STATION_CHOREOGRAPHY,
  awakenTimeline,
  cueDurationMs,
  cueEnvelope,
  cueRegion,
  cueRegionSize,
  gazeDriftYaw,
  gazeTargetFromPointer,
  holdEnvelope,
  meanAbsoluteRgbDifference,
  meanRgb,
  memoryListenDelayMs,
  nodPitchDegrees,
  resolveWithin,
  scaleGazeAngles,
  stationGazeLimits,
  type CreatorCue,
  type CreatorStation,
} from "../src/creationChoreography";
import {
  CreatorAdditivePose,
  CreatorCuePlayer,
  CREATOR_GAZE_LIMITS,
  alignClipRootRotation,
  creatorGazeAngles,
} from "../src/creationPreview";

const deg = THREE.MathUtils.degToRad;
const MAX_YAW = deg(CREATOR_GAZE_LIMITS.yawDegrees);
const MAX_PITCH = deg(CREATOR_GAZE_LIMITS.pitchDegrees);

describe("creator station gaze scale", () => {
  const full = creatorGazeAngles(1, 1, 0);

  it("scales creatorGazeAngles by each station's amplitude", () => {
    const expected: Record<CreatorStation, number> = {
      name: 0.4, race: 1, body: 1, face: 1, calling: 1, memory: 1, review: 0.6,
    };
    for (const station of Object.keys(expected) as CreatorStation[]) {
      const profile = CREATOR_STATION_CHOREOGRAPHY[station];
      const scaled = scaleGazeAngles(full, profile, CREATOR_GAZE_LIMITS);
      const limit = stationGazeLimits(profile, CREATOR_GAZE_LIMITS);
      expect(scaled.yaw, station).toBeCloseTo(Math.min(MAX_YAW * expected[station], limit.yaw), 6);
      expect(scaled.pitch, station).toBeCloseTo(Math.min(MAX_PITCH * expected[station], limit.pitch), 6);
    }
    // A half-way pointer on the name station is 40% of a half turn, not 40% of the limit.
    const half = scaleGazeAngles(creatorGazeAngles(0.5, -0.5, 0), CREATOR_STATION_CHOREOGRAPHY.name, CREATOR_GAZE_LIMITS);
    expect(half.yaw).toBeCloseTo(0.5 * MAX_YAW * 0.4, 6);
    expect(half.pitch).toBeCloseTo(-0.5 * MAX_PITCH * 0.4, 6);
  });

  it("clamps the face close-up at 16/8 degrees instead of scaling it", () => {
    const face = CREATOR_STATION_CHOREOGRAPHY.face;
    const limit = stationGazeLimits(face, CREATOR_GAZE_LIMITS);
    expect(limit.yaw).toBeCloseTo(deg(16), 6);
    expect(limit.pitch).toBeCloseTo(deg(8), 6);
    // Inside the clamp the input passes at full amplitude...
    const inside = scaleGazeAngles(creatorGazeAngles(0.5, 0.5, 0), face, CREATOR_GAZE_LIMITS);
    expect(inside.yaw).toBeCloseTo(0.5 * MAX_YAW, 6);
    expect(inside.pitch).toBeCloseTo(0.5 * MAX_PITCH, 6);
    // ...and the limit holds at the edge.
    const edge = scaleGazeAngles(full, face, CREATOR_GAZE_LIMITS);
    expect(edge.yaw).toBeCloseTo(deg(16), 6);
    expect(edge.pitch).toBeCloseTo(deg(8), 6);
  });

  it("caps programmatic overrides at 60% of the station limit", () => {
    expect(CREATOR_GAZE_OVERRIDE_CAP).toBe(0.6);
    const review = scaleGazeAngles(full, CREATOR_STATION_CHOREOGRAPHY.review, CREATOR_GAZE_LIMITS, true);
    expect(review.yaw).toBeCloseTo(MAX_YAW * 0.6 * 0.6, 6);
    const name = scaleGazeAngles(full, CREATOR_STATION_CHOREOGRAPHY.name, CREATOR_GAZE_LIMITS, true);
    expect(name.yaw).toBeCloseTo(MAX_YAW * 0.4 * 0.6, 6);
    const face = scaleGazeAngles(full, CREATOR_STATION_CHOREOGRAPHY.face, CREATOR_GAZE_LIMITS, true);
    expect(face.yaw).toBeCloseTo(deg(16) * 0.6, 6);
    expect(face.pitch).toBeCloseTo(deg(8) * 0.6, 6);
    // The cap is symmetric.
    const left = scaleGazeAngles(creatorGazeAngles(-1, -1, 0), CREATOR_STATION_CHOREOGRAPHY.body, CREATOR_GAZE_LIMITS, true);
    expect(left.yaw).toBeCloseTo(-MAX_YAW * 0.6, 6);
    expect(left.pitch).toBeCloseTo(-MAX_PITCH * 0.6, 6);
  });

  it("projects a client point onto the canvas as NDC and refuses a collapsed canvas", () => {
    const rect = { left: 100, top: 50, width: 800, height: 400 };
    expect(gazeTargetFromPointer(500, 250, rect)).toEqual({ x: 0, y: 0 });
    expect(gazeTargetFromPointer(900, 50, rect)).toEqual({ x: 1, y: 1 });
    expect(gazeTargetFromPointer(100, 450, rect)).toEqual({ x: -1, y: -1 });
    expect(gazeTargetFromPointer(300, 300, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });

  it("drifts the unattended gaze on a bounded sine only after the pointer has been gone", () => {
    const { afterMs, yawDegrees, periodMs } = CREATOR_GAZE_DRIFT;
    expect(afterMs).toBe(2500);
    expect(yawDegrees).toBe(4);
    expect(periodMs).toBe(7000);
    expect(gazeDriftYaw(0)).toBe(0);
    expect(gazeDriftYaw(afterMs)).toBe(0);
    expect(gazeDriftYaw(Number.NaN)).toBe(0);
    expect(gazeDriftYaw(afterMs + periodMs / 4)).toBeCloseTo(deg(yawDegrees), 6);
    expect(gazeDriftYaw(afterMs + (periodMs * 3) / 4)).toBeCloseTo(-deg(yawDegrees), 6);
    expect(gazeDriftYaw(afterMs + periodMs)).toBeCloseTo(0, 6);
    for (let ms = 0; ms < 60_000; ms += 97) {
      expect(Math.abs(gazeDriftYaw(ms))).toBeLessThanOrEqual(deg(yawDegrees) + 1e-9);
    }
    // The sine starts from zero, so the first sway comes in without a snap.
    expect(Math.abs(gazeDriftYaw(afterMs + 1))).toBeLessThan(deg(0.01));
  });

  it("glances down into the water after the last memory, in the gaze's own pitch convention", () => {
    const { pitchDegrees, holdMs, blendMs } = CREATOR_MEMORY_GLANCE;
    expect(Math.abs(pitchDegrees)).toBe(8);
    expect(holdMs).toBe(1200);
    expect(blendMs).toBe(400);
    // A pointer at the bottom of the canvas is "down" for the gaze; the glance shares its sign.
    expect(Math.sign(pitchDegrees)).toBe(Math.sign(creatorGazeAngles(0, -1, 0).pitch));
  });
});

describe("creator nod reach", () => {
  it("gives the nod its reach only where the camera frames the whole body", () => {
    const fullBody: CreatorStation[] = ["race", "body", "calling"];
    for (const station of Object.keys(CREATOR_STATION_CHOREOGRAPHY) as CreatorStation[]) {
      expect(CREATOR_STATION_CHOREOGRAPHY[station].nodReach, station).toBe(fullBody.includes(station) ? 1 : 0);
    }
  });

  it("keeps the design's head-only seven degrees at reach zero and brings the neck and chest in at one", () => {
    expect(nodPitchDegrees(0)).toEqual({ head: CREATOR_CUE_AMPLITUDE.nodPitchDegrees, neck: 0, spine: 0 });
    const { headPitchDegrees, neckPitchDegrees, spinePitchDegrees } = CREATOR_CUE_AMPLITUDE.nodReach;
    expect(nodPitchDegrees(1)).toEqual({
      head: CREATOR_CUE_AMPLITUDE.nodPitchDegrees + headPitchDegrees,
      neck: neckPitchDegrees,
      spine: spinePitchDegrees,
    });
    expect(nodPitchDegrees(0.5).neck).toBeCloseTo(neckPitchDegrees / 2, 9);
    // Out-of-range reaches clamp; NaN is no reach.
    expect(nodPitchDegrees(4)).toEqual(nodPitchDegrees(1));
    expect(nodPitchDegrees(-1)).toEqual(nodPitchDegrees(0));
    expect(nodPitchDegrees(Number.NaN)).toEqual(nodPitchDegrees(0));
  });
});

describe("creator cue envelopes", () => {
  it("nods: rises to one, returns to zero and stays there", () => {
    const { riseMs, returnMs } = CREATOR_CUE_TIMING.nod;
    expect(cueEnvelope("nod", 0)).toBe(0);
    expect(cueEnvelope("nod", riseMs)).toBeCloseTo(1, 6);
    expect(cueEnvelope("nod", riseMs + returnMs)).toBe(0);
    expect(cueEnvelope("nod", riseMs + returnMs + 5000)).toBe(0);
    expect(cueDurationMs("nod")).toBe(riseMs + returnMs);
    let previous = 0;
    for (let ms = 0; ms <= riseMs; ms += 10) {
      const value = cueEnvelope("nod", ms);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    for (let ms = riseMs; ms <= riseMs + returnMs; ms += 10) {
      const value = cueEnvelope("nod", ms);
      expect(value).toBeLessThanOrEqual(previous + 1e-9);
      previous = value;
    }
  });

  it("shakes: minus one, plus one, then zero in three equal swings", () => {
    const { swingMs, swings } = CREATOR_CUE_TIMING.shake;
    expect(swings).toBe(3);
    expect(cueEnvelope("shake", 0)).toBe(0);
    expect(cueEnvelope("shake", swingMs * 0.5)).toBeCloseTo(-0.5, 6);
    expect(cueEnvelope("shake", swingMs)).toBeCloseTo(-1, 6);
    expect(cueEnvelope("shake", swingMs * 2)).toBeCloseTo(1, 6);
    expect(cueEnvelope("shake", swingMs * 3)).toBe(0);
    expect(cueDurationMs("shake")).toBe(360);
    for (let ms = 0; ms <= 400; ms += 7) {
      expect(Math.abs(cueEnvelope("shake", ms))).toBeLessThanOrEqual(1);
    }
  });

  it("braces: rises, holds, releases", () => {
    const { riseMs, holdMs, releaseMs } = CREATOR_CUE_TIMING.brace;
    expect(cueEnvelope("brace", 0)).toBe(0);
    expect(cueEnvelope("brace", riseMs)).toBeCloseTo(1, 6);
    expect(cueEnvelope("brace", riseMs + holdMs * 0.5)).toBe(1);
    expect(cueEnvelope("brace", riseMs + holdMs)).toBeCloseTo(1, 6);
    expect(cueEnvelope("brace", riseMs + holdMs + releaseMs * 0.5)).toBeCloseTo(0.5, 6);
    expect(cueEnvelope("brace", riseMs + holdMs + releaseMs)).toBe(0);
    expect(cueDurationMs("brace")).toBe(1320);
  });

  it("settles: eases to one and holds, so the caller can alternate sides", () => {
    const { durationMs } = CREATOR_CUE_TIMING.settle;
    expect(cueEnvelope("settle", 0)).toBe(0);
    expect(cueEnvelope("settle", durationMs * 0.5)).toBeCloseTo(0.5, 6);
    expect(cueEnvelope("settle", durationMs)).toBe(1);
    expect(cueEnvelope("settle", durationMs * 10)).toBe(1);
    expect(cueDurationMs("settle")).toBe(900);
  });

  it("never returns a value before the trigger and handles NaN as zero", () => {
    for (const cue of ["nod", "shake", "brace", "settle"] as CreatorCue[]) {
      expect(cueEnvelope(cue, -10)).toBe(0);
      expect(cueEnvelope(cue, Number.NaN)).toBe(0);
    }
  });

  it("holds a plateau with eased edges", () => {
    expect(holdEnvelope(0, 400, 1200)).toBe(0);
    expect(holdEnvelope(200, 400, 1200)).toBeCloseTo(0.5, 6);
    expect(holdEnvelope(400, 400, 1200)).toBe(1);
    expect(holdEnvelope(1000, 400, 1200)).toBe(1);
    expect(holdEnvelope(1800, 400, 1200)).toBeCloseTo(0.5, 6);
    expect(holdEnvelope(2000, 400, 1200)).toBe(0);
  });

  it("times NpcListen to 60% of the camera move, and to the reveal when the camera stays", () => {
    expect(memoryListenDelayMs(true, 720)).toBe(432);
    expect(memoryListenDelayMs(false, 720)).toBe(0);
  });
});

describe("creator cue player on a real mixer", () => {
  interface Rig {
    root: THREE.Object3D;
    hips: THREE.Object3D;
    spine1: THREE.Object3D;
    leftShoulder: THREE.Object3D;
    rightShoulder: THREE.Object3D;
    neck: THREE.Object3D;
    head: THREE.Object3D;
    headTop: THREE.Object3D;
  }
  const HELD_HEAD = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.1);
  const HIPS_REST = new THREE.Vector3(0.0048, 0, -0.056);

  function bone(name: string, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Object3D {
    const node = new THREE.Bone();
    node.name = THREE.PropertyBinding.sanitizeNodeName(name);
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  /** Upright mixamo-style chain with the runtime's sanitized names and metres for units. */
  function rig(): Rig {
    const root = new THREE.Object3D();
    const hips = bone("mixamorig:Hips", HIPS_REST.x, HIPS_REST.y, HIPS_REST.z, root);
    const spine = bone("mixamorig:Spine", 0, 0.056, 0, hips);
    const spine1 = bone("mixamorig:Spine1", 0, 0.066, 0, spine);
    const spine2 = bone("mixamorig:Spine2", 0, 0.076, 0, spine1);
    const leftShoulder = bone("mixamorig:LeftShoulder", 0.038, 0.074, 0, spine2);
    const rightShoulder = bone("mixamorig:RightShoulder", -0.038, 0.074, 0, spine2);
    const neck = bone("mixamorig:Neck", 0, 0.085, 0, spine2);
    const head = bone("mixamorig:Head", 0, 0.04, 0.014, neck);
    const headTop = bone("mixamorig:HeadTop_End", 0, 0.2, 0, head);
    head.quaternion.copy(HELD_HEAD);
    return { root, hips, spine1, leftShoulder, rightShoulder, neck, head, headTop };
  }

  /** The stabilised idle: every track the cues touch holds one constant value, like the creator's. */
  function idleClip(): THREE.AnimationClip {
    const identity = new THREE.Quaternion();
    const q = (name: string, value: THREE.Quaternion) =>
      new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0, 1], [...value.toArray(), ...value.toArray()]);
    return new THREE.AnimationClip("idle", 1, [
      new THREE.VectorKeyframeTrack("mixamorigHips.position", [0, 1], [...HIPS_REST.toArray(), ...HIPS_REST.toArray()]),
      q("mixamorigHips", identity),
      q("mixamorigNeck", identity),
      q("mixamorigSpine1", identity),
      q("mixamorigLeftShoulder", identity),
      q("mixamorigRightShoulder", identity),
      q("mixamorigHead", HELD_HEAD),
    ]);
  }

  function harness() {
    const bones = rig();
    const mixer = new THREE.AnimationMixer(bones.root);
    mixer.clipAction(idleClip()).play();
    mixer.update(0);
    const pose = new CreatorAdditivePose();
    const cues = new CreatorCuePlayer();
    const bound = cues.bind(bones.root, pose);
    let now = 0;
    const stepMs = 1000 / 60;
    const frame = (): void => {
      now += stepMs;
      pose.restore();
      mixer.update(stepMs / 1000);
      pose.snapshot();
      cues.apply(now, stepMs / 1000);
    };
    const frames = (count: number): void => {
      for (let i = 0; i < count; i += 1) frame();
    };
    return { ...bones, mixer, pose, cues, bound, frames, now: () => now };
  }

  const headOffsetDeg = (head: THREE.Object3D): number => THREE.MathUtils.radToDeg(head.quaternion.angleTo(HELD_HEAD));
  const angleDeg = (bone: THREE.Object3D): number => THREE.MathUtils.radToDeg(bone.quaternion.angleTo(new THREE.Quaternion()));

  it("binds all six cue bones through the runtime's sanitized names", () => {
    const h = harness();
    expect(h.bound).toBe(6);
    expect(h.pose.size).toBe(6);
  });

  it("places the pixel gate's crop on the head, the shoulders and the hips in world space", () => {
    const h = harness();
    h.frames(1);
    const world = (node: THREE.Object3D) => node.getWorldPosition(new THREE.Vector3());
    const centre = (part: "head" | "shoulders" | "hips") => h.cues.partCentre(part, new THREE.Vector3());
    const midpoint = (a: THREE.Object3D, b: THREE.Object3D) => world(a).add(world(b)).multiplyScalar(0.5);
    expect(centre("head")!.distanceTo(midpoint(h.head, h.headTop))).toBeCloseTo(0, 9);
    expect(centre("shoulders")!.distanceTo(midpoint(h.leftShoulder, h.rightShoulder))).toBeCloseTo(0, 9);
    expect(centre("hips")!.distanceTo(world(h.hips))).toBeCloseTo(0, 9);
    const base = new THREE.Vector3();
    const crown = new THREE.Vector3();
    expect(h.cues.headSpan(base, crown)).toBe(true);
    expect(base.distanceTo(world(h.head))).toBeCloseTo(0, 9);
    expect(crown.distanceTo(world(h.headTop))).toBeCloseTo(0, 9);
    h.cues.release();
    expect(centre("head")).toBeNull();
    expect(h.cues.headSpan(base, crown)).toBe(false);
  });

  it("nods the head down by seven degrees and leaves it exactly where the mixer holds it", () => {
    const h = harness();
    h.frames(60);
    expect(headOffsetDeg(h.head)).toBeCloseTo(0, 6);
    h.cues.play("nod", h.now());
    const peakFrames = Math.round(CREATOR_CUE_TIMING.nod.riseMs / (1000 / 60));
    h.frames(peakFrames);
    expect(headOffsetDeg(h.head)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.nodPitchDegrees, 1);
    // At the default reach the head nods alone.
    expect(angleDeg(h.neck)).toBeCloseTo(0, 6);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 6);
    // Forward (+Z) tilts down at the peak.
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(h.head.quaternion);
    const heldForward = new THREE.Vector3(0, 0, 1).applyQuaternion(HELD_HEAD);
    expect(forward.y).toBeLessThan(heldForward.y);
    expect(h.cues.isPlaying("nod", h.now())).toBe(true);
    h.frames(Math.ceil(cueDurationMs("nod") / (1000 / 60)) + 2);
    expect(h.cues.isPlaying("nod", h.now())).toBe(false);
    // Ten seconds later the head still carries no residue of the nod.
    const residue: number[] = [];
    for (let i = 0; i < 600; i += 1) {
      h.frames(1);
      residue.push(headOffsetDeg(h.head));
    }
    expect(Math.max(...residue)).toBeCloseTo(0, 6);
  });

  it("carries a full-reach nod from the neck and chest, latched as the nod starts, and lets all of it go", () => {
    const h = harness();
    const peakFrames = Math.round(CREATOR_CUE_TIMING.nod.riseMs / (1000 / 60));
    const full = nodPitchDegrees(1);
    h.cues.setNodReach(1);
    h.cues.play("nod", h.now());
    // The station moving on mid-nod (the name station binds, then the camera pulls back)
    // does not change the nod in flight.
    h.cues.setNodReach(0);
    h.frames(peakFrames);
    expect(headOffsetDeg(h.head)).toBeCloseTo(full.head, 1);
    expect(angleDeg(h.neck)).toBeCloseTo(full.neck, 1);
    expect(angleDeg(h.spine1)).toBeCloseTo(full.spine, 1);
    // Every joint pitches the same way: forward (+Z) tilts down.
    for (const node of [h.head, h.neck, h.spine1]) {
      const rest = node === h.head ? HELD_HEAD : new THREE.Quaternion();
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(node.quaternion);
      const restForward = new THREE.Vector3(0, 0, 1).applyQuaternion(rest);
      expect(forward.y).toBeLessThan(restForward.y);
    }
    h.frames(Math.ceil(cueDurationMs("nod") / (1000 / 60)) + 2);
    expect(headOffsetDeg(h.head)).toBeCloseTo(0, 6);
    expect(angleDeg(h.neck)).toBeCloseTo(0, 6);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 6);
    // The next nod takes the reach the station holds now.
    h.cues.play("nod", h.now());
    h.frames(peakFrames);
    expect(headOffsetDeg(h.head)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.nodPitchDegrees, 1);
    expect(angleDeg(h.neck)).toBeCloseTo(0, 6);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 6);
  });

  it("shakes the head about its up axis and squares the shoulders on a brace", () => {
    const h = harness();
    h.cues.play("shake", h.now());
    h.frames(Math.round(CREATOR_CUE_TIMING.shake.swingMs / (1000 / 60)));
    // First swing lands near -6 degrees of yaw: the head's up axis is unchanged.
    expect(headOffsetDeg(h.head)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.shakeYawDegrees, 0);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(h.head.quaternion);
    const heldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(HELD_HEAD);
    expect(up.angleTo(heldUp)).toBeCloseTo(0, 6);
    h.frames(60);
    expect(headOffsetDeg(h.head)).toBeCloseTo(0, 6);

    h.cues.play("brace", h.now());
    h.frames(Math.round(CREATOR_CUE_TIMING.brace.riseMs / (1000 / 60)));
    expect(angleDeg(h.spine1)).toBeCloseTo(Math.abs(CREATOR_CUE_AMPLITUDE.braceSpinePitchDegrees), 1);
    expect(angleDeg(h.leftShoulder)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.braceShoulderDegrees, 1);
    expect(angleDeg(h.rightShoulder)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.braceShoulderDegrees, 1);
    // Mirrored: the two shoulders turn opposite ways about their own Z.
    const leftZ = new THREE.Vector3(0, 1, 0).applyQuaternion(h.leftShoulder.quaternion).x;
    const rightZ = new THREE.Vector3(0, 1, 0).applyQuaternion(h.rightShoulder.quaternion).x;
    expect(Math.sign(leftZ)).toBe(-Math.sign(rightZ));
    h.frames(Math.ceil(cueDurationMs("brace") / (1000 / 60)) + 2);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 6);
    expect(angleDeg(h.leftShoulder)).toBeCloseTo(0, 6);
    expect(angleDeg(h.rightShoulder)).toBeCloseTo(0, 6);
  });

  it("settles: slides the hips 12 mm, counter-rolls the spine, holds without drifting, alternates, and stands square again", () => {
    const h = harness();
    h.cues.setSettleAmplitude(1, h.now());
    h.frames(180); // let the amplitude smoothing converge
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x, 6);
    h.root.updateMatrixWorld(true);
    const headBefore = h.head.getWorldPosition(new THREE.Vector3());

    h.cues.play("settle", h.now());
    h.frames(Math.ceil(CREATOR_CUE_TIMING.settle.durationMs / (1000 / 60)) + 1);
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x + CREATOR_CUE_AMPLITUDE.settleHipsMetres, 4);
    expect(angleDeg(h.spine1)).toBeCloseTo(CREATOR_CUE_AMPLITUDE.settleSpineRollDegrees, 1);
    // The counter-roll keeps the head nearer the feet than the hips moved.
    h.root.updateMatrixWorld(true);
    const headAfter = h.head.getWorldPosition(new THREE.Vector3());
    expect(Math.abs(headAfter.x - headBefore.x)).toBeLessThan(CREATOR_CUE_AMPLITUDE.settleHipsMetres);
    expect(headAfter.x - headBefore.x).toBeGreaterThan(0);
    // Five seconds of holding: the additive pose keeps the slide from integrating.
    const held: number[] = [];
    for (let i = 0; i < 300; i += 1) {
      h.frames(1);
      held.push(h.hips.position.x);
    }
    expect(Math.max(...held)).toBeCloseTo(HIPS_REST.x + CREATOR_CUE_AMPLITUDE.settleHipsMetres, 4);
    expect(Math.min(...held)).toBeCloseTo(HIPS_REST.x + CREATOR_CUE_AMPLITUDE.settleHipsMetres, 4);

    // The next settle goes to the other side.
    h.cues.play("settle", h.now());
    h.frames(Math.ceil(CREATOR_CUE_TIMING.settle.durationMs / (1000 / 60)) + 1);
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x - CREATOR_CUE_AMPLITUDE.settleHipsMetres, 4);

    // A station without settle stands the figure square again.
    h.cues.setSettleAmplitude(0, h.now());
    h.frames(Math.ceil(CREATOR_CUE_TIMING.settle.durationMs / (1000 / 60)) + 60);
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x, 4);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 3);
  });

  it("halves the settle on the face station without a pop", () => {
    const h = harness();
    h.cues.setSettleAmplitude(1, h.now());
    h.frames(180);
    h.cues.play("settle", h.now());
    h.frames(60);
    h.cues.setSettleAmplitude(0.5, h.now());
    let previous = h.hips.position.x;
    for (let i = 0; i < 120; i += 1) {
      h.frames(1);
      // Each frame moves the hips by well under a millimetre.
      expect(Math.abs(h.hips.position.x - previous)).toBeLessThan(0.0008);
      previous = h.hips.position.x;
    }
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x + CREATOR_CUE_AMPLITUDE.settleHipsMetres * 0.5, 3);
  });

  it("cancels every cue at once and writes nothing after release", () => {
    const h = harness();
    h.cues.setSettleAmplitude(1, h.now());
    h.frames(120);
    h.cues.play("nod", h.now());
    h.cues.play("settle", h.now());
    h.frames(10);
    h.cues.cancel();
    h.frames(1);
    expect(headOffsetDeg(h.head)).toBeCloseTo(0, 6);
    expect(h.hips.position.x).toBeCloseTo(HIPS_REST.x, 6);
    h.cues.play("brace", h.now());
    h.cues.release();
    h.frames(20);
    expect(angleDeg(h.spine1)).toBeCloseTo(0, 6);
  });
});

describe("creator reaction root alignment", () => {
  const yaw = (degrees: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg(degrees));
  const quaternionTrack = (name: string, keys: THREE.Quaternion[]) => new THREE.QuaternionKeyframeTrack(
    `${name}.quaternion`,
    keys.map((_, index) => index),
    keys.flatMap((key) => key.toArray()),
  );
  const keyAt = (clip: THREE.AnimationClip, name: string, index: number): THREE.Quaternion => {
    const track = clip.tracks.find((candidate) => candidate.name === `${name}.quaternion`)!;
    return new THREE.Quaternion().fromArray(track.values, index * 4);
  };
  // The measured situation: the idle's Hips face one way, the utility pack's another.
  const idleHips = yaw(-125);
  const packHips = yaw(90);
  const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg(10));
  const idle = () => new THREE.AnimationClip("idle", 1, [
    quaternionTrack("mixamorigHips", [idleHips, idleHips]),
    quaternionTrack("mixamorigSpine", [new THREE.Quaternion(), new THREE.Quaternion()]),
  ]);
  const reaction = () => new THREE.AnimationClip("listen", 2, [
    quaternionTrack("mixamorigHips", [packHips, packHips.clone().multiply(lean), packHips]),
    quaternionTrack("mixamorigSpine", [yaw(3), yaw(5), yaw(3)]),
  ]);

  it("turns the clip's root to the idle's facing and keeps its own root motion relative to it", () => {
    const aligned = alignClipRootRotation(reaction(), idle(), "mixamorigHips");
    expect(aligned.name).toBe("listen");
    expect(aligned.duration).toBe(2);
    expect(aligned.tracks).toHaveLength(2);
    // Keyframe tracks hold Float32 values, so agreement is to a twentieth of a degree.
    const degreesApart = (a: THREE.Quaternion, b: THREE.Quaternion) => THREE.MathUtils.radToDeg(a.angleTo(b));
    expect(degreesApart(keyAt(aligned, "mixamorigHips", 0), idleHips)).toBeLessThan(0.1);
    // The authored lean is still a 10 degree lean, now from the idle's facing.
    expect(degreesApart(keyAt(aligned, "mixamorigHips", 1), keyAt(aligned, "mixamorigHips", 0))).toBeCloseTo(10, 1);
    expect(degreesApart(keyAt(aligned, "mixamorigHips", 1), idleHips.clone().multiply(lean))).toBeLessThan(0.1);
    expect(degreesApart(keyAt(aligned, "mixamorigHips", 2), idleHips)).toBeLessThan(0.1);
    // Every other bone keeps the clip's own values.
    expect(degreesApart(keyAt(aligned, "mixamorigSpine", 1), yaw(5))).toBeLessThan(0.1);
  });

  it("leaves the source clip untouched and returns the clip itself when there is nothing to align to", () => {
    const source = reaction();
    const before = Array.from(source.tracks[0]!.values);
    alignClipRootRotation(source, idle(), "mixamorigHips");
    expect(Array.from(source.tracks[0]!.values)).toEqual(before);
    const noRoot = new THREE.AnimationClip("idle", 1, [quaternionTrack("mixamorigSpine", [yaw(1), yaw(1)])]);
    expect(alignClipRootRotation(source, noRoot, "mixamorigHips")).toBe(source);
    const rootless = new THREE.AnimationClip("listen", 1, [quaternionTrack("mixamorigSpine", [yaw(1), yaw(1)])]);
    expect(alignClipRootRotation(rootless, idle(), "mixamorigHips")).toBe(rootless);
  });
});

describe("awaken timeline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the full Farewell sequence from the clip-bound moment", () => {
    expect(awakenTimeline(false, true)).toEqual([
      { atMs: 1800, action: "fade-chrome" },
      { atMs: 2200, action: "dissolve" },
      { atMs: 2720, action: "hide" },
    ]);
  });

  it("falls back to the existing 520 ms dissolve when the clip is unavailable", () => {
    expect(awakenTimeline(false, false)).toEqual([
      { atMs: 0, action: "dissolve" },
      { atMs: 520, action: "hide" },
    ]);
    expect(awakenTimeline(false)).toEqual(awakenTimeline(false, false));
  });

  it("hides immediately under reduced motion, clip or no clip", () => {
    expect(awakenTimeline(true)).toEqual([{ atMs: 0, action: "hide" }]);
    expect(awakenTimeline(true, true)).toEqual([{ atMs: 0, action: "hide" }]);
  });

  it("caps the wait for Farewell at 600 ms and treats a late or failed bind as the quick path", async () => {
    vi.useFakeTimers();
    expect(AWAKEN_CLIP_CAP_MS).toBe(600);
    let lateResolve: (value: boolean) => void = () => undefined;
    const late = new Promise<boolean>((resolve) => { lateResolve = resolve; });
    const outcomes: Array<boolean | "pending"> = ["pending", "pending", "pending", "pending"];
    void resolveWithin(late, AWAKEN_CLIP_CAP_MS).then((value) => { outcomes[0] = value; });
    void resolveWithin(Promise.resolve(true), AWAKEN_CLIP_CAP_MS).then((value) => { outcomes[1] = value; });
    void resolveWithin(Promise.resolve(false), AWAKEN_CLIP_CAP_MS).then((value) => { outcomes[2] = value; });
    void resolveWithin(Promise.reject(new Error("no clip")), AWAKEN_CLIP_CAP_MS).then((value) => { outcomes[3] = value; });

    await vi.advanceTimersByTimeAsync(AWAKEN_CLIP_CAP_MS - 1);
    expect(outcomes).toEqual(["pending", true, false, false]);
    await vi.advanceTimersByTimeAsync(1);
    expect(outcomes[0]).toBe(false);
    // The clip binding after the cap changes nothing.
    lateResolve(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(outcomes[0]).toBe(false);

    // A clip that binds inside the cap starts the timeline on the beat.
    let inTime: (value: boolean) => void = () => undefined;
    const bound = resolveWithin(new Promise<boolean>((resolve) => { inTime = resolve; }), AWAKEN_CLIP_CAP_MS);
    await vi.advanceTimersByTimeAsync(100);
    inTime(true);
    await expect(bound).resolves.toBe(true);
  });
});

describe("pixel gate statistics", () => {
  const SIZE = 40;
  const FEATURE = 12;
  /** A 40x40 RGBA crop: dark ground with one bright 12x12 feature whose top-left is (x, y). */
  function crop(featureX: number, featureY: number): Uint8Array {
    const rgba = new Uint8Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const inside = x >= featureX && x < featureX + FEATURE && y >= featureY && y < featureY + FEATURE;
        const offset = (y * SIZE + x) * 4;
        rgba[offset] = inside ? 200 : 20;
        rgba[offset + 1] = inside ? 160 : 20;
        rgba[offset + 2] = inside ? 140 : 20;
        rgba[offset + 3] = 255;
      }
    }
    return rgba;
  }

  it("reads the mean RGB of an RGBA buffer and ignores alpha", () => {
    expect(meanRgb(new Uint8Array([10, 20, 30, 255, 30, 40, 50, 0]))).toEqual({ r: 20, g: 30, b: 40 });
    expect(meanRgb(new Uint8Array(0))).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("counts a feature that moves inside the crop, which the crop's mean cannot see", () => {
    const before = crop(10, 10);
    const moved = crop(10, 16);
    // Same pixels, elsewhere: the difference of the means is exactly zero.
    expect(meanRgb(moved)).toEqual(meanRgb(before));
    // Six rows of the feature left and six entered: 144 of 1600 pixels changed by (180, 140, 120).
    const diff = meanAbsoluteRgbDifference(before, moved);
    expect(diff.r).toBeCloseTo((144 * 180) / 1600, 6);
    expect(diff.g).toBeCloseTo((144 * 140) / 1600, 6);
    expect(diff.b).toBeCloseTo((144 * 120) / 1600, 6);
    expect(Math.min(diff.r, diff.g, diff.b)).toBeGreaterThanOrEqual(6);
    expect(meanAbsoluteRgbDifference(before, before)).toEqual({ r: 0, g: 0, b: 0 });
    expect(meanAbsoluteRgbDifference(new Uint8Array(0), new Uint8Array(0))).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("sizes the gate's crop to the head on screen below the design's 200 px", () => {
    // Head-to-chest stop at 1440x900: the head is taller than the crop.
    expect(cueRegionSize(243.4)).toBe(CREATOR_CUE_REGION_PX);
    // Full-body stop at 1440x900 and at 390x844.
    expect(cueRegionSize(93)).toBe(Math.round(93 * CREATOR_CUE_REGION_HEADS));
    expect(cueRegionSize(87.2)).toBe(Math.round(87.2 * CREATOR_CUE_REGION_HEADS));
    expect(cueRegionSize(0)).toBe(CREATOR_CUE_REGION_PX);
    expect(cueRegionSize(Number.NaN)).toBe(CREATOR_CUE_REGION_PX);
    expect(cueRegionSize(0.1)).toBe(1);
    expect(cueRegion({ x: 465.5, y: 80.2 }, 93)).toEqual({ x: 405, y: 20, w: 121, h: 121 });
    expect(cueRegion({ x: 509, y: 176 }, 300)).toEqual({ x: 409, y: 76, w: 200, h: 200 });
  });

  it("is symmetric and refuses crops of different sizes", () => {
    const a = crop(4, 4);
    const b = crop(20, 8);
    expect(meanAbsoluteRgbDifference(a, b)).toEqual(meanAbsoluteRgbDifference(b, a));
    expect(() => meanAbsoluteRgbDifference(a, new Uint8Array(8))).toThrow(RangeError);
  });
});
