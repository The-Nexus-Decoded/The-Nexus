import * as THREE from "three";
import { LOADOUTS } from "./human-review-catalog.js";
import { MOB_CATALOG } from "./mobs-stage.ts";
import { createMobReviewActor } from "./mob-review-actor.ts";
import { CombatReviewController } from "./combat-review-controller.ts";
import { CombatReviewPanel } from "./combat-review-panel.ts";
import { ReviewContactSurface } from "./combat-review-contact.ts";
import { measureReviewMotionBounds } from "./combat-review-posing.ts";
import { sampleReviewSequence } from "./combat-review-timeline.ts";

export const COMBAT_REVIEW_DEFINITIONS = Object.freeze([
  ...Object.entries(LOADOUTS).map(([id, loadout]) => Object.freeze({ id: `human:${id}`, family: "human",
    label: `Human · ${loadout.label}`, note: "Full Human Foundation rig · equipment review binding. Source clips and drafts are labeled individually." })),
  ...MOB_CATALOG.map((definition) => Object.freeze({ id: definition.id, family: definition.family, label: definition.label,
    note: definition.reviewedMotion ? "Revised five attacks + approved neutral holds. Other motions remain source; spit projectile pending."
      : "Original source creature · motions not revised. Visible source rig defects remain under review." })),
]);

function humanCalibration(actor) {
  function controls() {
    if (!actor.primary) return [];
    const state = actor.getCalibration(), entries = [];
    const row = (id, label, group, min, max, step, value) => entries.push({ id, label, group, min, max, step, value });
    for (const [part, label] of [["grip", "Right hand"], ["leftGrip", "Left hand"]]) {
      if (part === "leftGrip" && !actor.sockets.some((socket) => socket.role === "offhand" || socket.asset === "bow")
        && !actor.reviewTools.twoHandIKAllowed()) continue;
      for (const name of ["Index", "Middle", "Ring", "Pinky", "thumb"]) row(`${part}.${name}`, name, label, -1.2, 1.2, 0.025, state[part][name]);
    }
    if (state.socket) for (const name of ["x", "y", "z", "rx", "ry", "rz", "scale"]) {
      const scale = name === "scale", rotation = name.startsWith("r");
      row(`socket.${name}`, name.toUpperCase(), "Weapon attachment", scale ? 0.6 : rotation ? -Math.PI : -0.2,
        scale ? 1.4 : rotation ? Math.PI : 0.2, scale ? 0.01 : 0.002, state.socket[name]);
    }
    if (actor.reviewTools.twoHandIKAllowed()) {
      row("twoHandLock.enabled", "IK enabled", "Support hand", 0, 1, 1, Number(state.twoHandLock.enabled));
      for (const [part, label, bound] of [["target", "Target", 0.5], ["wrist", "Wrist", Math.PI]]) {
        state.twoHandLock[part].forEach((value, index) => row(`twoHandLock.${part}.${index}`, `${label} ${"XYZ"[index]}`,
          "Support hand", -bound, bound, 0.002, value));
      }
    }
    return entries;
  }
  return { controls, set(id, value) {
    const state = actor.getCalibration(), [part, key, index] = id.split(".");
    if (part === "twoHandLock") {
      if (key === "enabled") state.twoHandLock.enabled = Boolean(value);
      else state.twoHandLock[key][Number(index)] = value;
    } else state[part][key] = value;
    actor.setCalibration(state);
  }, reset() {
    actor.clearActionCalibration(); actor.setCalibration(actor.getCalibration(), { remember: false });
  } };
}

/** Reuse the caller's immutable human cache; only returned actor instances are owned here. */
export function createCombatReviewActorLoader(humanFactory, mobLoader = createMobReviewActor) {
  return async ({ definition, instanceId, signal }) => {
    if (signal.aborted) throw new DOMException("Actor loading cancelled", "AbortError");
    if (definition.family === "human") {
      const loadoutId = definition.id.slice("human:".length);
      if (!LOADOUTS[loadoutId]) throw new Error("Unknown human review binding.");
      const actor = await humanFactory.create({ instanceId, loadoutId, mode: "equipment" });
      if (signal.aborted) { actor.dispose(); throw new DOMException("Actor loading cancelled", "AbortError"); }
      return { actor, calibration: humanCalibration(actor),
        settleConstraints: () => actor.reviewTools.applyTwoHandIK(actor) };
    }
    const actor = await mobLoader({ instanceId, definitionId: definition.id, signal });
    return { actor, calibration: {
      controls: () => actor.controls.map((control) => ({ ...control, value: actor.calibration().controls[control.id] ?? 0 })),
      set: (id, value) => actor.setControl(id, value), reset: () => actor.clearCalibration(),
    } };
  };
}

/** Existing studio composition only: no asset normalization, animation authoring or combat damage. */
export function createCombatReviewStudio({ scene, camera, orbit, humanFactory, host, document: doc = document,
  viewport = () => ({ width: innerWidth, height: innerHeight, usableWidth: innerWidth, usableHeight: innerHeight }),
  onSnapshot = () => {}, onError = () => {},
  loadActor = createCombatReviewActorLoader(humanFactory),
  panelFactory = (controller, options) => new CombatReviewPanel(controller, options),
}) {
  const actorConstraints = new WeakMap();
  const controller = new CombatReviewController({ definitions: COMBAT_REVIEW_DEFINITIONS, loadActor: async (request) => {
    const handle = await loadActor(request);
    if (handle.settleConstraints) actorConstraints.set(handle.actor, handle.settleConstraints);
    return handle;
  },
    initial: { a: "human:longswordTwoHand", b: "breachling-base" } });
  scene.add(controller.root);
  let measurement = null, disposed = false, loadedIdentity = "";
  function fitBounds(bounds) {
    if (bounds.isEmpty()) return false;
    const center = bounds.getCenter(new THREE.Vector3()), radius = Math.max(0.25, bounds.getSize(new THREE.Vector3()).length() / 2);
    const area = viewport();
    const vertical = Math.tan(THREE.MathUtils.degToRad(44) / 2);
    const usableTan = Math.max(0.04, Math.min(vertical * area.usableHeight / area.height,
      vertical * camera.aspect * area.usableWidth / area.width));
    const distance = radius / Math.sin(Math.atan(usableTan)) * 1.08;
    orbit.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(1.25, 0.48, 1.8).normalize().multiplyScalar(distance));
    camera.fov = 44; camera.far = Math.max(40, distance + radius * 4);
    orbit.maxDistance = Math.max(14, distance * 2); camera.updateProjectionMatrix(); orbit.update();
    return true;
  }
  function frameActors() {
    if (disposed || !controller.snapshot().active) return false;
    const surface = new ReviewContactSurface(controller.root);
    try { surface.update(); return fitBounds(surface.bounds()); } finally { surface.dispose(); }
  }
  async function frameMotion() {
    measurement?.abort.abort();
    const before = controller.snapshot(); if (!before.ready || !before.active) return false;
    controller.setPlaying(false);
    const sequence = controller.sequence();
    const job = { abort: new AbortController(), revision: before.revision, time: before.frame.timeSeconds };
    measurement = job;
    const count = Math.max(24, Math.min(96, Math.ceil(sequence.durationSeconds * 12)));
    const times = new Set(Array.from({ length: count + 1 }, (_, index) => sequence.durationSeconds * index / count));
    for (const track of sequence.tracks) { times.add(track.startSeconds); times.add(track.startSeconds + track.durationSeconds); }
    const frames = [...times].sort((a, b) => a - b).map((time) => sampleReviewSequence(sequence, time));
    const bounds = new THREE.Box3();
    try {
      for (const slot of ["a", "b"]) {
        const actor = controller.actor(slot);
        const poses = frames.map((frame) => frame.actors.find((entry) => entry.actorId === actor.instanceId).poses);
        bounds.union(await measureReviewMotionBounds(actor, poses, { signal: job.abort.signal,
          settleConstraints: actorConstraints.get(actor) }));
      }
      if (measurement !== job || job.abort.signal.aborted) return false;
      return fitBounds(bounds);
    } catch (error) {
      if (!job.abort.signal.aborted) onError(error);
      return false;
    } finally {
      if (measurement === job) {
        measurement = null;
        const current = controller.snapshot();
        if (!disposed && current.ready && current.active) {
          controller.seek(current.frame.timeSeconds);
          if (current.frame.playing) controller.setPlaying(true);
        }
      }
    }
  }
  const panel = panelFactory(controller, { document: doc, onFrameActors: frameActors, onFrameAction: () => { void frameMotion(); } });
  host.append(panel.element);
  const unsubscribe = controller.subscribe((snapshot) => {
    if (measurement && (snapshot.revision !== measurement.revision || snapshot.frame?.timeSeconds !== measurement.time
      || snapshot.frame?.playing)) measurement.abort.abort();
    if (!snapshot.active) return;
    const identity = ["a", "b"].map((slot) => controller.actor(slot)?.instanceId ?? "").join("/");
    if (snapshot.ready && identity !== loadedIdentity) { loadedIdentity = identity; frameActors(); }
    onSnapshot(snapshot);
  });
  return {
    controller, panel, frameActors, frameMotion,
    get active() { return controller.snapshot().active; },
    enter: () => controller.enter(),
    leave() { measurement?.abort.abort(); loadedIdentity = ""; controller.leave(); },
    update(delta) {
      // Bounds sampling yields periodically. Restore the clock pose before a
      // render so intermediate survey poses never flicker in the live scene.
      if (measurement && !measurement.abort.signal.aborted) {
        const snapshot = controller.snapshot();
        if (snapshot.ready) controller.seek(snapshot.frame.timeSeconds);
      } else controller.advance(delta);
    },
    setPlaying(value) { controller.setPlaying(value); },
    dispose() {
      if (disposed) return;
      disposed = true; measurement?.abort.abort(); unsubscribe(); panel.dispose(); controller.dispose();
    },
  };
}
