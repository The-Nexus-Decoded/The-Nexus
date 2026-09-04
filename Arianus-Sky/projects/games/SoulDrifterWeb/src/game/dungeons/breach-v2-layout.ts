/**
 * BREACH-V2 layout builder — the shared data assembly behind the Houdini
 * build (scripts/houdini/export-breach-v2-layout.mjs), the runtime fixtures
 * (scripts/export-breach-v2-runtime.mjs), and the live runtime preview.
 *
 * Deterministic per (seed, path): rooms/corridors/placements/lights/landmarks.
 * Collision truth always comes from the canonical runtime prop catalog.
 */

import { generateBreachV2 } from "./breach-v2-generator.ts";
import { BREACH_V2_REGISTRY as R } from "./breach-v2-registry.mjs";
import type {
  BreachV2CollisionResolverPlacement,
  BreachV2PathId,
} from "./breach-v2-generator.ts";
import { buildBreachV2TopologyManifest } from "./breach-v2-topology.ts";
import { DUNGEON_PROP_ASSETS } from "../environment/DungeonPropCatalog.ts";

export interface BreachV2CatalogSpec {
  sourceUrl: string;
  blocksMovement: boolean;
  targetHeight: number;
  maxFootprint: number;
  elevation?: number;
  verticalScale?: number;
  fireAnchorY?: number;
  fireColor?: "soul" | "cinder";
  fireCastsShadow?: boolean;
}

export interface BreachV2CollisionContractStage {
  blocksMovement: boolean;
  source: string;
}

export type BreachV2CollisionResolutionKind =
  | "catalog-registry-agreement"
  | "registry-only"
  | "approved-override"
  | "runtime-owner-delegation"
  | "procedural-declaration";

export interface BreachV2CollisionContract {
  catalogDefault: BreachV2CollisionContractStage | null;
  registryDeclaration: BreachV2CollisionContractStage | null;
  resolution: BreachV2CollisionContractStage & {
    kind: BreachV2CollisionResolutionKind;
    reasonCode: string;
    reason: string;
  };
  effective: BreachV2CollisionContractStage;
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

interface CollisionPlacementInput {
  asset: string;
  roomId: string;
  x: number;
  y: number;
  placement: "floor" | "wall" | "ceiling";
  blocksMovement: boolean;
}

function collisionStage(blocksMovement: boolean, source: string): BreachV2CollisionContractStage {
  return { blocksMovement, source };
}

function resolvePlacementCollisionContract(
  placement: CollisionPlacementInput,
  spec: BreachV2CatalogSpec | null,
): BreachV2CollisionContract {
  const registrySource = [
    "BREACH_V2_REGISTRY",
    placement.roomId,
    placement.asset,
    `${placement.x.toFixed(3)},${placement.y.toFixed(3)}`,
  ].join(":");
  const catalogDefault = spec
    ? collisionStage(spec.blocksMovement, `DUNGEON_PROP_ASSETS:${placement.asset}`)
    : null;
  const registryDeclaration = collisionStage(placement.blocksMovement, registrySource);

  let resolution: BreachV2CollisionContract["resolution"];
  if (placement.asset === "heavy-door") {
    resolution = {
      kind: "runtime-owner-delegation",
      blocksMovement: false,
      source: "breach-v2-topology:sectionPortals",
      reasonCode: "section-portal-owns-live-door-leaf",
      reason: "The registry heavy-door placement is a visual marker; the generated section portal owns the live leaf, state, and collision.",
    };
  } else if (!catalogDefault) {
    resolution = {
      kind: "registry-only",
      blocksMovement: registryDeclaration.blocksMovement,
      source: registryDeclaration.source,
      reasonCode: "asset-not-in-runtime-prop-catalog",
      reason: "This generated art or readable placement has no runtime GLB catalog entry, so its registry declaration is the complete collision contract.",
    };
  } else if (catalogDefault.blocksMovement === registryDeclaration.blocksMovement) {
    resolution = {
      kind: "catalog-registry-agreement",
      blocksMovement: registryDeclaration.blocksMovement,
      source: `${catalogDefault.source}+${registryDeclaration.source}`,
      reasonCode: "catalog-registry-collision-agreement",
      reason: "The catalog default and registry declaration agree, so the generated placement preserves that shared value.",
    };
  } else if (placement.placement === "floor"
    && catalogDefault.blocksMovement
    && !registryDeclaration.blocksMovement) {
    resolution = {
      kind: "approved-override",
      blocksMovement: true,
      source: "The-Nexus#451:prop-complete-collision-reconciliation",
      reasonCode: "catalog-solid-floor-overrides-legacy-registry-nonblocking",
      reason: "The legacy registry dressing bit predates prop-complete collision; the catalog's solid floor footprint governs while the fixture or destructible cover remains intact.",
    };
  } else {
    throw new Error(
      `Unapproved BREACH-V2 collision contract disagreement for ${registrySource}: `
      + `catalog=${catalogDefault.blocksMovement}, registry=${registryDeclaration.blocksMovement}`,
    );
  }

  return {
    catalogDefault,
    registryDeclaration,
    resolution,
    effective: collisionStage(resolution.blocksMovement, resolution.source),
  };
}

function proceduralBossCoverCollisionContract(index: number): BreachV2CollisionContract {
  const resolution: BreachV2CollisionContract["resolution"] = {
    kind: "procedural-declaration",
    blocksMovement: true,
    source: `breach-v2-layout:BOSS_COVER_LOCAL_POSITIONS:${index}`,
    reasonCode: "authoritative-procedural-destructible-cover",
    reason: "This generated boss pillar is intact destructible combat cover and owns a solid runtime footprint until its destruction state removes it.",
  };
  return {
    catalogDefault: null,
    registryDeclaration: null,
    resolution,
    effective: collisionStage(resolution.blocksMovement, resolution.source),
  };
}

const BOSS_COVER_LOCAL_POSITIONS = [
  [-10, -2], [-10, 3], [-5, 0], [5, 0], [10, -2], [10, 3],
] as const;

export function buildBreachV2Layout(
  seed: number,
  pathId: BreachV2PathId,
  catalog: Record<string, BreachV2CatalogSpec> = DUNGEON_PROP_ASSETS,
) {
  if (catalog !== DUNGEON_PROP_ASSETS) {
    throw new Error(
      "buildBreachV2Layout requires the canonical DUNGEON_PROP_ASSETS catalog; "
      + "partial, cloned, or caller-authored catalogs cannot define runtime collision truth.",
    );
  }

  const canonicalCollisionResolver = (placement: BreachV2CollisionResolverPlacement): boolean => (
    resolvePlacementCollisionContract({
      asset: placement.asset,
      roomId: placement.roomId,
      x: placement.x,
      y: placement.y,
      placement: placement.placement,
      blocksMovement: placement.blocking,
    }, catalog[placement.asset] ?? null).effective.blocksMovement
  );
  const gen = generateBreachV2(seed, pathId, canonicalCollisionResolver);

  const placements = gen.placements.map((p) => {
    const spec = catalog[p.asset] ?? null;
    const isArt = p.role === "wall-art";
    const isBooks = p.group === "books";
    const collisionContract = resolvePlacementCollisionContract({
      asset: p.asset,
      roomId: p.roomId,
      x: p.x,
      y: p.y,
      placement: p.placement,
      blocksMovement: p.blocking,
    }, spec);
    if (p.blocksMovement !== collisionContract.effective.blocksMovement) {
      throw new Error(
        `BREACH-V2 generator/runtime collision drift for ${p.roomId}:${p.asset}`,
      );
    }
    return {
      asset: p.asset,
      roomId: p.roomId,
      zone: p.zoneId,
      x: p.worldX,
      z: p.worldY,
      yaw: p.placement === "wall" ? (FACING_YAW[p.facing] ?? 0) : propYaw(p.asset, p.x, p.y),
      placement: p.placement,
      facing: p.facing,
      elevation: p.floorElevation + (p.elevation ?? spec?.elevation ?? 0),
      floorElevation: p.floorElevation,
      height: p.height ?? spec?.targetHeight ?? 1.0,
      footprint: p.footprint ?? spec?.maxFootprint ?? 1.2,
      blocking: collisionContract.effective.blocksMovement,
      collisionContract,
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
      floorElevation: r.floorElevation,
      endElevation: r.kind === "exit" ? R.worldAnchor.elevation : r.floorElevation,
      corruption: CORRUPTION_BY_KIND[r.kind] ?? 0.2,
    })),
    ...gen.chambers.map((c) => ({
      id: c.id, name: c.name, kind: "gallery" as const, fixed: false, poolRoomId: c.poolRoomId,
      x: c.x, z: c.y, w: c.w, h: c.h,
      floorElevation: c.floorElevation,
      endElevation: c.floorElevation,
      corruption: pathId === "wayfarer" ? 0.25 : 0.45,
    })),
  ];

  // These six pillars were previously emitted only by render code. Register
  // the unchanged transforms here so staging, collision, LOS, destruction and
  // rendering consume one authoritative environment inventory.
  const bossRoom = rooms.find((room) => room.kind === "boss")!;
  const bossCenterX = bossRoom.x + bossRoom.w / 2;
  const bossCenterZ = bossRoom.z + bossRoom.h / 2;
  for (const [index, [offsetX, offsetZ]] of BOSS_COVER_LOCAL_POSITIONS.entries()) {
    const collisionContract = proceduralBossCoverCollisionContract(index);
    placements.push({
      asset: "boss-cover-pillar",
      roomId: bossRoom.id,
      zone: "boss",
      x: bossCenterX + offsetX,
      z: bossCenterZ + offsetZ,
      yaw: 0,
      placement: "floor",
      facing: "up",
      elevation: bossRoom.floorElevation,
      floorElevation: bossRoom.floorElevation,
      height: 3.22,
      footprint: 1.7,
      blocking: collisionContract.effective.blocksMovement,
      collisionContract,
      role: "destructible-cover",
      width: null,
      glbRuntime: null,
      fireColor: null,
      fireAnchorY: null,
      fireCastsShadow: false,
      verticalScale: null,
      note: `authoritative procedural combat-cover pillar ${index + 1}`,
    });
  }

  const corridors = gen.corridors.map((c) => ({
    id: c.id,
    sourceRoomId: c.sourceRoomId,
    destinationRoomId: c.destinationRoomId,
    connectionType: c.connectionType,
    points: c.points.map((point): [number, number] => [point.x, point.y]),
    width: c.width,
    elevations: [...c.elevations],
    externalDestination: c.externalDestination ?? false,
  }));

  const landmarkOut = (id: string) => {
    const lm = R.landmarks.find((l) => l.id === id)!;
    const room = R.fixedRooms.find((r) => r.id === lm.roomId)!;
    return {
      id, roomId: lm.roomId, x: room.x + lm.x, z: room.y + lm.y, elevation: room.floorElevation,
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
  const doorWayfarer = landmarkOut("door-wayfarer");
  const doorOathbreaker = landmarkOut("door-oathbreaker");
  const inactiveRouteDoor = pathId === "wayfarer" ? doorOathbreaker : doorWayfarer;
  const inactiveRouteId = pathId === "wayfarer" ? "oathbreaker" : "wayfarer";
  const routePortalWidth = corridors.find((corridor) => corridor.id === "corridor-entry")?.width ?? 3.5;
  const lights = [
    ...fireLights,
    { id: "soul-well-glow", x: well.x, z: well.z, y: well.elevation + 1.6, color: "#7fe8ff", intensity: 2.2, radius: 10.0, castsShadow: true },
    { id: "boss-ember", x: gen.boss.x, z: gen.boss.y, y: gen.boss.floorElevation + 3.4, color: "#ff6a3c", intensity: 1.6, radius: 14.0, castsShadow: true },
    { id: "memory-glow", x: gen.firstMemory.x, z: gen.firstMemory.y, y: gen.firstMemory.floorElevation + 1.8, color: "#c9a8ff", intensity: 1.4, radius: 7.0, castsShadow: false },
    { id: "exit-daylight", x: gen.exitPoint.x, z: gen.exitPoint.y, y: gen.exitPoint.floorElevation + 3.0, color: "#cfe8c0", intensity: 1.5, radius: 10.0, castsShadow: false },
  ];
  const topology = buildBreachV2TopologyManifest({
    ticket: 451,
    seed,
    pathId,
    rooms,
    corridors,
    logicalGraph: gen.logicalGraph,
    placement: gen.placement,
    supplementalApertures: [{
      apertureId: `route-choice-${inactiveRouteId}`,
      roomId: "threshold-plaza",
      center: [inactiveRouteDoor.x, inactiveRouteDoor.z],
      clearWidth: routePortalWidth,
      assembly: "PORTCULLIS",
      runtimeConnectorId: `${inactiveRouteId}-choice`,
      purpose: "SEALED_ROUTE_CHOICE",
    }],
  });
  const supplementalApertureIds = new Set(
    topology.supplementalAssemblies.map((assembly) => assembly.apertureId),
  );
  const sectionPortals = topology.boundaries.flatMap((boundary) => (
    boundary.apertures.flatMap((aperture) => {
      if ((aperture.assembly !== "DOOR" && aperture.assembly !== "PORTCULLIS")
        || !aperture.runtimeConnectorId) return [];
      return [{
        id: aperture.runtimeConnectorId,
        apertureId: aperture.apertureId,
        boundaryId: boundary.boundaryId,
        x: (aperture.start[0] + aperture.end[0]) / 2,
        z: (aperture.start[1] + aperture.end[1]) / 2,
        axis: Math.abs(boundary.start[0] - boundary.end[0]) < 0.001 ? "x" as const : "z" as const,
        kind: aperture.assembly === "PORTCULLIS" ? "gate" as const : "door" as const,
        clearWidth: aperture.clearWidth,
        clearHeight: aperture.clearHeight,
        frontNormal: { ...aperture.upstreamNormal },
        active: !supplementalApertureIds.has(aperture.apertureId),
        routeChoice: aperture.runtimeConnectorId.endsWith("-choice"),
      }];
    })
  ));

  return {
    meta: {
      dungeon: R.id, seed, path: pathId, navCell: R.units.navCellMeters,
      chamberCount: gen.chamberCount, comparisonSeed: 4182,
      sourceMap: R.sourceMap, generator: "src/game/dungeons/breach-v2-generator.ts",
    },
    rooms,
    corridors,
    logicalGraph: gen.logicalGraph,
    placement: gen.placement,
    topology,
    sectionPortals,
    placements,
    landmarks: {
      soulWell: well,
      playerStart: { x: gen.playerStart.x, z: gen.playerStart.y, elevation: gen.playerStart.floorElevation },
      ilyra: landmarkOut("ilyra"),
      memoryLoom: landmarkOut("memory-loom"),
      coffer: landmarkOut("coffer"),
      effigy: landmarkOut("effigy"),
      orren: landmarkOut("orren"),
      brannoc: landmarkOut("brannoc"),
      doorWayfarer,
      doorOathbreaker,
      firstMemory: { x: gen.firstMemory.x, z: gen.firstMemory.y, elevation: gen.firstMemory.floorElevation },
      exitPoint: { x: gen.exitPoint.x, z: gen.exitPoint.y, elevation: gen.exitPoint.floorElevation },
    },
    enemies: gen.enemies.map((e) => ({ id: e.id, kind: e.kind, x: e.x, z: e.y, elevation: e.floorElevation, maxHp: e.maxHp })),
    boss: { id: gen.boss.id, pattern: gen.boss.pattern, x: gen.boss.x, z: gen.boss.y, elevation: gen.boss.floorElevation, maxHp: gen.boss.maxHp },
    lights,
    pressures: { gallery: gen.galleryPressure, boss: gen.bossPressure },
    rewardId: gen.rewardId,
    bonusSkillAwakened: gen.bonusSkillAwakened,
  };
}

export type BreachV2Layout = ReturnType<typeof buildBreachV2Layout>;
