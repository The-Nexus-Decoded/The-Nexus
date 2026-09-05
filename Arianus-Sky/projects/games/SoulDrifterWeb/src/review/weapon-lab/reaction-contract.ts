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
  /**
   * Seconds the controller crosses into this set's impact over. Derived from
   * `REACTION_BLEND_MEASUREMENT` below and checked against it at module load, so it
   * cannot drift away from the measurement without a build error.
   */
  readonly entryBlendSeconds: number;
  /** Seconds the controller settles from this set's recovery back to the ready pose over. */
  readonly exitBlendSeconds: number;
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
    // 0.105, not 0.125: poison is the lowest precedence, so nothing can ever be cut for it
    // and it is never entered by preempting a running set. The wider preempt gap that used
    // to bind this floor described a transition reactionSetPreempts forbids.
    entryBlendSeconds: 0.105, exitBlendSeconds: 0.36,
  }),
  burning: Object.freeze({
    id: "burning", label: "Burning — alight, beating at the flames",
    clips: Object.freeze({ impact: "BurnFlare", loop: "BurnBurn", recover: "BurnRecover" }),
    precedence: 15, damageTypes: Object.freeze<ReviewDamageType[]>(["fire"]), fromHeavyMelee: false,
    entryBlendSeconds: 0.12, exitBlendSeconds: 0.24,
  }),
  knockdown: Object.freeze({
    id: "knockdown", label: "Knockdown — off the feet, prone, get up",
    clips: Object.freeze({ impact: "Knockdown", loop: "ProneHold", recover: "GetUp" }),
    precedence: 20, damageTypes: Object.freeze<ReviewDamageType[]>([]), fromHeavyMelee: true,
    entryBlendSeconds: 0.215, exitBlendSeconds: 0.075,
  }),
});

/**
 * ONE ROW PER SET PER ARCHETYPE, measured on the shipped bytes (contract defect D3).
 *
 * D3 said the entry gap "was never measured against the blend". It has been now, by
 * `issue-458-motion-composer-v1/tools/reaction-entry-gap.mjs`, which reads exported
 * keyframe tracks with NORMALISED quaternions (so a constant track cannot read as an
 * angle against itself — defect D2) and takes the worst per-joint angle over the WHOLE
 * PERIOD of every clip a defender can realistically be holding, not one frame of one of
 * them. A hit lands whenever it lands; measuring at guard[0] would be measuring the
 * harness, not the runtime.
 *
 * Three populations, because there are three real ways into an impact:
 *  - `guardEntryDeg`   the first hit. Source: every guard/stance clip the defender's own
 *                      catalog offers (nine for the humanoid, `Idle` + `CombatIdle` for
 *                      the Warden and the Breachling).
 *  - `preemptEntryDeg` a second hit that preempts. Source: the running set's own impact
 *                      and loop, over their periods, because a preempt cuts wherever it
 *                      cuts. This population only exists because D5 is wired.
 *  - `exitDeg`         recover[end] back to any phase of any guard clip.
 *
 * `guardComparable` is false for the humanoid, and this is a finding, not a convenience.
 * The humanoid packs are authored in the RUNTIME BODY's own bind space — hips at the
 * body's neutral, body facing world +X (the composer's yaw 0) — while every clip in the
 * shipped `human-foundation-pilot-animation-library.glb` is floor-referenced and faces
 * world +Z. Measured on the shipped bytes: BurnFlare[0], PoisonImpact[0] and Knockdown[0]
 * all stand with the soles at y = -0.500 rig units and a body-forward yaw of +90.0 deg,
 * while `GreatSword__GreatSwordIdle`[0] stands with the soles at y = -0.003 and a yaw of
 * -8.2 deg (`ProLongbow__UnarmedIdle01` -1.4 deg). That is a 497 mm drop and a ~90 deg
 * spin at the moment of impact, and it is why the humanoid's guard rows read 151.98 deg
 * and 501 mm against the Warden's 65.80 deg / 20.89 mm and the Breachling's 46.97 deg /
 * 12.07 mm — the mobs' bodies and packs came out of the same composer, so their guard
 * clips and their reaction clips share a space and the humanoid's do not. No blend length
 * fixes a half-metre teleport; it is a re-authoring, tracked separately, and until it is
 * done the humanoid's guard rows are recorded here as evidence but excluded from the
 * derivation so a defect cannot silently set the product's blend.
 */
export interface ReactionBlendMeasurement {
  readonly archetype: ReactionArchetype;
  /** Worst per-joint angle from any phase of any guard clip to this set's impact[0]. */
  readonly guardEntryDeg: number;
  /** Hips/root translation over the same worst row, in mm of rig units. */
  readonly guardEntryHipsMm: number;
  /** Worst per-joint angle from any phase of a running set to this set's impact[0]. */
  readonly preemptEntryDeg: number;
  /** Worst per-joint angle from this set's recover[end] to any phase of any guard clip. */
  readonly exitDeg: number;
  /** Peak worst-bone rate the impact clip's own authored motion reaches, deg/s at 60 fps. */
  readonly impactPeakRate: number;
  /** Second by which the impact clip has laid down half of all the angular motion it ever lays down. */
  readonly impactHalfTravelSeconds: number;
  readonly recoverPeakRate: number;
  readonly recoverSeconds: number;
  /** False when this archetype's guard clips are not in the pack's space; see above. */
  readonly guardComparable: boolean;
}
const HUMANOID_GUARD_COMPARABLE = false;
export const REACTION_BLEND_MEASUREMENT: Readonly<Record<ReactionSetId, readonly ReactionBlendMeasurement[]>> = Object.freeze({
  poison: Object.freeze([
    Object.freeze({ archetype: "humanoid" as const, guardEntryDeg: 151.9755, guardEntryHipsMm: 501.39, preemptEntryDeg: 86.5758,
      exitDeg: 151.9755, impactPeakRate: 754.2, impactHalfTravelSeconds: 0.1833, recoverPeakRate: 231.6, recoverSeconds: 1.6,
      guardComparable: HUMANOID_GUARD_COMPARABLE }),
    Object.freeze({ archetype: "warden" as const, guardEntryDeg: 65.7954, guardEntryHipsMm: 20.89, preemptEntryDeg: 81.017,
      exitDeg: 65.7954, impactPeakRate: 657.1, impactHalfTravelSeconds: 0.2667, recoverPeakRate: 184.3, recoverSeconds: 2.4,
      guardComparable: true }),
    Object.freeze({ archetype: "breachling" as const, guardEntryDeg: 46.9677, guardEntryHipsMm: 12.07, preemptEntryDeg: 126.2847,
      exitDeg: 46.9677, impactPeakRate: 1386.6, impactHalfTravelSeconds: 0.2, recoverPeakRate: 563.7, recoverSeconds: 1.7,
      guardComparable: true }),
  ]),
  burning: Object.freeze([
    Object.freeze({ archetype: "humanoid" as const, guardEntryDeg: 151.9755, guardEntryHipsMm: 501.39, preemptEntryDeg: 92.1456,
      exitDeg: 151.9755, impactPeakRate: 770.8, impactHalfTravelSeconds: 0.15, recoverPeakRate: 417.5, recoverSeconds: 1.7,
      guardComparable: HUMANOID_GUARD_COMPARABLE }),
    Object.freeze({ archetype: "warden" as const, guardEntryDeg: 65.7954, guardEntryHipsMm: 20.89, preemptEntryDeg: 81.017,
      exitDeg: 65.7954, impactPeakRate: 753.3, impactHalfTravelSeconds: 0.2167, recoverPeakRate: 277.8, recoverSeconds: 2,
      guardComparable: true }),
    Object.freeze({ archetype: "breachling" as const, guardEntryDeg: 46.9677, guardEntryHipsMm: 12.07, preemptEntryDeg: 98.5787,
      exitDeg: 46.9677, impactPeakRate: 1508.8, impactHalfTravelSeconds: 0.2333, recoverPeakRate: 854.3, recoverSeconds: 2,
      guardComparable: true }),
  ]),
  knockdown: Object.freeze([
    Object.freeze({ archetype: "humanoid" as const, guardEntryDeg: 151.9755, guardEntryHipsMm: 501.39, preemptEntryDeg: 92.1456,
      exitDeg: 151.9755, impactPeakRate: 431, impactHalfTravelSeconds: 0.45, recoverPeakRate: 672.7, recoverSeconds: 2.3,
      guardComparable: HUMANOID_GUARD_COMPARABLE }),
    Object.freeze({ archetype: "warden" as const, guardEntryDeg: 65.7954, guardEntryHipsMm: 20.89, preemptEntryDeg: 76.7128,
      exitDeg: 65.7954, impactPeakRate: 408.5, impactHalfTravelSeconds: 0.4, recoverPeakRate: 877.5, recoverSeconds: 3,
      guardComparable: true }),
    Object.freeze({ archetype: "breachling" as const, guardEntryDeg: 46.9677, guardEntryHipsMm: 12.07, preemptEntryDeg: 126.2847,
      exitDeg: 46.9677, impactPeakRate: 1597, impactHalfTravelSeconds: 0.25, recoverPeakRate: 873.1, recoverSeconds: 2.2,
      guardComparable: true }),
  ]),
});

/** Pinned defaults are rounded UP to this grid, so a rounded number can never fall below its floor. */
export const REACTION_BLEND_QUANTUM_SECONDS = 0.005;

export interface ReactionBlendBounds {
  /** Shortest blend that is not itself the fastest motion on screen. */
  readonly floorSeconds: number;
  /** Longest blend that still lets the entered clip read; the exit bound is loose by nature. */
  readonly ceilingSeconds: number;
  /** floorSeconds rounded up to the quantum — what the set contract must pin. */
  readonly derivedSeconds: number;
}
const quantise = (seconds: number) =>
  Math.round(Math.ceil(seconds / REACTION_BLEND_QUANTUM_SECONDS) * REACTION_BLEND_QUANTUM_SECONDS * 1e6) / 1e6;

/**
 * The blend an entry needs, and the blend it can afford.
 *
 * FLOOR — a pop is a transition faster than any motion the animation itself contains.
 * Crossing `gap` degrees in `b` seconds runs at gap/b deg/s, so the honest ceiling on that
 * rate is the peak rate the entered clip's own authored motion reaches, and b >= gap/peak.
 * This is why the answer is not "make it long": an impact SHOULD be fast, and the floor is
 * the shortest blend that is defensibly fast rather than broken.
 *
 * CEILING — an impact still has to land. A crossfade still running past the point where the
 * impact clip has laid down half of its total angular motion holds the old pose over most of
 * the new clip, and the hit turns to mush. That is `impactHalfTravelSeconds`.
 */
export function reactionEntryBlendBounds(setId: ReactionSetId): ReactionBlendBounds {
  const rows = REACTION_BLEND_MEASUREMENT[setId];
  // A preempting entry is only reachable for a set that can actually cut another one.
  // reactionSetPreempts requires STRICTLY greater precedence, so the lowest-ranked set
  // is never entered by preemption and its preemptEntryDeg describes a transition the
  // runtime forbids. Feeding that term to the floor inflated poison's blend from
  // 0.105 s to 0.125 s off a gap it can never be asked to cross.
  const canBeEnteredByPreempting = REACTION_SET_IDS.some((other) => reactionSetPreempts(other, setId));
  const floorSeconds = Math.max(...rows.map((row) => {
    const guard = row.guardComparable ? row.guardEntryDeg : Number.NEGATIVE_INFINITY;
    const preempt = canBeEnteredByPreempting ? row.preemptEntryDeg : Number.NEGATIVE_INFINITY;
    return Math.max(guard, preempt) / row.impactPeakRate;
  }));
  return Object.freeze({ floorSeconds, ceilingSeconds: Math.min(...rows.map((row) => row.impactHalfTravelSeconds)),
    derivedSeconds: quantise(floorSeconds) });
}
/**
 * The same rule on the way out, against the recovery's own peak rate. The exit is a settle,
 * not an event, and its ceiling — the recovery clip's own length — is loose: what actually
 * binds it is the floor, because the recoveries end on the composer's neutral rather than on
 * any guard pose, so there is a real 47–66 deg of posture left to cross.
 */
export function reactionExitBlendBounds(setId: ReactionSetId): ReactionBlendBounds {
  const rows = REACTION_BLEND_MEASUREMENT[setId].filter((row) => row.guardComparable);
  const floorSeconds = Math.max(...rows.map((row) => row.exitDeg / row.recoverPeakRate));
  return Object.freeze({ floorSeconds, ceilingSeconds: Math.min(...rows.map((row) => row.recoverSeconds)),
    derivedSeconds: quantise(floorSeconds) });
}

/**
 * One pass over the blend table at module load, so a pinned default cannot drift from the
 * measurement that justifies it. This is also the proof that ONE blend for all three sets is
 * impossible: knockdown's floor (0.2138 s) is above burning's ceiling (0.1500 s), so a single
 * number is either a pop on the knockdown or mush on the burn. The defaults are per set for
 * that measured reason, not for taste.
 */
(() => {
  for (const id of REACTION_SET_IDS) {
    const set = REACTION_SETS[id];
    const rows = REACTION_BLEND_MEASUREMENT[id];
    if (!rows?.length || new Set(rows.map((row) => row.archetype)).size !== REACTION_ARCHETYPES.length) {
      throw new Error(`Reaction set ${id} has no blend measurement row for every archetype.`);
    }
    for (const [role, pinned, bounds] of [
      ["entry", set.entryBlendSeconds, reactionEntryBlendBounds(id)] as const,
      ["exit", set.exitBlendSeconds, reactionExitBlendBounds(id)] as const,
    ]) {
      if (!Number.isFinite(pinned) || pinned <= 0) throw new Error(`Reaction set ${id} has no ${role} blend.`);
      if (Math.abs(pinned - bounds.derivedSeconds) > 1e-9) {
        throw new Error(`Reaction set ${id} pins a ${role} blend of ${pinned} s, but its measurement derives `
          + `${bounds.derivedSeconds} s (floor ${bounds.floorSeconds.toFixed(4)} s rounded up to the ${REACTION_BLEND_QUANTUM_SECONDS} s grid).`);
      }
      if (pinned > bounds.ceilingSeconds) {
        throw new Error(`Reaction set ${id}'s ${role} blend of ${pinned} s outlasts its ceiling of ${bounds.ceilingSeconds} s.`);
      }
    }
  }
})();

/** Every clip name the contract reserves, in contract order. */
export const REACTION_CONTRACT_CLIPS: readonly string[] = Object.freeze(
  REACTION_SET_IDS.flatMap((id) => REACTION_PHASE_ROLES.map((role) => REACTION_SETS[id].clips[role])));

/**
 * How an installed pack clip is named in a review action list. Every archetype's
 * actor reads it from here, so a Warden's PoisonLoop and a human's are labelled by
 * the same contract rather than by whichever list the body's own clips came from.
 */
export function reactionPackClipLabel(name: string): string {
  for (const set of Object.values(REACTION_SETS)) {
    for (const role of REACTION_PHASE_ROLES) {
      if (set.clips[role] === name) return `${set.label} · ${role} · authored reaction pack`;
    }
  }
  return `Authored reaction pack · ${name}`;
}

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
