import * as THREE from "three";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {
  HEAVY_DUNGEON_DOOR_ARTIFACT_TOP,
  HEAVY_DUNGEON_DOOR_FRAME_LIMITS,
  isHeavyDungeonDoorFrameTriangle,
  partitionHeavyDungeonDoor,
} from "../src/game/environment/HeavyDungeonDoor";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

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

function expectFinitePartitionMesh(root: THREE.Object3D): number {
  let triangles = 0;
  let meshCount = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = child.geometry;
    expect(geometry.getAttribute("position"), child.name).toBeDefined();
    expect(geometry.getAttribute("normal"), child.name).toBeDefined();
    expect(geometry.getAttribute("uv"), child.name).toBeDefined();
    expect(geometry.groups.length, child.name).toBeGreaterThan(0);
    expect(Array.isArray(child.material) ? child.material.length : 1, child.name).toBeGreaterThan(0);
    const attributes = Object.values(geometry.attributes) as Array<
      THREE.BufferAttribute | THREE.InterleavedBufferAttribute
    >;
    for (const attribute of attributes) {
      for (let index = 0; index < attribute.count; index += 1) {
        for (let component = 0; component < attribute.itemSize; component += 1) {
          const value = component === 0 ? attribute.getX(index)
            : component === 1 ? attribute.getY(index)
              : component === 2 ? attribute.getZ(index)
                : attribute.getW(index);
          expect(Number.isFinite(value), `${child.name}:${attribute.name}:${index}:${component}`).toBe(true);
        }
      }
    }
    triangles += geometry.getAttribute("position").count / 3;
  });
  expect(meshCount).toBeGreaterThan(0);
  return triangles;
}

describe("heavy dungeon door frame and leaf partition", () => {
  it("classifies only the authored perimeter as stationary frame", () => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-0.2, -0.5, -0.32),
      new THREE.Vector3(0.2, 0.5, 0.32),
    );
    expect(HEAVY_DUNGEON_DOOR_FRAME_LIMITS).toMatchObject({
      side: 0.84,
      top: 0.72,
      bottom: -0.88,
    });
    expect(HEAVY_DUNGEON_DOOR_ARTIFACT_TOP).toBe(0.44);
    expect(isHeavyDungeonDoorFrameTriangle(0, 0, bounds)).toBe(false);
    expect(isHeavyDungeonDoorFrameTriangle(0, 0.3, bounds)).toBe(true);
    expect(isHeavyDungeonDoorFrameTriangle(0.46, 0, bounds)).toBe(true);
    expect(isHeavyDungeonDoorFrameTriangle(-0.46, 0, bounds)).toBe(true);
  });

  it("retains the clipped surface while producing a narrower moving leaf", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      // Central moving leaf.
      0, -0.2, -0.2, 0, -0.2, 0.2, 0, 0.2, 0,
      // Right and left stationary jambs.
      0, -0.5, 0.3, 0, 0, 0.32, 0, 0.5, 0.3,
      0, -0.5, -0.3, 0, 0.5, -0.3, 0, 0, -0.32,
      // Top and bottom stationary rails.
      0, 0.3, -0.2, 0, 0.34, 0, 0, 0.3, 0.2,
      0, -0.46, -0.2, 0, -0.46, 0.2, 0, -0.5, 0,
    ], 3));
    const source = new THREE.Mesh(geometry);
    const partition = partitionHeavyDungeonDoor(source);
    const sourceTriangles = source.geometry.getAttribute("position").count / 3;
    expect(partition.frameTriangleCount).toBeGreaterThan(0);
    expect(partition.leafTriangleCount).toBeGreaterThan(0);
    expect(partition.frameTriangleCount + partition.leafTriangleCount)
      .toBeGreaterThanOrEqual(sourceTriangles);
    expect(partition.leafBounds.getSize(new THREE.Vector3()).z)
      .toBeLessThan(partition.fullBounds.getSize(new THREE.Vector3()).z);
  });

  it("partitions the production indexed GLB with intact render attributes and aperture", async () => {
    const sourcePath = fileURLToPath(new URL(
      `../public${DUNGEON_PROP_ASSETS["heavy-door"].sourceUrl}`,
      import.meta.url,
    ));
    const bytes = await readFile(sourcePath);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
    const originalError = console.error;
    let source: THREE.Group;
    try {
      console.error = () => undefined;
      source = (await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .parseAsync(buffer, "")).scene;
    } finally {
      console.error = originalError;
    }
    let partition: ReturnType<typeof partitionHeavyDungeonDoor> | null = null;
    try {
      partition = partitionHeavyDungeonDoor(source);
      const fullSize = partition.fullBounds.getSize(new THREE.Vector3());
      const frameSize = partition.frameBounds.getSize(new THREE.Vector3());
      const leafSize = partition.leafBounds.getSize(new THREE.Vector3());
      expect(Math.min(fullSize.x, fullSize.y, fullSize.z)).toBeGreaterThan(0);
      expect(frameSize.y).toBeGreaterThanOrEqual(leafSize.y);
      expect(frameSize.z).toBeGreaterThan(leafSize.z);
      const renderedTriangles = expectFinitePartitionMesh(partition.frame)
        + expectFinitePartitionMesh(partition.leaf);
      expect(renderedTriangles).toBe(partition.frameTriangleCount + partition.leafTriangleCount);
      expect(renderedTriangles).toBeGreaterThan(1_000);
    } finally {
      if (partition) {
        disposeObjectResources(partition.frame);
        disposeObjectResources(partition.leaf);
      }
      disposeObjectResources(source);
    }
  });
});
