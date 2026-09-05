import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REACTION_ARCHETYPES, REACTION_CONTRACT_CLIPS, REACTION_SET_IDS, REACTION_SETS,
  type ReactionArchetype } from "../src/review/weapon-lab/reaction-contract";
import { prepareReviewedReactionPacks, reactionPackForClip, reactionSetInstalled, reviewedReactionNote,
  REACTION_RIG_LINEAGE, REVIEWED_REACTION_PACKS, type ReviewedReactionPack } from "../src/review/weapon-lab/reviewed-reaction-receipt";
import { assertReactionClipsBind, loadReactionPacks, loadReactionPacksForFamily, reactionPackClips,
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
const warden = REVIEWED_REACTION_PACKS.warden!;
const breachling = REVIEWED_REACTION_PACKS.breachling!;
const copy = (packs: readonly ReviewedReactionPack[]): ReviewedReactionPack[] =>
  packs.map((pack) => ({ ...pack, clips: [...pack.clips] }));
const valid = (): ReviewedReactionPack[] => copy(humanoid);

afterEach(() => { vi.restoreAllMocks(); });

describe("The reaction pack receipt is an allowlist, not a directory listing", () => {
  it("registers an archetype only when its packs carry all nine contract clips, however many files that is", () => {
    expect(REACTION_CONTRACT_CLIPS).toEqual(["PoisonImpact", "PoisonLoop", "PoisonRecover",
      "BurnFlare", "BurnBurn", "BurnRecover", "Knockdown", "ProneHold", "GetUp"]);
    // All three archetypes are registered now, and the union rule is what admits
    // each of them: three humanoid lanes, one Warden file, one Breachling file.
    for (const archetype of REACTION_ARCHETYPES) {
      const packs = REVIEWED_REACTION_PACKS[archetype]!;
      expect(packs, archetype).toBeDefined();
      expect(packs.flatMap((pack) => pack.clips).sort(), archetype).toEqual([...REACTION_CONTRACT_CLIPS].sort());
      for (const setId of REACTION_SET_IDS) expect(reactionSetInstalled(REVIEWED_REACTION_PACKS, archetype, setId), `${archetype}/${setId}`).toBe(true);
      for (const pack of packs) expect(pack.archetype, pack.url).toBe(archetype);
    }
    expect(humanoid).toHaveLength(3);
    expect(warden).toHaveLength(1);
    expect(breachling).toHaveLength(1);
    expect(reactionPackForClip(humanoid, "PoisonLoop")!.url).toContain("poison-r4");
    expect(reactionPackForClip(humanoid, "BurnBurn")!.url).toContain("burn-r2");
    expect(reactionPackForClip(humanoid, "ProneHold")!.url).toContain("kd-r14");
    expect(reactionPackForClip(humanoid, "NotAClip")).toBeNull();
    // Each archetype's clip resolves inside its own archetype, never across.
    expect(reactionPackForClip(warden, "ProneHold")!.url).toContain("warden-reactions-r3");
    expect(reactionPackForClip(breachling, "BurnBurn")!.url).toContain("breachling-reactions-quad-r4");
    expect(reviewedReactionNote(humanoid)).toMatch(/9 clips across 3 pinned files/);
    expect(reviewedReactionNote(warden)).toMatch(/9 clips across 1 pinned file \(warden-reactions-r3\.glb\)/);
    expect(reviewedReactionNote(breachling)).toMatch(/9 clips across 1 pinned file \(breachling-reactions-quad-r4\.glb\)/);
  });

  it("pins a different rig per archetype, and rejects a pack pinned against the wrong one", () => {
    // 65 / 18 / 30 are three skeletons, not one constant with exceptions.
    expect(REACTION_ARCHETYPES.map((archetype) => REACTION_RIG_LINEAGE[archetype].jointCount)).toEqual([65, 18, 30]);
    expect(new Set(REACTION_ARCHETYPES.map((archetype) => REACTION_RIG_LINEAGE[archetype].sha256)).size).toBe(3);
    for (const archetype of REACTION_ARCHETYPES) {
      const lineage = REACTION_RIG_LINEAGE[archetype];
      for (const pack of REVIEWED_REACTION_PACKS[archetype]!) {
        expect(pack.jointCount, pack.url).toBe(lineage.jointCount);
        expect(pack.rigSourceSha256, pack.url).toBe(lineage.sha256);
      }
    }
    // A Warden pack carrying the humanoid rig's checksum, or the humanoid rig's
    // joint count, is a pack that cannot bind on the body it will be played on.
    const foreignRig = copy(warden); foreignRig[0] = { ...foreignRig[0]!, rigSourceSha256: REACTION_RIG_LINEAGE.humanoid.sha256 };
    expect(() => prepareReviewedReactionPacks({ warden: foreignRig }))
      .toThrow(/pinned against the wrong rig; the warden pack carries .*wayfarer-cinderbound-warden-fourview-v12\.glb/);
    const foreignCount = copy(warden); foreignCount[0] = { ...foreignCount[0]!, jointCount: 65 };
    expect(() => prepareReviewedReactionPacks({ warden: foreignCount })).toThrow(/joint count 65 is not the 18-joint warden rig/);
    const quadCount = copy(breachling); quadCount[0] = { ...quadCount[0]!, jointCount: 24 };
    expect(() => prepareReviewedReactionPacks({ breachling: quadCount })).toThrow(/joint count 24 is not the 30-joint breachling rig/);
    // And the humanoid rows are held to their own rig by the same check.
    const humanRig = valid(); humanRig[0] = { ...humanRig[0]!, rigSourceSha256: REACTION_RIG_LINEAGE.warden.sha256 };
    expect(() => prepareReviewedReactionPacks({ humanoid: humanRig })).toThrow(/pinned against the wrong rig; the humanoid pack carries/);
    const humanCount = valid(); humanCount[1] = { ...humanCount[1]!, jointCount: 18 };
    expect(() => prepareReviewedReactionPacks({ humanoid: humanCount })).toThrow(/joint count 18 is not the 65-joint humanoid rig/);
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

  it("pins the exact bytes and checksum that are on disk, for every archetype", async () => {
    for (const archetype of REACTION_ARCHETYPES) {
      for (const pack of REVIEWED_REACTION_PACKS[archetype]!) {
        const bytes = bytesOf(pack.url);
        expect(bytes.byteLength, pack.url).toBe(pack.bytes);
        expect(await sha256(bytes), pack.url).toBe(pack.sha256);
      }
      // Each receipt claims to stand in for one rig; prove that is the shipped body.
      const lineage = REACTION_RIG_LINEAGE[archetype];
      expect(await sha256(bytesOf(lineage.bodyUrl)), lineage.bodyUrl).toBe(lineage.sha256);
      expect(new Set(REVIEWED_REACTION_PACKS[archetype]!.map((pack) => pack.rigSourceSha256)).size, archetype).toBe(1);
    }
  }, 60_000);
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
    // An archetype with no pack says so instead of falling back to another one's.
    await expect(loadReactionPacks("warden", { parser: parser(), baseURI: BASE, registry: { humanoid } }))
      .rejects.toThrow(/No reviewed reaction pack is registered for the warden archetype/);
    await expect(loadReactionPacksForFamily("breachling", { parser: parser(), baseURI: BASE, registry: { humanoid } }))
      .rejects.toThrow(/No reviewed reaction pack is registered for the breachling archetype/);
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

describe("Selection is by archetype: each body reaches its own pack", () => {
  /** Bone names of the skin a body GLB carries, which is what the receipt pins. */
  async function bodyBones(url: string): Promise<string[]> {
    const body = await parser().parseAsync(bytesOf(url).slice().buffer, "");
    const names = new Set<string>();
    body.scene.traverse((object) => {
      const skinned = object as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh && skinned.skeleton) for (const bone of skinned.skeleton.bones) names.add(bone.name);
    });
    return [...names];
  }

  it("loads the archetype's own file, on the archetype's own joint count", async () => {
    serveFromDisk();
    const cases: readonly (readonly [ReactionArchetype, "human" | "warden" | "breachling", string, number])[] = [
      ["humanoid", "human", "humanoid-reactions-", 65],
      ["warden", "warden", "warden-reactions-r3.glb", 18],
      ["breachling", "breachling", "breachling-reactions-quad-r4.glb", 30],
    ];
    for (const [archetype, family, file, joints] of cases) {
      // The family is all an actor knows about itself; the archetype follows from it.
      const loaded = await loadReactionPacksForFamily(family, { parser: parser(), baseURI: BASE });
      expect(loaded.every((entry) => entry.pack.archetype === archetype), archetype).toBe(true);
      expect(loaded.every((entry) => entry.pack.url.includes(file)), archetype).toBe(true);
      expect(loaded.every((entry) => entry.checksumVerified), archetype).toBe(true);
      expect(new Set(loaded.map((entry) => entry.pack.jointCount)), archetype).toEqual(new Set([joints]));
      const clips = reactionPackClips(loaded);
      expect(clips.map((clip) => clip.name).sort(), archetype).toEqual([...REACTION_CONTRACT_CLIPS].sort());
      // The parsed skin, not the receipt's own claim about it.
      const skin = await bodyBones(REACTION_RIG_LINEAGE[archetype].bodyUrl);
      expect(skin.length, archetype).toBe(joints);
      expect(() => assertReactionClipsBind(clips, skin), archetype).not.toThrow();
    }
  }, 180_000);

  it("authors the Warden and Breachling nine on their own rigs, and refuses another archetype's body", async () => {
    serveFromDisk();
    const wardenClips = reactionPackClips(await loadReactionPacks("warden", { parser: parser(), baseURI: BASE }));
    const quadClips = reactionPackClips(await loadReactionPacks("breachling", { parser: parser(), baseURI: BASE }));
    const seconds = (clips: readonly THREE.AnimationClip[], name: string) =>
      Number(clips.find((clip) => clip.name === name)!.duration.toFixed(4));
    // Authored durations, read from the shipped files.
    expect(["PoisonImpact", "PoisonLoop", "PoisonRecover"].map((name) => seconds(wardenClips, name))).toEqual([1.1, 3.6, 2.4]);
    expect(["BurnFlare", "BurnBurn", "BurnRecover"].map((name) => seconds(wardenClips, name))).toEqual([0.95, 3, 2]);
    expect(["Knockdown", "ProneHold", "GetUp"].map((name) => seconds(wardenClips, name))).toEqual([1.4, 3.2, 3]);
    expect(["PoisonImpact", "PoisonLoop", "PoisonRecover"].map((name) => seconds(quadClips, name))).toEqual([0.95, 2.4, 1.7]);
    expect(["BurnFlare", "BurnBurn", "BurnRecover"].map((name) => seconds(quadClips, name))).toEqual([0.9, 2.6, 2]);
    expect(["Knockdown", "ProneHold", "GetUp"].map((name) => seconds(quadClips, name))).toEqual([1, 2.2, 2.2]);
    const wardenBody = await bodyBones(REACTION_RIG_LINEAGE.warden.bodyUrl);
    const quadBody = await bodyBones(REACTION_RIG_LINEAGE.breachling.bodyUrl);
    const humanBody = await bodyBones(REACTION_RIG_LINEAGE.humanoid.bodyUrl);
    // Right body: binds. Any other archetype's body: refused before a clip is bound.
    expect(() => assertReactionClipsBind(wardenClips, wardenBody)).not.toThrow();
    expect(() => assertReactionClipsBind(quadClips, quadBody)).not.toThrow();
    expect(() => assertReactionClipsBind(wardenClips, quadBody)).toThrow(/targets 14 node\(s\) the body does not have/);
    expect(() => assertReactionClipsBind(quadClips, wardenBody)).toThrow(/targets 26 node\(s\) the body does not have/);
    expect(() => assertReactionClipsBind(wardenClips, humanBody)).toThrow(/node\(s\) the body does not have/);
    expect(() => assertReactionClipsBind(quadClips, humanBody)).toThrow(/node\(s\) the body does not have/);
    // A sibling body missing bones the pack drives is the same rejection: the
    // four-view Stalker has no front toes, and the quadruped pack drives six.
    const stalker = await bodyBones("/assets/weapon-lab/mobs/breachling-stalker-fourview-composer-v5.glb");
    expect(() => assertReactionClipsBind(quadClips, stalker)).toThrow(/front_toe1L/);
  }, 180_000);

  it("checks the pinned joint count against the parsed skin, not against a constant", async () => {
    const skin = (names: readonly string[]) => {
      const bones = names.map((name) => { const bone = new THREE.Bone(); bone.name = name; return bone; });
      const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
      const root = new THREE.Group();
      for (const bone of bones) root.add(bone);
      root.add(mesh);
      mesh.bind(new THREE.Skeleton(bones));
      return root;
    };
    const clipsOf = (pack: ReviewedReactionPack) => pack.clips.map((name) => new THREE.AnimationClip(name, 1,
      [new THREE.QuaternionKeyframeTrack("root.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])]));
    const at = (pack: ReviewedReactionPack, count: number) => ({
      async parseAsync() {
        return { animations: clipsOf(pack), scene: skin([...Array(count)].map((_value, index) => `bone${index}`)) };
      },
    });
    serveFromDisk();
    // Right count: accepted. One bone short, or the humanoid's count on the
    // Warden's file: rejected, and the message names the archetype it belongs to.
    await expect(loadReactionPacks("warden", { parser: at(warden[0]!, 18), baseURI: BASE })).resolves.toHaveLength(1);
    await expect(loadReactionPacks("warden", { parser: at(warden[0]!, 17), baseURI: BASE }))
      .rejects.toThrow(/carries a 17-joint skin, not the 18 joints its warden receipt pins/);
    await expect(loadReactionPacks("warden", { parser: at(warden[0]!, 65), baseURI: BASE }))
      .rejects.toThrow(/carries a 65-joint skin, not the 18 joints its warden receipt pins/);
    await expect(loadReactionPacks("breachling", { parser: at(breachling[0]!, 24), baseURI: BASE }))
      .rejects.toThrow(/carries a 24-joint skin, not the 30 joints its breachling receipt pins/);
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
