import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  HEAVY_DUNGEON_DOOR_ARTIFACT_TOP,
  HEAVY_DUNGEON_DOOR_FRAME_LIMITS,
  isHeavyDungeonDoorFrameTriangle,
  partitionHeavyDungeonDoor,
} from "../src/game/environment/HeavyDungeonDoor";

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
});
