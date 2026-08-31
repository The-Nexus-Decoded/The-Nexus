import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MOB_CATALOG, MobsStage } from "./mobs-stage";

function element<T extends HTMLElement>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Motion Studio control is missing: ${selector}`);
  return value;
}

/** The human lab and this panel share a viewport and playback toolbar. */
export class MobsPanel {
  readonly stage: MobsStage;
  active = false;
  private playing = true;
  private revision = 0;
  private lastStatusTime = 0;
  private focusBone: string | null = null;
  private followTarget: THREE.Vector3 | null = null;
  private contact = "";
  private controlError = "";
  private selected = element<HTMLSelectElement>("#mobModel");
  private action = element<HTMLSelectElement>("#action");
  private timeline = element<HTMLInputElement>("#time");
  private speed = element<HTMLInputElement>("#speed");
  private loop = element<HTMLInputElement>("#loop");
  private play = element<HTMLButtonElement>("#play");
  private tuning = element<HTMLElement>("#mobTuning");
  private status = element<HTMLElement>("#status");
  private context = element<HTMLElement>("#mobContext");
  private controlsAbort = new AbortController();

  constructor(scene: THREE.Scene, private camera: THREE.PerspectiveCamera, private orbit: OrbitControls) {
    this.stage = new MobsStage(scene);
    for (const family of ["breachling", "warden"] as const) {
      const group = document.createElement("optgroup");
      group.label = family === "breachling" ? "Breachlings · quadrupeds" : "Wardens · bosses";
      for (const definition of MOB_CATALOG.filter((entry) => entry.family === family)) {
        group.append(new Option(`${definition.label} · ${definition.targetHeightMeters} m`, definition.id));
      }
      this.selected.append(group);
    }
    // Capture only the shared controls in Mobs mode. Human listeners and
    // calibrations remain untouched; no hidden human control receives a mob edit.
    const panel = element<HTMLElement>(".panel");
    for (const type of ["click", "input", "change"]) {
      panel.addEventListener(type, (event) => this.handle(event), { capture: true, signal: this.controlsAbort.signal });
    }
  }

  async enter() {
    this.active = true;
    await this.loadSelected();
  }
  leave() {
    this.active = false;
    this.revision += 1;
    this.stage.clear();
    this.followTarget = null;
  }
  private async loadSelected() {
    const revision = ++this.revision;
    this.action.disabled = true;
    this.action.replaceChildren(new Option("Loading animations…", ""));
    element<HTMLElement>("#studioSelectionSummary").textContent = "Loading selected creature…";
    this.tuning.replaceChildren();
    this.contact = "";
    this.controlError = "";
    this.context.textContent = "Loading the actual dungeon rig and its embedded animations…";
    this.status.textContent = "Loading selected mob…";
    try {
      const ready = await this.stage.select(this.selected.value);
      if (!ready || revision !== this.revision || !this.active) return;
      this.action.replaceChildren(...this.stage.actions().map((name) => new Option(this.stage.actionLabel(name), name)));
      this.action.value = this.stage.snapshot()!.currentClip;
      this.action.disabled = false;
      this.stage.setPlayback(Number(this.speed.value), this.loop.checked);
      this.setPlaying(this.playing);
      this.stage.showSkeleton(element<HTMLInputElement>("#mobSkeleton").checked);
      this.buildControls();
      this.view("full");
      this.refreshStatus();
    } catch (error) {
      if (revision !== this.revision || !this.active) return;
      this.context.textContent = "Model unavailable. Choose another model or retry this selection.";
      this.status.textContent = `LOAD ERROR\n${String(error)}`;
      console.error(error);
    }
  }

  private buildControls() {
    this.tuning.replaceChildren();
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = "Draft offsets for this model + action. Local joint angles in degrees; source animation is unchanged. Reset returns to the original pose.";
    this.tuning.append(note);
    const groups = new Map<string, HTMLDetailsElement>();
    for (const definition of this.stage.overlay?.controls ?? []) {
      let group = groups.get(definition.group);
      if (!group) {
        group = document.createElement("details");
        group.className = "tuning-group";
        group.open = groups.size < 2;
        const summary = document.createElement("summary");
        summary.textContent = definition.group;
        group.append(summary);
        groups.set(definition.group, group);
        this.tuning.append(group);
      }
      const row = document.createElement("label");
      const title = document.createElement("span");
      title.textContent = definition.label;
      const input = document.createElement("input");
      input.type = "range";
      input.id = `mobPose-${definition.id}`;
      input.dataset.mobControl = definition.id;
      input.dataset.mobBone = definition.bone;
      input.min = String(definition.min); input.max = String(definition.max); input.step = String(definition.step);
      input.value = String(this.stage.overlay?.values()[definition.id] ?? 0);
      const output = document.createElement("output");
      output.htmlFor = input.id;
      output.textContent = `${input.value}°`;
      row.append(title, input, output);
      group.append(row);
    }
  }

  private handle(event: Event) {
    if (!this.active) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.id;
    const valueControl = target instanceof HTMLInputElement ? target : null;
    const isShared = ["action", "time", "speed", "loop", "play", "restart", "fullView", "actionView", "handView", "backView"].includes(id);
    const isMob = id.startsWith("mob") && id !== "mobTuning" && id !== "mobTools";
    if (!isShared && !isMob) return;
    event.stopImmediatePropagation();
    try {
      this.controlError = "";
      if (id === "mobModel" && event.type === "change") { void this.loadSelected(); return; }
      if (!this.stage.ready) return;
      if (event.type === "input" && valueControl?.dataset.mobControl) {
        this.stage.setControl(valueControl.dataset.mobControl, Number(valueControl.value));
        const output = valueControl.parentElement?.querySelector("output");
        if (output) output.textContent = `${Number(valueControl.value).toFixed(0)}°`;
        this.focusBone = valueControl.dataset.mobBone ?? null;
      } else if (event.type === "input" && id === "time") {
        this.setPlaying(false); this.stage.pose(Number(this.timeline.value));
      } else if ((event.type === "input" && id === "speed") || (event.type === "change" && id === "loop")) {
        this.stage.setPlayback(Number(this.speed.value), this.loop.checked);
      } else if (event.type === "change" && id === "action") {
        this.stage.setAction(this.action.value); this.buildControls(); this.contact = "";
      } else if (event.type === "change" && id === "mobSkeleton") {
        this.stage.showSkeleton(Boolean(valueControl?.checked));
      } else if (event.type === "change" && id === "mobImportFile") {
        const file = valueControl?.files?.[0];
        if (file) void this.readDraft(file);
      } else if (event.type === "click") {
        if (id === "play") this.setPlaying(Boolean(this.stage.snapshot()?.paused));
        if (id === "restart") this.stage.restart();
        if (id === "fullView") this.view("full");
        if (id === "backView") this.view("back");
        if (id === "actionView") this.view("side");
        if (id === "handView") this.view("joint");
        if (id === "mobReset") { this.stage.resetPose(); this.buildControls(); }
        if (id === "mobExport") this.exportDraft();
        if (id === "mobImport") element<HTMLInputElement>("#mobImportFile").click();
        if (id === "mobMeasure") this.contact = JSON.stringify(this.stage.measureContact(), null, 2);
      }
      this.refreshStatus();
    } catch (error) { this.controlError = `CONTROL ERROR: ${String(error)}`; this.refreshStatus(); }
  }

  setPlaying(playing: boolean) {
    const snapshot = this.stage.snapshot();
    if (playing && snapshot?.paused && snapshot.normalizedTime >= 0.999) this.stage.restart();
    this.playing = playing;
    this.stage.setPlaying(playing);
    this.play.textContent = playing ? "Pause" : "Play";
    this.play.classList.toggle("active", playing);
  }
  private exportDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.stage.draft(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.selected.value}-${this.action.value}-pose-draft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private async readDraft(file: File) {
    const revision = this.revision;
    try {
      if (file.size > 100_000) throw new Error("Pose draft exceeds the 100 kB limit.");
      const data: unknown = JSON.parse(await file.text());
      if (revision !== this.revision || !this.active) return;
      this.stage.importDraft(data); this.buildControls(); this.refreshStatus();
    } catch (error) {
      if (this.active) { this.controlError = `DRAFT ERROR: ${String(error)}`; this.refreshStatus(); }
    }
    finally { element<HTMLInputElement>("#mobImportFile").value = ""; }
  }
  view(mode: "full" | "back" | "side" | "joint") {
    const bounds = this.stage.bounds();
    if (!bounds) return;
    const target = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const panel = element<HTMLElement>(".panel");
    const rect = panel.getBoundingClientRect();
    const bottomSheet = innerWidth <= 700 && innerHeight > innerWidth;
    const usableWidth = panel.hidden || bottomSheet ? innerWidth : Math.max(1, rect.left);
    const usableHeight = panel.hidden || !bottomSheet ? innerHeight : Math.max(1, rect.top);
    const fit = Math.max(1, innerHeight / usableHeight, innerHeight / (usableWidth * 1.35));
    const distance = Math.max(size.x, size.y, size.z, 1) * 1.55 * fit * (bottomSheet ? 1.15 : 1);
    let offset = new THREE.Vector3(distance * 0.65, distance * 0.28, distance);
    if (mode === "back") offset.z *= -1;
    if (mode === "side") offset.set(distance, distance * 0.08, 0.2);
    if (mode === "joint") {
      const model = this.stage.actor()?.model;
      const boneName = this.focusBone ?? this.stage.overlay?.controls[0]?.bone;
      const bone = boneName ? model?.getObjectByName(boneName) : null;
      if (bone) target.copy(bone.getWorldPosition(new THREE.Vector3()));
      offset.set(0.9, 0.3, 0.9).multiplyScalar(Math.max(1, size.y * 0.35));
    }
    this.orbit.target.copy(target);
    this.camera.position.copy(target).add(offset);
    this.camera.fov = 42; this.camera.far = 100; this.camera.updateProjectionMatrix();
    this.orbit.update();
    this.followTarget = this.stage.actor()?.root.getWorldPosition(new THREE.Vector3()) ?? null;
  }
  private refreshStatus() {
    const snapshot = this.stage.snapshot();
    if (!snapshot || !this.stage.definition) return;
    this.play.textContent = snapshot.paused ? "Play" : "Pause";
    this.play.classList.toggle("active", !snapshot.paused);
    this.timeline.value = String(snapshot.normalizedTime);
    element<HTMLOutputElement>("#timeOut").textContent = snapshot.normalizedTime.toFixed(3);
    element<HTMLOutputElement>("#speedOut").textContent = `${Number(this.speed.value).toFixed(1)}x`;
    const family = this.stage.definition.family;
    this.context.textContent = family === "breachling"
      ? "Quadruped rig · paws, forelimbs, hindlimbs, jaw and tail. No individual finger/claw bones. Known source motion/contact defects remain visible."
      : "Warden rig · arm, forearm/blade, weighted left hand and body. Right hand has no skin weights; tune the blade forearm instead. Existing boss motion remains under review.";
    this.status.textContent = [
      `${this.stage.definition.label} · shared #458 game controller`,
      `${snapshot.currentClip} · ${snapshot.timeSeconds.toFixed(2)} / ${snapshot.durationSeconds.toFixed(2)} s`,
      `${snapshot.paused ? "Paused / terminal hold" : "Playing"} · ${snapshot.playbackSpeed.toFixed(1)}× · ${this.loop.checked ? "repeat" : "one shot"}`,
      "Locomotion: in-place inspection; this is not AI/path-following gameplay.",
      `${this.stage.overlay?.controls.length ?? 0} real-joint controls · draft offsets only`,
      `Asset ${this.stage.definition.sha256.slice(0, 12)} · ${this.stage.checksumVerified ? "served SHA-256 verified" : "size checked; SHA-256 unavailable on insecure HTTP"}`,
      "Cached grounding is not a contact certificate. Measure contact samples the current mesh only.",
      this.contact,
      this.controlError,
    ].filter(Boolean).join("\n");
    const summary = document.querySelector("#studioSelectionSummary");
    if (summary) summary.textContent = `${this.stage.definition.label} / ${this.stage.actionLabel(snapshot.currentClip)}`;
  }
  update(delta: number) {
    if (!this.active) return;
    this.stage.update(delta);
    const root = this.stage.actor()?.root;
    if (root && this.followTarget) {
      const position = root.getWorldPosition(new THREE.Vector3());
      const deltaPosition = position.clone().sub(this.followTarget);
      this.camera.position.add(deltaPosition); this.orbit.target.add(deltaPosition); this.followTarget.copy(position);
    }
    if (performance.now() - this.lastStatusTime > 100) {
      this.lastStatusTime = performance.now(); this.refreshStatus();
    }
  }
  dispose() { this.controlsAbort.abort(); this.stage.dispose(); }
}
