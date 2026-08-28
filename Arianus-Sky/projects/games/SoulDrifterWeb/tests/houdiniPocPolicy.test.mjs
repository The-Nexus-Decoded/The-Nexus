import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const root = process.cwd();
const houdiniDirectory = path.join(root, "scripts", "houdini");
const approvedTestDirectory = "H:/temp/SoulDrifter-Houdini-POC/policy-test";

afterAll(() => {
  fs.rmSync(approvedTestDirectory, { force: true, recursive: true });
});

describe("Houdini Apprentice POC policy", () => {
  it("accepts only Apprentice and output below the approved non-shipping root", () => {
    const program = [
      "from pathlib import Path",
      "from poc_output_policy import approved_output_directory, require_apprentice_license",
      "require_apprentice_license('Apprentice')",
      `print(approved_output_directory(Path(${JSON.stringify(approvedTestDirectory)})))`,
    ].join("\n");
    const result = spawnSync("python", ["-c", program], { cwd: houdiniDirectory, encoding: "utf8" });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("SoulDrifter-Houdini-POC");
  });

  it("rejects other license categories and arbitrary output roots", () => {
    for (const program of [
      "from poc_output_policy import require_apprentice_license; require_apprentice_license('Indie')",
      "from pathlib import Path; from poc_output_policy import approved_output_directory; approved_output_directory(Path('C:/temp/unapproved'))",
    ]) {
      const result = spawnSync("python", ["-c", program], { cwd: houdiniDirectory, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("RuntimeError");
    }
  });

  it("derives the vestibule occlusion receipt from cooked geometry evidence", () => {
    const vestibule = fs.readFileSync(path.join(houdiniDirectory, "build-soulwell-vestibule-fx-poc.py"), "utf8");
    const exitWater = fs.readFileSync(path.join(houdiniDirectory, "build-soulwell-exit-water-poc.py"), "utf8");

    expect(vestibule).toContain('geo.addAttrib(hou.attribType.Global, "surface_opacity", 1.0)');
    expect(vestibule).toContain('frame["occlusionEvidence"]["surfaceOpacity"] >= 0.999');
    expect(vestibule).toContain('frame["occlusionEvidence"]["centerCovered"]');
    expect(vestibule).toContain('frame["occlusionEvidence"]["radialCoverage"] >= 0.95');
    expect(vestibule).not.toContain('"bottomOcclusionContract": True');
    expect(exitWater).not.toContain('"nonCommercialArtifactsSegregated": True');
    expect(vestibule).not.toContain('"nonCommercialArtifactsSegregated": True');
  });
});
