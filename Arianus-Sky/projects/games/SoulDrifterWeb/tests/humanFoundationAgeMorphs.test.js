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
  new URL("../scripts/build-human-foundation-age-morphs.py", import.meta.url),
);

function runPython(arguments_) {
  const candidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
  for (const executable of candidates) {
    const result = spawnSync(executable, [builderPath, ...arguments_], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error || result.error.code !== "ENOENT") {
      return result;
    }
  }
  throw new Error("No Python interpreter is available for the age-morph contract test");
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

describe("Human foundation exact-head age morph builder", () => {
  it("defines Young Adult as Basis and only the two canonical runtime morphs", () => {
    const result = runPython(["--command", "contract"]);
    expect(result.status).toBe(0);
    const line = result.stdout
      .split(/\r?\n/u)
      .find((value) => value.startsWith("AGE_MORPH_CONTRACT="));
    expect(line).toBeDefined();
    const contract = JSON.parse(line.slice("AGE_MORPH_CONTRACT=".length));

    expect(contract).toMatchObject({
      schema: "souldrifter.human-age-morph-builder-contract.v1",
      issue: 487,
      youngAdult: "Basis",
      authoredMorphs: ["Age_Middle", "Age_Elder"],
      weights: { Age_Middle: 0.5, Age_Elder: 1 },
      sourceApproval: {
        schema: "souldrifter.human-head-source-approval.v1",
        status: "PROMOTED_SOURCE_APPROVED_FOR_AGE_AUTHORING",
        scope: "ISSUE_487_HUMAN_AGE_MORPHS",
        authority: "SOULDRIFTER_OWNER",
        required: true,
      },
      output: {
        runtimePromotionMode: false,
        visualQaPassed: false,
      },
    });
  });

  it("locks the official cached MakeHuman CC0 source receipt", () => {
    const result = runPython(["--command", "contract"]);
    const line = result.stdout
      .split(/\r?\n/u)
      .find((value) => value.startsWith("AGE_MORPH_CONTRACT="));
    const contract = JSON.parse(line.slice("AGE_MORPH_CONTRACT=".length));

    expect(contract.makeHuman).toEqual({
      repository: "https://github.com/makehumancommunity/makehuman.git",
      commit: "a8bc2d54ff0ac92e78ff71431b1023eda42bf482",
      license: "CC0-1.0",
      licenseSha256: "F6089CBA01CB570A24712B41AB8A586CCD3CC5EF53DC266CA50B95C288956D2C",
      ageTarget: "makehuman/data/targets/head/head-age-incr.target",
      ageTargetSha256: "FF677345BD81E3F439BDF75496BBEE620CA3C3F029955A546837AFD283ABF73A",
    });
  });

  it("fails before Blender or any output write when owner approval is absent", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "souldrifter-age-gate-"));
    try {
      const fakeSource = join(temporaryRoot, "unapproved-source.glb");
      const forbiddenOutput = join(temporaryRoot, "must-not-exist");
      const bytes = Buffer.from("not a GLB; approval must fail before Blender import", "utf8");
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
    const temporaryRoot = mkdtempSync(join(tmpdir(), "souldrifter-age-glb-audit-"));
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
        .find((value) => value.startsWith("AGE_MORPH_SERIALIZED_SOURCE_AUDIT="));
      const cleanAudit = JSON.parse(
        cleanLine.slice("AGE_MORPH_SERIALIZED_SOURCE_AUDIT=".length),
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

  it("keeps seam/cavity/fresh-import gates and has no runtime promotion path", () => {
    const builder = readFileSync(builderPath, "utf8");

    expect(builder).toContain("assert_topology_approval");
    expect(builder).toContain("REQUIRED_CAVITY_OBJECTS");
    expect(builder).toContain("neckSeamPreserved");
    expect(builder).toContain("oralCavityProtected");
    expect(builder).toContain("PASS_STRUCTURAL_FRESH_IMPORT");
    expect(builder).toContain("serialized_glb_contract");
    expect(builder).toContain("importerOnlyHelpers");
    expect(builder).toContain("BLENDER_GLTF_IMPORTER_ONLY_NOT_SERIALIZED");
    expect(builder).toContain('head["souldrifterFacialReadiness"] = "AGE_MORPH_VISUAL_QA_PENDING"');
    expect(builder).toContain('"runtimePromotionModeAvailable": False');
    expect(builder).not.toContain("human-foundation-pilot-runtime-4k.glb");
  });
});
