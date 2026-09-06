import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The pack ships as one file per module behind a manifest, because hair is picked once at profile
// creation and nobody should download twenty styles to wear one.
const modulesUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/appearance-modules/",
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
const shippedModules = [
  "SK_Hair_Cropped_Straight", "SK_Hair_Cropped_Curly",
  "SK_Hair_Fade_Straight", "SK_Hair_Fade_Curly",
  "SK_Hair_Parted_Straight", "SK_Hair_Parted_Curly",
  "SK_Hair_Afro_Curly",
  "SK_Hair_Cornrows_Straight", "SK_Hair_Cornrows_Curly",
  "SK_Hair_Locs_Straight", "SK_Hair_Locs_Curly",
  "SK_Hair_Twists_Curly",
  "SK_Hair_Bun_Straight", "SK_Hair_Bun_Curly",
  "SK_Hair_TiedBack_Straight", "SK_Hair_TiedBack_Curly",
  "SK_Hair_Braided_Straight", "SK_Hair_Braided_Curly",
  "SK_Hair_Long_Straight", "SK_Hair_Long_Curly",
];
const HAIR_STYLE_MODULES = ["Cropped", "Fade", "Parted", "Afro", "Cornrows", "Locs", "Twists", "Bun", "TiedBack", "Braided", "Long"];
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

const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("manifest.json", modulesUrl)), "utf8"));
const packs = Object.fromEntries(manifest.modules.map((entry) => {
  const bytes = readFileSync(fileURLToPath(new URL(entry.file, modulesUrl)));
  const { json, bin } = glb(bytes);
  return [entry.name, {
    entry,
    bytes,
    json,
    bin,
    node: (json.nodes ?? []).find((node) => node.name === entry.name),
  }];
}));
const parted = packs.SK_Hair_Parted_Straight;

describe("Human foundation modular appearance pack", () => {
  it("offers every locally validated module through the manifest, and nothing that was withheld", () => {
    expect(manifest.version).toBeGreaterThan(0);
    expect(manifest.basePath).toBe("/assets/3d/characters/human-foundation-pilot/appearance-modules");
    expect(manifest.modules.map((entry) => entry.name).sort()).toEqual([...shippedModules].sort());
    for (const withheld of withheldModules) expect(Object.keys(packs)).not.toContain(withheld);
    for (const entry of manifest.modules) {
      const pack = packs[entry.name];
      expect(pack.bytes.length, entry.name).toBe(entry.bytes);
      expect(sha256(pack.bytes), entry.name).toBe(entry.sha256);
      expect(entry.vertices).toBeGreaterThan(0);
      expect(entry.extras).toMatchObject({
        souldrifterApprovalStatus: "LOCAL_AUTHORING_VALIDATED",
        souldrifterHeadBone: "mixamorig:Head",
      });
    }
    // one shared copy of each atlas, referenced by URI rather than embedded twenty times
    for (const texture of manifest.textures) {
      expect(existsSync(fileURLToPath(new URL(texture.file, modulesUrl))), texture.file).toBe(true);
    }
  });

  it("gives every module its own file carrying only its own two meshes and the whole skeleton", () => {
    for (const name of shippedModules) {
      const { json, node } = packs[name];
      expect(node, name).toBeDefined();
      expect(node.extras).toMatchObject({
        souldrifterApprovalStatus: "LOCAL_AUTHORING_VALIDATED",
        souldrifterHeadBone: "mixamorig:Head",
      });
      const children = (node.children ?? []).map((index) => json.nodes[index]);
      expect(children.map((child) => child.name).sort()).toEqual([`${name}_Cards`, `${name}_Mass`]);
      for (const child of children) {
        expect(child.mesh).toBeTypeOf("number");
        expect(child.skin).toBe(0);
        // presentation.ts refuses a module that carries its own scalp/underlay
        expect(child.name).not.toMatch(/scalp|rootcap|undercoat|underlay/i);
      }
      // the file is one module's worth of geometry, not the catalogue
      expect(json.meshes, name).toHaveLength(2);
      expect(json.meshes.every((mesh) => mesh.name.startsWith(name)), name).toBe(true);
      // and it still rebinds against the canonical rig on its own
      expect(json.skins, name).toHaveLength(1);
      expect(json.skins[0].joints, name).toHaveLength(65);
      expect(json.animations ?? [], name).toHaveLength(0);
      expect(json.asset.extras.souldrifterModule, name).toBe(name);
      for (const other of shippedModules.filter((entry) => entry !== name)) {
        expect(json.nodes.map((entry) => entry.name), name).not.toContain(other);
      }
    }
  });

  it("weights every hair vertex fully to mixamorig:Head", { timeout: 60_000 }, () => {
    for (const name of shippedModules) {
      const { json, bin } = packs[name];
      const headJoint = json.skins[0].joints.findIndex((index) => json.nodes[index].name === "mixamorig:Head");
      expect(headJoint, name).toBeGreaterThanOrEqual(0);
      for (const mesh of json.meshes) {
        for (const primitive of mesh.primitives) {
          for (const attribute of ["POSITION", "NORMAL", "TEXCOORD_0", "TANGENT", "JOINTS_0", "WEIGHTS_0"]) {
            expect(primitive.attributes, `${mesh.name} ${attribute}`).toHaveProperty(attribute);
          }
          // Blender's duplicate colour set is dropped on the way out; only COLOR_0 is read.
          expect(primitive.attributes, mesh.name).not.toHaveProperty("COLOR_1");
          const weightAccessor = json.accessors[primitive.attributes.WEIGHTS_0];
          expect(weightAccessor.componentType, mesh.name).toBe(5121);
          expect(weightAccessor.normalized, mesh.name).toBe(true);
          const joints = readAccessor(json, bin, primitive.attributes.JOINTS_0);
          const weights = readAccessor(json, bin, primitive.attributes.WEIGHTS_0);
          expect(joints.count).toBe(weights.count);
          for (let vertex = 0; vertex < joints.count; vertex += 1) {
            for (let slot = 0; slot < 4; slot += 1) {
              const weight = weights.values[vertex * 4 + slot] / 255;
              const joint = joints.values[vertex * 4 + slot];
              if (weight > 1e-4) {
                expect(joint, `${mesh.name} vertex ${vertex}`).toBe(headJoint);
                expect(weight).toBeCloseTo(1, 2);
              }
            }
          }
        }
      }
    }
  });

  function vertexAlphaStats(moduleName, meshName) {
    const { json, bin } = packs[moduleName];
    const mesh = json.meshes.find((entry) => entry.name === meshName);
    const primitive = mesh.primitives[0];
    expect(primitive.attributes, meshName).toHaveProperty("COLOR_0");
    const color = readAccessor(json, bin, primitive.attributes.COLOR_0);
    expect(color.size).toBe(4);
    const max = { 5126: 1, 5123: 65535, 5121: 255 }[json.accessors[primitive.attributes.COLOR_0].componentType];
    let feathered = 0;
    let opaque = 0;
    let alphaSum = 0;
    for (let vertex = 0; vertex < color.count; vertex += 1) {
      const alpha = color.values[vertex * 4 + 3] / max;
      alphaSum += alpha;
      if (alpha < 0.99) feathered += 1;
      else opaque += 1;
    }
    return { count: color.count, feathered, opaque, meanAlpha: alphaSum / color.count };
  }

  it("feathers each mass at the hairline through vertex alpha", () => {
    for (const name of shippedModules) {
      const stats = vertexAlphaStats(name, `${name}_Mass`);
      // a hairline transition exists at all
      expect(stats.feathered, name).toBeGreaterThan(200);
      // and the mass is not wholesale transparent: some of it is solid hair. Styles that show
      // scalp by design (cornrows part between rows) are mostly feathered, which is correct.
      expect(stats.opaque, name).toBeGreaterThan(stats.count * 0.02);
    }
  });

  it.each(["SK_Hair_Cropped_Curly", "SK_Hair_Parted_Curly", "SK_Hair_Fade_Curly", "SK_Hair_Afro_Curly"])("stacks %s's fur shells with a falling vertex alpha so alphaCutoff thins them outward", (moduleName) => {
    const stats = vertexAlphaStats(moduleName, `${moduleName}_Cards`);
    // Five shells, each a copy of the ~6.4k-vertex welded scalp, every vertex carrying its
    // shell's coverage. The mass itself is not the reference: a parted module refines its own
    // mass along the part line, so its vertex count no longer matches the shells' base.
    expect(stats.count).toBeGreaterThan(4 * 6000);
    expect(stats.feathered).toBe(stats.count);
    expect(stats.meanAlpha).toBeGreaterThan(0.4);
    expect(stats.meanAlpha).toBeLessThan(0.85);
  });

  it("uses alpha-tested, double-sided, tintable hair materials with anisotropy", () => {
    for (const name of shippedModules) {
      const { json } = packs[name];
      const stem = name.replace("SK_Hair_", "");
      // one tintable cards material and one mass material, and nobody else's
      expect(json.materials.map((material) => material.name).sort()).toEqual(
        [`MAT_HumanHair_Tintable_${stem}_Cards`, `MAT_HumanHair_Tintable_${stem}_Mass`].sort(),
      );
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
      // atlases live beside the modules so twenty styles share one download, not twenty copies
      expect(json.images.length, name).toBeGreaterThan(0);
      expect(json.images.length, name).toBeLessThanOrEqual(2);
      for (const image of json.images) {
        expect(image.bufferView, name).toBeUndefined();
        expect(image.uri, name).toMatch(/\.png$/);
        expect(manifest.textures.map((texture) => texture.file)).toContain(image.uri);
      }
    }
  });

  it("ships the approved follicle mask its extras point at", () => {
    for (const name of shippedModules) {
      expect(packs[name].node.extras.souldrifterFollicleMaskSha256, name)
        .toBe(parted.node.extras.souldrifterFollicleMaskSha256);
    }
    expect(parted.node.extras).toMatchObject({
      souldrifterFollicleMaskStatus: "LOCAL_AUTHORING_VALIDATED",
      souldrifterFollicleMaskUrl: "/assets/3d/characters/human-foundation-pilot/follicle-masks/hair-parted-scalp-v1.png",
      souldrifterFollicleMaskUvSet: "UVMap",
      souldrifterFollicleMaskSourceHeadSha256: HEAD_SHA256,
    });
    expect(parted.node.extras.souldrifterFollicleUndercoatStrength).toBeGreaterThan(0);
    expect(parted.node.extras.souldrifterFollicleUndercoatStrength).toBeLessThanOrEqual(0.3);
    const mask = readFileSync(fileURLToPath(follicleMaskUrl));
    expect(mask.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(sha256(mask)).toBe(parted.node.extras.souldrifterFollicleMaskSha256);
  });

  it("keeps every module small enough to ship and to fetch on demand", () => {
    // GitHub refuses a file over 100 MB, and a phone on mobile data pays for whatever is picked.
    for (const entry of manifest.modules) {
      expect(entry.bytes, entry.name).toBeLessThan(90 * 1024 * 1024);
    }
    const total = manifest.modules.reduce((sum, entry) => sum + entry.bytes, 0);
    // the single-file pack this replaced was 177 MB, every byte of it loaded to show one style
    expect(total).toBeLessThan(160 * 1024 * 1024);
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
          SK_Hair_Fade_Straight: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { status: "PENDING_LIVE_REVIEW" },
          },
          SK_Hair_Fade_Curly: {
            license: "PROJECT_ORIGINAL",
            sourceHeadSha256: HEAD_SHA256,
            ownerApproval: { status: "PENDING_LIVE_REVIEW" },
          },
          SK_Hair_Afro_Curly: {
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
      output: {
        layout: "PER_MODULE_ON_DEMAND",
        basePath: "/assets/3d/characters/human-foundation-pilot/appearance-modules",
        moduleCount: shippedModules.length,
      },
    });
    // the pack records modules in build order, so compare the set rather than the sequence
    expect([...provenance.contract.moduleNames].sort()).toEqual([...shippedModules].sort());
    expect(Object.keys(provenance.contract.withheldModules).sort()).toEqual([...withheldModules].sort());
    expect(provenance.source.localAuthoredHair.SK_Hair_Parted_Straight.follicleMask.sha256)
      .toBe(parted.node.extras.souldrifterFollicleMaskSha256);

    // every shipped file is accounted for byte for byte, and the manifest with it
    expect(Object.keys(provenance.output.modules).sort()).toEqual([...shippedModules].sort());
    for (const name of shippedModules) {
      const record = provenance.output.modules[name];
      expect(record.bytes, name).toBe(packs[name].bytes.length);
      expect(record.sha256, name).toBe(sha256(packs[name].bytes));
      expect(record.file, name).toBe(packs[name].entry.file);
    }
    const manifestBytes = readFileSync(fileURLToPath(new URL("manifest.json", modulesUrl)));
    expect(provenance.output.manifest.bytes).toBe(manifestBytes.length);
    expect(provenance.output.manifest.sha256).toBe(sha256(manifestBytes));
    for (const texture of provenance.output.sharedTextures) {
      const bytes = readFileSync(fileURLToPath(new URL(texture.file, modulesUrl)));
      expect(bytes.length, texture.file).toBe(texture.bytes);
      expect(sha256(bytes), texture.file).toBe(texture.sha256);
    }
  });
});
