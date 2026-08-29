import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const assetUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-head-base.glb",
  import.meta.url,
);
const provenanceUrl = new URL(
  "../public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-head-base.provenance.json",
  import.meta.url,
);
const builderUrl = new URL(
  "../scripts/build-human-foundation-modular-head.py",
  import.meta.url,
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function glbJson(bytes) {
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
}

describe("Human foundation modular Quad head", () => {
  it("ships the exact body/head split without embedded actions", () => {
    const bytes = readFileSync(fileURLToPath(assetUrl));
    const json = glbJson(bytes);
    const nodeNames = (json.nodes ?? []).map((node) => node.name);

    expect(nodeNames).toEqual(expect.arrayContaining([
      "HumanFoundation_Armature",
      "HumanFoundation_BodyNoHead",
      "HumanFoundation_HeadBase",
    ]));
    expect(json.animations ?? []).toHaveLength(0);
  });

  it("binds the output to the canonical body and matching seam proof", () => {
    const bytes = readFileSync(fileURLToPath(assetUrl));
    const provenance = JSON.parse(readFileSync(fileURLToPath(provenanceUrl), "utf8"));

    expect(provenance).toMatchObject({
      issue: 487,
      status: "HEAD_FOUNDATION_EXTRACTED",
      route: "BLENDER_QUAD_EXACT_BODY_BISECT",
      source: {
        sha256: "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81",
        taskId: "4a5ad734-7dcc-4184-a0c0-ccfc8a79f15f",
      },
      seam: {
        version: "human-masculine-athletic-neck-v1",
        bodyAndHeadSignaturesMatch: true,
      },
      sourceContract: {
        boneCount: 65,
        rootBone: "mixamorig:Hips",
        uvLayers: ["UVMap"],
      },
      validation: {
        boneCount: 65,
        rootBones: ["mixamorig:Hips"],
        embeddedActionCount: 0,
        seamSignaturesMatch: true,
        status: "PASS",
      },
    });
    expect(provenance.output.sha256).toBe(sha256(bytes));
  });

  it("records the Quad no-spend route in the reusable builder", () => {
    const builder = readFileSync(fileURLToPath(builderUrl), "utf8");

    expect(builder).toContain("Tripo Studio does not segment Quad models");
    expect(builder).toContain("BLENDER_QUAD_EXACT_BODY_BISECT");
    expect(builder).toContain("body/head seam signatures do not match");
    expect(builder).toContain("EXPECTED_SOURCE_SHA256");
  });
});
