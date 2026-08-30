import type { ArrowType } from "./archeryInventory";

export const CANONICAL_ARROW_LENGTH_METERS = 0.94;
export const MAXIMUM_ARROW_SHAFT_RADIUS_METERS = 0.0055;
export const CANONICAL_QUIVER_LENGTH_METERS = 0.64;

export type ArcheryAssetRole = "quiver" | "harness" | `arrow-${ArrowType}`;

export const ARCHERY_ASSET_PATHS: Readonly<Record<ArcheryAssetRole, string>> = {
  quiver: "/assets/3d/weapons/bow/weapon-quiver-starter-v002.glb",
  harness: "/assets/3d/gear/gear-quiver-harness-human-masculine-v001.glb",
  "arrow-standard": "/assets/3d/weapons/bow/weapon-arrow-starter-v002.glb",
  "arrow-fire": "/assets/3d/weapons/bow/weapon-arrow-fire-v001.glb",
  "arrow-ice": "/assets/3d/weapons/bow/weapon-arrow-ice-v001.glb",
  "arrow-poison": "/assets/3d/weapons/bow/weapon-arrow-poison-v001.glb",
};

export interface ArcheryAssetMetrics {
  role: ArcheryAssetRole;
  lengthMeters: number;
  shaftRadiusMeters?: number;
  forwardAxis: "+Y";
  rearAxis: "-Y";
  bakedArrowCount: number;
  pbrMaterialCount: number;
  rootObjectCount: number;
}

export interface ArcheryAssetValidation {
  accepted: boolean;
  failures: string[];
}

export function validateArcheryAssetMetrics(metrics: ArcheryAssetMetrics): ArcheryAssetValidation {
  const failures: string[] = [];
  if (!Number.isFinite(metrics.lengthMeters) || metrics.lengthMeters <= 0) failures.push("Asset length must be positive.");
  if (metrics.pbrMaterialCount <= 0) failures.push("Asset requires at least one PBR material.");
  if (metrics.rootObjectCount !== 1) failures.push("Each shipping asset must have exactly one independent root.");

  if (metrics.role.startsWith("arrow-")) {
    if (Math.abs(metrics.lengthMeters - CANONICAL_ARROW_LENGTH_METERS) > 0.01) {
      failures.push(`Arrow must be ${CANONICAL_ARROW_LENGTH_METERS.toFixed(2)}m within 1cm tolerance.`);
    }
    if (metrics.shaftRadiusMeters === undefined || metrics.shaftRadiusMeters > MAXIMUM_ARROW_SHAFT_RADIUS_METERS) {
      failures.push("Arrow shaft is too thick.");
    }
  }

  if (metrics.role === "quiver") {
    if (Math.abs(metrics.lengthMeters - CANONICAL_QUIVER_LENGTH_METERS) > 0.02) {
      failures.push(`Quiver must be ${CANONICAL_QUIVER_LENGTH_METERS.toFixed(2)}m within 2cm tolerance.`);
    }
    if (metrics.bakedArrowCount !== 0) failures.push("Quiver must not contain baked arrows.");
  } else if (metrics.bakedArrowCount !== 0) {
    failures.push("Only runtime inventory may create arrow instances.");
  }

  return { accepted: failures.length === 0, failures };
}
