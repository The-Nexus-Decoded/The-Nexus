import fs from "node:fs";
import { createHash } from "node:crypto";
import { Vector3 } from "three";
import { parseGlb, encodeGlb } from "../replace-glb-animation.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const semantics = { POSITION: "position", NORMAL: "normal", TEXCOORD_0: "uv" };
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3 };
function accessor(source, id) {
  const a = source.json.accessors[id], view = source.json.bufferViews[a?.bufferView];
  const component = { 5125: [4, "readUInt32LE"], 5123: [2, "readUInt16LE"], 5126: [4, "readFloatLE"] }[a?.componentType];
  if (!a || !view || a.sparse || a.normalized || view.extensions || (view.buffer ?? 0) !== 0 || !component || !widths[a.type]) {
    throw new Error("Static prop reader requires uncompressed, non-normalized source accessors");
  }
  const width = widths[a.type], stride = view.byteStride ?? width * component[0];
  const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const length = (a.count - 1) * stride + width * component[0];
  if (![a.count, stride, offset, view.byteLength, a.byteOffset ?? 0, view.byteOffset ?? 0].every(Number.isSafeInteger)
    || a.count < 1 || stride < width * component[0] || offset < 0 || (a.byteOffset ?? 0) < 0 || (view.byteOffset ?? 0) < 0
    || (a.byteOffset ?? 0) + length > view.byteLength || offset + length > source.bin.length) {
    throw new Error("Static source accessor exceeds its buffer");
  }
  return Array.from({ length: a.count }, (_, index) => Array.from({ length: width }, (_, k) => {
    const value = source.bin[component[1]](offset + index * stride + k * component[0]);
    if (!Number.isFinite(value)) throw new Error("Nonfinite source attribute"); return value;
  }));
}

/** Current inherited chest/door adapter. Refuses rigs, transforms and multi-mesh
 * inputs instead of silently flattening an asset with a different contract.
 */
export function readStaticProp(sourcePath, expectedSha256) {
  const sha256 = hash(fs.readFileSync(sourcePath));
  if (!/^[a-f0-9]{64}$/.test(expectedSha256 ?? "") || sha256 !== expectedSha256) throw new Error("Static prop requires its pinned source SHA-256");
  const source = { ...parseGlb(sourcePath), sourcePath, sha256 };
  const j = source.json, node = j.nodes?.[0], primitive = j.meshes?.[0]?.primitives?.[0];
  if (!node || !primitive?.attributes || j.nodes?.length !== 1 || j.meshes?.length !== 1 || j.meshes[0].primitives.length !== 1 || node.mesh !== 0
    || node.matrix || node.translation || node.rotation || node.scale || node.children?.length || j.skins?.length || j.animations?.length
    || (primitive.mode ?? 4) !== 4 || Object.keys(primitive.attributes).some((key) => !semantics[key])) {
    throw new Error("Static prop requires one identity-transform mesh with no rig, animation or unknown attributes");
  }
  const values = Object.fromEntries(Object.entries(primitive.attributes).map(([key, id]) => [semantics[key], accessor(source, id)]));
  if (!values.position || !values.normal || !values.uv || new Set(Object.values(values).map((a) => a.length)).size !== 1) {
    throw new Error("Static prop requires matching position, normal and UV arrays");
  }
  if (values.position.some((v) => v.length !== 3) || values.normal.some((v) => v.length !== 3) || values.uv.some((v) => v.length !== 2)
    || source.json.accessors[primitive.indices]?.type !== "SCALAR" || !j.materials?.[primitive.material]) {
    throw new Error("Static prop requires VEC3 position/normal, VEC2 UV, scalar indices and an explicit source material");
  }
  const vertices = values.position.map((_, index) => ({ attributes: Object.fromEntries(Object.entries(values).map(([key, rows]) => [key, rows[index]])) }));
  const indices = accessor(source, primitive.indices).flat();
  if (indices.length % 3 || indices.some((index) => !Number.isInteger(index) || !vertices[index])) throw new Error("Invalid source triangle indices");
  const polygons = [];
  for (let i = 0; i < indices.length; i += 3) polygons.push(indices.slice(i, i + 3).map((index) => vertices[index]));
  return { ...source, polygons, material: primitive.material ?? 0 };
}

/** Encode genuine source subsets/new cut surfaces while retaining all original
 * material/image bytes. Caller owns seam selection, interiors and articulation.
 * This pure function neither writes files nor claims provider/license clearance.
 */
export function encodeStaticPropParts(source, parts) {
  if (!parts.length || new Set(parts.map((part) => part.name)).size !== parts.length || parts.some((part) => !part.name)) {
    throw new Error("Prop parts require unique names");
  }
  const json = structuredClone(source.json), chunks = [Buffer.from(source.bin)];
  let offset = source.bin.length;
  json.asset.generator = `${source.json.asset.generator ?? "Source GLB"}; SoulDrifter source-preserving review partition`;
  json.scene = 0; json.scenes = [{ nodes: [0] }]; json.nodes = [{ name: "review-prop", children: [] }]; json.meshes = [];
  const append = (bytes) => {
    const padding = (4 - offset % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
    const id = json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length; return id;
  };
  const receipts = [];
  for (const part of parts) {
    const values = { position: [], normal: [], uv: [] };
    let discardedDegenerates = 0;
    for (const polygon of part.polygons) for (let i = 1; i + 1 < polygon.length; i++) {
      const triangle = [polygon[0], polygon[i], polygon[i + 1]];
      for (const vertex of triangle) for (const [key, width] of [["position", 3], ["normal", 3], ["uv", 2]]) {
        if (vertex.attributes[key]?.length !== width || !vertex.attributes[key].every(Number.isFinite)) throw new Error(`Invalid ${part.name} ${key}`);
      }
      const p = triangle.map((v) => new Vector3(...v.attributes.position));
      if (p[1].sub(p[0]).cross(p[2].sub(p[0])).lengthSq() < 1e-22) { discardedDegenerates++; continue; }
      for (const vertex of triangle) for (const key of Object.keys(values)) values[key].push(...vertex.attributes[key]);
    }
    if (!values.position.length) throw new Error(`Empty prop part: ${part.name}`);
    const attributes = {};
    for (const [semantic, key] of Object.entries(semantics)) {
      const width = key === "uv" ? 2 : 3, data = Float32Array.from(values[key]);
      if (!data.every(Number.isFinite)) throw new Error(`Invalid ${part.name} ${key}: Float32 overflow`);
      const a = { bufferView: append(Buffer.from(data.buffer)), byteOffset: 0, componentType: 5126,
        count: data.length / width, type: width === 2 ? "VEC2" : "VEC3" };
      if (key === "position") {
        a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity];
        data.forEach((value, index) => { const axis = index % 3; a.min[axis] = Math.min(a.min[axis], value); a.max[axis] = Math.max(a.max[axis], value); });
      }
      attributes[semantic] = json.accessors.push(a) - 1;
    }
    const mesh = json.meshes.push({ name: part.name, primitives: [{ attributes, material: source.material, mode: 4 }] }) - 1;
    const node = json.nodes.push({ name: part.name, mesh }) - 1;
    json.nodes[0].children.push(node);
    receipts.push({ name: part.name, triangles: values.position.length / 9, discardedDegenerates });
  }
  json.buffers = [{ byteLength: offset }];
  const bin = Buffer.concat(chunks), bytes = encodeGlb(json, bin);
  return { json, bin, bytes, receipt: { sourcePath: source.sourcePath, sourceSha256: source.sha256,
    outputSha256: hash(bytes), outputBytes: bytes.length, parts: receipts,
    status: "Source-preserving review candidate; seams, interior, animation and provider receipt require separate verification",
    originalBinaryPrefixUnchanged: bin.subarray(0, source.bin.length).equals(source.bin),
  } };
}
