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
export type ReactionSetId = "poison" | "knockdown";
export type ReactionPhaseRole = "impact" | "loop" | "recover";

export const REACTION_ARCHETYPES: readonly ReactionArchetype[] = Object.freeze(["humanoid", "warden", "breachling"]);
export const REACTION_PHASE_ROLES: readonly ReactionPhaseRole[] = Object.freeze(["impact", "loop", "recover"]);

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

export const REACTION_SETS: Readonly<Record<ReactionSetId, ReactionSetContract>> = Object.freeze({
  poison: Object.freeze({
    id: "poison", label: "Poison — covered and screaming",
    clips: Object.freeze({ impact: "PoisonImpact", loop: "PoisonLoop", recover: "PoisonRecover" }),
    precedence: 10, damageTypes: Object.freeze<ReviewDamageType[]>(["poison"]), fromHeavyMelee: false,
  }),
  knockdown: Object.freeze({
    id: "knockdown", label: "Knockdown — off the feet, prone, get up",
    clips: Object.freeze({ impact: "Knockdown", loop: "ProneHold", recover: "GetUp" }),
    precedence: 20, damageTypes: Object.freeze<ReviewDamageType[]>([]), fromHeavyMelee: true,
  }),
});

/** Every clip name the contract reserves, in contract order. */
export const REACTION_CONTRACT_CLIPS: readonly string[] = Object.freeze(
  (["poison", "knockdown"] as const).flatMap((id) => REACTION_PHASE_ROLES.map((role) => REACTION_SETS[id].clips[role])));

/**
 * A loop is seamless only at its own frame 0, so a hold is quantised to whole
 * periods rather than cut wherever the effect happens to end. Measured on the
 * shipped pack: PoisonLoop cut at 0.868 s and joined to PoisonRecover[0] is
 * 62.1964 deg apart on mixamorig:Neck and 44.658 mm at the hips, against
 * 0.2016 deg / 0.009 mm at a whole period — and 0.2016 deg is the unit-quaternion
 * storage floor, i.e. indistinguishable from an exact match.
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
 */
export function reactionSetForContact(contact: {
  readonly damageType?: ReviewDamageType | null; readonly severity?: "light" | "heavy" | null;
}): ReactionSetId | null {
  const damageType = contact.damageType ?? null;
  if (damageType && damageType !== "physical") {
    const matched = (Object.keys(REACTION_SETS) as ReactionSetId[])
      .find((id) => REACTION_SETS[id].damageTypes.includes(damageType));
    if (matched) return matched;
  }
  if (contact.severity === "heavy") {
    return (Object.keys(REACTION_SETS) as ReactionSetId[]).find((id) => REACTION_SETS[id].fromHeavyMelee) ?? null;
  }
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
