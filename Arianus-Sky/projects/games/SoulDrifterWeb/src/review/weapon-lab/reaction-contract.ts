import type { ReviewActorFamily, ReviewDamageType } from "./combat-review-types";

/**
 * The special-attack reaction contract, issue 458.
 *
 * A special attack does not play an ordinary flinch. It takes the body over with
 * a three-part set — impact, a loop held for as long as the effect lasts, then a
 * recovery — and hands control back to whatever the actor was doing. Owner:
 * "replace them with that and then go back to the correct scene."
 *
 * Sets are keyed by ARCHETYPE and DAMAGE TYPE, never by model. The same six clip
 * names exist for every archetype, so one selection rule serves the human, the
 * Wardens and the Breachlings, and a body that reads badly on the shared clip is
 * overridden under the same name rather than by a new rule here.
 *
 * Nothing in this module touches THREE, the DOM or an asset. It is the timing
 * arithmetic and the interruption policy alone, so both the composer and the
 * tests can exercise it without a rig.
 *
 * On damage-type naming (contract decision D1): the record types the spit
 * `"poison"` (`combat-review-contact-resolver.ts` assigns `damageType: "poison"`
 * for emitter `base-spit`) and the authored clips are named `Poison*`. This
 * module therefore keys off the existing five-member `ReviewDamageType` and adds
 * no sixth member; if the owner later renames poison to acid, only the
 * `damageTypes` row below moves.
 */
export type ReactionArchetype = "humanoid" | "warden" | "breachling";
export type ReactionSetId = "poison" | "burning" | "knockdown";
export type ReactionPhaseRole = "impact" | "loop" | "recover";

export const REACTION_ARCHETYPES: readonly ReactionArchetype[] = Object.freeze(["humanoid", "warden", "breachling"]);
export const REACTION_PHASE_ROLES: readonly ReactionPhaseRole[] = Object.freeze(["impact", "loop", "recover"]);
/**
 * Every set the contract knows, ordered by ascending precedence. This is the one
 * list every enumeration reads — the clip reservation, the selection index and
 * the tests all derive from it, so adding a set is a single edit here plus its
 * row below.
 */
export const REACTION_SET_IDS: readonly ReactionSetId[] = Object.freeze(["poison", "burning", "knockdown"]);

export interface ReactionSetContract {
  readonly id: ReactionSetId;
  readonly label: string;
  /** Exact authored clip names. Identical across every archetype. */
  readonly clips: Readonly<Record<ReactionPhaseRole, string>>;
  /** A later hit preempts an active set only with strictly greater precedence. */
  readonly precedence: number;
  /** Measured contact damage types that select this set. */
  readonly damageTypes: readonly ReviewDamageType[];
  /** Whether an ordinary heavy melee strike escalates into this set. */
  readonly fromHeavyMelee: boolean;
}

/**
 * Precedence ranks how completely a set takes the body over, and therefore what
 * a later hit is allowed to interrupt. Only a strictly greater number preempts.
 *
 *  10 poison   — the body is its own, clutching and screaming. Any takeover reads
 *                over the top of it.
 *  15 burning  — the arms are committed. BurnBurn swings both hands through
 *                0.62-0.66 m of vertical travel for its whole 3 s period, and the
 *                legs carry a weight-shift shuffle under them; PoisonLoop wants
 *                the same arms for the same seconds, so the two cannot co-read and
 *                the more urgent one has to win. (An earlier draft of this comment
 *                said the hands beat at the chest and hair and the legs took real
 *                planted steps. Measured on the shipped bytes they do neither: the
 *                hands peak at 0.785 m and 0.766 m against a head joint sitting at
 *                0.803-0.829 m, so they never reach it, and the closest hand or
 *                forearm approach to the spine-to-neck axis is 102.9 mm. See the
 *                open motion defects in docs/.../attack-reaction-contract.md.) Fire on a poisoned body takes over (an already-poisoned body
 *                that catches alight is a burning body); a spit onto a burning
 *                body is absorbed and recorded, because the poison's own hunch is
 *                already covered by a body doing something more violent with the
 *                same limbs.
 *  20 knockdown — still the top, unchanged. Feet leave the floor, and neither the
 *                poison hunch nor the burn's flailing can be played on a prone
 *                body, so a knockdown preempts a burn exactly as it preempts a
 *                poison. This is the owner's constraint and the reason burning
 *                sits at 15 rather than above it.
 *
 * A SECOND FIRE HIT ON AN ALREADY-BURNING BODY IS NOT A PREEMPT. `applyReactionHit`
 * routes a repeat of the running set to `rearmReactionPlan`, which extends the hold
 * to cover the new hit and leaves BurnFlare alone. That is the right read for fire:
 * the flare is the CATCH — the moment the body goes up — and a body already alight
 * cannot catch again. A second fireball refuels it, so the hold restarts from the
 * new hit and the burn simply lasts longer. Replaying BurnFlare would snap the body
 * back to the catch pose mid-burn, which is the thing the re-trigger guard exists
 * to prevent.
 */
export const REACTION_SETS: Readonly<Record<ReactionSetId, ReactionSetContract>> = Object.freeze({
  poison: Object.freeze({
    id: "poison", label: "Poison — covered and screaming",
    clips: Object.freeze({ impact: "PoisonImpact", loop: "PoisonLoop", recover: "PoisonRecover" }),
    precedence: 10, damageTypes: Object.freeze<ReviewDamageType[]>(["poison"]), fromHeavyMelee: false,
  }),
  burning: Object.freeze({
    id: "burning", label: "Burning — alight, beating at the flames",
    clips: Object.freeze({ impact: "BurnFlare", loop: "BurnBurn", recover: "BurnRecover" }),
    precedence: 15, damageTypes: Object.freeze<ReviewDamageType[]>(["fire"]), fromHeavyMelee: false,
  }),
  knockdown: Object.freeze({
    id: "knockdown", label: "Knockdown — off the feet, prone, get up",
    clips: Object.freeze({ impact: "Knockdown", loop: "ProneHold", recover: "GetUp" }),
    precedence: 20, damageTypes: Object.freeze<ReviewDamageType[]>([]), fromHeavyMelee: true,
  }),
});

/** Every clip name the contract reserves, in contract order. */
export const REACTION_CONTRACT_CLIPS: readonly string[] = Object.freeze(
  REACTION_SET_IDS.flatMap((id) => REACTION_PHASE_ROLES.map((role) => REACTION_SETS[id].clips[role])));

/**
 * One pass over the table at module load, so an ambiguous table cannot ship.
 *
 * Two sets claiming the same damage type would make selection depend on key order;
 * two claiming the heavy-melee escalation likewise; equal precedences would mean
 * neither preempts the other and a hit would silently be absorbed instead of
 * either interrupting or extending; a clip name shared by two sets would let the
 * pack allowlist register half of one set as half of another. All four are build
 * errors here rather than a wrong body at review time.
 */
const REACTION_SET_INDEX = (() => {
  const byDamageType = new Map<ReviewDamageType, ReactionSetId>();
  const byClip = new Map<string, ReactionSetId>();
  const precedences = new Map<number, ReactionSetId>();
  let heavyMelee: ReactionSetId | null = null;
  const unlisted = Object.keys(REACTION_SETS).filter((id) => !REACTION_SET_IDS.includes(id as ReactionSetId));
  if (unlisted.length) throw new Error(`Reaction set(s) ${unlisted.join(", ")} exist but are not in REACTION_SET_IDS; nothing would enumerate them.`);
  for (const id of REACTION_SET_IDS) {
    const set = REACTION_SETS[id];
    if (!set || set.id !== id) throw new Error(`Reaction set ${id} is missing or mislabelled.`);
    const clash = precedences.get(set.precedence);
    if (clash) throw new Error(`Reaction sets ${clash} and ${id} share precedence ${set.precedence}; neither could preempt the other.`);
    precedences.set(set.precedence, id);
    for (const damageType of set.damageTypes) {
      if (damageType === "physical") throw new Error(`Reaction set ${id} claims physical; an ordinary hit is the flinch picker's, not a set's.`);
      const owner = byDamageType.get(damageType);
      if (owner) throw new Error(`Damage type ${damageType} is claimed by both the ${owner} and ${id} reaction sets.`);
      byDamageType.set(damageType, id);
    }
    if (set.fromHeavyMelee) {
      if (heavyMelee) throw new Error(`Reaction sets ${heavyMelee} and ${id} both escalate from heavy melee.`);
      heavyMelee = id;
    }
    for (const role of REACTION_PHASE_ROLES) {
      const clipName = set.clips[role];
      const owner = byClip.get(clipName);
      if (owner) throw new Error(`Reaction clip ${clipName} is claimed by both the ${owner} and ${id} sets.`);
      byClip.set(clipName, id);
    }
  }
  return Object.freeze({ byDamageType, heavyMelee });
})();

/**
 * A loop is seamless only at its own frame 0, so a hold is quantised to whole
 * periods rather than cut wherever the effect happens to end. Measured on
 * poison-r4: PoisonLoop cut at 0.868 s and joined to PoisonRecover[0] is
 * 62.1959 deg apart on mixamorig:Neck and 44.665 mm at the hips (rig units),
 * against 0.0581 deg / 0.009 mm at a whole period.
 *
 * The whole-period residual is measurement, NOT a storage floor and NOT motion.
 * At a whole period the stored quaternion floats are bit-identical between the
 * last and first key, so storage contributes exactly zero. What is left is the
 * sampler taking acos of a float32 quaternion's dot with itself: these bind
 * quaternions are not exactly unit, and on this body that alone reads as up to
 * 0.0475 deg. Normalise before comparing and the same joins measure 0.0047 deg
 * (poison) and 0.0018 deg (burn) over the 52 joints that carry motion — an order
 * of magnitude below the artefact that used to be reported as the number.
 *
 * Two consequences worth stating plainly, because the first version of this note
 * got both wrong. A worst-bone name is meaningless unless frozen joints are
 * excluded: mixamorig:LeftHandPinky3 was named on five structurally different
 * joins purely because its track was constant. And "storage floor" is the wrong
 * description of a residual that vanishes when the reader normalises.
 *
 * The burn pack measures the same way: BurnBurn cut at 0.868 s and joined to
 * BurnRecover[0] is 42.7604 deg apart on mixamorig:LeftArm and 19.670 mm at the
 * hips, against 0.0486 deg / 0.003 mm at a whole period. Cutting later is worse,
 * not better: 1.5 s in, the same join is 53.4524 deg on mixamorig:RightForeArm
 * and 34.449 mm. Same rule, same reason, on a clip whose arms move far more than
 * the poison loop's.
 */
export const REACTION_LOOP_FIT = "whole-periods" as const;
/** Bound on a single hold, so a runaway effect duration cannot build an unbounded sequence. */
export const REACTION_MAX_HOLD_SECONDS = 30;

export interface ReactionClipDurations {
  readonly impact: number;
  readonly loop: number;
  readonly recover: number;
}
export interface ReactionPhase {
  readonly role: ReactionPhaseRole;
  readonly clipName: string;
  /** Absolute sequence seconds. */
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly clipDurationSeconds: number;
  readonly loop: boolean;
}
export interface ReactionPlan {
  readonly setId: ReactionSetId;
  readonly archetype: ReactionArchetype;
  /** Absolute sequence second at which the impact begins. */
  readonly atSeconds: number;
  /** Effect duration asked for, before whole-period quantisation. */
  readonly requestedHoldSeconds: number;
  readonly holdSeconds: number;
  readonly loopPeriods: number;
  /** holdSeconds − requestedHoldSeconds; positive means the loop outlives the effect. */
  readonly quantizationSeconds: number;
  readonly durationSeconds: number;
  readonly phases: readonly ReactionPhase[];
  /** Absolute times of every hit folded into this plan, first one included. */
  readonly hitSeconds: readonly number[];
}
/** A hit that changed nothing visible, kept as evidence rather than dropped. */
export interface AbsorbedReactionHit {
  readonly setId: ReactionSetId;
  readonly atSeconds: number;
  readonly effectSeconds: number;
  readonly reason: "lower-precedence" | "outside-plan";
}
export interface ReactionTimeline {
  readonly archetype: ReactionArchetype;
  /** Ordered by start. Each plan is cut by the next one's start. */
  readonly plans: readonly ReactionPlan[];
  readonly absorbed: readonly AbsorbedReactionHit[];
}
export interface ReactionHit {
  readonly setId: ReactionSetId;
  readonly atSeconds: number;
  /** How long the effect lasts. Not the clip length. */
  readonly effectSeconds: number;
  readonly durations: ReactionClipDurations;
}

const finite = (value: number, label: string, { positive = false } = {}) => {
  if (!Number.isFinite(value) || value < 0 || (positive && value <= 0)) {
    throw new Error(`${label} must be finite and ${positive ? "positive" : "nonnegative"}.`);
  }
  return value;
};

export function reactionArchetypeForFamily(family: ReviewActorFamily): ReactionArchetype {
  return family === "human" ? "humanoid" : family;
}

/**
 * Which set a measured contact selects, or null to leave the ordinary
 * directional flinch picker alone. A mapped special damage type wins; otherwise
 * a heavy strike escalates to the shared knockdown, exactly as the contract
 * table assigns it to Lunge, TailWhip, AshCall and the heavy melee rows.
 *
 * The damage type wins even when the strike is also heavy: a heavy fire hit is a
 * body on fire, not a body on the floor. That is the same rule poison has always
 * had, and it is why the knockdown escalation is only reached by a hit that
 * carries no special type of its own. Precedence is a separate question, asked
 * later by `applyReactionHit` about what is ALREADY running.
 *
 * Selection is a table lookup, not a scan, so it cannot depend on key order — and
 * the table that backs it is checked for ambiguity at module load.
 */
export function reactionSetForContact(contact: {
  readonly damageType?: ReviewDamageType | null; readonly severity?: "light" | "heavy" | null;
}): ReactionSetId | null {
  const damageType = contact.damageType ?? null;
  const matched = damageType ? REACTION_SET_INDEX.byDamageType.get(damageType) : undefined;
  if (matched) return matched;
  if (contact.severity === "heavy") return REACTION_SET_INDEX.heavyMelee;
  return null;
}

/** Whole periods nearest the effect duration, never fewer than one, never past the cap. */
export function reactionLoopPeriods(effectSeconds: number, loopDurationSeconds: number): number {
  finite(effectSeconds, "Effect duration");
  finite(loopDurationSeconds, "Loop clip duration", { positive: true });
  const cap = Math.max(1, Math.floor(REACTION_MAX_HOLD_SECONDS / loopDurationSeconds));
  return Math.min(cap, Math.max(1, Math.round(effectSeconds / loopDurationSeconds)));
}

function planPhases(setId: ReactionSetId, atSeconds: number, holdSeconds: number,
  durations: ReactionClipDurations): readonly ReactionPhase[] {
  const clips = REACTION_SETS[setId].clips;
  const loopStart = atSeconds + durations.impact;
  return Object.freeze([
    Object.freeze({ role: "impact" as const, clipName: clips.impact, startSeconds: atSeconds,
      durationSeconds: durations.impact, clipDurationSeconds: durations.impact, loop: false }),
    Object.freeze({ role: "loop" as const, clipName: clips.loop, startSeconds: loopStart,
      durationSeconds: holdSeconds, clipDurationSeconds: durations.loop, loop: true }),
    Object.freeze({ role: "recover" as const, clipName: clips.recover, startSeconds: loopStart + holdSeconds,
      durationSeconds: durations.recover, clipDurationSeconds: durations.recover, loop: false }),
  ]);
}

export function buildReactionPlan(request: {
  readonly archetype: ReactionArchetype; readonly setId: ReactionSetId; readonly atSeconds: number;
  readonly effectSeconds: number; readonly durations: ReactionClipDurations; readonly hitSeconds?: readonly number[];
}): ReactionPlan {
  if (!REACTION_SETS[request.setId]) throw new Error(`Unknown reaction set: ${request.setId}`);
  if (!REACTION_ARCHETYPES.includes(request.archetype)) throw new Error(`Unknown reaction archetype: ${request.archetype}`);
  finite(request.atSeconds, "Reaction time");
  finite(request.effectSeconds, "Effect duration");
  for (const role of REACTION_PHASE_ROLES) finite(request.durations[role], `${role} clip duration`, { positive: true });
  const loopPeriods = reactionLoopPeriods(request.effectSeconds, request.durations.loop);
  const holdSeconds = loopPeriods * request.durations.loop;
  const durations = Object.freeze({ ...request.durations });
  return Object.freeze({
    setId: request.setId, archetype: request.archetype, atSeconds: request.atSeconds,
    requestedHoldSeconds: request.effectSeconds, holdSeconds, loopPeriods,
    quantizationSeconds: holdSeconds - request.effectSeconds,
    durationSeconds: durations.impact + holdSeconds + durations.recover,
    phases: planPhases(request.setId, request.atSeconds, holdSeconds, durations),
    hitSeconds: Object.freeze([...(request.hitSeconds ?? []), request.atSeconds].sort((a, b) => a - b)),
  });
}

/**
 * A repeat hit of the same set extends the hold instead of replaying the impact.
 * The head-whip is not restarted — that is the re-trigger guard the contract asks
 * for at R9c, where SoulTax raises two hit events and a three-arrow multishot
 * three.
 */
export function rearmReactionPlan(plan: ReactionPlan, hit: { atSeconds: number; effectSeconds: number }): ReactionPlan {
  finite(hit.atSeconds, "Reaction time");
  finite(hit.effectSeconds, "Effect duration");
  const durations = {
    impact: plan.phases[0]!.clipDurationSeconds,
    loop: plan.phases[1]!.clipDurationSeconds,
    recover: plan.phases[2]!.clipDurationSeconds,
  };
  const loopStart = plan.atSeconds + durations.impact;
  const requested = Math.max(plan.requestedHoldSeconds, hit.atSeconds + hit.effectSeconds - loopStart, 0);
  const loopPeriods = reactionLoopPeriods(requested, durations.loop);
  const holdSeconds = loopPeriods * durations.loop;
  return Object.freeze({
    ...plan, requestedHoldSeconds: requested, holdSeconds, loopPeriods,
    quantizationSeconds: holdSeconds - requested,
    durationSeconds: durations.impact + holdSeconds + durations.recover,
    phases: planPhases(plan.setId, plan.atSeconds, holdSeconds, durations),
    hitSeconds: Object.freeze([...plan.hitSeconds, hit.atSeconds].sort((a, b) => a - b)),
  });
}

/** Re-quantise an existing plan to a different effect duration, keeping its start and hits. */
export function retimeReactionPlan(plan: ReactionPlan, effectSeconds: number): ReactionPlan {
  return buildReactionPlan({
    archetype: plan.archetype, setId: plan.setId, atSeconds: plan.atSeconds, effectSeconds,
    durations: { impact: plan.phases[0]!.clipDurationSeconds, loop: plan.phases[1]!.clipDurationSeconds,
      recover: plan.phases[2]!.clipDurationSeconds },
    hitSeconds: plan.hitSeconds.filter((value) => value !== plan.atSeconds),
  });
}

export function reactionSetPreempts(active: ReactionSetId, next: ReactionSetId): boolean {
  return REACTION_SETS[next].precedence > REACTION_SETS[active].precedence;
}

/**
 * Fold a hit into the defender's timeline. Four outcomes, and only these:
 *  - no active reaction, or the active one has already finished → a new plan;
 *  - the same set while one is running → re-arm, impact not replayed;
 *  - a strictly higher-precedence set → preempt; the running plan is cut at this
 *    hit and the new set starts from its own impact;
 *  - anything else → absorbed, recorded, and nothing visible changes.
 */
export function applyReactionHit(timeline: ReactionTimeline | null, hit: ReactionHit,
  archetype: ReactionArchetype): ReactionTimeline {
  finite(hit.atSeconds, "Reaction time");
  const plans = timeline?.plans ?? [];
  const absorbed = timeline?.absorbed ?? [];
  if (timeline && timeline.archetype !== archetype) throw new Error("A reaction timeline belongs to one archetype.");
  const active = plans[plans.length - 1] ?? null;
  const build = () => buildReactionPlan({ archetype, setId: hit.setId, atSeconds: hit.atSeconds,
    effectSeconds: hit.effectSeconds, durations: hit.durations });
  if (!active || hit.atSeconds >= active.atSeconds + active.durationSeconds - 1e-9) {
    return freezeTimeline(archetype, [...plans, build()], absorbed);
  }
  if (hit.atSeconds < active.atSeconds) {
    return freezeTimeline(archetype, plans,
      [...absorbed, { setId: hit.setId, atSeconds: hit.atSeconds, effectSeconds: hit.effectSeconds, reason: "outside-plan" as const }]);
  }
  if (hit.setId === active.setId) {
    return freezeTimeline(archetype, [...plans.slice(0, -1), rearmReactionPlan(active, hit)], absorbed);
  }
  if (reactionSetPreempts(active.setId, hit.setId)) {
    return freezeTimeline(archetype, [...plans, build()], absorbed);
  }
  return freezeTimeline(archetype, plans,
    [...absorbed, { setId: hit.setId, atSeconds: hit.atSeconds, effectSeconds: hit.effectSeconds, reason: "lower-precedence" as const }]);
}

function freezeTimeline(archetype: ReactionArchetype, plans: readonly ReactionPlan[],
  absorbed: readonly AbsorbedReactionHit[]): ReactionTimeline {
  return Object.freeze({ archetype, plans: Object.freeze([...plans]), absorbed: Object.freeze([...absorbed]) });
}

export interface PlacedReactionPhase extends ReactionPhase {
  readonly planIndex: number;
  readonly setId: ReactionSetId;
  /** Seconds already consumed by an earlier cut; a loop resumes at this offset. */
  readonly clipOffsetSeconds: number;
  readonly truncated: boolean;
}

/**
 * Absolute, non-overlapping phases. Every plan is cut where the next one begins,
 * and the whole timeline is cut at `cutAtSeconds` — that is how a death lands in
 * the middle of a reaction without the reaction being erased first.
 *
 * Scrubbing needs nothing else: the result is a pure function of the timeline and
 * the cut, so seeking to any time reproduces the same pose the same way playing
 * to it would, with no wall-clock state anywhere.
 */
export function reactionTimelinePhases(timeline: ReactionTimeline,
  cutAtSeconds = Number.POSITIVE_INFINITY): readonly PlacedReactionPhase[] {
  const out: PlacedReactionPhase[] = [];
  timeline.plans.forEach((plan, planIndex) => {
    const next = timeline.plans[planIndex + 1];
    const limit = Math.min(cutAtSeconds, next ? next.atSeconds : Number.POSITIVE_INFINITY,
      plan.atSeconds + plan.durationSeconds);
    for (const phase of plan.phases) {
      const start = phase.startSeconds;
      if (start >= limit - 1e-9) continue;
      const durationSeconds = Math.min(phase.durationSeconds, limit - start);
      if (durationSeconds <= 1e-9) continue;
      out.push(Object.freeze({ ...phase, durationSeconds, planIndex, setId: plan.setId,
        clipOffsetSeconds: 0, truncated: durationSeconds < phase.durationSeconds - 1e-9 }));
    }
  });
  return Object.freeze(out);
}

/** Absolute second the whole timeline finishes, before any cut. */
export function reactionTimelineEnd(timeline: ReactionTimeline): number {
  return timeline.plans.reduce((end, plan) => Math.max(end, plan.atSeconds + plan.durationSeconds), 0);
}
