import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import {
  auditBreachV2SpatialContracts,
  buildBreachV2CameraOnlyColliders,
  buildBreachV2ShellColliders,
  cameraPresets,
  doesBreachV2PortalBlockMovement,
  firstBreachV2CameraHit,
  getBreachV2VisibleCameraColliders,
  isBreachV2PortalReadyForTraversal,
  isBreachV2LineOfSightBlocked,
  isBreachV2PlacementBlocked,
  resolveBreachV2CameraDistance,
  resolveBreachV2CameraDistanceForMode,
  resolveBreachV2CameraFloorY,
  resolveBreachV2CeilingVisibility,
  resolveBreachV2PlaceholderAvatarOpacity,
  type BreachV2PlanarCollider,
} from "../src/game/dungeons/breach-v2-preview";
import { splitBreachV2Boundary } from "../src/game/dungeons/breach-v2-topology";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);

describe("BREACH-V2 camera-only overhead collision", () => {
  it("maps every canonical aperture lintel to a height-aware camera solid", () => {
    const { lintels } = buildBreachV2CameraOnlyColliders(layout);
    const expectedIds = layout.topology.boundaries.flatMap((boundary) => (
      splitBreachV2Boundary(boundary).apertureSpans.map((_, index) => (
        `camera:shell:lintel:${boundary.boundaryId}:${index}`
      ))
    ));

    expect(lintels.map((collider) => collider.id)).toEqual(expectedIds);
    expect(lintels.length).toBeGreaterThan(0);

    const lintel = lintels[0]!;
    const center = {
      x: (lintel.minX + lintel.maxX) / 2,
      z: (lintel.minZ + lintel.maxZ) / 2,
    };
    const spansX = lintel.maxX - lintel.minX > lintel.maxZ - lintel.minZ;
    const y = (lintel.minY + lintel.maxY) / 2;
    const start = spansX
      ? { x: center.x, y, z: lintel.minZ - 1 }
      : { x: lintel.minX - 1, y, z: center.z };
    const end = spansX
      ? { x: center.x, y, z: lintel.maxZ + 1 }
      : { x: lintel.maxX + 1, y, z: center.z };

    expect(lintel.blocksMovement).toBe(false);
    expect(lintel.blocksLineOfSight).toBe(false);
    expect(lintel.blocksCamera).toBe(true);
    expect(lintel.maxY).toBeGreaterThan(lintel.minY);
    expect(firstBreachV2CameraHit([lintel], start, end)?.collider.id).toBe(lintel.id);
    expect(isBreachV2PlacementBlocked([lintel], center.x, center.z, 0.35)).toBe(false);
    expect(isBreachV2LineOfSightBlocked([lintel], start, end)).toBe(false);
  });

  it("clamps a raised camera at visible room caps without changing actor collision", () => {
    const cameraOnly = buildBreachV2CameraOnlyColliders(layout);
    const room = layout.rooms[0]!;
    const ceiling = cameraOnly.ceilings.find((collider) => (
      collider.id === `camera:shell:ceiling:room:${room.id}`
    ))!;
    const center = {
      x: (ceiling.minX + ceiling.maxX) / 2,
      z: (ceiling.minZ + ceiling.maxZ) / 2,
    };
    const start = { ...center, y: ceiling.minY - 1 };
    const end = { ...center, y: ceiling.maxY + 1 };

    expect(ceiling.blocksMovement).toBe(false);
    expect(ceiling.blocksLineOfSight).toBe(false);
    expect(ceiling.blocksCamera).toBe(true);
    expect(ceiling.minX).toBe(room.x - 0.5);
    expect(ceiling.maxX).toBe(room.x + room.w + 0.5);
    expect(ceiling.minZ).toBe(room.z - 0.5);
    expect(ceiling.maxZ).toBe(room.z + room.h + 0.5);
    expect(firstBreachV2CameraHit(cameraOnly.ceilings, start, end)?.collider.id).toBe(ceiling.id);
    expect(isBreachV2PlacementBlocked([ceiling], center.x, center.z, 0.45)).toBe(false);
    expect(isBreachV2LineOfSightBlocked([ceiling], start, end)).toBe(false);
  });

  it("removes ceiling volumes with the isometric cutaway while retaining visible lintels", () => {
    const cameraOnly = buildBreachV2CameraOnlyColliders(layout);
    const hiddenCaps = getBreachV2VisibleCameraColliders(cameraOnly, false);
    const visibleCaps = getBreachV2VisibleCameraColliders(cameraOnly, true);
    const ceiling = cameraOnly.ceilings.find((collider) => collider.asset === "shell-room-ceiling")!;
    const center = {
      x: (ceiling.minX + ceiling.maxX) / 2,
      z: (ceiling.minZ + ceiling.maxZ) / 2,
    };
    const start = { ...center, y: ceiling.minY - 1 };
    const end = { ...center, y: ceiling.maxY + 1 };

    expect(hiddenCaps).toEqual(cameraOnly.lintels);
    expect(hiddenCaps.some((collider) => collider.asset.includes("ceiling"))).toBe(false);
    expect(visibleCaps).toHaveLength(cameraOnly.lintels.length + cameraOnly.ceilings.length);
    expect(firstBreachV2CameraHit(hiddenCaps, start, end)).toBeNull();
    expect(firstBreachV2CameraHit(visibleCaps, start, end)?.collider.id).toBe(ceiling.id);
  });

  it("keeps a near-wall camera sphere on the safe side without forcing a comfort minimum", () => {
    const wall: BreachV2PlanarCollider = {
      id: "shell:test-wall",
      asset: "shell-wall",
      roomId: "test-room",
      ownerClass: "shell",
      shape: "aabb",
      minX: 0.35,
      maxX: 0.85,
      minZ: -1,
      maxZ: 1,
      minY: 0,
      maxY: 3,
      blocksMovement: true,
      blocksLineOfSight: true,
    };
    const hit = firstBreachV2CameraHit(
      [wall],
      { x: 0, y: 1.4, z: 0 },
      { x: 1, y: 1.4, z: 0 },
      0.24,
    );
    expect(hit).not.toBeNull();
    const resolved = resolveBreachV2CameraDistance(1, hit!.fraction);
    expect(resolved).toBeLessThanOrEqual(hit!.fraction);
    expect(resolved).toBeLessThan(0.35);
    expect(resolved).toBeGreaterThanOrEqual(0);
  });

  it("preserves isometric framing through a doorway instead of collapsing onto the avatar", () => {
    expect(resolveBreachV2CameraDistanceForMode(18.5, 0.01, true)).toBe(18.5);
    expect(resolveBreachV2CameraDistanceForMode(18.5, 0.01, false)).toBeLessThan(1);
  });

  it("waits for the animated portal leaf to clear the player capsule", () => {
    expect(isBreachV2PortalReadyForTraversal(0.9)).toBe(false);
    expect(isBreachV2PortalReadyForTraversal(0.994)).toBe(false);
    expect(isBreachV2PortalReadyForTraversal(0.995)).toBe(true);
    expect(isBreachV2PortalReadyForTraversal(1)).toBe(true);
    expect(doesBreachV2PortalBlockMovement("door", 0.994, false)).toBe(true);
    expect(doesBreachV2PortalBlockMovement("door", 0.995, false)).toBe(false);
    expect(doesBreachV2PortalBlockMovement("gate", 1, false)).toBe(true);
    expect(doesBreachV2PortalBlockMovement("gate", 1, true)).toBe(false);
  });

  it("uses one hysteretic ceiling policy for first-person, third-person, isometric, and orbit views", () => {
    const capY = 4;
    expect(resolveBreachV2CeilingVisibility(false, "firstperson", 10, capY)).toBe(true);
    expect(resolveBreachV2CeilingVisibility(true, "isometric", 2, capY)).toBe(false);
    expect(resolveBreachV2CeilingVisibility(true, "overview", 2, capY)).toBe(false);
    expect(resolveBreachV2CeilingVisibility(true, "thirdperson", 4.31, capY)).toBe(false);
    expect(resolveBreachV2CeilingVisibility(false, "thirdperson", 4.1, capY)).toBe(false);
    expect(resolveBreachV2CeilingVisibility(false, "thirdperson", 3.69, capY)).toBe(true);
    expect(resolveBreachV2CeilingVisibility(true, "orbit", 4.31, capY)).toBe(false);
    expect(resolveBreachV2CeilingVisibility(false, "orbit", 3.69, capY)).toBe(true);
  });

  it("never lets a requested camera center fall below the sampled or fallback floor", () => {
    expect(resolveBreachV2CameraFloorY(-2.5, 0, 8, 0.24)).toBe(0.24);
    expect(resolveBreachV2CameraFloorY(-2.5, null, 8, 0.24)).toBe(8.24);
    expect(resolveBreachV2CameraFloorY(10, 0, 8, 0.24)).toBe(10);
  });

  it("fades only the temporary avatar when camera collision compresses third-person distance", () => {
    expect(resolveBreachV2PlaceholderAvatarOpacity(0)).toBe(0);
    expect(resolveBreachV2PlaceholderAvatarOpacity(0.85)).toBe(0);
    expect(resolveBreachV2PlaceholderAvatarOpacity(1.3)).toBeCloseTo(0.5);
    expect(resolveBreachV2PlaceholderAvatarOpacity(1.75)).toBe(1);
    expect(resolveBreachV2PlaceholderAvatarOpacity(5)).toBe(1);
  });

  it("keeps the vestibule review orbit outside the close-camera failure band", () => {
    const presets = cameraPresets(layout);
    expect(presets.vestibule?.minDistance).toBe(5.5);
    expect(presets.isometric?.minDistance).toBeUndefined();
    expect(presets.overview?.minDistance).toBeUndefined();
  });

  it("slices rising exit walls with the same height sampling used by rendered masonry", () => {
    for (const pathId of ["wayfarer", "oathbreaker"] as const) {
      const routeLayout = buildBreachV2Layout(4182, pathId, DUNGEON_PROP_ASSETS);
      const exitBoundaryIds = routeLayout.topology.boundaries
        .filter((boundary) => (
          (boundary.owner === "exit-connector" || boundary.adjacentTo === "exit-connector")
          && Math.abs(boundary.end[0] - boundary.start[0]) > 1
        ))
        .map((boundary) => boundary.boundaryId);
      const exitWallSlices = buildBreachV2ShellColliders(routeLayout).filter((collider) => (
        exitBoundaryIds.some((boundaryId) => collider.id.startsWith(`shell:${boundaryId}:solid:`))
      ));
      expect(exitWallSlices.length, pathId).toBeGreaterThan(exitBoundaryIds.length);
      const tops = exitWallSlices.map((collider) => collider.maxY);
      expect(Math.max(...tops) - Math.min(...tops), pathId).toBeGreaterThan(0.5);
    }
  });

  it("attributes camera-only shell volumes to explicit spatial owners", () => {
    const cameraOnly = buildBreachV2CameraOnlyColliders(layout);
    const scene = new THREE.Scene();
    for (const [name, prefix] of [
      ["shell:aperture-lintels", "camera:shell:lintel:"],
      ["shell:overhead-caps", "camera:shell:ceiling:"],
    ] as const) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      mesh.name = name;
      mesh.userData = {
        spatialOwnerId: name,
        collisionMode: "camera-only-overhead",
        blocksMovement: false,
        blocksLineOfSight: false,
        blocksCamera: true,
        collisionIdPrefix: prefix,
        postFitAuditMode: "shell-topology",
      };
      scene.add(mesh);
    }

    const audit = auditBreachV2SpatialContracts(
      scene,
      getBreachV2VisibleCameraColliders(cameraOnly, true),
    );
    expect(audit.unexplainedColliderIds).toEqual([]);
    expect(audit.unexpectedMovementColliderOwnerIds).toEqual([]);
    expect(audit.unexpectedLineOfSightColliderOwnerIds).toEqual([]);
    expect(audit.missingCameraColliderOwnerIds).toEqual([]);
    expect(audit.unexpectedCameraColliderOwnerIds).toEqual([]);

    const missingScene = new THREE.Scene();
    const missingOwner = scene.getObjectByName("shell:aperture-lintels")!.clone();
    missingOwner.userData = { ...scene.getObjectByName("shell:aperture-lintels")!.userData };
    missingScene.add(missingOwner);
    const missing = auditBreachV2SpatialContracts(missingScene, []);
    expect(missing.missingCameraColliderOwnerIds).toEqual(["shell:aperture-lintels"]);

    const unexpectedScene = new THREE.Scene();
    const unexpectedOwner = scene.getObjectByName("shell:aperture-lintels")!.clone();
    unexpectedOwner.userData = {
      ...scene.getObjectByName("shell:aperture-lintels")!.userData,
      blocksCamera: false,
    };
    unexpectedScene.add(unexpectedOwner);
    const unexpected = auditBreachV2SpatialContracts(
      unexpectedScene,
      cameraOnly.lintels,
    );
    expect(unexpected.unexpectedCameraColliderOwnerIds).toEqual(["shell:aperture-lintels"]);

    const wallOnlyScene = new THREE.Scene();
    const wallOwner = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    wallOwner.userData = {
      spatialOwnerId: "shell:canonical-boundaries",
      collisionMode: "static-solid",
      blocksMovement: true,
      blocksLineOfSight: true,
      collisionIdPrefix: "shell:",
      postFitAuditMode: "shell-topology",
    };
    wallOnlyScene.add(wallOwner);
    const orphan = auditBreachV2SpatialContracts(wallOnlyScene, [cameraOnly.lintels[0]!]);
    expect(orphan.unexplainedColliderIds).toEqual([cameraOnly.lintels[0]!.id]);
  });
});
