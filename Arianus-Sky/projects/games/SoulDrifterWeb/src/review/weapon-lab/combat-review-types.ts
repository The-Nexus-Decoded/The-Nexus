import type * as THREE from "three";
import type { FacingPolicy, HitShape, MotionEventKind, RootPolicy } from "../../game/motionArchetypes";

/** A source clip being available is not evidence of motion or contact approval. */
export type ReviewApprovalStatus = "source" | "draft" | "pose-approved" | "continuous-reviewed" | "runtime-approved";
export type ReviewActionSemantic = "idle" | "walk" | "run" | "attack" | "cast" | "block" | "reaction" | "death" | "interaction";
export type ReviewActorFamily = "human" | "breachling" | "warden";

export interface ReviewAction {
  readonly id: string;
  readonly label: string;
  readonly clipName: string;
  readonly durationSeconds: number;
  readonly semantic: ReviewActionSemantic;
  readonly approvalStatus: ReviewApprovalStatus;
  readonly rootPolicy: RootPolicy;
  readonly facing?: FacingPolicy;
  readonly event?: { readonly kind: MotionEventKind; readonly at: number; readonly marker: string };
  readonly hit?: { readonly shape: HitShape; readonly reachMeters: number };
  /** Rig-specific contact IDs, never assumed to be human left/right feet. */
  readonly supports?: readonly { readonly contactId: string; readonly start: number; readonly end: number }[];
  readonly unavailableReason?: string;
}

export interface ReviewPoseSample {
  readonly actionId: string;
  readonly timeSeconds: number;
  readonly weight: number;
}

/** Sampled source capability, not foot-lock, anatomical or gameplay approval. */
export interface ReviewLocomotionCapability {
  readonly actorId: string;
  readonly definitionId: string;
  readonly actionId: string;
  readonly durationSeconds: number;
  readonly status: "authored-forward" | "authored-backward" | "in-place" | "unavailable";
  /** Reusing authored displacement is distinct from inventing an in-place stride. */
  readonly canRepeatAuthoredTravel: boolean;
  readonly sourceToken: string;
  readonly anchorName: string | null;
  /** Metres in the placed actor's yaw frame; scene translation is excluded. */
  readonly cycleDisplacement: readonly [number, number, number];
  readonly samples: readonly { readonly timeSeconds: number; readonly anchor: readonly [number, number, number] }[];
  readonly limbs: readonly {
    readonly id: string;
    readonly bones: readonly string[];
    readonly rotationSpansRadians: readonly number[];
    /** Direct distal skin only; ancestors may deform their weighted descendants. */
    readonly distalSkinInfluence: { readonly minimumWeight: number; readonly vertexCount: number; readonly maxWeight: number; readonly totalWeight: number };
  }[];
  readonly loopPositionResidualMeters: number | null;
  readonly loopRotationResidualRadians: number | null;
  readonly supportStatus: "unmeasured";
  readonly evidence: string;
  readonly unavailableReason?: string;
}

/** Resources may be cached; skeletons, mixers, props and calibration must not be shared. */
export interface ReviewActorAdapter {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly root: THREE.Object3D;
  readonly model: THREE.Object3D;
  actions(): readonly ReviewAction[];
  sample(actionId: string, timeSeconds: number): void;
  reset(): void;
  dispose(): void;
  socketWorld?(name: string, target: THREE.Vector3): boolean;
}

export interface ReviewTrack {
  readonly id: string;
  readonly actorId: string;
  readonly actionId: string;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly clipDurationSeconds: number;
  readonly rate?: number;
  readonly loop?: boolean;
  readonly blendInSeconds?: number;
  /** Death finishes, then holds. A later action requires a new/reset sequence. */
  readonly terminal?: boolean;
}

export type ReviewImpactResult = "hit" | "miss" | "blocked" | "unmeasured";
export type ReviewDamageType = "physical" | "fire" | "ice" | "poison" | "arcane";

/** Fixed emission in world space; the contact sampler validates and freezes it.
 * Position is origin + direction * phase * range, minus phase² * drop on world Y.
 * It never follows a later target pose. Times are absolute sequence seconds.
 */
export interface ReviewProjectileFlight {
  readonly id: string;
  readonly actorId: string;
  readonly actionId: string;
  readonly visualKind: "arrow" | "poison-spit" | "fire-spell";
  readonly releaseSeconds: number;
  readonly endSeconds: number;
  readonly origin: readonly [number, number, number];
  readonly direction: readonly [number, number, number];
  readonly rangeMeters: number;
  readonly dropMeters: number;
  readonly evidence: string;
}

/** Exact rendered target triangle at the confirmed contact time, not an aim target.
 * IDs are scoped to this loaded actor instance; this is not a portable asset receipt.
 */
export interface ReviewSurfaceAnchor {
  readonly meshId: string;
  readonly geometryId: string;
  /** Index-buffer offset (or position offset for a nonindexed mesh). */
  readonly triangleOffset: number;
  readonly vertexIndices: readonly [number, number, number];
  readonly barycentric: readonly [number, number, number];
  readonly worldTriangle: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
}

export interface ReviewEvent {
  readonly id: string;
  readonly timeSeconds: number;
  readonly kind: "release" | "contact" | "reaction" | "death" | "prop-state";
  readonly actorId: string;
  readonly targetId?: string;
  /** A contact stops this projectile only, not every arrow in a multishot. */
  readonly projectileId?: string;
  readonly result?: ReviewImpactResult;
  readonly damageType?: ReviewDamageType;
  readonly position?: readonly [number, number, number];
  readonly normal?: readonly [number, number, number];
  /** Present only for a nondegenerate measured surface; never synthesized by a timer. */
  readonly surfaceAnchor?: ReviewSurfaceAnchor;
  readonly state?: string;
  /** Measured contact is supplied by the spatial sampler, never by this clock. */
  readonly evidence?: string;
}

export interface ReviewSequence {
  readonly id: string;
  readonly durationSeconds: number;
  readonly actorIds: readonly string[];
  readonly propIds?: readonly string[];
  readonly tracks: readonly ReviewTrack[];
  readonly events: readonly ReviewEvent[];
}

export interface ReviewActorFrame {
  readonly actorId: string;
  readonly trackId: string;
  readonly poses: readonly ReviewPoseSample[];
  readonly terminal: "none" | "dying" | "held";
}

export interface ReviewSequenceFrame {
  readonly timeSeconds: number;
  readonly normalizedTime: number;
  readonly actors: readonly ReviewActorFrame[];
  /** Reconstruct sandbox effects from these events; seeking must not apply live damage/loot. */
  readonly elapsedEvents: readonly ReviewEvent[];
}
