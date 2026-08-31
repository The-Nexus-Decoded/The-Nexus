import { CombatReviewController, type CombatActionRole, type CombatReviewSnapshot, type CombatSlot, type CombatSlotSnapshot } from "./combat-review-controller";
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
  private readonly play: HTMLButtonElement;
  private readonly restart: HTMLButtonElement;
  private readonly timeline: HTMLInputElement;
  private readonly time: HTMLOutputElement;
  private readonly loop: HTMLInputElement;
  private readonly durationNote: HTMLElement;
  private readonly evidence: HTMLElement;
  private readonly error: HTMLElement;
  private readonly unsubscribe: () => void;
  private lastRevision = -1;

  constructor(private readonly controller: CombatReviewController, options: {
    document?: Document; onFrameActors?: () => void; onFrameAction?: () => void;
  } = {}) {
    this.doc = options.document ?? document;
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
    this.cue = this.selectField(sequence, "Response", "cue");
    this.response = this.selectField(sequence, "Clip", "response"); this.responseRow = this.response.closest("label")!;
    this.cueTimeRow = this.numberField(sequence, "Cue time", "cue-time", 0, 120, 0.01, "s");
    this.cueBlendRow = this.numberField(sequence, "Blend in", "cue-blend", 0, 1, 0.01, "s");
    this.evidence = this.node("p", "combat-evidence", "No response cue. Contact is not measured in this sequence.");
    sequence.append(this.evidence);
    const placement = this.card("04", "Spacing & facing");
    this.numberField(placement, "Separation", "separation", 0, 20, 0.05, "m");
    this.numberField(placement, "A facing", "yaw-a", -360, 360, 5, "°");
    this.numberField(placement, "B facing", "yaw-b", -360, 360, 5, "°");
    placement.append(this.node("p", "context-note", "Center-to-center spacing. Changing distance does not guarantee contact or retarget a source motion."));
    const transport = this.card("05", "Shared playback");
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
      if (options.onFrameActors) views.append(this.button("Frame actors", "frame-actors"));
      if (options.onFrameAction) views.append(this.button("Frame motion", "frame-action"));
      transport.append(views);
    }
    this.error = this.node("p", "combat-error"); this.error.setAttribute("role", "alert"); this.element.append(this.error);
    const handle = (event: Event) => {
      if (!this.controller.snapshot().active) return;
      const target = event.target as HTMLElement;
      const control = target.closest<HTMLElement>("[data-command]");
      if (!control || !this.element.contains(control)) return;
      const command = control.dataset.command;
      const isButton = control.tagName === "BUTTON";
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
        else if (command === "frame-action") options.onFrameAction?.();
        else this.command(control);
      } catch (error) { this.error.textContent = error instanceof Error ? error.message : String(error); }
    };
    for (const type of ["click", "input", "change"]) this.element.addEventListener(type, handle, { signal: this.abort.signal });
    this.unsubscribe = controller.subscribe((snapshot) => this.render(snapshot));
  }

  dispose(): void { this.abort.abort(); this.unsubscribe(); this.element.remove(); }

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
      case "cue-time": this.controller.setManualCue({ atSeconds: Number(value) }); break;
      case "cue-blend": this.controller.setManualCue({ blendSeconds: Number(value) }); break;
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
      this.cue.value = snapshot.cue.kind; this.cue.disabled = !snapshot.ready;
      const hasCue = snapshot.cue.kind !== "none";
      this.responseRow.hidden = this.cueTimeRow.hidden = this.cueBlendRow.hidden = !hasCue;
      this.actionOptions(this.response, defender.actions.filter((entry) => entry.semantic === snapshot.cue.kind),
        hasCue ? defender.selected[snapshot.cue.kind as "reaction" | "death"] : "");
      this.setNumber("cue-time", snapshot.cue.atSeconds); this.setNumber("cue-blend", snapshot.cue.blendSeconds);
      this.setNumber("separation", snapshot.placement.separationMeters);
      this.setNumber("yaw-a", snapshot.placement.yawADegrees); this.setNumber("yaw-b", snapshot.placement.yawBDegrees);
      this.evidence.textContent = hasCue ? "Manual cue · not measured contact. This response previews timing only; it does not establish a hit, damage or gameplay synchronization."
        : "No response cue. Contact is not measured in this sequence.";
      this.error.textContent = snapshot.error ?? "";
    } else for (const value of snapshot.slots) this.renderActor(value, true);
    this.play.disabled = this.restart.disabled = this.timeline.disabled = !snapshot.ready;
    this.play.textContent = snapshot.frame?.playing ? "Pause" : "Play";
    this.timeline.value = String(snapshot.frame?.normalizedTime ?? 0);
    this.time.value = `${(snapshot.frame?.timeSeconds ?? 0).toFixed(2)} / ${snapshot.durationSeconds.toFixed(2)} s`;
    this.timeline.setAttribute("aria-valuetext", this.time.value);
    this.loop.checked = snapshot.frame?.loop ?? false;
    this.setNumber("speed", snapshot.frame?.speed ?? 1);
    if (snapshot.error) this.error.textContent = snapshot.error;
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
