import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createHumanReviewActorFactory, findBone } from "../src/review/weapon-lab/human-review-actor.js";
import { APPROVED_GREATSWORD_CALIBRATION } from "../src/game/humanWeaponCalibration.ts";
import { LOADOUTS, URLS, BOW_RELEASE_NAME, BOW_TRIPLE_SHOT_NAME, BOW_PROJECTILE_MOTION,
  GREATSWORD_TWO_HAND_SHEATHE_NAME, sourceResponseActions,
  ACTION_PRESETS, TWO_HAND_GRIP, STAFF_HAND_GRIP,
  ASSET_SPECS, LOADOUT_GRIP_PRESETS, FITTED_HAND_GRIP, NARROW_HAND_GRIP,
  SHORTSWORD_HAND_GRIP, MACE_HAND_GRIP, MACE_SUPPORT_HAND_GRIP,
  WAND_HAND_GRIP, DAGGER_HAND_GRIP, KNIFE_HAND_GRIP,
  TARGET_HEIGHT_METERS, CALIBRATION_HEIGHT_METERS } from "../src/review/weapon-lab/human-review-catalog.js";

/**
 * Every fingertip pin below is the measurement taken on the 2.06 m calibration
 * body, spent through the same ratio the actor spends on its socket seats. The
 * fit is a rigid body-scale of the approved grip, so the pins scale with it: at
 * 1.8 m, 4000 of the 4160 gripping-hand fingertip samples across the nine armed
 * loadouts land within 0.0022 mm of ratio x their 2.06 m value. The 160 that do
 * not are the two clips that carry the bow to and from the Spine2 mount, where
 * the socket is deliberately not in a hand.
 *
 * Pinning the 1.8 m millimetres directly would have hidden that. It would also
 * need a new column per body height, and the review body is about to become
 * selectable over 1.5-2.0 m.
 */
const BODY_RATIO = TARGET_HEIGHT_METERS / CALIBRATION_HEIGHT_METERS;



function clipsDigest(clips) {
  const hash = createHash("sha256");
  for (const clip of clips) {
    hash.update(`${clip.name}/${clip.duration}`);
    for (const track of clip.tracks) {
      hash.update(track.name);
      hash.update(new Uint8Array(track.times.buffer, track.times.byteOffset, track.times.byteLength));
      hash.update(new Uint8Array(track.values.buffer, track.values.byteOffset, track.values.byteLength));
    }
  }
  return hash.digest("hex");
}

function sourceDigest(gltf) {
  const hash = createHash("sha256");
  hash.update(clipsDigest(gltf.animations));
  gltf.scene.traverse((object) => {
    hash.update(JSON.stringify([object.name, object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()]));
    const attributes = object.geometry?.attributes ?? {};
    for (const [name, attribute] of Object.entries({ ...attributes, index: object.geometry?.index })) {
      if (!attribute) continue;
      hash.update(name);
      hash.update(new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
  });
  return hash.digest("hex");
}

function realLoader() {
  const parser = new GLTFLoader();
  // Exact public geometry, skin, bones and clips. Only image decoding is
  // replaced in this CPU suite; this is not a visual/PBR acceptance claim.
  const decodeTexture = async () => {
    const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
  };
  parser.register(() => ({ name: "EXT_texture_webp", loadTexture: decodeTexture }));
  parser.register(() => ({ name: "TEST_TEXTURE_DECODE_ONLY", loadTexture: decodeTexture }));
  const loaded = new Map();
  const sourceDigests = new Map();
  const completeDigests = new Map();
  return {
    loaded, sourceDigests, completeDigests,
    loadAsync: vi.fn(async (url) => {
      const bytes = readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url));
      const gltf = await parser.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
      sourceDigests.set(url, clipsDigest(gltf.animations));
      completeDigests.set(url, sourceDigest(gltf));
      loaded.set(url, gltf);
      return gltf;
    }),
  };
}

const loader = realLoader();
const textureLoader = { loadAsync: vi.fn(async () => {
  const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
}) };
const factory = createHumanReviewActorFactory({ loader, textureLoader });
const actors = new Set();
let serial = 0;
async function create(options = {}) {
  const actor = await factory.create({ instanceId: `human-test-${++serial}`, ...options });
  actors.add(actor);
  return actor;
}
afterEach(() => { for (const actor of actors) actor.dispose(); actors.clear(); vi.restoreAllMocks(); });
afterAll(() => factory.dispose());

function pose(actor) {
  actor.root.updateWorldMatrix(true, true);
  const values = [];
  actor.root.traverse((object) => {
    values.push(...object.matrixWorld.elements, Number(object.visible));
  });
  return values;
}
function expectSamePose(actual, expected, tolerance = 1e-6) {
  expect(actual).toHaveLength(expected.length);
  expect(Math.max(...actual.map((value, index) => Math.abs(value - expected[index])))).toBeLessThan(tolerance);
}

describe("Full Human Foundation review factory", () => {
  it("loads the 400+5 exact source clips once and preserves their tracks with independent 65-bone instances", async () => {
    const first = await create({ mode: "catalog" });
    const second = await create({ mode: "catalog" });
    expect(first.bones.size).toBe(65);
    expect(second.bones.size).toBe(65);
    expect(first.sourceClipCount).toBe(405);
    for (const url of [URLS.body, URLS.animations, URLS.locomotionExtras]) {
      expect(loader.loadAsync.mock.calls.filter(([requested]) => requested === url)).toHaveLength(1);
      expect(clipsDigest(loader.loaded.get(url).animations)).toBe(loader.sourceDigests.get(url));
    }
    expect(first.clips).not.toBe(second.clips);
    expect(first.clips.get("MaleLocomotion__Walking")).toBe(second.clips.get("MaleLocomotion__Walking"));
    expect(first.mixer).not.toBe(second.mixer);
    expect(findBone(first.bones, "Hips")).not.toBe(findBone(second.bones, "Hips"));
    expect(first.actions().filter(({ approvalStatus }) => approvalStatus === "source")).toHaveLength(405);
    expect(first.actions().find(({ id }) => id === GREATSWORD_TWO_HAND_SHEATHE_NAME)?.approvalStatus).toBe("draft");
    first.sample("MaleLocomotion__Walking", 0.2);
    const held = pose(first);
    second.sample("GreatSword__GreatSwordSlash", 0.4);
    expectSamePose(pose(first), held);
  }, 30_000);

  it("classifies real caster movement, idles and defenses by action rather than source-family prefix", async () => {
    const actor = await create({ mode: "catalog" });
    const semantics = new Map(actor.actions().map(({ id, semantic }) => [id, semantic]));
    for (const [name, semantic] of Object.entries({
      ProMagic__StandingWalkForward: "walk", ProMagic__StandingRunForward: "run",
      ProMagic__StandingIdle: "idle", ProMagic__StandingBlockIdle: "block",
      ProMagic__StandingBlockReactLarge: "block", ProMeleeAxe__StandingBlockReactLarge: "block",
      ProMagic__StandingReactDeathForward: "death", ProMagic__StandingReactSmallFromFront: "reaction",
      ProMagic__Standing1HCastSpell01: "cast", ProMagic__Standing1HMagicAttack01: "attack",
      ProMeleeAxe__StandingMeleeRunJumpAttack: "attack",
      CarryLayer__StaffWalk: "walk", CarryLayer__StaffRun: "run",
    })) expect(semantics.get(name), name).toBe(semantic);
  });

  it("keeps raw catalog samples identical to the source mixer for every remembered loadout", async () => {
    const first = await create({ mode: "catalog" });
    const name = "MaleLocomotion__Walking";
    const sourceModel = cloneSkeleton(loader.loaded.get(URLS.body).scene);
    const sourceMixer = new THREE.AnimationMixer(sourceModel);
    const action = sourceMixer.clipAction(first.clips.get(name)).play();
    action.time = 0.2; action.paused = true; sourceMixer.update(0);
    const sourceBones = new Map();
    sourceModel.traverse((object) => { if (object.isBone) sourceBones.set(object.name, object); });
    for (const loadoutId of Object.keys(LOADOUTS)) {
      const actor = await create({ mode: "catalog", loadoutId });
      actor.sample(name, 0.2);
      // Hidden/manual calibration must not invalidate the raw-source label.
      actor.setCalibration({ grip: { Index: 0.8 }, leftGrip: { thumb: 0.6 } });
      actor.sample(name, 0.2);
      for (const [boneName, bone] of actor.bones) {
        const source = sourceBones.get(boneName);
        expectSamePose([...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray()],
          [...source.position.toArray(), ...source.quaternion.toArray(), ...source.scale.toArray()], 1e-8);
      }
    }
    sourceMixer.stopAllAction(); sourceMixer.uncacheRoot(sourceModel);
  }, 30_000);

  it.each(Object.keys(LOADOUTS))("loads real %s equipment and preserves its current labeled action capabilities", async (loadoutId) => {
    const actor = await create({ loadoutId });
    expect(actor.sockets.map(({ asset }) => asset)).toEqual(LOADOUTS[loadoutId].attachments.map(({ asset }) => asset));
    expect(actor.actions().length).toBeGreaterThan(0);
    expect(new Set(actor.actions().map(({ id }) => id)).size).toBe(actor.actions().length);
    for (const action of actor.actions()) {
      expect(actor.clips.get(action.clipName)?.duration).toBe(action.durationSeconds);
      expect(["source", "draft"]).toContain(action.approvalStatus);
      for (const phase of [0.15, 0.55, 0.9]) {
        actor.sample(action.id, action.durationSeconds * phase);
        expect(pose(actor).every(Number.isFinite), `${loadoutId}/${action.id}/${phase}`).toBe(true);
      }
    }
    for (const record of actor.sockets) {
      expect(record.socket.parent).toBeTruthy();
      expect(record.prepared.visual).toBeInstanceOf(THREE.Object3D);
    }
    const firstAction = actor.actions()[0];
    actor.sample(firstAction.id, firstAction.durationSeconds * 0.43);
    expect(pose(actor).every(Number.isFinite)).toBe(true);
    const point = new THREE.Vector3();
    expect(actor.socketWorld("RightHand", point)).toBe(true);
    expect(point.toArray().every(Number.isFinite)).toBe(true);
    expect(actor.socketWorld("missing-contact", point)).toBe(false);
  }, 30_000);

  // ---- fitted one-hand grip calibration -----------------------------------
  // The shortsword, mace and wand each carry their own finger curl instead of
  // sharing FITTED_HAND_GRIP / NARROW_HAND_GRIP, because one curl cannot close
  // four fingers of different lengths on handles of 26-30 mm, ~23 mm and 13.8 mm.
  // These two tests pin both halves: the catalog values, and the fingertip
  // geometry those values actually produce on the shipped rig. Either one moving
  // without the other is the silent drift this is here to catch.
  it("keeps the fitted one-hand grip presets separate from the shared constants", () => {
    expect(SHORTSWORD_HAND_GRIP).toEqual({ Index: 1.8, Middle: 2.0, Ring: 1.2, Pinky: 1.2, thumb: 0.55 });
    expect(MACE_HAND_GRIP).toEqual({ Index: 1.6, Middle: 1.2, Ring: 0.9, Pinky: 0.9, thumb: 0.55 });
    expect(MACE_SUPPORT_HAND_GRIP).toEqual({ Index: 1.75, Middle: 1.85, Ring: 1.83, Pinky: 1.78, thumb: 0.55 });
    expect(WAND_HAND_GRIP).toEqual({ Index: 1.51, Middle: 1.2, Ring: 1.12, Pinky: 1.2, thumb: 0.55 });

    // The three calibrated loadouts must not be reading a shared object, or a
    // change made for one of their neighbours would move them silently.
    for (const [loadoutId, preset] of Object.entries({
      shortswordOnly: SHORTSWORD_HAND_GRIP, mace: MACE_HAND_GRIP, rod: WAND_HAND_GRIP,
    })) {
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).toBe(preset);
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).not.toBe(FITTED_HAND_GRIP);
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).not.toBe(NARROW_HAND_GRIP);
    }
    // The shared constants themselves keep their shipped values, so that reading
    // one still describes what the loadouts left on it are calibrated against.
    // Which loadouts those are is the other review lanes' to assert, not this
    // test's -- the guarantee here is only that none of them is one of ours.
    expect(FITTED_HAND_GRIP).toEqual({ Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 });
    expect(NARROW_HAND_GRIP).toEqual({ Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 });

    // The fit specs these grips were calibrated against.
    expect(ASSET_SPECS.shortsword).toEqual({ targetLength: 0.75, gripEnd: "hilt", gripFraction: 0.15 });
    expect(ASSET_SPECS.mace).toEqual({ targetLength: 0.68, gripEnd: "small", gripFraction: 0.13 });
    // canonical short-circuits prepareAsset, so gripEnd/gripFraction would be
    // inert here: measured, a +0.20 gripFraction bias moved the wand's anchor by
    // -0.001 mm. They are deliberately absent rather than declared and ignored.
    expect(ASSET_SPECS.rod).toEqual({ canonical: true, targetLength: 0.38 });
    expect(LOADOUTS.mace.attachments[0].position).toEqual([0, 0.0543, 0.0114]);
  });

  // The ritual knife and the worn dagger were the two loadouts still left on the
  // shared NARROW_HAND_GRIP. One angle drove four fingers of different length
  // onto the same ~48 mm handle, so the short fingers reached the wood and kept
  // going: measured against each weapon's own radius profile, the pinky's middle
  // phalanx sat 24.0 mm (dagger right), 27.3 mm (dagger left) and 13.3 mm (knife)
  // INSIDE the handle. Per-finger curls take the worst finger-joint deviation to
  // 13.3 / 9.9 / 13.0 mm and the mean over the sixteen finger joints from
  // 8.3 / 7.7 / 7.2 mm to 5.7 / 5.2 / 5.8 mm.
  it("keeps the blade grips separate from the shared constants and from each other", () => {
    expect(DAGGER_HAND_GRIP).toEqual({ Index: 1.2, Middle: 1.0, Ring: 1.0, Pinky: 0.6, thumb: 0.55 });
    expect(KNIFE_HAND_GRIP).toEqual({ Index: 1.2, Middle: 1.0, Ring: 1.0, Pinky: 0.9, thumb: 0.55 });

    for (const [loadoutId, preset] of Object.entries({
      knife: KNIFE_HAND_GRIP, daggerSingle: DAGGER_HAND_GRIP, daggers: DAGGER_HAND_GRIP,
    })) {
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).toBe(preset);
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).not.toBe(FITTED_HAND_GRIP);
      expect(LOADOUT_GRIP_PRESETS[loadoutId].right, loadoutId).not.toBe(NARROW_HAND_GRIP);
    }
    // Both dagger loadouts must keep sharing one object: they hold the same
    // asset in the same socket, so calibrating one and not the other would be a
    // silent divergence rather than a decision.
    expect(LOADOUT_GRIP_PRESETS.daggers.right).toBe(LOADOUT_GRIP_PRESETS.daggerSingle.right);
    // Dual wield fits BOTH hands; the measured per-finger optimum came out the
    // same on each, so the off hand shares the preset rather than copying it.
    expect(LOADOUT_GRIP_PRESETS.daggers.left).toBe(DAGGER_HAND_GRIP);

    // A single shared angle is what caused the defect, so the corrected curls
    // must stay a gradient that follows finger length. If a later edit flattens
    // them back to one value this fails before the geometry does.
    for (const grip of [DAGGER_HAND_GRIP, KNIFE_HAND_GRIP]) {
      expect(new Set([grip.Index, grip.Middle, grip.Ring, grip.Pinky]).size).toBeGreaterThan(1);
      expect(grip.Index).toBeGreaterThan(grip.Pinky);
      // applyHandOverlay spends `angle` x [1.2, 1.4, 1.2] across the three
      // phalanges for the narrow-handle loadouts, so 1.21 is 263 deg of total
      // flexion -- a fully closed fist. Above it the finger wraps through itself,
      // which measures better while looking wrong.
      for (const finger of ["Index", "Middle", "Ring", "Pinky"]) {
        expect(grip[finger], finger).toBeLessThanOrEqual(1.21);
      }
    }

    // The fit specs these grips were calibrated against. The knife's anchor was
    // raised from 0.16, which seated the fist 32 mm below the guard: measured,
    // 0.16 -> 0.20 took its worst finger-joint deviation 13.601 -> 12.960 mm.
    // The dagger's stays at 0.16 -- 0.12 improved the mean by 0.66 mm but left
    // the worst value untouched at 13.283 mm, which is not worth moving the
    // weapon in the hand for.
    expect(ASSET_SPECS.knife).toEqual({ targetLength: 0.34, gripEnd: "hilt", gripFraction: 0.20 });
    expect(ASSET_SPECS.dagger).toEqual({ targetLength: 0.38, gripEnd: "hilt", gripFraction: 0.16 });
  });

  // Millimetres on the 2.06 m calibration body; the assertion spends BODY_RATIO.
  it.each([
    ["shortswordOnly", "ProMeleeAxe__StandingIdle", {
      Index: [43.74, 30.45], Middle: [16.19, 26.01], Ring: [-13.78, 32.72], Pinky: [-38.55, 31.52],
    }],
    ["mace", "ProMeleeAxe__StandingIdle", {
      Index: [38.24, 20.47], Middle: [6.04, 35.83], Ring: [-13.87, 45.83], Pinky: [-40.28, 42.39],
    }],
    ["rod", "ProMagic__StandingIdle", {
      Index: [42.71, 22.81], Middle: [8.73, 23.58], Ring: [-13.86, 13.15], Pinky: [-40.56, 12.64],
    }],
    // knife and daggerSingle share three of four curls, and the socket sits at
    // the same place on the same bone, so their index/middle/ring land
    // identically; only the pinky (0.9 vs 0.6) separates them.
    ["knife", "ProMagic__StandingIdle", {
      Index: [31.07, 38.76], Middle: [7.05, 37.09], Ring: [-13.83, 24.54], Pinky: [-39.99, 25.03],
    }],
    ["daggerSingle", "ProMeleeAxe__StandingIdle", {
      Index: [31.07, 38.76], Middle: [7.05, 37.09], Ring: [-13.83, 24.54], Pinky: [-46.1, 37.38],
    }],
    ["daggers", "ProMeleeAxe__StandingIdle", {
      Index: [31.07, 38.76], Middle: [7.05, 37.09], Ring: [-13.83, 24.54], Pinky: [-46.1, 37.38],
    }],
  ])("holds the calibrated %s fingertips where the grip audit measured them", async (loadoutId, clipName, expected) => {
    const actor = await create({ loadoutId });
    actor.sample(clipName, 0);
    actor.model.updateMatrixWorld(true);
    const record = actor.sockets.find(({ role }) => role === "primary");
    // prepareAsset lays the weapon along the socket's local +Y (weapon-lab.js
    // takes the blade tip as socket.localToWorld(0, targetLength * 0.9, 0)), so
    // in socket-local space y is distance along the shaft and hypot(x, z) is
    // distance across it. Both are pure functions of the calibration above.
    record.socket.updateWorldMatrix(true, true);
    const toSocket = new THREE.Matrix4().copy(record.socket.matrixWorld).invert();
    for (const [digit, [axialMm, radialMm]] of Object.entries(expected)) {
      const tip = findBone(actor.bones, `RightHand${digit}4`);
      expect(tip, digit).toBeTruthy();
      const local = tip.getWorldPosition(new THREE.Vector3()).applyMatrix4(toSocket);
      expect(local.y * 1000, `${loadoutId} ${digit} axial`).toBeCloseTo(axialMm * BODY_RATIO, 1);
      expect(Math.hypot(local.x, local.z) * 1000, `${loadoutId} ${digit} radial`).toBeCloseTo(radialMm * BODY_RATIO, 1);
    }
  }, 30_000);

  // Dual wield is the one loadout that fits BOTH hands, on every clip -- unlike
  // the mace, whose support grip is block-only. The off hand carried the worst
  // grip in the audit (pinky middle phalanx 27.3 mm inside the handle) precisely
  // because nothing was pinning it.
  it("fits the daggers off hand on every clip, not just a two-hand pose", async () => {
    const actor = await create({ loadoutId: "daggers" });
    const offhand = actor.sockets.find(({ role }) => role === "offhand");
    expect(offhand, "daggers must carry an off-hand socket").toBeTruthy();
    const leftTips = () => {
      actor.model.updateMatrixWorld(true);
      offhand.socket.updateWorldMatrix(true, true);
      const toSocket = new THREE.Matrix4().copy(offhand.socket.matrixWorld).invert();
      return Object.fromEntries(["Index", "Middle", "Ring", "Pinky"].map((digit) => {
        const local = findBone(actor.bones, `LeftHand${digit}4`)
          .getWorldPosition(new THREE.Vector3()).applyMatrix4(toSocket);
        return [digit, [local.y * 1000, Math.hypot(local.x, local.z) * 1000]];
      }));
    };
    // An idle, a strike and a run: the fitted overlay replaces the source clip's
    // own finger keys outright, so all three must give the same hand.
    // Millimetres on the 2.06 m calibration body, as above.
    const expected = {
      Index: [33.11, 35.14], Middle: [8.6, 33.82], Ring: [-11.3, 28.36], Pinky: [-45.96, 35.32],
    };
    for (const clipName of ["ProMeleeAxe__StandingIdle", "ProMeleeAxe__StandingMeleeAttackBackhand",
      "ProMeleeAxe__StandingRunForward"]) {
      actor.sample(clipName, 0);
      const tips = leftTips();
      for (const [digit, [axialMm, radialMm]] of Object.entries(expected)) {
        expect(tips[digit][0], `${clipName} ${digit} axial`).toBeCloseTo(axialMm * BODY_RATIO, 1);
        expect(tips[digit][1], `${clipName} ${digit} radial`).toBeCloseTo(radialMm * BODY_RATIO, 1);
      }
    }
  }, 30_000);

  it("fits the mace support hand to the shaft on the two-hand block only", async () => {
    const actor = await create({ loadoutId: "mace" });
    const record = actor.sockets.find(({ role }) => role === "primary");
    const leftTips = () => {
      actor.model.updateMatrixWorld(true);
      record.socket.updateWorldMatrix(true, true);
      const toSocket = new THREE.Matrix4().copy(record.socket.matrixWorld).invert();
      return Object.fromEntries(["Index", "Middle", "Ring", "Pinky"].map((digit) => {
        const local = findBone(actor.bones, `LeftHand${digit}4`)
          .getWorldPosition(new THREE.Vector3()).applyMatrix4(toSocket);
        return [digit, Math.hypot(local.x, local.z) * 1000];
      }));
    };
    actor.sample("ProMeleeAxe__StandingBlockIdle", 0);
    const fitted = leftTips();
    // All four support fingertips sit on the shaft. The band is in weapon
    // millimetres and does NOT scale with the body: the mace shaft is the same
    // wood whoever holds it. Measured 16.6-22.5 mm across it (5.9 mm span) on the
    // 2.06 m body and 14.5-19.7 mm (5.1 mm span) at 1.8 m -- the support palm is
    // seated a body-relative depth onto a weapon-relative point 0.24 m up the
    // shaft, so a smaller hand closes deeper on the same shaft. At the shared
    // staff curl they spanned 32.1-41.4 mm.
    //
    // 14 mm is 0.5 mm below the 1.8 m minimum. That is deliberate: it is the
    // point at which the support fingertips have closed through the shaft rather
    // than onto it, and a body height low enough to reach it needs the support
    // curl re-fitted, not the bound moved.
    for (const [digit, radialMm] of Object.entries(fitted)) {
      expect(radialMm, `block ${digit}`).toBeGreaterThan(14);
      expect(radialMm, `block ${digit}`).toBeLessThan(25);
    }
    expect(Math.max(...Object.values(fitted)) - Math.min(...Object.values(fitted))).toBeLessThan(8);

    // The eight one-hand clips leave the off hand on its source-clip pose, well
    // clear of the weapon, and must not pick the support grip up.
    actor.sample("ProMeleeAxe__StandingIdle", 0);
    expect(Math.min(...Object.values(leftTips()))).toBeGreaterThan(200);
  }, 30_000);

  it.each(Object.keys(LOADOUTS))("opts %s into actual source responses without changing the solo catalog or clips", async (loadoutId) => {
    const solo = await create({ loadoutId }), reviewed = await create({ loadoutId, includeSourceResponses: true });
    const original = solo.actions(), rows = sourceResponseActions(loadoutId, reviewed.clips);
    const responses = reviewed.actions().filter(({ id }) => rows.some(([, name]) => id === name));
    expect(responses.length).toBe(rows.length);
    expect(reviewed.actions().slice(0, original.length)).toEqual(original);
    expect(responses.some(({ semantic }) => semantic === "reaction")).toBe(true);
    expect(responses.some(({ semantic }) => semantic === "death")).toBe(true);
    expect(responses.every(({ semantic }) => semantic === "reaction" || semantic === "death")).toBe(true);
    expect(responses.every(({ id }) => !/SwordAndShield|SwordShie|Shooter|ProRifle|BlockReact/.test(id))).toBe(true);
    for (const action of responses) {
      expect(action.approvalStatus).toBe("source"); expect(action.label).toContain("equipment suitability unverified");
      expect(reviewed.clips.get(action.id)).toBe(solo.clips.get(action.id));
      expect(reviewed.clips.get(action.id).duration).toBe(action.durationSeconds);
      reviewed.sample(action.id, action.durationSeconds * 0.37);
      const expected = pose(reviewed); expect(expected.every(Number.isFinite)).toBe(true);
      reviewed.sample(action.id, action.durationSeconds);
      reviewed.sample(original[0].id, 0);
      reviewed.sample(action.id, action.durationSeconds * 0.37);
      expectSamePose(pose(reviewed), expected);
      if (action.id.startsWith("Interactions__")) expect(action.label).toContain("Generic source candidate");
    }
    expect(solo.actions()).toEqual(original);
    expect(clipsDigest(loader.loaded.get(URLS.animations).animations)).toBe(loader.sourceDigests.get(URLS.animations));
  }, 30_000);

  it("keeps response bindings explicit, fresh and loadout-specific without inventing a missing clip", async () => {
    expect(sourceResponseActions("mace", new Map([["ProSwordAndShield__SwordAndShieldDeath", true]]))).toEqual([]);
    expect(() => sourceResponseActions("invented", new Map())).toThrow("Unknown human response binding");
    const actor = await create({ loadoutId: "longswordTwoHand", includeSourceResponses: true });
    const original = sourceResponseActions("longswordTwoHand", actor.clips);
    original[0][0] = "changed outside the shared catalog";
    expect(sourceResponseActions("longswordTwoHand", actor.clips)[0][0]).not.toBe(original[0][0]);
    await actor.setLoadout("bow");
    expect(actor.actions().filter(({ semantic }) => semantic === "death").every(({ id }) => id.startsWith("ProLongbow__"))).toBe(true);
    await actor.setLoadout("bow", { mode: "catalog" });
    const raw = await create({ mode: "catalog" }); expect(actor.actions()).toEqual(raw.actions());
    await expect(create({ includeSourceResponses: "yes" })).rejects.toThrow("explicitly enabled or disabled");
  }, 30_000);

  it("isolates materials, grips, calibration history and source resource lifetime", async () => {
    const first = await create({ loadoutId: "longswordTwoHand" });
    const second = await create({ loadoutId: "longswordTwoHand" });
    const meshes = (actor) => { const result = []; actor.model.traverse((object) => { if (object.isSkinnedMesh) result.push(object); }); return result; };
    const [firstBody] = meshes(first); const [secondBody] = meshes(second);
    expect(firstBody.geometry).toBe(secondBody.geometry);
    expect(firstBody.material).not.toBe(secondBody.material);
    expect(firstBody.skeleton).not.toBe(secondBody.skeleton);
    const geometryDispose = vi.spyOn(secondBody.geometry, "dispose");
    const material = Array.isArray(secondBody.material) ? secondBody.material[0] : secondBody.material;
    const textureDispose = vi.spyOn(material.map, "dispose");
    second.sample("GreatSword__GreatSwordIdle", 0.2);
    const secondBefore = pose(second);
    const secondCalibration = second.getCalibration();
    first.setCalibration({ grip: { Index: 0.91 }, twoHandLock: { target: [0.03, -0.11, 0.02] } }, { evaluate: true });
    first.sample("GreatSword__GreatSwordSlash2", 0.5);
    first.sample("GreatSword__GreatSwordIdle", 0.2);
    expect(first.getCalibration().grip.Index).toBe(0.91);
    expect(second.getCalibration()).toEqual(secondCalibration);
    expectSamePose(pose(second), secondBefore);
    first.dispose();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    second.sample("GreatSword__GreatSwordIdle", 0.2);
    expectSamePose(pose(second), secondBefore);
    expect(() => first.sample("GreatSword__GreatSwordIdle", 0)).toThrow("disposed");
  }, 30_000);

  it.each([
    ["longswordTwoHand", GREATSWORD_TWO_HAND_SHEATHE_NAME],
    ["bow", BOW_RELEASE_NAME], ["bow", BOW_TRIPLE_SHOT_NAME],
    ["staff", "Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
  ])("samples %s / %s independently of seek history and actor world placement", async (loadoutId, actionId) => {
    const actor = await create({ loadoutId });
    actor.root.position.set(2.7, 0.4, -1.2); actor.root.rotation.y = 0.73;
    const duration = actor.clips.get(actionId).duration;
    actor.sample(actionId, duration * 0.73);
    const expected = pose(actor);
    for (const phase of [0.99, 0.12, 0.51, 0, 0.73, 0.73]) actor.sample(actionId, duration * phase);
    expectSamePose(pose(actor), expected);
    actor.reset();
    expect(actor.snapshot().timeSeconds).toBe(0);
  }, 30_000);

  it("keeps nested bow pose definitions independent and leaves the shared catalog untouched", async () => {
    const first = await create({ loadoutId: "bow" });
    const second = await create({ loadoutId: "bow" });
    const original = [...LOADOUTS.bow.attachments[0].poses.hand.position];
    first.primary.poses.hand.position[0] += 0.04;
    expect(second.primary.poses.hand.position).toEqual(original);
    expect(LOADOUTS.bow.attachments[0].poses.hand.position).toEqual(original);
  }, 30_000);

  it("shares frozen bow emission metadata without changing the existing two authored release bindings", () => {
    expect(BOW_PROJECTILE_MOTION).toEqual({
      releasePhaseByAction: { [BOW_RELEASE_NAME]: 0.3, [BOW_TRIPLE_SHOT_NAME]: 0.58 },
      rangeMeters: 6, dropMeters: 0.65,
      spreadRadiansByCount: { 1: [0], 2: [-0.045, 0.045], 3: [-0.075, 0, 0.075] },
    });
    expect(Object.isFrozen(BOW_PROJECTILE_MOTION)).toBe(true);
    expect(Object.isFrozen(BOW_PROJECTILE_MOTION.releasePhaseByAction)).toBe(true);
    expect(Object.isFrozen(BOW_PROJECTILE_MOTION.spreadRadiansByCount)).toBe(true);
    Object.values(BOW_PROJECTILE_MOTION.spreadRadiansByCount).forEach((spreads) => expect(Object.isFrozen(spreads)).toBe(true));
  });

  it.each([[BOW_RELEASE_NAME, 0.3], [BOW_TRIPLE_SHOT_NAME, 0.58]])(
    "preserves actual %s arrow visuals against the pre-extraction trajectory equation", async (actionId, release) => {
      const actor = await create({ loadoutId: "bow" });
      actor.root.position.set(2.7, 0.4, -1.2); actor.root.rotation.y = 0.73;
      const duration = actor.clips.get(actionId).duration;
      for (const inventory of [0, 1, 2, 3]) {
        actor.updateSettings({ arrowCount: inventory });
        const count = inventory === 0 ? 0 : actionId === BOW_RELEASE_NAME ? 1 : inventory;
        const spreads = count === 3 ? [-0.075, 0, 0.075] : count === 2 ? [-0.045, 0.045] : [0];
        for (const normalized of [release - 0.001, release, release + 0.05, 0.91, 1, release + 0.05]) {
          actor.sample(actionId, duration * normalized);
          const projectile = actor.projectile;
          const phase = THREE.MathUtils.clamp((actor.snapshot().normalizedTime - release) / (1 - release), 0, 1);
          const released = actor.snapshot().normalizedTime >= release && count > 0;
          expect(projectile.visuals.filter((visual) => visual.visible)).toHaveLength(released ? count : 0);
          expect(projectile.distanceMeters).toBe(released ? phase * 6 : 0);
          if (!released) continue;
          for (let index = 0; index < count; index++) {
            const direction = projectile.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreads[index]);
            const expected = projectile.startPosition.clone().addScaledVector(direction, phase * 6);
            expected.y -= phase * phase * 0.65;
            expect(projectile.visuals[index].getWorldPosition(new THREE.Vector3()).distanceTo(expected)).toBeLessThan(1e-10);
          }
        }
      }
      actor.sample("ProLongbow__StandingIdle01", 0.2);
      expect(actor.projectile.visuals.every((visual) => !visual.visible)).toBe(true);
      expect(actor.projectile.captured).toBe(false);
    }, 30_000);

  it("advances at exact speed, holds pause, and loops without accumulating pose/root offsets", async () => {
    const actor = await create({ mode: "catalog" });
    const name = "MaleLocomotion__Walking";
    const duration = actor.clips.get(name).duration;
    actor.selectAction(name, { playing: true, speed: 0.5, loop: true });
    actor.update(duration * 4.74);
    expect(actor.snapshot().normalizedTime).toBeCloseTo(0.37, 7);
    const looped = pose(actor);
    actor.setPlayback({ playing: false }); actor.update(20);
    expectSamePose(pose(actor), looped);
    actor.sample(name, duration * 0.37);
    expectSamePose(pose(actor), looped);
    expect(() => actor.sample(name, NaN)).toThrow("finite");
    expect(() => actor.sample("invented-action", 0)).toThrow("missing");
    expect(() => actor.update(NaN)).toThrow("finite");
    actor.sample(name, duration);
    actor.update(20);
    expect(actor.snapshot().normalizedTime).toBe(1);
    actor.setPlayback({ playing: true, loop: false });
    actor.update(duration * 3);
    expect(actor.snapshot().normalizedTime).toBe(1);
  }, 30_000);

  it("refreshes calibration while paused without losing exact time or accepting nonnumeric values", async () => {
    const actor = await create({ loadoutId: "unarmedMagic" });
    const name = "ProMagic__StandingWalkForward";
    actor.sample(name, 0.2); actor.setPlayback({ playing: false });
    const before = pose(actor);
    actor.setCalibration({ grip: { Index: 0.6 } });
    actor.update(10);
    expect(actor.snapshot().timeSeconds).toBe(0.2);
    expect(pose(actor)).not.toEqual(before);
    const calibrated = pose(actor);
    actor.update(10);
    expectSamePose(pose(actor), calibrated);
    expect(() => actor.setCalibration({ twoHandLock: { target: [0, "1", 0] } })).toThrow("Invalid");
    expect(() => actor.setCalibration({ grip: { Index: Infinity } })).toThrow("finite");
    expectSamePose(pose(actor), calibrated);
  });

  it("retains per-instance attachment and arrow-bundle tuning across absolute seeks", async () => {
    const actor = await create({ loadoutId: "daggers" });
    actor.setAttachmentTransform("offhand", { position: [0.02, -0.03, 0.04], rotation: [0.1, 0.2, 0.3] });
    const offhand = actor.sockets.find(({ role }) => role === "offhand");
    const expected = [...offhand.socket.position.toArray(), ...offhand.socket.quaternion.toArray()];
    const action = actor.actions()[0];
    actor.sample(action.id, action.durationSeconds * 0.7);
    expect([...offhand.socket.position.toArray(), ...offhand.socket.quaternion.toArray()]).toEqual(expected);
    await actor.setLoadout("bow");
    actor.setArrowBundleTransform({ position: [0.19, 0.1, -0.16], rotation: [0.04, 0.02, 0.07] });
    actor.sample(BOW_RELEASE_NAME, actor.clips.get(BOW_RELEASE_NAME).duration * 0.73);
    const tuned = pose(actor);
    actor.sample(BOW_RELEASE_NAME, 0);
    actor.sample(BOW_RELEASE_NAME, actor.clips.get(BOW_RELEASE_NAME).duration * 0.73);
    expectSamePose(pose(actor), tuned);
  }, 30_000);

  it.each([
    ["longswordTwoHand", GREATSWORD_TWO_HAND_SHEATHE_NAME],
    ["bow", BOW_RELEASE_NAME], ["staff", "Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
  ])("moves the complete %s actor and detached attachments coherently in world space", async (loadoutId, name) => {
    const actor = await create({ loadoutId });
    const time = actor.clips.get(name).duration * 0.73;
    actor.sample(name, time);
    const original = pose(actor);
    actor.root.position.set(2, 0.3, -1); actor.root.rotation.y = 0.7;
    actor.sample(name, time);
    const inverse = actor.root.matrixWorld.clone().invert();
    const local = [];
    actor.root.traverse((object) => {
      const values = [...new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld).elements, Number(object.visible)];
      const expected = original.slice(local.length, local.length + values.length);
      const error = Math.max(...values.map((value, index) => Math.abs(value - expected[index])));
      expect(error, `world covariance: ${object.name}`).toBeLessThan(1e-5);
      local.push(...values);
    });
  }, 30_000);

  it("keeps every loaded source mesh, skin, bind transform and animation track unchanged", () => {
    for (const [url, gltf] of loader.loaded) expect(sourceDigest(gltf)).toBe(loader.completeDigests.get(url));
  });

  it("ignores stale equipment loads and safely releases late resources after disposal", async () => {
    const sourceLoader = realLoader();
    let releaseBow;
    const gate = new Promise((resolve) => { releaseBow = resolve; });
    const delayedLoader = { loadAsync: async (url) => {
      if (url === URLS.bow) await gate;
      return sourceLoader.loadAsync(url);
    } };
    const ownFactory = createHumanReviewActorFactory({ loader: delayedLoader, textureLoader });
    try {
      const actor = await ownFactory.create({ instanceId: "load-race", mode: "catalog" });
      const stale = actor.setLoadout("bow");
      await actor.setLoadout("staff");
      const staffPose = pose(actor);
      releaseBow();
      expect(await stale).toBe(false);
      expect(actor.snapshot().loadoutId).toBe("staff");
      expectSamePose(pose(actor), staffPose);
      const replacement = actor.setLoadout("bow");
      actor.dispose();
      expect(await replacement).toBe(false);
      expect(actor.root.children).toHaveLength(0);
    } finally { releaseBow(); ownFactory.dispose(); }
  }, 30_000);

  it("rejects a factory disposed during source loading and releases the late cached geometry once", async () => {
    const sourceLoader = realLoader();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const disposals = [];
    const ownFactory = createHumanReviewActorFactory({ loader: { loadAsync: async (url) => {
      await gate;
      const gltf = await sourceLoader.loadAsync(url);
      const geometries = new Set();
      gltf.scene.traverse((object) => { if (object.geometry) geometries.add(object.geometry); });
      for (const geometry of geometries) disposals.push(vi.spyOn(geometry, "dispose"));
      return gltf;
    } }, textureLoader });
    const pending = ownFactory.create({ instanceId: "disposed-in-flight", mode: "catalog" });
    const rejected = expect(pending).rejects.toThrow("disposed");
    ownFactory.dispose(); release();
    await rejected;
    expect(disposals.length).toBeGreaterThan(0);
    for (const disposal of disposals) expect(disposal).toHaveBeenCalledTimes(1);
  }, 30_000);

  // ---- issue #458 class-A grip calibration -------------------------------------
  // These pin MEASURED geometry, not only the constants, so a change to either the
  // catalog value or the overlay maths that moves a hand off its weapon fails here.

  /** Closest distance, in millimetres, from a rig bone to the primary weapon mesh. */
  function millimetresToPrimaryMesh(actor, boneSuffix) {
    const point = findBone(actor.bones, boneSuffix).getWorldPosition(new THREE.Vector3());
    const vertex = new THREE.Vector3();
    let closest = Infinity;
    actor.primary.visual.updateWorldMatrix(true, true);
    actor.primary.visual.traverse((object) => {
      const position = object.geometry?.attributes?.position;
      if (!position) return;
      for (let index = 0; index < position.count; index += 1) {
        vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
        closest = Math.min(closest, vertex.distanceTo(point));
      }
    });
    return closest * 1000;
  }

  /** Where the grip socket sits along the primary weapon, as a fraction from its butt. */
  function gripAlongPrimary(actor) {
    const record = actor.primary;
    record.socket.updateWorldMatrix(true, true);
    record.visual.updateWorldMatrix(true, true);
    const toSocket = record.socket.matrixWorld.clone().invert();
    const vertex = new THREE.Vector3();
    let low = Infinity;
    let high = -Infinity;
    record.visual.traverse((object) => {
      const position = object.geometry?.attributes?.position;
      if (!position) return;
      for (let index = 0; index < position.count; index += 1) {
        const along = vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld).applyMatrix4(toSocket).y;
        low = Math.min(low, along);
        high = Math.max(high, along);
      }
    });
    // Socket-local units are metres: the socket carries 1 / modelScale.
    return { fraction: -low / (high - low), lengthMetres: high - low };
  }

  it("keeps the greatsword thumb closed on the haft, from one shared curl", async () => {
    // One source of truth: the two action presets used to repeat the curl as
    // literals and could drift from the loadout value without anyone noticing.
    expect(TWO_HAND_GRIP.thumb).toBe(1.4);
    expect(ACTION_PRESETS.GreatSword__GreatSwordIdle.grip).toBe(TWO_HAND_GRIP);
    expect(ACTION_PRESETS.GreatSword__GreatSwordIdle.leftGrip).toBe(TWO_HAND_GRIP);
    expect(ACTION_PRESETS.GreatSword__GreatSwordAttack.grip).toBe(TWO_HAND_GRIP);
    expect(ACTION_PRESETS.GreatSword__GreatSwordAttack.leftGrip).toBe(TWO_HAND_GRIP);
    expect(LOADOUT_GRIP_PRESETS.longswordTwoHand.right).toBe(TWO_HAND_GRIP);
    // The game runtime holds the same greatsword through its own copy of the
    // calibration; neither may move without the other.
    expect(APPROVED_GREATSWORD_CALIBRATION.thumb).toBe(TWO_HAND_GRIP.thumb);
    expect(APPROVED_GREATSWORD_CALIBRATION.curls).toEqual({
      Index: TWO_HAND_GRIP.Index, Middle: TWO_HAND_GRIP.Middle,
      Ring: TWO_HAND_GRIP.Ring, Pinky: TWO_HAND_GRIP.Pinky,
    });

    const actor = await create({ loadoutId: "longswordTwoHand" });
    actor.sample("GreatSword__GreatSwordIdle", 0.2);
    const digits = ["Thumb4", "Index4", "Middle4", "Ring4", "Pinky4"];
    const closed = Object.fromEntries(digits.map((digit) => [digit, millimetresToPrimaryMesh(actor, `RightHand${digit}`)]));
    // The thumb pad reaches the wood: the tip JOINT ends about one finger flesh
    // radius outside a 35.6 mm-diameter haft instead of two haft radii clear of it.
    expect(closed.Thumb4).toBeLessThan(25);
    expect(millimetresToPrimaryMesh(actor, "LeftHandThumb4")).toBeLessThan(25);

    // The pre-fix value is what it must never go back to, and the four fingers must
    // not move when the thumb changes.
    actor.setCalibration({ grip: { thumb: 0.1 }, leftGrip: { thumb: 0.1 } }, { evaluate: true });
    const open = Object.fromEntries(digits.map((digit) => [digit, millimetresToPrimaryMesh(actor, `RightHand${digit}`)]));
    expect(open.Thumb4 - closed.Thumb4).toBeGreaterThan(25);
    for (const digit of ["Index4", "Middle4", "Ring4", "Pinky4"]) {
      expect(Math.abs(open[digit] - closed[digit]), digit).toBeLessThan(0.01);
    }
  }, 30_000);

  it("holds the longsword at the anchor its own mesh carries, with no inert fit keys", async () => {
    // A canonical asset skips prepareAsset's fit pass entirely, so declaring
    // gripEnd or gripFraction for one is a silent no-op and a trap for the next
    // person who tries to calibrate the grip from the catalog.
    expect(ASSET_SPECS.longsword.canonical).toBe(true);
    expect(ASSET_SPECS.longsword).not.toHaveProperty("gripEnd");
    expect(ASSET_SPECS.longsword).not.toHaveProperty("gripFraction");

    const actor = await create({ loadoutId: "longswordTwoHand" });
    actor.sample("GreatSword__GreatSwordIdle", 0.2);
    const { fraction, lengthMetres } = gripAlongPrimary(actor);
    expect(lengthMetres).toBeCloseTo(ASSET_SPECS.longsword.targetLength, 2);
    // The mesh's own anchor, measured: 156.6 mm from the butt of a 1050.0 mm blade.
    expect(fraction).toBeCloseTo(0.149, 2);
  }, 30_000);

  it("holds the staff at its own midpoint, not at the declared grip fraction", async () => {
    // An audit pass noticed that centerStaffVisual seats the prepared BOUNDS MIDPOINT,
    // which cancels ASSET_SPECS.staff.gripFraction: editing that value moves nothing on
    // screen. True, and left alone on purpose. Seating the prepared anchor instead was
    // tried and reverted -- that anchor is 35 mm off this mesh's midpoint, so it hangs
    // the staff 70 mm out of balance and fails the 1e-6 balance proof over 1900+ samples
    // in scripts/verify-weapon-lab-staff.mjs. A quarterstaff held off centre is wrong.
    // This test pins the behaviour that proof depends on, so the cancellation cannot be
    // "fixed" again without someone reading why.
    const actor = await create({ loadoutId: "staff" });
    actor.sample("ProMagic__StandingIdle", 0.4);
    const { fraction, lengthMetres } = gripAlongPrimary(actor);
    expect(lengthMetres).toBeCloseTo(ASSET_SPECS.staff.targetLength, 2);
    // held at the middle, whatever the catalog's 0.52 says
    expect(fraction).toBeCloseTo(0.5, 2);
    expect(fraction).not.toBeCloseTo(ASSET_SPECS.staff.gripFraction, 3);
  }, 30_000);

  it("gives the staff its own finger curl, at the measured anatomical closed fist", async () => {
    // Split out of FITTED_HAND_GRIP so a shortsword or mace change cannot move it.
    // The values are the shipped ones on purpose: applyHandOverlay spends
    // [1.2, 1.2, 1.0] x this angle across the three phalanges, so 1.2 is already a
    // closed fist (82/82/69 deg) and ~1.35 is the anatomical ceiling. Past that the
    // finger wraps more than a full turn instead of closing on the shaft.
    expect(LOADOUT_GRIP_PRESETS.staff.right).toBe(STAFF_HAND_GRIP);
    expect(LOADOUT_GRIP_PRESETS.staff.left).toBe(STAFF_HAND_GRIP);
    for (const finger of ["Index", "Middle", "Ring", "Pinky"]) {
      expect(STAFF_HAND_GRIP[finger], finger).toBeLessThanOrEqual(1.35);
    }
    const actor = await create({ loadoutId: "staff" });
    actor.sample("ProMagic__StandingIdle", 0.4);
    // A 33 mm shaft is held by the middle phalanges, not the fingertips. All four
    // of them stay on the wood.
    for (const finger of ["Index", "Middle", "Ring", "Pinky"]) {
      expect(millimetresToPrimaryMesh(actor, `RightHand${finger}2`), finger).toBeLessThan(25);
    }
  }, 30_000);

  it("carries the quiver sling over the shoulder instead of through it, on every drawn clip", async () => {
    // The Mixamo shoulder bone is the clavicle root beside the neck. Routing the
    // sling over it alone left the strap inside the shipped 65 mm proxy sphere on
    // every drawn clip: the audit measured -20.5 to -25.4 mm of intrusion there.
    const actor = await create({ loadoutId: "bow", includeSourceResponses: true });
    for (const name of ["ProLongbow__StandingAimOverdraw", "ProLongbow__StandingAimRecoil",
      BOW_RELEASE_NAME, "ProLongbow__StandingIdle01", "ProLongbow__StandingDeathForward01"]) {
      const duration = actor.clips.get(name).duration;
      for (const phase of [0, 0.13, 0.37, 0.61, 0.89, 1]) {
        actor.sample(name, duration * phase);
        expect(actor.reviewTools.minimumHarnessBodyClearance(actor), `${name}@${phase}`).toBeGreaterThanOrEqual(0);
      }
    }
  }, 30_000);
});
