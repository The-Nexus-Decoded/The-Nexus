import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MOB_CATALOG, MobsStage, type MobDefinition, type MobReactionClipLoader,
  type MobReactionPackStatus } from "./mobs-stage";
import type { MobPoseControl } from "./mob-pose-overlay";
import type { ReviewAction, ReviewActionSemantic, ReviewActorAdapter, ReviewActorFamily } from "./combat-review-types";
import { REACTION_CONTRACT_CLIPS, reactionArchetypeForFamily, type ReactionArchetype } from "./reaction-contract";
import { loadReactionPacksForFamily, reactionPackClips, type ReactionPackParser } from "./reaction-pack-loader";
import { configureReviewAssetLoader } from "./review-asset-loader";

export interface MobReviewActor extends ReviewActorAdapter {
  readonly definition: MobDefinition;
  readonly checksumVerified: boolean;
  /** Which actions came from this body's archetype reaction pack, or why none did. */
  readonly reactionPack: MobReactionPackStatus;
  readonly controls: readonly MobPoseControl[];
  setControl(id: string, value: number): void;
  calibration(): ReturnType<MobsStage["draft"]>;
  importCalibration(value: unknown): void;
  clearCalibration(): void;
  snapshot(): ReturnType<MobsStage["snapshot"]>;
  socketWorld(name: string, target: THREE.Vector3): boolean;
}

/** Contract reaction clip names, matched exactly rather than by regex. */
const CONTRACT_REACTION_CLIPS = new Set<string>(REACTION_CONTRACT_CLIPS);

/**
 * One reaction-pack fetch per archetype for a whole review session.
 *
 * The packs are 15-22 MB each, both slots of a spar can carry the same archetype,
 * and every actor reload would otherwise re-download the same pinned bytes. This
 * mirrors the human factory, which fetches its pack once per factory and lets each
 * actor install its own clip references. A rejected load is not cached, so a
 * transient failure can be retried.
 *
 * `signal` fails a caller fast; it deliberately does NOT cancel the shared fetch,
 * because one actor being replaced must not tear the pack out from under the other
 * slot. Each caller re-checks its own signal after awaiting.
 */
export function createMobReactionClipLoader(options: { parser?: ReactionPackParser } = {}): MobReactionClipLoader {
  const parser = options.parser ?? configureReviewAssetLoader(new GLTFLoader());
  const cache = new Map<ReactionArchetype, Promise<readonly THREE.AnimationClip[]>>();
  return (family: ReviewActorFamily, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    const archetype = reactionArchetypeForFamily(family);
    let pending = cache.get(archetype);
    if (!pending) {
      const load = loadReactionPacksForFamily(family, { parser }).then(reactionPackClips);
      load.catch(() => { if (cache.get(archetype) === load) cache.delete(archetype); });
      cache.set(archetype, load);
      pending = load;
    }
    return pending;
  };
}

function semantic(name: string): ReviewActionSemantic {
  // A pack clip is a reaction BY CONTRACT, not by regex - the same rule the human actor
  // uses. None of the nine contract names (PoisonImpact/Loop/Recover, BurnFlare/Burn/Recover,
  // Knockdown, ProneHold, GetUp) match any pattern below, so every one of them used to fall
  // through to "interaction". combat-review-controller only reads a reaction's duration from
  // an action whose semantic is "reaction", so an archetype set would silently lose to the
  // flinch picker even once its clips are installed.
  if (CONTRACT_REACTION_CLIPS.has(name)) return "reaction";
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
  /**
   * Opt-in, exactly like the human factory's `includeReactionPack`: omit it and this
   * actor is the actor it has always been, with no contract reaction clip anywhere
   * in its action list.
   */
  loadReactionClips?: MobReactionClipLoader;
}): Promise<MobReviewActor> {
  if (!options.instanceId.trim()) throw new Error("A review actor requires a unique instance ID");
  const definition = MOB_CATALOG.find((entry) => entry.id === options.definitionId);
  if (!definition) throw new Error(`Unknown review creature: ${options.definitionId}`);
  if (options.signal?.aborted) throw new DOMException("Creature loading cancelled", "AbortError");
  const root = new THREE.Scene();
  root.name = options.instanceId;
  const stage = new MobsStage(root, { loadReactionClips: options.loadReactionClips });
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
      // A pack clip is authored, pinned and verified for integrity, but it is not one
      // of this body's own source motions and no owner has signed its motion off:
      // "draft", the same status the human actor gives its installed pack.
      const fromPack = stage.reactionPack.installed.includes(name);
      actions.push(Object.freeze({ id: name, label: stage.actionLabel(name), clipName: name,
        durationSeconds: stage.snapshot()!.durationSeconds, semantic: semantic(name),
        approvalStatus: fromPack ? "draft"
          : definition.reviewedMotion?.actions.includes(name) ? "continuous-reviewed"
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
    checksumVerified: stage.checksumVerified, reactionPack: stage.reactionPack, controls: stage.overlay!.controls,
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
