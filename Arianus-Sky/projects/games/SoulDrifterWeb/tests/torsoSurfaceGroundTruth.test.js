import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";
import { createHumanReviewActorFactory, findBone } from "../src/review/weapon-lab/human-review-actor.js";
import { torsoFrame, measureTorsoSurface, trueRadiusAt, FRONT_BEARING } from "./helpers/torsoGroundTruth.ts";

const parser = new GLTFLoader();
const decode = async () => { const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture; };
parser.register(() => ({ name: "EXT_texture_webp", loadTexture: decode }));
parser.register(() => ({ name: "TEST_TEXTURE_DECODE_ONLY", loadTexture: decode }));
const loader = { loadAsync: vi.fn(async (url) => {
  const bytes = readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url));
  return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
}) };
const textureLoader = { loadAsync: vi.fn(async () => {
  const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
}) };

/**
 * The measured truth about where this body's front surface is, locked down so the
 * next attempt at surface-seating the sling has something to be wrong against.
 *
 * Attempt 1 (docs/3d-ai-studio/issue-514/surface-seating-attempt-1.md) spent four
 * iterations tuning a profile that read the chest 30-40 mm fatter than the body,
 * because nothing checked it. This is that check. Any profile a fix introduces
 * must agree with these numbers before it is allowed to move a waypoint.
 */
describe("torso front surface, measured from the mesh", () => {
  it("stands 100-135 mm in front of the spine through the chest and waist", async () => {
    const factory = createHumanReviewActorFactory({ loader, textureLoader });
    const actor = await factory.create({ instanceId: "truth", loadoutId: "bow", includeSourceResponses: true });
    const clip = "ProLongbow__StandingIdle01";
    actor.sample(clip, actor.clips.get(clip).duration * 0.4);
    const frame = torsoFrame(actor.bones, findBone);
    expect(frame).not.toBeNull();
    const samples = measureTorsoSurface(actor.model, frame, 1);
    expect(samples.length).toBeGreaterThan(10_000);

    // Hips -> Neck on the 1.8 m body.
    expect(frame.axisLength * 1000).toBeGreaterThan(480);
    expect(frame.axisLength * 1000).toBeLessThan(530);

    // The number the sling was guessing at. The shipped routing spends 185 mm of
    // "front torso depth", which is ~60 mm past the actual surface -- that gap is
    // the daylight the owner reported.
    for (const height of [0.15, 0.3, 0.6]) {
      const radius = trueRadiusAt(samples, height, FRONT_BEARING);
      expect(radius, `front radius at ${height}`).not.toBeNull();
      expect(radius * 1000, `front radius at ${height}`).toBeGreaterThan(100);
      expect(radius * 1000, `front radius at ${height}`).toBeLessThan(135);
    }

    // The sides cannot be measured this way, and a fix must not try: the arms hang
    // at bearing 0 and 180, so a ray along the shoulder line hits a bicep and
    // reports 200-400 mm of "torso".
    const sideRadius = trueRadiusAt(samples, 0.3, 0);
    expect(sideRadius).not.toBeNull();
    expect(sideRadius * 1000).toBeGreaterThan(200);

    actor.dispose();
    factory.dispose();
  }, 120_000);
});
