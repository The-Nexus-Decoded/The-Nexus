/**
 * BREACH-V2 layout builder — the shared data assembly behind the Houdini
 * build (scripts/houdini/export-breach-v2-layout.mjs), the runtime fixtures
 * (scripts/export-breach-v2-runtime.mjs), and the live runtime preview.
 *
 * Deterministic per (seed, path): rooms/corridors/placements/lights/landmarks.
 * The kit catalog is injected so this module stays import-extension-clean for
 * both Vite and node --experimental-strip-types consumers.
 */

import { generateBreachV2 } from "./breach-v2-generator.ts";
import { BREACH_V2_REGISTRY as R } from "./breach-v2-registry.mjs";
import type { BreachV2PathId } from "./breach-v2-generator.ts";

export interface BreachV2CatalogSpec {
  sourceUrl: string;
  targetHeight: number;
  maxFootprint: number;
  elevation?: number;
  verticalScale?: number;
  fireAnchorY?: number;
  fireColor?: "soul" | "cinder";
  fireCastsShadow?: boolean;
}

export const BREACH_V2_RUNTIME_KIT_ROOT = "/assets/3d/environment/dungeon-kit";

const CORRUPTION_BY_KIND: Record<string, number> = {
  start: 0.05, corridor: 0.08, plaza: 0.10, convergence: 0.70,
  ante: 0.80, boss: 1.00, vault: 0.60, exit: 0.30,
};

function propYaw(asset: string, x: number, y: number): number {
  let h = 2166136261;
  const text = `${asset}:${x.toFixed(2)},${y.toFixed(2)}`;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 8) * 45;
}

const FACING_YAW: Record<string, number> = { south: 180, north: 0, east: 90, west: 270 };

export function buildBreachV2Layout(
  seed: number,
  pathId: BreachV2PathId,
  catalog: Record<string, BreachV2CatalogSpec>,
) {
  const gen = generateBreachV2(seed, pathId);

  const placements = gen.placements.map((p) => {
    const spec = catalog[p.asset] ?? null;
    const isArt = p.role === "wall-art";
    const isBooks = p.group === "books";
    return {
      asset: p.asset,
      roomId: p.roomId,
      zone: p.zoneId,
      x: p.worldX,
      z: p.worldY,
      yaw: p.placement === "wall" ? (FACING_YAW[p.facing] ?? 0) : propYaw(p.asset, p.x, p.y),
      placement: p.placement,
      facing: p.facing,
      elevation: spec?.elevation ?? 0,
      height: p.height ?? spec?.targetHeight ?? 1.0,
      footprint: p.footprint ?? spec?.maxFootprint ?? 1.2,
      blocking: p.blocksMovement,
      role: p.role,
      width: p.width ?? null,
      glbRuntime: spec ? `${BREACH_V2_RUNTIME_KIT_ROOT}/${spec.sourceUrl.split("/").pop()}` : null,
      fireColor: spec?.fireColor ?? null,
      fireAnchorY: spec?.fireAnchorY ?? null,
      fireCastsShadow: spec?.fireCastsShadow ?? false,
      verticalScale: spec?.verticalScale ?? null,
      note: isArt ? "framed PBR plane (runbook §5A)" : isBooks ? "texture-based book/scroll prop" : null,
    };
  });

  const rooms = [
    ...gen.fixedRooms.map((r) => ({
      id: r.id, name: r.name, kind: r.kind, fixed: true,
      x: r.x, z: r.y, w: r.w, h: r.h,
      corruption: CORRUPTION_BY_KIND[r.kind] ?? 0.2,
    })),
    ...gen.chambers.map((c) => ({
      id: c.id, name: c.name, kind: "gallery" as const, fixed: false, poolRoomId: c.poolRoomId,
      x: c.x, z: c.y, w: c.w, h: c.h,
      corruption: pathId === "wayfarer" ? 0.25 : 0.45,
    })),
  ];

  const corridors = gen.corridors.map((c) => ({
    id: c.id,
    points: [[c.from.x, c.from.y], [c.bend.x, c.bend.y], [c.to.x, c.to.y]],
    width: c.width,
  }));

  const landmarkOut = (id: string) => {
    const lm = R.landmarks.find((l) => l.id === id)!;
    const room = R.fixedRooms.find((r) => r.id === lm.roomId)!;
    return {
      id, roomId: lm.roomId, x: room.x + lm.x, z: room.y + lm.y,
      r: lm.r ?? null, apron: lm.apron ?? null, w: lm.w ?? null, label: lm.label,
    };
  };

  const fireLights = placements
    .filter((p) => p.fireAnchorY !== null)
    .map((p, i) => ({
      id: `fire-${i}`, x: p.x, z: p.z, y: p.elevation + (p.fireAnchorY ?? 0),
      color: p.fireColor === "soul" ? "#7fe8ff" : "#ff9a50",
      intensity: p.asset === "wall-torch-sconce" ? 0.55 : 0.8,
      radius: 7.0, castsShadow: p.fireCastsShadow,
    }));
  const well = landmarkOut("soul-well");
  const lights = [
    ...fireLights,
    { id: "soul-well-glow", x: well.x, z: well.z, y: 1.6, color: "#7fe8ff", intensity: 2.2, radius: 10.0, castsShadow: true },
    { id: "boss-ember", x: gen.boss.x, z: gen.boss.y, y: 3.4, color: "#ff6a3c", intensity: 1.6, radius: 14.0, castsShadow: true },
    { id: "memory-glow", x: gen.firstMemory.x, z: gen.firstMemory.y, y: 1.8, color: "#c9a8ff", intensity: 1.4, radius: 7.0, castsShadow: false },
    { id: "exit-daylight", x: gen.exitPoint.x, z: gen.exitPoint.y, y: 3.0, color: "#cfe8c0", intensity: 1.5, radius: 10.0, castsShadow: false },
  ];

  return {
    meta: {
      dungeon: R.id, seed, path: pathId, navCell: R.units.navCellMeters,
      chamberCount: gen.chamberCount, comparisonSeed: 4182,
      sourceMap: R.sourceMap, generator: "src/game/dungeons/breach-v2-generator.ts",
    },
    rooms,
    corridors,
    placements,
    landmarks: {
      soulWell: well,
      playerStart: { x: gen.playerStart.x, z: gen.playerStart.y },
      ilyra: landmarkOut("ilyra"),
      memoryLoom: landmarkOut("memory-loom"),
      coffer: landmarkOut("coffer"),
      effigy: landmarkOut("effigy"),
      orren: landmarkOut("orren"),
      brannoc: landmarkOut("brannoc"),
      doorWayfarer: landmarkOut("door-wayfarer"),
      doorOathbreaker: landmarkOut("door-oathbreaker"),
      firstMemory: { x: gen.firstMemory.x, z: gen.firstMemory.y },
      exitPoint: { x: gen.exitPoint.x, z: gen.exitPoint.y },
    },
    enemies: gen.enemies.map((e) => ({ id: e.id, kind: e.kind, x: e.x, z: e.y, maxHp: e.maxHp })),
    boss: { id: gen.boss.id, pattern: gen.boss.pattern, x: gen.boss.x, z: gen.boss.y, maxHp: gen.boss.maxHp },
    lights,
    pressures: { gallery: gen.galleryPressure, boss: gen.bossPressure },
    rewardId: gen.rewardId,
    bonusSkillAwakened: gen.bonusSkillAwakened,
  };
}

export type BreachV2Layout = ReturnType<typeof buildBreachV2Layout>;
