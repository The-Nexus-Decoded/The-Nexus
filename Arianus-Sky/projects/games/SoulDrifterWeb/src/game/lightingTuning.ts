export const LIGHTING_TUNING_SCHEMA_VERSION = 1 as const;

export type ShadowQuality = "off" | "basic" | "pcf" | "pcf-soft";

export interface LightingRoomOverride {
  localLightMultiplier: number;
}

export interface LightingTuningDocument {
  schemaVersion: typeof LIGHTING_TUNING_SCHEMA_VERSION;
  revision: string;
  exposure: number;
  paperDollExposure: number;
  fogDensity: number;
  shadowQuality: ShadowQuality;
  shadowMapSize: 256 | 512 | 1024 | 2048;
  hemisphereIntensity: number;
  ambientIntensity: number;
  keyIntensity: number;
  rimIntensity: number;
  localLightMultiplier: number;
  roomOverrides: Record<string, LightingRoomOverride>;
}

export const DEFAULT_LIGHTING_TUNING: LightingTuningDocument = {
  schemaVersion: LIGHTING_TUNING_SCHEMA_VERSION,
  revision: "built-in-cinematic-default",
  exposure: 1.04,
  paperDollExposure: 1.18,
  fogDensity: 0.0135,
  shadowQuality: "pcf-soft",
  shadowMapSize: 1024,
  hemisphereIntensity: 0.58,
  ambientIntensity: 0.14,
  keyIntensity: 3.1,
  rimIntensity: 0.82,
  localLightMultiplier: 0.74,
  roomOverrides: {
    training: { localLightMultiplier: 0.82 },
    boss: { localLightMultiplier: 1.08 },
  },
};

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

function normalizeShadowQuality(value: unknown): ShadowQuality {
  return value === "off" || value === "basic" || value === "pcf" || value === "pcf-soft"
    ? value
    : DEFAULT_LIGHTING_TUNING.shadowQuality;
}

function normalizeShadowMapSize(value: unknown): LightingTuningDocument["shadowMapSize"] {
  const numeric = Number(value);
  if (numeric >= 2048) return 2048;
  if (numeric >= 1024) return 1024;
  if (numeric >= 512) return 512;
  return 256;
}

function normalizeRoomOverrides(value: unknown): Record<string, LightingRoomOverride> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([roomId, override]) => {
    const source = override && typeof override === "object" && !Array.isArray(override)
      ? override as Partial<LightingRoomOverride>
      : {};
    return [roomId.trim().toLowerCase(), {
      localLightMultiplier: clamp(source.localLightMultiplier, 1, 0.1, 3),
    }];
  }));
}

export function normalizeLightingTuningDocument(value: unknown): LightingTuningDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return structuredClone(DEFAULT_LIGHTING_TUNING);
  const source = value as Partial<LightingTuningDocument>;
  if (source.schemaVersion !== LIGHTING_TUNING_SCHEMA_VERSION) return structuredClone(DEFAULT_LIGHTING_TUNING);
  return {
    schemaVersion: LIGHTING_TUNING_SCHEMA_VERSION,
    revision: typeof source.revision === "string" && source.revision.trim() ? source.revision.trim() : "unversioned",
    exposure: clamp(source.exposure, DEFAULT_LIGHTING_TUNING.exposure, 0.4, 2.5),
    paperDollExposure: clamp(source.paperDollExposure, DEFAULT_LIGHTING_TUNING.paperDollExposure, 0.4, 2.5),
    fogDensity: clamp(source.fogDensity, DEFAULT_LIGHTING_TUNING.fogDensity, 0, 0.08),
    shadowQuality: normalizeShadowQuality(source.shadowQuality),
    shadowMapSize: normalizeShadowMapSize(source.shadowMapSize ?? DEFAULT_LIGHTING_TUNING.shadowMapSize),
    hemisphereIntensity: clamp(source.hemisphereIntensity, DEFAULT_LIGHTING_TUNING.hemisphereIntensity, 0, 5),
    ambientIntensity: clamp(source.ambientIntensity, DEFAULT_LIGHTING_TUNING.ambientIntensity, 0, 5),
    keyIntensity: clamp(source.keyIntensity, DEFAULT_LIGHTING_TUNING.keyIntensity, 0, 12),
    rimIntensity: clamp(source.rimIntensity, DEFAULT_LIGHTING_TUNING.rimIntensity, 0, 8),
    localLightMultiplier: clamp(source.localLightMultiplier, DEFAULT_LIGHTING_TUNING.localLightMultiplier, 0.1, 3),
    roomOverrides: normalizeRoomOverrides(source.roomOverrides),
  };
}

export class LightingTuningRegistry {
  private current = structuredClone(DEFAULT_LIGHTING_TUNING);

  public replace(value: unknown): LightingTuningDocument {
    this.current = normalizeLightingTuningDocument(value);
    return this.snapshot();
  }

  public snapshot(): LightingTuningDocument {
    return structuredClone(this.current);
  }
}

export const lightingTuningRegistry = new LightingTuningRegistry();

export async function loadLightingTuningDocument(url: string): Promise<LightingTuningDocument> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Lighting tuning failed to load (${response.status}).`);
  return normalizeLightingTuningDocument(await response.json());
}
