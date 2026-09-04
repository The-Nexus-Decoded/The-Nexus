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

const withheldModules = [
  "SK_Hair_Cropped",
  "SK_Hair_Parted",
  "SK_Hair_CurlyCoiled",
  "SK_Hair_Long",
  "SK_Hair_TiedBack",
  "SK_Hair_Braided",
  "SK_FacialHair_Stubble",
  "SK_FacialHair_Moustache",
  "SK_FacialHair_Goatee",
  "SK_FacialHair_ShortBeard",
  "SK_FacialHair_FullBeard",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function glbJson(bytes) {
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
}

describe("Human foundation modular appearance quarantine pack", () => {
  it("fails closed to the canonical armature after the live visual rejection", () => {
    const json = glbJson(readFileSync(fileURLToPath(assetUrl)));
    const nodes = json.nodes ?? [];
    const meshNodes = nodes.filter((node) => Number.isInteger(node.mesh));

    expect(meshNodes).toHaveLength(0);
    expect(nodes.map((node) => node.name)).not.toEqual(
      expect.arrayContaining(withheldModules),
    );
    expect(json.skins).toHaveLength(1);
    expect(json.skins[0].joints).toHaveLength(65);
    expect(json.animations ?? []).toHaveLength(0);
    expect(json.meshes ?? []).toHaveLength(0);
    expect(json.materials ?? []).toHaveLength(0);
  });

  it("records exact source/toolchain provenance and fail-closed dispositions", () => {
    const bytes = readFileSync(fileURLToPath(assetUrl));
    const provenance = JSON.parse(readFileSync(fileURLToPath(provenanceUrl), "utf8"));

    expect(provenance).toMatchObject({
      issue: 487,
      status: "LOCAL_MODULAR_APPEARANCE_QUARANTINED",
      ownerReviewStatus: "OWNER_LIVE_REJECTION_RECORDED",
      route: "FAIL_CLOSED_REBUILD_IN_PROGRESS",
      toolchain: {
        binary: "H:/CodexData/souldrifter-toolchain/blender/blender-5.2.1-windows-x64/blender.exe",
        blenderVersion: "5.2.1 LTS",
      },
      source: {
        exactHead: {
          sha256: "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8",
        },
        makeHumanSystemPack: {
          license: "CC0-1.0",
          archiveSha256: "B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107",
        },
      },
      contract: {
        boneCount: 65,
        headBone: "mixamorig:Head",
        rootBone: "mixamorig:Hips",
        moduleNames: [],
        requiredModuleNames: withheldModules,
      },
      validation: {
        status: "PASS",
        visualGate: "PASS_FAIL_CLOSED_PER_MODULE",
        withheldModulesExcluded: true,
      },
      freshImport: {
        status: "PASS",
        meshCount: 0,
        boneCount: 65,
        moduleNames: [],
        embeddedActionCount: 0,
        approvalMetadataRoundTrips: true,
      },
    });
    expect(Object.keys(provenance.contract.withheldModules).sort()).toEqual(
      [...withheldModules].sort(),
    );
    expect(provenance.validation.withheldModulesExcluded).toBe(true);
    expect(provenance.output.bytes).toBe(bytes.length);
    expect(provenance.output.sha256).toBe(sha256(bytes));
  });
});
