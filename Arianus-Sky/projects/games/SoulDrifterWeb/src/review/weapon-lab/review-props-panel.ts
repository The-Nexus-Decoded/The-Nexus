import * as THREE from "three";
import { createReviewPropFactory, REVIEW_PROP_DEFINITIONS, REVIEW_PROP_LIMIT, type ReviewPropInstance } from "./review-prop-factory";

/** Review-only prop placements. Never changes actors, their clock or dungeon state. */
export class ReviewPropsPanel {
  readonly element: HTMLElement;
  readonly root = new THREE.Group();
  private readonly doc: Document;
  private readonly factory: ReturnType<typeof createReviewPropFactory>;
  private readonly abort = new AbortController();
  private readonly items = new Map<string, { instance: ReviewPropInstance; home: number }>();
  private readonly asset: HTMLSelectElement;
  private readonly placed: HTMLSelectElement;
  private readonly placement: HTMLElement;
  private readonly fields: HTMLInputElement[] = [];
  private readonly spawn: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly error: HTMLElement;
  private pending: { abort: AbortController } | null = null;
  private serial = 0;
  private active = false;
  private disposed = false;

  constructor(options: { document?: Document; factory?: ReturnType<typeof createReviewPropFactory>;
    onFrameBounds?: (bounds: THREE.Box3) => void } = {}) {
    this.doc = options.document ?? document;
    this.factory = options.factory ?? createReviewPropFactory();
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
    this.status = node("p"); this.status.className = "context-note";
    this.status.setAttribute("role", "status"); this.status.setAttribute("aria-live", "polite");
    this.error = node("p"); this.error.setAttribute("role", "alert");
    const note = node("p", "Static placements only. Climbing, opening and breaking require their own interaction setup; spawning a prop does not imply those actions work.");
    note.className = "context-note"; this.element.append(this.status, this.error, note);
    const handle = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-command]");
      if (!target || !this.element.contains(target) || !this.active || this.disposed) return;
      this.error.textContent = "";
      const command = target.dataset.command, selected = this.items.get(this.placed.value);
      if (event.type === "click") {
        if (command === "spawn") void this.add(options.onFrameBounds);
        else if (selected && command === "frame") options.onFrameBounds?.(selected.instance.bounds());
        else if (selected && command === "reset") {
          this.home(selected.instance, selected.home); this.refresh(true);
        } else if (selected && command === "remove") {
          selected.instance.dispose(); this.items.delete(selected.instance.instanceId); this.populate(); this.refresh(true);
        }
      } else if (command === "selected" && event.type === "change") this.refresh(true);
      else if (command === "placement" && selected) {
        const values = this.fields.map((field) => Number(field.value));
        const valid = this.fields.every((field, index) => field.value.trim() !== "" && Number.isFinite(values[index])
          && values[index]! >= Number(field.min) && values[index]! <= Number(field.max));
        if (valid) {
          selected.instance.place([values[0]!, 0, values[1]!], THREE.MathUtils.degToRad(values[2]!));
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
    const selected = this.items.get(this.placed.value)?.instance;
    this.element.hidden = !this.active; this.root.visible = this.active;
    this.spawn.disabled = !this.active || !!this.pending || this.items.size >= REVIEW_PROP_LIMIT;
    this.spawn.textContent = this.pending ? "Loading prop…" : "Spawn prop";
    this.placement.hidden = !selected;
    this.status.textContent = this.pending ? "Verifying source bytes and loading original materials…"
      : selected ? `${this.items.size} / ${REVIEW_PROP_LIMIT} props · ${selected.definition.triangleCount.toLocaleString("en-US")} triangles · ${selected.definition.contactMeshes.length} solid contact meshes. Placement does not enable gameplay collision.`
        : "No props placed. Choose an asset to add it beside the actors.";
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
      this.home(instance, home); this.items.set(instance.instanceId, { instance, home }); this.root.add(instance.root);
      this.populate(instance.instanceId); this.refresh(true); frame?.(instance.bounds());
    } catch (error) {
      if (!job.abort.signal.aborted && !this.disposed && this.pending === job) this.error.textContent = String(error);
    } finally { if (this.pending === job) { this.pending = null; this.refresh(); } }
  }
  setActive(active: boolean) {
    if (this.disposed) return;
    this.active = active;
    if (!active) { this.pending?.abort.abort(); this.pending = null; }
    this.refresh();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.active = false;
    this.pending?.abort.abort(); this.pending = null; this.abort.abort();
    this.factory.dispose(); this.items.clear(); this.root.removeFromParent(); this.element.remove();
  }
}
