import type { BreachlingTier } from "./breach-v2-breachlings";

/**
 * Where the acid actually leaves each dungeon-runtime Breachling.
 *
 * Measured, not assumed, by issue-458-motion-composer-v1/probe-runtime-mouth.mjs
 * against the four shipped runtime GLBs at the 0.46-of-duration frame the spit
 * fires on (0.5213 s of a 1.1333 s SpitAttack). The jaw bone is rotated to its
 * release value with every other bone at rest; the skin that moves is the lower
 * jaw, the skin that does not is the cranium, and the forward-most vertex of
 * each bounds the open mouth. Their midpoint is the emission origin.
 *
 * `directionHeadLocal` / `rightHeadLocal` are body forward and body right at the
 * rest pose expressed in the head bone's frame — the same construction as the
 * pinned review basis in combat-review-projectiles.ts, which probe-mouth.mjs
 * reproduces to 8 decimals. `rightHeadLocal` only centres the origin on the
 * head's own sagittal plane; the dungeon aims at the player, so the stored
 * direction is carried for provenance and for a no-target fallback.
 *
 * The measured muzzle aim at that frame is 21.43 degrees BELOW horizontal on
 * all four bodies: the shipped runtime SpitAttack clip pitches the head down at
 * its trigger frame, so a clip-aimed spit would hit the floor about a metre
 * ahead. That is why the runtime solves a ballistic arc to the player instead.
 */
export interface BreachlingRuntimeMouth {
  readonly sha256: string;
  readonly meshName: string;
  /** [lower-jaw tip, cranial tip] at the release frame; midpoint is the origin. */
  readonly vertices: readonly [number, number];
  readonly directionHeadLocal: readonly [number, number, number];
  readonly rightHeadLocal: readonly [number, number, number];
  /** Aperture width at release, metres at the body's runtime height. Sizes the stream. */
  readonly gapeMeters: number;
  /** Measured muzzle elevation at the trigger frame, degrees; negative is downward. */
  readonly clipAimRiseDegrees: number;
  readonly evidence: string;
}

export const BREACHLING_RUNTIME_MOUTHS: Readonly<Record<BreachlingTier, BreachlingRuntimeMouth>> = Object.freeze({
  base: Object.freeze({
    sha256: "00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7",
    meshName: "Breachling_Mesh",
    vertices: Object.freeze([15552, 24741]) as readonly [number, number],
    directionHeadLocal: Object.freeze([0.12328767123287669, 0.9363291589489375, 0.3287671232876712]) as readonly [number, number, number],
    rightHeadLocal: Object.freeze([-0.9363291589489375, 0, 0.35112343458085156]) as readonly [number, number, number],
    gapeMeters: 0.2272,
    clipAimRiseDegrees: -21.43,
    evidence: "breachling-base.glb 0.5213 s SpitAttack frame: lower-jaw vertex 15552, cranial vertex 24741, 0.2272 m gape (probe-runtime-mouth.mjs)",
  }),
  stalker: Object.freeze({
    sha256: "1f61df8716b60dd376959dbff1295c708f770d3601cf9781263d1996f808a641",
    meshName: "Breachling_Mesh",
    vertices: Object.freeze([24833, 27379]) as readonly [number, number],
    directionHeadLocal: Object.freeze([0.0872497183024704, 0.9553793572201996, 0.2822013488142717]) as readonly [number, number, number],
    rightHeadLocal: Object.freeze([-0.9553793572201996, -9.141345542460863e-8, 0.2953815901465591]) as readonly [number, number, number],
    gapeMeters: 0.1813,
    clipAimRiseDegrees: -21.43,
    evidence: "breachling-stalker.glb 0.5213 s SpitAttack frame: lower-jaw vertex 24833, cranial vertex 27379, 0.1813 m gape (probe-runtime-mouth.mjs)",
  }),
  oathbound: Object.freeze({
    sha256: "077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939",
    meshName: "Breachling_Mesh",
    vertices: Object.freeze([18916, 18493]) as readonly [number, number],
    directionHeadLocal: Object.freeze([0.12511557693974976, 0.9353525160553352, 0.3308500613812663]) as readonly [number, number, number],
    rightHeadLocal: Object.freeze([-0.9353524985674402, -1.258755405621911e-7, 0.3537169820967479]) as readonly [number, number, number],
    gapeMeters: 0.1911,
    clipAimRiseDegrees: -21.43,
    evidence: "oathbound-breachling.glb 0.5213 s SpitAttack frame: lower-jaw vertex 18916, cranial vertex 18493, 0.1911 m gape (probe-runtime-mouth.mjs)",
  }),
  ravager: Object.freeze({
    sha256: "cd8fa4f5daf6f789e80322fad2ed7df15cb7b6dcea0dec19c0d869478f08e22c",
    meshName: "Breachling_Mesh",
    vertices: Object.freeze([7227, 12342]) as readonly [number, number],
    directionHeadLocal: Object.freeze([0.21770444746170678, 0.8844747120793758, 0.41268542165613087]) as readonly [number, number, number],
    rightHeadLocal: Object.freeze([-0.8844747503577464, -3.034843526745173e-9, 0.46658805811936777]) as readonly [number, number, number],
    gapeMeters: 0.1962,
    clipAimRiseDegrees: -21.43,
    evidence: "breachling-ravager.glb 0.5213 s SpitAttack frame: lower-jaw vertex 7227, cranial vertex 12342, 0.1962 m gape (probe-runtime-mouth.mjs)",
  }),
});

export const BREACHLING_SPIT_GRAVITY = 9.80665;
/** Chest height of the human the acid is aimed at, metres above the floor. */
export const BREACHLING_SPIT_TARGET_HEIGHT_METERS = 1.15;
/** Horizontal radius of the player capsule the gob is tested against. */
export const BREACHLING_SPIT_PLAYER_RADIUS_METERS = 0.35;
/** Vertical span of that capsule above the floor. */
export const BREACHLING_SPIT_PLAYER_HEIGHT_METERS = 1.8;

/**
 * Launch velocity for a gob leaving `origin` that should arrive at `target`
 * under real gravity. Solves the low ballistic arc for a speed scaled to the
 * throw; when the target is out of reach at that speed it falls back to the
 * 45-degree maximum-range shot, which still arcs and still lands short rather
 * than firing a flat line through the level.
 */
export function solveBreachlingSpitVelocity(
  origin: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  out: { x: number; y: number; z: number },
): { speed: number; elevationDegrees: number; reachesTarget: boolean } {
  const dx = target.x - origin.x, dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  const rise = target.y - origin.y;
  const g = BREACHLING_SPIT_GRAVITY;
  const speed = Math.min(14, Math.max(6.5, Math.sqrt(g * (distance + Math.abs(rise))) * 1.25));
  const flat = distance > 1e-6 ? { x: dx / distance, z: dz / distance } : { x: 0, z: 1 };
  const speedSquared = speed * speed;
  const discriminant = speedSquared * speedSquared - g * (g * distance * distance + 2 * rise * speedSquared);
  const reachesTarget = discriminant >= 0 && distance > 1e-6;
  const angle = reachesTarget
    ? Math.atan((speedSquared - Math.sqrt(discriminant)) / (g * distance))
    : Math.PI / 4;
  const horizontal = speed * Math.cos(angle);
  out.x = flat.x * horizontal;
  out.y = speed * Math.sin(angle);
  out.z = flat.z * horizontal;
  return { speed, elevationDegrees: angle * 180 / Math.PI, reachesTarget };
}
