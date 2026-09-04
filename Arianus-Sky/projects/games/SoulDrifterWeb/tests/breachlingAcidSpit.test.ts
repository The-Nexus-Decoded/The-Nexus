import * as THREE from "three";
import { describe, expect, it, beforeEach } from "vitest";
import {
  BREACHLING_RUNTIME_MOUTHS,
  BREACHLING_SPIT_GRAVITY,
  solveBreachlingSpitVelocity,
} from "../src/game/dungeons/breach-v2-breachling-mouths";
import {
  createBreachlingAcidCoating,
  createBreachlingAcidPool,
  createBreachlingAcidResources,
  createBreachlingAcidSplash,
  createBreachlingAcidStream,
} from "../src/game/vfx/breachling-acid-vfx";
import {
  ACID_IMPACT_SECONDS,
  ACID_LINGER_SECONDS,
  acidReactionClip,
  acidResponsePhaseAt,
  acidResponsePlan,
  clearAcidReactionClips,
  createAcidVictimMark,
  registerAcidReactionClips,
} from "../src/game/combat/acid-response";
import { LEGACY_SPIT_MOUTH, SPIT_GRAVITY_METERS_PER_SECOND_SQUARED } from "../src/review/weapon-lab/combat-review-projectiles";
import { COMPOSER_MOB_PACKS, COMPOSER_MOB_PACKS_FOURVIEW, type ComposerMobPack } from "../src/review/weapon-lab/composer-mob-packs";

/**
 * The Breachling acid spit: the authored mouth on the four-view bodies, the
 * viscous stream that leaves it, where it lands, and the response the victim
 * owes. Every number asserted here is a measured one from the composer lane
 * (probe-mouth.mjs / probe-runtime-mouth.mjs) or a property the code must hold
 * for any body; nothing is a restatement of an implementation constant.
 */

const FOURVIEW_VARIANTS = ["base", "stalker", "oathbound", "ravager"] as const;

function unit(values: readonly number[]): number {
  return Math.hypot(values[0]!, values[1]!, values[2]!);
}
function dot(a: readonly number[], b: readonly number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

describe("four-view Breachling spit emission", () => {
  it("every four-view pack carries a measured mouth; the legacy packs keep the pinned one", () => {
    for (const variant of FOURVIEW_VARIANTS) {
      const pack = COMPOSER_MOB_PACKS_FOURVIEW[variant] as ComposerMobPack;
      expect(pack.body, variant).toBe("fourview");
      expect(pack.spit, variant).not.toBeNull();
      const mouth = pack.spitMouth;
      expect(mouth, `${variant} spitMouth`).not.toBeNull();
      expect(mouth!.meshName).toBe("Breachling_Mesh");
      expect(mouth!.vertices).toHaveLength(2);
      for (const index of mouth!.vertices) expect(Number.isInteger(index) && index >= 0, `${variant} vertex ${index}`).toBe(true);
      expect(mouth!.vertices[0]).not.toBe(mouth!.vertices[1]);
      expect(mouth!.evidence).toMatch(/mouth aperture measured on .*\.glb/);
    }
    // Legacy packs are deliberately left on the pinned basis; nothing was
    // re-measured under them, so their rows cannot move.
    for (const variant of FOURVIEW_VARIANTS) {
      expect(COMPOSER_MOB_PACKS[variant]?.spitMouth, `${variant} legacy`).toBeNull();
    }
  });

  it("the measured four-view bases are built the same way as the pinned legacy basis", () => {
    const bases = [
      ["legacy-pinned", LEGACY_SPIT_MOUTH.directionHeadLocal, LEGACY_SPIT_MOUTH.rightHeadLocal] as const,
      ...FOURVIEW_VARIANTS.map((variant) => {
        const mouth = COMPOSER_MOB_PACKS_FOURVIEW[variant]!.spitMouth!;
        return [variant, mouth.directionHeadLocal, mouth.rightHeadLocal] as const;
      }),
    ];
    for (const [label, direction, right] of bases) {
      expect(unit(direction), `${label} direction is a unit vector`).toBeCloseTo(1, 6);
      expect(unit(right), `${label} right is a unit vector`).toBeCloseTo(1, 6);
      expect(dot(direction, right), `${label} basis is orthogonal`).toBeCloseTo(0, 6);
    }
  });

  it("carrying a stored basis through a head rotation gives back body forward and body right", () => {
    // The construction the runtime relies on: the stored vectors are the body
    // axes expressed in the head frame, so applying the head's rest rotation
    // returns them. Verified against the pinned legacy numbers, which were
    // authored independently of this code.
    const headQuaternion = new THREE.Quaternion(0.1419, 0.5966, 0.7825, 0.1082).normalize();
    const direction = new THREE.Vector3(...(LEGACY_SPIT_MOUTH.directionHeadLocal as number[]))
      .applyQuaternion(headQuaternion).normalize();
    const right = new THREE.Vector3(...(LEGACY_SPIT_MOUTH.rightHeadLocal as number[]))
      .applyQuaternion(headQuaternion).normalize();
    expect(direction.x).toBeCloseTo(0, 3);
    expect(direction.y).toBeCloseTo(0, 3);
    expect(direction.z).toBeCloseTo(1, 3);
    expect(right.x).toBeCloseTo(1, 3);
    expect(right.y).toBeCloseTo(0, 3);
    expect(right.z).toBeCloseTo(0, 3);
  });

  it("mouth apertures are creature-scaled, not arbitrary", () => {
    for (const variant of FOURVIEW_VARIANTS) {
      const gape = COMPOSER_MOB_PACKS_FOURVIEW[variant]!.spitMouth!.gapeMeters;
      // The bodies stand 1.025-1.325 m; an aperture outside 2-30 cm would be a
      // mis-measurement, not a mouth.
      expect(gape, `${variant} gape`).toBeGreaterThan(0.02);
      expect(gape, `${variant} gape`).toBeLessThan(0.3);
    }
  });
});

describe("dungeon runtime mouths", () => {
  it("pins the four shipped runtime bodies by sha and carries a measured aperture", () => {
    const shas = new Set<string>();
    for (const tier of FOURVIEW_VARIANTS) {
      const mouth = BREACHLING_RUNTIME_MOUTHS[tier];
      expect(mouth.sha256, tier).toMatch(/^[0-9a-f]{64}$/);
      shas.add(mouth.sha256);
      expect(mouth.vertices[0]).not.toBe(mouth.vertices[1]);
      expect(mouth.gapeMeters).toBeGreaterThan(0.02);
      expect(unit(mouth.directionHeadLocal), tier).toBeCloseTo(1, 6);
      expect(unit(mouth.rightHeadLocal), tier).toBeCloseTo(1, 6);
      expect(dot(mouth.directionHeadLocal, mouth.rightHeadLocal), tier).toBeCloseTo(0, 6);
      // The shipped clip aims the muzzle below horizontal at its trigger frame,
      // which is why the runtime solves an arc to the player instead of using it.
      expect(mouth.clipAimRiseDegrees).toBeLessThan(0);
    }
    expect(shas.size).toBe(4);
  });

  it("solves a real arc that lands on the target under gravity", () => {
    for (const [distance, rise] of [[2, 0.5], [3.5, 0.4], [5, 0.2], [1.2, 0.8]] as const) {
      const origin = { x: 0, y: 0.72, z: 0 };
      const target = { x: 0, y: origin.y + rise, z: distance };
      const velocity = { x: 0, y: 0, z: 0 };
      const solved = solveBreachlingSpitVelocity(origin, target, velocity);
      expect(solved.reachesTarget, `${distance} m`).toBe(true);
      // It must actually arc, not fire a flat line.
      expect(solved.elevationDegrees, `${distance} m elevation`).toBeGreaterThan(0);
      const flightSeconds = distance / Math.hypot(velocity.x, velocity.z);
      const landedY = origin.y + velocity.y * flightSeconds - 0.5 * BREACHLING_SPIT_GRAVITY * flightSeconds * flightSeconds;
      expect(landedY, `${distance} m arrival height`).toBeCloseTo(target.y, 6);
      // Gravity must bend it: the straight line from origin to target would be
      // measurably below the arc's midpoint.
      const midY = origin.y + velocity.y * flightSeconds / 2 - 0.5 * BREACHLING_SPIT_GRAVITY * (flightSeconds / 2) ** 2;
      expect(midY, `${distance} m arc height`).toBeGreaterThan((origin.y + target.y) / 2);
    }
  });

  it("falls back to a 45 degree lob when the target is out of reach", () => {
    const velocity = { x: 0, y: 0, z: 0 };
    const solved = solveBreachlingSpitVelocity({ x: 0, y: 0.7, z: 0 }, { x: 0, y: 40, z: 0.5 }, velocity);
    expect(solved.reachesTarget).toBe(false);
    expect(solved.elevationDegrees).toBeCloseTo(45, 6);
    expect(velocity.y).toBeGreaterThan(0);
  });
});

describe("acid stream", () => {
  const resources = createBreachlingAcidResources();

  it("keeps the head out of the trail group so a contact probe only ever sees one gob", () => {
    const stream = createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 0.2238, trailCount: 8 });
    expect(stream.trail).toHaveLength(8);
    expect(stream.root.children).toHaveLength(8);
    expect(stream.head.parent).toBeNull();
    for (const gob of stream.trail) expect(gob.parent).toBe(stream.root);
    stream.dispose();
  });

  it("sizes the gob from the measured aperture and clamps a wild measurement", () => {
    const small = createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 0.0505 });
    const large = createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 0.2238 });
    const absurd = createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 4 });
    expect(large.headRadiusMeters).toBeGreaterThan(small.headRadiusMeters);
    expect(small.headRadiusMeters).toBeGreaterThanOrEqual(0.015);
    expect(absurd.headRadiusMeters).toBeLessThanOrEqual(0.06);
    for (const stream of [small, large, absurd]) stream.dispose();
  });

  it("lays the trail out along the supplied arc, behind the head and tapering", () => {
    const stream = createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 0.2, trailCount: 6 });
    // A real ballistic path: forward at 6 m/s over 0.5 s under gravity.
    const path = (u: number): THREE.Vector3 => new THREE.Vector3(0, 1.2 + 0.9 * u - 2.45 * u * u, 3 * u);
    stream.setTrail(1, path);
    const visible = stream.trail.filter((gob) => gob.visible);
    expect(visible.length).toBe(6);
    const head = path(1);
    let previous = 0;
    for (const gob of visible) {
      const behind = head.z - gob.position.z;
      expect(behind, "each gob is further back than the last").toBeGreaterThan(previous);
      previous = behind;
      // Gobs ride the arc, not the chord: within a gob's own wobble of the path.
      expect(gob.position.distanceTo(path(gob.position.z / 3))).toBeLessThan(stream.headRadiusMeters * 1.5);
    }
    const radii = visible.map((gob) => gob.scale.x);
    for (let index = 1; index < radii.length; index += 1) {
      expect(radii[index]!, "calibre tapers back along the rope").toBeLessThan(radii[index - 1]!);
    }
    // Before release nothing is on screen.
    stream.setTrail(0, path);
    expect(stream.trail.every((gob) => !gob.visible)).toBe(true);
    stream.dispose();
  });

  it("rejects a body with no measured aperture", () => {
    expect(() => createBreachlingAcidStream({ resources, scale: 1, gapeMeters: 0 })).toThrow(/measured mouth gape/);
    expect(() => createBreachlingAcidStream({ resources, scale: 0, gapeMeters: 0.2 })).toThrow(/positive scale/);
  });
});

describe("splash and pool", () => {
  const resources = createBreachlingAcidResources();

  it("throws droplets that fall under gravity and fade out", () => {
    const splash = createBreachlingAcidSplash({
      resources, scale: 1, headRadiusMeters: 0.05, normal: new THREE.Vector3(0, 0, -1), dropletCount: 10,
      gravityMetersPerSecondSquared: 9.80665,
    });
    splash.update(0.02);
    const early = splash.root.children.filter((child) => child.name.startsWith("breachling-acid-droplet"))
      .map((child) => child.position.clone());
    splash.update(0.8);
    const late = splash.root.children.filter((child) => child.name.startsWith("breachling-acid-droplet"))
      .map((child) => child.position.clone());
    expect(early).toHaveLength(10);
    // Real gravity: after 0.8 s every droplet has fallen relative to a straight line.
    for (let index = 0; index < early.length; index += 1) {
      // Recover the launch velocity from the early sample, then predict 0.8 s.
      const launchY = (early[index]!.y + 0.5 * 9.80665 * 0.02 * 0.02) / 0.02;
      const ballistic = launchY * 0.8 - 0.5 * 9.80665 * 0.8 * 0.8;
      expect(late[index]!.y).toBeCloseTo(ballistic, 5);
      expect(late[index]!.y).toBeLessThan(early[index]!.y);
    }
    expect(splash.finished(0.2)).toBe(false);
    expect(splash.finished(splash.durationSeconds)).toBe(true);
    splash.dispose();
  });

  it("spreads, then eats itself away from the rim inward, then fades", () => {
    const pool = createBreachlingAcidPool({ resources, scale: 1, lifetimeSeconds: 6, bubbleCount: 5 });
    const surface = pool.root.getObjectByName("breachling-acid-pool-surface") as THREE.Mesh;
    const material = surface.material as THREE.ShaderMaterial;
    pool.update(0);
    const grow0 = material.uniforms.uGrow!.value as number;
    pool.update(1.5);
    const grow1 = material.uniforms.uGrow!.value as number;
    const eat1 = material.uniforms.uEat!.value as number;
    pool.update(4.5);
    const eat2 = material.uniforms.uEat!.value as number;
    pool.update(5.9);
    const eat3 = material.uniforms.uEat!.value as number;
    const opacity = material.uniforms.uOpacity!.value as number;
    expect(grow0).toBe(0);
    expect(grow1).toBeGreaterThan(grow0);
    expect(eat2, "erosion closes in after the hold").toBeLessThan(eat1);
    expect(eat3).toBeLessThan(eat2);
    expect(opacity, "the last of it fades").toBeLessThan(1);
    expect(pool.finished(5.9)).toBe(false);
    expect(pool.finished(6)).toBe(true);
    // Bubbles work the surface while the acid is alive.
    const bubbles = pool.root.children.filter((child) => child.name.startsWith("breachling-acid-bubble"));
    expect(bubbles).toHaveLength(5);
    pool.update(1.2);
    expect(bubbles.some((bubble) => bubble.visible)).toBe(true);
    pool.dispose();
  });

  it("coating clings, runs downward and thins out", () => {
    const coating = createBreachlingAcidCoating({ resources, scale: 1, headRadiusMeters: 0.05, runnerCount: 4, durationSeconds: 4 });
    coating.update(0.3);
    const runners = coating.root.children.filter((child) => child.name.startsWith("breachling-acid-runner"));
    const early = runners.map((runner) => runner.position.y);
    coating.update(3.5);
    const late = runners.map((runner) => runner.position.y);
    for (let index = 0; index < runners.length; index += 1) expect(late[index]!).toBeLessThan(early[index]!);
    expect(coating.finished(4)).toBe(true);
    coating.dispose();
  });
});

describe("victim acid response", () => {
  beforeEach(() => clearAcidReactionClips());

  it("is BLOCKED on a Mixamo asset today and says exactly which one", () => {
    const plan = acidResponsePlan("twoHandSword", 0.61);
    expect(plan.playable).toBe(false);
    expect(plan.windows.map((window) => window.phase)).toEqual(["impact", "burning", "recover"]);
    expect(plan.windows.every((window) => window.clip.clipId === null)).toBe(true);
    expect(plan.blockedReason).toContain("BLOCKED");
    expect(plan.blockedReason).toContain("LOOPING");
    expect(acidReactionClip("twoHandSword", "burning").evidence).toContain("No looping receiving clip exists");
  });

  it("orders impact, a burning loop that lasts the linger, then recovery", () => {
    const plan = acidResponsePlan("twoHandSword", 2);
    const [impact, burning, recover] = plan.windows;
    expect(impact!.startSeconds).toBe(2);
    expect(impact!.loops).toBe(false);
    expect(burning!.startSeconds).toBeCloseTo(2 + ACID_IMPACT_SECONDS, 10);
    expect(burning!.endSeconds - burning!.startSeconds).toBeCloseTo(ACID_LINGER_SECONDS, 10);
    expect(burning!.loops, "the burn has to loop; every installed reaction is one-shot").toBe(true);
    expect(recover!.startSeconds).toBeCloseTo(burning!.endSeconds, 10);
    expect(acidResponsePhaseAt(plan, 1.9)).toBeNull();
    expect(acidResponsePhaseAt(plan, 2.1)?.phase).toBe("impact");
    expect(acidResponsePhaseAt(plan, 3)?.phase).toBe("burning");
    expect(acidResponsePhaseAt(plan, 5.2)?.phase).toBe("recover");
    expect(acidResponsePhaseAt(plan, 99)).toBeNull();
  });

  it("becomes playable the moment the owner registers the clips, with no other change", () => {
    registerAcidReactionClips("twoHandSword", { impact: "Acid__Recoil", burning: "Acid__BurningLoop", recover: "Acid__Recover" });
    const plan = acidResponsePlan("twoHandSword", 0);
    expect(plan.playable).toBe(true);
    expect(plan.blockedReason).toBeNull();
    expect(plan.windows.map((window) => window.clip.clipId)).toEqual(["Acid__Recoil", "Acid__BurningLoop", "Acid__Recover"]);
    // A family nobody registered stays blocked.
    expect(acidResponsePlan("bow", 0).playable).toBe(false);
  });

  it("runs the acid that clings to the victim even while the clip is blocked", () => {
    const resources = createBreachlingAcidResources();
    const plan = acidResponsePlan("twoHandSword", 1);
    const mark = createAcidVictimMark({ resources, plan, headRadiusMeters: 0.04 });
    mark.update(0.5);
    expect(mark.root.visible, "nothing before the hit").toBe(false);
    mark.update(1.4);
    expect(mark.root.visible).toBe(true);
    const patch = mark.coating.root.getObjectByName("breachling-acid-coating-patch") as THREE.Mesh;
    const spread = patch.scale.x;
    mark.update(3);
    expect(patch.scale.x).toBeGreaterThanOrEqual(spread);
    mark.dispose();
    resources.dispose();
  });
});

describe("four-view flight arc", () => {
  it("derives the acid drop from standard gravity, not a dialled number", () => {
    expect(SPIT_GRAVITY_METERS_PER_SECOND_SQUARED).toBeCloseTo(9.80665, 10);
    expect(BREACHLING_SPIT_GRAVITY).toBeCloseTo(SPIT_GRAVITY_METERS_PER_SECOND_SQUARED, 10);
    // Every four-view pack registers the same 0.45-1.20 s spit window, so the
    // review flight falls this far by the end of it.
    for (const variant of FOURVIEW_VARIANTS) {
      const spit = COMPOSER_MOB_PACKS_FOURVIEW[variant]!.spit!;
      const flightSeconds = spit.endSeconds - spit.releaseSeconds;
      expect(flightSeconds).toBeCloseTo(0.75, 10);
      const drop = 0.5 * SPIT_GRAVITY_METERS_PER_SECOND_SQUARED * flightSeconds * flightSeconds;
      expect(drop).toBeCloseTo(2.7581, 3);
      // prepareReviewProjectileFlight rejects a drop over 10 m.
      expect(drop).toBeLessThan(10);
    }
  });
});
