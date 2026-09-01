import * as THREE from "three";
import { ReviewClock, type ReviewClockFrame } from "./combat-review-timeline";
import { sampleReviewPoses } from "./combat-review-posing";
import { resolveReviewContact, type ReviewContactResolution } from "./combat-review-contact-resolver";
import { reviewContactProfile, type ReviewContactProfile } from "./combat-review-contact-profiles";
import { ReviewContactSurface } from "./combat-review-contact";
import { createReviewProjectiles, reviewProjectileBinding, type ReviewProjectiles } from "./combat-review-projectiles";
import { validateReviewImpactSurface } from "./combat-review-impact-anchor";
import type { ReviewAction, ReviewActorAdapter, ReviewActorFamily, ReviewEvent, ReviewProjectileFlight, ReviewSequence, ReviewTrack } from "./combat-review-types";

export type CombatSlot = "a" | "b";
export type CombatActionRole = "action" | "ready" | "reaction" | "death";
export interface CombatActorDefinition {
  readonly id: string;
  readonly label: string;
  readonly family: ReviewActorFamily;
  readonly note: string;
}
export interface CombatCalibrationControl {
  readonly id: string; readonly label: string; readonly group: string;
  readonly min: number; readonly max: number; readonly step: number; readonly value: number;
}
/** Rig-specific calibration is injected; the panel never assumes human joints. */
export interface CombatCalibrationBinding {
  controls(): readonly CombatCalibrationControl[];
  set(id: string, value: number): void;
  reset(): void;
}
export interface CombatActorHandle {
  readonly actor: ReviewActorAdapter;
  readonly calibration?: CombatCalibrationBinding;
  readonly settleConstraints?: () => void;
}
export interface CombatActorRequest {
  readonly definition: CombatActorDefinition;
  readonly instanceId: string;
  readonly signal: AbortSignal;
}
export type CombatActorLoader = (request: CombatActorRequest) => Promise<CombatActorHandle>;
export interface CombatSlotSnapshot {
  readonly slot: CombatSlot;
  readonly definitionId: string;
  readonly status: "empty" | "loading" | "ready" | "error";
  readonly error: string | null;
  readonly actions: readonly ReviewAction[];
  readonly selected: Readonly<Record<CombatActionRole, string>>;
  readonly calibration: readonly CombatCalibrationControl[];
}
export interface CombatReviewSnapshot {
  readonly revision: number;
  readonly active: boolean;
  readonly ready: boolean;
  readonly attacker: CombatSlot;
  readonly slots: readonly CombatSlotSnapshot[];
  readonly cue: Readonly<{ kind: "none" | "reaction" | "death"; atSeconds: number; blendSeconds: number }>;
  readonly placement: Readonly<{ separationMeters: number; yawADegrees: number; yawBDegrees: number }>;
  readonly durationSeconds: number;
  readonly frame: ReviewClockFrame | null;
  readonly error: string | null;
  readonly contact: CombatContactSnapshot;
  readonly projectiles: Readonly<{ bound: boolean; flights: readonly ReviewProjectileFlight[]; unavailableReason: string | null }>;
}
export interface CombatContactSnapshot {
  readonly status: "unmeasured" | "scanning" | ReviewContactResolution["status"];
  readonly result: ReviewContactResolution | null;
  readonly response: "none" | "reaction" | "death";
}
interface SlotState {
  definitionId: string; status: CombatSlotSnapshot["status"]; error: string | null;
  revision: number; abort?: AbortController; handle?: CombatActorHandle;
  actions: readonly ReviewAction[]; selected: Record<CombatActionRole, string>;
}
const SLOTS: readonly CombatSlot[] = ["a", "b"];
const opposite = (slot: CombatSlot): CombatSlot => slot === "a" ? "b" : "a";
const finite = (value: number, name: string, min: number, max: number) => {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
};
const blank = (definitionId: string): SlotState => ({ definitionId, status: "empty", error: null,
  revision: 0, actions: [], selected: { action: "", ready: "", reaction: "", death: "" } });

/** Owns selection and composition, not asset loaders, gameplay damage or wall-clock timers. */
export class CombatReviewController {
  readonly root = new THREE.Group();
  readonly definitions: readonly CombatActorDefinition[];
  private readonly slots: Record<CombatSlot, SlotState>;
  private readonly listeners = new Set<(snapshot: CombatReviewSnapshot) => void>();
  private clock: ReviewClock | null = null;
  private active = false;
  private disposed = false;
  private revision = 0;
  private sequenceRevision = 0;
  private attacker: CombatSlot = "a";
  private speed = 1;
  private loop = false;
  private error: string | null = null;
  private contactResult: ReviewContactResolution | null = null;
  private contactResponse: CombatContactSnapshot["response"] = "none";
  private contactJob: { abort: AbortController; revision: number; sequenceId: string } | null = null;
  private projectiles: ReviewProjectiles | null = null;
  private projectileBound = false;
  private projectileError: string | null = null;
  private autoPlacement = true;
  private cue: { kind: "none" | "reaction" | "death"; atSeconds: number; blendSeconds: number } = {
    kind: "none", atSeconds: 0.5, blendSeconds: 0.1,
  };
  private placement = { separationMeters: 1.75, yawADegrees: 0, yawBDegrees: 180 };

  constructor(private readonly options: { definitions: readonly CombatActorDefinition[]; loadActor: CombatActorLoader;
    initial?: Readonly<{ a: string; b: string }>; instancePrefix?: string; contactResolver?: typeof resolveReviewContact }) {
    if (!options.definitions.length || options.definitions.some((entry) => !entry.id.trim() || !entry.label.trim())
      || new Set(options.definitions.map((entry) => entry.id)).size !== options.definitions.length) throw new Error("Actor definitions require unique IDs and labels.");
    this.definitions = Object.freeze(options.definitions.map((entry) => Object.freeze({ ...entry })));
    const initial = options.initial ?? { a: this.definitions[0]!.id, b: this.definitions[1]?.id ?? this.definitions[0]!.id };
    this.definition(initial.a); this.definition(initial.b);
    this.slots = { a: blank(initial.a), b: blank(initial.b) };
    this.root.name = options.instancePrefix ?? "combat-review";
    this.root.visible = false;
  }

  subscribe(listener: (snapshot: CombatReviewSnapshot) => void): () => void {
    this.assertLive(); this.listeners.add(listener); listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }
  snapshot(): CombatReviewSnapshot {
    return { revision: this.revision, active: this.active, ready: Boolean(this.clock), attacker: this.attacker,
      slots: SLOTS.map((slot) => { const value = this.slots[slot]; return { slot, definitionId: value.definitionId,
        status: value.status, error: value.error, actions: value.actions, selected: { ...value.selected },
        calibration: value.handle?.calibration?.controls().map((control) => ({ ...control })) ?? [] }; }),
      cue: { ...this.cue }, placement: { ...this.placement }, durationSeconds: this.clock?.sequence.durationSeconds ?? 0,
      frame: this.clock?.snapshot() ?? null, error: this.error,
      projectiles: { bound: this.projectileBound, flights: this.projectiles?.flights ?? [], unavailableReason: this.projectileError },
      contact: { status: this.contactJob ? "scanning" : this.contactResult?.status ?? "unmeasured",
        result: this.contactResult ? structuredClone(this.contactResult) : null, response: this.contactResponse } };
  }
  actor(slot: CombatSlot): ReviewActorAdapter | null { return this.slots[slot].handle?.actor ?? null; }
  sequence(): ReviewSequence | null { return this.clock?.sequence ?? null; }

  contactProfile(): ReviewContactProfile | null {
    const actor = this.actor(this.attacker);
    return actor ? reviewContactProfile(actor, this.slots[this.attacker].selected.action, { projectiles: true }) : null;
  }

  /** Existing actor surveys include bow arrows; add only independently owned fluid geometry. */
  projectileMotionBounds(): THREE.Box3 {
    this.assertLive(); const bounds = new THREE.Box3(), projectiles = this.projectiles;
    if (!this.clock || !projectiles?.root.children.length) return bounds;
    const surface = new ReviewContactSurface(projectiles.root), times = new Set<number>();
    for (const flight of projectiles.flights) {
      times.add(flight.releaseSeconds); times.add(flight.endSeconds);
      const apex = flight.dropMeters > 0 ? flight.direction[1] * flight.rangeMeters / (2 * flight.dropMeters) : 0;
      if (apex > 0 && apex < 1) times.add(flight.releaseSeconds + apex * (flight.endSeconds - flight.releaseSeconds));
    }
    try {
      for (const time of times) { projectiles.update(time, this.clock.sequence.events); surface.update(); bounds.union(surface.bounds()); }
      return bounds;
    } finally { surface.dispose(); projectiles.update(this.clock.snapshot().timeSeconds, this.clock.sequence.events); }
  }
  async resolveContact(options: { profile?: ReviewContactProfile | null; response?: CombatContactSnapshot["response"] } = {}): Promise<ReviewContactResolution | null> {
    this.assertLive();
    if (!this.clock || !this.active) throw new Error("Both actors must be ready before contact review.");
    const response = options.response ?? "none";
    if (!["none", "reaction", "death"].includes(response)) throw new Error("Unknown measured response kind.");
    if (response !== "none") this.requireAction(opposite(this.attacker), this.slots[opposite(this.attacker)].selected[response]);
    const profile = options.profile === undefined ? this.contactProfile() : options.profile;
    if (profile && profile.actionId !== this.slots[this.attacker].selected.action) throw new Error("Contact profile must match the selected attacker action.");
    const heldTime = this.clock.snapshot().timeSeconds;
    this.invalidateContact(); this.cue.kind = "none"; this.recompose();
    this.clock!.seek(heldTime); this.applyFrame(); this.changed();
    const sequence = this.clock!.sequence;
    const job = { abort: new AbortController(), revision: this.revision, sequenceId: sequence.id };
    this.contactJob = job; this.emit();
    try {
      const result = await (this.options.contactResolver ?? resolveReviewContact)({ sequence,
        attacker: this.slots[this.attacker].handle!, target: this.slots[opposite(this.attacker)].handle!,
        profile, signal: job.abort.signal, restore: () => { if (!this.disposed) this.applyFrame(); } });
      if (this.contactJob !== job || job.abort.signal.aborted || this.revision !== job.revision || this.clock?.sequence.id !== job.sequenceId) return null;
      if (result.sequenceId !== sequence.id || result.profileId !== (profile?.id ?? null)) throw new Error("Contact result belongs to a different sequence or profile.");
      if (result.status === "contact" && (!result.event || result.event.kind !== "contact" || result.event.result !== "hit"
        || result.event.actorId !== this.actor(this.attacker)!.instanceId || result.event.targetId !== this.actor(opposite(this.attacker))!.instanceId
        || !Number.isFinite(result.event.timeSeconds) || result.event.timeSeconds < 0 || result.event.timeSeconds > sequence.durationSeconds
        || !result.event.evidence?.trim())) throw new Error("Contact result has no valid current-sequence surface event.");
      if (profile?.surface.kind === "projectile" && result.status !== "unavailable") {
        const live = this.projectiles?.flights ?? [];
        const matches = result.flights?.length === live.length && live.length > 0 && live.every((flight, index) => {
          const measured = result.flights![index]!;
          return ["id", "actorId", "actionId", "visualKind", "evidence"].every((key) => flight[key as keyof ReviewProjectileFlight] === measured[key as keyof ReviewProjectileFlight])
            && [flight.releaseSeconds - measured.releaseSeconds, flight.endSeconds - measured.endSeconds,
              flight.rangeMeters - measured.rangeMeters, flight.dropMeters - measured.dropMeters,
              ...flight.origin.map((value, axis) => value - measured.origin[axis]!),
              ...flight.direction.map((value, axis) => value - measured.direction[axis]!)].every((delta) => Math.abs(delta) < 1e-7);
        });
        if (!matches || result.event && !live.some((flight) => flight.id === result.event!.projectileId
          && result.event!.timeSeconds >= flight.releaseSeconds && result.event!.timeSeconds <= flight.endSeconds)) {
          throw new Error("Measured projectile emission does not match the current visible flight.");
        }
        if (result.status === "contact" && result.event) {
          validateReviewImpactSurface(this.actor(opposite(this.attacker))!, result.event);
        }
      }
      this.contactResult = structuredClone(result);
      if (result.status === "contact" && result.event) {
        this.contactResponse = response;
        // Preserve the sampled target pose at impact, even if the last manual
        // cue used an immediate cut. A zero-time hit needs an initial ready track.
        if (response !== "none") this.cue = { kind: response, atSeconds: Math.max(1e-6, result.event.timeSeconds),
          blendSeconds: Math.max(1 / 120, this.cue.blendSeconds) };
        const time = this.clock.snapshot().timeSeconds;
        this.recompose(); this.clock!.seek(time); this.applyFrame();
        // The only post-scan sequence change is the causal response at contact;
        // the target's pre-contact ready trajectory remains exactly the scanned one.
        this.contactResult = structuredClone({ ...result, sequenceId: this.clock!.sequence.id });
      }
      this.contactJob = null; this.revision++; this.emit(); return structuredClone(this.contactResult);
    } catch (error) {
      if (this.contactJob !== job) return null;
      this.contactJob = null;
      if (!job.abort.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
        this.contactResult = { status: "unavailable", sequenceId: sequence.id, profileId: profile?.id ?? null,
          samples: 0, sampleRate: 120, toleranceMeters: 0.008, evidence: error instanceof Error ? error.message : String(error) };
      }
      this.emit(); return this.contactResult ? structuredClone(this.contactResult) : null;
    } finally { if (!this.disposed) this.applyFrame(); }
  }

  async enter(): Promise<void> {
    this.assertLive();
    if (this.active) return;
    this.active = true; this.root.visible = true;
    await Promise.all(SLOTS.map((slot) => this.selectActor(slot, this.slots[slot].definitionId)));
  }
  leave(): void {
    if (this.disposed) return;
    this.active = false; this.root.visible = false; this.clock = null; this.error = null;
    for (const slot of SLOTS) this.releaseSlot(slot);
    this.changed();
  }
  dispose(): void {
    if (this.disposed) return;
    this.leave(); this.disposed = true; this.listeners.clear(); this.root.removeFromParent();
  }

  async selectActor(slot: CombatSlot, definitionId: string): Promise<boolean> {
    this.assertLive(); const definition = this.definition(definitionId);
    if (!this.active) throw new Error("Enter Combat Review before loading actors.");
    this.autoPlacement = true;
    this.releaseSlot(slot); this.clock = null; this.error = null;
    const value = this.slots[slot], revision = value.revision;
    value.definitionId = definitionId; value.status = "loading";
    const abort = new AbortController(); value.abort = abort;
    const instanceId = `${this.root.name}:${slot}:${revision}`;
    this.changed();
    let loaded: CombatActorHandle | undefined;
    try {
      loaded = await this.options.loadActor({ definition, instanceId, signal: abort.signal });
      // A malformed loader must never transfer/dispose the other slot's live body.
      const shared = loaded.actor === this.slots[opposite(slot)].handle?.actor
        || loaded.actor.root === this.slots[opposite(slot)].handle?.actor.root;
      if (shared) { loaded = undefined; throw new Error("Actor instances must be independently owned."); }
      if (this.disposed || !this.active || value.revision !== revision || abort.signal.aborted) {
        loaded.actor.dispose(); return false;
      }
      if (loaded.actor.instanceId !== instanceId) throw new Error("Loaded actor instance ID does not match its slot.");
      const actions = loaded.actor.actions();
      if (!actions.length || new Set(actions.map((action) => action.id)).size !== actions.length
        || actions.some((action) => !action.id || !Number.isFinite(action.durationSeconds) || action.durationSeconds <= 0)) throw new Error("Actor has an invalid action catalog.");
      value.actions = Object.freeze(actions.map((action) => Object.freeze(structuredClone(action))));
      const available = value.actions.filter((action) => !action.unavailableReason);
      if (!available.length) throw new Error("Actor has no available review actions.");
      const first = available[0]!.id;
      value.selected = { action: available.find((action) => action.semantic === "attack" || action.semantic === "cast")?.id ?? first,
        ready: available.find((action) => action.semantic === "idle")?.id
          ?? available.find((action) => action.semantic !== "death")?.id ?? first,
        reaction: available.find((action) => action.semantic === "reaction")?.id ?? "",
        death: available.find((action) => action.semantic === "death")?.id ?? "" };
      value.handle = loaded; value.status = "ready"; value.error = null;
      this.root.add(loaded.actor.root); this.placeActors();
      loaded.actor.sample(value.selected.ready, 0);
      if (this.autoPlacement) this.fitPlacementToActorBounds();
      this.recompose(); this.changed(); return true;
    } catch (error) {
      if (loaded) { loaded.actor.root.removeFromParent(); loaded.actor.dispose(); }
      if (!this.disposed && this.active && value.revision === revision) {
        value.handle = undefined; value.actions = []; value.status = "error";
        value.error = error instanceof Error ? error.message : String(error); this.changed();
      }
      return false;
    }
  }

  setAttacker(slot: CombatSlot): void {
    this.assertLive(); this.attacker = slot; this.cue.kind = "none"; this.recompose(); this.changed();
  }
  setAction(slot: CombatSlot, role: CombatActionRole, actionId: string): void {
    this.assertLive(); const action = this.requireAction(slot, actionId);
    if (role === "ready" && action.semantic === "death") throw new Error("A terminal death cannot be a looping ready pose.");
    if ((role === "reaction" || role === "death") && action.semantic !== role) throw new Error(`Choose a real ${role} action.`);
    this.slots[slot].selected[role] = actionId; this.recompose(); this.changed();
  }
  setManualCue(patch: Partial<CombatReviewSnapshot["cue"]>): void {
    this.assertLive(); const next = { ...this.cue, ...patch };
    if (!["none", "reaction", "death"].includes(next.kind)) throw new Error("Unknown cue kind.");
    finite(next.atSeconds, "Cue time", 0, 120); finite(next.blendSeconds, "Cue blend", 0, 1);
    if (next.kind !== "none") this.requireAction(opposite(this.attacker), this.slots[opposite(this.attacker)].selected[next.kind]);
    this.invalidateContact(); this.cue = next; this.recompose(); this.changed();
  }
  setPlacement(patch: Partial<CombatReviewSnapshot["placement"]>): void {
    this.assertLive(); const next = { ...this.placement, ...patch };
    finite(next.separationMeters, "Separation", 0, 20);
    finite(next.yawADegrees, "A facing", -360, 360); finite(next.yawBDegrees, "B facing", -360, 360);
    if (patch.separationMeters !== undefined) this.autoPlacement = false;
    this.placement = next; this.placeActors(); this.applyFrame(); this.changed(true);
  }
  setCalibration(slot: CombatSlot, id: string, value: number): void {
    this.assertLive(); const binding = this.slots[slot].handle?.calibration;
    const control = binding?.controls().find((entry) => entry.id === id);
    if (!binding || !control) throw new Error("Calibration is unavailable for this actor.");
    finite(value, control.label, control.min, control.max); binding.set(id, value); this.applyFrame(); this.changed(true);
  }
  resetCalibration(slot: CombatSlot): void {
    this.assertLive(); this.slots[slot].handle?.calibration?.reset(); this.applyFrame(); this.changed(true);
  }
  setPlaying(playing: boolean): void {
    this.assertLive();
    this.cancelContactScan();
    if (playing && this.clock?.snapshot().timeSeconds === this.clock?.sequence.durationSeconds) this.clock?.restart(true);
    else this.clock?.setPlaying(playing);
    this.applyFrame(); this.emit();
  }
  restart(playing = this.clock?.snapshot().playing ?? false): void {
    this.assertLive(); this.cancelContactScan(); this.clock?.restart(playing); this.applyFrame(); this.emit();
  }
  seek(timeSeconds: number): void {
    this.assertLive(); finite(timeSeconds, "Seek time", 0, Number.MAX_VALUE);
    this.cancelContactScan();
    this.clock?.setPlaying(false); this.clock?.seek(timeSeconds); this.applyFrame(); this.emit();
  }
  setSpeed(speed: number): void {
    this.assertLive(); finite(speed, "Speed", 0.05, 3); this.speed = speed; this.clock?.setSpeed(speed); this.emit();
  }
  setLoop(loop: boolean): void { this.assertLive(); this.loop = loop; this.clock?.setLoop(loop); this.emit(); }
  advance(deltaSeconds: number): void {
    this.assertLive(); finite(deltaSeconds, "Frame delta", 0, Number.MAX_VALUE);
    if (!this.active || !this.clock?.snapshot().playing) return;
    const frame = this.clock.advance(deltaSeconds); this.applyFrame(frame); this.emit(frame);
  }

  private recompose(): void {
    this.clock = null; this.error = null; this.releaseProjectiles();
    if (!SLOTS.every((slot) => this.slots[slot].status === "ready")) return;
    const attackSlot = this.slots[this.attacker], defenderSlot = this.slots[opposite(this.attacker)];
    const attack = this.requireAction(this.attacker, attackSlot.selected.action);
    const ready = this.requireAction(this.attacker, attackSlot.selected.ready);
    const guard = this.requireAction(opposite(this.attacker), defenderSlot.selected.ready);
    const response = this.cue.kind === "none" ? undefined : defenderSlot.actions.find((action) => action.id === defenderSlot.selected[this.cue.kind as "reaction" | "death"]);
    // Changing an actor never silently substitutes a different semantic response.
    if (this.cue.kind !== "none" && !response) this.cue.kind = "none";
    const duration = Math.max(attack.durationSeconds, response ? this.cue.atSeconds + response.durationSeconds + 0.25 : 0);
    const attackerId = attackSlot.handle!.actor.instanceId, defenderId = defenderSlot.handle!.actor.instanceId;
    const tracks: ReviewTrack[] = [], events: ReviewEvent[] = [];
    const track = (id: string, actorId: string, action: ReviewAction, start: number, length: number, loop = false, blend = 0) => {
      if (length > 1e-9) tracks.push({ id, actorId, actionId: action.id, startSeconds: start, durationSeconds: length,
        clipDurationSeconds: action.durationSeconds, loop, blendInSeconds: Math.min(blend, length), terminal: action.semantic === "death" });
    };
    track("attacker-action", attackerId, attack, 0, attack.durationSeconds);
    if (attack.semantic !== "death") track("attacker-ready", attackerId, ready, attack.durationSeconds,
      duration - attack.durationSeconds, ready.semantic !== "death", 0.12);
    if (response) {
      track("defender-ready", defenderId, guard, 0, this.cue.atSeconds, guard.semantic !== "death");
      track("defender-response", defenderId, response, this.cue.atSeconds, response.durationSeconds, false,
        this.cue.atSeconds > 0 ? this.cue.blendSeconds : 0);
      if (response.semantic !== "death") track("defender-recover", defenderId, guard, this.cue.atSeconds + response.durationSeconds,
        duration - this.cue.atSeconds - response.durationSeconds, guard.semantic !== "death", 0.12);
      const measured = this.contactResponse !== "none" && this.contactResult?.event;
      events.push({ id: measured ? "measured-response" : "manual-response", actorId: defenderId, targetId: attackerId, timeSeconds: this.cue.atSeconds,
        kind: response.semantic === "death" ? "death" : "reaction", result: measured ? "hit" : "unmeasured",
        evidence: measured ? `Sandbox response to ${measured.id}; ${measured.evidence}`
          : "Manual review cue; not measured contact, damage or gameplay approval." });
    } else track("defender-ready", defenderId, guard, 0, duration, guard.semantic !== "death");
    if (this.contactResult?.status === "contact" && this.contactResult.event) events.push(this.contactResult.event);
    const binding = reviewProjectileBinding(attackSlot.handle!.actor, attack.id);
    this.projectileBound = Boolean(binding);
    if (binding) {
      try {
        sampleReviewPoses(attackSlot.handle!.actor, [{ actionId: attack.id, timeSeconds: binding.releaseSeconds, weight: 1 }], attackSlot.handle!.settleConstraints);
        this.projectiles = createReviewProjectiles(attackSlot.handle!.actor, attack.id, binding,
          { target: defenderSlot.handle!.actor, impacts: events });
        this.projectileError = this.projectiles.probe.unavailableReason ?? null;
        // The group contains only owned fluid VFX, never borrowed arrow assets.
        if (this.projectiles.root.children.length) this.root.add(this.projectiles.root);
        for (const flight of this.projectiles.flights) events.push({ id: `release:${flight.id}`, actorId: flight.actorId,
          kind: "release", timeSeconds: flight.releaseSeconds, projectileId: flight.id,
          position: flight.origin, result: "unmeasured", evidence: flight.evidence });
      } catch (error) { this.projectileError = error instanceof Error ? error.message : String(error); }
    }
    try {
      this.clock = new ReviewClock({ id: `${this.root.name}:${++this.sequenceRevision}`, durationSeconds: duration,
        actorIds: [this.slots.a.handle!.actor.instanceId, this.slots.b.handle!.actor.instanceId], tracks, events });
      this.clock.setSpeed(this.speed); this.clock.setLoop(this.loop); this.applyFrame();
    } catch (error) { this.clock = null; this.error = error instanceof Error ? error.message : String(error); }
  }
  private applyFrame(frame = this.clock?.snapshot()): void {
    if (!frame) return;
    try {
      for (const pose of frame.actors) {
        const handle = SLOTS.map((slot) => this.slots[slot].handle).find((entry) => entry?.actor.instanceId === pose.actorId);
        if (handle) sampleReviewPoses(handle.actor, pose.poses, handle.settleConstraints);
      }
      // Pose-dependent equipment updates run first; the same fixed flight then
      // stops only its identified measured projectile, without target homing.
      this.projectiles?.update(frame.timeSeconds, this.clock?.sequence.events);
    } catch (error) { this.clock?.setPlaying(false); this.error = error instanceof Error ? error.message : String(error); }
  }
  private placeActors(): void {
    for (const slot of SLOTS) {
      const actor = this.slots[slot].handle?.actor;
      if (!actor) continue;
      actor.root.position.set(0, 0, slot === "b" ? this.placement.separationMeters : 0);
      actor.root.rotation.set(0, THREE.MathUtils.degToRad(slot === "a" ? this.placement.yawADegrees : this.placement.yawBDegrees), 0);
      actor.root.updateMatrixWorld(true);
    }
  }
  private fitPlacementToActorBounds(): boolean {
    const actors = SLOTS.map((slot) => this.slots[slot].handle?.actor);
    if (actors.some((actor) => !actor)) return false;
    this.placeActors();
    const depth = (actor: ReviewActorAdapter) => {
      actor.root.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(actor.root, true);
      if (bounds.isEmpty()) return null;
      const origin = actor.root.getWorldPosition(new THREE.Vector3());
      return Math.max(Math.abs(bounds.min.z - origin.z), Math.abs(bounds.max.z - origin.z));
    };
    const a = depth(actors[0]!), b = depth(actors[1]!);
    if (a == null || b == null || ![a, b].every(Number.isFinite)) return false;
    const required = Number((a + b + .35).toFixed(6));
    const separationMeters = Math.min(20, Math.max(1.75, Math.ceil(required * 20) / 20));
    if (Math.abs(separationMeters - this.placement.separationMeters) < 1e-8) return false;
    this.placement = { ...this.placement, separationMeters }; this.placeActors(); return true;
  }
  private releaseSlot(slot: CombatSlot): void {
    this.releaseProjectiles();
    const value = this.slots[slot]; value.revision++; value.abort?.abort(); value.abort = undefined;
    value.handle?.actor.root.removeFromParent(); value.handle?.actor.dispose(); value.handle = undefined;
    value.actions = []; value.status = "empty"; value.error = null;
    value.selected = { action: "", ready: "", reaction: "", death: "" };
  }
  private definition(id: string): CombatActorDefinition {
    const result = this.definitions.find((entry) => entry.id === id);
    if (!result) throw new Error("Unknown review actor: " + id);
    return result;
  }
  private requireAction(slot: CombatSlot, id: string): ReviewAction {
    const result = this.slots[slot].actions.find((action) => action.id === id);
    if (!result || result.unavailableReason) throw new Error("Action is unavailable for actor " + slot.toUpperCase() + ": " + id);
    return result;
  }
  private assertLive(): void { if (this.disposed) throw new Error("Combat Review has been disposed."); }
  private releaseProjectiles(): void {
    this.projectiles?.dispose(); this.projectiles = null; this.projectileBound = false; this.projectileError = null;
  }
  private cancelContactScan(): void { this.contactJob?.abort.abort(); this.contactJob = null; }
  private invalidateContact(): void {
    this.cancelContactScan();
    const hadContact = this.contactResult?.status === "contact", hadResponse = this.contactResponse !== "none";
    this.contactResult = null; this.contactResponse = "none";
    if (hadResponse) this.cue.kind = "none";
    if (hadContact) {
      const held = this.clock?.snapshot(); this.recompose();
      if (held && this.clock && !hadResponse) { this.clock.seek(held.timeSeconds); this.clock.setPlaying(held.playing); this.applyFrame(); }
    }
  }
  private changed(refreshEmission = false): void {
    this.invalidateContact();
    if (refreshEmission && this.clock) {
      const held = this.clock.snapshot(); this.recompose();
      if (this.clock) { this.clock.seek(held.timeSeconds); this.clock.setPlaying(held.playing); this.applyFrame(); }
    }
    this.revision++; this.emit();
  }
  private emit(frame?: ReviewClockFrame): void {
    const snapshot = this.snapshot();
    // Occurrences belong only to this advance notification. Ordinary snapshots
    // and seeks reconstruct state without re-emitting historical contacts.
    const notification = frame ? { ...snapshot, frame } : snapshot;
    for (const listener of this.listeners) listener(notification);
  }
}
