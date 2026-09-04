import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { breachV2CellKey, generateBreachV2 } from "../src/game/dungeons/breach-v2-generator";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import {
  BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS,
  BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS,
  buildBreachV2EnvironmentObjectConfigs,
  buildBreachV2DoorLeafCollider,
  buildBreachV2LandmarkColliders,
  buildBreachV2PlacementColliders,
  buildBreachV2ShellColliders,
  auditBreachV2SpatialContracts,
  findBreachV2AdaptiveRuntimePath,
  findBreachV2RuntimePath,
  firstBreachV2CameraHit,
  filterBreachV2RemovedColliders,
  getBreachV2ApertureSpanClearHeight,
  getBreachV2ClosedDoorYaw,
  hasDungeonFloorAt,
  isBreachV2LineOfSightBlocked,
  isBreachV2PlacementBlocked,
  isBreachV2PortalClosureSafe,
  resolveBreachV2WorldY,
  sweepBreachV2Movement,
  type BreachV2PlanarCollider,
  type BreachV2PlacementProxyMeasurement,
} from "../src/game/dungeons/breach-v2-preview";
import {
  BREACH_V2_DEFAULT_APERTURE_CLEAR_HEIGHT,
  BREACH_V2_HEAVY_DOOR_APERTURE_HEIGHT,
  BREACH_V2_HEAVY_DOOR_APERTURE_WIDTH,
  splitBreachV2Boundary,
} from "../src/game/dungeons/breach-v2-topology";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";
import { instantiateDungeonProp } from "../src/game/environment/DungeonPropKit";
import {
  disposeSoulwellChamberResources,
} from "../src/game/environment/rooms/SoulwellChamber";
import type { SoulwellMaterialLibrary } from "../src/game/environment/MaterialLibrary";

const PATHS = ["wayfarer", "oathbreaker"] as const;
const SUPPORTED_ROUTE_SEEDS = [1, 2, 7, 4182] as const;
const RANDOM_ROUTE_SEEDS = [3, 5, 11, 17, 31, 47, 73, 97, 193, 389, 887, 1597] as const;
const CAPSULE_PROFILES = [
  { id: "player", radius: 0.35 },
  { id: "humanoid-npc", radius: 0.45 },
] as const;
const importNodeModule = (specifier: string) => import(specifier);
const fittedAssetBounds = new Map<string, THREE.Box3>();

function disposeObjectResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    (Array.isArray(child.material) ? child.material : [child.material])
      .forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

async function loadFittedAssetBounds(
  asset: keyof typeof DUNGEON_PROP_ASSETS,
  targetHeight: number,
  maxFootprint: number,
): Promise<THREE.Box3> {
  const key = `${asset}:${targetHeight}:${maxFootprint}`;
  const cached = fittedAssetBounds.get(key);
  if (cached) return cached.clone();
  const [{ readFile }, { fileURLToPath }] = await Promise.all([
    importNodeModule("node:fs/promises"),
    importNodeModule("node:url"),
  ]);
  const sourcePath = fileURLToPath(new URL(
    `../public${DUNGEON_PROP_ASSETS[asset].sourceUrl}`,
    import.meta.url,
  ));
  const bytes = await readFile(sourcePath);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
  const originalError = console.error;
  let source: THREE.Object3D | null = null;
  let instance: ReturnType<typeof instantiateDungeonProp> | null = null;
  try {
    console.error = () => undefined;
    source = (await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(buffer, "")).scene;
    instance = instantiateDungeonProp(source, {
      ...DUNGEON_PROP_ASSETS[asset],
      targetHeight,
      maxFootprint,
    }, 0);
    instance.root.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(instance.root, true);
    fittedAssetBounds.set(key, bounds.clone());
    return bounds;
  } finally {
    console.error = originalError;
    instance?.dispose();
    if (source) disposeObjectResources(source);
  }
}

async function buildFittedPlacementMeasurements(
  layout: ReturnType<typeof buildBreachV2Layout>,
): Promise<BreachV2PlacementProxyMeasurement[]> {
  const measurements: BreachV2PlacementProxyMeasurement[] = [];
  for (const [index, placement] of layout.placements.entries()) {
    if (!placement.blocking || !placement.glbRuntime || placement.asset === "ruined-stone-archway") {
      continue;
    }
    const asset = placement.asset as keyof typeof DUNGEON_PROP_ASSETS;
    const needsCandleStand = asset === "candelabra-cluster"
      && placement.elevation - placement.floorElevation < 0.2;
    const bounds = await loadFittedAssetBounds(
      asset,
      needsCandleStand ? 0.72 : placement.height,
      needsCandleStand ? 0.82 : placement.footprint,
    );
    if (needsCandleStand) {
      bounds.union(await loadFittedAssetBounds("reinforced-crate", 0.74, 0.9));
    }
    const sourceYawCorrections: Partial<Record<keyof typeof DUNGEON_PROP_ASSETS, number>> = {
      "archive-bookshelf": 90,
      "archive-cupboard": 90,
      "empty-weapon-rack": 90,
      "guardian-statue": 270,
      "reliquary-wall-alcove": 90,
    };
    const sourceYawCorrection = sourceYawCorrections[asset] ?? 0;
    const tutorialAsset = placement.roomId === "vestibule" && [
      "trestle-table", "high-backed-chair", "storage-chest",
      "reinforced-crate", "storage-barrel",
    ].includes(asset);
    const authoredFloorFacing = tutorialAsset || asset === "guardian-statue";
    const vestibuleGuardianFacing = placement.roomId === "vestibule" && asset === "guardian-statue"
      ? 270
      : null;
    const authoredYaw = vestibuleGuardianFacing ?? (authoredFloorFacing
      ? ({ north: 0, east: 90, south: 180, west: 270 }[placement.facing] ?? placement.yaw)
      : placement.yaw);
    const yaw = THREE.MathUtils.degToRad(authoredYaw + sourceYawCorrection);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    measurements.push({
      id: `${placement.roomId}:${placement.asset}:${index}`,
      centerX: placement.x + center.x * cosine + center.z * sine,
      centerZ: placement.z - center.x * sine + center.z * cosine,
      halfX: size.x / 2,
      halfZ: size.z / 2,
      yaw,
      minY: placement.elevation + bounds.min.y,
      maxY: placement.elevation + bounds.max.y + (needsCandleStand ? 0.76 : 0),
    });
  }
  return measurements;
}

function makeRuntimeCanStandAt(
  layout: ReturnType<typeof buildBreachV2Layout>,
  generated: ReturnType<typeof generateBreachV2>,
  radius: number,
  includeDiagnosticBlockedCells = false,
  placementMeasurements: readonly BreachV2PlacementProxyMeasurement[] = [],
): (x: number, z: number) => boolean {
  const navCell = layout.meta.navCell;
  const walkable = new Set(generated.navCells.map(breachV2CellKey));
  if (includeDiagnosticBlockedCells) {
    for (const cell of generated.blockedCells) walkable.delete(breachV2CellKey(cell));
  }
  const colliders = [
    ...buildBreachV2ShellColliders(layout),
    ...buildBreachV2PlacementColliders(layout, placementMeasurements),
    ...buildBreachV2LandmarkColliders(layout),
  ];
  return (x: number, z: number): boolean => {
    if (isBreachV2PlacementBlocked(colliders, x, z, radius)) return false;
    return ([[radius, radius], [radius, -radius], [-radius, radius], [-radius, -radius]] as const)
      .every(([offsetX, offsetZ]) => (
        hasDungeonFloorAt(layout, x + offsetX, z + offsetZ)
        && walkable.has(
          `${Math.floor((x + offsetX) / navCell)},${Math.floor((z + offsetZ) / navCell)}`,
        )
      ));
  };
}

function findRuntimeStart(
  layout: ReturnType<typeof buildBreachV2Layout>,
  canStandAt: (x: number, z: number) => boolean,
): { x: number; z: number } | null {
  const authored = {
    x: layout.landmarks.playerStart.x,
    z: layout.landmarks.playerStart.z,
  };
  if (canStandAt(authored.x, authored.z)) return authored;
  for (let radius = layout.meta.navCell; radius <= layout.meta.navCell * 5; radius += layout.meta.navCell) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const candidate = {
        x: authored.x + Math.cos(angle) * radius,
        z: authored.z + Math.sin(angle) * radius,
      };
      if (canStandAt(candidate.x, candidate.z)) return candidate;
    }
  }
  return null;
}

function expectSweptProfileRoute(
  label: string,
  start: { x: number; z: number },
  route: readonly { x: number; z: number }[],
  canStandAt: (x: number, z: number) => boolean,
): void {
  let previous = start;
  for (const [index, point] of route.entries()) {
    expect(
      sweepBreachV2Movement(previous, point, canStandAt).completed,
      `${label}:continuous-sweep:${index}`,
    ).toBe(true);
    previous = point;
  }
}

describe("BREACH-V2 canonical topology renderer inventory", () => {
  it("disposes every unique Soulwell-owned geometry and cloned material exactly once", () => {
    const root = new THREE.Group();
    const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const clonedMaterial = new THREE.MeshStandardMaterial();
    const libraryMaterial = new THREE.MeshStandardMaterial();
    root.add(
      new THREE.Mesh(sharedGeometry, clonedMaterial),
      new THREE.Mesh(sharedGeometry, [clonedMaterial, libraryMaterial]),
    );
    let geometryDisposals = 0;
    let clonedMaterialDisposals = 0;
    let libraryDisposals = 0;
    sharedGeometry.addEventListener("dispose", () => { geometryDisposals += 1; });
    clonedMaterial.addEventListener("dispose", () => { clonedMaterialDisposals += 1; });
    const materials = {
      flagstone: libraryMaterial,
      masonry: libraryMaterial,
      masonryOccluder: libraryMaterial,
      bronze: libraryMaterial,
      oak: libraryMaterial,
      darkIron: libraryMaterial,
      soulglass: libraryMaterial,
      soulwater: libraryMaterial,
      moss: libraryMaterial,
      ash: libraryMaterial,
      tomes: [libraryMaterial, libraryMaterial, libraryMaterial],
      void: libraryMaterial,
      dispose: () => { libraryDisposals += 1; },
    } as unknown as SoulwellMaterialLibrary;

    disposeSoulwellChamberResources(root, materials);

    expect(geometryDisposals).toBe(1);
    expect(clonedMaterialDisposals).toBe(1);
    expect(libraryDisposals).toBe(1);
  });

  it("reconciles one explicit collision contract across the supported seed and route matrix", () => {
    for (const seed of [1, 2, 7, 4182]) {
      for (const pathId of PATHS) {
        const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);

        for (const [index, placement] of layout.placements.entries()) {
          const label = `${seed}:${pathId}:${placement.roomId}:${placement.asset}:${index}`;
          const contract = placement.collisionContract;
          expect(placement.blocking, `${label}:effective`).toBe(contract.effective.blocksMovement);
          expect(contract.effective.source, `${label}:effective-source`).not.toHaveLength(0);
          expect(contract.resolution.source, `${label}:resolution-source`).not.toHaveLength(0);
          expect(contract.resolution.reasonCode, `${label}:reason-code`).not.toHaveLength(0);
          expect(contract.resolution.reason, `${label}:reason`).not.toHaveLength(0);

          if (
            contract.catalogDefault
            && contract.registryDeclaration
            && contract.catalogDefault.blocksMovement !== contract.registryDeclaration.blocksMovement
          ) {
            expect(
              ["approved-override", "runtime-owner-delegation"],
              `${label}:disagreement-must-be-explicit`,
            ).toContain(contract.resolution.kind);
          }
          if (contract.resolution.kind === "runtime-owner-delegation") {
            expect(placement.asset, `${label}:delegated-owner`).toBe("heavy-door");
            expect(contract.effective.blocksMovement, `${label}:delegated-marker`).toBe(false);
          }
        }
      }
    }
  });

  it("keeps every supported seed and route as one physically resolved topology", () => {
    for (const seed of [1, 2, 7, 4182]) {
      for (const pathId of PATHS) {
        const topology = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS).topology;
        const label = `${seed}:${pathId}`;

        expect(topology.automatedGate, label).toBe("PASS");
        expect(topology.metrics.connectedPhysicalComponents, `${label}:components`).toBe(1);
        expect(topology.metrics.physicallyResolvedEdges, `${label}:resolved-edges`)
          .toBe(topology.metrics.requiredLogicalEdges);
        expect(
          topology.logicalGraph.edges.every((edge) => edge.physicalResolutionStatus === "RESOLVED"),
          `${label}:logical-edge-resolution`,
        ).toBe(true);
        expect(
          topology.connections.every((connection) => (
            connection.floorContinuity === "PASS"
            && connection.ceilingContinuity === "PASS"
            && connection.collisionContinuity === "PASS"
            && connection.navigationContinuity === "PASS"
          )),
          `${label}:connection-continuity`,
        ).toBe(true);
      }
    }
  });

  it("keeps every authored prop while preserving both capsule routes on supported seeds", async () => {
    for (const seed of SUPPORTED_ROUTE_SEEDS) {
      for (const pathId of PATHS) {
        const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
        const generated = generateBreachV2(seed, pathId);
        const placementMeasurements = await buildFittedPlacementMeasurements(layout);
        const measuredPlacementCount = layout.placements.filter((placement) => (
          placement.blocking
          && placement.glbRuntime
          && placement.asset !== "ruined-stone-archway"
        )).length;
        expect(placementMeasurements, `${seed}:${pathId}:fitted-collider-coverage`)
          .toHaveLength(measuredPlacementCount);
        expect(layout.placements, `${seed}:${pathId}:authored-inventory`)
          .toHaveLength(generated.placements.length + 6);
        for (const [index, placement] of generated.placements.entries()) {
          expect(placement.blocksMovement, `${seed}:${pathId}:${index}:generator-layout-parity`)
            .toBe(layout.placements[index]!.collisionContract.effective.blocksMovement);
        }
        for (const profile of CAPSULE_PROFILES) {
          const label = `${seed}:${pathId}:${profile.id}`;
          const canStandAt = makeRuntimeCanStandAt(
            layout,
            generated,
            profile.radius,
            false,
            placementMeasurements,
          );
          const start = findRuntimeStart(layout, canStandAt);
          expect(start, `${label}:start`).not.toBeNull();
          const route = findBreachV2AdaptiveRuntimePath(
            start!,
            layout.landmarks.exitPoint,
            layout.meta.navCell / 2,
            canStandAt,
          );
          expect(route.length, `${label}:whole-route`).toBeGreaterThan(0);
          expectSweptProfileRoute(label, start!, route, canStandAt);
        }
      }
    }
  }, 60_000);

  it("keeps coarse blocked cells separate from fitted runtime collision truth", async () => {
    const layout = buildBreachV2Layout(1, "wayfarer", DUNGEON_PROP_ASSETS);
    const generated = generateBreachV2(1, "wayfarer");
    const placementMeasurements = await buildFittedPlacementMeasurements(layout);
    const exactCanStandAt = makeRuntimeCanStandAt(
      layout, generated, 0.45, false, placementMeasurements,
    );
    const diagnosticCanStandAt = makeRuntimeCanStandAt(
      layout, generated, 0.45, true, placementMeasurements,
    );
    const exactStart = findRuntimeStart(layout, exactCanStandAt);
    const diagnosticStart = findRuntimeStart(layout, diagnosticCanStandAt);

    expect(generated.blockedCells.length).toBeGreaterThan(0);
    expect(exactStart).not.toBeNull();
    expect(diagnosticStart).not.toBeNull();
    const exactRoute = findBreachV2AdaptiveRuntimePath(
      exactStart!,
      layout.landmarks.exitPoint,
      layout.meta.navCell / 2,
      exactCanStandAt,
    );
    const diagnosticRoute = findBreachV2AdaptiveRuntimePath(
      diagnosticStart!,
      layout.landmarks.exitPoint,
      layout.meta.navCell / 2,
      diagnosticCanStandAt,
    );
    const coarseOnlyExclusions = generated.blockedCells.filter((cell) => {
      const x = (cell.col + 0.5) * layout.meta.navCell;
      const z = (cell.row + 0.5) * layout.meta.navCell;
      return exactCanStandAt(x, z) && !diagnosticCanStandAt(x, z);
    });
    expect(exactRoute.length).toBeGreaterThan(0);
    expect(diagnosticRoute.length).toBeGreaterThan(0);
    expect(coarseOnlyExclusions.length).toBeGreaterThan(0);
  }, 20_000);

  it("preserves both capsule routes across a deterministic random-seed sweep", async () => {
    for (const seed of RANDOM_ROUTE_SEEDS) {
      for (const pathId of PATHS) {
        const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
        const generated = generateBreachV2(seed, pathId);
        const placementMeasurements = await buildFittedPlacementMeasurements(layout);
        for (const profile of CAPSULE_PROFILES) {
          const label = `${seed}:${pathId}:${profile.id}`;
          const canStandAt = makeRuntimeCanStandAt(
            layout,
            generated,
            profile.radius,
            false,
            placementMeasurements,
          );
          const start = findRuntimeStart(layout, canStandAt);
          expect(start, `${label}:start`).not.toBeNull();
          const route = findBreachV2AdaptiveRuntimePath(
            start!,
            layout.landmarks.exitPoint,
            layout.meta.navCell / 2,
            canStandAt,
          );
          expect(route.length, `${label}:whole-route`).toBeGreaterThan(0);
          expectSweptProfileRoute(label, start!, route, canStandAt);
        }
      }
    }
  }, 120_000);

  it("audits dynamic portals bidirectionally without exempting state-driven doors", () => {
    const makePortal = (
      spatialOwnerId: string,
      blocksMovement: boolean,
      blocksLineOfSight = blocksMovement,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.2));
      mesh.name = spatialOwnerId;
      mesh.position.y = 1;
      mesh.userData = {
        spatialOwnerId,
        collisionMode: "dynamic-portal",
        collisionStateDriven: true,
        blocksMovement,
        blocksLineOfSight,
        collisionId: `portal:${spatialOwnerId}`,
      };
      return mesh;
    };
    const collider = (id: string, blocksMovement: boolean): BreachV2PlanarCollider => ({
      id,
      asset: "test-portal",
      roomId: "test-room",
      ownerClass: "portal",
      shape: "aabb",
      minX: -0.5,
      maxX: 0.5,
      minZ: -0.1,
      maxZ: 0.1,
      minY: 0,
      maxY: 2,
      blocksMovement,
      blocksLineOfSight: true,
    });

    const missingScene = new THREE.Scene();
    missingScene.add(makePortal("closed-dynamic-door", true));
    const missing = auditBreachV2SpatialContracts(missingScene, []);
    expect(missing.missingBlockingColliderOwnerIds).toEqual(["closed-dynamic-door"]);
    expect(missing.missingLineOfSightColliderOwnerIds).toEqual(["closed-dynamic-door"]);

    const nonblockingScene = new THREE.Scene();
    nonblockingScene.add(makePortal("raised-portcullis", false, false));
    const unexpected = auditBreachV2SpatialContracts(
      nonblockingScene,
      [collider("portal:raised-portcullis", true)],
    );
    expect(unexpected.unexpectedMovementColliderOwnerIds).toEqual(["raised-portcullis"]);
    expect(unexpected.unexpectedLineOfSightColliderOwnerIds).toEqual(["raised-portcullis"]);

    const lineOfSightScene = new THREE.Scene();
    lineOfSightScene.add(makePortal("vision-curtain", false, true));
    const lineOfSightOnly = auditBreachV2SpatialContracts(
      lineOfSightScene,
      [collider("portal:vision-curtain", false)],
    );
    expect(lineOfSightOnly.unexpectedMovementColliderOwnerIds).toEqual([]);
    expect(lineOfSightOnly.missingBlockingColliderOwnerIds).toEqual([]);
    expect(lineOfSightOnly.unexpectedLineOfSightColliderOwnerIds).toEqual([]);
    expect(lineOfSightOnly.missingLineOfSightColliderOwnerIds).toEqual([]);
    expect(lineOfSightOnly.unexplainedColliderIds).toEqual([]);
    expect(lineOfSightOnly.postFitProxyMismatchOwnerIds).toEqual([]);
  });

  it("excludes hidden state geometry from post-fit collision ownership", () => {
    const scene = new THREE.Scene();
    const coffer = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    coffer.name = "stateful-coffer";
    coffer.position.y = 0.5;
    coffer.userData = {
      spatialOwnerId: "stateful-coffer",
      collisionMode: "placement-solid",
      blocksMovement: true,
      blocksLineOfSight: false,
      collisionId: "stateful-coffer",
      postFitAuditMode: "exact",
    };
    const openLid = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1));
    openLid.name = "hidden-open-lid";
    openLid.position.y = 2;
    openLid.visible = false;
    openLid.userData.spatialAuditExcluded = "inactive-state-geometry";
    coffer.add(openLid);
    scene.add(coffer);
    const collider: BreachV2PlanarCollider = {
      id: "stateful-coffer",
      asset: "storage-chest",
      roomId: "vestibule",
      ownerClass: "placement",
      shape: "aabb",
      minX: -0.5,
      maxX: 0.5,
      minZ: -0.5,
      maxZ: 0.5,
      minY: 0,
      maxY: 1,
      blocksMovement: true,
      blocksLineOfSight: false,
    };

    expect(auditBreachV2SpatialContracts(scene, [collider]).postFitProxyMismatchOwnerIds).toEqual([]);
    coffer.visible = false;
    const culled = auditBreachV2SpatialContracts(scene, [collider]);
    expect(culled.unexplainedColliderIds).toEqual([]);
    expect(culled.missingBlockingColliderOwnerIds).toEqual([]);
    coffer.userData.dynamicRemoved = true;
    const removed = auditBreachV2SpatialContracts(scene, []);
    expect(removed.renderableCount).toBe(0);
    expect(removed.missingBlockingColliderOwnerIds).toEqual([]);
    expect(removed.unresolvedRenderableNames).toEqual([]);
  });

  it("classifies staged props and clears every destroyed spatial query without clearing protected fixtures", () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const configs = buildBreachV2EnvironmentObjectConfigs(layout);
      expect(configs).toHaveLength(layout.placements.length);

      const coffer = configs.find((config) => config.destructionClass === "INTERACTABLE_CONTAINER");
      expect(coffer, `${pathId}:coffer`).toBeDefined();
      expect(configs.some((config) => (
        config.id.includes("wooden-support-brace")
        && config.destructionClass === "DESTRUCTIBLE_SOLID_PROP"
      )), `${pathId}:wall-prop`).toBe(true);
      expect(configs.some((config) => (
        config.id.includes("floor-brazier")
        && config.destructionClass === "PROTECTED_PROP_OR_STRUCTURE"
      )), `${pathId}:protected-fixture`).toBe(true);

      const destructible = layout.placements
        .map((placement, index) => ({ placement, index }))
        .find(({ placement, index }) => (
          configs[index]?.destructionClass === "DESTRUCTIBLE_SOLID_PROP"
          && placement.blocking
          && placement.height >= 1.25
        ))!;
      const colliderId = `${destructible.placement.roomId}:${destructible.placement.asset}:${destructible.index}`;
      const intact = buildBreachV2PlacementColliders(layout)
        .filter((collider) => collider.id === colliderId);
      expect(intact, `${pathId}:intact-collider`).toHaveLength(1);
      expect(isBreachV2PlacementBlocked(
        intact,
        destructible.placement.x,
        destructible.placement.z,
        0.35,
      ), `${pathId}:intact-movement`).toBe(true);
      expect(isBreachV2LineOfSightBlocked(
        intact,
        { x: destructible.placement.x - 2, z: destructible.placement.z },
        { x: destructible.placement.x + 2, z: destructible.placement.z },
      ), `${pathId}:intact-los`).toBe(true);

      const destroyed = filterBreachV2RemovedColliders(intact, [colliderId]);
      expect(destroyed).toEqual([]);
      expect(isBreachV2PlacementBlocked(
        destroyed,
        destructible.placement.x,
        destructible.placement.z,
        0.35,
      ), `${pathId}:destroyed-movement-clear`).toBe(false);
      expect(isBreachV2LineOfSightBlocked(
        destroyed,
        { x: destructible.placement.x - 2, z: destructible.placement.z },
        { x: destructible.placement.x + 2, z: destructible.placement.z },
      ), `${pathId}:destroyed-los-clear`).toBe(false);
    }
  });

  it("uses fitted post-fit prop bounds instead of a generic invisible square", () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const placementIndex = layout.placements.findIndex((placement) => (
      placement.blocking && placement.placement === "floor" && placement.asset !== "ruined-stone-archway"
    ));
    const placement = layout.placements[placementIndex]!;
    const id = `${placement.roomId}:${placement.asset}:${placementIndex}`;
    const generic = buildBreachV2PlacementColliders(layout)
      .filter((candidate) => candidate.id === id);
    const measurement: BreachV2PlacementProxyMeasurement = {
      id,
      centerX: placement.x,
      centerZ: placement.z,
      halfX: 0.1,
      halfZ: Math.min(0.4, placement.footprint * 0.35),
      yaw: 0,
      minY: placement.elevation,
      maxY: placement.elevation + placement.height,
    };
    const fitted = buildBreachV2PlacementColliders(layout, [measurement])
      .filter((candidate) => candidate.id === id);
    const genericHalf = placement.footprint / 2;
    const falseSquarePoint = {
      x: placement.x + genericHalf * 0.8,
      z: placement.z,
    };

    expect(generic).toHaveLength(1);
    expect(fitted).toHaveLength(1);
    expect(fitted[0]).toMatchObject({
      shape: "oriented-box",
      halfX: measurement.halfX,
      halfZ: measurement.halfZ,
      blocksMovement: true,
    });
    expect(isBreachV2PlacementBlocked(generic, falseSquarePoint.x, falseSquarePoint.z, 0))
      .toBe(true);
    expect(isBreachV2PlacementBlocked(fitted, falseSquarePoint.x, falseSquarePoint.z, 0))
      .toBe(false);
    expect(isBreachV2PlacementBlocked(fitted, placement.x, placement.z, 0)).toBe(true);
  });

  it("keeps the low hanging cage solid at its legal overhead socket", () => {
    const layout = buildBreachV2Layout(1, "oathbreaker", DUNGEON_PROP_ASSETS);
    const cageIndex = layout.placements.findIndex((placement) => (
      placement.asset === "hanging-iron-cage"
    ));
    const cage = layout.placements[cageIndex]!;
    const cageId = `${cage.roomId}:${cage.asset}:${cageIndex}`;
    const cageCollider = buildBreachV2PlacementColliders(layout)
      .find((collider) => collider.id === cageId);

    expect(cage.placement).toBe("ceiling");
    expect(cage.elevation - cage.floorElevation).toBeCloseTo(0.95, 6);
    expect(cage.blocking).toBe(true);
    expect(cageCollider).toBeDefined();
    expect(isBreachV2PlacementBlocked([cageCollider!], cage.x, cage.z, 0.45)).toBe(true);
    expect(isBreachV2LineOfSightBlocked(
      [cageCollider!],
      { x: cage.x - 2, z: cage.z },
      { x: cage.x + 2, z: cage.z },
    )).toBe(true);
  });

  it("resolves elevated landmark offsets exactly once", () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const firstMemory = layout.landmarks.firstMemory;
    const bossRoom = layout.rooms.find((room) => room.kind === "boss")!;
    expect(firstMemory.elevation).toBeGreaterThan(0);
    expect(resolveBreachV2WorldY(firstMemory.elevation, 1.5))
      .toBeCloseTo(firstMemory.elevation + 1.5, 6);
    expect(resolveBreachV2WorldY(bossRoom.floorElevation, 0))
      .toBeCloseTo(bossRoom.floorElevation, 6);
  });

  it("cuts every canonical wall around its apertures without duplicate solid spans", () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const solidGeometry = new Set<string>();

      expect(layout.topology.automatedGate).toBe("PASS");
      for (const boundary of layout.topology.boundaries) {
        const split = splitBreachV2Boundary(boundary);
        const coveredLength = [...split.solidSpans, ...split.apertureSpans]
          .reduce((sum, span) => sum + span.endDistance - span.startDistance, 0);

        expect(coveredLength).toBeCloseTo(split.length, 6);
        for (const solid of split.solidSpans) {
          for (const aperture of split.apertureSpans) {
            const overlap = Math.min(solid.endDistance, aperture.endDistance)
              - Math.max(solid.startDistance, aperture.startDistance);
            expect(overlap, `${pathId}:${boundary.boundaryId}`).toBeLessThanOrEqual(1e-6);
          }
          const ordered = solid.start[0] < solid.end[0]
            || (solid.start[0] === solid.end[0] && solid.start[1] <= solid.end[1])
            ? [solid.start, solid.end] : [solid.end, solid.start];
          const key = ordered.flat().map((value) => value.toFixed(6)).join(":");
          expect(solidGeometry.has(key), `${pathId}:${boundary.boundaryId}:${key}`).toBe(false);
          solidGeometry.add(key);
        }
      }
    }
  });

  it("derives every runtime door and gate from one topology aperture", () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const apertures = layout.topology.boundaries.flatMap((boundary) => (
        boundary.apertures.map((aperture) => ({ boundary, aperture }))
      ));
      const runtimeApertures = apertures.filter(({ aperture }) => (
        aperture.assembly === "DOOR" || aperture.assembly === "PORTCULLIS"
      ));

      expect(new Set(layout.sectionPortals.map((portal) => portal.id)).size)
        .toBe(layout.sectionPortals.length);
      expect(layout.sectionPortals).toHaveLength(runtimeApertures.length);
      for (const portal of layout.sectionPortals) {
        const match = runtimeApertures.find(({ boundary, aperture }) => (
          boundary.boundaryId === portal.boundaryId
          && aperture.apertureId === portal.apertureId
          && aperture.runtimeConnectorId === portal.id
        ));
        expect(match, `${pathId}:${portal.id}`).toBeDefined();
        expect(portal.clearWidth).toBe(match!.aperture.clearWidth);
        expect(portal.clearHeight).toBe(match!.aperture.clearHeight);
        expect(portal.frontNormal).toEqual(match!.aperture.upstreamNormal);
      }
    }
  });

  it("separates corridor width from fitted door throats and derives every aperture front from ordered flow", () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const apertures = layout.topology.boundaries.flatMap((boundary) => (
        boundary.apertures.map((aperture) => ({ boundary, aperture }))
      ));
      const byId = new Map(apertures.map((entry) => [entry.aperture.apertureId, entry]));

      for (const connection of layout.topology.connections) {
        const source = byId.get(connection.sourceApertureId)!;
        const destination = byId.get(connection.destinationApertureId)!;
        const first = connection.centerline[0]!;
        const second = connection.centerline[1]!;
        const penultimate = connection.centerline[connection.centerline.length - 2]!;
        const last = connection.centerline[connection.centerline.length - 1]!;
        const assertNormal = (
          label: string,
          entry: typeof source,
          from: [number, number],
          to: [number, number],
        ) => {
          const dx = to[0] - from[0];
          const dz = to[1] - from[1];
          const flowLength = Math.hypot(dx, dz);
          const normal = entry.aperture.upstreamNormal;
          const boundaryDx = entry.boundary.end[0] - entry.boundary.start[0];
          const boundaryDz = entry.boundary.end[1] - entry.boundary.start[1];
          expect(Math.hypot(normal.x, normal.z), `${label}:unit`).toBeCloseTo(1, 8);
          expect(Math.abs(normal.x) + Math.abs(normal.z), `${label}:cardinal`).toBeCloseTo(1, 8);
          expect(normal.x * (dx / flowLength) + normal.z * (dz / flowLength), `${label}:anti-flow`)
            .toBeCloseTo(-1, 8);
          expect(normal.x * boundaryDx + normal.z * boundaryDz, `${label}:boundary-perpendicular`)
            .toBeCloseTo(0, 8);
        };
        assertNormal(`${pathId}:${connection.edgeId}:source`, source, first, second);
        assertNormal(`${pathId}:${connection.edgeId}:destination`, destination, penultimate, last);

        const expectedThroat = Math.min(
          connection.connectorWidth,
          source.aperture.clearWidth,
          destination.aperture.clearWidth,
        );
        expect(connection.clearWidth, `${pathId}:${connection.edgeId}:minimum-throat`)
          .toBeCloseTo(expectedThroat, 10);
        expect(connection.clearWidth, `${pathId}:${connection.edgeId}:player-clearance`)
          .toBeGreaterThanOrEqual(1);
      }

      for (const corridor of layout.corridors) {
        const connection = layout.topology.connections.find((candidate) => candidate.edgeId === corridor.id)!;
        expect(connection.connectorWidth, `${pathId}:${corridor.id}:authored-corridor-width`)
          .toBe(corridor.width);
      }

      for (const { boundary, aperture } of apertures) {
        if (aperture.assembly === "DOOR") {
          expect(aperture.clearWidth, `${pathId}:${aperture.apertureId}:door-width`)
            .toBeCloseTo(BREACH_V2_HEAVY_DOOR_APERTURE_WIDTH, 12);
          expect(aperture.clearHeight, `${pathId}:${aperture.apertureId}:door-height`)
            .toBeCloseTo(BREACH_V2_HEAVY_DOOR_APERTURE_HEIGHT, 12);
          const span = splitBreachV2Boundary(boundary).apertureSpans
            .find((candidate) => candidate.apertureIds.includes(aperture.apertureId))!;
          expect(getBreachV2ApertureSpanClearHeight(boundary, span.apertureIds))
            .toBeCloseTo(BREACH_V2_HEAVY_DOOR_APERTURE_HEIGHT, 12);
        } else {
          expect(aperture.clearHeight, `${pathId}:${aperture.apertureId}:default-height`)
            .toBeGreaterThanOrEqual(BREACH_V2_DEFAULT_APERTURE_CLEAR_HEIGHT);
        }
      }

      const supplemental = layout.topology.supplementalAssemblies[0]!;
      const supplementalEntry = byId.get(supplemental.apertureId)!;
      const room = layout.rooms.find((candidate) => candidate.id === supplementalEntry.boundary.owner
        || candidate.id === supplementalEntry.boundary.adjacentTo)!;
      const apertureCenter = {
        x: (supplementalEntry.aperture.start[0] + supplementalEntry.aperture.end[0]) / 2,
        z: (supplementalEntry.aperture.start[1] + supplementalEntry.aperture.end[1]) / 2,
      };
      const toRoom = {
        x: room.x + room.w / 2 - apertureCenter.x,
        z: room.z + room.h / 2 - apertureCenter.z,
      };
      const toRoomLength = Math.hypot(toRoom.x, toRoom.z);
      expect(
        supplementalEntry.aperture.upstreamNormal.x * (toRoom.x / toRoomLength)
          + supplementalEntry.aperture.upstreamNormal.z * (toRoom.z / toRoomLength),
        `${pathId}:supplemental-facing-room`,
      ).toBeCloseTo(1, 8);
    }
  });

  it("keeps both route portcullises in real apertures while sealing only the inactive route", () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const wayfarer = layout.sectionPortals.find((portal) => portal.id === "wayfarer-choice");
      const oathbreaker = layout.sectionPortals.find((portal) => portal.id === "oathbreaker-choice");

      expect(wayfarer).toMatchObject({
        x: layout.landmarks.doorWayfarer.x,
        z: layout.landmarks.doorWayfarer.z,
        kind: "gate",
        active: pathId === "wayfarer",
      });
      expect(oathbreaker).toMatchObject({
        x: layout.landmarks.doorOathbreaker.x,
        z: layout.landmarks.doorOathbreaker.z,
        kind: "gate",
        active: pathId === "oathbreaker",
      });
      expect(layout.topology.supplementalAssemblies).toHaveLength(1);
      expect(layout.topology.supplementalAssemblies[0]!.runtimeConnectorId)
        .toBe(pathId === "wayfarer" ? "oathbreaker-choice" : "wayfarer-choice");
    }
  });

  it("keeps fitted hinged-door leaves solid through closed, swinging, and open states", () => {
    const x = 30;
    const z = 11;
    const halfThickness = BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.thickness / 2;
    const halfSpan = BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.width / 2;
    expect(BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.width / BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.height)
      .toBeCloseTo(BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.width / BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.height, 12);
    expect((BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.width - BREACH_V2_HEAVY_DOOR_APERTURE_WIDTH) / 2)
      .toBeCloseTo(0.01, 12);
    expect((BREACH_V2_HEAVY_DOOR_APERTURE_HEIGHT - BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.height) / 2)
      .toBeCloseTo(0.02, 12);
    for (const portalNormal of [
      { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
    ] as const) {
      const label = `${portalNormal.x},${portalNormal.z}`;
      const closedYaw = getBreachV2ClosedDoorYaw(portalNormal);
      expect(Math.cos(closedYaw), `${label}:hardware-front-x`).toBeCloseTo(portalNormal.x, 8);
      expect(-Math.sin(closedYaw), `${label}:hardware-front-z`).toBeCloseTo(portalNormal.z, 8);
      const build = (progress: number) => buildBreachV2DoorLeafCollider({
        id: `test-${label}`,
        x,
        z,
        closedYaw,
        progress,
        halfThickness,
        halfSpan,
      });
      const closed = build(0);
      expect(closed.yaw, `${label}:closed-yaw`).toBeCloseTo(closedYaw, 8);
      expect(closed.centerX, `${label}:closed-center-x`).toBeCloseTo(x, 8);
      expect(closed.centerZ, `${label}:closed-center-z`).toBeCloseTo(z, 8);
      expect(isBreachV2PlacementBlocked([closed], x, z, 0.35), `${label}:closed-aperture`)
        .toBe(true);
      expect(isBreachV2LineOfSightBlocked(
        [closed],
        { x: x - portalNormal.x * 2, z: z - portalNormal.z * 2 },
        { x: x + portalNormal.x * 2, z: z + portalNormal.z * 2 },
      ), `${label}:closed-los`).toBe(true);

      const swinging = build(0.5);
      const swingCosine = Math.cos(swinging.yaw!);
      const swingSine = Math.sin(swinging.yaw!);
      const swingThicknessAxis = { x: swingCosine, z: -swingSine };
      const swingSpanAxis = { x: swingSine, z: swingCosine };
      const swingEdge = {
        x: swinging.centerX! + swingSpanAxis.x * halfSpan * 0.8,
        z: swinging.centerZ! + swingSpanAxis.z * halfSpan * 0.8,
      };
      expect(isBreachV2PlacementBlocked([swinging], swingEdge.x, swingEdge.z, 0), `${label}:swing-edge`)
        .toBe(true);
      expect(isBreachV2LineOfSightBlocked(
        [swinging],
        {
          x: swingEdge.x - swingThicknessAxis.x * (halfThickness + 0.05),
          z: swingEdge.z - swingThicknessAxis.z * (halfThickness + 0.05),
        },
        {
          x: swingEdge.x + swingThicknessAxis.x * (halfThickness + 0.05),
          z: swingEdge.z + swingThicknessAxis.z * (halfThickness + 0.05),
        },
      ), `${label}:swing-los`).toBe(true);

      const open = build(1);
      expect(isBreachV2PlacementBlocked([open], x, z, 0.35), `${label}:open-aperture`)
        .toBe(false);
      expect(isBreachV2LineOfSightBlocked(
        [open],
        { x: x - portalNormal.x * 2, z: z - portalNormal.z * 2 },
        { x: x + portalNormal.x * 2, z: z + portalNormal.z * 2 },
      ), `${label}:open-aperture-los`).toBe(false);

      const openCosine = Math.cos(open.yaw!);
      const openSine = Math.sin(open.yaw!);
      const openThicknessAxis = { x: openCosine, z: -openSine };
      const openSpanAxis = { x: openSine, z: openCosine };
      expect(isBreachV2PlacementBlocked([open], open.centerX!, open.centerZ!, 0), `${label}:open-leaf-center`)
        .toBe(true);
      for (const [direction, extent, label] of [
        [openThicknessAxis, halfThickness, "thickness"],
        [openSpanAxis, halfSpan, "span"],
      ] as const) {
        expect(isBreachV2PlacementBlocked(
          [open],
          open.centerX! + direction.x * (extent - 0.001),
          open.centerZ! + direction.z * (extent - 0.001),
          0,
        ), `${label}:${label}:inside`).toBe(true);
        expect(isBreachV2PlacementBlocked(
          [open],
          open.centerX! + direction.x * (extent + 0.001),
          open.centerZ! + direction.z * (extent + 0.001),
          0,
        ), `${label}:${label}:outside`).toBe(false);
      }
      expect(isBreachV2LineOfSightBlocked(
        [open],
        {
          x: open.centerX! - openThicknessAxis.x * (halfThickness + 0.05),
          z: open.centerZ! - openThicknessAxis.z * (halfThickness + 0.05),
        },
        {
          x: open.centerX! + openThicknessAxis.x * (halfThickness + 0.05),
          z: open.centerZ! + openThicknessAxis.z * (halfThickness + 0.05),
        },
      ), `${label}:open-leaf-los`).toBe(true);

      const closedHinge = {
        x: closed.centerX! - Math.sin(closed.yaw!) * halfSpan,
        z: closed.centerZ! - Math.cos(closed.yaw!) * halfSpan,
      };
      const openHinge = {
        x: open.centerX! - Math.sin(open.yaw!) * halfSpan,
        z: open.centerZ! - Math.cos(open.yaw!) * halfSpan,
      };
      expect(openHinge.x, `${label}:hinge-x`).toBeCloseTo(closedHinge.x, 8);
      expect(openHinge.z, `${label}:hinge-z`).toBeCloseTo(closedHinge.z, 8);
    }
  });

  it("refuses a door or gate closure sweep through an occupant", () => {
    const x = 30;
    const z = 11;
    const clearWidth = 3.2;
    const halfThickness = 0.36;
    const halfSpan = 1.64;
    for (const axis of ["x", "z"] as const) {
      const closedYaw = getBreachV2ClosedDoorYaw(axis === "x" ? { x: 1, z: 0 } : { x: 0, z: 1 });
      const openLeaf = buildBreachV2DoorLeafCollider({
        id: `closure-${axis}`,
        x,
        z,
        closedYaw,
        progress: 1,
        halfThickness,
        halfSpan,
      });
      expect(isBreachV2PlacementBlocked([openLeaf], x, z, 0.35)).toBe(false);
      expect(isBreachV2PortalClosureSafe({
        kind: "door",
        id: `closure-${axis}`,
        x,
        z,
        axis,
        closedYaw,
        clearWidth,
        progress: 1,
        halfThickness,
        halfSpan,
      }, { x, z })).toBe(false);
      expect(isBreachV2PortalClosureSafe({
        kind: "door",
        id: `closure-${axis}`,
        x,
        z,
        axis,
        closedYaw,
        clearWidth,
        progress: 1,
        halfThickness,
        halfSpan,
      }, { x: x + 8, z: z + 8 })).toBe(true);
      expect(isBreachV2PortalClosureSafe({
        kind: "gate",
        id: `closure-gate-${axis}`,
        x,
        z,
        axis,
        closedYaw,
        clearWidth,
        progress: 1,
        halfThickness,
        halfSpan,
      }, { x, z })).toBe(false);
      expect(isBreachV2PortalClosureSafe({
        kind: "gate",
        id: `closure-gate-${axis}`,
        x,
        z,
        axis,
        closedYaw,
        clearWidth,
        progress: 1,
        halfThickness,
        halfSpan,
      }, { x: x + 8, z: z + 8 })).toBe(true);
    }
  });

  it("uses one swept movement primitive so clear endpoints cannot tunnel through thin blockers", () => {
    const canStandAt = (x: number, z: number) => !(
      x >= 0.46 && x <= 0.54 && Math.abs(z) <= 0.2
    );
    expect(canStandAt(0, 0)).toBe(true);
    expect(canStandAt(1, 0)).toBe(true);

    const blocked = sweepBreachV2Movement(
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      canStandAt,
    );
    expect(blocked.completed).toBe(false);
    expect(blocked.resolvedEnd.x).toBeLessThan(0.46);
    expect(blocked.sampleCount).toBe(20);

    const diagonal = sweepBreachV2Movement(
      { x: 0, z: 0.5 },
      { x: 1, z: 1.5 },
      canStandAt,
    );
    expect(diagonal.completed).toBe(true);
    expect(diagonal.resolvedEnd).toEqual({ x: 1, z: 1.5 });
  });

  it("uses height-aware live collider envelopes for third-person and isometric cameras", () => {
    const wall: BreachV2PlanarCollider = {
      id: "wall",
      asset: "shell-wall",
      roomId: "test-room",
      ownerClass: "shell",
      shape: "aabb",
      minX: 4,
      maxX: 5,
      minZ: -1,
      maxZ: 1,
      minY: 0,
      maxY: 3.2,
      blocksLineOfSight: true,
    };
    const lowDecoration: BreachV2PlanarCollider = {
      ...wall,
      id: "low-decoration",
      ownerClass: "placement",
      minX: 2,
      maxX: 3,
      minY: 0,
      maxY: 1.3,
      blocksLineOfSight: false,
    };

    const hit = firstBreachV2CameraHit(
      [lowDecoration, wall],
      { x: 0, y: 1.4, z: 0 },
      { x: 10, y: 2.4, z: 0 },
    );
    expect(hit?.collider.id).toBe("wall");
    expect(hit?.fraction).toBeCloseTo(0.4, 6);
    expect(firstBreachV2CameraHit(
      [wall],
      { x: 0, y: 4, z: 0 },
      { x: 10, y: 10, z: 0 },
    )).toBeNull();
    expect(firstBreachV2CameraHit(
      [{ ...lowDecoration, blocksLineOfSight: true }],
      { x: 0, y: 1.4, z: 0 },
      { x: 10, y: 1.4, z: 0 },
    )).toBeNull();

    const closedDoor = buildBreachV2DoorLeafCollider({
      id: "camera-door",
      x: 0,
      z: 0,
      closedYaw: 0,
      progress: 0,
      halfThickness: 0.36,
      halfSpan: 1.64,
      minY: 0,
      maxY: 2.7,
    });
    const openDoor = buildBreachV2DoorLeafCollider({
      id: "camera-door",
      x: 0,
      z: 0,
      closedYaw: 0,
      progress: 1,
      halfThickness: 0.36,
      halfSpan: 1.64,
      minY: 0,
      maxY: 2.7,
    });
    expect(firstBreachV2CameraHit(
      [closedDoor],
      { x: -2, y: 1.4, z: 0 },
      { x: 2, y: 1.4, z: 0 },
    )?.collider.id).toBe("portal:camera-door:leaf");
    expect(firstBreachV2CameraHit(
      [openDoor],
      { x: -2, y: 1.4, z: 0 },
      { x: 2, y: 1.4, z: 0 },
    )).toBeNull();
    expect(firstBreachV2CameraHit(
      [openDoor],
      { x: openDoor.centerX!, y: 1.4, z: openDoor.centerZ! - 1 },
      { x: openDoor.centerX!, y: 1.4, z: openDoor.centerZ! + 1 },
    )?.collider.id).toBe("portal:camera-door:leaf");

    const raisedGate: BreachV2PlanarCollider = {
      ...wall,
      id: "raised-gate",
      ownerClass: "portal",
      minX: -0.2,
      maxX: 0.2,
      minY: 2.2,
      maxY: 5.2,
      blocksMovement: false,
      blocksLineOfSight: false,
      blocksCamera: true,
    };
    expect(isBreachV2LineOfSightBlocked(
      [raisedGate],
      { x: -2, z: 0 },
      { x: 2, z: 0 },
    )).toBe(false);
    expect(firstBreachV2CameraHit(
      [raisedGate],
      { x: -2, y: 1.4, z: 0 },
      { x: 2, y: 1.4, z: 0 },
    )).toBeNull();
    expect(firstBreachV2CameraHit(
      [raisedGate],
      { x: -2, y: 3, z: 0 },
      { x: 2, y: 3, z: 0 },
    )?.collider.id).toBe("raised-gate");
  });

  it("plans a continuous player-radius route through every dogleg on both paths", async () => {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const generated = generateBreachV2(4182, pathId);
      const placementMeasurements = await buildFittedPlacementMeasurements(layout);
      const navCell = layout.meta.navCell;
      const walkable = new Set(generated.navCells.map(breachV2CellKey));
      const placementColliders = buildBreachV2PlacementColliders(layout, placementMeasurements);
      const shellColliders = buildBreachV2ShellColliders(layout);
      const landmarkColliders = buildBreachV2LandmarkColliders(layout);
      const staticColliders = [...shellColliders, ...placementColliders, ...landmarkColliders];
      for (const cell of generated.blockedCells) walkable.delete(breachV2CellKey(cell));
      const canStandAtForRadius = (radius: number) => (x: number, z: number): boolean => {
        if (isBreachV2PlacementBlocked(staticColliders, x, z, radius)) return false;
        return ([[radius, radius], [radius, -radius], [-radius, radius], [-radius, -radius]] as const)
          .every(([offsetX, offsetZ]) => (
            hasDungeonFloorAt(layout, x + offsetX, z + offsetZ)
            && walkable.has(`${Math.floor((x + offsetX) / navCell)},${Math.floor((z + offsetZ) / navCell)}`)
          ));
      };
      const canStandAt = canStandAtForRadius(0.35);
      let runtimeStart = {
        x: layout.landmarks.playerStart.x,
        z: layout.landmarks.playerStart.z,
      };
      if (!canStandAt(runtimeStart.x, runtimeStart.z)) {
        findSpawn: for (let radius = navCell; radius <= navCell * 5; radius += navCell) {
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const candidate = {
              x: layout.landmarks.playerStart.x + Math.cos(angle) * radius,
              z: layout.landmarks.playerStart.z + Math.sin(angle) * radius,
            };
            if (canStandAt(candidate.x, candidate.z)) {
              runtimeStart = candidate;
              break findSpawn;
            }
          }
        }
      }
      expect(canStandAt(runtimeStart.x, runtimeStart.z), `${pathId}:runtime-start`).toBe(true);
      const route = findBreachV2RuntimePath(
        runtimeStart,
        layout.landmarks.exitPoint,
        navCell / 2,
        canStandAt,
      );

      expect(route.length, pathId).toBeGreaterThan(0);
      let previous = runtimeStart;
      for (const point of route) {
        const distance = Math.hypot(point.x - previous.x, point.z - previous.z);
        const samples = Math.max(1, Math.ceil(distance / 0.05));
        for (let index = 1; index <= samples; index += 1) {
          const progress = index / samples;
          expect(canStandAt(
            previous.x + (point.x - previous.x) * progress,
            previous.z + (point.z - previous.z) * progress,
          ), `${pathId}:${point.x},${point.z}@${progress}`).toBe(true);
        }
        previous = point;
      }
      expect(Math.hypot(
        previous.x - layout.landmarks.exitPoint.x,
        previous.z - layout.landmarks.exitPoint.z,
      ), pathId).toBeLessThan(navCell);

      const arch = layout.placements.find((placement) => placement.asset === "ruined-stone-archway")!;
      const archColliders = placementColliders.filter((collider) => collider.asset === arch.asset);
      expect(archColliders, `${pathId}:arch-uprights`).toHaveLength(2);
      expect(isBreachV2PlacementBlocked(archColliders, arch.x, arch.z, 0.35), `${pathId}:arch-opening`)
        .toBe(false);

      const floorFixtures = layout.placements
        .map((placement, index) => ({ placement, index }))
        .filter(({ placement }) => [
          "floor-brazier",
          "bone-pile",
          "candelabra-cluster",
          "bottles-jugs-crockery-cluster",
          "weapon-armor-heap",
          "shed-chitin-pile",
          "supply-pile",
        ].includes(placement.asset));
      expect(floorFixtures.length, `${pathId}:physical-floor-fixtures`).toBeGreaterThan(0);
      for (const { placement, index } of floorFixtures) {
        const colliderId = `${placement.roomId}:${placement.asset}:${index}`;
        expect(placement.blocking, `${pathId}:${colliderId}:classified-solid`).toBe(true);
        expect(placementColliders.some((collider) => collider.id === colliderId), colliderId).toBe(true);
        expect(isBreachV2PlacementBlocked(
          placementColliders.filter((collider) => collider.id === colliderId),
          placement.x,
          placement.z,
          0.35,
        ), `${pathId}:${colliderId}:positive-collision`).toBe(true);
      }

      const destructibleCover = layout.placements
        .map((placement, index) => ({ placement, index }))
        .filter(({ placement }) => placement.role === "destructible-cover");
      expect(destructibleCover.length, `${pathId}:destructible-cover`).toBeGreaterThan(0);
      for (const { placement, index } of destructibleCover) {
        const colliderId = `${placement.roomId}:${placement.asset}:${index}`;
        expect(placement.blocking, `${pathId}:${colliderId}:solid-while-intact`).toBe(true);
        expect(placementColliders.some((collider) => collider.id === colliderId), colliderId).toBe(true);
      }

      const bossPillars = layout.placements
        .map((placement, index) => ({ placement, index }))
        .filter(({ placement }) => placement.asset === "boss-cover-pillar");
      const bossPillarColliders = placementColliders
        .filter((collider) => collider.asset === "boss-cover-pillar");
      expect(bossPillars, `${pathId}:boss-pillar-inventory`).toHaveLength(6);
      expect(bossPillarColliders, `${pathId}:boss-pillar-colliders`).toHaveLength(6);
      for (const { placement, index } of bossPillars) {
        const colliderId = `${placement.roomId}:${placement.asset}:${index}`;
        const collider = bossPillarColliders.find((candidate) => candidate.id === colliderId);
        expect(collider, `${pathId}:${colliderId}:collider-parity`).toBeDefined();
        expect(isBreachV2PlacementBlocked(
          [collider!],
          placement.x,
          placement.z,
          0.35,
        ), `${pathId}:${colliderId}:movement`).toBe(true);
        expect(isBreachV2LineOfSightBlocked(
          [collider!],
          { x: placement.x - 2, z: placement.z },
          { x: placement.x + 2, z: placement.z },
        ), `${pathId}:${colliderId}:line-of-sight`).toBe(true);
        expect(isBreachV2LineOfSightBlocked(
          [collider!],
          { x: placement.x - 2, z: placement.z + 2 },
          { x: placement.x + 2, z: placement.z + 2 },
        ), `${pathId}:${colliderId}:parallel-clear-line`).toBe(false);
      }

      const slicedSpanCount = (boundary: (typeof layout.topology.boundaries)[number]): number => (
        splitBreachV2Boundary(boundary).solidSpans.reduce((sum, span) => (
          sum + Math.max(1, Math.ceil((span.endDistance - span.startDistance) / 1.2))
        ), 0)
      );
      const expectedShellSpanCount = layout.topology.boundaries
        .reduce((sum, boundary) => sum + slicedSpanCount(boundary), 0);
      expect(shellColliders, `${pathId}:topology-shell-collider-parity`)
        .toHaveLength(expectedShellSpanCount);
      const knownSharedWall = shellColliders.filter((collider) => (
        collider.id.startsWith("shell:boundary-V-36-8-14:solid:")
      ));
      const knownSharedBoundary = layout.topology.boundaries
        .find((boundary) => boundary.boundaryId === "boundary-V-36-8-14")!;
      expect(knownSharedWall, `${pathId}:known-shared-wall-spans`)
        .toHaveLength(slicedSpanCount(knownSharedBoundary));
      for (const z of [8.7, 13.3]) {
        expect(isBreachV2PlacementBlocked(knownSharedWall, 36, z, 0.35), `${pathId}:wall:${z}`)
          .toBe(true);
        expect(isBreachV2LineOfSightBlocked(
          knownSharedWall,
          { x: 35.5, z },
          { x: 36.5, z },
        ), `${pathId}:wall-los:${z}`).toBe(true);
      }
      expect(isBreachV2PlacementBlocked(knownSharedWall, 36, 11, 0.35), `${pathId}:wall-aperture`)
        .toBe(false);
      expect(isBreachV2PlacementBlocked(shellColliders, 8.75, 0.35, 0.35), `${pathId}:exterior-wall`)
        .toBe(true);

      expect(landmarkColliders.map((collider) => collider.id).sort()).toEqual([
        "landmark:memory-loom",
        "landmark:soul-well",
        "landmark:training-effigy",
      ]);
      const soulWellCollider = landmarkColliders.find((collider) => collider.id === "landmark:soul-well")!;
      expect(isBreachV2PlacementBlocked(
        [soulWellCollider],
        layout.landmarks.soulWell.x + 2.5,
        layout.landmarks.soulWell.z,
        0.35,
      ), `${pathId}:soul-well-visible-apron`).toBe(true);
      expect(isBreachV2LineOfSightBlocked(
        [soulWellCollider],
        { x: layout.landmarks.soulWell.x - 4, z: layout.landmarks.soulWell.z },
        { x: layout.landmarks.soulWell.x + 4, z: layout.landmarks.soulWell.z },
      ), `${pathId}:soul-well-low-cover-los`).toBe(false);
      const loomCollider = landmarkColliders.find((collider) => collider.id === "landmark:memory-loom")!;
      expect(isBreachV2PlacementBlocked(
        [loomCollider],
        layout.landmarks.memoryLoom.x,
        layout.landmarks.memoryLoom.z + 1,
        0.35,
      ), `${pathId}:loom-no-phantom-depth`).toBe(false);

      // The ashen-threshold brazier sits directly on the room centerline. Both
      // the player and representative humanoid-NPC capsule must plan a visible
      // detour around it rather than treating a direct line as traversal proof.
      const stressBrazier = layout.placements.find((placement) => (
        placement.roomId === "ashen-threshold" && placement.asset === "floor-brazier"
      ))!;
      const stressStart = { x: stressBrazier.x - 3.5, z: stressBrazier.z };
      const stressTarget = { x: stressBrazier.x + 3.5, z: stressBrazier.z };
      const directDistance = Math.hypot(
        stressTarget.x - stressStart.x,
        stressTarget.z - stressStart.z,
      );
      for (const profile of [
        { id: "player", radius: 0.35 },
        { id: "humanoid-npc", radius: 0.45 },
      ] as const) {
        const profileCanStandAt = canStandAtForRadius(profile.radius);
        const detour = findBreachV2RuntimePath(
          stressStart,
          stressTarget,
          navCell / 2,
          profileCanStandAt,
        );
        expect(detour.length, `${pathId}:${profile.id}:detour`).toBeGreaterThan(0);
        let previous = stressStart;
        let routeDistance = 0;
        for (const point of detour) {
          routeDistance += Math.hypot(point.x - previous.x, point.z - previous.z);
          expect(profileCanStandAt(point.x, point.z), `${pathId}:${profile.id}:clear`).toBe(true);
          previous = point;
        }
        expect(routeDistance, `${pathId}:${profile.id}:not-direct`)
          .toBeGreaterThan(directDistance + 0.2);
      }
    }
  });
});
