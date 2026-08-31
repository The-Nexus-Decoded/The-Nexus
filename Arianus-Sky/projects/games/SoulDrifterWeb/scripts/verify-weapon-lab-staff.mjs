import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as helper from '../src/review/weapon-lab/staff-grip.js';
import * as locomotion from '../src/review/weapon-lab/weapon-locomotion.js';
import * as moves from '../src/review/weapon-lab/staff-moves.js';
import { createHash } from 'node:crypto';

const game = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(new URL('../tests/fixtures/weapon-lab-baseline.json', import.meta.url), 'utf8'));

globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, init) { Object.assign(this, { type }, init); } };
async function loadRig(path) {
  const glb = await readFile(path);
  const size = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + size).toString());
  const binaryStart = 20 + size;
  const binary = glb.subarray(binaryStart + 8, binaryStart + 8 + glb.readUInt32LE(binaryStart));
  json.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString('base64')}`;
  json.materials = [{}];
  delete json.textures; delete json.images;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) primitive.material = 0;
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}
const bodyPath = `${game}/public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb`;
const clipPath = `${game}/public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb`;
const hashFile = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
assert.equal(await hashFile(bodyPath), baseline.bodySha256, 'Canonical body changed');
assert.equal(await hashFile(clipPath), baseline.originalLibrarySha256, 'Original 400-clip library changed');
const [body, library] = await Promise.all([loadRig(bodyPath), loadRig(clipPath)]);
assert.equal(library.animations.length, baseline.originalClipCount);
const model = body.scene;
const bounds = new THREE.Box3().setFromObject(model, true);
model.scale.setScalar(2.06 / (bounds.max.y - bounds.min.y));
const bones = new Map(); model.traverse((o) => { if (o.isBone) bones.set(o.name, o); });
assert.equal(bones.size, baseline.bones, 'Canonical rig must retain all 65 bones');
const norm = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const findBone = (map, name) => [...map.values()].find((bone) => norm(bone.name) === norm(`mixamorig${name}`));
const mixer = new THREE.AnimationMixer(model);
const socket = new THREE.Group(); socket.scale.setScalar(1 / model.scale.x);
socket.position.set(0, 0.062 / model.scale.x, 0.03 / model.scale.x); socket.rotation.z = -Math.PI / 2;
findBone(bones, 'RightHand').add(socket);
// Deliberately asymmetric normalization matches the imported staff's 52% anchor.
const staffVisual = new THREE.Group();
const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.75, 0.06));
shaft.position.y = 1.75 * (0.5 - 0.52);
staffVisual.add(shaft); staffVisual.scale.set(0.5, 1, 0.5);
const preparedStaff = { visual: staffVisual.clone(true), normalizedBounds: new THREE.Box3().setFromObject(staffVisual, true) };
socket.add(staffVisual);
const actor = { model, bones, mixer, clips: new Map(library.animations.map((clip) => [clip.name, clip])), primary: { asset: 'staff', socket, visual: staffVisual, prepared: preparedStaff }, ikBase: new Map() };
const rows = [];
const balanceRows = [];
function assertStaffBalance(label, supportAlongShaft = 0) {
  model.updateMatrixWorld(true);
  // Independently measure the mesh vertices, not the helper's returned values.
  const points = shaft.geometry.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let index = 0; index < points.count; index++) {
    const point = socket.worldToLocal(shaft.localToWorld(new THREE.Vector3().fromBufferAttribute(points, index)));
    min = Math.min(min, point.y); max = Math.max(max, point.y);
  }
  const lowOverhang = Math.min(0, supportAlongShaft) - min;
  const highOverhang = max - Math.max(0, supportAlongShaft);
  const error = Math.abs(lowOverhang - highOverhang);
  assert(error < 1e-6, `${label}: unbalanced staff by ${error}m`);
  assert(Math.min(lowOverhang, highOverhang) > 0.1, `${label}: grip reached staff end`);
  assert(Math.abs(max - min - 1.75 * staffVisual.scale.y) < 1e-6, 'Changed staff length');
  balanceRows.push({ label, supportAlongShaft, lowOverhang, highOverhang, error });
}
const sha = (value) => createHash('sha256').update(value).digest('hex');
const sourceHashes = new Map(library.animations.map((clip) => [clip.name, sha(JSON.stringify(THREE.AnimationClip.toJSON(clip)))]));
const newClips = moves.buildStaffFightingClips(actor);
assert.equal(newClips.length, 6);
for (const clip of newClips) { assert(!actor.clips.has(clip.name)); assert(clip.validate()); actor.clips.set(clip.name, clip); }
const carryClips = locomotion.buildCarryLocomotionClips(actor.clips);
for (const clip of carryClips) {
  assert(clip.validate()); assert(!actor.clips.has(clip.name));
  const gait = actor.clips.get(clip.userData.sourceGait);
  assert.equal(clip.duration, gait.duration);
  for (const track of clip.tracks) {
    if (/mixamorig:?(Left|Right)(Shoulder|Arm|ForeArm|Hand)/i.test(track.name)) continue;
    const original = gait.tracks.find(t => t.name === track.name);
    assert.deepEqual(track.times, original.times);
    assert.deepEqual(track.values, original.values, `Changed gait ${track.name}`);
    assert.notEqual(track.values, original.values);
  }
  actor.clips.set(clip.name, clip);
}
const coverage = Object.keys(locomotion.LOCOMOTION_FAMILIES).map(loadout => ({ loadout, actions: locomotion.locomotionActions(loadout, actor.clips) }));
assert.equal(coverage.length, 10);
assert(coverage.every(({ actions }) => actions.some(([label]) => label.startsWith('Walk')) && actions.some(([label]) => label.startsWith('Run'))));
assert.throws(() => locomotion.locomotionActions('unknown', actor.clips));
assert.throws(() => locomotion.locomotionActions('bow', new Map()));
const newSource = (await readFile(new URL('../src/review/weapon-lab/weapon-lab.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
assert.match(newSource, /function applyTwoHandIK\(actor\) \{[\s\S]*?centerStaffVisual\(actor\);[\s\S]*?if \(!twoHandIKEnabled/);
const oldActions = baseline.originalActionsDeclaration;
const newActions = newSource.match(/const ACTIONS = \{[\s\S]*?\n\};/)[0];
assert.equal(newActions.replace(/^\s*\.\.\.STAFF_NEW_ACTIONS,\r?\n/m, ''), oldActions);
for (const action of [...oldActions.matchAll(/\["([^"]+)", "([^"]+)"\]/g)]) assert(newActions.includes(action[0]), `Removed action ${action[2]}`);
for (const [name, clip] of actor.clips) {
  if (!helper.staffUsesSupportHand(name) && !name.startsWith('ProMagic__')) continue;
  mixer.stopAllAction(); const action = mixer.clipAction(clip).play(); action.paused = true;
  for (const style of helper.staffUsesSupportHand(name) ? [{ name: 'palm', spread: 0, roll: 0 }, { name: 'wide', spread: 0.14, roll: 0 }, { name: 'reverse', spread: 0, roll: Math.PI }] : [{ name: 'caster', spread: 0, roll: 0 }]) {
  for (let frame = 0; frame <= 20; frame++) {
    for (const [bone, q] of actor.ikBase) bone.quaternion.copy(q); actor.ikBase.clear();
    action.time = frame / 20 * clip.duration; mixer.update(0); model.updateMatrixWorld(true);
    const before = new Map([...bones.values()].map((bone) => [bone, bone.quaternion.clone()]));
    helper.centerStaffVisual(actor);
    const fit = helper.staffUsesSupportHand(name) ? helper.fitStaffToSourceHands(actor, findBone, style) : null;
    if (fit) {
      assert(fit.supportRadialError < 0.003, `${name} ${style.name} frame ${frame} radial ${fit.supportRadialError}`);
      if (style.name === 'palm') assert(fit.wristPositionError < 1e-6);
      assert(fit.handSpacing > 0.1 && fit.handSpacing < 0.85);
      const allowed = style.name === 'palm' ? ['RightHand', 'LeftHand'] : ['RightHand', 'LeftHand', 'LeftArm', 'LeftForeArm'];
      for (const [bone, q] of before) if (!allowed.some((side) => bone === findBone(bones, side))) assert(q.equals(bone.quaternion), `Changed non-grip bone ${bone.name}`);
    } else {
      helper.fitCasterStaffHand(actor, findBone);
      for (const [bone, q] of before) if (bone !== findBone(bones, 'RightHand')) assert(q.equals(bone.quaternion), `Changed caster gesture ${bone.name}`);
    }
    assertStaffBalance(`${name} ${style.name} frame ${frame}`, fit?.supportAlongShaft ?? 0);
    rows.push({ name, frame, style: style.name, fit });
  }
  }
}
for (const [name, hash] of sourceHashes) assert.equal(sha(JSON.stringify(THREE.AnimationClip.toJSON(actor.clips.get(name)))), hash);
for (const clip of newClips) {
  mixer.stopAllAction(); const action = mixer.clipAction(clip).play(); action.paused = true;
  for (const time of [0, 0.3, 0.55, 0.75]) {
    for (let step = 0; step <= 10; step++) {
      for (const [bone, q] of actor.ikBase) bone.quaternion.copy(q); actor.ikBase.clear();
      action.time = time * clip.duration; mixer.update(0);
      const fit = helper.fitStaffToSourceHands(actor, findBone, { spread: 0.14 * (1 - step / 10), roll: Math.PI * step / 10 });
      assert(fit.supportRadialError < 0.003, `Grip transition ${clip.name} t=${time} step=${step}: ${fit.supportRadialError}`);
      assertStaffBalance(`transition ${clip.name} t=${time} step=${step}`, fit.supportAlongShaft);
      rows.push({ name: clip.name, time, transition: step / 10, fit });
    }
  }
}
// Scale changes, both shaft directions, repeated paused frames, then switching
// back to a single-hand action must never retain a two-hand mesh offset.
for (const scale of [0.75, 1, 1.5]) {
  staffVisual.scale.set(0.5 * scale, scale, 0.5 * scale);
  for (const spacing of [-0.55, 0, 0.55]) {
    for (let repeat = 0; repeat < 50; repeat++) helper.centerStaffVisual(actor, 0, spacing);
    assertStaffBalance(`scale ${scale} spacing ${spacing}`, spacing);
  }
  helper.centerStaffVisual(actor);
  assertStaffBalance(`single-hand reset scale ${scale}`);
}
staffVisual.scale.set(0.5, 1, 0.5);
for (const [bone, q] of actor.ikBase) bone.quaternion.copy(q); actor.ikBase.clear();
actor.primary.asset = 'mace'; socket.position.z = 0.018 / model.scale.x;
const maceVisualPosition = staffVisual.position.clone();
helper.centerStaffVisual(actor, 0, 0.6);
assert(staffVisual.position.equals(maceVisualPosition), 'Staff centering changed another weapon');
mixer.stopAllAction();
const maceAction = mixer.clipAction(actor.clips.get('ProMeleeAxe__StandingBlockIdle')).play(); maceAction.paused = true;
for (let frame = 0; frame <= 40; frame++) {
  for (const [bone, q] of actor.ikBase) bone.quaternion.copy(q); actor.ikBase.clear();
  maceAction.time = frame / 40 * maceAction.getClip().duration; mixer.update(0); model.updateMatrixWorld(true);
  const rightBefore = findBone(bones, 'RightHand').getWorldPosition(new THREE.Vector3());
  const fit = helper.fitMaceBlockSupport(actor, findBone);
  assert(fit.wristPositionError < 0.003, `Mace support gap ${fit.wristPositionError}`);
  assert(rightBefore.distanceTo(findBone(bones, 'RightHand').getWorldPosition(new THREE.Vector3())) < 1e-7);
  rows.push({ name: 'mace-block', frame, fit });
}
await mkdir(new URL('../node_modules/.cache/weapon-lab-qa/staff-grip-pass/', import.meta.url), { recursive: true });
await writeFile(new URL('../node_modules/.cache/weapon-lab-qa/staff-grip-pass/numerical-proof.json', import.meta.url), JSON.stringify({ sourceClips: library.animations.length, originalActionsPreserved: true, sourceClipsUnchanged: true, rows }, null, 2));
await writeFile(new URL('../node_modules/.cache/weapon-lab-qa/staff-grip-pass/authored-staff-clips.json', import.meta.url), JSON.stringify(newClips.map((clip) => THREE.AnimationClip.toJSON(clip))));
await writeFile(new URL('../node_modules/.cache/weapon-lab-qa/staff-grip-pass/staff-balance-proof.json', import.meta.url), JSON.stringify({ balancedSamples: balanceRows.length, maxBalanceError: Math.max(...balanceRows.map((row) => row.error)), rows: balanceRows }, null, 2));
console.log(JSON.stringify({ balancedSamples: balanceRows.length, maxBalanceError: Math.max(...balanceRows.map((row) => row.error)) }));
console.log(JSON.stringify({ frames: rows.length, sourceClips: library.animations.length, addedStaffClips: newClips.length, maxRadialError: Math.max(...rows.map((row) => row.fit?.supportRadialError ?? 0)), originalActionsPreserved: true, sourceClipsUnchanged: true }));
await mkdir(new URL('../node_modules/.cache/weapon-lab-qa/armed-locomotion/', import.meta.url), { recursive: true });
await writeFile(new URL('../node_modules/.cache/weapon-lab-qa/armed-locomotion/coverage.json', import.meta.url), JSON.stringify({ coverage, sourceClipsUnchanged: true, sharedGaitChannelsUnchanged: true, carryClips: carryClips.map(c => c.name) }, null, 2));
console.log(JSON.stringify({ armedLoadouts: 9, unarmedLoadouts: 1, coverage }));
