import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseGlb } from "../scripts/replace-glb-animation.mjs";

const catalog = JSON.parse(readFileSync(new URL("../src/review/weapon-lab/review-prop-catalog.json", import.meta.url)));
const ledger = JSON.parse(readFileSync(new URL("../third-party-assets.json", import.meta.url)));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

describe("actual reviewed interaction prop intake", () => {
  it("pins every asset and separates licensed intake from uncleared local inspection candidates", () => {
    expect(catalog.scope).toContain("not interaction or dungeon approval");
    for (const asset of catalog.assets) {
      expect(asset.url).toMatch(/^\/assets\/(?:weapon-lab\/props|3d\/environment\/dungeon-kit)\/[\w-]+\.glb$/);
      const file = new URL(`../public${asset.url}`, import.meta.url), bytes = readFileSync(file);
      expect(bytes.length).toBe(asset.bytes); expect(hash(bytes)).toBe(asset.sha256);
      const path = `public${asset.url}`, licensed = ledger.shippingAssets.find((entry) => entry.path === path);
      const candidate = ledger.localReviewCandidates.find((entry) => entry.path === path);
      if (asset.approvalStatus === "inspection-draft") {
        expect(licensed).toBeUndefined();
        expect(candidate).toMatchObject({sha256:asset.sha256,sourcePath:asset.sourcePath,sourceSha256:asset.sourceSha256});
        expect(candidate.usage).toContain("Local Motion Studio inspection only");
        expect(candidate.license).toContain("not independently recovered");
        expect(asset.license).toContain("not distribution clearance");expect(asset.licenseUrl).toBe("");
        expect(asset.remainingGates).toContain("original provider account receipt");
        const source = readFileSync(new URL(`../${asset.sourcePath}`,import.meta.url));
        expect(hash(source)).toBe(asset.sourceSha256);
      } else {
        expect(candidate).toBeUndefined();expect(asset.approvalStatus).toBe("static-reviewed");
        expect(licensed).toMatchObject({sha256:asset.sha256,license:asset.license,licenseUrl:asset.licenseUrl,author:asset.author});
      }
      expect(asset.remainingGates.length).toBeGreaterThan(0);
    }
  });
  it("keeps the original chest source and embedded PBR bytes while articulating real source subsets", () => {
    const asset=catalog.assets.find((entry)=>entry.id==="iron-bound-chest-draft");
    const source=parseGlb(fileURLToPath(new URL(`../${asset.sourcePath}`,import.meta.url)));
    const candidate=parseGlb(fileURLToPath(new URL(`../public${asset.url}`,import.meta.url)));
    expect(candidate.bin.subarray(0,source.bin.length).equals(source.bin)).toBe(true);
    for(const key of ["images","textures","samplers","materials"]) expect(candidate.json[key]).toEqual(source.json[key]);
    expect(candidate.json.meshes.map((mesh)=>mesh.name)).toEqual(["chest-body","chest-lid","chest-hasp"]);
    expect(candidate.json.animations??[]).toEqual([]);expect(candidate.json.skins??[]).toEqual([]);
    const triangles=candidate.json.meshes.flatMap((mesh)=>mesh.primitives).reduce((total,p)=>total+candidate.json.accessors[p.indices??p.attributes.POSITION].count/3,0);
    expect(triangles).toBe(8482);expect(triangles).toBe(asset.triangleCount);
    for(const joint of asset.joints) expect(candidate.json.nodes.filter((node)=>node.name===joint.node)).toHaveLength(1);
    expect(candidate.json.nodes.find((node)=>node.name==="chest-lid-hinge").children).toHaveLength(2);
    expect(candidate.json.nodes.find((node)=>node.name==="chest-hasp-hinge").children).toHaveLength(1);
  });
  it("retains the real tree geometry, complete embedded PBR sets and original cutout foliage bytes", () => {
    const asset = catalog.assets.find((entry) => entry.id === "tree-small-02");
    const { json, bin } = parseGlb(fileURLToPath(new URL(`../public${asset.url}`, import.meta.url)));
    expect(json.meshes).toHaveLength(3); expect(json.materials).toHaveLength(3); expect(json.images).toHaveLength(9);
    expect(json.animations ?? []).toHaveLength(0); expect(json.skins ?? []).toHaveLength(0);
    expect(json.buffers.every((buffer) => !buffer.uri)).toBe(true);
    expect(json.images.every((image) => !image.uri && Number.isInteger(image.bufferView))).toBe(true);
    let triangles = 0;
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      triangles += json.accessors[primitive.indices].count / 3;
      expect(primitive.attributes.POSITION).toBeDefined(); expect(primitive.attributes.NORMAL).toBeDefined();
      expect(primitive.attributes.TEXCOORD_0).toBeDefined(); expect(primitive.attributes.TANGENT).toBeUndefined();
      const material = json.materials[primitive.material];
      expect(asset.armMaterials).toContain(material.name);
      expect(material.normalTexture.texCoord).toBe(0);
      expect(material.pbrMetallicRoughness.baseColorTexture.texCoord).toBe(0);
      expect(material.pbrMetallicRoughness.metallicRoughnessTexture.texCoord).toBe(0);
    }
    expect(triangles).toBe(asset.triangleCount); expect(triangles).toBe(398000);
    const leaves = json.materials.find((material) => material.name === "tree_small_02_leaves");
    expect(leaves.alphaMode).toBe("MASK"); expect(leaves.alphaCutoff).toBe(0.45);
    const image = json.images[json.textures[leaves.pbrMetallicRoughness.baseColorTexture.index].source];
    const view = json.bufferViews[image.bufferView], bytes = bin.subarray(view.byteOffset, view.byteOffset + view.byteLength);
    expect(image.mimeType).toBe("image/png"); expect(bytes[25]).toBe(6);
    expect(hash(bytes)).toBe("d3fc48522c76aa1f91076c6b86f302669822ebe4e2acabd67d42c4d57eaa5ba0");
    for (const name of asset.contactMeshes) expect(json.nodes.some((node) => node.name === name)).toBe(true);
  });
});
