import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { parseGlb } from "./replace-glb-animation.mjs";

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init) { Object.assign(this, { type }, init); }
};

function argument(name) {
  const index = process.argv.indexOf(name);
  assert(index >= 0 && process.argv[index + 1], `Missing ${name}`);
  return path.resolve(process.argv[index + 1]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readAccessor(glb, index) {
  const accessor = glb.json.accessors[index];
  const view = glb.json.bufferViews[accessor.bufferView];
  assert.equal(accessor.componentType, 5126, `Accessor ${index} must use float32`);
  assert.equal(accessor.type, "SCALAR", `Accessor ${index} must be scalar time data`);
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 4;
  return Array.from({ length: accessor.count }, (_, sample) => glb.bin.readFloatLE(offset + sample * stride));
}

async function loadReviewGlb(glb) {
  const json = structuredClone(glb.json);
  json.buffers[0].uri = `data:application/octet-stream;base64,${glb.bin.toString("base64")}`;
  json.materials = [{}];
  delete json.textures;
  delete json.images;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) primitive.material = 0;
  }
  return new GLTFLoader().parseAsync(JSON.stringify(json), "");
}

function preciseBounds(scene) {
  return new THREE.Box3().setFromObject(scene, true);
}

function worldPoint(object, target = new THREE.Vector3()) {
  return object.getWorldPosition(target);
}

function torsoClearance(scene, floor) {
  const allowed = new Set(["pelvis", "spine", "chest"]);
  const heights = [];
  const point = new THREE.Vector3();
  scene.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const skinIndex = node.geometry.attributes.skinIndex;
    const skinWeight = node.geometry.attributes.skinWeight;
    const position = node.geometry.attributes.position;
    assert(skinIndex && skinWeight && position, `${node.name}: incomplete skin data`);
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      let dominantSlot = 0;
      for (let slot = 1; slot < skinWeight.itemSize; slot += 1) {
        if (skinWeight.getComponent(vertex, slot) > skinWeight.getComponent(vertex, dominantSlot)) dominantSlot = slot;
      }
      const bone = node.skeleton.bones[skinIndex.getComponent(vertex, dominantSlot)];
      if (!bone || !allowed.has(bone.name)) continue;
      node.getVertexPosition(vertex, point).applyMatrix4(node.matrixWorld);
      heights.push(point.y);
    }
  });
  assert(heights.length > 1000, "Could not identify the Warden torso surface");
  heights.sort((a, b) => a - b);
  const midpoint = Math.floor(heights.length / 2);
  const medianHeight = heights.length % 2 === 0
    ? (heights[midpoint - 1] + heights[midpoint]) / 2
    : heights[midpoint];
  return {
    vertices: heights.length,
    minimumMeters: heights[0] - floor,
    percentile05Meters: heights[Math.max(0, Math.floor(heights.length * 0.05) - 1)] - floor,
    medianMeters: medianHeight - floor,
    centroidMeters: heights.reduce((sum, height) => sum + height, 0) / heights.length - floor,
    maximumMeters: heights.at(-1) - floor,
    heightMeters: heights.at(-1) - heights[0],
  };
}

const sourcePath = argument("--source");
const candidatePath = argument("--candidate");
const planPath = argument("--plan");
const reportPath = argument("--report");
const expectedSourceSha = process.argv[process.argv.indexOf("--source-sha256") + 1]?.toLowerCase();
const expectedCandidateSha = process.argv[process.argv.indexOf("--candidate-sha256") + 1]?.toLowerCase();
assert(expectedSourceSha && expectedCandidateSha, "Pinned source and candidate SHA-256 values are required");

const [sourceBytes, candidateBytes, planBytes] = await Promise.all([
  readFile(sourcePath), readFile(candidatePath), readFile(planPath),
]);
assert.equal(sha256(sourceBytes), expectedSourceSha, "Pinned Warden source changed");
assert.equal(sha256(candidateBytes), expectedCandidateSha, "Pinned Warden candidate changed");
const source = parseGlb(sourcePath);
const candidate = parseGlb(candidatePath);
const plan = JSON.parse(planBytes);

const protectedKeys = [
  "asset", "scene", "scenes", "nodes", "meshes", "skins", "materials", "textures", "samplers", "images",
  "extensionsUsed", "extensionsRequired",
];
for (const key of protectedKeys) assert.deepEqual(candidate.json[key], source.json[key], `Protected GLB field changed: ${key}`);
assert.deepEqual(candidate.json.accessors.slice(0, source.json.accessors.length), source.json.accessors, "Source accessors changed");
assert.deepEqual(candidate.json.bufferViews.slice(0, source.json.bufferViews.length), source.json.bufferViews, "Source buffer views changed");
assert(candidate.bin.subarray(0, source.bin.length).equals(source.bin), "Source binary prefix changed");
assert.deepEqual(
  candidate.json.asset?.extras?.wardenAuthoringSocketRepair,
  source.json.asset?.extras?.wardenAuthoringSocketRepair,
  "Owned Warden authoring receipt changed",
);

const expectedAnimations = [...new Set([
  ...(source.json.animations ?? []).map(({ name }) => name),
  ...plan.clips.map(({ name }) => name),
])].sort();
const actualAnimations = (candidate.json.animations ?? []).map(({ name }) => name).sort();
assert.deepEqual(actualAnimations, expectedAnimations, "Warden action inventory changed unexpectedly");

for (const clip of plan.clips) {
  const animation = candidate.json.animations.find(({ name }) => name === clip.name);
  assert(animation, `Missing planned Warden clip ${clip.name}`);
  const expectedCount = clip.durationFrames;
  const expectedStart = 1 / plan.fps;
  const expectedDuration = clip.durationFrames / plan.fps;
  const inputs = [...new Set(animation.samplers.map(({ input }) => input))];
  let denseInputs = 0;
  for (const input of inputs) {
    const times = readAccessor(candidate, input);
    if (times.length === expectedCount) denseInputs += 1;
    assert(times.length >= 2, `${clip.name}: undersampled animation channel`);
    assert(Math.abs(times[0] - expectedStart) <= 1e-5, `${clip.name}: unexpected first sample time`);
    assert(Math.abs(times.at(-1) - expectedDuration) <= 1e-4, `${clip.name}: duration changed`);
    for (let index = 1; index < times.length; index += 1) {
      assert(times[index] > times[index - 1], `${clip.name}: non-increasing sample time`);
    }
  }
  assert(denseInputs > 0, `${clip.name}: no 30 Hz baked channel was retained`);
}

const gltf = await loadReviewGlb(candidate);
const scene = gltf.scene;
scene.updateMatrixWorld(true);
const skinnedMeshes = [];
const bones = new Map();
scene.traverse((node) => {
  if (node.isSkinnedMesh) skinnedMeshes.push(node);
  if (node.isBone) bones.set(node.name, node);
});
assert.equal(skinnedMeshes.length, 4, "Warden must retain four skinned mechanical meshes");
assert.deepEqual([...bones.keys()].sort(), [...plan.boneContract].sort(), "Warden bone contract changed");
const receipt = candidate.json.asset.extras.wardenAuthoringSocketRepair;
assert.equal(receipt.sockets.length, 5, "Warden authoring socket receipt is incomplete");

const restBounds = preciseBounds(scene);
const restFloor = restBounds.min.y;
const restHeight = restBounds.max.y - restBounds.min.y;
const restTorso = torsoClearance(scene, restFloor);
const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
const mixer = new THREE.AnimationMixer(scene);
const clipRows = [];
for (const planned of plan.clips) {
  const clip = clips.get(planned.name);
  assert(clip && clip.validate(), `${planned.name}: Three.js rejected the clip`);
  for (const track of clip.tracks.filter(({ name }) => name.endsWith(".scale"))) {
    for (const value of track.values) assert(Math.abs(value - 1) <= 2e-6, `${planned.name}: animated scale drift`);
  }
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  let minimumFloorClearance = Infinity;
  let maximumFloorClearance = -Infinity;
  let maximumSurfaceX = -Infinity;
  let maximumLeftHandForward = -Infinity;
  const sampleCount = Math.ceil(clip.duration * 240);
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    const time = Math.min(clip.duration, sample / 240);
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
    const bounds = preciseBounds(scene);
    const clearance = bounds.min.y - restFloor;
    minimumFloorClearance = Math.min(minimumFloorClearance, clearance);
    maximumFloorClearance = Math.max(maximumFloorClearance, clearance);
    maximumSurfaceX = Math.max(maximumSurfaceX, bounds.max.x);
    maximumLeftHandForward = Math.max(
      maximumLeftHandForward,
      worldPoint(bones.get("hand_L")).x - worldPoint(bones.get("root")).x,
    );
  }
  console.log(`WARDEN_DENSE_CLIP=${JSON.stringify({ name: planned.name, minimumFloorClearance, maximumFloorClearance })}`);
  assert(minimumFloorClearance >= -0.0005, `${planned.name}: penetrates the review floor by ${minimumFloorClearance}m`);
  assert(maximumFloorClearance <= 0.003, `${planned.name}: loses all floor contact by ${maximumFloorClearance}m`);
  clipRows.push({
    name: planned.name,
    durationSeconds: clip.duration,
    denseReplayHz: 240,
    denseSamples: sampleCount + 1,
    minimumFloorClearance,
    maximumFloorClearance,
    maximumSurfaceX,
    maximumLeftHandForward,
  });
}

const byName = new Map(clipRows.map((row) => [row.name, row]));
assert(byName.get("BladeSweep").maximumSurfaceX > 0.7, "BladeSweep does not reach the next-square review region");
assert(byName.get("CinderSweep").maximumSurfaceX > 1.0, "CinderSweep does not reach the next-square review region");
assert(byName.get("PalmFire").maximumLeftHandForward > 0.25, "PalmFire hand never projects forward");
assert(byName.get("SoulTax").maximumLeftHandForward > 0.28, "SoulTax hand never projects forward");

mixer.stopAllAction();
const death = clips.get("DeathCollapse");
const deathAction = mixer.clipAction(death).setLoop(THREE.LoopOnce, 1);
deathAction.clampWhenFinished = true;
deathAction.play();
mixer.setTime(death.duration);
scene.updateMatrixWorld(true);
const deathBounds = preciseBounds(scene);
const deathHeight = deathBounds.max.y - deathBounds.min.y;
const deathTorso = torsoClearance(scene, restFloor);
console.log(`WARDEN_DEATH_FINAL=${JSON.stringify({ restHeight, deathHeight, restTorso, torso: deathTorso })}`);
assert(deathTorso.medianMeters < restTorso.medianMeters * 0.65, "DeathCollapse torso median remains too upright");
assert(deathTorso.centroidMeters < restTorso.centroidMeters * 0.65, "DeathCollapse torso centroid remains too upright");
assert(deathTorso.minimumMeters <= 0.1, "DeathCollapse torso never settles near the floor");
assert(deathTorso.percentile05Meters <= 0.2, "DeathCollapse torso mass remains suspended");

const report = {
  status: "verified-review-intake-not-gameplay-approval",
  source: { path: sourcePath, bytes: sourceBytes.length, sha256: expectedSourceSha },
  candidate: { path: candidatePath, bytes: candidateBytes.length, sha256: expectedCandidateSha },
  plan: { path: planPath, sha256: sha256(planBytes), fps: plan.fps },
  integrity: {
    protectedKeys,
    sourceAccessorPrefix: source.json.accessors.length,
    sourceBufferViewPrefix: source.json.bufferViews.length,
    sourceBinaryPrefixBytes: source.bin.length,
    skinnedMeshes: skinnedMeshes.map(({ name }) => name).sort(),
    bones: [...bones.keys()].sort(),
    authoringSockets: receipt.sockets.length,
  },
  replay: clipRows,
  deathFinal: { restHeight, deathHeight, restTorso, torso: deathTorso },
};
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`WARDEN_MOTION_V2_VERIFIED=${reportPath}`);
