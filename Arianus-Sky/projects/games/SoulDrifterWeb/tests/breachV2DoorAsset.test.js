import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceUrl = new URL(
  "../docs/3d-ai-studio/source-models/environment/dungeon-kit/heavy-door.glb",
  import.meta.url,
);
const runtimeUrl = new URL(
  "../public/assets/3d/environment/dungeon-kit/heavy-door.glb",
  import.meta.url,
);
const reviewedSha256 = "34F0B4ACF5A5A6DA6DA659177A02ADB3F8510599DECC6600044EEE6230862576";

function parseGlb(url) {
  const bytes = readFileSync(fileURLToPath(url));
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").trimEnd());
  const binaryHeader = 20 + jsonLength;
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  return {
    bytes,
    json,
    binary: bytes.subarray(binaryHeader + 8, binaryHeader + 8 + binaryLength),
  };
}

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Expected embedded JPEG texture");
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segmentLength = bytes.readUInt16BE(offset);
    if (startOfFrame.has(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions were not found");
}

function embeddedImageDimensions(glb) {
  return glb.json.images.map((image) => {
    const view = glb.json.bufferViews[image.bufferView];
    const start = view.byteOffset ?? 0;
    return {
      name: image.name,
      ...jpegDimensions(glb.binary.subarray(start, start + view.byteLength)),
    };
  });
}

describe("BREACH-V2 imported heavy-door artifact fidelity", () => {
  it("ships the reviewed 3D AI Studio import byte-for-byte instead of the damaged 256px derivative", () => {
    const source = parseGlb(sourceUrl);
    const runtime = parseGlb(runtimeUrl);
    const runtimeHash = createHash("sha256").update(runtime.bytes).digest("hex").toUpperCase();

    expect(runtimeHash).toBe(reviewedSha256);
    expect(runtime.bytes.equals(source.bytes)).toBe(true);
    // Preserve the generator metadata embedded inside the 3D AI Studio import.
    expect(runtime.json.asset.generator).toBe("https://tripo3d.ai");
    expect(runtime.json.meshes).toHaveLength(1);
    expect(runtime.json.meshes[0].primitives).toHaveLength(1);
    const indices = runtime.json.meshes[0].primitives[0].indices;
    expect(runtime.json.accessors[indices].count).toBe(21_390);
  });

  it("preserves the 2K color, ORM, and normal maps and untinted PBR bindings", () => {
    const runtime = parseGlb(runtimeUrl);
    const dimensions = embeddedImageDimensions(runtime);
    expect(dimensions).toHaveLength(3);
    expect(dimensions.map(({ width, height }) => [width, height]))
      .toEqual([[2048, 2048], [2048, 2048], [2048, 2048]]);
    expect(dimensions.map(({ name }) => name)).toEqual(expect.arrayContaining([
      expect.stringMatching(/color/i),
      expect.stringMatching(/orm/i),
      expect.stringMatching(/normal/i),
    ]));

    const material = runtime.json.materials[0];
    expect(material.pbrMetallicRoughness.baseColorTexture).toBeDefined();
    expect(material.pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();
    expect(material.normalTexture).toBeDefined();
    expect(material.pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1])
      .toEqual([1, 1, 1, 1]);
  });
});
