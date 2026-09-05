/**
 * Test fixture: a minimal GLB reader plus forward kinematics on the shipped
 * human-foundation rig.
 *
 * The uniform-proportion tests measure against the REAL assets rather than a
 * synthetic skeleton, because every constant the design ships was derived from
 * them and a synthetic rig would only re-assert the constants back at itself.
 */

/**
 * Node's fs is reached through a typed dynamic import, matching the pattern the
 * rest of this suite uses (see combatReviewContact.test.ts) — the project has no
 * @types/node, so a static `import ... from "node:fs"` would not typecheck.
 */
const importNode = <T>(specifier: string): Promise<T> => import(/* @vite-ignore */ specifier);
const { readFileSync } = await importNode<{ readFileSync(path: URL | string): Uint8Array }>("node:fs");

export const BODY_URL = new URL(
  "../../public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb",
  import.meta.url,
);
export const LIBRARY_URL = new URL(
  "../../public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
  import.meta.url,
);

export const MIXAMO = "mixamorig:";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface GltfNode {
  name?: string;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  mesh?: number;
}
export interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT4";
}
export interface GltfAnimation {
  name: string;
  channels: { sampler: number; target: { node: number; path: string } }[];
  samplers: { input: number; output: number; interpolation?: string }[];
}
export interface GltfJson {
  nodes: GltfNode[];
  skins?: { joints: number[] }[];
  accessors?: GltfAccessor[];
  bufferViews?: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  animations?: GltfAnimation[];
  meshes?: { primitives: { attributes: Record<string, number> }[] }[];
}

export interface Glb {
  json: GltfJson;
  bin: DataView;
  bytes: number;
}

export function readGlb(url: URL): Glb {
  const bytes = readFileSync(url);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  let offset = 12;
  let json: GltfJson | null = null;
  let bin: DataView | null = null;
  while (offset < bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === 0x4e4f534a) {
      const text = new TextDecoder().decode(bytes.subarray(start, start + length)).replace(/\0+$/g, "");
      json = JSON.parse(text) as GltfJson;
    } else if (type === 0x004e4942) {
      bin = new DataView(bytes.buffer, bytes.byteOffset + start, length);
    }
    offset = start + length;
    if (offset % 4) offset += 4 - (offset % 4);
  }
  if (!json || !bin) throw new Error("GLB missing JSON or BIN chunk");
  return { json, bin, bytes: bytes.byteLength };
}

const COMPONENT_SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readAccessor(glb: Glb, index: number): Float64Array {
  const accessor = glb.json.accessors?.[index];
  if (!accessor) throw new Error(`no accessor ${index}`);
  const components = TYPE_COUNT[accessor.type] ?? 1;
  const size = COMPONENT_SIZE[accessor.componentType] ?? 4;
  const out = new Float64Array(accessor.count * components);
  if (accessor.bufferView === undefined) return out;
  const view = glb.json.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`no bufferView ${accessor.bufferView}`);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? components * size;
  for (let i = 0; i < accessor.count; i += 1) {
    for (let c = 0; c < components; c += 1) {
      const at = base + i * stride + c * size;
      let value: number;
      switch (accessor.componentType) {
        case 5126: value = glb.bin.getFloat32(at, true); break;
        case 5125: value = glb.bin.getUint32(at, true); break;
        case 5123: value = glb.bin.getUint16(at, true); break;
        case 5122: value = glb.bin.getInt16(at, true); break;
        case 5121: value = glb.bin.getUint8(at); break;
        case 5120: value = glb.bin.getInt8(at); break;
        default: throw new Error(`component type ${accessor.componentType}`);
      }
      out[i * components + c] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// maths
// ---------------------------------------------------------------------------

export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatRotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let end: Quat = b;
  if (dot < 0) { end = [-b[0], -b[1], -b[2], -b[3]]; dot = -dot; }
  if (dot > 0.9995) {
    const out: Quat = [
      a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t,
      a[2] + (end[2] - a[2]) * t, a[3] + (end[3] - a[3]) * t,
    ];
    const n = Math.hypot(out[0], out[1], out[2], out[3]);
    return [out[0] / n, out[1] / n, out[2] / n, out[3] / n];
  }
  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const s0 = Math.sin(theta0 - theta) / Math.sin(theta0);
  const s1 = Math.sin(theta) / Math.sin(theta0);
  return [
    a[0] * s0 + end[0] * s1, a[1] * s0 + end[1] * s1,
    a[2] * s0 + end[2] * s1, a[3] * s0 + end[3] * s1,
  ];
}

// ---------------------------------------------------------------------------
// rig
// ---------------------------------------------------------------------------

export interface Local { t: Vec3; q: Quat; s: Vec3 }
export interface World { t: Vec3; q: Quat; s: Vec3 }

export interface Rig {
  glb: Glb;
  nodes: GltfNode[];
  parent: number[];
  order: number[];
  byName: Map<string, number>;
  jointNodes: number[];
}

export function loadRig(url: URL = BODY_URL): Rig {
  const glb = readGlb(url);
  const nodes = glb.json.nodes;
  const parent = new Array<number>(nodes.length).fill(-1);
  nodes.forEach((node, index) => { for (const child of node.children ?? []) parent[child] = index; });
  const order: number[] = [];
  const seen = new Set<number>();
  const visit = (i: number): void => {
    if (seen.has(i)) return;
    const p = parent[i] ?? -1;
    if (p >= 0) visit(p);
    seen.add(i); order.push(i);
  };
  for (let i = 0; i < nodes.length; i += 1) visit(i);
  const byName = new Map<string, number>();
  nodes.forEach((node, index) => { if (node.name) byName.set(node.name, index); });
  return { glb, nodes, parent, order, byName, jointNodes: glb.json.skins?.[0]?.joints ?? [] };
}

export function restLocals(rig: Rig): Local[] {
  return rig.nodes.map((node) => ({
    t: [node.translation?.[0] ?? 0, node.translation?.[1] ?? 0, node.translation?.[2] ?? 0] as Vec3,
    q: [node.rotation?.[0] ?? 0, node.rotation?.[1] ?? 0, node.rotation?.[2] ?? 0, node.rotation?.[3] ?? 1] as Quat,
    // 44 of the shipped body's 67 nodes carry float32 scale noise around 1 (the
    // worst is LeftUpLeg at [1.0000076, 0.9999998, 1.0000197]). three.js applies
    // node scale, so the fixture must too or it disagrees with the runtime by
    // ~2e-7 rig units.
    s: [node.scale?.[0] ?? 1, node.scale?.[1] ?? 1, node.scale?.[2] ?? 1] as Vec3,
  }));
}

export function forwardKinematics(rig: Rig, locals: Local[]): World[] {
  const world = new Array<World | null>(rig.nodes.length).fill(null);
  for (const i of rig.order) {
    const local = locals[i];
    if (!local) continue;
    const p = rig.parent[i] ?? -1;
    const parentWorld = p >= 0 ? world[p] : null;
    if (!parentWorld) {
      world[i] = { t: [...local.t] as Vec3, q: [...local.q] as Quat, s: [...local.s] as Vec3 };
    } else {
      const scaled: Vec3 = [
        local.t[0] * parentWorld.s[0], local.t[1] * parentWorld.s[1], local.t[2] * parentWorld.s[2],
      ];
      const rotated = quatRotate(parentWorld.q, scaled);
      world[i] = {
        t: [parentWorld.t[0] + rotated[0], parentWorld.t[1] + rotated[1], parentWorld.t[2] + rotated[2]],
        q: quatMultiply(parentWorld.q, local.q),
        s: [parentWorld.s[0] * local.s[0], parentWorld.s[1] * local.s[1], parentWorld.s[2] * local.s[2]],
      };
    }
  }
  return world as World[];
}

export const SOLE_NODE_NAMES = [
  "LeftFoot", "LeftToeBase", "LeftToe_End", "RightFoot", "RightToeBase", "RightToe_End",
].map((n) => MIXAMO + n);

export function worldY(rig: Rig, world: World[], name: string): number {
  const index = rig.byName.get(name);
  if (index === undefined) throw new Error(`no node ${name}`);
  return world[index]?.t[1] ?? 0;
}

export function lowestSoleY(rig: Rig, world: World[]): number {
  let lowest = Infinity;
  for (const name of SOLE_NODE_NAMES) lowest = Math.min(lowest, worldY(rig, world, name));
  return lowest;
}

// ---------------------------------------------------------------------------
// animation library
// ---------------------------------------------------------------------------

export interface ClipTracks {
  rotation: Map<string, { input: number; output: number }>;
  hips: { input: number; output: number } | null;
}

export interface Library {
  glb: Glb;
  clips: Map<string, ClipTracks>;
  accessor: (index: number) => Float64Array;
}

export function loadLibrary(): Library {
  const glb = readGlb(LIBRARY_URL);
  const cache = new Map<number, Float64Array>();
  const accessor = (index: number): Float64Array => {
    let value = cache.get(index);
    if (!value) { value = readAccessor(glb, index); cache.set(index, value); }
    return value;
  };
  const clips = new Map<string, ClipTracks>();
  for (const animation of glb.json.animations ?? []) {
    const rotation = new Map<string, { input: number; output: number }>();
    let hips: { input: number; output: number } | null = null;
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.sampler];
      if (!sampler) continue;
      const name = glb.json.nodes[channel.target.node]?.name ?? "";
      if (channel.target.path === "rotation") rotation.set(name, { input: sampler.input, output: sampler.output });
      else if (channel.target.path === "translation" && name === `${MIXAMO}Hips`) {
        hips = { input: sampler.input, output: sampler.output };
      }
    }
    clips.set(animation.name, { rotation, hips });
  }
  return { glb, clips, accessor };
}

export function clipDuration(library: Library, name: string): number {
  const clip = library.clips.get(name);
  if (!clip) throw new Error(`no clip ${name}`);
  let duration = 0;
  for (const track of clip.rotation.values()) {
    const times = library.accessor(track.input);
    duration = Math.max(duration, times[times.length - 1] ?? 0);
  }
  if (clip.hips) {
    const times = library.accessor(clip.hips.input);
    duration = Math.max(duration, times[times.length - 1] ?? 0);
  }
  return duration;
}

function keyAt(times: Float64Array, t: number): [number, number, number] {
  const last = times.length - 1;
  if (t <= (times[0] ?? 0)) return [0, 0, 0];
  if (t >= (times[last] ?? 0)) return [last, last, 0];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? 0) <= t) lo = mid; else hi = mid;
  }
  const a = times[lo] ?? 0;
  const b = times[hi] ?? 0;
  return [lo, hi, b > a ? (t - a) / (b - a) : 0];
}

export function sampleQuat(library: Library, track: { input: number; output: number }, t: number): Quat {
  const times = library.accessor(track.input);
  const values = library.accessor(track.output);
  const [i, j, f] = keyAt(times, t);
  const a: Quat = [values[i * 4] ?? 0, values[i * 4 + 1] ?? 0, values[i * 4 + 2] ?? 0, values[i * 4 + 3] ?? 1];
  if (i === j || f === 0) return a;
  const b: Quat = [values[j * 4] ?? 0, values[j * 4 + 1] ?? 0, values[j * 4 + 2] ?? 0, values[j * 4 + 3] ?? 1];
  return slerp(a, b, f);
}

export function sampleVec3(library: Library, track: { input: number; output: number }, t: number): Vec3 {
  const times = library.accessor(track.input);
  const values = library.accessor(track.output);
  const [i, j, f] = keyAt(times, t);
  const a: Vec3 = [values[i * 3] ?? 0, values[i * 3 + 1] ?? 0, values[i * 3 + 2] ?? 0];
  if (i === j || f === 0) return a;
  const b: Vec3 = [values[j * 3] ?? 0, values[j * 3 + 1] ?? 0, values[j * 3 + 2] ?? 0];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export interface PoseOptions {
  /** Node name -> replacement local rest translation (the proportion profile). */
  restOverride?: Map<string, Vec3> | undefined;
  /** Multiplier on the sampled hips translation. */
  hipsScale?: number | undefined;
  /** World-up correction in rig units, applied along the hips-local up axis (z, negative). */
  groundCorrection?: number | undefined;
}

/** Pose the rig with a clip and return world transforms for every node. */
export function poseRig(
  rig: Rig,
  library: Library,
  clipName: string,
  t: number,
  options: PoseOptions = {},
): World[] {
  const clip = library.clips.get(clipName);
  if (!clip) throw new Error(`no clip ${clipName}`);
  const locals = restLocals(rig);
  if (options.restOverride) {
    for (const [name, translation] of options.restOverride) {
      const index = rig.byName.get(name);
      const local = index === undefined ? undefined : locals[index];
      if (local) local.t = [...translation] as Vec3;
    }
  }
  for (const [name, track] of clip.rotation) {
    const index = rig.byName.get(name);
    const local = index === undefined ? undefined : locals[index];
    if (local) local.q = sampleQuat(library, track, t);
  }
  if (clip.hips) {
    const index = rig.byName.get(`${MIXAMO}Hips`);
    const local = index === undefined ? undefined : locals[index];
    if (local) {
      const scale = options.hipsScale ?? 1;
      const sampled = sampleVec3(library, clip.hips, t);
      local.t = [sampled[0] * scale, sampled[1] * scale, sampled[2] * scale];
      // hips-local up axis is z with a negative sign (verified in the contract)
      local.t[2] += -1 * (options.groundCorrection ?? 0);
    }
  }
  return forwardKinematics(rig, locals);
}

/** Local quaternions for the eleven ground-solver joints, packed x,y,z,w. */
export function packGroundQuaternions(
  rig: Rig,
  library: Library,
  clipName: string,
  t: number,
  solverJoints: readonly string[],
): Float64Array {
  const clip = library.clips.get(clipName);
  if (!clip) throw new Error(`no clip ${clipName}`);
  const out = new Float64Array(solverJoints.length * 4);
  for (let i = 0; i < solverJoints.length; i += 1) {
    const name = MIXAMO + (solverJoints[i] ?? "");
    const track = clip.rotation.get(name);
    const q: Quat = track
      ? sampleQuat(library, track, t)
      : (() => {
        const index = rig.byName.get(name);
        const node = index === undefined ? undefined : rig.nodes[index];
        return [node?.rotation?.[0] ?? 0, node?.rotation?.[1] ?? 0, node?.rotation?.[2] ?? 0, node?.rotation?.[3] ?? 1] as Quat;
      })();
    out[i * 4] = q[0]; out[i * 4 + 1] = q[1]; out[i * 4 + 2] = q[2]; out[i * 4 + 3] = q[3];
  }
  return out;
}
