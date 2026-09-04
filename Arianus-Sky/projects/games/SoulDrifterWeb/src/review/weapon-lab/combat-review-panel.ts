import { CombatReviewController, type CombatActionRole, type CombatContactSnapshot, type CombatReviewSnapshot, type CombatSlot, type CombatSlotSnapshot, type CombatSparRow } from "./combat-review-controller";
import { REACTION_SETS } from "./reaction-contract";
import type { ReviewAction } from "./combat-review-types";

interface ActorFields {
  model: HTMLSelectElement; ready: HTMLSelectElement; status: HTMLElement;
  calibration: HTMLElement; calibrationKey: string; retry: HTMLButtonElement;
}
const APPROVAL_LABELS = { source: "source · not revised", draft: "review draft", "pose-approved": "approved pose",
  "continuous-reviewed": "reviewed motion", "runtime-approved": "runtime approved" } as const;
const slots: readonly CombatSlot[] = ["a", "b"];

/** Accessible DOM only. All actor, clock and calibration state belongs to the controller. */
export class CombatReviewPanel {
  readonly element: HTMLElement;
  private readonly doc: Document;
  private readonly abort = new AbortController();
  private readonly actorFields = {} as Record<CombatSlot, ActorFields>;
  private readonly values = new Map<string, HTMLInputElement>();
  private readonly outputs = new Map<string, HTMLOutputElement>();
  private readonly attacker: HTMLSelectElement;
  private readonly action: HTMLSelectElement;
  private readonly cue: HTMLSelectElement;
  private readonly response: HTMLSelectElement;
  private readonly responseRow: HTMLElement;
  private readonly cueTimeRow: HTMLElement;
  private readonly cueBlendRow: HTMLElement;
  private readonly effectRow: HTMLElement;
  private readonly reactionPlan: HTMLElement;
  private readonly play: HTMLButtonElement;
  private readonly restart: HTMLButtonElement;
  private readonly timeline: HTMLInputElement;
  private readonly time: HTMLOutputElement;
  private readonly loop: HTMLInputElement;
  private readonly durationNote: HTMLElement;
  private readonly evidence: HTMLElement;
  private readonly measuredResponse: HTMLSelectElement;
  private readonly measuredClip: HTMLSelectElement;
  private readonly measuredClipRow: HTMLElement;
  private readonly contactBinding: HTMLElement;
  private readonly contactStatus: HTMLElement;
  private readonly contactDetails: HTMLElement;
  private readonly contactEvidence: HTMLElement;
  private readonly scan: HTMLButtonElement;
  private readonly jump: HTMLButtonElement;
  private readonly release: HTMLButtonElement;
  private readonly projectileStatus: HTMLElement;
  private readonly reactionPolicy: HTMLInputElement;
  private readonly sparRun: HTMLButtonElement;
  private readonly sparStatus: HTMLElement;
  private readonly sparList: HTMLOListElement;
  private sparKey = "";
  private readonly scanContact: (response: CombatContactSnapshot["response"]) => Promise<unknown>;
  private readonly error: HTMLElement;
  private readonly unsubscribe: () => void;
  private readonly frameButtons: HTMLButtonElement[] = [];
  private frameStatus: HTMLElement | null = null;
  private framing = false;
  private lastRevision = -1;

  constructor(private readonly controller: CombatReviewController, options: {
    document?: Document; onFrameActors?: () => void; onFrameAction?: () => void | boolean | Promise<void | boolean>;
    onScanContact?: (response: CombatContactSnapshot["response"]) => Promise<unknown>;
  } = {}) {
    this.doc = options.document ?? document;
    this.scanContact = options.onScanContact ?? ((response) => controller.resolveContact({ response }));
    this.element = this.node("section", "combat-review");
    this.element.setAttribute("aria-label", "Combat Review");
    const intro = this.node("p", "context-note", "Two independent actors · one review timeline. Source motions are not gameplay approval.");
    this.element.append(intro);
    for (const slot of slots) this.actorFields[slot] = this.buildActor(slot);
    const sequence = this.card("03", "Sequence & response");
    this.attacker = this.selectField(sequence, "Attacker", "attacker");
    this.options(this.attacker, [{ id: "a", label: "Actor A → Actor B" }, { id: "b", label: "Actor B → Actor A" }]);
    this.action = this.selectField(sequence, "Action", "action");
    this.durationNote = this.node("p", "context-note"); sequence.append(this.durationNote);
    const contact = this.node("div", "combat-contact"); sequence.append(contact);
    contact.append(this.node("h3", "", "Measured surface contact"));
    this.contactBinding = this.node("p", "context-note"); contact.append(this.contactBinding);
    this.measuredResponse = this.selectField(contact, "Next response", "contact-response");
    this.measuredClip = this.selectField(contact, "Response clip", "contact-clip"); this.measuredClipRow = this.measuredClip.closest("label")!;
    const policyRow = this.node("label", "combat-check");
    this.reactionPolicy = this.node("input"); this.reactionPolicy.type = "checkbox"; this.reactionPolicy.dataset.command = "reaction-policy";
    this.reactionPolicy.id = "combat-reaction-policy";
    policyRow.append(this.reactionPolicy, this.node("span", "", "Pick the reaction clip from the measured contact side and attack weight"));
    contact.append(policyRow);
    const contactButtons = this.node("div", "buttons");
    this.scan = this.button("Scan contact", "contact-scan"); this.jump = this.button("Go to contact", "contact-jump");
    this.release = this.button("Go to release", "projectile-release");
    contactButtons.append(this.scan, this.jump, this.release); contact.append(contactButtons);
    this.projectileStatus = this.node("p", "context-note"); this.projectileStatus.dataset.projectileStatus = "true";
    contact.append(this.projectileStatus);
    this.contactStatus = this.node("p", "combat-evidence"); this.contactStatus.setAttribute("role", "status");
    this.contactStatus.setAttribute("aria-live", "polite"); contact.append(this.contactStatus);
    this.contactDetails = this.node("details"); this.contactDetails.append(this.node("summary", "", "Measurement details"));
    this.contactEvidence = this.node("p", "context-note"); this.contactDetails.append(this.contactEvidence); contact.append(this.contactDetails);
    this.cue = this.selectField(sequence, "Manual cue", "cue");
    this.response = this.selectField(sequence, "Clip", "response"); this.responseRow = this.response.closest("label")!;
    this.cueTimeRow = this.numberField(sequence, "Cue time", "cue-time", 0, 120, 0.01, "s");
    this.cueBlendRow = this.numberField(sequence, "Blend in", "cue-blend", 0, 1, 0.01, "s");
    // How long the effect lasts, which is what the loop is held for. One asset
    // serves a 0.867 s held beam and a 2.5 s ground residue.
    this.effectRow = this.numberField(sequence, "Effect duration", "effect-seconds", 0, 120, 0.1, "s");
    this.reactionPlan = this.node("p", "context-note"); this.reactionPlan.dataset.reactionPlan = "true";
    sequence.append(this.reactionPlan);
    this.evidence = this.node("p", "combat-evidence", "No response cue. Contact is not measured in this sequence.");
    sequence.append(this.evidence);
    const placement = this.card("04", "Spacing & facing");
    this.numberField(placement, "Separation", "separation", 0, 20, 0.05, "m");
    this.numberField(placement, "A facing", "yaw-a", -360, 360, 5, "°");
    this.numberField(placement, "B facing", "yaw-b", -360, 360, 5, "°");
    placement.append(this.node("p", "context-note", "Center-to-center spacing. Changing distance does not guarantee contact or retarget a source motion."));
    const spar = this.card("05", "Spar matrix");
    spar.append(this.node("p", "context-note", "Runs every available attack of the current attacker against the defender with measured contact and lists the results here. Review evidence only; no damage or gameplay approval."));
    const sparButtons = this.node("div", "buttons");
    this.sparRun = this.button("Run every attack", "spar-run"); sparButtons.append(this.sparRun); spar.append(sparButtons);
    this.sparStatus = this.node("p", "context-note"); this.sparStatus.setAttribute("role", "status"); this.sparStatus.setAttribute("aria-live", "polite");
    spar.append(this.sparStatus);
    this.sparList = this.node("ol", "combat-spar"); this.sparList.hidden = true; this.sparList.setAttribute("aria-label", "Spar matrix results");
    spar.append(this.sparList);
    const transport = this.card("06", "Shared playback");
    const timelineRow = this.node("label", "timeline-field");
    timelineRow.append(this.node("span", "", "Sequence"));
    this.time = this.node("output"); this.time.htmlFor = "combat-time"; timelineRow.append(this.time);
    this.timeline = this.node("input"); this.timeline.type = "range"; this.timeline.id = "combat-time";
    this.timeline.min = "0"; this.timeline.max = "1"; this.timeline.step = "0.001";
    this.timeline.dataset.command = "time"; this.timeline.setAttribute("aria-label", "Combat sequence time"); timelineRow.append(this.timeline);
    transport.append(timelineRow);
    const buttons = this.node("div", "buttons");
    this.play = this.button("Play", "play"); this.restart = this.button("Restart", "restart");
    buttons.append(this.play, this.restart); transport.append(buttons);
    this.numberField(transport, "Speed", "speed", 0.05, 3, 0.05, "×");
    const loopRow = this.node("label", "combat-check");
    this.loop = this.node("input"); this.loop.type = "checkbox"; this.loop.dataset.command = "loop";
    loopRow.append(this.loop, this.node("span", "", "Loop the complete sequence")); transport.append(loopRow);
    if (options.onFrameActors || options.onFrameAction) {
      const views = this.node("div", "buttons");
      if (options.onFrameActors) this.frameButtons.push(this.button("Frame actors", "frame-actors"));
      if (options.onFrameAction) this.frameButtons.push(this.button("Frame motion", "frame-action"));
      views.append(...this.frameButtons);
      transport.append(views);
      this.frameStatus = this.node("p", "context-note"); this.frameStatus.dataset.frameStatus = "true";
      this.frameStatus.setAttribute("role", "status"); this.frameStatus.setAttribute("aria-live", "polite");
      this.frameStatus.hidden = true; transport.append(this.frameStatus);
    }
    this.error = this.node("p", "combat-error"); this.error.setAttribute("role", "alert"); this.element.append(this.error);
    const handle = (event: Event) => {
      if (!this.controller.snapshot().active) return;
      const target = event.target as HTMLElement;
      const control = target.closest<HTMLElement>("[data-command]");
      if (!control || !this.element.contains(control)) return;
      const command = control.dataset.command;
      const isButton = control.tagName === "BUTTON";
      if (isButton && (control as HTMLButtonElement).disabled) return;
      if ((isButton && event.type !== "click") || (!isButton && event.type === "click")) return;
      // Numeric placement and sliders preview immediately; blur must not replay
      // the same edit or restart the shared timeline a second time.
      const inputType = (control as HTMLInputElement).type;
      const liveInput = inputType === "range" || inputType === "number";
      if (event.type === "input" && !liveInput) return;
      if (event.type === "change" && liveInput) return;
      if (inputType === "number" && !(control as HTMLInputElement).value.trim()) return;
      event.stopPropagation();
      this.error.textContent = "";
      try {
        if (command === "frame-actors") options.onFrameActors?.();
        else if (command === "frame-action") void this.frameMotion(options.onFrameAction);
        else this.command(control);
      } catch (error) { this.error.textContent = error instanceof Error ? error.message : String(error); }
    };
    for (const type of ["click", "input", "change"]) this.element.addEventListener(type, handle, { signal: this.abort.signal });
    this.unsubscribe = controller.subscribe((snapshot) => this.render(snapshot));
  }

  dispose(): void { this.abort.abort(); this.unsubscribe(); this.element.remove(); }

  private async frameMotion(run?: () => void | boolean | Promise<void | boolean>): Promise<void> {
    if (!run || this.framing || !this.frameStatus) return;
    this.framing = true; this.frameStatus.hidden = false;
    this.frameStatus.textContent = "Framing motion… wait for completion before seeking or playing. Pose edits cancel this survey.";
    this.render(this.controller.snapshot());
    try {
      const completed = await run();
      if (!this.abort.signal.aborted) this.frameStatus.textContent = completed === false
        ? "Motion framing cancelled or unavailable. Previous camera retained; frame again after pose edits."
        : "Motion framing complete. Both actors and the bound flight fit this view.";
    } catch (error) {
      if (!this.abort.signal.aborted) this.frameStatus.textContent = `Motion framing failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.framing = false;
      if (!this.abort.signal.aborted) this.render(this.controller.snapshot());
    }
  }

  private command(control: HTMLElement): void {
    const snapshot = this.controller.snapshot();
    const value = (control as HTMLInputElement).value;
    const slot = control.dataset.slot as CombatSlot;
    const defender = snapshot.attacker === "a" ? "b" : "a";
    switch (control.dataset.command) {
      case "model": void this.controller.selectActor(slot, value); break;
      case "retry": void this.controller.selectActor(slot, snapshot.slots.find((entry) => entry.slot === slot)!.definitionId); break;
      case "ready": this.controller.setAction(slot, "ready", value); break;
      case "attacker": this.controller.setAttacker(value as CombatSlot); break;
      case "action": this.controller.setAction(snapshot.attacker, "action", value); break;
      case "cue": this.controller.setManualCue({ kind: value as CombatReviewSnapshot["cue"]["kind"] }); break;
      case "response": this.controller.setAction(defender, snapshot.cue.kind as CombatActionRole, value); break;
      case "contact-response": this.renderContact(snapshot); break;
      case "contact-clip": this.controller.setAction(defender, this.measuredResponse.value as CombatActionRole, value); break;
      case "contact-scan":
        if (snapshot.contact.status === "scanning") this.controller.setPlaying(false);
        else void this.scanContact(this.measuredResponse.value as CombatContactSnapshot["response"]).catch((error) => {
          if (!this.abort.signal.aborted) this.error.textContent = error instanceof Error ? error.message : String(error);
        });
        break;
      case "contact-jump": if (snapshot.contact.result?.event) this.controller.seek(snapshot.contact.result.event.timeSeconds); break;
      case "reaction-policy": this.controller.setReactionPolicy((control as HTMLInputElement).checked ? "auto" : "manual"); break;
      case "spar-run":
        if (snapshot.spar.running) this.controller.cancelSparRun();
        else void this.controller.runSparMatrix().catch((error) => {
          if (!this.abort.signal.aborted) this.error.textContent = error instanceof Error ? error.message : String(error);
        });
        break;
      case "projectile-release": if (snapshot.projectiles.flights[0]) this.controller.seek(snapshot.projectiles.flights[0].releaseSeconds); break;
      case "cue-time": this.controller.setManualCue({ atSeconds: Number(value) }); break;
      case "cue-blend": this.controller.setManualCue({ blendSeconds: Number(value) }); break;
      case "effect-seconds": this.controller.setEffectSeconds(Number(value)); break;
      case "separation": this.controller.setPlacement({ separationMeters: Number(value) }); break;
      case "yaw-a": this.controller.setPlacement({ yawADegrees: Number(value) }); break;
      case "yaw-b": this.controller.setPlacement({ yawBDegrees: Number(value) }); break;
      case "play": this.controller.setPlaying(!snapshot.frame?.playing); break;
      case "restart": this.controller.restart(); break;
      case "time": this.controller.seek(Number(value) * snapshot.durationSeconds); break;
      case "speed": this.controller.setSpeed(Number(value)); break;
      case "loop": this.controller.setLoop((control as HTMLInputElement).checked); break;
      case "calibration": this.controller.setCalibration(slot, control.dataset.control!, Number(value)); break;
      case "reset-calibration": this.controller.resetCalibration(slot); break;
    }
  }

  private render(snapshot: CombatReviewSnapshot): void {
    this.element.hidden = !snapshot.active;
    if (this.lastRevision !== snapshot.revision) {
      this.lastRevision = snapshot.revision;
      for (const value of snapshot.slots) this.renderActor(value);
      const attacker = snapshot.slots.find((entry) => entry.slot === snapshot.attacker)!;
      const defender = snapshot.slots.find((entry) => entry.slot !== snapshot.attacker)!;
      this.attacker.value = snapshot.attacker;
      this.actionOptions(this.action, attacker.actions, attacker.selected.action);
      this.action.disabled = !snapshot.ready;
      const action = attacker.actions.find((entry) => entry.id === attacker.selected.action);
      this.durationNote.textContent = action ? `${action.durationSeconds.toFixed(2)} s action · ${APPROVAL_LABELS[action.approvalStatus]}. Timeline may also include approach, response and recovery; it is not a gameplay cooldown.` : "Load both actors to compose a sequence.";
      this.options(this.cue, [{ id: "none", label: "None · inspect motion only" },
        { id: "reaction", label: defender.selected.reaction ? "Reaction · manual cue" : "Reaction unavailable for this binding", disabled: !defender.selected.reaction },
        { id: "death", label: defender.selected.death ? "Death · manual cue" : "Death unavailable for this binding", disabled: !defender.selected.death }]);
      const hasCue = snapshot.cue.kind !== "none" && snapshot.contact.response === "none";
      this.cue.value = hasCue ? snapshot.cue.kind : "none"; this.cue.disabled = !snapshot.ready;
      this.responseRow.hidden = this.cueTimeRow.hidden = this.cueBlendRow.hidden = !hasCue;
      this.actionOptions(this.response, defender.actions.filter((entry) => entry.semantic === snapshot.cue.kind),
        hasCue ? defender.selected[snapshot.cue.kind as "reaction" | "death"] : "");
      this.setNumber("cue-time", snapshot.cue.atSeconds); this.setNumber("cue-blend", snapshot.cue.blendSeconds);
      this.setNumber("effect-seconds", snapshot.reaction.effectSeconds);
      this.setNumber("separation", snapshot.placement.separationMeters);
      this.setNumber("yaw-a", snapshot.placement.yawADegrees); this.setNumber("yaw-b", snapshot.placement.yawBDegrees);
      this.error.textContent = snapshot.error ?? "";
    } else for (const value of snapshot.slots) this.renderActor(value, true);
    this.renderContact(snapshot);
    this.renderSpar(snapshot);
    this.renderReactionPlan(snapshot);
    this.evidence.textContent = snapshot.contact.response !== "none"
      ? `Measured ${snapshot.contact.response} · begins at confirmed surface contact with a preserving blend. Review response only; no damage or health simulation.`
      : snapshot.cue.kind !== "none" ? "Manual cue · not measured contact. This response previews timing only; it does not establish a hit, damage or gameplay synchronization."
      : "No response cue. Scanning only schedules a response when one is explicitly selected and contact is confirmed.";
    this.play.disabled = this.restart.disabled = this.timeline.disabled = !snapshot.ready;
    for (const button of this.frameButtons) {
      button.disabled = this.framing || !snapshot.ready;
      if (button.dataset.command === "frame-action") {
        button.textContent = this.framing ? "Framing…" : "Frame motion";
        button.setAttribute("aria-busy", String(this.framing));
      }
    }
    this.play.textContent = snapshot.frame?.playing ? "Pause" : "Play";
    this.timeline.value = String(snapshot.frame?.normalizedTime ?? 0);
    this.time.value = `${(snapshot.frame?.timeSeconds ?? 0).toFixed(2)} / ${snapshot.durationSeconds.toFixed(2)} s`;
    this.timeline.setAttribute("aria-valuetext", this.time.value);
    this.loop.checked = snapshot.frame?.loop ?? false;
    this.setNumber("speed", snapshot.frame?.speed ?? 1);
    if (snapshot.error) this.error.textContent = snapshot.error;
  }
  /** What the special reaction is actually doing, in the reviewer's own numbers. */
  private renderReactionPlan(snapshot: CombatReviewSnapshot): void {
    this.effectRow.hidden = !snapshot.ready;
    const timeline = snapshot.reaction.timeline;
    const active = timeline?.plans[timeline.plans.length - 1];
    if (!active || !snapshot.reaction.phases.length) {
      this.reactionPlan.textContent = snapshot.ready
        ? "No special reaction. An ordinary contact uses the directional flinch set; a special damage type or a heavy strike replaces it with an authored impact, held loop and recovery."
        : "";
      return;
    }
    const quantized = Math.abs(active.quantizationSeconds) > 1e-6
      ? ` · loop quantized to whole periods, ${active.quantizationSeconds > 0 ? "+" : ""}${active.quantizationSeconds.toFixed(3)} s against the effect`
      : " · loop lands exactly on the effect";
    const cut = snapshot.reaction.phases.some((phase) => phase.truncated) ? " · cut by a later cue" : "";
    const absorbed = timeline!.absorbed.length ? ` · ${timeline!.absorbed.length} later hit(s) absorbed without replaying the impact` : "";
    const preempted = timeline!.plans.length > 1 ? ` · ${timeline!.plans.length - 1} preemption(s)` : "";
    this.reactionPlan.textContent = `${REACTION_SETS[active.setId].label} · ${timeline!.archetype} archetype · impact at `
      + `${active.atSeconds.toFixed(3)} s, ${active.loopPeriods} × ${active.phases[1]!.clipDurationSeconds.toFixed(3)} s loop `
      + `= ${active.holdSeconds.toFixed(3)} s held for a ${active.requestedHoldSeconds.toFixed(3)} s effect${quantized}`
      + `, then recovery and back to the ready pose${cut}${absorbed}${preempted}.`;
  }
  private renderContact(snapshot: CombatReviewSnapshot): void {
    const defender = snapshot.slots.find((entry) => entry.slot !== snapshot.attacker)!;
    const next = this.measuredResponse.value || "none";
    this.options(this.measuredResponse, [{ id: "none", label: "None · measure only" },
      { id: "reaction", label: defender.selected.reaction ? "Reaction on measured contact" : "Reaction clip unavailable", disabled: !defender.selected.reaction },
      { id: "death", label: defender.selected.death ? "Death on measured contact · review only" : "Death clip unavailable", disabled: !defender.selected.death }]);
    const kind = (next === "reaction" || next === "death") && defender.selected[next] ? next : "none";
    this.measuredResponse.value = kind; this.measuredResponse.disabled = !snapshot.ready;
    this.measuredClipRow.hidden = kind === "none";
    this.actionOptions(this.measuredClip, defender.actions.filter((entry) => entry.semantic === kind), kind === "none" ? "" : defender.selected[kind]);
    this.measuredClip.disabled = !snapshot.ready;
    const profile = this.controller.contactProfile();
    const ranged = profile?.surface.kind === "projectile";
    this.contactBinding.textContent = profile
      ? ranged ? `${profile.startSeconds.toFixed(3)} s release → ${profile.endSeconds.toFixed(3)} s flight end · fixed emitted geometry against actual moving target skin. No homing; equipment and props do not block this scan.`
        : `${profile.startSeconds.toFixed(3)}–${profile.endSeconds.toFixed(3)} s strike window · source-pinned visible strike points against actual target skin. Blocking equipment is not measured.`
      : "No strike surface/window is bound to this action. Its motion remains available; unbound source actions and spell emissions are not measured.";
    const { flights, bound, unavailableReason } = snapshot.projectiles, now = snapshot.frame?.timeSeconds ?? 0;
    this.release.hidden = this.projectileStatus.hidden = !bound; this.release.disabled = !flights.length;
    const stopped = flights.filter((flight) => snapshot.frame?.elapsedEvents.some((event) => event.kind === "contact"
      && event.result === "hit" && event.projectileId === flight.id)).length;
    const flight = flights[0];
    const projectileLabel = flight?.visualKind === "arrow" ? "arrow"
      : flight?.visualKind === "fire-spell" ? "fire spell" : "poison fluid";
    this.projectileStatus.textContent = unavailableReason ? `Emission unavailable · ${unavailableReason}` : flight
      ? `${flights.length} ${projectileLabel} projectile${flights.length === 1 ? "" : "s"} · ${now < flight.releaseSeconds ? "before release" : now > flight.endSeconds ? "flight ended" : stopped ? `${stopped} stopped at measured contact` : "in flight; no hit assumed"}. Release ${flight.releaseSeconds.toFixed(3)} s; flight ${(flight.endSeconds - flight.releaseSeconds).toFixed(3)} s. ${flight.evidence}.`
      : "No eligible emitted geometry. This is unavailable, not a miss.";
    this.reactionPolicy.checked = snapshot.reactionPolicy === "auto"; this.reactionPolicy.disabled = !snapshot.ready;
    const { status, result } = snapshot.contact;
    const side = snapshot.contact.direction ? ` · from the ${snapshot.contact.direction}` : "";
    const weight = snapshot.contact.severity ? ` · ${snapshot.contact.severity} attack` : "";
    const reactionClip = snapshot.contact.response === "reaction"
      ? defender.actions.find((entry) => entry.id === defender.selected.reaction)?.label ?? defender.selected.reaction : "";
    const message = status === "scanning" ? "Scanning current poses… Pause, seek or change an actor setting to cancel."
      : status === "contact" ? `Measured contact · ${result!.event!.timeSeconds.toFixed(3)} s${side}${weight} · ${snapshot.contact.response === "none" ? "no response requested" : snapshot.contact.response + " scheduled" + (reactionClip ? ` → ${reactionClip}` : "")}.`
      : status === "miss" ? `Measured miss · no eligible ${ranged ? "projectile surface" : "strike point"} reached target skin in the bound window. No response scheduled.`
      : status === "unavailable" ? `Contact unavailable · ${result!.evidence}`
      : "Not measured · scan the current spacing, facing, ready pose and calibration. No hit is assumed.";
    if (this.contactStatus.textContent !== message) this.contactStatus.textContent = message;
    this.contactStatus.dataset.state = status;
    this.scan.textContent = status === "scanning" ? "Cancel scan" : "Scan contact";
    this.scan.disabled = !snapshot.ready; this.scan.setAttribute("aria-busy", String(status === "scanning"));
    this.jump.disabled = status !== "contact"; this.contactDetails.hidden = !result;
    this.contactEvidence.textContent = result ? `${result.evidence} ${result.event?.evidence ?? ""} ${result.samples} pose samples; ${result.sampleRate} Hz; ${(result.toleranceMeters * 1000).toFixed(1)} mm tolerance. Not gameplay approval.` : "";
  }
  private renderSpar(snapshot: CombatReviewSnapshot): void {
    const { spar } = snapshot;
    this.sparRun.textContent = spar.running ? "Cancel spar run" : "Run every attack";
    this.sparRun.disabled = !snapshot.ready; this.sparRun.setAttribute("aria-busy", String(spar.running));
    const attacker = this.controller.definitions.find((entry) => entry.id === spar.attackerDefinitionId)?.label ?? "";
    const defender = this.controller.definitions.find((entry) => entry.id === spar.defenderDefinitionId)?.label ?? "";
    this.sparStatus.textContent = spar.running ? `Running · ${spar.rows.length} attack${spar.rows.length === 1 ? "" : "s"} measured so far (${attacker} → ${defender})…`
      : spar.rows.length ? `${spar.rows.length} attack${spar.rows.length === 1 ? "" : "s"} measured · ${spar.rows.filter((row) => row.status === "contact").length} contact · ${spar.rows.filter((row) => row.status === "miss").length} miss · ${spar.rows.filter((row) => row.status === "unavailable").length} unbound (${attacker} → ${defender})`
      : "No spar run yet.";
    const key = JSON.stringify(spar.rows);
    if (key === this.sparKey) return;
    this.sparKey = key; this.sparList.hidden = !spar.rows.length;
    this.sparList.replaceChildren(...spar.rows.map((row: CombatSparRow) => {
      const item = this.node("li"); item.dataset.state = row.status; item.title = row.evidence;
      const head = this.node("div", "combat-spar-head");
      head.append(this.node("strong", "", row.label), this.node("span", "combat-spar-result", `${row.status} · ${row.separationMeters.toFixed(2)} m`));
      const detail = row.status === "contact"
        ? `${row.timeSeconds == null ? "" : `hit at ${row.timeSeconds.toFixed(3)} s · `}${row.direction ?? "side unknown"} · ${row.severity ?? "weight unknown"}${row.reaction ? ` → ${row.reaction}` : ""}`
        : row.status === "miss" ? `window ${row.window} · no strike surface reached the target down to ${row.separationMeters.toFixed(2)} m`
        : `window ${row.window} · ${row.evidence}`;
      item.append(head, this.node("span", "combat-spar-detail", detail));
      return item;
    }));
  }
  private renderActor(value: CombatSlotSnapshot, calibrationOnly = false): void {
    const fields = this.actorFields[value.slot];
    if (!calibrationOnly) {
      fields.model.value = value.definitionId; fields.model.setAttribute("aria-busy", String(value.status === "loading"));
      const definition = this.controller.definitions.find((entry) => entry.id === value.definitionId)!;
      fields.status.textContent = value.error ?? (value.status === "loading" ? "Loading independently…" : definition.note);
      fields.status.classList.toggle("combat-error", Boolean(value.error));
      fields.retry.hidden = value.status !== "error";
      this.actionOptions(fields.ready, value.actions.filter((action) => action.semantic !== "death"), value.selected.ready);
      fields.ready.disabled = value.status !== "ready";
    }
    const key = value.calibration.map(({ id, label, group, min, max, step }) => [id, label, group, min, max, step].join("|")).join(";");
    if (key !== fields.calibrationKey) {
      for (const id of this.values.keys()) if (id.startsWith(`calibration-${value.slot}-`)) {
        this.values.delete(id); this.outputs.delete(id);
      }
      fields.calibrationKey = key; fields.calibration.replaceChildren();
      const groups = new Map<string, HTMLElement>();
      for (const control of value.calibration) {
        let group = groups.get(control.group);
        if (!group) {
          const details = this.node("details"); details.append(this.node("summary", "", control.group));
          group = this.node("div", "combat-calibration-group"); details.append(group); fields.calibration.append(details); groups.set(control.group, group);
        }
        const id = `calibration-${value.slot}-${control.id}`;
        const row = this.numberField(group, control.label, id, control.min, control.max, control.step, "", "range");
        const input = row.querySelector("input")!; input.dataset.command = "calibration";
        input.dataset.slot = value.slot; input.dataset.control = control.id;
      }
      if (key) { const reset = this.button("Reset this actor’s calibration", "reset-calibration"); reset.dataset.slot = value.slot; fields.calibration.append(reset); }
    }
    for (const control of value.calibration) this.setNumber(`calibration-${value.slot}-${control.id}`, control.value);
    fields.calibration.parentElement!.hidden = !value.calibration.length;
  }
  private buildActor(slot: CombatSlot): ActorFields {
    const card = this.card(slot === "a" ? "01" : "02", `Actor ${slot.toUpperCase()}`);
    card.classList.add("combat-actor", `combat-actor-${slot}`);
    const model = this.selectField(card, "Subject", `model-${slot}`); model.dataset.command = "model"; model.dataset.slot = slot;
    this.options(model, this.controller.definitions);
    const status = this.node("p", "context-note"); status.setAttribute("role", "status"); card.append(status);
    const retry = this.button("Retry this actor", "retry"); retry.dataset.slot = slot; retry.hidden = true; card.append(retry);
    const ready = this.selectField(card, "Ready pose", `ready-${slot}`); ready.dataset.command = "ready"; ready.dataset.slot = slot;
    const tuning = this.node("details", "combat-calibration"); tuning.append(this.node("summary", "", `Tune actor ${slot.toUpperCase()}`));
    const calibration = this.node("div"); tuning.append(calibration); card.append(tuning);
    return { model, ready, status, retry, calibration, calibrationKey: "" };
  }
  private card(index: string, title: string): HTMLElement {
    const card = this.node("section", "studio-card");
    const heading = this.node("h2"); heading.append(this.node("span", "", index), this.doc.createTextNode(title));
    card.append(heading); this.element.append(card); return card;
  }
  private selectField(parent: HTMLElement, label: string, command: string): HTMLSelectElement {
    const row = this.node("label", "select-field"); row.append(this.node("span", "", label));
    const select = this.node("select"); select.dataset.command = command; select.id = `combat-${command}`;
    row.htmlFor = select.id; row.append(select); parent.append(row); return select;
  }
  private numberField(parent: HTMLElement, label: string, command: string, min: number, max: number, step: number, unit: string, type = "number"): HTMLElement {
    const row = this.node("label", "combat-number"); row.append(this.node("span", "", label));
    const input = this.node("input"); input.type = type; input.id = `combat-${command}`; row.htmlFor = input.id;
    input.min = String(min); input.max = String(max); input.step = String(step); input.dataset.command = command;
    const output = this.node("output"); output.htmlFor = input.id; output.dataset.unit = unit;
    row.append(input, output); parent.append(row); this.values.set(command, input); this.outputs.set(command, output); return row;
  }
  private setNumber(command: string, value: number): void {
    const input = this.values.get(command), output = this.outputs.get(command);
    if (input && this.doc.activeElement !== input) input.value = String(value);
    if (output) output.value = `${Number(value.toFixed(3))}${output.dataset.unit}`;
  }
  private actionOptions(select: HTMLSelectElement, actions: readonly ReviewAction[], selected: string): void {
    this.options(select, actions.map((action) => ({ id: action.id,
      label: `${action.label} · ${APPROVAL_LABELS[action.approvalStatus]}`, disabled: Boolean(action.unavailableReason) })));
    select.value = selected;
    const current = actions.find((action) => action.id === selected);
    select.title = current ? `${current.label} · ${APPROVAL_LABELS[current.approvalStatus]}` : "";
  }
  private options(select: HTMLSelectElement, entries: readonly { id: string; label: string; disabled?: boolean }[]): void {
    const signature = JSON.stringify(entries.map(({ id, label, disabled }) => [id, label, Boolean(disabled)]));
    if (select.dataset.options === signature) return;
    select.dataset.options = signature;
    select.replaceChildren(...entries.map((entry) => { const option = this.node("option");
      option.value = entry.id; option.textContent = entry.label; option.disabled = Boolean(entry.disabled); return option; }));
  }
  private button(label: string, command: string): HTMLButtonElement {
    const button = this.node("button", "", label); button.type = "button"; button.dataset.command = command; return button;
  }
  private node<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
    const node = this.doc.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
  }
}
