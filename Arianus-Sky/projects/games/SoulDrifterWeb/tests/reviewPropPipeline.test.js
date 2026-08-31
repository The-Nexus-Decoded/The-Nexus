import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { encodeGlb, parseGlb } from "../scripts/replace-glb-animation.mjs";
import { packReviewProp } from "../scripts/assets/pack-review-prop.mjs";

describe("reused GLB container for review assets", () => {
  it("imports without invoking replacement CLI and roundtrips aligned chunks", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "review-glb-"));
    try {
      const json = { asset: { version: "2.0" }, buffers: [{ byteLength: 3 }] };
      const file = path.join(temp, "test.glb");
      writeFileSync(file, encodeGlb(json, Buffer.from([1, 2, 3])));
      expect(parseGlb(file).json).toEqual(json);
      expect([...parseGlb(file).bin]).toEqual([1, 2, 3, 0]);
      expect(readFileSync(file).readUInt32LE(8)).toBe(readFileSync(file).length);
    } finally { rmSync(temp, { recursive: true }); }
  });
  it("retains direct CLI animation replacement behavior", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "review-replace-"));
    try {
      const json = { asset: { version: "2.0" }, buffers: [{ byteLength: 4 }], nodes: [{ name: "root" }],
        animations: [{ name: "Idle", samplers: [], channels: [] }] };
      const input = path.join(temp, "input.glb"), output = path.join(temp, "output.glb");
      writeFileSync(input, encodeGlb(json, Buffer.alloc(4)));
      const cli = spawnSync(process.execPath, ["scripts/replace-glb-animation.mjs", "--target", input,
        "--source", input, "--output", output, "--animation", "Idle"], { encoding: "utf8" });
      expect(cli.status, cli.stderr).toBe(0);
      expect(parseGlb(output).json.animations).toEqual(json.animations);
    } finally { rmSync(temp, { recursive: true }); }
  });
});

function preparedFixture(directory, collapsed = false) {
  const sourcePath = path.join(directory, "source.gltf");
  const source = { materials: [{ name: "fixture", pbrMetallicRoughness: { baseColorTexture: { index: 0, texCoord: 1 } } }],
    images: [{ name: "opaque-diffuse", uri: "map.jpg" }], textures: [{ source: 0 }] };
  writeFileSync(sourcePath, JSON.stringify(source));
  const sourceSha256 = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
  writeFileSync(path.join(directory, "preparation.json"), JSON.stringify({ sourceSha256, materials: ["fixture"] }));
  const arrays = [new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    new Float32Array(collapsed ? [0, 0, 0, 0, 0, 0] : [0, 0, 1, 0, 0, 1]),
    new Uint32Array([0, 1, 2]), new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0])];
  const chunks = arrays.map((array) => Buffer.from(array.buffer));
  let offset = 0;
  const bufferViews = chunks.map((chunk) => { const view = { buffer: 0, byteOffset: offset, byteLength: chunk.length }; offset += chunk.length; return view; });
  const lod = { buffers: [{ uri: "mesh.bin", byteLength: offset }], bufferViews,
    accessors: [{ bufferView: 0, count: 3, componentType: 5126, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, count: 3, componentType: 5126, type: "VEC2" }, { bufferView: 2, count: 3, componentType: 5125, type: "SCALAR" },
      { bufferView: 3, count: 3, componentType: 5126, type: "VEC3" }],
    meshes: [{ primitives: [{ indices: 2, attributes: { POSITION: 0, TEXCOORD_0: 1, TANGENT: 3 } }] }] };
  writeFileSync(path.join(directory, "fixture.gltf"), JSON.stringify(lod));
  writeFileSync(path.join(directory, "mesh.bin"), Buffer.concat(chunks));
  // Byte-preservation unit fixture; actual texture decoding is a separate asset-intake test.
  writeFileSync(path.join(directory, "map.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  return { sourcePath, lodDirectory: directory, textureDirectory: directory, outputPath: path.join(directory, "packed.glb"),
    receiptPath: path.join(directory, "receipt.json"), provenance: { sourceUrl: "https://example.org/fixture", license: "test-only", licenseUrl: "https://example.org/license", author: "Test fixture" } };
}

describe("prepared review prop pack", () => {
  it("keeps geometry and PBR bytes while fixing only the selected UV binding and invalid tangent", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "review-pack-"));
    try {
      const options = preparedFixture(temp), receipt = packReviewProp(options), { json, bin } = parseGlb(options.outputPath);
      expect(receipt.geometry[0]).toMatchObject({ vertices: 3, triangles: 1, varyingUVs: 2 });
      expect(json.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord).toBe(0);
      expect(json.meshes[0].primitives[0].attributes.TANGENT).toBeUndefined();
      const texture = json.bufferViews[json.images[0].bufferView];
      expect(bin.subarray(texture.byteOffset, texture.byteOffset + texture.byteLength)).toEqual(readFileSync(path.join(temp, "map.jpg")));
      expect(receipt.inputs.every((input) => input.sha256.length === 64)).toBe(true);
      expect(() => packReviewProp({ ...options, provenance: null })).toThrow(/provenance/);
      expect(() => packReviewProp({ ...options, outputPath: options.sourcePath })).toThrow(/overwrite/);
    } finally { rmSync(temp, { recursive: true }); }
  });
  it("rejects collapsed texture coordinates and mismatched prepared source", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "review-pack-"));
    try {
      const options = preparedFixture(temp, true);
      expect(() => packReviewProp(options)).toThrow(/Collapsed UVs/);
      writeFileSync(options.sourcePath, readFileSync(options.sourcePath) + " ");
      expect(() => packReviewProp(options)).toThrow(/revision/);
    } finally { rmSync(temp, { recursive: true }); }
  });
});
