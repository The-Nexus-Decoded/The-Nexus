import * as THREE from "three";
import { ReviewContactSurface, type ReviewSurfaceContact } from "./combat-review-contact";
import { measureReviewProbeContact, type ReviewProbePoint } from "./combat-review-probes";
import { sampleReviewPoses } from "./combat-review-posing";
import { prepareReviewSequence, sampleReviewSequence } from "./combat-review-timeline";
import { createReviewStrikeProbe, reviewContactSourceToken, validateReviewContactProfile,
  type ReviewContactProfile } from "./combat-review-contact-profiles";
import { createReviewProjectiles, type ReviewProjectiles } from "./combat-review-projectiles";
import type { ReviewActorAdapter, ReviewEvent, ReviewProjectileFlight, ReviewSequence } from "./combat-review-types";

export interface ReviewContactActor { readonly actor: ReviewActorAdapter; readonly settleConstraints?: () => void }
export interface ReviewContactResolution {
  readonly status: "contact" | "miss" | "unavailable";
  readonly sequenceId: string;
  readonly profileId: string | null;
  readonly samples: number;
  readonly sampleRate: number;
  readonly toleranceMeters: number;
  readonly evidence: string;
  readonly event?: ReviewEvent;
  readonly flights?: readonly ReviewProjectileFlight[];
  readonly releaseEvents?: readonly ReviewEvent[];
}

/** One confirmed surface event per action, with no live damage/loot or fallback hit. */
export async function resolveReviewContact(options: {
  sequence: ReviewSequence; attacker: ReviewContactActor; target: ReviewContactActor;
  profile: ReviewContactProfile | null; signal?: AbortSignal; sampleRate?: number; toleranceMeters?: number;
  /** Restore the live clock pose before every yield and when sampling finishes. */
  restore?: () => void;
}): Promise<ReviewContactResolution> {
  const { attacker, target, signal } = options;
  const sequence = prepareReviewSequence(options.sequence);
  const profile = options.profile ? structuredClone(options.profile) : null;
  const sampleRate = options.sampleRate ?? 120, tolerance = options.toleranceMeters ?? 0.008;
  let samples = 0;
  let projectiles: ReviewProjectiles | undefined;
  const result = (status: ReviewContactResolution["status"], evidence: string, event?: ReviewEvent): ReviewContactResolution => ({
    status, evidence, event, sequenceId: sequence.id, profileId: profile?.id ?? null,
    samples, sampleRate, toleranceMeters: tolerance,
    ...(projectiles ? { flights: projectiles.flights, releaseEvents: projectiles.flights.map((flight): ReviewEvent => ({
      id: `release:${flight.id}`, actorId: flight.actorId, kind: "release", timeSeconds: flight.releaseSeconds,
      projectileId: flight.id, position: flight.origin, result: "unmeasured", evidence: flight.evidence,
    })) } : {}),
  });
  if (!Number.isInteger(sampleRate) || sampleRate < 30 || sampleRate > 240
    || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 0.05) throw new Error("Invalid contact sampling resolution or tolerance.");
  if (!profile) return result("unavailable", "No explicit strike surface and active interval are bound to this action; not a miss.");
  validateReviewContactProfile(attacker.actor, profile);
  if (attacker.actor === target.actor || attacker.actor.root === target.actor.root) throw new Error("Contact actors must be independent.");
  const track = sequence.tracks.find((entry) => entry.actorId === attacker.actor.instanceId && entry.actionId === profile.actionId);
  if (!track || track.loop || !sequence.actorIds.includes(target.actor.instanceId)) {
    return result("unavailable", "Contact review requires a non-looping attack track and an independently sampled target.");
  }
  const rate = track.rate ?? 1;
  const start = track.startSeconds + profile.startSeconds / rate, end = track.startSeconds + profile.endSeconds / rate;
  if (!Number.isFinite(rate) || !(rate > 0) || end > track.startSeconds + track.durationSeconds + 1e-6 || end > sequence.durationSeconds + 1e-6) {
    return result("unavailable", "The complete active strike interval is not present in this sequence.");
  }
  const count = Math.ceil((end - start) * sampleRate);
  if (count > 3600) return result("unavailable", "The contact interval exceeds the bounded review sampling budget.");
  const tokens = [reviewContactSourceToken(attacker.actor), reviewContactSourceToken(target.actor)];
  const check = () => {
    if (signal?.aborted) throw new DOMException("Contact review cancelled", "AbortError");
    if (tokens[0] !== reviewContactSourceToken(attacker.actor) || tokens[1] !== reviewContactSourceToken(target.actor)) {
      throw new DOMException("Contact actor source or placement changed", "AbortError");
    }
  };
  const surface = new ReviewContactSurface(target.actor.model, (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
  const sample = (time: number) => {
    check(); const frame = sampleReviewSequence(sequence, time);
    for (const binding of [attacker, target]) {
      const pose = frame.actors.find((entry) => entry.actorId === binding.actor.instanceId);
      if (!pose) throw new Error("An actor has no pose at the contact sample time.");
      sampleReviewPoses(binding.actor, pose.poses, binding.settleConstraints);
    }
    projectiles?.update(time, [], true);
    samples++; return surface.update();
  };
  const hit = (contact: ReviewSurfaceContact, probeId: string, time: number) => result("contact",
    `Confirmed sampled strike surface within ${tolerance} m; not gameplay damage or continuous-collision certification.`, {
      id: `measured-contact:${attacker.actor.instanceId}:${target.actor.instanceId}`, kind: "contact", result: "hit",
      actorId: attacker.actor.instanceId, targetId: target.actor.instanceId, timeSeconds: time,
      ...(projectiles ? { projectileId: projectiles.projectileIdForProbe(probeId),
        damageType: profile.surface.kind === "projectile" && profile.surface.emitter === "base-spit" ? "poison" as const
          : profile.surface.kind === "projectile" && profile.surface.emitter === "wand-fire" ? "fire" as const : "physical" as const } : {}),
      position: contact.point.toArray(), normal: contact.normal.toArray(),
      ...(contact.surfaceAnchor ? { surfaceAnchor: contact.surfaceAnchor } : {}),
      evidence: `${profile.evidence}; sequence:${sequence.id}; ${contact.evidence}; probe:${probeId}; confirmed-time:${time}`,
    });
  try {
    sample(start);
    if (profile.surface.kind === "projectile") {
      projectiles = createReviewProjectiles(attacker.actor, profile.actionId, { releaseSeconds: start, endSeconds: end });
      projectiles.update(start);
    }
    const probe = projectiles?.probe ?? createReviewStrikeProbe(attacker.actor, profile);
    if (!probe.vertexCount) return result("unavailable", probe.unavailableReason ?? "No eligible rendered strike vertices; not a miss.");
    let previous: readonly ReviewProbePoint[] = [], previousTime = start;
    for (let index = 0; index <= count; index++) {
      const time = start + (end - start) * index / count;
      const summary = index ? sample(time) : surface.snapshot();
      if (!summary.triangles || summary.unsupportedMeshIds.length) return result("unavailable", "Target has no fully supported rendered weighted skin; not a miss.");
      let points = probe.sample();
      if (points.length !== probe.vertexCount) return result("unavailable", "Strike surface eligibility changed during sampling; not a miss.");
      const candidate = measureReviewProbeContact(previous, points, surface, tolerance);
      if (candidate) {
        // A sweep against the end-frame target is only a candidate. Re-sample
        // BOTH moving actors at its proposed time before accepting a contact.
        const candidateTime = previousTime + (time - previousTime) * Math.min(1, Math.max(0, candidate.intervalFraction));
        if (candidateTime < time) {
          sample(candidateTime);
          const point = probe.sample().find((entry) => entry.id === candidate.probeId);
          const confirmed = point ? surface.closest(point.position, tolerance) : null;
          if (confirmed) return hit(confirmed, candidate.probeId, candidateTime);
          sample(time); points = probe.sample();
        }
        const confirmed = measureReviewProbeContact([], points, surface, tolerance);
        if (confirmed) return hit(confirmed.contact, confirmed.probeId, time);
      }
      previous = points; previousTime = time;
      if (index % 8 === 7) { options.restore?.(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
    }
    check();
    return result("miss", `No sampled eligible strike surface reached the rendered target within ${tolerance} m at ${sampleRate} Hz in the explicit active interval.`);
  } finally { projectiles?.dispose(); surface.dispose(); options.restore?.(); }
}
