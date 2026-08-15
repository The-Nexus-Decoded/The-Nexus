import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const assetUrl = new URL("../public/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb", import.meta.url);
const siphonPackUrl = new URL("../public/assets/3d/animations/elf-shadowknight/siphon-cleave-baseline.glb", import.meta.url);
const provenanceUrl = new URL("../public/assets/3d/characters/elf-shadowknight/animation-baseline-provenance.json", import.meta.url);

function glbJson(url) {
  const bytes = readFileSync(fileURLToPath(url));
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
}

function glbPayload(url) {
  const bytes = readFileSync(fileURLToPath(url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
  const binaryHeader = 20 + jsonLength;
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  return { json, binary: bytes.subarray(binaryHeader + 8, binaryHeader + 8 + binaryLength) };
}

function animationSeamMaxDelta(url, animationName) {
  const { json, binary } = glbPayload(url);
  const animation = json.animations.find((candidate) => candidate.name === animationName);
  if (!animation) throw new Error(`Missing animation ${animationName}`);
  const componentCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const readAccessor = (accessorIndex) => {
    const accessor = json.accessors[accessorIndex];
    const view = json.bufferViews[accessor.bufferView];
    if (accessor.componentType !== 5126) throw new Error("Expected float animation accessor");
    const size = componentCounts[accessor.type];
    const stride = view.byteStride ?? size * 4;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    return Array.from({ length: accessor.count }, (_, item) => Array.from(
      { length: size },
      (_, component) => binary.readFloatLE(start + item * stride + component * 4),
    ));
  };
  return Math.max(...animation.channels.map((channel) => {
    const sampler = animation.samplers[channel.sampler];
    const inputs = readAccessor(sampler.input);
    const outputs = readAccessor(sampler.output);
    const multiplier = sampler.interpolation === "CUBICSPLINE" ? 3 : 1;
    const first = outputs[multiplier === 3 ? 1 : 0];
    const last = outputs[(inputs.length - 1) * multiplier + (multiplier === 3 ? 1 : 0)];
    const direct = Math.max(...first.map((value, index) => Math.abs(value - last[index])));
    if (channel.target.path !== "rotation") return direct;
    const negated = Math.max(...first.map((value, index) => Math.abs(value + last[index])));
    return Math.min(direct, negated);
  }));
}

function animationDuration(url, animationName) {
  const json = glbJson(url);
  const animation = json.animations.find((candidate) => candidate.name === animationName);
  if (!animation) throw new Error(`Missing animation ${animationName}`);
  return Math.max(...animation.samplers.map((sampler) => json.accessors[sampler.input].max?.[0] ?? 0));
}

describe("shipping avatar animation baseline", () => {
  it("ships semantic relaxed-idle, walk, run, and visually gated player-attack clips", () => {
    const json = glbJson(assetUrl);
    const names = json.animations.map((animation) => animation.name);
    expect(names).toEqual(expect.arrayContaining([
      "IdleRelaxed",
      "WalkBaseline",
      "RunBaseline",
      "WeaponStrikeBaseline",
    ]));
    expect(names).not.toContain("SiphonCleaveBaseline");
  });

  it("records deterministic approved-pack and attack-source provenance", () => {
    const provenance = JSON.parse(readFileSync(fileURLToPath(provenanceUrl), "utf8"));
    expect(provenance.archives).toMatchObject({
      basicLocomotionSha256: "195E5075E54A93DA4B483C4C0B0306C6FDA2277AC5F543865A07B3CB6602FB3B",
      actionAdventureSha256: "D48D1FA9D6D34B95577058BF40520915903B87C0AA6929D4481014B3E897295F",
    });
    expect(provenance.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "IdleRelaxed", source: "basic-locomotion/idle.fbx" }),
      expect.objectContaining({ action: "WalkBaseline", source: "basic-locomotion/walking.fbx" }),
      expect.objectContaining({ action: "RunBaseline", source: "action-adventure/running.fbx" }),
      expect.objectContaining({
        action: "WeaponStrikeBaseline",
        source: "Stable Sword Inward Slash.fbx",
        sourceAction: "SwordSlashInward",
        sourceNormalizedPhases: [0.3, 0.52],
      }),
      expect.objectContaining({
        action: "SiphonCleaveBaseline",
        source: "Stable Sword Outward Slash.fbx",
        sourceSha256: "38589E534D2C47F5F095BC08CDA0C4853607D3BB86F8EDABFC5802F9C3BF0DE9",
        sourceAction: "SwordSlashOutward",
        sourceNormalizedPhases: [0.24, 0.46],
        sourceFrameWindow: [15, 31],
        pack: "assets/3d/animations/elf-shadowknight/siphon-cleave-baseline.glb",
        packSha256: "77C91BD70CD06D6B8BF452E0C66BF8A0B6CA200B21957B7E7A2A3ABC23C60BC5",
        sourceContactNormalizedTime: 0.46,
        contactNormalizedTime: 0.88,
        rootPolicy: "in-place",
      }),
    ]));
  });

  it("loops the relaxed idle without returning to a hunched first-frame seam", () => {
    expect(animationSeamMaxDelta(assetUrl, "IdleRelaxed")).toBeLessThan(0.02);
  });

  it("contains a short idle-seamed V3 strike candidate for the rendered approval gate", () => {
    const candidate = "WeaponStrikeControlledCandidateV3";
    expect(animationDuration(assetUrl, candidate)).toBeGreaterThanOrEqual(0.75);
    expect(animationDuration(assetUrl, candidate)).toBeLessThanOrEqual(1.1);
    expect(animationSeamMaxDelta(assetUrl, candidate)).toBeLessThan(0.02);
  });

  it("promotes the visually approved V3 action to the shipping semantic baseline", () => {
    expect(animationDuration(assetUrl, "WeaponStrikeBaseline"))
      .toBe(animationDuration(assetUrl, "WeaponStrikeControlledCandidateV3"));
    expect(animationSeamMaxDelta(assetUrl, "WeaponStrikeBaseline")).toBeLessThan(0.02);
  });

  it("ships Siphon as a separate raw same-rig animation pack", () => {
    const names = glbJson(siphonPackUrl).animations.map((animation) => animation.name);
    expect(names).toEqual(["ElfShadowknight_Armature|mixamo.com|Layer0"]);
    expect(animationDuration(siphonPackUrl, names[0])).toBeCloseTo(2.067, 2);
  });
});
