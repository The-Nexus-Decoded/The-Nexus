import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  APPROVED_GREATSWORD_CALIBRATION,
  CALIBRATION_HEIGHT_METERS,
  applyAdditiveHumanHandGrip,
  handSocketBodyUnits,
  solveGreatswordSupportGrip,
} from "../src/game/humanWeaponCalibration";
// @ts-expect-error Existing shared catalog is the loadout authority.
import { CALIBRATION_HEIGHT_METERS as REVIEW_CALIBRATION_HEIGHT_METERS } from "../src/review/weapon-lab/human-review-catalog.js";
import {
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS,
  BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL,
  BREACH_V2_HUMAN_FOUNDATION_MODEL_URL,
  BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL,
  createBreachV2HumanFoundationActor,
} from "../src/game/dungeons/breach-v2-human-foundation-actor";
const fileModule = "node:fs/promises";
const { readFile } = await import(fileModule);

describe("shared owner-approved human weapon calibration", () => {
  it("retains exact additive finger equations and mirrored thumb opposition", () => {
    for (const side of ["Right", "Left"] as const) {
      const bones = ["Index1", "Index2", "Index3", "Middle1", "Middle2", "Middle3",
        "Ring1", "Ring2", "Ring3", "Pinky1", "Pinky2", "Pinky3", "Thumb1", "Thumb2"].map((name) => {
        const bone = new THREE.Bone();
        bone.name = `mixamorig:${side}Hand${name}`;
        bone.quaternion.setFromEuler(new THREE.Euler(0.11, 0.23, -0.18));
        return bone;
      });
      const originals = bones.map((bone) => bone.quaternion.clone());
      const overlay = new Map<THREE.Bone, THREE.Quaternion>();
      const calibration = APPROVED_GREATSWORD_CALIBRATION;
      applyAdditiveHumanHandGrip(bones, side, calibration.curls, calibration.thumb, overlay);
      const mirror = side === "Left" ? -1 : 1;
      bones.forEach((bone, index) => {
        // The equations, driven by the calibration itself rather than by a copy of
        // its numbers, so tuning the approved curl cannot silently rewrite them.
        const thumb = calibration.thumb;
        const finger = bone.name.match(/(Index|Middle|Ring|Pinky)\d$/)?.[1] as keyof typeof calibration.curls | undefined;
        const curl = finger ? calibration.curls[finger] : 0;
        const angles = bone.name.endsWith("Thumb1") ? [thumb * 0.45, -thumb * mirror, thumb * 0.3 * mirror]
          : bone.name.endsWith("Thumb2") ? [thumb * 0.65, 0, -thumb * 0.25 * mirror] : [curl, 0, 0];
        const expected = originals[index]!.clone().multiply(new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(angles[0], angles[1], angles[2], "XYZ")));
        bone.quaternion.toArray().forEach((value, axis) => expect(value).toBeCloseTo(expected.toArray()[axis]!, 14));
        bone.quaternion.multiply(overlay.get(bone)!.clone().invert());
        expect(bone.quaternion.angleTo(originals[index]!)).toBeLessThan(1e-7);
      });
    }
  });

  it("solves only the support chain and preserves recoverable pre-IK poses", () => {
    const model = new THREE.Group();
    const shoulder = new THREE.Bone(); shoulder.name = "mixamorigLeftShoulder";
    const arm = new THREE.Bone(); arm.name = "mixamorigLeftArm"; arm.position.x = 0.15;
    const forearm = new THREE.Bone(); forearm.name = "mixamorigLeftForeArm"; forearm.position.x = 0.35;
    const hand = new THREE.Bone(); hand.name = "mixamorigLeftHand"; hand.position.x = 0.3;
    const primary = new THREE.Bone(); primary.name = "mixamorigRightHand";
    const socket = new THREE.Group(); socket.position.set(0.6, 0.24, 0.06);
    model.add(shoulder, primary, socket); shoulder.add(arm); arm.add(forearm); forearm.add(hand);
    const bones = [shoulder, arm, forearm, hand, primary];
    const originals = new Map(bones.map((bone) => [bone, bone.quaternion.clone()]));
    const base = new Map<THREE.Bone, THREE.Quaternion>();
    expect(solveGreatswordSupportGrip(model, bones, socket, base)).toBe(true);
    expect(base.size).toBe(4);
    expect(primary.quaternion.toArray()).toEqual(originals.get(primary)!.toArray());
    const target = socket.localToWorld(new THREE.Vector3(...APPROVED_GREATSWORD_CALIBRATION.supportTarget));
    expect(hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(0.01);
    for (const [bone, quaternion] of base) {
      expect(quaternion.toArray()).toEqual(originals.get(bone)!.toArray());
      bone.quaternion.copy(quaternion);
    }
    expect(solveGreatswordSupportGrip(model, [primary], socket, new Map())).toBe(false);
  });
});

// CPU validation retains the actual meshes, weights, hierarchy and clips. Only
// texture decoding is removed; these checks do not claim visual acceptance.
vi.stubGlobal("ProgressEvent", class {
  constructor(public type: string, init: object = {}) { Object.assign(this, init); }
});
afterAll(() => vi.unstubAllGlobals());
async function loadRig(url: string) {
  const glb = await readFile(new URL(`../public${url}`, import.meta.url));
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 20 + jsonLength;
  const binary = glb.subarray(binaryStart + 8, binaryStart + 8 + glb.readUInt32LE(binaryStart));
  json.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString("base64")}`;
  json.materials = [{}];
  delete json.textures;
  delete json.images;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) primitive.material = 0;
  return new GLTFLoader().parseAsync(JSON.stringify(json), "");
}

// Frozen pre-extraction #435 lab CCD, intentionally independent of the shared
// helper. Its wrist-origin residual is not a skin/shaft contact measurement.
function originalLabSupport(model: THREE.Object3D, socket: THREE.Object3D): number {
  const find = (suffix: string): THREE.Object3D => {
    let found: THREE.Object3D | undefined;
    model.traverse((node) => { if (node instanceof THREE.Bone && node.name.endsWith(suffix)) found = node; });
    return found!;
  };
  const hand = find("LeftHand");
  const links = ["LeftForeArm", "LeftArm", "LeftShoulder"].map(find);
  model.updateMatrixWorld(true);
  const target = socket.localToWorld(new THREE.Vector3(-0.024, -0.09, 0.016));
  for (let iteration = 0; iteration < 6; iteration += 1) for (const link of links) {
    model.updateMatrixWorld(true);
    const origin = link.getWorldPosition(new THREE.Vector3());
    const towardHand = hand.getWorldPosition(new THREE.Vector3()).sub(origin);
    const towardTarget = target.clone().sub(origin);
    if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
    const delta = new THREE.Quaternion().setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
    const world = delta.multiply(link.getWorldQuaternion(new THREE.Quaternion()));
    link.quaternion.copy(link.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world)).normalize();
  }
  hand.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0, "XYZ"))).normalize();
  model.updateMatrixWorld(true);
  return hand.getWorldPosition(new THREE.Vector3()).distanceTo(target);
}

it("applies the accepted grip to the real 65-bone body without mutating 400 source clips or paused poses", async () => {
  const [body, library, sword] = await Promise.all([
    loadRig(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
    loadRig(BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL),
    loadRig(BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL),
  ]);
  expect(library.animations).toHaveLength(400);
  const originals = library.animations.map((clip) => JSON.stringify(THREE.AnimationClip.toJSON(clip)));
  const actor = createBreachV2HumanFoundationActor(body.scene, library.animations, "real-rig", 2.06, sword.scene);
  const bones: THREE.Bone[] = [];
  actor.model.traverse((object) => { if (object instanceof THREE.Bone) bones.push(object); });
  expect(bones).toHaveLength(65);
  for (let index = 0; index < 3; index += 1) actor.update(1 / 60);
  expect(actor.snapshot().groundingStatus).toBe("calibrated-live-pose");
  const rootPosition = actor.root.position.clone();
  const hip = bones.find((bone) => /Hips$/.test(bone.name))!;
  const restHip = body.scene.getObjectByName(hip.name)!.position.clone();
  const socket = actor.model.getObjectByName("weapon-socket-hand-r")!;
  const leftHand = bones.find((bone) => /LeftHand$/.test(bone.name))!;
  const reference = cloneSkeleton(body.scene);
  reference.scale.copy(actor.model.scale);
  const referenceSocket = new THREE.Group();
  referenceSocket.position.copy(socket.position);
  referenceSocket.quaternion.copy(socket.quaternion);
  referenceSocket.scale.copy(socket.scale);
  reference.traverse((node) => {
    if (node instanceof THREE.Bone && node.name.endsWith("RightHand")) node.add(referenceSocket);
  });
  const referenceMixer = new THREE.AnimationMixer(reference);
  for (const action of [BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle,
    BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack,
    BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk,
    BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun]) {
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      actor.pose(action, phase);
      const target = socket.localToWorld(new THREE.Vector3(...APPROVED_GREATSWORD_CALIBRATION.supportTarget));
      referenceMixer.stopAllAction();
      const referenceAction = referenceMixer.clipAction(library.animations.find((clip) => clip.name === action)!).play();
      referenceAction.paused = true;
      referenceAction.time = phase * referenceAction.getClip().duration;
      referenceMixer.update(0);
      const originalResidual = originalLabSupport(reference, referenceSocket);
      expect(leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(target), `${action} ${phase}`)
        .toBeCloseTo(originalResidual, 6);
      const before = bones.map((bone) => bone.quaternion.clone());
      for (let frame = 0; frame < 25; frame += 1) actor.update(0);
      bones.forEach((bone, index) => {
        expect(bone.quaternion.toArray().every(Number.isFinite)).toBe(true);
        const difference = bone.quaternion.toArray().map((value, axis) => Math.abs(value - before[index]!.toArray()[axis]!));
        expect(Math.max(...difference), `${action} ${phase} ${bone.name}`).toBeLessThan(1e-6);
      });
      const rootDeltaWorld = hip.position.clone().sub(restHip).applyMatrix3(new THREE.Matrix3().setFromMatrix4(hip.parent!.matrixWorld));
      expect(rootDeltaWorld.x).toBeCloseTo(0, 6);
      expect(rootDeltaWorld.z).toBeCloseTo(0, 6);
      expect(actor.root.position.toArray()).toEqual(rootPosition.toArray());
    }
  }
  expect(library.animations.map((clip) => JSON.stringify(THREE.AnimationClip.toJSON(clip)))).toEqual(originals);
  const gaitBones = bones.filter((bone) => /(?:Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot)$/.test(bone.name));
  const continuity: { action: string; cycles: number; maxSeamRadians: number; maxSeamMeters: number }[] = [];
  for (const armed of [false, true]) for (const running of [false, true]) {
    actor.play(armed ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle);
    actor.setMoving(true, running);
    actor.update(0.2); // Finish only the entry crossfade; do not restart at seams.
    const start = actor.snapshot();
    const delta = start.durationSeconds / 120;
    let previousPhase = start.playback.phase;
    let previous = gaitBones.map((bone) => ({ q: bone.quaternion.clone().normalize(), p: bone.position.clone() }));
    let maxSeamRadians = 0;
    let maxSeamMeters = 0;
    for (let frame = 0; frame < 421; frame += 1) {
      actor.setMoving(true, running);
      actor.update(delta);
      const state = actor.snapshot();
      expect(state.animation).toBe(start.animation);
      expect(state.playback.activation).toBe(start.playback.activation);
      expect(state.playback.loop).toBe("repeat");
      const current = gaitBones.map((bone) => ({ q: bone.quaternion.clone().normalize(), p: bone.position.clone() }));
      if (state.playback.phase < previousPhase) current.forEach(({ q, p }, index) => {
        maxSeamRadians = Math.max(maxSeamRadians, q.angleTo(previous[index]!.q));
        maxSeamMeters = Math.max(maxSeamMeters, p.distanceTo(previous[index]!.p) * actor.model.scale.x);
      });
      previous = current;
      previousPhase = state.playback.phase;
    }
    expect(actor.snapshot().playback.completedCycles).toBeGreaterThanOrEqual(3);
    expect(maxSeamRadians, `${start.animation} loop seam rotation`).toBeLessThan(0.2);
    expect(maxSeamMeters, `${start.animation} loop seam displacement`).toBeLessThan(0.02);
    continuity.push({ action: start.animation, cycles: actor.snapshot().playback.completedCycles, maxSeamRadians, maxSeamMeters });
  }
  console.info("Human gait continuity", JSON.stringify(continuity));
  referenceMixer.stopAllAction();
  referenceMixer.uncacheRoot(reference);
  actor.dispose();
}, 30_000);

/**
 * The socket seat is anatomy, the weapon is not.
 *
 * Building the same actor at 2.06 and 1.8 m must move the fist seat by exactly the
 * body ratio while leaving the longsword the length it was modelled at. Before the
 * fix the socket position spent a plain 1 / modelScale, which held the seat at a
 * fixed number of world millimetres from the wrist and so slid the haft off the
 * fist centre at every height except the calibration one.
 */
describe("hand socket seats by body height, weapon stays the length it was modelled", () => {
  it("moves the fist seat with the body and leaves the blade absolute", async () => {
    const [body, library, sword] = await Promise.all([
      loadRig(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
      loadRig(BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL),
      loadRig(BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL),
    ]);
    const measure = (heightMeters: number) => {
      const actor = createBreachV2HumanFoundationActor(
        body.scene, library.animations, `seat-${heightMeters}`, heightMeters, sword.scene,
      );
      actor.pose(BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle, 0.25);
      actor.model.updateMatrixWorld(true);
      const socket = actor.model.getObjectByName("weapon-socket-hand-r")!;
      let wrist: THREE.Bone | undefined;
      actor.model.traverse((node) => {
        if (node instanceof THREE.Bone && /RightHand$/.test(node.name)) wrist = node;
      });
      socket.visible = true;
      const bounds = new THREE.Box3().setFromObject(socket, true);
      const seatMeters = socket.getWorldPosition(new THREE.Vector3())
        .distanceTo(wrist!.getWorldPosition(new THREE.Vector3()));
      const bladeMeters = bounds.getSize(new THREE.Vector3()).length();
      const bodyScale = actor.model.scale.x;
      actor.dispose();
      return { seatMeters, bladeMeters, bodyScale };
    };

    const calibration = measure(CALIBRATION_HEIGHT_METERS);
    const shorter = measure(1.8);
    const ratio = 1.8 / CALIBRATION_HEIGHT_METERS;

    // The body really did change height, so this is not a no-op comparison. The
    // whole-model bounds cannot say so: the socket holds the blade at its modelled
    // length, so it stops shrinking with the body it hangs off.
    expect(shorter.bodyScale / calibration.bodyScale).toBeCloseTo(ratio, 12);
    // Anatomy: wrist to fist centre shrinks with the body, to the millimetre.
    expect(shorter.seatMeters).toBeCloseTo(calibration.seatMeters * ratio, 6);
    // The regression this guards: absolute seats hold ~4-7 mm of haft offset.
    expect(Math.abs(shorter.seatMeters - calibration.seatMeters) * 1000).toBeGreaterThan(1);
    // The weapon is modelled to scale and does not shrink with its wielder.
    expect(shorter.bladeMeters).toBeCloseTo(calibration.bladeMeters, 6);
  }, 30_000);

  it("keeps one reference height across the game and review lanes", () => {
    expect(CALIBRATION_HEIGHT_METERS).toBe(REVIEW_CALIBRATION_HEIGHT_METERS);
    // At the calibration height the conversion is identity, which is why every
    // approved number in this file stayed put when the ratio was introduced.
    expect(handSocketBodyUnits(CALIBRATION_HEIGHT_METERS, 1)).toBe(1);
    expect(handSocketBodyUnits(1.8, 2)).toBeCloseTo(1.8 / (CALIBRATION_HEIGHT_METERS * 2), 12);
  });
});
