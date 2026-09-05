import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController } from "../src/review/weapon-lab/combat-review-controller";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { createMobReviewActor, createMobReactionClipLoader,
  type MobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { CombatReviewPanel } from "../src/review/weapon-lab/combat-review-panel";
import { REACTION_CONTRACT_CLIPS, REACTION_SET_IDS, REACTION_SETS } from "../src/review/weapon-lab/reaction-contract";
import { DomNode, domFixture } from "./helpers/reviewDomFixture";
import { REACTION_RIG_LINEAGE } from "../src/review/weapon-lab/reviewed-reaction-receipt";
import { loadReactionPacksForFamily, reactionPackClips } from "../src/review/weapon-lab/reaction-pack-loader";
import { sampleReviewSequence } from "../src/review/weapon-lab/combat-review-timeline";
// @ts-expect-error Existing studio wiring (JS): the live actor loader the lab itself uses.
import { COMBAT_REVIEW_DEFINITIONS, createCombatReviewActorLoader } from "../src/review/weapon-lab/combat-review-studio.js";

/**
 * D6: a mob defender receiving its own archetype's reaction set, through the live
 * path only. Every actor here is built by the lab's own actor loader on the pinned
 * GLB bytes; nothing constructs an action list by hand, which is exactly what the
 * previous lane's fixture did and why it proved nothing.
 */

// Browser tsconfig has no ambient Node types; keep the host contract local.
const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");

const WARDEN_BODY = `warden-wayfarer-4v`;
const BREACHLING_BODY = `breachling-base-4v`;
const nativeParseAsync = GLTFLoader.prototype.parseAsync;
const bytes = new Map<string, Uint8Array<ArrayBuffer>>();
function fileBytes(pathname: string): Uint8Array<ArrayBuffer> {
  let value = bytes.get(pathname);
  if (!value) {
    value = Uint8Array.from(readFileSync(new URL(`../public${pathname}`, import.meta.url)));
    bytes.set(pathname, value);
  }
  return value;
}

const actors = new Set<{ dispose(): void }>();
const controllers = new Set<CombatReviewController>();

beforeEach(() => {
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" });
  vi.stubGlobal("crypto", webcrypto);
  // Real pinned files off disk, so byte length and SHA-256 are enforced for real.
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return new Response(fileBytes(url.pathname).slice().buffer, { status: 200 });
  }));
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    this.register(() => ({ name: "TEST_CPU_TEXTURE_DECODE_ONLY", loadTexture: async () => {
      const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
    } }));
    return nativeParseAsync.call(this, data, path);
  });
});
afterEach(() => {
  try {
    for (const value of controllers) value.dispose();
    for (const value of actors) value.dispose();
  } finally {
    controllers.clear(); actors.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});

/** The lab's own loader, with no human factory: every definition used here is a mob. */
function liveLoader() {
  return createCombatReviewActorLoader({ create: () => { throw new Error("No human actor in this suite"); } });
}
async function liveActor(definitionId: string, loader = liveLoader()): Promise<MobReviewActor> {
  const definition = COMBAT_REVIEW_DEFINITIONS.find((entry: { id: string }) => entry.id === definitionId)!;
  const handle = await loader({ definition, instanceId: definitionId, signal: new AbortController().signal });
  actors.add(handle.actor);
  return handle.actor as MobReviewActor;
}
const named = (actor: MobReviewActor, name: string) => actor.actions().find((action) => action.id === name);
const seconds = (actor: MobReviewActor, name: string) => Number(named(actor, name)!.durationSeconds.toFixed(4));

describe("A mob review actor installs its own archetype's reaction pack", () => {
  it.each([
    [WARDEN_BODY, "warden", { poison: [1.1, 3.6, 2.4], burning: [0.95, 3, 2], knockdown: [1.4, 3.2, 3] }],
    [BREACHLING_BODY, "breachling", { poison: [0.95, 2.4, 1.7], burning: [0.9, 2.6, 2], knockdown: [1, 2.2, 2.2] }],
  ] as const)("gives %s the nine %s clips, at the pack's own authored lengths", async (definitionId, archetype, lengths) => {
    const actor = await liveActor(definitionId);
    expect(actor.reactionPack.blockedReason).toBeNull();
    expect([...actor.reactionPack.installed].sort()).toEqual([...REACTION_CONTRACT_CLIPS].sort());
    // The clips reach the ACTION list the controller reads, classified by contract.
    for (const name of REACTION_CONTRACT_CLIPS) {
      const action = named(actor, name);
      expect(action, `${definitionId}/${name}`).toBeDefined();
      expect(action!.semantic, name).toBe("reaction");
      expect(action!.approvalStatus, name).toBe("draft");
      expect(action!.label, name).toContain("authored reaction pack");
    }
    for (const [setId, expected] of Object.entries(lengths)) {
      const clips = REACTION_SETS[setId as keyof typeof REACTION_SETS].clips;
      expect([seconds(actor, clips.impact), seconds(actor, clips.loop), seconds(actor, clips.recover)], `${archetype}/${setId}`)
        .toEqual([...expected]);
    }
    // The body's own clips are untouched beside it.
    expect(actor.actions().some((action) => action.id === "Idle")).toBe(true);
  }, 240_000);

  it("leaves an actor built without the pack exactly as it was", async () => {
    const actor = await createMobReviewActor({ instanceId: "no-pack", definitionId: BREACHLING_BODY });
    actors.add(actor);
    expect(actor.reactionPack).toEqual({ installed: [], blockedReason: null });
    for (const name of REACTION_CONTRACT_CLIPS) expect(named(actor, name), name).toBeUndefined();
    expect(actor.actions().some((action) => action.semantic === "reaction")).toBe(true); // its own RecieveHit set
  }, 240_000);

  it("refuses a sibling body by lineage before it downloads a pack it could not bind", async () => {
    const loader = liveLoader();
    for (const [definitionId, archetype] of [["warden-oathbreaker-4v", "warden"], ["breachling-stalker-4v", "breachling"]] as const) {
      const actor = await liveActor(definitionId, loader);
      expect(actor.reactionPack.installed, definitionId).toEqual([]);
      expect(actor.reactionPack.blockedReason, definitionId).toContain(REACTION_RIG_LINEAGE[archetype].bodyUrl);
      for (const name of REACTION_CONTRACT_CLIPS) expect(named(actor, name), `${definitionId}/${name}`).toBeUndefined();
    }
  }, 240_000);

  it("rejects a pack whose joints the body does not have, rather than installing it", async () => {
    // Hand the Warden body the Breachling nine: same shape of call, wrong rig. The
    // lineage gate cannot catch this - the caller lied about which pack it loaded -
    // so the bone-binding proof on the parsed skin is what has to refuse it.
    const quad = async () => reactionPackClips(await loadReactionPacksForFamily("breachling", { parser: new GLTFLoader() }));
    await expect(createMobReviewActor({ instanceId: "wrong-rig", definitionId: WARDEN_BODY, loadReactionClips: quad }))
      .rejects.toThrow(/node\(s\) the body does not have/);
  }, 240_000);

  it("releases the pack with the actor, and the shared clips survive to be installed again", async () => {
    const loader = createMobReactionClipLoader();
    const first = await createMobReviewActor({ instanceId: "pack-a", definitionId: WARDEN_BODY, loadReactionClips: loader });
    expect(first.reactionPack.installed).toHaveLength(9);
    first.dispose();
    expect(() => first.sample("PoisonImpact", 0)).toThrow(/disposed/);
    // The mixer that held the pack's clip actions went with the stage runtime.
    expect(first.root.children).toEqual([]);
    expect(first.snapshot()).toBeUndefined();
    // Same cached clip objects, a second body: the first actor's teardown left no
    // binding on them, so the pack installs and plays again.
    const second = await createMobReviewActor({ instanceId: "pack-b", definitionId: WARDEN_BODY, loadReactionClips: loader });
    actors.add(second);
    expect([...second.reactionPack.installed].sort()).toEqual([...REACTION_CONTRACT_CLIPS].sort());
    expect(seconds(second, "PoisonLoop")).toBe(3.6);
  }, 240_000);
});

/**
 * The end-to-end proof D6 asks for. Both bodies come from the lab's own actor
 * loader on pinned bytes, the spit is the Breachling's own registered emission, and
 * the contact is measured by the real resolver against the defender's real skin.
 * Nothing here is a fixture, so a pack that did not install cannot pass.
 */
/**
 * Spacings and facings the tool's own placement control offers. The spit is a fixed
 * 0.75 s ballistic flight with no target tracking, so lining a body up under it is
 * the reviewer's job: measured on the shipped bodies, the gob clears the Wayfarer
 * Warden by 0.137 m at its closest when the boss stands square on (it passes
 * between the legs), and by 0.001-0.011 m with the boss turned a quarter turn.
 */
const SPAR_SPACINGS = [3, 2.5, 1.6, 1.4, 1.2, 1] as const;
const SPAR_FACINGS = [0, 90] as const;

async function poisonedDefender(defenderId: string) {
  const controller = new CombatReviewController({ definitions: COMBAT_REVIEW_DEFINITIONS,
    loadActor: liveLoader(), initial: { a: defenderId, b: BREACHLING_BODY } });
  controllers.add(controller);
  await controller.enter();
  const ready = controller.snapshot();
  expect(ready.ready, JSON.stringify(ready.slots.map((slot) => slot.error))).toBe(true);
  controller.setAttacker("b");
  controller.setAction("b", "action", "SpitAttack");
  const fitted = controller.snapshot().placement.separationMeters;
  const release = controller.contactProfile()!.startSeconds;
  const tried: string[] = [];
  for (const yawADegrees of SPAR_FACINGS) {
    for (const separationMeters of [fitted, ...SPAR_SPACINGS]) {
      controller.setPlacement({ separationMeters, yawADegrees });
      const result = await controller.resolveContact({ response: "reaction" });
      tried.push(`${separationMeters} m @ ${yawADegrees} deg: ${result?.status}`);
      // A contact on the window's opening sample cannot be told from the two bodies
      // already overlapping, so it is not accepted as a landed gob.
      if (result?.status === "contact" && result.event!.timeSeconds > release + 1e-6) {
        return { controller, result, separationMeters, yawADegrees, flightSeconds: result.event!.timeSeconds - release };
      }
    }
  }
  throw new Error(`No measured spit contact on ${defenderId} clear of the window opening; ${tried.join("; ")}`);
}

describe("A measured special contact plays the defender's own archetype set", () => {
  it.each([
    [WARDEN_BODY, "warden", { impact: 1.1, loop: 3.6, recover: 2.4 }],
    [BREACHLING_BODY, "breachling", { impact: 0.95, loop: 2.4, recover: 1.7 }],
  ] as const)("poisons %s with the %s nine, measured end to end", async (defenderId, archetype, authored) => {
    const { controller, result, flightSeconds } = await poisonedDefender(defenderId);
    // A gob that actually flew, not two bodies already touching when the window opened.
    expect(flightSeconds).toBeGreaterThan(1 / 120);
    expect(result!.event!.damageType).toBe("poison");
    const snapshot = controller.snapshot();
    const timeline = snapshot.reaction.timeline!;
    expect(timeline.archetype).toBe(archetype);
    const plan = timeline.plans[0]!;
    expect(plan.setId).toBe("poison");
    // The durations came off the actor's OWN installed actions, so they are this
    // archetype's authored lengths and not the humanoid pack's 0.85 / 2.8 / 1.6.
    // float32 clip durations: round to the 0.1 ms the packs are authored on.
    expect(Number(plan.durationSeconds.toFixed(4))).toBe(Number((authored.impact + authored.loop + authored.recover).toFixed(4)));
    expect(Number(plan.holdSeconds.toFixed(4))).toBe(authored.loop);
    expect(snapshot.slots[0]!.selected.reaction).toBe("PoisonImpact");
    expect(snapshot.reaction.phases.map((phase) => phase.clipName)).toEqual(["PoisonImpact", "PoisonLoop", "PoisonRecover"]);
    expect(snapshot.reaction.phases.map((phase) => Number(phase.durationSeconds.toFixed(4))))
      .toEqual([authored.impact, authored.loop, authored.recover]);
    // And the set is actually SCHEDULED on the defender: three tracks over one clock,
    // entered at the measured contact time on the poison set's own measured blend.
    const sequence = controller.sequence()!;
    const defenderActorId = controller.actor("a")!.instanceId;
    const scheduled = sequence.tracks.filter((track) => track.id.startsWith("defender-reaction-"));
    expect(scheduled.map((track) => [track.id, track.actionId, track.actorId]))
      .toEqual([["defender-reaction-0-impact", "PoisonImpact", defenderActorId],
        ["defender-reaction-1-loop", "PoisonLoop", defenderActorId],
        ["defender-reaction-2-recover", "PoisonRecover", defenderActorId]]);
    expect(scheduled[0]!.startSeconds).toBeCloseTo(result!.event!.timeSeconds, 9);
    expect(scheduled[0]!.blendInSeconds).toBeCloseTo(REACTION_SETS.poison.entryBlendSeconds, 9);
    expect(snapshot.cue.blendSeconds).toBeCloseTo(REACTION_SETS.poison.entryBlendSeconds, 9);
    expect(sequence.events.find((event) => event.id === "measured-response")!.result).toBe("hit");
    // The body really holds the pose: sampling the sequence at the loop reaches
    // the loop clip on the defender, not its idle guard.
    const held = sampleReviewSequence(sequence, scheduled[0]!.startSeconds + authored.impact + authored.loop / 2);
    const defender = held.actors.find((entry) => entry.actorId === defenderActorId)!;
    expect(defender.poses.map((pose) => pose.actionId)).toContain("PoisonLoop");
  }, 600_000);

  it("escalates a heavy Breachling melee to that archetype's own knockdown", async () => {
    const controller = new CombatReviewController({ definitions: COMBAT_REVIEW_DEFINITIONS,
      loadActor: liveLoader(), initial: { a: WARDEN_BODY, b: BREACHLING_BODY } });
    controllers.add(controller);
    await controller.enter();
    controller.setAttacker("b");
    controller.setAction("b", "action", "LungeAttack");
    const ladder = CombatReviewController.sparSeparationLadder(controller.snapshot().placement.separationMeters);
    let contact = null;
    for (const separationMeters of ladder) {
      controller.setPlacement({ separationMeters });
      const result = await controller.resolveContact({ response: "reaction" });
      if (result?.status === "contact") { contact = result; break; }
    }
    expect(contact, `no measured lunge contact at any of ${ladder.join(", ")} m`).not.toBeNull();
    expect(contact!.event!.damageType ?? "physical").toBe("physical");
    const snapshot = controller.snapshot();
    expect(snapshot.contact.severity).toBe("heavy");
    expect(snapshot.reaction.timeline!.archetype).toBe("warden");
    expect(snapshot.reaction.timeline!.plans[0]!.setId).toBe("knockdown");
    expect(snapshot.reaction.phases.map((phase) => phase.clipName)).toEqual(["Knockdown", "ProneHold", "GetUp"]);
    // The Warden's own knockdown lengths, not the Breachling attacker's.
    expect(snapshot.reaction.phases.map((phase) => Number(phase.durationSeconds.toFixed(4)))).toEqual([1.4, 3.2, 3]);
  }, 600_000);
});

describe("The lab says which sets a defender can actually reach", () => {
  it.each([
    [WARDEN_BODY, 3, "Installed on this defender"],
    // The SHIPPED Wayfarer body, not the four-view one the pack was authored on.
    ["warden-wayfarer", 0, "does not carry its clips"],
  ] as const)("reports %s with %i playable sets", async (defenderId, playable, phrase) => {
    const controller = new CombatReviewController({ definitions: COMBAT_REVIEW_DEFINITIONS,
      loadActor: liveLoader(), initial: { a: defenderId, b: BREACHLING_BODY } });
    controllers.add(controller);
    await controller.enter();
    controller.setAttacker("b");
    const reaction = controller.snapshot().reaction;
    expect(reaction.archetype).toBe("warden");
    // The receipt registers all three for the Warden either way; what differs is
    // whether THIS body carries them.
    expect([...reaction.registeredSets]).toEqual([...REACTION_SET_IDS]);
    expect(reaction.playableSets).toHaveLength(playable);
    const panel = new CombatReviewPanel(controller, { document: domFixture() as unknown as Document });
    try {
      const plan = (panel.element as unknown as DomNode).find((node) => node.dataset.reactionPlan === "true")!;
      expect(plan.textContent).toContain(phrase);
    } finally { panel.dispose(); }
  }, 600_000);
});
