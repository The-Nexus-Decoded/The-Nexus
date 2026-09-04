/**
 * What a victim does when Breachling acid lands on it.
 *
 * The Breachling spit is not a strike: it wets the target, keeps burning, and
 * the victim should be screaming and clawing at it for as long as the acid is
 * on them. That is a *sustained* response, and the human animation library
 * installed in this project cannot express one.
 *
 * MEASURED, 2026-09-04, against
 * public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb:
 *   - 400 clips in the library.
 *   - 44 of them are receiving clips (name matches impact|react|death|hit|stagger|pain|flinch).
 *   - 0 of the 400 match acid|burn|poison|scream|corros|writh|panic|flail|dissolv|melt|agony.
 *   - The set the two-hand sword family can actually bind is 7 clips
 *     (human-review-catalog.js SOURCE_RESPONSE_GROUPS.greatsword): five
 *     GreatSword__GreatSwordImpact* flinches and two TwoHandedSwordDeath.
 *     All are one-shot melee flinches; none loops and none is a burn.
 *
 * So the clip half of this response is BLOCKED on an owner-supplied asset. This
 * module implements everything up to it: the trigger, the phase model, the
 * clip-selection hook, and the clinging-acid visual that can run today. When
 * the asset lands, register it with `registerAcidReactionClips` and
 * `acidResponsePlan` starts returning a real `clipId` with no other change.
 */

import * as THREE from "three";
import {
  createBreachlingAcidCoating,
  type BreachlingAcidCoating,
  type BreachlingAcidResources,
} from "../vfx/breachling-acid-vfx";

/** Phases a victim goes through while acid is on them. */
export type AcidResponsePhase = "impact" | "burning" | "recover";

export interface AcidReactionClipBinding {
  /** Clip id in the victim's own action list, or null when nothing is installed. */
  readonly clipId: string | null;
  /** True when a real asset is bound; false when this is the documented gap. */
  readonly bound: boolean;
  /** Why: the bound clip's name, or the exact asset that is missing. */
  readonly evidence: string;
}

/**
 * Clips a victim family can use for each acid phase. Empty by design: nothing
 * installed today satisfies any of these. Populate it from the owner's Mixamo
 * delivery — nothing else in this file needs to change.
 */
const ACID_REACTION_CLIPS = new Map<string, Partial<Record<AcidResponsePhase, string>>>();

/**
 * THE HOOK. Register the acid response clips for one victim response family
 * (the `actionFamily` values in human-review-catalog.js: "twoHandSword", "bow",
 * "magic", "unarmedMagic", "staff", "oneHandMeleeProxy", "dagger").
 *
 * Required assets, in the order they unblock the response:
 *   impact   — a one-shot recoil with the hands coming up to the face/chest.
 *   burning  — A LOOPING clip of a person trying to get something off them
 *              while screaming. This is the one that does not exist anywhere in
 *              the project: every installed receiving clip is one-shot and the
 *              longest is ProMeleeAxe__StandingReactLargeFromRight at 1.800 s.
 *   recover  — a one-shot return to the ready pose.
 */
export function registerAcidReactionClips(family: string, clips: Partial<Record<AcidResponsePhase, string>>): void {
  if (!family.trim()) throw new Error("An acid reaction binding needs a victim response family.");
  const existing = ACID_REACTION_CLIPS.get(family) ?? {};
  ACID_REACTION_CLIPS.set(family, { ...existing, ...clips });
}

/** Test and tooling support: drop every registered acid clip binding. */
export function clearAcidReactionClips(): void {
  ACID_REACTION_CLIPS.clear();
}

/** The exact asset the owner still has to supply, phase by phase. */
const MISSING_ASSET: Readonly<Record<AcidResponsePhase, string>> = Object.freeze({
  impact: "Mixamo one-shot acid/flame recoil (hands to face). Nearest installed substitute is a melee flinch such as GreatSword__GreatSwordImpact, which reads as a sword hit, not a burn.",
  burning: "Mixamo LOOPING 'burning / brushing something off me' clip with a scream. No looping receiving clip exists in this project on any body; the longest installed one-shot is ProMeleeAxe__StandingReactLargeFromRight at 1.800 s.",
  recover: "Mixamo one-shot recovery back to the ready pose after the burn loop ends.",
});

export function acidReactionClip(family: string, phase: AcidResponsePhase): AcidReactionClipBinding {
  const clipId = ACID_REACTION_CLIPS.get(family)?.[phase] ?? null;
  return clipId
    ? { clipId, bound: true, evidence: `Registered acid ${phase} clip "${clipId}" for the ${family} response family.` }
    : { clipId: null, bound: false, evidence: `BLOCKED: no acid ${phase} clip for the ${family} response family. ${MISSING_ASSET[phase]}` };
}

export interface AcidResponseWindow {
  readonly phase: AcidResponsePhase;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly loops: boolean;
  readonly clip: AcidReactionClipBinding;
}

export interface AcidResponsePlan {
  readonly family: string;
  readonly contactSeconds: number;
  readonly lingerSeconds: number;
  readonly windows: readonly AcidResponseWindow[];
  /** True only when every phase has a real clip. */
  readonly playable: boolean;
  /** Human-readable reason a caller can print when `playable` is false. */
  readonly blockedReason: string | null;
}

/** Seconds the acid keeps working after it lands, before the victim can recover. */
export const ACID_LINGER_SECONDS = 2.6;
/** Length of the one-shot recoil that opens the response. */
export const ACID_IMPACT_SECONDS = 0.45;
/** Length of the one-shot recovery that closes it. */
export const ACID_RECOVER_SECONDS = 0.9;

/**
 * The response the victim owes for one measured acid contact: recoil, then a
 * burning loop for as long as the acid is on them, then a recovery. Returned
 * whether or not the clips exist, so a caller can schedule the timing, drive
 * the visual, and print exactly what is missing.
 */
export function acidResponsePlan(family: string, contactSeconds: number,
  lingerSeconds = ACID_LINGER_SECONDS): AcidResponsePlan {
  if (!Number.isFinite(contactSeconds) || contactSeconds < 0) throw new Error("Acid contact time must be a finite non-negative second count.");
  if (!Number.isFinite(lingerSeconds) || lingerSeconds <= 0) throw new Error("Acid linger must be a positive second count.");
  const burnStart = contactSeconds + ACID_IMPACT_SECONDS;
  const burnEnd = burnStart + lingerSeconds;
  const windows: AcidResponseWindow[] = [
    { phase: "impact", startSeconds: contactSeconds, endSeconds: burnStart, loops: false, clip: acidReactionClip(family, "impact") },
    { phase: "burning", startSeconds: burnStart, endSeconds: burnEnd, loops: true, clip: acidReactionClip(family, "burning") },
    { phase: "recover", startSeconds: burnEnd, endSeconds: burnEnd + ACID_RECOVER_SECONDS, loops: false, clip: acidReactionClip(family, "recover") },
  ];
  const unbound = windows.filter((window) => !window.clip.bound);
  return {
    family,
    contactSeconds,
    lingerSeconds,
    windows,
    playable: unbound.length === 0,
    blockedReason: unbound.length === 0 ? null : unbound.map((window) => window.clip.evidence).join(" "),
  };
}

/** The phase a plan is in at a given time, or null before/after it. */
export function acidResponsePhaseAt(plan: AcidResponsePlan, seconds: number): AcidResponseWindow | null {
  if (!Number.isFinite(seconds)) throw new Error("Acid response sample time must be finite.");
  return plan.windows.find((window) => seconds >= window.startSeconds && seconds < window.endSeconds) ?? null;
}

export interface AcidVictimMarkOptions {
  readonly resources: BreachlingAcidResources;
  readonly headRadiusMeters: number;
  readonly scale?: number;
  readonly seed?: number;
  readonly plan: AcidResponsePlan;
}

export interface AcidVictimMark {
  /**
   * Parent this to the impact anchor (combat-review-impact-anchor.ts) so the
   * coating rides the deformed skin instead of floating in world space.
   */
  readonly root: THREE.Group;
  readonly coating: BreachlingAcidCoating;
  readonly plan: AcidResponsePlan;
  update(seconds: number): void;
  dispose(): void;
}

/**
 * The half of "covered in acid" that needs no new asset: the acid itself,
 * clinging where it hit and running down until the linger window closes. The
 * screaming is the clip, and the clip is what is blocked.
 */
export function createAcidVictimMark(options: AcidVictimMarkOptions): AcidVictimMark {
  const { plan } = options;
  const root = new THREE.Group();
  root.name = "acid-victim-mark";
  const coating = createBreachlingAcidCoating({
    resources: options.resources,
    scale: options.scale ?? 1,
    headRadiusMeters: options.headRadiusMeters,
    seed: options.seed,
    durationSeconds: ACID_IMPACT_SECONDS + plan.lingerSeconds + ACID_RECOVER_SECONDS,
  });
  root.add(coating.root);
  let disposed = false;
  return {
    root,
    coating,
    plan,
    update(seconds) {
      if (disposed) throw new Error("Acid victim mark has been disposed.");
      const elapsed = seconds - plan.contactSeconds;
      root.visible = elapsed >= 0;
      if (elapsed >= 0) coating.update(elapsed);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      coating.dispose();
      root.removeFromParent();
      root.clear();
    },
  };
}
