/**
 * Heartvale water — swimmable-water tuning (owner directive on #453).
 *
 * Every gameplay number for water lives here as data — never magic numbers
 * in the controller. Forgiving by design in the starting area: the Anwel
 * run is a shallow, slow river; drowning is a warning, not a punishment.
 */
export const WATER_TUNING = {
  /** Depth thresholds (meters below the water surface). */
  wadeKneeDepth: 0.35, // below: dry walking
  swimDepth: 0.9, // above: buoyant swim
  /** Move speeds (m/s). */
  walkSpeed: 4.2,
  wadeSpeed: 2.0, // slowed by drag
  swimSpeed: 2.6,
  /** Current: drift strength along the flow while in water (m/s at full depth). */
  currentStrength: 0.55,
  currentWadeFactor: 0.25, // wading resists most of the drift
  /** Breath (seconds). */
  breathMaxSeconds: 18.0,
  breathRefillPerSecond: 6.0, // at the surface
  /** Drowning: forgiving in the starting area. */
  drownDamagePerSecond: 2.0, // HP lost once breath is empty
  startHealth: 40,
  /** Splash/ripple feedback. */
  splashMinSpeed: 0.8, // m/s before movement ripples
  splashIntervalSeconds: 0.45, // min seconds between movement ripples
  splashLifetimeSeconds: 1.4,
  splashMaxRadius: 1.6,
  /** Underwater camera feel. */
  underwaterFogDensity: 0.09,
  underwaterTint: 0x1e4a52,
  /** Water level: height of the surface above the carved riverbed. Tuned so
   * the Anwel channel swims mid-channel (bed ≈ −1.0, banks ≈ +1.2 → surface
   * 0.35, ~0.85 m freeboard, ~1.35 m center depth) and wades at the edges. */
  waterLift: 1.35,
  /** Player capsule. */
  playerHeight: 1.75,
  playerRadius: 0.32,
  gravity: 18.0,
} as const;

export type WaterTuning = typeof WATER_TUNING;
