import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REACTION_CONTRACT_CLIPS, REACTION_SETS } from "../src/review/weapon-lab/reaction-contract";
import { prepareReviewedReactionPacks, reactionPackForClip, reactionSetInstalled, reviewedReactionNote,
  REVIEWED_REACTION_PACKS, type ReviewedReactionPack } from "../src/review/weapon-lab/reviewed-reaction-receipt";
import { assertReactionClipsBind, loadReactionPacks, reactionPackClips,
  reactionSetDurations } from "../src/review/weapon-lab/reaction-pack-loader";
import type { ReviewAction } from "../src/review/weapon-lab/combat-review-types";
// @ts-expect-error Real public-source JS factory; image decoding alone is stubbed below.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";

// Browser tsconfig has no ambient Node types; limit host declarations to this test.
const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");

const BASE = "https://review.invalid/";
const publicFile = (url: string) => new URL(`../public${url}`, import.meta.url);
const bytesOf = (url: string) => Uint8Array.from(readFileSync(publicFile(url)));
async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
/** Serve the real files from disk so byte length and checksum are enforced for real. */
function serveFromDisk() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    return new Response(bytesOf(url.pathname).slice().buffer, { status: 200 });
  });
}
function parser() {
  const loader = new GLTFLoader(), decode = async () => new THREE.Texture();
  loader.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: decode }));
  loader.register(() => ({ name: "EXT_texture_webp", loadTexture: decode }));
  return loader;
}
const humanoid = REVIEWED_REACTION_PACKS.humanoid!;
const valid = (): ReviewedReactionPack[] => humanoid.map((pack) => ({ ...pack, clips: [...pack.clips] }));

afterEach(() => { vi.restoreAllMocks(); });

describe("The reaction pack receipt is an allowlist, not a directory listing", () => {
  it("registers the humanoid archetype only when its packs carry all nine contract clips", () => {
    expect(REACTION_CONTRACT_CLIPS).toEqual(["PoisonImpact", "PoisonLoop", "PoisonRecover",
      "BurnFlare", "BurnBurn", "BurnRecover", "Knockdown", "ProneHold", "GetUp"]);
    expect(humanoid.flatMap((pack) => pack.clips).sort()).toEqual([...REACTION_CONTRACT_CLIPS].sort());
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "humanoid", "poison")).toBe(true);
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "humanoid", "burning")).toBe(true);
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "humanoid", "knockdown")).toBe(true);
    // The other two archetypes are not registered yet, and say so rather than half-loading.
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "warden", "poison")).toBe(false);
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "warden", "burning")).toBe(false);
    expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, "breachling", "knockdown")).toBe(false);
    expect(reactionPackForClip(humanoid, "PoisonLoop")!.url).toContain("poison-r4");
    expect(reactionPackForClip(humanoid, "BurnBurn")!.url).toContain("burn-r2");
    expect(reactionPackForClip(humanoid, "ProneHold")!.url).toContain("kd-r14");
    expect(reactionPackForClip(humanoid, "NotAClip")).toBeNull();
    expect(reviewedReactionNote(humanoid)).toMatch(/9 clips across 3 pinned files/);
  });

  it("rejects a pack that is incomplete, mislocated, double-claimed or unpinned", () => {
    expect(() => prepareReviewedReactionPacks({ humanoid: [valid()[0]!] }))
      .toThrow(/incomplete set, missing BurnFlare, BurnBurn, BurnRecover, Knockdown, ProneHold, GetUp/);
    // A burn lane that lost its recovery in a re-export is a half set, not a set.
    const clipped = valid(); clipped[1] = { ...clipped[1]!, clips: ["BurnFlare", "BurnBurn"] };
    expect(() => prepareReviewedReactionPacks({ humanoid: clipped })).toThrow(/incomplete set, missing BurnRecover/);
    expect(() => prepareReviewedReactionPacks({ humanoid: [] })).toThrow(/no packs listed/);
    const dupe = valid(); dupe[1] = { ...dupe[1]!, clips: ["PoisonLoop", "BurnFlare", "BurnBurn", "BurnRecover"] };
    expect(() => prepareReviewedReactionPacks({ humanoid: dupe })).toThrow(/PoisonLoop is claimed by two packs/);
    const foreign = valid(); foreign[0] = { ...foreign[0]!, clips: ["PoisonImpact", "PoisonLoop", "Burning"] };
    expect(() => prepareReviewedReactionPacks({ humanoid: foreign })).toThrow(/Burning is not a contract clip name/);
    // Never over the animation library, never outside the reactions folder.
    for (const url of ["/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
      "/assets/weapon-lab/reactions/warden-reactions-r1.glb", "/assets/weapon-lab/reactions/humanoid-reactions-.glb",
      "/assets/weapon-lab/reactions/humanoid-reactions-R3.glb"]) {
      const moved = valid(); moved[0] = { ...moved[0]!, url };
      expect(() => prepareReviewedReactionPacks({ humanoid: moved })).toThrow(/url is not/);
    }
    const unpinned = valid(); unpinned[0] = { ...unpinned[0]!, sha256: "not-a-hash" };
    expect(() => prepareReviewedReactionPacks({ humanoid: unpinned })).toThrow(/checksums/);
    const zero = valid(); zero[0] = { ...zero[0]!, bytes: 0 };
    expect(() => prepareReviewedReactionPacks({ humanoid: zero })).toThrow(/byte length/);
    const boneless = valid(); boneless[0] = { ...boneless[0]!, jointCount: 0 };
    expect(() => prepareReviewedReactionPacks({ humanoid: boneless })).toThrow(/joint count/);
  });

  it("pins the exact bytes and checksum that are on disk", async () => {
    for (const pack of humanoid) {
      const bytes = bytesOf(pack.url);
      expect(bytes.byteLength).toBe(pack.bytes);
      expect(await sha256(bytes)).toBe(pack.sha256);
    }
    // The receipt claims to stand in for this rig; prove that is the shipped body.
    expect(await sha256(bytesOf("/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb")))
      .toBe(humanoid[0]!.rigSourceSha256);
    expect(new Set(humanoid.map((pack) => pack.rigSourceSha256)).size).toBe(1);
  });
});

describe("Loading a pack verifies the file before a clip is bound", () => {
  it("fetches, checksums and parses all three humanoid packs into the nine contract clips", async () => {
    serveFromDisk();
    const loaded = await loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE });
    expect(loaded).toHaveLength(3);
    expect(loaded.every((entry) => entry.checksumVerified)).toBe(true);
    const clips = reactionPackClips(loaded);
    expect(clips.map((clip) => clip.name).sort()).toEqual([...REACTION_CONTRACT_CLIPS].sort());
    const seconds = (name: string) => Number(clips.find((clip) => clip.name === name)!.duration.toFixed(4));
    // Authored durations, read from the shipped files.
    expect([seconds("PoisonImpact"), seconds("PoisonLoop"), seconds("PoisonRecover")]).toEqual([0.85, 2.8, 1.6]);
    expect([seconds("BurnFlare"), seconds("BurnBurn"), seconds("BurnRecover")]).toEqual([0.8, 3, 1.7]);
    expect([seconds("Knockdown"), seconds("ProneHold"), seconds("GetUp")]).toEqual([1.05, 2.4, 2.3]);
    expect(reactionSetDurations("poison", (name) => seconds(name))).toEqual({ impact: 0.85, loop: 2.8, recover: 1.6 });
    expect(reactionSetDurations("burning", (name) => seconds(name))).toEqual({ impact: 0.8, loop: 3, recover: 1.7 });
    expect(reactionSetDurations("knockdown", (name) => seconds(name))).toEqual({ impact: 1.05, loop: 2.4, recover: 2.3 });
    expect(reactionSetDurations("poison", () => undefined)).toBeNull();
    expect(reactionSetDurations("burning", (name) => (name === "BurnRecover" ? undefined : 1))).toBeNull();
  }, 60_000);

  it("refuses a file whose bytes, checksum or clip list moved", async () => {
    const fetchMock = serveFromDisk();
    // Every pinned pack, the burn one included: a byte length or a checksum that
    // moved stops the file before a single byte of it is parsed.
    for (const pack of humanoid) {
      await expect(loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE,
        registry: { humanoid: [{ ...pack, bytes: pack.bytes - 1 }] } }))
        .rejects.toThrow(/update its reviewed intake receipt/);
      await expect(loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE,
        registry: { humanoid: [{ ...pack, sha256: "0".repeat(64) }] } }))
        .rejects.toThrow(/SHA-256 does not match/);
    }
    // A burn pack whose receipt lost a clip name is rejected, not partly installed.
    await expect(loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE,
      registry: { humanoid: [{ ...humanoid[1]!, clips: ["BurnFlare", "BurnBurn"] }] } }))
      .rejects.toThrow(/unlisted BurnRecover/);
    await expect(loadReactionPacks("warden", { parser: parser(), baseURI: BASE }))
      .rejects.toThrow(/No reviewed reaction pack is registered for the warden archetype/);
    // A re-export that gained a clip is rejected, not silently installed beside
    // the library under a name nothing selects.
    const poison = Object.values(REACTION_SETS.poison.clips);
    const gained = { async parseAsync() {
      return { animations: [...poison, "Sneeze"].map((name) => new THREE.AnimationClip(name, 1,
        [new THREE.QuaternionKeyframeTrack("mixamorig:Hips.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])])) };
    } };
    await expect(loadReactionPacks("humanoid", { parser: gained, baseURI: BASE }))
      .rejects.toThrow(/unlisted Sneeze/);
    const lost = { async parseAsync() {
      return { animations: poison.slice(0, 2).map((name) => new THREE.AnimationClip(name, 1,
        [new THREE.QuaternionKeyframeTrack("mixamorig:Hips.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])])) };
    } };
    await expect(loadReactionPacks("humanoid", { parser: lost, baseURI: BASE }))
      .rejects.toThrow(/missing PoisonRecover/);
    expect(fetchMock).toHaveBeenCalled();
  }, 60_000);
});

describe("The pack installs beside the animation library, never over it", () => {
  it("gives a packed human actor the nine clips as reactions and leaves an unpacked one untouched", async () => {
    serveFromDisk();
    const factory = createHumanReviewActorFactory({
      loader: { loadAsync: async (url: string) => parser().parseAsync(bytesOf(url.replace(/^\./, "")).slice().buffer, "") },
      textureLoader: { loadAsync: async () => new THREE.Texture() },
      loadReactionClips: async () => reactionPackClips(await loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE })),
    });
    expect(factory.reactionPackAvailable).toBe(true);
    const packed = await factory.create({ instanceId: "packed", loadoutId: "longswordTwoHand",
      mode: "equipment", includeSourceResponses: true, includeReactionPack: true });
    try {
      const actions = packed.actions() as ReviewAction[];
      for (const name of REACTION_CONTRACT_CLIPS) {
        const entry = actions.find((action) => action.id === name);
        expect(entry, name).toBeDefined();
        // PoisonLoop, ProneHold and GetUp carry no token any source classifier
        // looks for; they are reactions by contract, not by regex.
        expect(entry!.semantic, name).toBe("reaction");
        expect(entry!.approvalStatus, name).toBe("draft");
        expect(entry!.label, name).toMatch(/authored reaction pack/);
      }
      expect(actions.find((action) => action.id === "PoisonLoop")!.durationSeconds).toBeCloseTo(2.8, 4);
      // The library's own greatsword impacts are still there and still source.
      expect(actions.find((action) => action.id === "GreatSword__GreatSwordImpact")!.approvalStatus).toBe("source");
      // Same factory, same shared source cache: an actor that did not ask for the
      // pack does not get it.
      const plain = await factory.create({ instanceId: "plain", loadoutId: "longswordTwoHand", mode: "catalog" });
      try {
        const names = new Set((plain.actions() as ReviewAction[]).map((action) => action.id));
        expect(REACTION_CONTRACT_CLIPS.filter((clip) => names.has(clip))).toEqual([]);
      } finally { plain.dispose(); }
    } finally { packed.dispose(); factory.dispose(); }
  }, 120_000);

  it("refuses the pack when no pinned loader is configured", async () => {
    const factory = createHumanReviewActorFactory({
      loader: { loadAsync: async (url: string) => parser().parseAsync(bytesOf(url.replace(/^\./, "")).slice().buffer, "") },
      textureLoader: { loadAsync: async () => new THREE.Texture() },
    });
    expect(factory.reactionPackAvailable).toBe(false);
    await expect(factory.create({ instanceId: "unpinned", loadoutId: "longswordTwoHand", includeReactionPack: true }))
      .rejects.toThrow(/No reaction pack loader is configured/);
    factory.dispose();
  }, 120_000);
});

describe("The pack is authored on the body's own rig and joins to itself", () => {
  it("targets only bones the shipped human body has, and rejects one that does not", async () => {
    serveFromDisk();
    const clips = reactionPackClips(await loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE }));
    const body = await parser().parseAsync(bytesOf("/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb").slice().buffer, "");
    const bones: string[] = [];
    body.scene.traverse((object) => { if ((object as THREE.Bone).isBone) bones.push(object.name); });
    expect(bones.length).toBe(humanoid[0]!.jointCount);
    expect(() => assertReactionClipsBind(clips, bones)).not.toThrow();
    const foreign = new THREE.AnimationClip("Bogus", 1,
      [new THREE.QuaternionKeyframeTrack("mixamorig:Tail.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])]);
    expect(() => assertReactionClipsBind([foreign], bones)).toThrow(/mixamorig:Tail/);
  }, 60_000);

  it("measures every contract join, and the cost of cutting a loop anywhere else", async () => {
    serveFromDisk();
    const clips = reactionPackClips(await loadReactionPacks("humanoid", { parser: parser(), baseURI: BASE }));
    const by = (name: string) => clips.find((clip) => clip.name === name)!;
    /** Linear key lookup with a slerp between neighbours; no interpolant plumbing. */
    const sample = (track: THREE.QuaternionKeyframeTrack, time: number) => {
      const times = track.times, values = track.values, last = times.length - 1;
      let index = 0;
      while (index < last && times[index + 1]! < time) index++;
      const at = (key: number) => new THREE.Quaternion().fromArray([...values].slice(key * 4, key * 4 + 4));
      if (time <= times[0]!) return at(0);
      if (time >= times[last]!) return at(last);
      const span = times[index + 1]! - times[index]!;
      return at(index).slerp(at(index + 1), span > 0 ? (time - times[index]!) / span : 0);
    };
    const worstDegrees = (a: THREE.AnimationClip, aTime: number, b: THREE.AnimationClip, bTime: number) => {
      let worst = 0;
      for (const track of a.tracks) {
        if (!(track instanceof THREE.QuaternionKeyframeTrack)) continue;
        const other = b.tracks.find((entry) => entry.name === track.name);
        if (!(other instanceof THREE.QuaternionKeyframeTrack)) continue;
        const dot = Math.abs(sample(track, aTime).dot(sample(other, bTime)));
        worst = Math.max(worst, 2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI);
      }
      return worst;
    };
    const impact = by("PoisonImpact"), loop = by("PoisonLoop"), recover = by("PoisonRecover");
    const flare = by("BurnFlare"), burn = by("BurnBurn"), burnRecover = by("BurnRecover");
    const knock = by("Knockdown"), prone = by("ProneHold"), getUp = by("GetUp");
    // Every join the owner's sequence rule crosses. 0.55 deg is the unit-quaternion
    // storage floor on these tracks, so these are exact matches, not near ones.
    const joins = [
      worstDegrees(impact, impact.duration, loop, 0),
      worstDegrees(loop, loop.duration, loop, 0),
      worstDegrees(loop, 0, recover, 0),
      worstDegrees(flare, flare.duration, burn, 0),
      worstDegrees(burn, burn.duration, burn, 0),
      worstDegrees(burn, 0, burnRecover, 0),
      worstDegrees(knock, knock.duration, prone, 0),
      worstDegrees(prone, prone.duration, prone, 0),
      worstDegrees(prone, prone.duration, getUp, 0),
    ];
    for (const join of joins) expect(join).toBeLessThan(0.55);
    // And the reason the hold is quantised to whole periods rather than cut where
    // the effect happens to end: mid-loop, the same join is two orders worse. The
    // burn loop is the worse of the two, because both its arms are moving.
    expect(worstDegrees(loop, 0.868, recover, 0)).toBeGreaterThan(30);
    expect(worstDegrees(burn, 0.868, burnRecover, 0)).toBeGreaterThan(30);
  }, 60_000);
});
