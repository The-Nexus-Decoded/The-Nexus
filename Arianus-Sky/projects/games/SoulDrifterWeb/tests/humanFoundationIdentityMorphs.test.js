import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const builderPath = fileURLToPath(
  new URL("../scripts/build-human-foundation-identity-morphs.py", import.meta.url),
);

function runPython(arguments_) {
  const candidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
  for (const executable of candidates) {
    const result = spawnSync(executable, [builderPath, ...arguments_], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error || result.error.code !== "ENOENT") return result;
  }
  throw new Error("No Python interpreter is available for the identity contract test");
}

function contract() {
  const result = runPython(["--command", "contract"]);
  expect(result.status).toBe(0);
  const line = result.stdout
    .split(/\r?\n/u)
    .find((value) => value.startsWith("IDENTITY_MORPH_CONTRACT="));
  expect(line).toBeDefined();
  return JSON.parse(line.slice("IDENTITY_MORPH_CONTRACT=".length));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function serializedGlb(document) {
  const json = Buffer.from(JSON.stringify(document), "utf8");
  const padding = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(padding, 0x20)]);
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length, 8);
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(jsonChunk.length, 0);
  chunkHeader.writeUInt32LE(0x4e4f534a, 4);
  return Buffer.concat([header, chunkHeader, jsonChunk]);
}

describe("Human foundation exact-head identity morph builder", () => {
  it("defines the three exact creator morph names on the neutral Basis", () => {
    expect(contract()).toMatchObject({
      schema: "souldrifter.human-identity-morph-builder-contract.v1",
      issue: 487,
      foundation: "Basis",
      authoredMorphs: [
        "Face_SoftRound",
        "Face_AngularHighCheek",
        "Face_BroadStrong",
      ],
      sourceApproval: {
        schema: "souldrifter.human-head-source-approval.v1",
        status: "PROMOTED_SOURCE_APPROVED_FOR_IDENTITY_AUTHORING",
        scope: "ISSUE_487_HUMAN_IDENTITY_MORPHS",
        authority: "SOULDRIFTER_OWNER",
        required: true,
      },
      output: {
        runtimePromotionMode: false,
        visualQaPassed: false,
      },
    });
  });

  it("uses only hash-locked real targets from the cached CC0 MakeHuman commit", () => {
    const value = contract();
    expect(value.makeHuman).toEqual({
      repository: "https://github.com/makehumancommunity/makehuman.git",
      commit: "a8bc2d54ff0ac92e78ff71431b1023eda42bf482",
      license: "CC0-1.0",
      licenseSha256: "F6089CBA01CB570A24712B41AB8A586CCD3CC5EF53DC266CA50B95C288956D2C",
    });

    expect(value.recipes.Face_SoftRound).toEqual([
      expect.objectContaining({
        target: "head-round",
        path: "makehuman/data/targets/head/head-round.target",
        sha256: "BD96B745B19432AC838F15438AA87E9002F597E59353861721E12E6DA0F2C625",
      }),
    ]);
    expect(value.recipes.Face_AngularHighCheek.map((entry) => entry.target)).toEqual([
      "head-diamond",
      "left-cheek-bones-up",
      "right-cheek-bones-up",
      "left-cheek-position-up",
      "right-cheek-position-up",
    ]);
    expect(value.recipes.Face_BroadStrong.map((entry) => entry.target)).toEqual([
      "head-square",
      "chin-width",
    ]);
    for (const recipe of Object.values(value.recipes)) {
      for (const entry of recipe) expect(entry.sha256).toMatch(/^[A-F0-9]{64}$/u);
    }
  });

  it("fails before Blender or output creation when owner approval is absent", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "souldrifter-identity-gate-"));
    try {
      const fakeSource = join(temporaryRoot, "unapproved-source.glb");
      const forbiddenOutput = join(temporaryRoot, "must-not-exist");
      const bytes = Buffer.from("approval must fail before GLB parsing", "utf8");
      writeFileSync(fakeSource, bytes);
      const result = runPython([
        "--command",
        "build-candidate",
        "--source-glb",
        fakeSource,
        "--source-sha256",
        sha256(bytes),
        "--output-dir",
        forbiddenOutput,
      ]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--source-approval-receipt is required");
      expect(result.stderr).toContain("FAIL_CLOSED_NO_RUNTIME_OUTPUT");
      expect(existsSync(forbiddenOutput)).toBe(false);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("accepts clean serialized runtime meshes but rejects a serialized helper", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "souldrifter-identity-glb-audit-"));
    try {
      const cleanSource = join(temporaryRoot, "clean.glb");
      const cleanBytes = serializedGlb({
        asset: { version: "2.0" },
        nodes: [{ name: "HumanFoundation_HeadBase", mesh: 0 }],
        meshes: [{ name: "HumanFoundation_HeadBaseMesh", primitives: [] }],
      });
      writeFileSync(cleanSource, cleanBytes);
      const clean = runPython([
        "--command",
        "audit-serialized-source",
        "--source-glb",
        cleanSource,
        "--source-sha256",
        sha256(cleanBytes),
      ]);
      expect(clean.status).toBe(0);
      const cleanLine = clean.stdout
        .split(/\r?\n/u)
        .find((value) => value.startsWith("IDENTITY_MORPH_SERIALIZED_SOURCE_AUDIT="));
      const cleanAudit = JSON.parse(
        cleanLine.slice("IDENTITY_MORPH_SERIALIZED_SOURCE_AUDIT=".length),
      );
      expect(cleanAudit.serializedSource).toMatchObject({
        meshCount: 1,
        serializedHelperMeshes: [],
        serializedCameraCount: 0,
        serializedPunctualLightCount: 0,
      });

      const helperSource = join(temporaryRoot, "serialized-helper.glb");
      const helperBytes = serializedGlb({
        asset: { version: "2.0" },
        nodes: [{ name: "DebugHelper", mesh: 0 }],
        meshes: [{ name: "DebugHelperMesh", primitives: [] }],
      });
      writeFileSync(helperSource, helperBytes);
      const helper = runPython([
        "--command",
        "audit-serialized-source",
        "--source-glb",
        helperSource,
        "--source-sha256",
        sha256(helperBytes),
      ]);
      expect(helper.status).toBe(2);
      expect(helper.stderr).toContain("serialized GLB contains helper meshes");
      expect(helper.stderr).toContain("DebugHelper");
      expect(helper.stderr).toContain("FAIL_CLOSED_NO_RUNTIME_OUTPUT");
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("preserves facial/age morphs, seam, and cavity while keeping readiness blocked", () => {
    const builder = readFileSync(builderPath, "utf8");

    expect(builder).toContain("preExistingFacialAndAgeMorphsPreserved");
    expect(builder).toContain("neckSeamPreserved");
    expect(builder).toContain("oralCavityProtected");
    expect(builder).toContain("PASS_STRUCTURAL_FRESH_IMPORT");
    expect(builder).toContain("COMMON.serialized_glb_contract");
    expect(builder).toContain("importerOnlyHelpers");
    expect(builder).toContain(
      'head["souldrifterFacialReadiness"] = "IDENTITY_MORPH_VISUAL_QA_PENDING"',
    );
    expect(builder).toContain('"runtimePromotionModeAvailable": False');
    expect(builder).not.toContain("human-foundation-pilot-runtime-4k.glb");
  });
});
