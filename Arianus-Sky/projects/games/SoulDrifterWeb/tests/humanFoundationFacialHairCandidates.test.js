import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const builderPath = fileURLToPath(
  new URL(
    "../scripts/build-human-foundation-facial-hair-candidates.py",
    import.meta.url,
  ),
);

function runPython(arguments_) {
  const candidates =
    process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
  for (const executable of candidates) {
    const result = spawnSync(executable, [builderPath, ...arguments_], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error || result.error.code !== "ENOENT") {
      return result;
    }
  }
  throw new Error(
    "No Python interpreter is available for the facial-hair candidate contract test",
  );
}

function contract() {
  const result = runPython(["--command", "contract"]);
  expect(result.status).toBe(0);
  const line = result.stdout
    .split(/\r?\n/u)
    .find((value) => value.startsWith("FACIAL_HAIR_CONTRACT="));
  expect(line).toBeDefined();
  return JSON.parse(line.slice("FACIAL_HAIR_CONTRACT=".length));
}

describe("Human foundation quarantined facial-hair candidate builder", () => {
  it("defines the five required real candidate families", () => {
    const value = contract();

    expect(value.schema).toBe(
      "souldrifter.human-facial-hair-candidate-builder.v2",
    );
    expect(value.issue).toBe(487);
    expect(Object.keys(value.styles).sort()).toEqual([
      "full-beard",
      "goatee",
      "moustache",
      "short-beard",
      "stubble",
    ]);
    expect(
      Object.values(value.styles)
        .map((style) => style.runtimeName)
        .sort(),
    ).toEqual(["FULL_BEARD", "GOATEE", "MOUSTACHE", "SHORT_BEARD", "STUBBLE"]);
    for (const style of Object.values(value.styles)) {
      expect(style.references.length).toBeGreaterThan(0);
      expect(style.strandCount).toBeGreaterThan(0);
    }
  });

  it("locks the rejected exact-head SHA and zero-mask replacement gate", () => {
    const value = contract();

    expect(value.exactHead).toMatchObject({
      sha256:
        "51A1C57B4CB5DE1CD4972EFFDF4A55EC5446AFC3B41220C9E6FEC747E189B49F",
      status: "QUARANTINED_SURGICAL_PROOF_NOT_PROMOTED",
      textureBaselineStatus: "REJECTED_CORRUPTED_LOWER_FACE_UV",
      resumeGate:
        "REQUIRES_NEW_NEUTRAL_TEXTURED_HEAD_SHA_AND_ZERO_MASK_BASE_TEXTURE_EQUIVALENCE",
    });
    expect(value.stubble).toEqual({
      method: "CANONICAL_UV_MATERIAL_DENSITY_MASK_PLUS_SPARSE_MICROFIBERS",
      channels: ["albedo", "roughness", "microheight"],
      zeroMaskBaseTextureEquivalenceRequired: true,
      zeroMaskBaseTextureEquivalencePassed: false,
    });
  });

  it("keeps strand geometry surface-following and all output quarantined", () => {
    const value = contract();

    expect(value.geometry).toMatchObject({
      kind: "DETERMINISTIC_TAPERED_SURFACE_FOLLOWING_STRANDS",
      rootSource: "EXACT_HEAD_SKIN_TRIANGLES",
      floatingCapsOrShelvesAllowed: false,
    });
    expect(value.geometry.maximumRootDistanceMeters).toBeGreaterThan(0);
    expect(value.visualProof.visualQaPassed).toBe(false);
    expect(value.motionProof.jawAndViseme).toBe(
      "BLOCKED_UNTIL_FINAL_PROMOTED_HEAD_SHA",
    );
    expect(value.output).toMatchObject({
      quarantined: true,
      integrationModeAvailable: false,
      promotionModeAvailable: false,
    });
  });

  it("fails before Blender and output generation for the corrupted UV baseline", () => {
    const result = runPython(["--command", "build", "--styles", "stubble"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("FAIL_CLOSED_NO_INTEGRATION_NO_PROMOTION");
    expect(result.stderr).toContain("REJECTED_CORRUPTED_LOWER_FACE_UV");
    expect(result.stderr).toContain(
      "REQUIRES_NEW_NEUTRAL_TEXTURED_HEAD_SHA_AND_ZERO_MASK_BASE_TEXTURE_EQUIVALENCE",
    );
    expect(result.stderr).not.toContain("cached Blender");
    expect(result.stderr).not.toContain("cached ffmpeg");
  });

  it("retains structural fresh-import gates without a runtime asset path", () => {
    const builder = readFileSync(builderPath, "utf8");

    expect(builder).toContain("BVHTree");
    expect(builder).toContain("KDTree");
    expect(builder).toContain("maximumRootDistanceMeters");
    expect(builder).toContain("PASS_STRUCTURAL_FRESH_IMPORT");
    expect(builder).toContain("serializedHelperMeshes");
    expect(builder).toContain('"runtimeIntegrated": False');
    expect(builder).not.toContain("human-foundation-pilot-runtime-4k.glb");
  });
});
