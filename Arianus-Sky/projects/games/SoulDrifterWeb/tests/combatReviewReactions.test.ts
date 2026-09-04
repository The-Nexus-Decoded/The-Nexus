import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorHandle, type CombatActorLoader,
  type CombatActorRequest } from "../src/review/weapon-lab/combat-review-controller";
import type { ReviewAction } from "../src/review/weapon-lab/combat-review-types";
import { resolveReviewContact, type ReviewContactResolution } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { deriveHumanStrikeWindow, reviewContactProfile } from "../src/review/weapon-lab/combat-review-contact-profiles";
// @ts-expect-error Real public-source JS factory; image decoding alone is stubbed below.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";

// Browser tsconfig has no ambient Node types; limit host declarations to this test.
const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");

const definitions: readonly CombatActorDefinition[] = [
  { id: "human-sword", label: "Human · sword", family: "human", note: "Equipment binding · review draft" },
  { id: "base", label: "Base Breachling", family: "breachling", note: "Reviewed attacks; remaining actions source" },
];
function action(id: string, semantic: ReviewAction["semantic"], durationSeconds = 1): ReviewAction {
  return { id, clipName: id, label: id, semantic, durationSeconds,
    approvalStatus: semantic === "attack" ? "draft" : "source", rootPolicy: "authored-displacement" };
}
const attackerActions = [action("idle", "idle"), action("strike", "attack", 2), action("jumpStrike", "attack", 2), action("flinch", "reaction", 0.6)];
const defenderActions = [action("idle", "idle"), action("bite", "attack", 1.5), action("RecieveHit", "reaction", 0.6),
  action("RecieveHitHeavy", "reaction", 0.8), action("RecieveHitLeft", "reaction", 0.6), action("RecieveHitRight", "reaction", 0.6),
  action("RecieveHitBack", "reaction", 0.6), action("Death", "death", 2)];
function actorFixture(request: CombatActorRequest) {
  const actions = request.definition.family === "human" ? attackerActions : defenderActions;
  const root = new THREE.Group(), model = new THREE.Group(), bone = new THREE.Bone();
  root.add(model); model.add(bone);
  const actor = { instanceId: request.instanceId, definitionId: request.definition.id, root, model,
    actions: () => actions,
    sample: vi.fn((id: string, seconds: number) => { bone.position.set(0, seconds, 0); model.updateMatrixWorld(true); }),
    reset: vi.fn(), dispose: vi.fn(),
  };
  const handle: CombatActorHandle = { actor };
  return handle;
}
/** A stub sampler that reports a hit at a fixed world position; the controller owns the classification. */
function stubResolver(position: readonly [number, number, number]): typeof resolveReviewContact {
  return async ({ sequence, attacker, target, profile }) => ({
    status: "contact", sequenceId: sequence.id, profileId: profile?.id ?? null, samples: 12, sampleRate: 120, toleranceMeters: 0.008,
    evidence: "stub sampler",
    event: { id: `measured-contact:${attacker.actor.instanceId}:${target.actor.instanceId}`, kind: "contact", result: "hit",
      actorId: attacker.actor.instanceId, targetId: target.actor.instanceId, timeSeconds: 0.5, position, evidence: "stub contact" },
  } satisfies ReviewContactResolution);
}
const controllers = new Set<CombatReviewController>();
const factories = new Set<{ dispose(): void }>();
function controller(contactResolver: typeof resolveReviewContact, loadActor: CombatActorLoader = async (request) => actorFixture(request)) {
  const value = new CombatReviewController({ definitions, loadActor, initial: { a: "human-sword", b: "base" }, contactResolver });
  controllers.add(value); return value;
}
afterEach(() => { for (const value of controllers) value.dispose(); controllers.clear();
  for (const factory of factories) factory.dispose(); factories.clear(); vi.restoreAllMocks(); });

describe("Measured contact picks the defender's reaction by side and attack weight", () => {
  // Actor B stands at z = 1.75 facing 180°, so its local +X (left) points to world -X
  // and its front is toward the origin.
  it("classifies contact positions in the defender frame", async () => {
    const value = controller(stubResolver([0, 1, 1.4])); await value.enter();
    const defender = value.actor("b")!;
    expect(CombatReviewController.classifyContactDirection(defender, [0, 1, 1.4])).toBe("front");
    expect(CombatReviewController.classifyContactDirection(defender, [-0.4, 1, 1.75])).toBe("left");
    expect(CombatReviewController.classifyContactDirection(defender, [0.4, 1, 1.75])).toBe("right");
    expect(CombatReviewController.classifyContactDirection(defender, [0, 1, 2.3])).toBe("back");
  });

  it("selects the sided reaction clip on a measured hit and reports side and weight", async () => {
    const value = controller(stubResolver([-0.4, 1, 1.75])); await value.enter();
    expect(value.snapshot().slots[1]!.selected.reaction).toBe("RecieveHit");
    await value.resolveContact({ response: "reaction" });
    const snapshot = value.snapshot();
    expect(snapshot.contact.status).toBe("contact");
    expect(snapshot.contact.direction).toBe("left");
    expect(snapshot.contact.severity).toBe("light");
    expect(snapshot.slots[1]!.selected.reaction).toBe("RecieveHitLeft");
    expect(snapshot.slots[1]!.actions.find((entry) => entry.id === "RecieveHitLeft")!.semantic).toBe("reaction");
    const tracks = value.sequence()!.tracks;
    expect(tracks.find((track) => track.id === "defender-response")!.actionId).toBe("RecieveHitLeft");
  });

  it("uses the heavy reaction for a heavy frontal attack and keeps the manual choice when the policy is manual", async () => {
    const value = controller(stubResolver([0, 1, 1.4])); await value.enter();
    value.setAction("a", "action", "jumpStrike");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().contact.severity).toBe("heavy");
    expect(value.snapshot().slots[1]!.selected.reaction).toBe("RecieveHitHeavy");
    value.setReactionPolicy("manual");
    value.setAction("b", "reaction", "RecieveHitBack");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().contact.direction).toBe("front");
    expect(value.snapshot().slots[1]!.selected.reaction).toBe("RecieveHitBack");
  });

  it("clears side and weight when the contact is invalidated", async () => {
    const value = controller(stubResolver([0, 1, 1.4])); await value.enter();
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().contact.direction).toBe("front");
    value.setPlacement({ separationMeters: 2 });
    expect(value.snapshot().contact.direction).toBeNull();
    expect(value.snapshot().contact.severity).toBeNull();
  });

  it("runs every attack of the attacker as a spar matrix and restores the selection", async () => {
    const value = controller(stubResolver([0.4, 1, 1.75])); await value.enter();
    value.setAction("a", "action", "jumpStrike");
    const rows = await value.runSparMatrix();
    expect(rows.map((row) => row.actionId)).toEqual(["strike", "jumpStrike"]);
    expect(rows.every((row) => row.status === "contact" && row.direction === "right" && row.reaction === "RecieveHitRight")).toBe(true);
    expect(rows[0]!.severity).toBe("light"); expect(rows[1]!.severity).toBe("heavy");
    expect(rows[0]!.window).toBe("unbound");
    expect(rows.every((row) => row.separationMeters === value.snapshot().placement.separationMeters)).toBe(true);
    const snapshot = value.snapshot();
    expect(snapshot.spar.running).toBe(false);
    expect(snapshot.spar.rows).toHaveLength(2);
    expect(snapshot.spar.attackerDefinitionId).toBe("human-sword");
    expect(snapshot.slots[0]!.selected.action).toBe("jumpStrike");
  });
});

describe("Human weapon attacks measure their own strike window", () => {
  function realHumanFactory() {
    const factory = createHumanReviewActorFactory({ loader: { loadAsync: async (url: string) => {
      const bytes = Uint8Array.from(readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url)));
      const loader = new GLTFLoader(), decode = async () => new THREE.Texture();
      loader.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: decode }));
      loader.register(() => ({ name: "EXT_texture_webp", loadTexture: decode }));
      return loader.parseAsync(bytes.buffer, "");
    } }, textureLoader: { loadAsync: async () => new THREE.Texture() } });
    factories.add(factory); return factory;
  }

  it("binds a greatsword slash to a measured weapon window and leaves idles unbound", async () => {
    const factory = realHumanFactory();
    const actor = await factory.create({ instanceId: "spar-human", loadoutId: "longswordTwoHand", mode: "equipment", includeSourceResponses: true });
    try {
      const slash = actor.actions().find((entry: ReviewAction) => entry.semantic === "attack" && /Slash/.test(entry.id))!;
      expect(slash).toBeDefined();
      expect(reviewContactProfile(actor, slash.id)).toBeNull();
      const window = deriveHumanStrikeWindow(actor, slash.id)!;
      expect(window).not.toBeNull();
      expect(window.start).toBeGreaterThanOrEqual(0);
      expect(window.end).toBeGreaterThan(window.start);
      expect(window.end).toBeLessThanOrEqual(slash.durationSeconds + 1e-6);
      expect(window.evidence).toMatch(/tip speed peak/);
      const profile = reviewContactProfile(actor, slash.id)!;
      expect(profile.surface).toEqual({ kind: "weapon", role: "primary" });
      expect(profile.startSeconds).toBe(window.start);
      expect(deriveHumanStrikeWindow(actor, slash.id)).toBe(window);
      const idle = actor.actions().find((entry: ReviewAction) => entry.semantic === "idle")!;
      expect(deriveHumanStrikeWindow(actor, idle.id)).toBeNull();
      expect(reviewContactProfile(actor, idle.id, { deriveHuman: true })).toBeNull();
    } finally { actor.dispose(); }
  }, 60_000);
});
