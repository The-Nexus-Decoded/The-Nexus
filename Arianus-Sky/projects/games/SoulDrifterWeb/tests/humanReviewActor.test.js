import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createHumanReviewActorFactory, findBone } from "../src/review/weapon-lab/human-review-actor.js";
import { LOADOUTS, URLS, BOW_RELEASE_NAME, BOW_TRIPLE_SHOT_NAME, GREATSWORD_TWO_HAND_SHEATHE_NAME } from "../src/review/weapon-lab/human-review-catalog.js";

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
});
