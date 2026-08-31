import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const gameRoot = fileURLToPath(new URL("../", import.meta.url));
const run = (script) => execFileSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}`, import.meta.url))], {
  cwd: gameRoot,
  encoding: "utf8",
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
const report = (name) => JSON.parse(readFileSync(new URL(`../node_modules/.cache/weapon-lab-qa/${name}`, import.meta.url), "utf8"));

describe("portable weapon-lab numerical verification", () => {
  it("preserves original actions and 400 clips while validating staff, mace and every armed gait family", () => {
    const output = run("verify-weapon-lab-staff.mjs");
    expect(output).toContain('"sourceClips":400');
    const coverage = report("armed-locomotion/coverage.json");
    expect(coverage.coverage).toHaveLength(10);
    expect(coverage.sourceClipsUnchanged).toBe(true);
    expect(coverage.sharedGaitChannelsUnchanged).toBe(true);
    const balance = report("staff-grip-pass/staff-balance-proof.json");
    expect(balance.balancedSamples).toBeGreaterThan(1900);
    expect(balance.maxBalanceError).toBeLessThan(1e-6);
  }, 150_000);

  it("validates the five genuine Mixamo exports against the canonical 65-bone rest hierarchy", () => {
    run("verify-weapon-lab-locomotion.mjs");
    const locomotion = report("locomotion-extras/numerical-proof.json");
    expect(locomotion.originalClips).toBe(400);
    expect(locomotion.addedClips).toBe(5);
    expect(locomotion.exactRestHierarchyMatch).toBe(true);
    expect(locomotion.rows.reduce((sum, row) => sum + row.sampledPoses, 0)).toBe(155);
    expect(locomotion.meshes).toBe(0);
  }, 150_000);
});
