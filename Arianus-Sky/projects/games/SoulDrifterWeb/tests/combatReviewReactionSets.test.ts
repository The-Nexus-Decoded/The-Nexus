import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorHandle, type CombatActorLoader,
  type CombatActorRequest } from "../src/review/weapon-lab/combat-review-controller";
import type { ReviewAction, ReviewDamageType } from "../src/review/weapon-lab/combat-review-types";
import { resolveReviewContact, type ReviewContactResolution } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { applyReactionHit, buildReactionPlan, reactionArchetypeForFamily, reactionLoopPeriods,
  reactionSetForContact, reactionSetPreempts, reactionTimelineEnd, reactionTimelinePhases,
  REACTION_CONTRACT_CLIPS, REACTION_MAX_HOLD_SECONDS, REACTION_SET_IDS,
  REACTION_SETS } from "../src/review/weapon-lab/reaction-contract";
import { sampleReviewSequence } from "../src/review/weapon-lab/combat-review-timeline";

// Authored durations, read off the shipped packs by tests/reactionPack.test.ts.
const POISON = { impact: 0.85, loop: 2.8, recover: 1.6 };
const BURNING = { impact: 0.8, loop: 3, recover: 1.7 };
const KNOCKDOWN = { impact: 1.05, loop: 2.4, recover: 2.3 };

const definitions: readonly CombatActorDefinition[] = [
  { id: "human-sword", label: "Human · sword", family: "human", note: "Equipment binding · review draft" },
  { id: "base", label: "Base Breachling", family: "breachling", note: "Reviewed attacks; remaining actions source" },
];
function action(id: string, semantic: ReviewAction["semantic"], durationSeconds = 1): ReviewAction {
  return { id, clipName: id, label: id, semantic, durationSeconds,
    approvalStatus: semantic === "attack" ? "draft" : "source", rootPolicy: "authored-displacement" };
}
/** The human defender: the ordinary flinch set plus the installed reaction pack. */
const humanActions = [action("idle", "idle"), action("strike", "attack", 2), action("Impact", "reaction", 0.6),
  action("ImpactHeavy", "reaction", 0.9), action("Death2", "death", 2.6),
  action("PoisonImpact", "reaction", POISON.impact), action("PoisonLoop", "reaction", POISON.loop),
  action("PoisonRecover", "reaction", POISON.recover), action("BurnFlare", "reaction", BURNING.impact),
  action("BurnBurn", "reaction", BURNING.loop), action("BurnRecover", "reaction", BURNING.recover),
  action("Knockdown", "reaction", KNOCKDOWN.impact),
  action("ProneHold", "reaction", KNOCKDOWN.loop), action("GetUp", "reaction", KNOCKDOWN.recover)];
/** The attacker: a spit that carries poison, a lunge the classifier reads heavy, a plain claw. */
const mobActions = [action("idle", "idle"), action("ClawAttack", "attack", 1.3),
  action("LungeAttack", "attack", 1.3), action("SpitAttack", "attack", 1.2), action("RecieveHit", "reaction", 0.8)];

function actorFixture(request: CombatActorRequest) {
  const actions = request.definition.family === "human" ? humanActions : mobActions;
  const root = new THREE.Group(), model = new THREE.Group(), bone = new THREE.Bone();
  root.add(model); model.add(bone);
  const actor = { instanceId: request.instanceId, definitionId: request.definition.id, root, model,
    actions: () => actions,
    sample: vi.fn((_id: string, seconds: number) => { bone.position.set(0, seconds, 0); model.updateMatrixWorld(true); }),
    reset: vi.fn(), dispose: vi.fn() };
  return { actor } satisfies CombatActorHandle;
}
function stubResolver(damageType: ReviewDamageType | null, timeSeconds = 0.5): typeof resolveReviewContact {
  return async ({ sequence, attacker, target, profile }) => ({
    status: "contact", sequenceId: sequence.id, profileId: profile?.id ?? null, samples: 12, sampleRate: 120,
    toleranceMeters: 0.008, evidence: "stub sampler",
    event: { id: `measured-contact:${attacker.actor.instanceId}:${target.actor.instanceId}`, kind: "contact", result: "hit",
      actorId: attacker.actor.instanceId, targetId: target.actor.instanceId, timeSeconds,
      position: [0, 1, 0.35], ...(damageType ? { damageType } : {}), evidence: "stub contact" },
  } satisfies ReviewContactResolution);
}
const controllers = new Set<CombatReviewController>();
function controller(contactResolver: typeof resolveReviewContact, loadActor: CombatActorLoader = async (request) => actorFixture(request)) {
  const value = new CombatReviewController({ definitions, loadActor, initial: { a: "human-sword", b: "base" }, contactResolver });
  controllers.add(value); return value;
}
/** The human is the target, so the Breachling in slot B attacks. */
async function spitAt(damageType: ReviewDamageType | null, attackId = "SpitAttack") {
  const value = controller(stubResolver(damageType));
  await value.enter(); value.setAttacker("b"); value.setAction("b", "action", attackId);
  return value;
}
const trackIds = (value: CombatReviewController) => value.sequence()!.tracks
  .filter((track) => track.actorId === value.actor("a")!.instanceId).map((track) => track.id);
const trackFor = (value: CombatReviewController, id: string) => value.sequence()!.tracks.find((track) => track.id === id)!;

afterEach(() => { for (const value of controllers) value.dispose(); controllers.clear(); vi.restoreAllMocks(); });

describe("Selection: a special damage type replaces the flinch, an ordinary one does not", () => {
  it("maps contacts to sets without inventing a sixth damage type", () => {
    expect(reactionSetForContact({ damageType: "poison", severity: "light" })).toBe("poison");
    expect(reactionSetForContact({ damageType: "poison", severity: "heavy" })).toBe("poison");
    expect(reactionSetForContact({ damageType: "physical", severity: "heavy" })).toBe("knockdown");
    expect(reactionSetForContact({ damageType: "physical", severity: "light" })).toBeNull();
    expect(reactionSetForContact({ damageType: null, severity: null })).toBeNull();
    // Fire is authored now: a burning body, and it wins over the heavy escalation
    // the same way poison does. A heavy fire hit is a body alight, not one prone.
    expect(reactionSetForContact({ damageType: "fire", severity: "light" })).toBe("burning");
    expect(reactionSetForContact({ damageType: "fire", severity: "heavy" })).toBe("burning");
    expect(reactionSetForContact({ damageType: "fire", severity: null })).toBe("burning");
    // Ice and arcane are typed but not authored: fall through, never half-play.
    for (const damageType of ["ice", "arcane"] as const) {
      expect(reactionSetForContact({ damageType, severity: "light" })).toBeNull();
      expect(reactionSetForContact({ damageType, severity: "heavy" })).toBe("knockdown");
    }
    expect(reactionArchetypeForFamily("human")).toBe("humanoid");
    expect(reactionArchetypeForFamily("warden")).toBe("warden");
    expect(reactionArchetypeForFamily("breachling")).toBe("breachling");
    expect(reactionSetPreempts("poison", "knockdown")).toBe(true);
    expect(reactionSetPreempts("knockdown", "poison")).toBe(false);
    expect(reactionSetPreempts("poison", "poison")).toBe(false);
  });

  it("orders burning between the poison it overrides and the knockdown that overrides it", () => {
    // The owner's constraint: a knockdown still takes a burning body off its feet.
    expect(REACTION_SETS.poison.precedence).toBeLessThan(REACTION_SETS.burning.precedence);
    expect(REACTION_SETS.burning.precedence).toBeLessThan(REACTION_SETS.knockdown.precedence);
    expect(reactionSetPreempts("burning", "knockdown")).toBe(true);
    expect(reactionSetPreempts("poison", "burning")).toBe(true);
    expect(reactionSetPreempts("burning", "poison")).toBe(false);
    expect(reactionSetPreempts("knockdown", "burning")).toBe(false);
    // A repeat of the running set is never a preempt; it is the re-arm path.
    expect(reactionSetPreempts("burning", "burning")).toBe(false);
    expect(REACTION_SETS.burning.damageTypes).toEqual(["fire"]);
    expect(REACTION_SETS.burning.fromHeavyMelee).toBe(false);
    expect(Object.values(REACTION_SETS.burning.clips)).toEqual(["BurnFlare", "BurnBurn", "BurnRecover"]);
    // The set list every enumeration reads, in ascending precedence, and the clip
    // reservation derived from it.
    expect(REACTION_SET_IDS).toEqual(["poison", "burning", "knockdown"]);
    expect([...REACTION_SET_IDS].map((id) => REACTION_SETS[id].precedence))
      .toEqual([...REACTION_SET_IDS].map((id) => REACTION_SETS[id].precedence).sort((a, b) => a - b));
    expect(new Set(REACTION_CONTRACT_CLIPS).size).toBe(REACTION_CONTRACT_CLIPS.length);
    expect(REACTION_CONTRACT_CLIPS).toEqual(REACTION_SET_IDS.flatMap((id) => Object.values(REACTION_SETS[id].clips)));
  });

  it("plays the poison set on a spit and the ordinary flinch on a plain claw", async () => {
    const poisoned = await spitAt("poison");
    await poisoned.resolveContact({ response: "reaction" });
    const snapshot = poisoned.snapshot();
    expect(snapshot.contact.status).toBe("contact");
    expect(snapshot.reaction.timeline!.archetype).toBe("humanoid");
    expect(snapshot.reaction.timeline!.plans[0]!.setId).toBe("poison");
    expect(snapshot.slots[0]!.selected.reaction).toBe("PoisonImpact");
    expect(trackIds(poisoned)).toEqual(["defender-ready", "defender-reaction-0-impact",
      "defender-reaction-1-loop", "defender-reaction-2-recover", "defender-recover"]);

    const plain = await spitAt("physical", "ClawAttack");
    await plain.resolveContact({ response: "reaction" });
    expect(plain.snapshot().reaction.timeline).toBeNull();
    expect(plain.snapshot().slots[0]!.selected.reaction).toBe("Impact");
    expect(trackIds(plain)).toEqual(["defender-ready", "defender-response", "defender-recover"]);
  });

  it("escalates a heavy strike to the shared knockdown, with no contact direction needed", async () => {
    const value = await spitAt(null, "LungeAttack");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().contact.severity).toBe("heavy");
    expect(value.snapshot().reaction.timeline!.plans[0]!.setId).toBe("knockdown");
    expect(value.snapshot().slots[0]!.selected.reaction).toBe("Knockdown");
    expect(value.snapshot().reaction.phases.map((phase) => phase.clipName))
      .toEqual(["Knockdown", "ProneHold", "GetUp"]);
  });

  it("plays the burning set on a fire contact, light or heavy", async () => {
    const burned = await spitAt("fire");
    await burned.resolveContact({ response: "reaction" });
    const snapshot = burned.snapshot();
    expect(snapshot.contact.status).toBe("contact");
    expect(snapshot.contact.severity).toBe("light");
    expect(snapshot.reaction.timeline!.archetype).toBe("humanoid");
    expect(snapshot.reaction.timeline!.plans[0]!.setId).toBe("burning");
    expect(snapshot.slots[0]!.selected.reaction).toBe("BurnFlare");
    expect(snapshot.reaction.phases.map((phase) => phase.clipName)).toEqual(["BurnFlare", "BurnBurn", "BurnRecover"]);
    expect(trackIds(burned)).toEqual(["defender-ready", "defender-reaction-0-impact",
      "defender-reaction-1-loop", "defender-reaction-2-recover", "defender-recover"]);
    // A heavy fire hit is still a burning body, not a prone one: the mapped damage
    // type is answered before the heavy-melee escalation is ever reached.
    const heavy = await spitAt("fire", "LungeAttack");
    await heavy.resolveContact({ response: "reaction" });
    expect(heavy.snapshot().contact.severity).toBe("heavy");
    expect(heavy.snapshot().reaction.timeline!.plans[0]!.setId).toBe("burning");
    expect(heavy.snapshot().slots[0]!.selected.reaction).toBe("BurnFlare");
  });

  it("leaves the manual policy and a hand-picked clip alone", async () => {
    const value = await spitAt("poison");
    value.setReactionPolicy("manual");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().reaction.timeline).toBeNull();
    value.setReactionPolicy("auto");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().reaction.timeline!.plans).toHaveLength(1);
    // Overriding by hand drops the whole set: a lone PoisonLoop is not a reaction.
    value.setAction("a", "reaction", "PoisonLoop");
    expect(value.snapshot().reaction.timeline).toBeNull();
  });
});

describe("Sequencing: the loop is held for the effect, not for the clip length", () => {
  it("quantises the hold to whole loop periods and reports the difference", () => {
    expect(reactionLoopPeriods(0, POISON.loop)).toBe(1);
    expect(reactionLoopPeriods(0.867, POISON.loop)).toBe(1);
    expect(reactionLoopPeriods(2.5, POISON.loop)).toBe(1);
    expect(reactionLoopPeriods(5.6, POISON.loop)).toBe(2);
    expect(reactionLoopPeriods(7.0, POISON.loop)).toBe(3);
    // Never unbounded, whatever duration an effect claims.
    expect(reactionLoopPeriods(1e6, POISON.loop) * POISON.loop).toBeLessThanOrEqual(REACTION_MAX_HOLD_SECONDS);
    const plan = buildReactionPlan({ archetype: "humanoid", setId: "poison", atSeconds: 0.45, effectSeconds: 2.5, durations: POISON });
    expect(plan.loopPeriods).toBe(1);
    expect(plan.holdSeconds).toBeCloseTo(2.8, 9);
    expect(plan.quantizationSeconds).toBeCloseTo(0.3, 9);
    expect(plan.durationSeconds).toBeCloseTo(0.85 + 2.8 + 1.6, 9);
    expect(plan.phases.map((phase) => [phase.role, Number(phase.startSeconds.toFixed(3)), Number(phase.durationSeconds.toFixed(3))]))
      .toEqual([["impact", 0.45, 0.85], ["loop", 1.3, 2.8], ["recover", 4.1, 1.6]]);
    expect(plan.phases[1]!.loop).toBe(true);
    expect(plan.phases[0]!.loop).toBe(false);
    expect(plan.phases[2]!.loop).toBe(false);
  });

  it("quantises the burn hold to whole 3 s periods and never past the cap", () => {
    expect(reactionLoopPeriods(0, BURNING.loop)).toBe(1);
    expect(reactionLoopPeriods(0.867, BURNING.loop)).toBe(1);
    expect(reactionLoopPeriods(1.6, BURNING.loop)).toBe(1);
    expect(reactionLoopPeriods(4.5, BURNING.loop)).toBe(2);
    expect(reactionLoopPeriods(8, BURNING.loop)).toBe(3);
    expect(reactionLoopPeriods(1e6, BURNING.loop)).toBe(Math.floor(REACTION_MAX_HOLD_SECONDS / BURNING.loop));
    expect(reactionLoopPeriods(1e6, BURNING.loop) * BURNING.loop).toBeLessThanOrEqual(REACTION_MAX_HOLD_SECONDS);
    const plan = buildReactionPlan({ archetype: "humanoid", setId: "burning", atSeconds: 0.45, effectSeconds: 2.5, durations: BURNING });
    expect(plan.loopPeriods).toBe(1);
    expect(plan.holdSeconds).toBeCloseTo(3, 9);
    // The loop outlives the effect by half a second rather than being cut mid-flail.
    expect(plan.quantizationSeconds).toBeCloseTo(0.5, 9);
    expect(plan.durationSeconds).toBeCloseTo(0.8 + 3 + 1.7, 9);
    expect(plan.phases.map((phase) => [phase.role, Number(phase.startSeconds.toFixed(3)), Number(phase.durationSeconds.toFixed(3))]))
      .toEqual([["impact", 0.45, 0.8], ["loop", 1.25, 3], ["recover", 4.25, 1.7]]);
    // Every hold is a whole number of periods, so the recovery always joins the
    // loop at its own frame 0 — the reason REACTION_LOOP_FIT is whole-periods.
    for (const effectSeconds of [0, 0.867, 1.6, 2.5, 4.5, 8, 25, 1e6]) {
      const held = buildReactionPlan({ archetype: "humanoid", setId: "burning", atSeconds: 0, effectSeconds, durations: BURNING });
      expect(held.holdSeconds / BURNING.loop).toBe(held.loopPeriods);
      expect(Number.isInteger(held.loopPeriods)).toBe(true);
      expect(held.phases[2]!.startSeconds).toBeCloseTo(held.phases[1]!.startSeconds + held.loopPeriods * BURNING.loop, 9);
    }
  });

  it("holds the burn for a PalmFire beam and for a long residue on the same asset", async () => {
    const value = await spitAt("fire");
    await value.resolveContact({ response: "reaction" });
    // PalmFire holds its beam for 0.867 s — under one period, so one period.
    value.setEffectSeconds(0.867);
    expect(value.snapshot().reaction.timeline!.plans[0]!.loopPeriods).toBe(1);
    expect(trackFor(value, "defender-reaction-1-loop").durationSeconds).toBeCloseTo(3, 9);
    value.setEffectSeconds(9);
    const plan = value.snapshot().reaction.timeline!.plans[0]!;
    expect(plan.loopPeriods).toBe(3);
    expect(plan.quantizationSeconds).toBeCloseTo(0, 9);
    expect(trackFor(value, "defender-reaction-1-loop").durationSeconds).toBeCloseTo(9, 9);
    // The catch is not replayed when the residue duration changes.
    expect(trackFor(value, "defender-reaction-0-impact").startSeconds).toBeCloseTo(0.5, 9);
    expect(trackFor(value, "defender-reaction-0-impact").actionId).toBe("BurnFlare");
    expect(plan.hitSeconds).toEqual([0.5]);
  });

  it("drives the same asset from a short beam and a long residue", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    // PalmFire holds its beam for 0.867 s; CinderSweep leaves 2.5 s of residue.
    value.seek(1.6);
    value.setEffectSeconds(0.867);
    // Retiming does not throw the reviewer back to zero or unmeasure the hit.
    expect(value.snapshot().frame!.timeSeconds).toBeCloseTo(1.6, 9);
    expect(value.snapshot().contact.status).toBe("contact");
    expect(value.snapshot().reaction.timeline!.plans[0]!.loopPeriods).toBe(1);
    expect(trackFor(value, "defender-reaction-1-loop").durationSeconds).toBeCloseTo(2.8, 9);
    value.setEffectSeconds(5.6);
    const plan = value.snapshot().reaction.timeline!.plans[0]!;
    expect(plan.loopPeriods).toBe(2);
    expect(plan.quantizationSeconds).toBeCloseTo(0, 9);
    expect(trackFor(value, "defender-reaction-1-loop").durationSeconds).toBeCloseTo(5.6, 9);
    // The impact is not replayed when the duration changes.
    expect(trackFor(value, "defender-reaction-0-impact").startSeconds).toBeCloseTo(0.5, 9);
    expect(value.snapshot().reaction.timeline!.plans[0]!.hitSeconds).toEqual([0.5]);
  });

  it("hands control back to the ready pose exactly once, after the recovery", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    const sequence = value.sequence()!;
    const recover = trackFor(value, "defender-reaction-2-recover");
    const resume = trackFor(value, "defender-recover");
    expect(resume.startSeconds).toBeCloseTo(recover.startSeconds + recover.durationSeconds, 9);
    expect(resume.actionId).toBe("idle");
    expect(resume.loop).toBe(true);
    expect(sequence.tracks.filter((track) => track.id === "defender-recover")).toHaveLength(1);
    expect(sequence.durationSeconds).toBeCloseTo(resume.startSeconds + resume.durationSeconds, 9);
  });
});

describe("Interruption", () => {
  it("re-arms on a second hit of the same set without replaying the impact", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    const before = trackFor(value, "defender-reaction-0-impact");
    const timeline = value.recordReactionHit({ setId: "poison", atSeconds: 2, effectSeconds: 4 });
    expect(timeline.plans).toHaveLength(1);
    expect(timeline.plans[0]!.hitSeconds).toEqual([0.5, 2]);
    // The loop now covers to 2 + 4 = 6 s, quantised up from its 1.35 s start.
    expect(timeline.plans[0]!.requestedHoldSeconds).toBeCloseTo(4.65, 9);
    expect(timeline.plans[0]!.loopPeriods).toBe(2);
    const after = trackFor(value, "defender-reaction-0-impact");
    expect(after.startSeconds).toBe(before.startSeconds);
    expect(after.durationSeconds).toBe(before.durationSeconds);
    expect(value.sequence()!.tracks.filter((track) => track.id.includes("impact"))).toHaveLength(1);
  });

  it("preempts a running poison with a knockdown, cutting it rather than replaying it", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    const timeline = value.recordReactionHit({ setId: "knockdown", atSeconds: 2 });
    expect(timeline.plans.map((plan) => plan.setId)).toEqual(["poison", "knockdown"]);
    const phases = value.snapshot().reaction.phases;
    expect(phases.map((phase) => phase.clipName)).toEqual(["PoisonImpact", "PoisonLoop", "Knockdown", "ProneHold", "GetUp"]);
    const cutLoop = phases[1]!;
    expect(cutLoop.truncated).toBe(true);
    expect(cutLoop.startSeconds + cutLoop.durationSeconds).toBeCloseTo(2, 9);
    // The poison recovery never plays: the body is on the floor instead.
    expect(phases.some((phase) => phase.clipName === "PoisonRecover")).toBe(false);
    expect(value.snapshot().slots[0]!.selected.reaction).toBe("Knockdown");
    expect(value.sequence()!.events.some((event) => event.id === "reaction-preempt-1")).toBe(true);
  });

  it("refuels a burning body on a second fire hit instead of re-catching it", async () => {
    const value = await spitAt("fire");
    await value.resolveContact({ response: "reaction" });
    const before = trackFor(value, "defender-reaction-0-impact");
    const timeline = value.recordReactionHit({ setId: "burning", atSeconds: 2, effectSeconds: 4 });
    expect(timeline.plans).toHaveLength(1);
    expect(timeline.plans[0]!.setId).toBe("burning");
    expect(timeline.plans[0]!.hitSeconds).toEqual([0.5, 2]);
    // The hold restarts from the new hit: it now covers to 2 + 4 = 6 s, which is
    // 4.7 s from the loop's 1.3 s start, quantised up to two whole 3 s periods.
    expect(timeline.plans[0]!.requestedHoldSeconds).toBeCloseTo(4.7, 9);
    expect(timeline.plans[0]!.loopPeriods).toBe(2);
    expect(timeline.plans[0]!.holdSeconds).toBeCloseTo(6, 9);
    // BurnFlare is the CATCH. A body already alight cannot catch again, so the
    // one-shot is not replayed and the body does not snap back to the catch pose.
    const after = trackFor(value, "defender-reaction-0-impact");
    expect(after.actionId).toBe("BurnFlare");
    expect(after.startSeconds).toBe(before.startSeconds);
    expect(after.durationSeconds).toBe(before.durationSeconds);
    expect(value.sequence()!.tracks.filter((track) => track.id.includes("impact"))).toHaveLength(1);
    expect(value.snapshot().reaction.phases.map((phase) => phase.clipName)).toEqual(["BurnFlare", "BurnBurn", "BurnRecover"]);
  });

  it("lets a knockdown take a burning body off its feet, cutting the burn", async () => {
    const value = await spitAt("fire");
    await value.resolveContact({ response: "reaction" });
    const timeline = value.recordReactionHit({ setId: "knockdown", atSeconds: 2 });
    expect(timeline.plans.map((plan) => plan.setId)).toEqual(["burning", "knockdown"]);
    const phases = value.snapshot().reaction.phases;
    expect(phases.map((phase) => phase.clipName)).toEqual(["BurnFlare", "BurnBurn", "Knockdown", "ProneHold", "GetUp"]);
    const cutLoop = phases[1]!;
    expect(cutLoop.truncated).toBe(true);
    expect(cutLoop.startSeconds).toBeCloseTo(1.3, 9);
    expect(cutLoop.startSeconds + cutLoop.durationSeconds).toBeCloseTo(2, 9);
    // The burn never unwinds: the body is on the floor instead.
    expect(phases.some((phase) => phase.clipName === "BurnRecover")).toBe(false);
    expect(value.snapshot().slots[0]!.selected.reaction).toBe("Knockdown");
    expect(value.sequence()!.events.some((event) => event.id === "reaction-preempt-1")).toBe(true);
  });

  it("burns over a poisoned body, and absorbs a spit onto a burning one", async () => {
    const poisonedThenBurned = await spitAt("poison");
    await poisonedThenBurned.resolveContact({ response: "reaction" });
    const escalated = poisonedThenBurned.recordReactionHit({ setId: "burning", atSeconds: 2 });
    expect(escalated.plans.map((plan) => plan.setId)).toEqual(["poison", "burning"]);
    expect(poisonedThenBurned.snapshot().reaction.phases.map((phase) => phase.clipName))
      .toEqual(["PoisonImpact", "PoisonLoop", "BurnFlare", "BurnBurn", "BurnRecover"]);
    expect(poisonedThenBurned.snapshot().reaction.phases[1]!.truncated).toBe(true);
    expect(poisonedThenBurned.snapshot().slots[0]!.selected.reaction).toBe("BurnFlare");

    // The other way round the spit changes nothing visible, and is kept as evidence.
    const burnedThenSpat = await spitAt("fire");
    await burnedThenSpat.resolveContact({ response: "reaction" });
    const absorbed = burnedThenSpat.recordReactionHit({ setId: "poison", atSeconds: 2 });
    expect(absorbed.plans).toHaveLength(1);
    expect(absorbed.plans[0]!.setId).toBe("burning");
    expect(absorbed.absorbed).toEqual([{ setId: "poison", atSeconds: 2, effectSeconds: 0, reason: "lower-precedence" }]);
    expect(burnedThenSpat.snapshot().reaction.phases.map((phase) => phase.clipName))
      .toEqual(["BurnFlare", "BurnBurn", "BurnRecover"]);
    expect(burnedThenSpat.sequence()!.events.find((event) => event.id === "reaction-absorbed-0")!.evidence)
      .toMatch(/absorbed by the running reaction/);
  });

  it("absorbs a weaker hit during a stronger reaction and records it", async () => {
    const value = await spitAt(null, "LungeAttack");
    await value.resolveContact({ response: "reaction" });
    const timeline = value.recordReactionHit({ setId: "poison", atSeconds: 2 });
    expect(timeline.plans).toHaveLength(1);
    expect(timeline.plans[0]!.setId).toBe("knockdown");
    expect(timeline.absorbed).toEqual([{ setId: "poison", atSeconds: 2, effectSeconds: 0, reason: "lower-precedence" }]);
    expect(value.snapshot().reaction.phases.map((phase) => phase.clipName)).toEqual(["Knockdown", "ProneHold", "GetUp"]);
    expect(value.sequence()!.events.find((event) => event.id === "reaction-absorbed-0")!.evidence)
      .toMatch(/absorbed by the running reaction/);
  });

  it("starts a fresh set when the hit lands after the previous reaction has finished", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    const end = reactionTimelineEnd(value.snapshot().reaction.timeline!);
    const timeline = value.recordReactionHit({ setId: "poison", atSeconds: end + 0.5 });
    expect(timeline.plans).toHaveLength(2);
    expect(value.snapshot().reaction.phases.filter((phase) => phase.role === "impact")).toHaveLength(2);
  });

  it("lets a death cut the reaction at any phase, with nothing resuming behind it", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    value.cutReactionToDeath(2);
    const snapshot = value.snapshot();
    expect(snapshot.cue.kind).toBe("death");
    const phases = snapshot.reaction.phases;
    expect(phases.map((phase) => phase.clipName)).toEqual(["PoisonImpact", "PoisonLoop"]);
    expect(phases[1]!.truncated).toBe(true);
    const death = trackFor(value, "defender-response");
    expect(death.actionId).toBe("Death2");
    expect(death.startSeconds).toBe(2);
    expect(death.terminal).toBe(true);
    expect(trackIds(value)).toEqual(["defender-ready", "defender-reaction-0-impact", "defender-reaction-1-loop", "defender-response"]);
    // A death before the reaction is not a cut, and is refused rather than guessed.
    expect(() => value.cutReactionToDeath(0.1)).toThrow(/not a cut/);
  });

  it("drops the reaction when the contact that caused it is no longer measured", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    expect(value.snapshot().reaction.timeline).not.toBeNull();
    value.setPlacement({ separationMeters: 2.4 });
    expect(value.snapshot().reaction.timeline).toBeNull();
    expect(value.snapshot().reaction.phases).toEqual([]);
    expect(() => value.recordReactionHit({ setId: "poison", atSeconds: 1 })).toThrow(/No reaction is running/);
  });
});

describe("Scrubbing reproduces exactly what playing reproduces", () => {
  it("wraps the held loop by its own period at every sampled time", async () => {
    const value = await spitAt("poison");
    await value.resolveContact({ response: "reaction" });
    value.setEffectSeconds(5.6);
    const sequence = value.sequence()!;
    const defenderId = value.actor("a")!.instanceId;
    const poseAt = (time: number) => {
      const frame = sampleReviewSequence(sequence, time);
      const actor = frame.actors.find((entry) => entry.actorId === defenderId)!;
      const pose = actor.poses[actor.poses.length - 1]!;
      return { actionId: pose.actionId, timeSeconds: Number(pose.timeSeconds.toFixed(6)) };
    };
    // impact 0.5–1.35, loop 1.35–6.95 (two 2.8 s periods), recover 6.95–8.55.
    expect(poseAt(0.25)).toEqual({ actionId: "idle", timeSeconds: 0.25 });
    expect(poseAt(0.9)).toEqual({ actionId: "PoisonImpact", timeSeconds: 0.4 });
    expect(poseAt(1.45)).toEqual({ actionId: "PoisonLoop", timeSeconds: 0.1 });
    // One full period later the loop is on the same frame — that is the seam.
    expect(poseAt(4.25)).toEqual({ actionId: "PoisonLoop", timeSeconds: 0.1 });
    expect(poseAt(7.05)).toEqual({ actionId: "PoisonRecover", timeSeconds: 0.1 });
    expect(poseAt(8.6).actionId).toBe("idle");
    // Seeking backwards and forwards lands on the same pose both ways.
    for (const time of [0.9, 4.25, 7.05, 1.45, 8.6]) {
      value.seek(time);
      expect(poseAt(time)).toEqual(poseAt(time));
      expect(value.snapshot().frame!.timeSeconds).toBeCloseTo(time, 9);
    }
  });

  it("places phases deterministically, cut or not", () => {
    const timeline = applyReactionHit(null,
      { setId: "poison", atSeconds: 1, effectSeconds: 2.5, durations: POISON }, "humanoid");
    const full = reactionTimelinePhases(timeline);
    expect(reactionTimelinePhases(timeline)).toEqual(full);
    expect(full.map((phase) => phase.role)).toEqual(["impact", "loop", "recover"]);
    expect(reactionTimelinePhases(timeline, 1).map((phase) => phase.role)).toEqual([]);
    expect(reactionTimelinePhases(timeline, 1.5).map((phase) => phase.durationSeconds)).toEqual([0.5]);
    expect(reactionTimelineEnd(timeline)).toBeCloseTo(1 + 0.85 + 2.8 + 1.6, 9);
    expect(() => applyReactionHit(timeline,
      { setId: "knockdown", atSeconds: 2, effectSeconds: 0, durations: KNOCKDOWN }, "breachling"))
      .toThrow(/belongs to one archetype/);
  });
});
