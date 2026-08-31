import * as THREE from "three";
import { MOB_CATALOG, MobsStage, type MobDefinition } from "./mobs-stage";
import type { MobPoseControl } from "./mob-pose-overlay";
import type { ReviewAction, ReviewActionSemantic, ReviewActorAdapter } from "./combat-review-types";

export interface MobReviewActor extends ReviewActorAdapter {
  readonly definition: MobDefinition;
  readonly checksumVerified: boolean;
  readonly controls: readonly MobPoseControl[];
  setControl(id: string, value: number): void;
  calibration(): ReturnType<MobsStage["draft"]>;
  importCalibration(value: unknown): void;
  clearCalibration(): void;
  snapshot(): ReturnType<MobsStage["snapshot"]>;
  socketWorld(name: string, target: THREE.Vector3): boolean;
}

function semantic(name: string): ReviewActionSemantic {
  if (/Death/i.test(name)) return "death";
  if (/Hit|React/i.test(name)) return "reaction";
  if (/Idle/i.test(name)) return "idle";
  if (/Walk/i.test(name)) return "walk";
  if (/Run/i.test(name)) return "run";
  if (/Spit|PalmFire|AshCall/i.test(name)) return "cast";
  if (/Attack|Sweep|Whip|Slash/i.test(name)) return "attack";
  return "interaction";
}

/**
 * Reuse the solo stage's exact pinned loader, game rig, scale, first-pose floor
 * reference and per-action calibration. A pair gets two independent stages,
 * not duplicated animation/skin implementations or a second set of UI panels.
 * The combat clock calls sample; inherited runtime damage/VFX timers never run.
 */
export async function createMobReviewActor(options: {
  instanceId: string;
  definitionId: string;
  signal?: AbortSignal;
}): Promise<MobReviewActor> {
  if (!options.instanceId.trim()) throw new Error("A review actor requires a unique instance ID");
  const definition = MOB_CATALOG.find((entry) => entry.id === options.definitionId);
  if (!definition) throw new Error(`Unknown review creature: ${options.definitionId}`);
  if (options.signal?.aborted) throw new DOMException("Creature loading cancelled", "AbortError");
  const root = new THREE.Scene();
  root.name = options.instanceId;
  const stage = new MobsStage(root);
  const cancel = () => stage.dispose();
  options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    if (!await stage.select(definition.id) || options.signal?.aborted) throw new DOMException("Creature loading cancelled", "AbortError");
  } catch (error) {
    stage.dispose();
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", cancel);
  }
  stage.setPlaying(false);
  stage.setPlayback(1, false);
  const model = stage.actor()!.model;
  const initialAction = stage.snapshot()!.currentClip;
  let disposed = false;
  const actions: ReviewAction[] = [];
  try {
    for (const name of stage.actions()) {
      stage.setAction(name);
      actions.push(Object.freeze({ id: name, label: stage.actionLabel(name), clipName: name,
        durationSeconds: stage.snapshot()!.durationSeconds, semantic: semantic(name),
        approvalStatus: definition.reviewedMotion?.actions.includes(name) ? "continuous-reviewed"
          : definition.reviewedMotion?.neutralHolds.includes(name) ? "pose-approved" : "source",
        rootPolicy: "authored-displacement", facing: "locked" }));
    }
    stage.setAction(initialAction);
  } catch (error) {
    stage.dispose();
    throw error;
  }
  Object.freeze(actions);
  const assertLive = () => { if (disposed) throw new Error("Creature review actor has been disposed"); };
  function sample(actionId: string, timeSeconds: number): void {
    assertLive();
    const action = actions.find((entry) => entry.id === actionId);
    if (!action) throw new Error(`This creature does not provide ${actionId}`);
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) throw new Error("Creature sample time must be finite and nonnegative");
    if (stage.snapshot()?.currentClip !== actionId) stage.setAction(actionId);
    stage.pose(Math.min(timeSeconds / action.durationSeconds, 1));
    root.updateWorldMatrix(true, true);
    root.updateMatrixWorld(true);
  }
  return {
    instanceId: options.instanceId, definitionId: definition.id, definition, root, model,
    checksumVerified: stage.checksumVerified, controls: stage.overlay!.controls,
    actions: () => actions,
    sample,
    reset() { assertLive(); sample(stage.snapshot()!.currentClip, 0); },
    setControl(id, value) { assertLive(); stage.setControl(id, value); },
    calibration() { assertLive(); return stage.draft(); },
    importCalibration(value) { assertLive(); stage.importDraft(value); },
    clearCalibration() { assertLive(); stage.resetPose(); },
    snapshot: () => stage.snapshot(),
    socketWorld(name, target) {
      assertLive();
      const socket = model.getObjectByName(name);
      if (!socket) return false;
      root.updateWorldMatrix(true, true);
      socket.getWorldPosition(target);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stage.dispose();
      root.removeFromParent();
      root.clear();
    },
  };
}
