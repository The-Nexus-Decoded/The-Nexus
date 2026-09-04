import * as THREE from "three";

export const HEAVY_DUNGEON_DOOR_FRAME_LIMITS = Object.freeze({
  side: 0.84,
  top: 0.72,
  bottom: -0.88,
});
export const HEAVY_DUNGEON_DOOR_ARTIFACT_TOP = 0.44;

export interface HeavyDungeonDoorPartition {
  frame: THREE.Object3D;
  leaf: THREE.Object3D;
  fullBounds: THREE.Box3;
  frameBounds: THREE.Box3;
  leafBounds: THREE.Box3;
  frameTriangleCount: number;
  leafTriangleCount: number;
}

interface GeometryGroupRange {
  start: number;
  count: number;
  materialIndex: number;
}

function normalizedCoordinate(value: number, minimum: number, maximum: number): number {
  const span = Math.max(maximum - minimum, Number.EPSILON);
  return ((value - minimum) / span) * 2 - 1;
}

export function isHeavyDungeonDoorFrameTriangle(
  centroidY: number,
  centroidZ: number,
  bounds: THREE.Box3,
): boolean {
  const y = normalizedCoordinate(centroidY, bounds.min.y, bounds.max.y);
  const z = normalizedCoordinate(centroidZ, bounds.min.z, bounds.max.z);
  return Math.abs(z) >= HEAVY_DUNGEON_DOOR_FRAME_LIMITS.side
    || y >= HEAVY_DUNGEON_DOOR_FRAME_LIMITS.top
    || y <= HEAVY_DUNGEON_DOOR_FRAME_LIMITS.bottom;
}

interface PolygonVertex {
  attributes: Record<string, number[]>;
}

interface ClipPlane {
  axis: 1 | 2;
  boundary: number;
  keepGreater: boolean;
}

interface GeometryBuilder {
  values: Record<string, number[]>;
  groups: GeometryGroupRange[];
  triangleCount: number;
}

function attributeComponent(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  component: number,
): number {
  if (component === 0) return attribute.getX(index);
  if (component === 1) return attribute.getY(index);
  if (component === 2) return attribute.getZ(index);
  if (component === 3) return attribute.getW(index);
  throw new Error(`Unsupported heavy dungeon door attribute width ${attribute.itemSize}`);
}

function interpolateVertex(left: PolygonVertex, right: PolygonVertex, alpha: number): PolygonVertex {
  const attributes: Record<string, number[]> = {};
  Object.entries(left.attributes).forEach(([name, leftValues]) => {
    const rightValues = right.attributes[name]!;
    attributes[name] = leftValues.map((value, index) => (
      THREE.MathUtils.lerp(value, rightValues[index]!, alpha)
    ));
  });
  return { attributes };
}

function splitPolygon(
  polygon: PolygonVertex[],
  plane: ClipPlane,
): { inside: PolygonVertex[]; outside: PolygonVertex[] } {
  const inside: PolygonVertex[] = [];
  const outside: PolygonVertex[] = [];
  const coordinate = (vertex: PolygonVertex): number => vertex.attributes.position![plane.axis]!;
  const isInside = (value: number): boolean => (
    plane.keepGreater ? value >= plane.boundary : value <= plane.boundary
  );
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const currentCoordinate = coordinate(current);
    const nextCoordinate = coordinate(next);
    const currentInside = isInside(currentCoordinate);
    const nextInside = isInside(nextCoordinate);
    (currentInside ? inside : outside).push(current);
    if (currentInside === nextInside) continue;
    const alpha = (plane.boundary - currentCoordinate) / (nextCoordinate - currentCoordinate);
    const intersection = interpolateVertex(current, next, alpha);
    inside.push(intersection);
    outside.push(intersection);
  }
  return { inside, outside };
}

function normalizeCleanedDoorVertex(
  vertex: PolygonVertex,
  minimumY: number,
  cleanMaximumY: number,
  originalMaximumY: number,
): PolygonVertex {
  const attributes = Object.fromEntries(
    Object.entries(vertex.attributes).map(([name, values]) => [name, [...values]]),
  );
  const verticalScale = (originalMaximumY - minimumY) / (cleanMaximumY - minimumY);
  const position = attributes.position!;
  position[1] = minimumY + (position[1]! - minimumY) * verticalScale;
  const normal = attributes.normal;
  if (normal && normal.length >= 3) {
    normal[1] = normal[1]! / verticalScale;
    const length = Math.hypot(normal[0]!, normal[1]!, normal[2]!) || 1;
    normal[0] = normal[0]! / length;
    normal[1] = normal[1]! / length;
    normal[2] = normal[2]! / length;
  }
  return { attributes };
}

function appendPolygon(builder: GeometryBuilder, polygon: PolygonVertex[]): void {
  if (polygon.length < 3) return;
  for (let index = 1; index + 1 < polygon.length; index += 1) {
    for (const vertex of [polygon[0]!, polygon[index]!, polygon[index + 1]!]) {
      Object.entries(vertex.attributes).forEach(([name, values]) => builder.values[name]!.push(...values));
    }
    builder.triangleCount += 1;
  }
}

function buildGeometry(
  source: THREE.BufferGeometry,
  builder: GeometryBuilder,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  Object.entries(source.attributes).forEach(([name, attribute]) => {
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(builder.values[name]!, attribute.itemSize, attribute.normalized),
    );
  });
  builder.groups.forEach((group) => geometry.addGroup(group.start, group.count, group.materialIndex));
  geometry.name = source.name;
  geometry.userData = { ...source.userData };
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (geometry.hasAttribute("normal")) geometry.normalizeNormals();
  return geometry;
}

function partitionGeometry(source: THREE.BufferGeometry): {
  frame: THREE.BufferGeometry;
  leaf: THREE.BufferGeometry;
  frameTriangleCount: number;
  leafTriangleCount: number;
} {
  if (Object.keys(source.morphAttributes).length > 0) {
    throw new Error("Heavy dungeon door partition does not support morph targets");
  }
  const position = source.getAttribute("position");
  if (!position) throw new Error("Heavy dungeon door geometry has no readable position attribute");
  Object.values(source.attributes).forEach((attribute) => {
    if (attribute.itemSize > 4) {
      throw new Error(`Unsupported heavy dungeon door attribute width ${attribute.itemSize}`);
    }
  });
  source.computeBoundingBox();
  const bounds = source.boundingBox?.clone();
  if (!bounds || bounds.isEmpty()) throw new Error("Heavy dungeon door geometry has empty bounds");
  const center = bounds.getCenter(new THREE.Vector3());
  const halfSize = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const cleanMaximumY = center.y + halfSize.y * HEAVY_DUNGEON_DOOR_ARTIFACT_TOP;
  const cleanTopPlane: ClipPlane = { axis: 1, boundary: cleanMaximumY, keepGreater: false };
  const planes: ClipPlane[] = [
    { axis: 2, boundary: center.z - halfSize.z * HEAVY_DUNGEON_DOOR_FRAME_LIMITS.side, keepGreater: true },
    { axis: 2, boundary: center.z + halfSize.z * HEAVY_DUNGEON_DOOR_FRAME_LIMITS.side, keepGreater: false },
    { axis: 1, boundary: center.y + halfSize.y * HEAVY_DUNGEON_DOOR_FRAME_LIMITS.bottom, keepGreater: true },
    { axis: 1, boundary: center.y + halfSize.y * HEAVY_DUNGEON_DOOR_FRAME_LIMITS.top, keepGreater: false },
  ];
  const attributeEntries = Object.entries(source.attributes);
  const emptyValues = (): Record<string, number[]> => Object.fromEntries(
    attributeEntries.map(([name]) => [name, []]),
  );
  const frameBuilder: GeometryBuilder = { values: emptyValues(), groups: [], triangleCount: 0 };
  const leafBuilder: GeometryBuilder = { values: emptyValues(), groups: [], triangleCount: 0 };
  const sourceIndex = source.getIndex();
  const indexCount = sourceIndex?.count ?? position.count;
  const groups: GeometryGroupRange[] = source.groups.length > 0
    ? source.groups.map((group) => ({
      start: group.start,
      count: group.count,
      materialIndex: group.materialIndex ?? 0,
    }))
    : [{ start: 0, count: indexCount, materialIndex: 0 }];
  const sourceVertexIndex = (offset: number): number => sourceIndex?.getX(offset) ?? offset;
  const readVertex = (index: number): PolygonVertex => ({
    attributes: Object.fromEntries(attributeEntries.map(([name, attribute]) => [
      name,
      Array.from({ length: attribute.itemSize }, (_, component) => (
        attributeComponent(attribute, index, component)
      )),
    ])),
  });

  for (const group of groups) {
    const frameStart = frameBuilder.values.position!.length / position.itemSize;
    const leafStart = leafBuilder.values.position!.length / position.itemSize;
    const end = Math.min(indexCount, group.start + group.count);
    for (let offset = group.start; offset + 2 < end; offset += 3) {
      const sourceTriangle = [
        readVertex(sourceVertexIndex(offset)),
        readVertex(sourceVertexIndex(offset + 1)),
        readVertex(sourceVertexIndex(offset + 2)),
      ];
      const cleaned = splitPolygon(sourceTriangle, cleanTopPlane).inside.map((vertex) => (
        normalizeCleanedDoorVertex(vertex, bounds.min.y, cleanMaximumY, bounds.max.y)
      ));
      if (cleaned.length < 3) continue;
      let leafCandidates = [cleaned];
      const frameFragments: PolygonVertex[][] = [];
      for (const [planeIndex, plane] of planes.entries()) {
        const nextCandidates: PolygonVertex[][] = [];
        leafCandidates.forEach((polygon) => {
          const split = splitPolygon(polygon, plane);
          // The generated source's upper strip contains the visible L-shaped
          // extrusion. Keep side jambs only inside the final vertical frame
          // bounds, keep the bottom rail from the source, discard the malformed
          // upper strip, and let runtime add one clean stationary top rail.
          if (planeIndex < 2 && split.outside.length >= 3) {
            let boundedJambs = [split.outside];
            for (const verticalPlane of planes.slice(2)) {
              boundedJambs = boundedJambs.flatMap((fragment) => {
                const bounded = splitPolygon(fragment, verticalPlane).inside;
                return bounded.length >= 3 ? [bounded] : [];
              });
            }
            frameFragments.push(...boundedJambs);
          } else if (planeIndex === 2 && split.outside.length >= 3) {
            frameFragments.push(split.outside);
          }
          if (split.inside.length >= 3) nextCandidates.push(split.inside);
        });
        leafCandidates = nextCandidates;
      }
      frameFragments.forEach((polygon) => appendPolygon(frameBuilder, polygon));
      leafCandidates.forEach((polygon) => appendPolygon(leafBuilder, polygon));
    }
    const frameCount = frameBuilder.values.position!.length / position.itemSize - frameStart;
    const leafCount = leafBuilder.values.position!.length / position.itemSize - leafStart;
    if (frameCount > 0) frameBuilder.groups.push({ start: frameStart, count: frameCount, materialIndex: group.materialIndex });
    if (leafCount > 0) leafBuilder.groups.push({ start: leafStart, count: leafCount, materialIndex: group.materialIndex });
  }
  return {
    frame: buildGeometry(source, frameBuilder),
    leaf: buildGeometry(source, leafBuilder),
    frameTriangleCount: frameBuilder.triangleCount,
    leafTriangleCount: leafBuilder.triangleCount,
  };
}

export function partitionHeavyDungeonDoor(source: THREE.Object3D): HeavyDungeonDoorPartition {
  source.updateMatrixWorld(true);
  const fullBounds = new THREE.Box3().setFromObject(source, true);
  const frame = source.clone(true);
  const leaf = source.clone(true);
  const sourceMeshes: THREE.Mesh[] = [];
  const frameMeshes: THREE.Mesh[] = [];
  const leafMeshes: THREE.Mesh[] = [];
  source.traverse((object) => { if (object instanceof THREE.Mesh) sourceMeshes.push(object); });
  frame.traverse((object) => { if (object instanceof THREE.Mesh) frameMeshes.push(object); });
  leaf.traverse((object) => { if (object instanceof THREE.Mesh) leafMeshes.push(object); });
  if (
    sourceMeshes.length === 0
    || sourceMeshes.length !== frameMeshes.length
    || sourceMeshes.length !== leafMeshes.length
  ) throw new Error("Heavy dungeon door mesh hierarchy could not be partitioned");

  let frameTriangleCount = 0;
  let leafTriangleCount = 0;
  sourceMeshes.forEach((mesh, index) => {
    const partition = partitionGeometry(mesh.geometry);
    frameMeshes[index]!.geometry = partition.frame;
    leafMeshes[index]!.geometry = partition.leaf;
    frameTriangleCount += partition.frameTriangleCount;
    leafTriangleCount += partition.leafTriangleCount;
  });
  frame.updateMatrixWorld(true);
  leaf.updateMatrixWorld(true);
  const frameBounds = new THREE.Box3().setFromObject(frame, true);
  const leafBounds = new THREE.Box3().setFromObject(leaf, true);
  if (frameBounds.isEmpty() || leafBounds.isEmpty()) {
    throw new Error("Heavy dungeon door partition produced an empty frame or leaf");
  }
  return {
    frame,
    leaf,
    fullBounds,
    frameBounds,
    leafBounds,
    frameTriangleCount,
    leafTriangleCount,
  };
}
