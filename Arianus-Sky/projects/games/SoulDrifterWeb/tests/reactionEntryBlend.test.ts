import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorHandle,
  type CombatActorRequest } from "../src/review/weapon-lab/combat-review-controller";
import { CombatReviewPanel } from "../src/review/weapon-lab/combat-review-panel";
import { reactionEntryBlendBounds, reactionExitBlendBounds, REACTION_ARCHETYPES,
  REACTION_BLEND_MEASUREMENT, REACTION_BLEND_QUANTUM_SECONDS, REACTION_SET_IDS,
  REACTION_SETS } from "../src/review/weapon-lab/reaction-contract";
import type { ReviewAction, ReviewDamageType } from "../src/review/weapon-lab/combat-review-types";
import { resolveReviewContact, type ReviewContactResolution } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { DomNode, domFixture } from "./helpers/reviewDomFixture";

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
const humanActions = [action("idle", "idle"), action("strike", "attack", 2), action("Impact", "reaction", 0.6),
  action("Death2", "death", 2.6),
  action("PoisonImpact", "reaction", POISON.impact), action("PoisonLoop", "reaction", POISON.loop),
  action("PoisonRecover", "reaction", POISON.recover), action("BurnFlare", "reaction", BURNING.impact),
  action("BurnBurn", "reaction", BURNING.loop), action("BurnRecover", "reaction", BURNING.recover),
  action("Knockdown", "reaction", KNOCKDOWN.impact),
  action("ProneHold", "reaction", KNOCKDOWN.loop), action("GetUp", "reaction", KNOCKDOWN.recover)];
const mobActions = [action("idle", "idle"), action("ClawAttack", "attack", 1.3), action("LungeAttack", "attack", 1.3),
  action("SpitAttack", "attack", 1.2), action("RecieveHit", "reaction", 0.8)];

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
const panels = new Set<CombatReviewPanel>();
async function hitBy(damageType: ReviewDamageType | null, attackId = "SpitAttack") {
  const value = new CombatReviewController({ definitions, loadActor: async (request) => actorFixture(request),
    initial: { a: "human-sword", b: "base" }, contactResolver: stubResolver(damageType) });
  controllers.add(value);
  await value.enter(); value.setAttacker("b"); value.setAction("b", "action", attackId);
  await value.resolveContact({ response: "reaction" });
  return value;
}
const trackFor = (value: CombatReviewController, id: string) => value.sequence()!.tracks.find((track) => track.id === id)!;

afterEach(() => {
  for (const panel of panels) panel.dispose(); panels.clear();
  for (const value of controllers) value.dispose(); controllers.clear(); vi.restoreAllMocks();
});

/**
 * Contract defect D3. The measurement lives in `REACTION_BLEND_MEASUREMENT`; these tests are
 * the thing that fails when a default stops following it.
 */
describe("D3: the blend is derived from the gap, not chosen", () => {
  it("carries a measured row for every set on every archetype", () => {
    for (const id of REACTION_SET_IDS) {
      const rows = REACTION_BLEND_MEASUREMENT[id];
      expect(rows.map((row) => row.archetype).sort()).toEqual([...REACTION_ARCHETYPES].sort());
      for (const row of rows) {
        for (const value of [row.guardEntryDeg, row.preemptEntryDeg, row.exitDeg]) expect(value).toBeGreaterThan(0);
        for (const rate of [row.impactPeakRate, row.recoverPeakRate]) expect(rate).toBeGreaterThan(0);
        expect(row.impactHalfTravelSeconds).toBeGreaterThan(0);
      }
    }
  });

  it("pins exactly the defaults the measurement derives, and inside their ceilings", () => {
    const derived = REACTION_SET_IDS.map((id) => [id, REACTION_SETS[id].entryBlendSeconds, REACTION_SETS[id].exitBlendSeconds,
      reactionEntryBlendBounds(id), reactionExitBlendBounds(id)] as const);
    for (const [id, entry, exit, entryBounds, exitBounds] of derived) {
      expect(entry, `${id} entry blend`).toBeCloseTo(entryBounds.derivedSeconds, 9);
      expect(exit, `${id} exit blend`).toBeCloseTo(exitBounds.derivedSeconds, 9);
      // Not a pop: the crossing never runs faster than the entered clip's own peak motion.
      expect(entry).toBeGreaterThanOrEqual(entryBounds.floorSeconds - 1e-9);
      expect(exit).toBeGreaterThanOrEqual(exitBounds.floorSeconds - 1e-9);
      // Not mush: the crossfade is finished before the impact has laid down half its motion.
      expect(entry).toBeLessThanOrEqual(entryBounds.ceilingSeconds + 1e-9);
      expect(exit).toBeLessThanOrEqual(exitBounds.ceilingSeconds + 1e-9);
      // Rounded UP to the grid, so a tidier number can never fall under its own floor.
      expect(entry - entryBounds.floorSeconds).toBeLessThan(REACTION_BLEND_QUANTUM_SECONDS);
      expect(exit - exitBounds.floorSeconds).toBeLessThan(REACTION_BLEND_QUANTUM_SECONDS);
    }
  });

  it("holds the numbers that were measured on the shipped packs", () => {
    // 0.105, not 0.125. Poison is the lowest precedence, so reactionSetPreempts never lets
    // anything be cut for it and it is never entered by preempting a running set; the wider
    // preempt gap that used to bind this floor is a transition the runtime forbids.
    expect(REACTION_SETS.poison.entryBlendSeconds).toBeCloseTo(0.105, 9);
    expect(REACTION_SETS.burning.entryBlendSeconds).toBeCloseTo(0.12, 9);
    expect(REACTION_SETS.knockdown.entryBlendSeconds).toBeCloseTo(0.215, 9);
    expect(REACTION_SETS.poison.exitBlendSeconds).toBeCloseTo(0.36, 9);
    expect(REACTION_SETS.burning.exitBlendSeconds).toBeCloseTo(0.24, 9);
    expect(REACTION_SETS.knockdown.exitBlendSeconds).toBeCloseTo(0.075, 9);
    // The historical 0.1 s is a pop on every set: it crosses faster than the entered clip's
    // own fastest authored motion in all three cases.
    for (const id of REACTION_SET_IDS) expect(reactionEntryBlendBounds(id).floorSeconds).toBeGreaterThan(0.1);
  });

  it("proves one blend cannot serve all three sets", () => {
    const floor = Math.max(...REACTION_SET_IDS.map((id) => reactionEntryBlendBounds(id).floorSeconds));
    const ceiling = Math.min(...REACTION_SET_IDS.map((id) => reactionEntryBlendBounds(id).ceilingSeconds));
    // knockdown needs longer than burning can afford, which is why the defaults are per set.
    expect(floor).toBeGreaterThan(ceiling);
    expect(reactionEntryBlendBounds("knockdown").floorSeconds).toBeGreaterThan(reactionEntryBlendBounds("burning").ceilingSeconds);
  });

  it("records the humanoid root-space defect without letting it set the default", () => {
    for (const id of REACTION_SET_IDS) {
      const rows = REACTION_BLEND_MEASUREMENT[id];
      const humanoid = rows.find((row) => row.archetype === "humanoid")!;
      expect(humanoid.guardComparable).toBe(false);
      // 501 mm of hips and 152 deg against 21 mm / 66 deg on a rig whose body and pack came
      // out of the same composer: that is a re-authoring, not a blend length.
      expect(humanoid.guardEntryHipsMm).toBeGreaterThan(400);
      for (const row of rows.filter((entry) => entry.guardComparable)) expect(row.guardEntryHipsMm).toBeLessThan(50);
      // Excluding it must not be doing the work: the honest preempt rows still set the floor.
      expect(reactionEntryBlendBounds(id).floorSeconds).toBeGreaterThan(0);
    }
  });
});

describe("The controller plays a set at that set's measured blends", () => {
  it("takes the entry and exit blends from the set a measured contact selected", async () => {
    const value = await hitBy("poison");
    expect(value.snapshot().cue.blendSeconds).toBeCloseTo(REACTION_SETS.poison.entryBlendSeconds, 9);
    expect(value.snapshot().cue.exitBlendSeconds).toBeCloseTo(REACTION_SETS.poison.exitBlendSeconds, 9);
    expect(trackFor(value, "defender-reaction-0-impact").blendInSeconds).toBeCloseTo(REACTION_SETS.poison.entryBlendSeconds, 9);
    expect(trackFor(value, "defender-recover").blendInSeconds).toBeCloseTo(REACTION_SETS.poison.exitBlendSeconds, 9);
    // The loop and the recovery are continuations of the same body, not new entries.
    expect(trackFor(value, "defender-reaction-1-loop").blendInSeconds).toBe(0);
    expect(trackFor(value, "defender-reaction-2-recover").blendInSeconds).toBe(0);
  });

  it("uses the burning numbers on a fire hit and the knockdown numbers on a heavy one", async () => {
    const burned = await hitBy("fire");
    expect(burned.snapshot().cue.blendSeconds).toBeCloseTo(REACTION_SETS.burning.entryBlendSeconds, 9);
    expect(burned.snapshot().cue.exitBlendSeconds).toBeCloseTo(REACTION_SETS.burning.exitBlendSeconds, 9);
    const floored = await hitBy(null, "LungeAttack");
    expect(floored.snapshot().reaction.timeline?.plans[0]?.setId).toBe("knockdown");
    expect(floored.snapshot().cue.blendSeconds).toBeCloseTo(REACTION_SETS.knockdown.entryBlendSeconds, 9);
  });

  it("leaves the unmeasured flinch path on its historical values", async () => {
    const value = await hitBy(null, "ClawAttack");
    expect(value.snapshot().reaction.timeline).toBeNull();
    expect(value.snapshot().cue.blendSeconds).toBeCloseTo(0.1, 9);
    expect(value.snapshot().cue.exitBlendSeconds).toBeCloseTo(0.12, 9);
  });

  it("crosses a preempt at the preempting set's own blend and leaves the cut plan's alone", async () => {
    const value = await hitBy("poison");
    value.recordReactionHit({ setId: "knockdown", atSeconds: 2 });
    expect(value.snapshot().cue.blendSeconds).toBeCloseTo(REACTION_SETS.knockdown.entryBlendSeconds, 9);
    const impacts = value.sequence()!.tracks.filter((track) => /defender-reaction-\d+-impact$/.test(track.id));
    expect(impacts).toHaveLength(2);
    expect(impacts[0]!.blendInSeconds).toBeCloseTo(REACTION_SETS.poison.entryBlendSeconds, 9);
    expect(impacts[1]!.blendInSeconds).toBeCloseTo(REACTION_SETS.knockdown.entryBlendSeconds, 9);
  });

  it("lets a reviewer override a blend without unmeasuring the hit that caused the reaction", async () => {
    const value = await hitBy("poison");
    value.setReactionBlend({ entrySeconds: 0.3, exitSeconds: 0.5 });
    const snapshot = value.snapshot();
    expect(snapshot.cue.blendSeconds).toBeCloseTo(0.3, 9);
    expect(snapshot.cue.exitBlendSeconds).toBeCloseTo(0.5, 9);
    expect(snapshot.contact.status).toBe("contact");
    expect(snapshot.contact.response).toBe("reaction");
    expect(snapshot.reaction.timeline?.plans).toHaveLength(1);
    expect(trackFor(value, "defender-reaction-0-impact").blendInSeconds).toBeCloseTo(0.3, 9);
    expect(() => value.setReactionBlend({ entrySeconds: 5 })).toThrow(/Entry blend/);
  });
});

/**
 * Contract defect D5. The precedence rules were real code with real tests and no way to reach
 * them in the product. These drive them the way a reviewer does — through the panel.
 */
describe("D5: a reviewer can drive a second hit into a running reaction", () => {
  async function panelFor(damageType: ReviewDamageType | null, attackId = "SpitAttack") {
    const value = await hitBy(damageType, attackId);
    const doc = domFixture();
    const panel = new CombatReviewPanel(value, { document: doc as unknown as Document });
    panels.add(panel);
    const root = panel.element as unknown as DomNode;
    const find = (command: string) => root.find((node) => node.dataset.command === command)!;
    const click = (command: string) => { const node = find(command); root.emit("click", node); };
    const history = () => root.find((node) => node.className === "combat-reaction-history")!
      .children.map((item) => item.textContent);
    return { value, root, find, click, history,
      section: root.find((node) => node.dataset.secondHit === "true")!,
      error: () => root.find((node) => node.className === "combat-error")!.textContent };
  }

  it("exposes the control only while a set is running", async () => {
    const set = await panelFor("poison");
    expect(set.section.hidden).toBe(false);
    set.click("reaction-clear");
    expect(set.section.hidden).toBe(true);
    expect(set.value.snapshot().reaction.timeline).toBeNull();
  });

  it("preempts a running poison with a knockdown and shows what happened to it", async () => {
    const set = await panelFor("poison");
    const time = set.find("reaction-hit-time");
    time.value = "2";
    set.find("reaction-hit-set").value = "knockdown";
    set.click("reaction-hit");
    expect(set.error()).toBe("");
    const timeline = set.value.snapshot().reaction.timeline!;
    expect(timeline.plans.map((plan) => plan.setId)).toEqual(["poison", "knockdown"]);
    expect(set.history()[0]).toContain("cut at 2.000 s");
    expect(set.history()[1]).toContain("Preempts at 2.000 s");
  });

  it("records an absorbed weaker hit rather than dropping it", async () => {
    const set = await panelFor("fire");
    set.find("reaction-hit-time").value = "2";
    set.find("reaction-hit-set").value = "poison";
    set.click("reaction-hit");
    const timeline = set.value.snapshot().reaction.timeline!;
    expect(timeline.plans).toHaveLength(1);
    expect(timeline.absorbed).toHaveLength(1);
    expect(set.history().at(-1)).toContain("Absorbed at 2.000 s");
    expect(set.history().at(-1)).toContain("lower precedence");
  });

  it("re-arms the same set without replaying its impact, and says so", async () => {
    const set = await panelFor("fire");
    set.find("reaction-hit-time").value = "2";
    set.find("reaction-hit-set").value = "burning";
    set.click("reaction-hit");
    const timeline = set.value.snapshot().reaction.timeline!;
    expect(timeline.plans).toHaveLength(1);
    expect(timeline.plans[0]!.hitSeconds).toHaveLength(2);
    expect(set.history()[0]).toContain("re-armed by 1 later hit(s)");
    expect(set.history()[0]).toContain("impact not replayed");
  });

  it("cuts the running reaction to a death from the same control", async () => {
    const set = await panelFor("poison");
    set.find("reaction-hit-time").value = "2";
    set.click("reaction-death-cut");
    expect(set.error()).toBe("");
    const snapshot = set.value.snapshot();
    expect(snapshot.cue.kind).toBe("death");
    expect(snapshot.cue.atSeconds).toBeCloseTo(2, 9);
    expect(snapshot.reaction.phases.every((phase) => phase.startSeconds < 2)).toBe(true);
    expect(trackFor(set.value, "defender-response").actionId).toBe("Death2");
  });

  it("surfaces a refusal instead of half-applying it", async () => {
    const set = await panelFor("poison");
    set.find("reaction-hit-time").value = "0.1";
    set.click("reaction-death-cut");
    expect(set.error()).toMatch(/not a cut/);
    expect(set.value.snapshot().cue.kind).toBe("reaction");
  });
});
