import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BREACHLING_RUNTIME_ASSETS, breachlingActionNames, createBreachV2BreachlingRuntime,
  type BreachlingTier, type BreachlingRuntimeSnapshot,
} from "../../game/dungeons/breach-v2-breachlings";
import {
  CINDERBOUND_WARDEN_ASSETS, createBreachV2WardenRuntime,
  type CinderboundWardenKind, type CinderboundWardenSnapshot,
} from "../../game/dungeons/breach-v2-wardens";
import { buildBreachV2Layout } from "../../game/dungeons/breach-v2-layout";
import type { BreachV2AnimationReviewActor, BreachV2AnimationReviewPlayback, BreachV2AnimationReviewPoseHooks } from "../../game/dungeons/breach-v2-animation-review";
import { createMobPoseOverlay } from "./mob-pose-overlay";
import { configureReviewAssetLoader, fetchPinnedReviewAsset } from "./review-asset-loader";
import { REVIEWED_MOB_RECEIPTS, type ReviewedMobReceipt } from "./reviewed-mob-receipt";

export interface MobDefinition {
  id: string;
  family: "breachling" | "warden";
  variant: BreachlingTier | CinderboundWardenKind;
  label: string;
  /** Canonical request emitted by the shared dungeon controller. */
  runtimeUrl: string;
  /** Bytes fetched only by this isolated review stage. */
  url: string;
  targetHeightMeters: number;
  sha256: string;
  bytes: number;
  reviewedMotion?: ReviewedMobReceipt;
}

// Original dungeon receipts remain intact; an explicit lab intake may replace
// only its explicitly keyed review entry, without mutating the runtime catalog.
const BREACHLING_RECEIPTS = {
  base: [6429716, "00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7"],
  stalker: [5974384, "1f61df8716b60dd376959dbff1295c708f770d3601cf9781263d1996f808a641"],
  oathbound: [6340124, "077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939"],
  ravager: [5759384, "cd8fa4f5daf6f789e80322fad2ed7df15cb7b6dcea0dec19c0d869478f08e22c"],
} as const;
const WARDEN_RECEIPTS = {
  wayfarer: [19992260, "6653370bbd3f057dce8602de257cdcc60163fd012589bb76ed5983d1d03ca387"],
  oathbreaker: [18296196, "244cefb9e478c8ce561722e479a2cafce9fb5c91c4ee42477c893ee8f91a5a3d"],
} as const;
export const MOB_CATALOG: readonly MobDefinition[] = Object.freeze([
  ...(Object.keys(BREACHLING_RECEIPTS) as BreachlingTier[]).map((variant) => {
    const reviewed = REVIEWED_MOB_RECEIPTS[variant];
    if (reviewed && reviewed.runtimeSourceSha256 !== BREACHLING_RECEIPTS[variant][1]) {
      throw new Error(`Reviewed ${variant} receipt has the wrong dungeon-source lineage.`);
    }
    return Object.freeze({
      id: `breachling-${variant}`, family: "breachling" as const, variant,
      ...BREACHLING_RUNTIME_ASSETS[variant], bytes: BREACHLING_RECEIPTS[variant][0], sha256: BREACHLING_RECEIPTS[variant][1],
      runtimeUrl: BREACHLING_RUNTIME_ASSETS[variant].url,
      ...(reviewed ? {
        label: `${BREACHLING_RUNTIME_ASSETS[variant].label} · revised ${reviewed.actions.length && reviewed.actions.every((name) => /Attack|Whip/.test(name)) ? "attacks" : "motions"}`,
        url: reviewed.url, bytes: reviewed.bytes, sha256: reviewed.sha256, reviewedMotion: reviewed,
      } : {}),
    });
  }),
  ...(Object.keys(WARDEN_RECEIPTS) as CinderboundWardenKind[]).map((variant) => Object.freeze({
    id: `warden-${variant}`, family: "warden" as const, variant,
    ...CINDERBOUND_WARDEN_ASSETS[variant], bytes: WARDEN_RECEIPTS[variant][0], sha256: WARDEN_RECEIPTS[variant][1],
    runtimeUrl: CINDERBOUND_WARDEN_ASSETS[variant].url,
  })),
]);

type Snapshot = BreachlingRuntimeSnapshot | CinderboundWardenSnapshot;
interface RuntimeAdapter {
  warmAt(x: number, z: number): Promise<void>;
  update(x: number, z: number, dt: number): void;
  snapshot(): Snapshot | undefined;
  actor(): BreachV2AnimationReviewActor | null;
  play(name: string): number;
  pose(name: string, time: number): void;
  pause(paused: boolean): void;
  playback(value: BreachV2AnimationReviewPlayback): void;
  hooks(value: BreachV2AnimationReviewPoseHooks | null): void;
  dispose(): void;
}

export function mobCalibrationKey(definition: MobDefinition, clip: string): string {
  return `${definition.family}/${definition.id}/${definition.sha256}/${clip}/unarmed-articulation-v1`;
}

class PinnedMobLoader extends GLTFLoader {
  checksumVerified = false;
  constructor(private definition: MobDefinition, private signal: AbortSignal) {
    super();
    configureReviewAssetLoader(this);
  }
  override async loadAsync(url: string) {
    if (url !== this.definition.runtimeUrl) throw new Error(`Unexpected mob asset: ${url}`);
    const reviewed = this.definition.reviewedMotion;
    if (reviewed) {
      const variant = this.definition.variant as BreachlingTier;
      const approved = REVIEWED_MOB_RECEIPTS[variant];
      if (this.definition.family !== "breachling" || this.definition.id !== `breachling-${variant}`
        || reviewed !== approved || reviewed.variant !== variant || url !== BREACHLING_RUNTIME_ASSETS[variant]?.url
        || this.definition.url !== reviewed.url || this.definition.bytes !== reviewed.bytes || this.definition.sha256 !== reviewed.sha256) {
        throw new Error("Unapproved review-only mob asset override.");
      }
    }
    if (!reviewed && this.definition.url !== url) throw new Error("Mob asset override requires a reviewed intake receipt.");
    if (reviewed && !globalThis.crypto?.subtle) {
      throw new Error("Revised mob animations require SHA-256 verification. Open Motion Studio in a secure context.");
    }
    const verified = await fetchPinnedReviewAsset(this.definition, { signal: this.signal, requireChecksum: !!reviewed });
    this.checksumVerified = verified.checksumVerified;
    return this.parseAsync(verified.bytes, verified.resourcePath);
  }
}

export class MobsStage {
  definition: MobDefinition | null = null;
  overlay: ReturnType<typeof createMobPoseOverlay> | null = null;
  ready = false;
  checksumVerified = false;
  private runtime: RuntimeAdapter | null = null;
  private stageRoot: THREE.Scene | null = null;
  private abort: AbortController | null = null;
  private skeleton: THREE.SkeletonHelper | null = null;
  private revision = 0;
  private drafts = new Map<string, Record<string, number>>();
  private speed = 0.6;
  private loop = true;
  private playing = true;

  constructor(private scene: THREE.Scene) {}

  async select(id: string): Promise<boolean> {
    const definition = MOB_CATALOG.find((entry) => entry.id === id);
    if (!definition) throw new Error(`Unknown mob: ${id}`);
    this.clear();
    const revision = this.revision;
    this.definition = definition;
    const stageRoot = new THREE.Scene();
    stageRoot.name = "Motion Studio — shared dungeon actor";
    this.scene.add(stageRoot);
    this.stageRoot = stageRoot;
    this.abort = new AbortController();
    const loader = new PinnedMobLoader(definition, this.abort.signal);
    // Typed canonical layout supplies the runtime contract; only an explicit
    // review placement is active. No dungeon geometry, gameplay, or AI is run.
    const source = buildBreachV2Layout(4182, "wayfarer");
    const room = source.rooms[0]!;
    const layout = {
      ...source,
      rooms: [{ ...room, id: "motion-studio", x: -20, z: -20, w: 40, h: 40, floorElevation: 0, endElevation: 0 }],
      placements: [], enemies: [],
      boss: { ...source.boss, x: 0, z: 0, elevation: 0 },
    };
    const placement = { id: `studio:${id}`, roomId: "motion-studio", x: 0, z: 0, floorElevation: 0, yaw: 0 };
    let adapter: RuntimeAdapter;
    if (definition.family === "breachling") {
      const runtime = createBreachV2BreachlingRuntime(stageRoot, layout, loader, "wayfarer", undefined,
        { reviewPlacements: [{ ...placement, tier: definition.variant as BreachlingTier }] });
      adapter = {
        warmAt: runtime.warmAt, update: runtime.update, dispose: runtime.dispose,
        snapshot: () => runtime.snapshots()[0], actor: () => runtime.reviewActor(placement.id),
        play: (clip) => runtime.play(placement.id, clip, { immediate: true }),
        pose: (clip, time) => runtime.pose(placement.id, clip, time),
        pause: (paused) => runtime.pause(placement.id, paused),
        playback: (value) => runtime.setReviewPlayback(placement.id, value),
        hooks: (value) => runtime.setReviewPoseHooks(placement.id, value),
      };
    } else {
      const kind = definition.variant as CinderboundWardenKind;
      const runtime = createBreachV2WardenRuntime(stageRoot, layout, loader, kind, undefined, undefined,
        { reviewPlacement: { ...placement, kind } });
      adapter = {
        warmAt: runtime.warmAt, update: runtime.update, dispose: runtime.dispose,
        snapshot: () => runtime.snapshots()[0], actor: runtime.reviewActor,
        play: (clip) => runtime.play(clip, { immediate: true }), pose: runtime.pose,
        pause: runtime.pause, playback: runtime.setReviewPlayback, hooks: runtime.setReviewPoseHooks,
      };
    }
    this.runtime = adapter;
    try {
      await adapter.warmAt(0, 0);
      if (revision !== this.revision) return false;
      const actor = adapter.actor();
      if (!actor) throw new Error(`The real ${definition.label} rig did not load. No placeholder was substituted.`);
      if (definition.reviewedMotion && actor.model.scale.toArray().some((scale) => (
        Math.abs(scale - definition.reviewedMotion!.runtimeScale) > 1e-6
      ))) throw new Error("Reviewed mob runtime scale differs from the approved raw-rig export.");
      if (definition.reviewedMotion && [...definition.reviewedMotion.actions, ...definition.reviewedMotion.neutralHolds]
        .some((name) => !adapter.snapshot()?.actionNames.includes(name))) throw new Error("Reviewed mob receipt names a missing source clip.");
      this.overlay = createMobPoseOverlay(actor.model, definition.family);
      // Restore this actor's initial clip before selecting the review default;
      // otherwise setAction would overwrite an existing Idle draft with zeros.
      const initialClip = adapter.snapshot()?.currentClip;
      if (initialClip) this.overlay.setValues(this.drafts.get(mobCalibrationKey(definition, initialClip)) ?? {});
      adapter.hooks(this.overlay);
      adapter.playback({ speed: this.speed, loop: this.loop });
      this.checksumVerified = loader.checksumVerified;
      this.ready = true;
      this.setAction(adapter.snapshot()?.actionNames.includes("CombatIdle") ? "CombatIdle" : this.actions()[0]!);
      // Let the shared Warden controller complete its existing three-frame
      // floor-reference initialization before the editor frames the actor.
      // Zero delta preserves the selected source pose and animation time.
      for (let frame = 0; frame < 3; frame += 1) adapter.update(0, 0, 0);
      return true;
    } catch (error) {
      if (revision !== this.revision) return false;
      this.clear();
      throw error;
    }
  }

  snapshot() { return this.runtime?.snapshot(); }
  actor() { return this.runtime?.actor() ?? null; }
  actions() { return this.snapshot()?.actionNames ?? []; }
  actionLabel(name: string) {
    const label = name === "RecieveHit" ? "Receive hit" : name.replace(/([a-z])([A-Z])/g, "$1 $2");
    const revised = this.definition?.reviewedMotion;
    const reviewLabel = revised?.actions.includes(name)
      ? `${label} · revised motion${name === "SpitAttack" ? " · projectile pending" : " · review"}`
      : revised?.neutralHolds.includes(name) ? `${label} · approved neutral hold`
        : revised ? `${label} · source · not revised` : label;
    const supported = this.definition?.family !== "breachling"
      || breachlingActionNames(this.definition.variant as BreachlingTier).includes(name);
    return supported ? reviewLabel : `${reviewLabel} · inspection only`;
  }
  private saveCurrentDraft() {
    const clip = this.snapshot()?.currentClip;
    if (this.definition && clip && this.overlay) this.drafts.set(mobCalibrationKey(this.definition, clip), this.overlay.values());
  }
  setAction(name: string) {
    if (!this.runtime || !this.definition || !this.overlay) return;
    if (!this.actions().includes(name)) throw new Error(`This model has no ${name} animation.`);
    this.saveCurrentDraft();
    this.overlay.reset();
    this.runtime.play(name);
    this.overlay.setValues(this.drafts.get(mobCalibrationKey(this.definition, name)) ?? {});
    this.runtime.pose(name, 0);
    this.runtime.pause(!this.playing);
  }
  pose(time: number) {
    const clip = this.snapshot()?.currentClip;
    if (clip) this.runtime?.pose(clip, THREE.MathUtils.clamp(time, 0, 1));
  }
  setPlaying(value: boolean) { this.playing = value; this.runtime?.pause(!value); }
  setPlayback(speed: number, loop: boolean) {
    this.speed = speed; this.loop = loop;
    this.runtime?.playback({ speed, loop });
  }
  restart() { const clip = this.snapshot()?.currentClip; if (clip) this.setAction(clip); }
  setControl(id: string, value: number) {
    this.overlay?.setValue(id, value);
    this.overlay?.apply();
    this.saveCurrentDraft();
  }
  resetPose() { this.overlay?.reset(); this.saveCurrentDraft(); }
  draft() {
    this.saveCurrentDraft();
    return {
      schema: "souldrifter-mob-pose-v1", status: "draft", units: "local-rig-degrees",
      assetId: this.definition?.id, assetSha256: this.definition?.sha256,
      checksumVerified: this.checksumVerified, clip: this.snapshot()?.currentClip,
      calibrationKey: this.definition ? mobCalibrationKey(this.definition, this.snapshot()?.currentClip ?? "") : null,
      controls: this.overlay?.values() ?? {}, rig: this.overlay?.audit(),
      note: "Per-action additive offsets, not a baked or approved animation. Source GLB is unchanged.",
    };
  }
  importDraft(value: unknown) {
    if (!value || typeof value !== "object") throw new Error("Invalid pose draft.");
    const draft = value as Record<string, unknown>;
    if (draft.schema !== "souldrifter-mob-pose-v1" || draft.status !== "draft"
      || draft.assetId !== this.definition?.id || draft.assetSha256 !== this.definition?.sha256
      || draft.clip !== this.snapshot()?.currentClip || !draft.controls || typeof draft.controls !== "object") {
      throw new Error("Draft must match this exact model revision and selected action.");
    }
    this.overlay?.setValues(draft.controls as Record<string, number>);
    this.overlay?.apply();
    this.saveCurrentDraft();
  }
  showSkeleton(visible: boolean) {
    if (!this.skeleton && visible && this.actor()) {
      this.skeleton = new THREE.SkeletonHelper(this.actor()!.model);
      this.skeleton.name = "Actual weighted rig diagnostics";
      const material = this.skeleton.material as THREE.LineBasicMaterial;
      material.depthTest = false; material.transparent = true; material.opacity = 0.85;
      this.stageRoot?.add(this.skeleton);
    }
    if (this.skeleton) this.skeleton.visible = visible;
  }
  bounds() {
    const model = this.actor()?.model;
    if (!model) return null;
    model.updateWorldMatrix(true, false);
    model.updateMatrixWorld(true);
    model.traverse((object) => { if (object instanceof THREE.SkinnedMesh) object.skeleton.update(); });
    return new THREE.Box3().setFromObject(model, true);
  }
  measureContact() {
    const bounds = this.bounds();
    return bounds ? { minimumSurfaceMeters: bounds.min.y, floorMeters: 0, time: this.snapshot()?.normalizedTime,
      warning: "Current whole-mesh sample only. A zero minimum does not prove all paws, limbs, or the body have correct contact." } : null;
  }
  update(deltaSeconds: number) {
    if (!this.ready) return;
    this.runtime?.update(0, 0, deltaSeconds);
    // The solo stage has no combat target. The inherited projectile aims at
    // its actor origin, not the reviewed three-cell target; keep it invisible
    // for this motion intake while retaining the controller's normal cleanup.
    if (this.definition?.reviewedMotion?.actions.includes("SpitAttack")) this.stageRoot?.children.forEach((object) => {
      if (object.name === `studio:${this.definition!.id}:poison-spit`) object.visible = false;
    });
  }
  clear() {
    this.saveCurrentDraft();
    this.revision += 1;
    this.ready = false;
    this.abort?.abort(); this.abort = null;
    // A model can be switched or disposed before its asynchronous load finishes.
    if (this.runtime?.actor()) this.runtime.hooks(null);
    this.overlay?.dispose(); this.overlay = null;
    this.runtime?.dispose(); this.runtime = null;
    if (this.skeleton) {
      this.skeleton.geometry.dispose();
      (this.skeleton.material as THREE.Material).dispose(); this.skeleton = null;
    }
    this.stageRoot?.removeFromParent(); this.stageRoot = null;
    this.checksumVerified = false;
  }
  dispose() { this.clear(); this.drafts.clear(); }
}
