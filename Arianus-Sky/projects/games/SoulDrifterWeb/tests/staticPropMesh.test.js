import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { encodeGlb } from "../scripts/replace-glb-animation.mjs";
import { splitPolygon } from "../src/game/geometry/clipPropPolygon.ts";
import { readStaticProp, encodeStaticPropParts } from "../scripts/assets/static-prop-mesh.mjs";

const chest = fileURLToPath(new URL("../docs/3d-ai-studio/source-models/environment/dungeon-kit/storage-chest.glb", import.meta.url));
const sha = "8cc7d2c791614661e6997e9ea0632dbdbf8cd706b81dea5a45031921ffe4dc56";
describe("static prop source-preserving authoring", () => {
  it.each(["targets", "meshWeights", "nodeWeights"])("refuses %s instead of dropping a deformed source shape", (kind) => {
    const source = readStaticProp(chest, sha), json = structuredClone(source.json);
    if (kind === "targets") json.meshes[0].primitives[0].targets = [{ POSITION: 0 }];
    if (kind === "meshWeights") json.meshes[0].weights = [1];
    if (kind === "nodeWeights") json.nodes[0].weights = [1];
    const bytes = encodeGlb(json, source.bin), pin = createHash("sha256").update(bytes).digest("hex");
    const spy = vi.spyOn(fs, "readFileSync").mockReturnValue(bytes);
    try { expect(() => readStaticProp("synthetic-morph-source.glb", pin)).toThrow("morph targets/weights"); }
    finally { spy.mockRestore(); }
  });

  it("reads the actual 2K original chest and rejects an unpinned source", () => {
    expect(() => readStaticProp(chest)).toThrow("pinned");
    expect(() => readStaticProp(chest, "0".repeat(64))).toThrow("pinned");
    const source = readStaticProp(chest, sha);
    expect(source.polygons).toHaveLength(6932); expect(source.json.images).toHaveLength(3);
    expect(source.json.asset.generator).toBe("https://tripo3d.ai");
  });

  it("packs a real seam split while preserving every source material and original binary byte", () => {
    const source = readStaticProp(chest, sha), original = structuredClone(source.json);
    const parts = [{ name: "body-exterior", polygons: [] }, { name: "lid-exterior", polygons: [] }];
    for (const polygon of source.polygons) {
      const cut = splitPolygon(polygon, { axis: 1, boundary: .122, keepGreater: false });
      if (cut.inside.length >= 3) parts[0].polygons.push(cut.inside);
      if (cut.outside.length >= 3) parts[1].polygons.push(cut.outside);
    }
    const result = encodeStaticPropParts(source, parts);
    expect(result.json.meshes.map((mesh) => mesh.name)).toEqual(["body-exterior", "lid-exterior"]);
    expect(result.receipt.parts.every((part) => part.triangles > 100)).toBe(true);
    expect(result.receipt.originalBinaryPrefixUnchanged).toBe(true);
    for (const field of ["materials", "images", "textures", "samplers"]) expect(result.json[field]).toEqual(source.json[field]);
    expect(source.json).toEqual(original); expect(result.bytes.readUInt32LE(0)).toBe(0x46546c67);
    // A raw seam split alone is NOT a usable opening chest: it has no interior,
    // cut caps, separate hasp or hinge. Those remain explicit authoring work.
    expect(result.json.animations).toBeUndefined();
    expect(result.receipt.status).toContain("require separate verification");
  });

  it("rejects empty/ambiguous parts and nonfinite new surfaces", () => {
    const source = readStaticProp(chest, sha);
    expect(() => encodeStaticPropParts(source, [])).toThrow("unique names");
    expect(() => encodeStaticPropParts(source, [{ name: "body", polygons: [] }])).toThrow("Empty");
    const polygon = structuredClone(source.polygons[0]); polygon[0].attributes.uv[0] = NaN;
    expect(() => encodeStaticPropParts(source, [{ name: "body", polygons: [polygon] }])).toThrow("Invalid body uv");
    polygon[0].attributes.uv[0] = 1e40;
    expect(() => encodeStaticPropParts(source, [{ name: "body", polygons: [polygon] }])).toThrow("Float32 overflow");
    expect(() => encodeStaticPropParts(source, [{ name: "body" }, { name: "body" }])).toThrow("unique names");
  });
});
