export const ANIMATION_TUNING_SCHEMA_VERSION = 1 as const;
export const MIN_ANIMATION_SPEED = 0.2;
export const MAX_ANIMATION_SPEED = 2.5;

export interface AnimationTuningDocument {
  schemaVersion: typeof ANIMATION_TUNING_SCHEMA_VERSION;
  revision: string;
  globalSpeed: number;
  raceSpeed: Record<string, number>;
  callingSpeed: Record<string, number>;
  raceCallingSpeed: Record<string, number>;
  animationSpeed: Record<string, number>;
  animationCallingSpeed: Record<string, Record<string, number>>;
}

export interface AnimationTuningContext {
  clipName: string;
  raceId: string;
  callingId: string;
}

export const DEFAULT_ANIMATION_TUNING: AnimationTuningDocument = {
  schemaVersion: ANIMATION_TUNING_SCHEMA_VERSION,
  revision: "built-in-default",
  globalSpeed: 1,
  raceSpeed: {},
  callingSpeed: {},
  raceCallingSpeed: {},
  animationSpeed: {},
  animationCallingSpeed: {},
};

function key(value: string): string {
  return value.trim().toLowerCase();
}

function safeMultiplier(value: unknown, fallback = 1): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function multiplierMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([name, multiplier]) => [key(name), safeMultiplier(multiplier)]));
}

function nestedMultiplierMap(value: unknown): Record<string, Record<string, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([name, multipliers]) => [key(name), multiplierMap(multipliers)]));
}

export function normalizeAnimationTuningDocument(value: unknown): AnimationTuningDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_ANIMATION_TUNING };
  const source = value as Partial<AnimationTuningDocument>;
  if (source.schemaVersion !== ANIMATION_TUNING_SCHEMA_VERSION) return { ...DEFAULT_ANIMATION_TUNING };
  return {
    schemaVersion: ANIMATION_TUNING_SCHEMA_VERSION,
    revision: typeof source.revision === "string" && source.revision.trim() ? source.revision.trim() : "unversioned",
    globalSpeed: safeMultiplier(source.globalSpeed),
    raceSpeed: multiplierMap(source.raceSpeed),
    callingSpeed: multiplierMap(source.callingSpeed),
    raceCallingSpeed: multiplierMap(source.raceCallingSpeed),
    animationSpeed: multiplierMap(source.animationSpeed),
    animationCallingSpeed: nestedMultiplierMap(source.animationCallingSpeed),
  };
}

export function resolveAnimationPlaybackRate(
  baseRate: number,
  context: AnimationTuningContext,
  document: AnimationTuningDocument,
): number {
  const clipName = key(context.clipName);
  const raceId = key(context.raceId);
  const callingId = key(context.callingId);
  const multiplier = document.globalSpeed
    * (document.raceSpeed[raceId] ?? 1)
    * (document.callingSpeed[callingId] ?? 1)
    * (document.raceCallingSpeed[`${raceId}:${callingId}`] ?? 1)
    * (document.animationSpeed[clipName] ?? 1)
    * (document.animationCallingSpeed[clipName]?.[callingId] ?? 1);
  return Math.min(MAX_ANIMATION_SPEED, Math.max(MIN_ANIMATION_SPEED, safeMultiplier(baseRate) * multiplier));
}

export class AnimationTuningRegistry {
  private current = DEFAULT_ANIMATION_TUNING;

  public replace(value: unknown): AnimationTuningDocument {
    this.current = normalizeAnimationTuningDocument(value);
    return this.snapshot();
  }

  public snapshot(): AnimationTuningDocument {
    return structuredClone(this.current);
  }

  public resolve(baseRate: number, context: AnimationTuningContext): number {
    return resolveAnimationPlaybackRate(baseRate, context, this.current);
  }
}

export const animationTuningRegistry = new AnimationTuningRegistry();

export async function loadAnimationTuningDocument(url: string): Promise<AnimationTuningDocument> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Animation tuning failed to load (${response.status}).`);
  return normalizeAnimationTuningDocument(await response.json());
}
