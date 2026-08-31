import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import type { ReviewSurfaceAnchor } from "./combat-review-types";

export interface ReviewSurfaceContact {
  readonly meshId: string;
  readonly meshName: string;
  /** Original geometry triangle, not a BVH-reordered triangle. */
  readonly faceIndex: number;
  readonly point: THREE.Vector3;
  readonly normal: THREE.Vector3;
  readonly distance: number;
  readonly sampleRevision: number;
  readonly evidence: string;
  readonly surfaceAnchor?: ReviewSurfaceAnchor;
}

export interface ReviewSurfaceSnapshot {
  readonly revision: number;
  readonly meshes: number;
  readonly triangles: number;
  /** Explicitly unmeasured, rather than silently treating instances as one mesh. */
  readonly unsupportedMeshIds: readonly string[];
}

interface Surface {
  source: THREE.Mesh;
  sourceIndex: THREE.BufferAttribute | null;
  signature: string;
  geometry: THREE.BufferGeometry;
  bvh: MeshBVH;
  sourceOffsets: number[];
  usedVertices: number[];
}

function finitePoint(point: THREE.Vector3): void {
  if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error("Contact coordinates must be finite");
}

function materialVisible(material: THREE.Material | undefined): boolean {
  return !!material && material.visible && !(material.transparent && material.opacity === 0);
}

function updateReviewWorld(root: THREE.Object3D): void {
  root.updateWorldMatrix(true, true);
  const bones = new Set<THREE.Bone>();
  root.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
      for (const bone of (object as THREE.SkinnedMesh).skeleton.bones) bones.add(bone);
    }
  });
  // GLTF bones may be siblings of a supplied mesh rather than its descendants.
  for (const bone of bones) bone.updateWorldMatrix(true, false);
  // Attached SkinnedMesh refreshes bindMatrixInverse in this renderer override.
  root.updateMatrixWorld(true);
}

function topology(mesh: THREE.Mesh): { signature: string; ranges: { start: number; count: number }[] } {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const total = geometry.index?.count ?? position.count;
  const drawStart = Math.max(0, geometry.drawRange.start);
  const drawEnd = Math.min(total, drawStart + geometry.drawRange.count);
  const ranges = Array.isArray(mesh.material)
    ? geometry.groups.filter((group) => materialVisible((mesh.material as THREE.Material[])[group.materialIndex ?? 0]))
    : materialVisible(mesh.material) ? [{ start: 0, count: total }] : [];
  const clipped = ranges.map((range) => {
    const start = Math.max(drawStart, range.start);
    return { start, count: Math.min(drawEnd, range.start + range.count) - start };
  }).filter((range) => range.count >= 3);
  // Compare a small range signature, not a new array/string for every triangle each frame.
  return { signature: `${geometry.uuid}:${geometry.index?.version ?? -1}:${total}:${position.count}:${JSON.stringify(clipped)}`, ranges: clipped };
}

function createSurface(source: THREE.Mesh, signature: string, ranges: { start: number; count: number }[]): Surface {
  const selected = new Set<number>();
  for (const range of ranges) for (let i = range.start; i + 2 < range.start + range.count; i += 3) selected.add(i);
  const offsets = [...selected].sort((a, b) => a - b);
  const geometry = new THREE.BufferGeometry();
  const positions = source.geometry.getAttribute("position");
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3));
  const indices: number[] = [];
  for (const offset of offsets) for (let j = 0; j < 3; j += 1) indices.push(source.geometry.index?.getX(offset + j) ?? offset + j);
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= positions.count)) {
    geometry.dispose();
    throw new Error(`Invalid contact topology: ${source.name || source.uuid}`);
  }
  geometry.setIndex(indices);
  const surface = { source, sourceIndex: source.geometry.index, signature, geometry, sourceOffsets: offsets,
    usedVertices: [...new Set(indices)] };
  updatePositions(surface);
  return { ...surface, bvh: new MeshBVH(geometry, { indirect: true, targetLeafSize: 8 }) };
}

function updatePositions(surface: Pick<Surface, "source" | "geometry" | "usedVertices">): void {
  const position = surface.geometry.getAttribute("position") as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  for (const index of surface.usedVertices) {
    // The same morph + skin transform that renders the actor, then its full world transform.
    surface.source.getVertexPosition(index, vertex).applyMatrix4(surface.source.matrixWorld);
    finitePoint(vertex);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
}

/**
 * Owned, refittable triangle surfaces for one sampled actor/prop. This measures mesh
 * contact, not damage or a rigid-body simulation. Alpha-texture holes and shader-only
 * displacement are not geometry; callers must exclude foliage/VFX from damage skins.
 * No prototype patches or writes to shared source geometry/materials are used.
 */
export class ReviewContactSurface {
  private readonly surfaces = new Map<string, Surface>();
  private revision = 0;
  private disposed = false;
  private summary: ReviewSurfaceSnapshot = { revision: 0, meshes: 0, triangles: 0, unsupportedMeshIds: [] };

  constructor(private readonly root: THREE.Object3D, private readonly include: (mesh: THREE.Mesh) => boolean = () => true) {}

  update(): ReviewSurfaceSnapshot {
    this.assertLive();
    updateReviewWorld(this.root);
    const seen = new Set<string>();
    const unsupported: string[] = [];
    let triangles = 0;
    let ancestorsVisible = true;
    for (let parent = this.root.parent; parent; parent = parent.parent) ancestorsVisible &&= parent.visible;
    if (ancestorsVisible) this.root.traverseVisible((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry.getAttribute("position") || !this.include(mesh)) return;
      if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.BatchedMesh).isBatchedMesh) {
        unsupported.push(mesh.uuid);
        return;
      }
      const { signature, ranges } = topology(mesh);
      if (!ranges.length) return;
      let surface = this.surfaces.get(mesh.uuid);
      if (!surface || surface.signature !== signature || surface.sourceIndex !== mesh.geometry.index) {
        surface?.geometry.dispose();
        surface = createSurface(mesh, signature, ranges);
        this.surfaces.set(mesh.uuid, surface);
      } else {
        updatePositions(surface);
        surface.bvh.refit();
      }
      seen.add(mesh.uuid);
      triangles += surface.sourceOffsets.length;
    });
    for (const [id, surface] of this.surfaces) if (!seen.has(id)) {
      surface.geometry.dispose();
      this.surfaces.delete(id);
    }
    this.revision += 1;
    this.summary = Object.freeze({ revision: this.revision, meshes: seen.size, triangles,
      unsupportedMeshIds: Object.freeze(unsupported) });
    return this.summary;
  }

  snapshot(): ReviewSurfaceSnapshot { return this.summary; }

  bounds(target = new THREE.Box3()): THREE.Box3 {
    this.assertLive();
    target.makeEmpty();
    for (const surface of this.surfaces.values()) target.union(surface.bvh.getBoundingBox(new THREE.Box3()));
    return target;
  }

  closest(point: THREE.Vector3, maxDistance = Infinity): ReviewSurfaceContact | null {
    this.assertLive();
    finitePoint(point);
    if (Number.isNaN(maxDistance) || maxDistance < 0) throw new Error("Contact distance must be nonnegative");
    let best: ReviewSurfaceContact | null = null;
    for (const surface of this.surfaces.values()) {
      const hit = surface.bvh.closestPointToPoint(point, undefined, 0, best?.distance ?? maxDistance);
      if (hit && hit.distance <= maxDistance && (!best || hit.distance < best.distance)) {
        best = this.contact(surface, hit.faceIndex, hit.point, hit.distance);
      }
    }
    return best;
  }

  /** Swept point/projectile against the sampled target, including thin triangles. */
  segment(from: THREE.Vector3, to: THREE.Vector3): ReviewSurfaceContact | null {
    this.assertLive();
    finitePoint(from);
    finitePoint(to);
    const direction = to.clone().sub(from);
    const length = direction.length();
    if (!length) return this.closest(from, 0);
    const ray = new THREE.Ray(from.clone(), direction.divideScalar(length));
    let best: ReviewSurfaceContact | null = null;
    for (const surface of this.surfaces.values()) {
      const hit = surface.bvh.raycastFirst(ray, THREE.DoubleSide, 0, best?.distance ?? length);
      if (hit && hit.faceIndex != null && (!best || hit.distance < best.distance)) {
        best = this.contact(surface, hit.faceIndex, hit.point, hit.distance);
      }
    }
    return best;
  }

  dispose(): void {
    for (const surface of this.surfaces.values()) surface.geometry.dispose();
    this.surfaces.clear();
    this.disposed = true;
  }

  private assertLive(): void {
    if (this.disposed) throw new Error("Contact surface has been disposed");
  }

  private contact(surface: Surface, faceIndex: number, point: THREE.Vector3, distance: number): ReviewSurfaceContact {
    const geometry = surface.geometry;
    const position = geometry.getAttribute("position");
    const index = geometry.index!;
    const vertexIndices = [0, 1, 2].map((corner) => index.getX(faceIndex * 3 + corner)) as [number, number, number];
    const triangle = new THREE.Triangle(...vertexIndices.map((vertex) =>
      new THREE.Vector3().fromBufferAttribute(position, vertex)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]);
    const triangleOffset = surface.sourceOffsets[faceIndex]!, sourceFace = Math.floor(triangleOffset / 3);
    const barycentric = triangle.getBarycoord(point, new THREE.Vector3());
    const tuple = (value: THREE.Vector3) => Object.freeze(value.toArray()) as readonly [number, number, number];
    const surfaceAnchor: ReviewSurfaceAnchor | undefined = barycentric && triangle.getArea() > 1e-14
      && barycentric.toArray().every((value) => Number.isFinite(value) && value >= -1e-6 && value <= 1 + 1e-6)
      ? Object.freeze({ meshId: surface.source.uuid, geometryId: surface.source.geometry.uuid, triangleOffset,
        vertexIndices: Object.freeze(vertexIndices), barycentric: tuple(barycentric),
        worldTriangle: Object.freeze([tuple(triangle.a), tuple(triangle.b), tuple(triangle.c)]) as ReviewSurfaceAnchor["worldTriangle"] }) : undefined;
    return { meshId: surface.source.uuid, meshName: surface.source.name, faceIndex: sourceFace,
      point: point.clone(), normal: triangle.getNormal(new THREE.Vector3()), distance, sampleRevision: this.revision,
      ...(surfaceAnchor ? { surfaceAnchor } : {}),
      evidence: `deformed-triangle:${surface.source.uuid}:${sourceFace}:sample-${this.revision}` };
  }
}

const probeTopology = new WeakMap<THREE.Mesh, {
  signature: string; index: THREE.BufferAttribute | null; vertices: Set<number>; indices: readonly number[]; triangleOffsets: Set<number>;
}>();

function renderedTopology(mesh: THREE.Mesh) {
  const { signature, ranges } = topology(mesh);
  let cached = probeTopology.get(mesh);
  if (!cached || cached.signature !== signature || cached.index !== mesh.geometry.index) {
    const vertices = new Set<number>(), triangleOffsets = new Set<number>();
    for (const range of ranges) for (let offset = range.start; offset + 2 < range.start + range.count; offset += 3) {
      triangleOffsets.add(offset);
      for (let corner = 0; corner < 3; corner++) vertices.add(mesh.geometry.index?.getX(offset + corner) ?? offset + corner);
    }
    cached = { signature, index: mesh.geometry.index, vertices, indices: Object.freeze([...vertices]), triangleOffsets };
    probeTopology.set(mesh, cached);
  }
  return cached;
}

/** Shared topology for probes and camera bounds; excludes unused export vertices. */
export function reviewRenderedVertexIndices(mesh: THREE.Mesh): readonly number[] {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return [];
  if (!mesh.geometry.getAttribute("position")) return [];
  return renderedTopology(mesh).indices;
}

/** Validate the exact draw call triangle, not three vertices that may survive in other faces. */
export function reviewRenderedTriangleIndices(mesh: THREE.Mesh, triangleOffset: number): readonly [number, number, number] | null {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return null;
  const count = mesh.geometry.getAttribute("position")?.count ?? 0;
  if (!count || !Number.isInteger(triangleOffset) || triangleOffset < 0
    || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.BatchedMesh).isBatchedMesh
    || !renderedTopology(mesh).triangleOffsets.has(triangleOffset)) return null;
  const indices = [0, 1, 2].map((corner) => mesh.geometry.index?.getX(triangleOffset + corner) ?? triangleOffset + corner);
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= count) || new Set(indices).size !== 3) return null;
  return Object.freeze(indices) as readonly [number, number, number];
}

/** Model-specific probes must name rendered vertices, not unreferenced export debris. */
export function sampleReviewMeshVertices(mesh: THREE.Mesh, indices: readonly number[]): THREE.Vector3[] {
  updateReviewWorld(mesh);
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.visible) throw new Error("Contact probes require a visible mesh");
  }
  const cached = renderedTopology(mesh);
  const count = mesh.geometry.getAttribute("position")?.count ?? 0;
  return indices.map((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= count) throw new Error("Contact probe vertex is outside this mesh");
    if (!cached.vertices.has(index)) throw new Error("Contact probe vertex is not in a rendered triangle");
    const point = mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
    finitePoint(point);
    return point;
  });
}
