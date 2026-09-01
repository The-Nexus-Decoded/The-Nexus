import * as THREE from "three";
import { createReviewPropFactory, REVIEW_PROP_DEFINITIONS, REVIEW_PROP_LIMIT, type ReviewPropInstance } from "./review-prop-factory";
import { measureReviewPropInteraction, prepareReviewPropInteractionActor, reviewPropInteractionFrame,
  type ReviewPropInteractionDiagnostic } from "./review-prop-interactions";
import { createReviewSwimVolume, measureReviewSwimPose, reviewSwimFrame, surveyReviewSwim,
  type ReviewSwimFrame, type ReviewSwimPoseDiagnostic, type ReviewSwimSurvey } from "./review-swim-diagnostics";
import type { CombatReviewSnapshot, CombatSlot } from "./combat-review-controller";
import type { ReviewActorAdapter } from "./combat-review-types";
import { applyDestructibleHit, interactionCapability, type InteractiveKind } from "../../game/interactionFlow";

function reviewDestructionKind(kind: string): InteractiveKind | null {
  if (kind === "chest") return "chest";
  if (kind === "door") return "gate";
  return null;
}

/** Review-only prop placements. Never changes actors, their clock or dungeon state. */
export class ReviewPropsPanel {
  readonly element: HTMLElement;
  readonly root = new THREE.Group();
  private readonly doc: Document;
  private readonly factory: ReturnType<typeof createReviewPropFactory>;
  private readonly abort = new AbortController();
  private readonly items = new Map<string, { instance: ReviewPropInstance; home: number; hp: number; seed: number }>();
  private readonly asset: HTMLSelectElement;
  private readonly placed: HTMLSelectElement;
  private readonly placement: HTMLElement;
  private readonly articulation: HTMLElement;
  private readonly destruction: HTMLElement;
  private readonly destructionStatus: HTMLElement;
  private readonly damage: HTMLButtonElement;
  private readonly resetDestruction: HTMLButtonElement;
  private readonly jointFields = new Map<string, { input: HTMLInputElement; output: HTMLElement }>();
  private jointKey = "";
  private readonly fields: HTMLInputElement[] = [];
  private readonly spawn: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly error: HTMLElement;
  private readonly diagnostic: HTMLElement;
  private readonly swimSection: HTMLElement;
  private readonly swimDiagnostic: HTMLElement;
  private readonly swimVolume = createReviewSwimVolume();
  private readonly onFrameBounds?: (bounds: THREE.Box3) => void;
  private readonly actorForSlot: (slot: CombatSlot) => ReviewActorAdapter | null;
  private latestSnapshot: CombatReviewSnapshot | null = null;
  private interactionDiagnostic: ReviewPropInteractionDiagnostic | null = null;
  private swimFrame: ReviewSwimFrame | null = null;
  private swimCurrent: ReviewSwimPoseDiagnostic | null = null;
  private swimSurvey: ReviewSwimSurvey | null = null;
  private swimSurveyError = "";
  private swimKey = "";
  private swimJob: { abort: AbortController; key: string } | null = null;
  private pending: { abort: AbortController } | null = null;
  private serial = 0;
  private active = false;
  private disposed = false;

  constructor(options: { document?: Document; factory?: ReturnType<typeof createReviewPropFactory>;
    onFrameBounds?: (bounds: THREE.Box3) => void;
    actorForSlot?: (slot: CombatSlot) => ReviewActorAdapter | null } = {}) {
    this.doc = options.document ?? document;
    this.factory = options.factory ?? createReviewPropFactory();
    this.onFrameBounds = options.onFrameBounds;
    this.actorForSlot = options.actorForSlot ?? (() => null);
    this.root.name = "motion-studio-review-props"; this.root.visible = false;
    const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
      const value = this.doc.createElement(tag); value.textContent = text; return value;
    };
    this.element = node("section"); this.element.className = "studio-card"; this.element.hidden = true;
    this.element.setAttribute("aria-label", "Review props"); this.element.append(node("h2", "Props & environment"));
    const select = (parent: HTMLElement, label: string, command: string) => {
      const row = node("label"); row.className = "select-field";
      const value = node("select"); value.dataset.command = command; value.setAttribute("aria-label", label);
      row.append(node("span", label), value, node("span")); parent.append(row); return value;
    };
    const button = (parent: HTMLElement, label: string, command: string) => {
      const value = node("button", label); value.type = "button"; value.dataset.command = command;
      parent.append(value); return value;
    };
    this.asset = select(this.element, "Prop asset", "asset");
    for (const definition of REVIEW_PROP_DEFINITIONS) {
      const option = node("option", definition.label); option.value = definition.id; this.asset.append(option);
    }
    this.asset.value = REVIEW_PROP_DEFINITIONS[0]?.id ?? "";
    this.spawn = button(this.element, "Spawn prop", "spawn");
    this.placement = node("div"); this.element.append(this.placement);
    this.placed = select(this.placement, "Placed prop", "selected");
    for (const [index, label] of ["Prop X", "Prop Z", "Prop facing"].entries()) {
      const row = node("label"), field = node("input");
      field.type = "number"; field.dataset.command = "placement";
      field.min = index === 2 ? "-360" : "-20"; field.max = index === 2 ? "360" : "20";
      field.step = index === 2 ? "5" : "0.1"; field.setAttribute("aria-label", label);
      row.append(node("span", label), field, node("span", index === 2 ? "°" : "m"));
      this.placement.append(row); this.fields.push(field);
    }
    const buttons = node("div"); buttons.className = "buttons";
    button(buttons, "Frame prop", "frame"); button(buttons, "Reset placement", "reset");
    button(buttons, "Remove prop", "remove"); this.placement.append(buttons);
    this.articulation = node("div"); this.placement.append(this.articulation);
    this.destruction = node("section"); this.destruction.className = "review-diagnostic-section";
    this.destruction.append(node("h3", "Destruction diagnostic"));
    this.destructionStatus = node("p"); this.destructionStatus.className = "context-note";
    const destructionButtons = node("div"); destructionButtons.className = "buttons";
    this.damage = button(destructionButtons, "Apply 4 damage", "damage");
    this.resetDestruction = button(destructionButtons, "Reset integrity", "reset-destruction");
    this.destruction.append(this.destructionStatus, destructionButtons); this.placement.append(this.destruction);
    this.status = node("p"); this.status.className = "context-note";
    this.status.setAttribute("role", "status"); this.status.setAttribute("aria-live", "polite");
    this.error = node("p"); this.error.setAttribute("role", "alert");
    this.diagnostic = node("p"); this.diagnostic.className = "context-note";
    this.diagnostic.dataset.interactionState = "unavailable";
    this.swimSection = node("section"); this.swimSection.className = "review-diagnostic-section";
    this.swimSection.append(node("h3", "Diagnostic swim volume"));
    this.swimDiagnostic = node("p"); this.swimDiagnostic.className = "context-note";
    this.swimDiagnostic.dataset.swimState = "unavailable";
    this.swimSection.append(this.swimDiagnostic); button(this.swimSection, "Frame diagnostic water volume", "frame-water");
    const note = node("p", "Placement and named prop joints are inspection controls, not a completed actor interaction. Climbing, hand contact, opening sequences and breaking require their own verification.");
    note.className = "context-note"; this.element.append(this.status, this.error, this.diagnostic, this.swimSection, note);
    const handle = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-command]");
      if (!target || !this.element.contains(target) || !this.active || this.disposed) return;
      this.error.textContent = "";
      const command = target.dataset.command, selected = this.items.get(this.placed.value);
      if (event.type === "click") {
        if (command === "spawn") void this.add(options.onFrameBounds);
        else if (command === "frame-water" && this.swimFrame) this.onFrameBounds?.(this.swimVolume.bounds());
        else if (selected && command === "frame") options.onFrameBounds?.(selected.instance.bounds());
        else if (selected && command === "reset") {
          this.home(selected.instance, selected.home); this.syncSelectedInteraction(true);
        } else if (selected && command === "reset-joints") {
          selected.instance.resetJoints(); this.syncSelectedInteraction(true);
        } else if (selected && command === "damage") {
          const kind = reviewDestructionKind(selected.instance.definition.kind);
          if (kind) {
            const result = applyDestructibleHit({ kind, hp: selected.hp, damage: 4, seed: selected.seed });
            selected.hp = result.hp; selected.instance.setDestroyed(result.destroyed); this.syncSelectedInteraction(true);
          }
        } else if (selected && command === "reset-destruction") {
          const kind = reviewDestructionKind(selected.instance.definition.kind), capability = kind && interactionCapability(kind);
          selected.hp = capability?.maxHp ?? 0; selected.instance.setDestroyed(false); this.syncSelectedInteraction(true);
        } else if (selected && command === "remove") {
          selected.instance.dispose(); this.items.delete(selected.instance.instanceId); this.populate(); this.syncSelectedInteraction(true);
        }
      } else if (command === "selected" && event.type === "change") this.syncSelectedInteraction(true);
      else if (command === "joint" && selected) {
        const input = target as HTMLInputElement, value = Number(input.value);
        try {
          if (input.value.trim() === "") throw new Error("Enter a joint angle within its shown range.");
          selected.instance.setJoint(input.dataset.joint!, value); this.syncSelectedInteraction();
        } catch (error) { this.error.textContent = String(error); this.refresh(true); }
      }
      else if (command === "placement" && selected) {
        const values = this.fields.map((field) => Number(field.value));
        const valid = this.fields.every((field, index) => field.value.trim() !== "" && Number.isFinite(values[index])
          && values[index]! >= Number(field.min) && values[index]! <= Number(field.max));
        if (valid) {
          selected.instance.place([values[0]!, 0, values[1]!], THREE.MathUtils.degToRad(values[2]!));
          this.syncSelectedInteraction();
        } else if (event.type === "change") {
          this.error.textContent = "Use positions between −20 and 20 m and facing between −360° and 360°.";
          this.refresh(true);
        }
      }
    };
    for (const event of ["click", "change", "input"]) this.element.addEventListener(event, handle, { signal: this.abort.signal });
    this.refresh();
  }

  private home(instance: ReviewPropInstance, slot: number) {
    instance.place([4.5 + (slot % 2) * 5, 0, Math.floor(slot / 2) * 5], 0);
  }
  private populate(selected = this.placed.value) {
    this.placed.replaceChildren();
    for (const { instance } of this.items.values()) {
      const option = this.doc.createElement("option"); option.value = instance.instanceId;
      option.textContent = `${instance.definition.label} · ${instance.instanceId}`; this.placed.append(option);
    }
    this.placed.value = this.items.has(selected) ? selected : this.items.keys().next().value ?? "";
  }
  private refresh(force = false) {
    const selectedEntry = this.items.get(this.placed.value), selected = selectedEntry?.instance;
    this.element.hidden = !this.active; this.root.visible = this.active;
    this.spawn.disabled = !this.active || !!this.pending || this.items.size >= REVIEW_PROP_LIMIT;
    this.spawn.textContent = this.pending ? "Loading prop…" : "Spawn prop";
    this.placement.hidden = !selected;
    this.status.textContent = this.pending ? "Verifying source bytes and loading original materials…"
      : selected ? `${this.items.size} / ${REVIEW_PROP_LIMIT} props · ${selected.definition.triangleCount.toLocaleString("en-US")} triangles · ${selected.definition.contactMeshes.length} solid contact meshes. ${selected.definition.approvalStatus}. Placement does not enable gameplay collision.`
        : "No props placed. Choose an asset to add it beside the actors.";
    this.diagnostic.hidden = !selected || !["chest", "door", "tree"].includes(selected.definition.kind);
    this.diagnostic.dataset.interactionState = this.interactionDiagnostic?.state ?? "unavailable";
    this.diagnostic.textContent = this.interactionDiagnostic?.label ?? "Interaction diagnostic UNAVAILABLE — select an interactive prop and matching source action on the shared timeline.";
    const destructionKind = selected ? reviewDestructionKind(selected.definition.kind) : null;
    const capability = destructionKind ? interactionCapability(destructionKind) : null;
    this.destruction.hidden = !selected || !capability;
    this.damage.disabled = !capability?.destructible || !!selected?.destroyed();
    this.resetDestruction.disabled = !capability?.destructible || (!selected?.destroyed() && selectedEntry?.hp === capability?.maxHp);
    this.destructionStatus.textContent = !capability ? ""
      : capability.destructible
        ? selected?.destroyed()
          ? `Destroyed · 0 / ${capability.maxHp} integrity. Rendered contact geometry is removed and deterministic PBR debris is shown. Diagnostic only; no production fracture, drop or gameplay approval.`
          : `${selectedEntry?.hp ?? capability.maxHp} / ${capability.maxHp} integrity. Damage uses the shared runtime destruction rule; the intact source mesh remains authoritative until zero.`
        : `Protected · ${capability.protectionReason ?? "structural or progression authority"}`;
    this.swimSection.hidden = !this.active || !this.swimFrame;
    this.swimVolume.root.visible = this.active && !!this.swimFrame;
    this.swimDiagnostic.dataset.swimState = this.swimCurrent?.state ?? "unavailable";
    const survey = this.swimSurvey;
    const crossing = (value: number | null, label: string) => value == null ? `${label} not measured` : `${label} ${Number(value.toFixed(3))} s`;
    const surveyLabel = survey ? ` 30 Hz full-clip survey: ${crossing(survey.firstVolumeSeconds, "first sampled-volume entry")}; ${crossing(survey.firstWaterlineSeconds, "first Hips waterline crossing")}; ${crossing(survey.firstEndPlaneSeconds, "end-plane crossing")}; reverse travel ${Number(survey.reverseTravelMeters.toFixed(3))} m; start/end Hips seam ${Number(survey.loopSeamResidualMeters.toFixed(3))} m; maximum sampled occupancy ${survey.maximumInside}/${survey.sampledTotal}. ${this.swimFrame?.approval === "draft" && survey.reverseTravelMeters > .05 ? "DRAFT BACKTRACK DETECTED. " : ""}This is diagnostic geometry, not a water asset or exit approval.`
      : this.swimFrame ? this.swimSurveyError ? ` Survey UNAVAILABLE — ${this.swimSurveyError}` : " Full-clip 30 Hz survey running…" : "";
    this.swimDiagnostic.textContent = (this.swimCurrent?.label ?? "Swim diagnostic UNAVAILABLE — select Human · Environmental interactions and a registered swim action.") + surveyLabel;
    const joints = selected?.joints() ?? [], jointKey = `${selected?.instanceId ?? ""}:${joints.map((joint) => joint.id).join(",")}`;
    this.articulation.hidden = !joints.length;
    if (jointKey !== this.jointKey) {
      this.jointKey = jointKey; this.articulation.replaceChildren(); this.jointFields.clear();
      for (const joint of joints) {
        const row = this.doc.createElement("label"), label = this.doc.createElement("span"); label.textContent = joint.label;
        const input = this.doc.createElement("input"), output = this.doc.createElement("span");
        input.type = "range"; input.min = String(joint.min); input.max = String(joint.max); input.step = "1";
        input.dataset.command = "joint"; input.dataset.joint = joint.id; input.setAttribute("aria-label", joint.label);
        row.append(label, input, output); this.articulation.append(row); this.jointFields.set(joint.id, { input, output });
      }
      if (joints.length) {
        const button = this.doc.createElement("button"); button.type = "button"; button.dataset.command = "reset-joints";
        button.textContent = "Reset prop joints"; this.articulation.append(button);
      }
    }
    for (const joint of joints) {
      const field = this.jointFields.get(joint.id)!;
      if (force || this.doc.activeElement !== field.input) field.input.value = String(joint.value);
      field.output.textContent = `${Number(joint.value.toFixed(1))}°`;
    }
    if (selected) [selected.root.position.x, selected.root.position.z, THREE.MathUtils.radToDeg(selected.root.rotation.y)]
      .forEach((value, index) => {
        const field = this.fields[index]!;
        if (force || this.doc.activeElement !== field) field.value = String(Number(value.toFixed(3)));
      });
  }
  private async add(frame?: (bounds: THREE.Box3) => void) {
    if (this.pending || this.items.size >= REVIEW_PROP_LIMIT) return;
    const job = { abort: new AbortController() }; this.pending = job; this.refresh();
    try {
      const instance = await this.factory.create({ definitionId: this.asset.value,
        instanceId: `prop-${++this.serial}`, signal: job.abort.signal });
      if (this.disposed || this.pending !== job || job.abort.signal.aborted || !this.active) { instance.dispose(); return; }
      const occupied = new Set([...this.items.values()].map((entry) => entry.home));
      const home = Array.from({ length: REVIEW_PROP_LIMIT }, (_, index) => index).find((value) => !occupied.has(value))!;
      const kind = reviewDestructionKind(instance.definition.kind), capability = kind ? interactionCapability(kind) : null;
      this.home(instance, home); this.items.set(instance.instanceId, { instance, home,
        hp: capability?.maxHp ?? 0, seed: this.serial * 31 }); this.root.add(instance.root);
      this.populate(instance.instanceId); this.syncSelectedInteraction(true); frame?.(instance.bounds());
    } catch (error) {
      if (!job.abort.signal.aborted && !this.disposed && this.pending === job) this.error.textContent = String(error);
    } finally { if (this.pending === job) { this.pending = null; this.refresh(); } }
  }
  setActive(active: boolean) {
    if (this.disposed) return;
    this.active = active;
    if (!active) { this.pending?.abort.abort(); this.pending = null; this.clearSwim(); }
    this.refresh();
  }
  syncInteraction(snapshot: CombatReviewSnapshot) {
    if (!this.active || this.disposed) return;
    this.latestSnapshot = snapshot;
    const selected = this.items.get(this.placed.value)?.instance;
    const frame = selected ? reviewPropInteractionFrame(selected.definition.kind, snapshot) : null;
    if (frame) {
      const actor = this.actorForSlot(frame.slot);
      if (actor?.instanceId === frame.actorId) prepareReviewPropInteractionActor(actor, frame.contactParts);
    }
    this.syncSwim(snapshot);
    this.syncSelectedInteraction();
  }
  private clearSwim() {
    this.swimJob?.abort.abort(); this.swimJob = null; this.swimKey = ""; this.swimFrame = null;
    this.swimCurrent = null; this.swimSurvey = null; this.swimSurveyError = "";
    this.swimVolume.root.removeFromParent(); this.swimVolume.root.visible = false;
  }
  private syncSwim(snapshot: CombatReviewSnapshot) {
    const frame = reviewSwimFrame(snapshot);
    if (!frame) { this.clearSwim(); return; }
    const actor = this.actorForSlot(frame.slot);
    if (!actor || actor.instanceId !== frame.actorId) { this.clearSwim(); return; }
    if (this.swimFrame?.actorId !== frame.actorId) this.swimVolume.recenter(actor);
    if (!this.swimVolume.root.parent) this.root.add(this.swimVolume.root);
    const current = measureReviewSwimPose(actor, frame, this.swimVolume);
    const key = `${frame.actorId}:${frame.actionId}:${current.sourceToken}`;
    this.swimFrame = frame; this.swimCurrent = current;
    if (current.state === "unavailable") { this.swimJob?.abort.abort(); this.swimJob = null; this.swimKey = key;
      this.swimSurvey = null; this.swimSurveyError = current.label; return; }
    if (key === this.swimKey) return;
    this.swimJob?.abort.abort(); this.swimSurvey = null; this.swimSurveyError = ""; this.swimKey = key;
    const job = { abort: new AbortController(), key }; this.swimJob = job;
    const restore = () => {
      const latest = this.latestSnapshot && reviewSwimFrame(this.latestSnapshot);
      const latestActor = latest ? this.actorForSlot(latest.slot) : null;
      if (latest && latestActor === actor && latest.actorId === frame.actorId && latest.actionId === frame.actionId) {
        actor.sample(latest.actionId, latest.timeSeconds);
      }
    };
    void surveyReviewSwim(actor, frame, this.swimVolume, { restore, signal: job.abort.signal }).then((result) => {
      if (this.swimJob !== job || job.abort.signal.aborted || this.disposed) return;
      this.swimJob = null; this.swimSurvey = result; this.swimCurrent = measureReviewSwimPose(actor, frame, this.swimVolume); this.refresh();
    }).catch((error) => {
      if (this.swimJob !== job || job.abort.signal.aborted || this.disposed) return;
      this.swimJob = null; this.swimSurveyError = error instanceof Error ? error.message : String(error); this.refresh();
    });
  }
  private syncSelectedInteraction(force = false) {
    const selected = this.items.get(this.placed.value)?.instance;
    const frame = selected && this.latestSnapshot ? reviewPropInteractionFrame(selected.definition.kind, this.latestSnapshot) : null;
    if (selected && frame) {
      const values = new Map(selected.joints().map((joint) => [joint.id, joint.value]));
      for (const [id, value] of Object.entries(frame.joints)) if (Math.abs((values.get(id) ?? NaN) - value) > 1e-6) selected.setJoint(id, value);
    }
    this.interactionDiagnostic = selected && ["chest", "door", "tree"].includes(selected.definition.kind)
      ? measureReviewPropInteraction(selected, frame ? this.actorForSlot(frame.slot) : null, frame) : null;
    this.refresh(force);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.active = false;
    this.pending?.abort.abort(); this.pending = null; this.abort.abort();
    this.clearSwim(); this.swimVolume.dispose(); this.factory.dispose(); this.items.clear(); this.root.removeFromParent(); this.element.remove();
  }
}
