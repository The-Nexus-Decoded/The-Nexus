export type ArcherySocketRole =
  | "bow-hand"
  | "string-hand"
  | "arrow-hand"
  | "projectile-spawn"
  | "quiver-back"
  | "quiver-harness";

export interface ArcheryCalibrationIdentity {
  species: string;
  bodyArchetype: string;
  rigRevision: string;
  clipRevision: string;
  equipmentCombination: string;
  assetRevision: string;
  socketRole: ArcherySocketRole;
}

export type Vec3Tuple = readonly [number, number, number];
export type EulerTuple = readonly [number, number, number];

export interface ArcherySocketTransform {
  position: Vec3Tuple;
  rotation: EulerTuple;
  scale: Vec3Tuple;
}

export interface ArcheryIkCalibration {
  target: Vec3Tuple;
  pole: Vec3Tuple;
  weight: number;
  wristCorrection: EulerTuple;
}

export interface ArcheryEventMarkers {
  contactQuiver: number;
  gripFletching: number;
  arrowClearsQuiver: number;
  nock: number;
  fullDraw: number;
  release: number;
  projectileSpawn: number;
  recovery: number;
}

export interface ArcheryCollisionCalibration {
  minimumBodyClearanceMeters: number;
  minimumEquipmentClearanceMeters: number;
  evidenceRevision: string;
}

export interface ArcheryCalibrationValues {
  socketTransform: ArcherySocketTransform;
  ik?: ArcheryIkCalibration;
  fingerCurl?: readonly number[];
  extractionTrajectory?: readonly Vec3Tuple[];
  markers?: ArcheryEventMarkers;
  collision: ArcheryCollisionCalibration;
}

export interface ArcheryCalibrationRecord {
  identity: ArcheryCalibrationIdentity;
  calibrationRevision: string;
  values: ArcheryCalibrationValues;
}

type BaseFitIdentity = Omit<ArcheryCalibrationIdentity, "clipRevision">;

export interface ArcheryBaseFitRecord {
  identity: BaseFitIdentity;
  calibrationRevision: string;
  values: ArcheryCalibrationValues;
}

const IDENTITY_TRANSFORM: ArcherySocketTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

const DEFAULT_COLLISION: ArcheryCollisionCalibration = {
  minimumBodyClearanceMeters: 0,
  minimumEquipmentClearanceMeters: 0,
  evidenceRevision: "unverified",
};

function canonicalPart(value: string, field: string): string {
  const canonical = value.trim().toLowerCase();
  if (!canonical) throw new Error(`Archery calibration identity requires ${field}.`);
  return encodeURIComponent(canonical);
}

export function archeryCalibrationKey(identity: ArcheryCalibrationIdentity): string {
  return [
    canonicalPart(identity.species, "species"),
    canonicalPart(identity.bodyArchetype, "bodyArchetype"),
    canonicalPart(identity.rigRevision, "rigRevision"),
    canonicalPart(identity.clipRevision, "clipRevision"),
    canonicalPart(identity.equipmentCombination, "equipmentCombination"),
    canonicalPart(identity.assetRevision, "assetRevision"),
    canonicalPart(identity.socketRole, "socketRole"),
  ].join("/");
}

function archeryBaseFitKey(identity: BaseFitIdentity): string {
  return [
    canonicalPart(identity.species, "species"),
    canonicalPart(identity.bodyArchetype, "bodyArchetype"),
    canonicalPart(identity.rigRevision, "rigRevision"),
    canonicalPart(identity.equipmentCombination, "equipmentCombination"),
    canonicalPart(identity.assetRevision, "assetRevision"),
    canonicalPart(identity.socketRole, "socketRole"),
  ].join("/");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function mergeValues(base: ArcheryCalibrationValues, action?: ArcheryCalibrationValues): ArcheryCalibrationValues {
  if (!action) return clone(base);
  return {
    ...clone(base),
    ...clone(action),
    socketTransform: {
      ...clone(base.socketTransform),
      ...clone(action.socketTransform),
    },
    collision: {
      ...clone(base.collision),
      ...clone(action.collision),
    },
  };
}

function validateNormalizedMarker(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Archery marker ${name} must be normalized between 0 and 1.`);
  }
}

function validateValues(values: ArcheryCalibrationValues): void {
  if (values.markers) {
    for (const [name, value] of Object.entries(values.markers)) validateNormalizedMarker(name, value);
  }
  if (values.collision.minimumBodyClearanceMeters < 0 || values.collision.minimumEquipmentClearanceMeters < 0) {
    throw new Error("Archery collision clearance cannot accept penetration.");
  }
  if (values.ik && (values.ik.weight < 0 || values.ik.weight > 1)) {
    throw new Error("Archery IK weight must be between 0 and 1.");
  }
}

function defaultValues(): ArcheryCalibrationValues {
  return {
    socketTransform: clone(IDENTITY_TRANSFORM),
    collision: clone(DEFAULT_COLLISION),
  };
}

/**
 * Stores base equipment fit separately from exact per-action corrections.
 * Every read is cloned, so editing one resolved action can never mutate another
 * body, clip, equipment revision, asset revision, or socket role.
 */
export class ArcheryCalibrationRegistry {
  private readonly baseFits = new Map<string, ArcheryBaseFitRecord>();
  private readonly actions = new Map<string, ArcheryCalibrationRecord>();

  public registerBaseFit(record: ArcheryBaseFitRecord): void {
    validateValues(record.values);
    this.baseFits.set(archeryBaseFitKey(record.identity), clone(record));
  }

  public registerAction(record: ArcheryCalibrationRecord): void {
    validateValues(record.values);
    this.actions.set(archeryCalibrationKey(record.identity), clone(record));
  }

  public resolve(identity: ArcheryCalibrationIdentity): ArcheryCalibrationRecord {
    const baseIdentity: BaseFitIdentity = {
      species: identity.species,
      bodyArchetype: identity.bodyArchetype,
      rigRevision: identity.rigRevision,
      equipmentCombination: identity.equipmentCombination,
      assetRevision: identity.assetRevision,
      socketRole: identity.socketRole,
    };
    const base = this.baseFits.get(archeryBaseFitKey(baseIdentity));
    const action = this.actions.get(archeryCalibrationKey(identity));
    return {
      identity: clone(identity),
      calibrationRevision: action?.calibrationRevision ?? base?.calibrationRevision ?? "built-in-default",
      values: mergeValues(base?.values ?? defaultValues(), action?.values),
    };
  }

  public snapshot(): { baseFits: ArcheryBaseFitRecord[]; actions: ArcheryCalibrationRecord[] } {
    return {
      baseFits: clone([...this.baseFits.values()]),
      actions: clone([...this.actions.values()]),
    };
  }
}
