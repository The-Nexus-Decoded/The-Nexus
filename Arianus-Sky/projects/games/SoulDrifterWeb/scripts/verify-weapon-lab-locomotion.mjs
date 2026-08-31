import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const game = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(new URL('../tests/fixtures/weapon-lab-baseline.json', import.meta.url), 'utf8'));

globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, init) { Object.assign(this, { type }, init); } };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const originalPath = `${game}/public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb`;
const originalBytes = await readFile(originalPath);
assert.equal(sha(originalBytes), baseline.originalLibrarySha256, 'Original library changed');
const extraBytes = await readFile(new URL('../public/assets/weapon-lab/locomotion-extras/locomotion-extras.glb', import.meta.url));
assert.equal(sha(extraBytes), baseline.locomotionExtrasSha256, 'Locomotion source export changed');
const doc = (b) => JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
const originalDoc = doc(originalBytes), extraDoc = doc(extraBytes);
assert.equal(originalDoc.animations.length, 400);
assert.equal(extraDoc.animations.length, 5);
assert.equal(extraDoc.meshes?.length ?? 0, 0);
// Exact exported node hierarchy and rest transforms, not just matching bone names.
assert.deepEqual(extraDoc.nodes, originalDoc.nodes);
const expected = ['InjuredRun', 'SlowRun', 'RunningLeaningBackOrForth', 'RunningUpStairs', 'WalkingUpTheStairs'].map(n => `MaleLocomotion__${n}`);
assert.deepEqual(extraDoc.animations.map(a => a.name).sort(), [...expected].sort());
const allNames = [...originalDoc.animations, ...extraDoc.animations].map(a => a.name);
assert.equal(new Set(allNames).size, 405);
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const library = await new GLTFLoader().parseAsync(ab(extraBytes), '');
const sourceHashes = library.animations.map(c => sha(JSON.stringify(THREE.AnimationClip.toJSON(c))));
const mixer = new THREE.AnimationMixer(library.scene);
const bones = []; library.scene.traverse(o => { if (o.name.startsWith('mixamorig')) bones.push(o); });
assert.equal(bones.length, 65);
const rows = [];
for (const clip of library.animations) {
  assert(clip.validate()); assert(clip.duration > 0);
  const targetNames = new Set(bones.map(b => b.name));
  for (const track of clip.tracks) {
    assert(targetNames.has(track.name.split('.')[0]), `Missing binding ${track.name}`);
    assert([...track.times, ...track.values].every(Number.isFinite));
  }
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).play(); action.paused = true;
  const poses = [];
  for (let i = 0; i <= 30; i++) {
    action.time = clip.duration * i / 30; mixer.update(0); library.scene.updateMatrixWorld(true);
    assert(bones.every(b => b.matrixWorld.elements.every(Number.isFinite)));
    const hips = bones.find(b => b.name.endsWith('Hips'));
    poses.push(hips.getWorldPosition(new THREE.Vector3()).toArray());
  }
  const hips = clip.tracks.find(t => /Hips\.position$/.test(t.name));
  assert(hips);
  const first = [...hips.values.slice(0, 3)], last = [...hips.values.slice(-3)];
  rows.push({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length, sampledPoses: poses.length, rootTravel: last.map((v, i) => v - first[i]), rootRange: [0, 1, 2].map(axis => { const v = [...hips.values].filter((_, i) => i % 3 === axis); return Math.max(...v) - Math.min(...v); }) });
}
assert.deepEqual(library.animations.map(c => sha(JSON.stringify(THREE.AnimationClip.toJSON(c)))), sourceHashes);
const report = { originalClips: 400, addedClips: 5, originalSha256: sha(originalBytes), addendumSha256: sha(extraBytes), exactRestHierarchyMatch: true, meshes: 0, rows, limits: ['Numerical validation is not visual acceptance.', 'Stair geometry, navigation, root-motion consumption and armed carry composition require dungeon integration.'] };
await mkdir(new URL('../node_modules/.cache/weapon-lab-qa/locomotion-extras/', import.meta.url), { recursive: true });
await writeFile(new URL('../node_modules/.cache/weapon-lab-qa/locomotion-extras/numerical-proof.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
