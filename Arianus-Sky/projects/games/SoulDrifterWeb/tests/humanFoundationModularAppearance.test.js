import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const assetUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.glb",
  import.meta.url,
);
const provenanceUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.provenance.json",
  import.meta.url,
);
const follicleMaskUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/follicle-masks/hair-parted-scalp-v1.png",
  import.meta.url,
);

const HEAD_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8";
const shippedModules = ["SK_Hair_Parted_Straight", "SK_Hair_Cropped_Curly", "SK_Hair_Cropped_Straight", "SK_Hair_Parted_Curly"];
const HAIR_STYLE_MODULES = ["Cropped", "Parted", "Long", "TiedBack", "Braided"];
const HAIR_TEXTURE_MODULES = ["Straight", "Curly"];
const withheldModules = [
  ...HAIR_STYLE_MODULES.flatMap((style) => HAIR_TEXTURE_MODULES.map((texture) => `SK_Hair_${style}_${texture}`))
    .filter((name) => !shippedModules.includes(name)),
  "SK_FacialHair_Stubble",
  "SK_FacialHair_Moustache",
  "SK_FacialHair_Goatee",
  "SK_FacialHair_ShortBeard",
  "SK_FacialHair_FullBeard",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function glb(bytes) {
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
  const binLength = bytes.readUInt32LE(20 + jsonLength);
  expect(bytes.readUInt32LE(24 + jsonLength)).toBe(0x004e4942);
  const bin = bytes.subarray(28 + jsonLength, 28 + jsonLength + binLength);
  return { json, bin };
}

const COMPONENT_READERS = {
  5121: (view, offset) => view.getUint8(offset),
  5123: (view, offset) => view.getUint16(offset, true),
  5125: (view, offset) => view.getUint32(offset, true),
  5126: (view, offset) => view.getFloat32(offset, true),
};
const COMPONENT_BYTES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/** Reads a tightly packed or strided accessor into a flat array of numbers. */
function readAccessor(json, bin, index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const read = COMPONENT_READERS[accessor.componentType];
  const componentBytes = COMPONENT_BYTES[accessor.componentType];
  const size = TYPE_SIZE[accessor.type];
  const stride = view.byteStride ?? componentBytes * size;
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const out = new Array(accessor.count * size);
  for (let i = 0; i < accessor.count; i += 1) {
    for (let c = 0; c < size; c += 1) {
      out[i * size + c] = read(data, base + i * stride + c * componentBytes);
    }
  }
  return { values: out, size, count: accessor.count };
}

const bytes = readFileSync(fileURLToPath(assetUrl));
const { json, bin } = glb(bytes);
const nodes = json.nodes ?? [];
const module = nodes.find((node) => node.name === "SK_Hair_Parted_Straight");
const modules = Object.fromEntries(shippedModules.map((name) => [name, nodes.find((node) => node.name === name)]));

describe("Human foundation modular appearance pack", () => {
  it("carries the locally validated hair modules and nothing that was withheld", () => {
    const names = nodes.map((node) => node.name);
    expect(names).toEqual(expect.arrayContaining(shippedModules));
    for (const withheld of withheldModules) expect(names).not.toContain(withheld);
    expect([...json.asset.extras.souldrifterModules].sort()).toEqual([...shippedModules].sort());
    for (const name of shippedModules) {
      const node = modules[name];
      expect(node, name).toBeDefined();
      expect(node.extras).toMatchObject({
        souldrifterApprovalStatus: "LOCAL_AUTHORING_VALIDATED",
        souldrifterHeadBone: "mixamorig:Head",
      });
      const children = (node.children ?? []).map((index) => nodes[index]);
      expect(children.map((child) => child.name).sort()).toEqual([`${name}_Cards`, `${name}_Mass`]);
      for (const child of children) {
        expect(child.mesh).toBeTypeOf("number");
        expect(child.skin).toBe(0);
        // presentation.ts refuses a module that carries its own scalp/underlay
        expect(child.name).not.toMatch(/scalp|rootcap|undercoat|underlay/i);
      }
    }
    expect(json.skins).toHaveLength(1);
    expect(json.skins[0].joints).toHaveLength(65);
    expect(json.animations ?? []).toHaveLength(0);
    expect(json.meshes).toHaveLength(2 * shippedModules.length);
  });

  it("weights every hair vertex fully to mixamorig:Head", () => {
    const headJoint = json.skins[0].joints.findIndex((index) => nodes[index].name === "mixamorig:Head");
    expect(headJoint).toBeGreaterThanOrEqual(0);
    for (const mesh of json.meshes) {
      for (const primitive of mesh.primitives) {
        for (const attribute of ["POSITION", "NORMAL", "TEXCOORD_0", "TANGENT", "JOINTS_0", "WEIGHTS_0"]) {
          expect(primitive.attributes, `${mesh.name} ${attribute}`).toHaveProperty(attribute);
        }
        const joints = readAccessor(json, bin, primitive.attributes.JOINTS_0);
        const weights = readAccessor(json, bin, primitive.attributes.WEIGHTS_0);
        expect(joints.count).toBe(weights.count);
        for (let vertex = 0; vertex < joints.count; vertex += 1) {
          for (let slot = 0; slot < 4; slot += 1) {
            const weight = weights.values[vertex * 4 + slot];
            const joint = joints.values[vertex * 4 + slot];
            if (weight > 1e-4) {
              expect(joint, `${mesh.name} vertex ${vertex}`).toBe(headJoint);
              expect(weight).toBeCloseTo(1, 4);
            }
          }
        }
      }
    }
  });

  function vertexAlphaStats(meshName) {
    const mesh = json.meshes.find((entry) => entry.name === meshName);
    const primitive = mesh.primitives[0];
    expect(primitive.attributes, meshName).toHaveProperty("COLOR_0");
    const color = readAccessor(json, bin, primitive.attributes.COLOR_0);
    expect(color.size).toBe(4);
    const max = { 5126: 1, 5123: 65535, 5121: 255 }[json.accessors[primitive.attributes.COLOR_0].componentType];
    let feathered = 0;
    let alphaSum = 0;
    for (let vertex = 0; vertex < color.count; vertex += 1) {
      const alpha = color.values[vertex * 4 + 3] / max;
      alphaSum += alpha;
      if (alpha < 0.99) feathered += 1;
    }
    return { count: color.count, feathered, meanAlpha: alphaSum / color.count };
  }

  it("feathers each mass at the hairline through vertex alpha", () => {
    for (const name of shippedModules) {
      const stats = vertexAlphaStats(`${name}_Mass`);
      expect(stats.feathered, name).toBeGreaterThan(200);
      expect(stats.feathered, name).toBeLessThan(stats.count / 2);
    }
  });

  it.each(["SK_Hair_Cropped_Curly", "SK_Hair_Parted_Curly"])("stacks %s's fur shells with a falling vertex alpha so alphaCutoff thins them outward", (moduleName) => {
    const stats = vertexAlphaStats(`${moduleName}_Cards`);
    // Five shells, each a copy of the ~6.4k-vertex welded scalp, every vertex carrying its
    // shell's coverage. The mass itself is not the reference: a parted module refines its own
    // mass along the part line, so its vertex count no longer matches the shells' base.
    expect(stats.count).toBeGreaterThan(5 * 6000);
    expect(stats.feathered).toBe(stats.count);
    expect(stats.meanAlpha).toBeGreaterThan(0.4);
    expect(stats.meanAlpha).toBeLessThan(0.85);
  });

  it("uses alpha-tested, double-sided, tintable hair materials with anisotropy", () => {
    expect(json.materials.map((material) => material.name).sort()).toEqual([
      "MAT_HumanHair_Tintable_Cropped_Curly_Cards",
      "MAT_HumanHair_Tintable_Cropped_Curly_Mass",
      "MAT_HumanHair_Tintable_Cropped_Straight_Cards",
      "MAT_HumanHair_Tintable_Cropped_Straight_Mass",
      "MAT_HumanHair_Tintable_Parted_Curly_Cards",
      "MAT_HumanHair_Tintable_Parted_Curly_Mass",
      "MAT_HumanHair_Tintable_Parted_Straight_Cards",
      "MAT_HumanHair_Tintable_Parted_Straight_Mass",
    ]);
    for (const material of json.materials) {
      expect(material.alphaMode).toBe("MASK");
      expect(material.alphaCutoff).toBeGreaterThanOrEqual(0.3);
      expect(material.doubleSided).toBe(true);
      expect(material.extras).toMatchObject({ souldrifterTintChannel: "HAIR" });
      expect(material.pbrMetallicRoughness.baseColorTexture).toBeDefined();
      expect(material.pbrMetallicRoughness.metallicFactor).toBe(0);
      expect(material.pbrMetallicRoughness.roughnessFactor).toBeGreaterThanOrEqual(0.58);
      expect(material.extensions.KHR_materials_anisotropy.anisotropyStrength).toBeGreaterThan(0);
      expect(material.extensions.KHR_materials_specular.specularFactor).toBeLessThan(1);
    }
    expect(json.extensionsUsed).toEqual(expect.arrayContaining(["KHR_materials_anisotropy", "KHR_materials_specular"]));
    // the two straight modules share the strand atlas and cap tile, which the exporter emits once
    expect(json.images.length).toBeGreaterThan(0);
    expect(json.images.length).toBeLessThanOrEqual(2 * shippedModules.length);
    expect(new Set(json.images.map((image) => image.mimeType))).toEqual(new Set(["image/png"]));
  });

  it("ships the approved follicle mask its extras point at", () => {
    for (const name of shippedModules) expect(modules[name].extras.souldrifterFollicleMaskSha256).toBe(module.extras.souldrifterFollicleMaskSha256);
    expect(module.extras).toMatchObject({
      souldrifterFollicleMaskStatus: "LOCAL_AUTHORING_VALIDATED",
      souldrifterFollicleMaskUrl: "/assets/3d/characters/human-foundation-pilot/follicle-masks/hair-parted-scalp-v1.png",
      souldrifterFollicleMaskUvSet: "UVMap",
      souldrifterFollicleMaskSourceHeadSha256: HEAD_SHA256,
    });
    expect(module.extras.souldrifterFollicleUndercoatStrength).toBeGreaterThan(0);
    expect(module.extras.souldrifterFollicleUndercoatStrength).toBeLessThanOrEqual(0.3);
    const mask = readFileSync(fileURLToPath(follicleMaskUrl));
    expect(mask.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(sha256(mask)).toBe(module.extras.souldrifterFollicleMaskSha256);
  });

  it("records exact provenance for the shipped modules and fail-closed dispositions for the rest", () => {
    const provenance = JSON.parse(readFileSync(fileURLToPath(provenanceUrl), "utf8"));

    expect(provenance).toMatchObject({
      issue: 487,
      status: "LOCAL_MODULAR_APPEARANCE_PARTIAL",
      route: "LOCAL_AUTHORED_DESIGNED_VOLUME_CARDS",
      toolchain: {
        binary: "H:/CodexData/souldrifter-toolchain/blender/blender-5.2.1-windows-x64/blender.exe",
        blenderVersion: "5.2.1 LTS",
      },
      source: {
        exactHead: { sha256: HEAD_SHA256 },
        localAuthoredHair: {
          SK_Hair_Parted_Straight: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { silhouetteDraft: "draft11", date: "2026-09-04" },
          },
          SK_Hair_Cropped_Curly: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { status: "PENDING_LIVE_REVIEW" },
          },
          SK_Hair_Cropped_Straight: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { status: "PENDING_LIVE_REVIEW" },
          },
          SK_Hair_Parted_Curly: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { status: "PENDING_LIVE_REVIEW" },
          },
        },
      },
      contract: {
        boneCount: 65,
        headBone: "mixamorig:Head",
        rootBone: "mixamorig:Hips",
        moduleNames: shippedModules,
        requiredModuleNames: expect.arrayContaining([...shippedModules, ...withheldModules]),
      },
      validation: {
        status: "PASS",
        allVerticesHeadWeighted: true,
        visualGate: "PASS_FAIL_CLOSED_PER_MODULE",
        withheldModulesExcluded: true,
      },
      freshImport: {
        status: "PASS",
        meshCount: 2 * shippedModules.length,
        boneCount: 65,
        moduleNames: [...shippedModules].sort(),
        embeddedActionCount: 0,
        approvalMetadataRoundTrips: true,
      },
    });
    expect(Object.keys(provenance.contract.withheldModules).sort()).toEqual([...withheldModules].sort());
    expect(provenance.source.localAuthoredHair.SK_Hair_Parted_Straight.follicleMask.sha256)
      .toBe(module.extras.souldrifterFollicleMaskSha256);
    expect(provenance.output.bytes).toBe(bytes.length);
    expect(provenance.output.sha256).toBe(sha256(bytes));
  });
});
