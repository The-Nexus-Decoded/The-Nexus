import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const plan = JSON.parse(readFileSync(new URL("../docs/3d-ai-studio/issue-458/cinderbound-warden-motion-v2/attack-plan.json", import.meta.url), "utf8"));
const authorSource = readFileSync(new URL("../scripts/author-warden-motion-v2.py", import.meta.url), "utf8");
const renderSource = readFileSync(new URL("../scripts/render-warden-motion-v2.py", import.meta.url), "utf8");
const verifySource = readFileSync(new URL("../scripts/verify-warden-motion-v2.mjs", import.meta.url), "utf8");
const expected = ["AshCall", "BladeSweep", "CinderSweep", "DeathCollapse", "FurnaceShutdown", "PalmFire", "SoulTax"];

describe("source-grounded Warden motion-v2 plan", () => {
  it("pins the real four-mechanic design board without calling it a recovered eight-pose sheet", () => {
    expect(plan.status).toBe("new-source-grounded-proposal-not-motion-approval");
    expect(plan.designReference).toEqual(expect.objectContaining({
      sha256: "6d6be3c5a44f5850be43d3e74fe20a11e8e465e55a21ebaa0fa27d627e50a859",
      mechanics: ["CINDER-SWEEP", "ASH-CALL", "SOUL-TAX", "FURNACE SHUTDOWN"],
    }));
    expect(plan.rules.forbiddenClaims).toContain("recovered approved eight-pose sheet");
  });

  it("defines the exact owned 18-bone mechanical contract and seven shared motions", () => {
    expect(plan.boneContract).toHaveLength(18);
    expect(new Set(plan.boneContract).size).toBe(18);
    expect(plan.clips.map(({ name }) => name).sort()).toEqual(expected);
  });

  it("supports fail-closed single-clip iteration without duplicating the authoring path", () => {
    expect(authorSource).toContain('parser.add_argument("--clip")');
    expect(authorSource).toContain('clip["name"] == options.clip');
    expect(authorSource).toContain("Requested Warden clip");
    expect(authorSource).toContain('replacements = {clip["name"] for clip in selected_clips}');
    expect(authorSource).toContain('0.00001 if clip["name"] == "DeathCollapse" else 0.0');
    expect(renderSource).toContain('parser.add_argument("--clip")');
    expect(renderSource).toContain('clip["name"] == options.clip');
    expect(renderSource).toContain("Requested Warden render clip");
  });

  it("pins source integrity and dense body-contact gates before Warden promotion", () => {
    expect(verifySource).toContain('candidate.bin.subarray(0, source.bin.length).equals(source.bin)');
    expect(verifySource).toContain('denseReplayHz: 240');
    expect(verifySource).toContain('DeathCollapse torso mass remains suspended');
    expect(verifySource).toContain('DeathCollapse torso median remains too upright');
    expect(verifySource).toContain('DeathCollapse torso centroid remains too upright');
    expect(verifySource).toContain('maximumFloorClearance <= 0.003');
  });

  it("gives every motion exactly eight ordered named phases with no scale or hidden channel edits", () => {
    for (const clip of plan.clips) {
      expect(clip.phases).toHaveLength(8);
      expect(clip.phases[0].frame).toBe(1);
      expect(clip.phases.at(-1).frame).toBe(clip.durationFrames);
      expect(clip.phases.map(({ frame }) => frame)).toEqual([...clip.phases.map(({ frame }) => frame)].sort((a, b) => a - b));
      expect(new Set(clip.phases.map(({ id }) => id)).size).toBe(8);
      for (const phase of clip.phases) for (const [bone, channels] of Object.entries(phase.bones)) {
        expect(plan.boneContract).toContain(bone);
        expect(Object.keys(channels).every((key) => key === "rotation" || key === "location")).toBe(true);
        if (channels.rotation) expect(channels.rotation).toHaveLength(3);
        if (channels.location) expect(channels.location).toHaveLength(3);
      }
    }
  });

  it("drives melee contacts forward and keeps named ranged/state mechanics distinct", () => {
    for (const name of ["BladeSweep", "CinderSweep"]) {
      const clip = plan.clips.find((value) => value.name === name);
      const peak = Math.max(...clip.phases.map((phase) => phase.bones.root?.location?.[0] ?? 0));
      expect(peak).toBeGreaterThan(name === "CinderSweep" ? .6 : .35);
      expect(clip.phases.some(({ id }) => id.includes("contact"))).toBe(true);
    }
    expect(plan.clips.find(({ name }) => name === "PalmFire").semantic).toBe("ranged");
    expect(plan.clips.find(({ name }) => name === "SoulTax").semantic).toBe("siphon");
    expect(plan.clips.find(({ name }) => name === "FurnaceShutdown").semantic).toBe("vulnerability");
    expect(plan.clips.find(({ name }) => name === "DeathCollapse").semantic).toBe("death");
  });

  it("reserves root Y for the actual-surface grounding bake and never leaks lowering into depth", () => {
    expect(plan.rules.rootLocationSpace).toMatch(/X is forward and Y is vertical/);
    expect(plan.rules.surfaceGrounding).toMatch(/actual four-mesh surface contact.*no runtime grounding/);
    const rootLocations = plan.clips.flatMap((clip) => clip.phases
      .map((phase) => ({ clip: clip.name, id: phase.id, value: phase.bones.root?.location }))
      .filter(({ value }) => value));
    expect(rootLocations.every(({ value }) => value[2] === 0)).toBe(true);
    expect(rootLocations.every(({ value }) => value[1] === 0)).toBe(true);
  });

  it("defines explicit root-relative world targets for the forward palm mechanics", () => {
    expect(plan.rules.handTargetSpace).toMatch(/Root-head-relative Blender world meters.*X is forward/);
    const targets = plan.clips.flatMap((clip) => clip.phases
      .filter((phase) => phase.handTargets)
      .map((phase) => ({ clip: clip.name, id: phase.id, targets: phase.handTargets })));
    expect(targets.length).toBeGreaterThanOrEqual(11);
    for (const { targets: phaseTargets } of targets) for (const [hand, target] of Object.entries(phaseTargets)) {
      expect(["hand_L", "hand_R"]).toContain(hand);
      expect(target).toHaveLength(3);
      expect(target.every(Number.isFinite)).toBe(true);
    }
    for (const name of ["PalmFire", "SoulTax"]) {
      const forward = targets.filter(({ clip }) => clip === name)
        .flatMap(({ targets: phaseTargets }) => Object.values(phaseTargets))
        .map(([x]) => x);
      expect(Math.max(...forward)).toBeGreaterThan(.27);
    }
  });

  it("uses leg-driven shutdown and a blade-aware side collapse without yawing the rig", () => {
    const shutdown = plan.clips.find(({ name }) => name === "FurnaceShutdown");
    const death = plan.clips.find(({ name }) => name === "DeathCollapse");
    for (const clip of [shutdown, death]) {
      expect(clip.phases.map((phase) => phase.bones.root?.rotation).filter(Boolean)
        .every(([, yaw]) => yaw === 0)).toBe(true);
      expect(clip.phases.some((phase) => Math.abs(phase.bones.thigh_L?.rotation?.[2] ?? 0) > 20)).toBe(true);
      expect(clip.phases.some((phase) => Math.abs(phase.bones.lower_leg_L?.rotation?.[2] ?? 0) > 25)).toBe(true);
    }
    expect(Math.max(...shutdown.phases.map((phase) => Math.abs(phase.bones.root?.rotation?.[2] ?? 0)))).toBeLessThanOrEqual(4);
    expect(Math.max(...death.phases.map((phase) => Math.abs(phase.bones.root?.rotation?.[0] ?? 0)))).toBeGreaterThan(120);
    expect(Math.max(...death.phases.map((phase) => Math.abs(phase.bones.root?.rotation?.[2] ?? 0)))).toBeLessThan(20);
    expect(Math.max(...death.phases.slice(-3).map((phase) => Math.abs(phase.bones.spine?.rotation?.[0] ?? 0)))).toBeLessThanOrEqual(10);
    expect(death.phases.at(-1).bones.upper_arm_R.rotation[0]).toBe(0);
  });
});
