import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { encodeGlb } from "../replace-glb-animation.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const sizes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };

/** Pack prepared geometry and the licensed source PBR maps, without re-encoding textures. */
export function packReviewProp({ sourcePath, lodDirectory, textureDirectory, outputPath, receiptPath, provenance }) {
  if (!provenance?.sourceUrl || !provenance?.license || !provenance?.licenseUrl || !provenance?.author) {
    throw new Error("Explicit source, author and license provenance is required");
  }
  if (path.resolve(outputPath) === path.resolve(receiptPath)) throw new Error("Asset and receipt must be separate files");
  const inputs = [];
  const read = (filename) => {
    if ([outputPath, receiptPath].some((out) => path.resolve(out) === path.resolve(filename))) throw new Error("Cannot overwrite a source input");
    const bytes = fs.readFileSync(filename);
    inputs.push({ file: path.resolve(filename), bytes: bytes.length, sha256: hash(bytes) });
    return bytes;
  };
  const source = JSON.parse(read(sourcePath));
  const preparation = JSON.parse(read(path.join(lodDirectory, "preparation.json")));
  if (preparation.sourceSha256 !== hash(fs.readFileSync(sourcePath))) throw new Error("Prepared source revision does not match");
  const json = { asset: { version: "2.0", generator: "SoulDrifter review LOD pack; SideFX Houdini; Poly Haven source" },
    scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [],
    materials: structuredClone(source.materials), textures: structuredClone(source.textures),
    samplers: structuredClone(source.samplers ?? []), images: [] };
  const chunks = [];
  let offset = 0;
  const append = (bytes) => {
    const index = json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes);
    const padding = (4 - bytes.length % 4) % 4;
    if (padding) chunks.push(Buffer.alloc(padding));
    offset += bytes.length + padding;
    return index;
  };
  const geometry = [];
  for (const [materialIndex, material] of json.materials.entries()) {
    if (!preparation.materials.includes(material.name)) throw new Error(`Prepared material missing: ${material.name}`);
    const lodPath = path.join(lodDirectory, `${material.name}.gltf`);
    const lod = JSON.parse(read(lodPath));
    const buffers = lod.buffers.map((buffer) => read(path.join(lodDirectory, buffer.uri)));
    const accessorMap = new Map();
    const copy = (id) => {
      if (accessorMap.has(id)) return accessorMap.get(id);
      const a = lod.accessors[id], view = lod.bufferViews[a.bufferView];
      if (a.sparse || !widths[a.type] || !sizes[a.componentType]) throw new Error("Unsupported prepared accessor");
      const width = widths[a.type] * sizes[a.componentType];
      const stride = view.byteStride ?? width;
      const buffer = buffers[view.buffer], start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
      const bytes = Buffer.alloc(width * a.count);
      for (let i = 0; i < a.count; i++) {
        if (start + i * stride + width > buffer.length) throw new Error("Prepared accessor exceeds buffer");
        buffer.copy(bytes, i * width, start + i * stride, start + i * stride + width);
      }
      const output = { ...a, byteOffset: 0, bufferView: append(bytes) };
      const result = json.accessors.push(output) - 1;
      accessorMap.set(id, result);
      return result;
    };
    for (const mesh of lod.meshes) {
      const primitives = mesh.primitives.map((primitive) => {
        const attributes = {};
        for (const [semantic, id] of Object.entries(primitive.attributes)) {
          // Houdini exports a 3-component tangent; glTF requires tangent.w.
          // Derivative tangents preserve the normal map without inventing w.
          if (semantic === "TANGENT" && lod.accessors[id].type !== "VEC4") continue;
          attributes[semantic] = copy(id);
        }
        const uv = json.accessors[attributes.TEXCOORD_0];
        if (!uv || uv.type !== "VEC2") throw new Error("Prepared material has no usable UV channel");
        const originalUV = lod.accessors[primitive.attributes.TEXCOORD_0];
        const v = lod.bufferViews[originalUV.bufferView], b = buffers[v.buffer];
        const begin = (v.byteOffset ?? 0) + (originalUV.byteOffset ?? 0);
        let min = Infinity, max = -Infinity, varying = 0;
        for (let i = 0; i < originalUV.count; i++) {
          const at = begin + i * (v.byteStride ?? 8), u = b.readFloatLE(at), w = b.readFloatLE(at + 4);
          if (!Number.isFinite(u) || !Number.isFinite(w)) throw new Error("Nonfinite prepared UV");
          min = Math.min(min, u, w); max = Math.max(max, u, w);
          if (i && (u !== b.readFloatLE(begin) || w !== b.readFloatLE(begin + 4))) varying++;
        }
        if (varying < originalUV.count * 0.1) throw new Error(`Collapsed UVs for ${material.name}`);
        geometry.push({ material: material.name, vertices: uv.count,
          triangles: lod.accessors[primitive.indices].count / 3, uvMinimum: min, uvMaximum: max, varyingUVs: varying });
        return { attributes, indices: copy(primitive.indices), material: materialIndex, mode: 4 };
      });
      const meshIndex = json.meshes.push({ name: material.name, primitives }) - 1;
      const nodeIndex = json.nodes.push({ name: material.name, mesh: meshIndex }) - 1;
      json.scenes[0].nodes.push(nodeIndex);
    }
    const maps = [material.normalTexture, material.occlusionTexture, material.emissiveTexture,
      material.pbrMetallicRoughness?.baseColorTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture];
    for (const map of maps.filter(Boolean)) map.texCoord = 0;
    if (material.alphaMode && material.alphaMode !== "OPAQUE") { material.alphaMode = "MASK"; material.alphaCutoff = 0.45; }
  }
  for (const image of source.images) {
    let name = path.basename(image.uri);
    const needsAlpha = /alpha/i.test(image.name ?? "");
    if (needsAlpha) name = name.replace(/\.jpe?g$/i, ".png");
    const bytes = read(path.join(textureDirectory, name));
    if (needsAlpha && (bytes.toString("ascii", 1, 4) !== "PNG" || ![4, 6].includes(bytes[25]))) {
      throw new Error(`Missing actual alpha texture: ${name}`);
    }
    json.images.push({ name: image.name, bufferView: append(bytes), mimeType: name.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  json.buffers.push({ byteLength: offset });
  const glb = encodeGlb(json, Buffer.concat(chunks));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, glb);
  const receipt = { version: 1, output: path.resolve(outputPath), sha256: hash(glb), bytes: glb.length,
    ...provenance,
    inputs, geometry, changes: ["Selected each source material's real UV set before reduction", "Dropped invalid VEC3 tangents",
      "Embedded original PBR bytes with alpha PNG for cutout foliage", "No geometry rescale, no image generation"],
    status: "Packed candidate; visual review and runtime interaction acceptance pending" };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const option = (name) => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`); return process.argv[i + 1]; };
  const receipt = packReviewProp({ sourcePath: option("--source"), lodDirectory: option("--lod"),
    textureDirectory: option("--textures"), outputPath: option("--output"), receiptPath: option("--receipt"),
    provenance: { sourceUrl: option("--source-url"), license: option("--license"), licenseUrl: option("--license-url"), author: option("--author") } });
  console.log(JSON.stringify({ sha256: receipt.sha256, bytes: receipt.bytes, geometry: receipt.geometry }));
}
