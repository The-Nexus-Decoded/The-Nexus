import * as THREE from "three";
import { ReviewContactSurface, reviewRenderedVertexIndices, sampleReviewMeshVertices,
  type ReviewSurfaceContact } from "./combat-review-contact";

export interface ReviewProbePoint { readonly id: string; readonly position: THREE.Vector3 }
export interface ReviewMeshProbe {
  readonly vertexCount: number;
  readonly unavailableReason?: string;
  sample(): readonly ReviewProbePoint[];
}
interface Candidate { mesh: THREE.Mesh; vertex: number; position: THREE.Vector3 }
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spread probes over real surfaces, retaining extremities instead of first-N IDs. */
function farthestPoints(candidates: Candidate[], limit: number): Candidate[] {
  if (candidates.length <= limit) return candidates;
  const distances = new Float64Array(candidates.length).fill(Infinity);
  const result: Candidate[] = [];
  let next = 0;
  for (let count = 0; count < limit; count++) {
    const selected = candidates[next]!;
    result.push(selected);
    let farthest = -1;
    for (let index = 0; index < candidates.length; index++) {
      distances[index] = Math.min(distances[index]!, candidates[index]!.position.distanceToSquared(selected.position));
      if (distances[index]! > farthest) { farthest = distances[index]!; next = index; }
    }
    if (farthest <= 1e-14) break;
  }
  return result;
}

/**
 * Bind names are supplied for this model's real rig; no humanoid or base-creature
 * vertex numbers are copied to another asset. Omit bones for a rigid weapon prop.
 */
export function createReviewMeshProbe(root: THREE.Object3D, options: {
  bones?: readonly string[];
  minimumWeight?: number;
  maximumVertices?: number;
  include?: (mesh: THREE.Mesh) => boolean;
} = {}): ReviewMeshProbe {
  const limit = options.maximumVertices ?? 48;
  const minimum = options.minimumWeight ?? 0.25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 256 || !Number.isFinite(minimum) || minimum <= 0 || minimum > 1) {
    throw new Error("Invalid contact probe resolution or skin weight threshold");
  }
  root.updateWorldMatrix(true, true);
  root.updateMatrixWorld(true);
  const names = new Set(options.bones?.map(normalize));
  const candidates: Candidate[] = [];
  root.traverseVisible((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || options.include && !options.include(mesh)) return;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.BatchedMesh).isBatchedMesh) return;
    const rendered = reviewRenderedVertexIndices(mesh);
    let vertices: readonly number[] = rendered;
    if (options.bones) {
      const skin = mesh as THREE.SkinnedMesh;
      if (!skin.isSkinnedMesh) return;
      const joints = new Set(skin.skeleton.bones.flatMap((bone, index) => names.has(normalize(bone.name)) ? [index] : []));
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      if (!indices || !weights) return;
      vertices = rendered.filter((vertex) => {
        let weight = 0;
        for (let axis = 0; axis < 4; axis++) if (joints.has(indices.getComponent(vertex, axis))) weight += weights.getComponent(vertex, axis);
        return weight >= minimum;
      });
    }
    if (!vertices.length) return;
    const points = sampleReviewMeshVertices(mesh, vertices);
    points.forEach((position, index) => candidates.push({ mesh, vertex: vertices[index]!, position }));
  });
  const selected = farthestPoints(candidates, limit);
  const groups = new Map<THREE.Mesh, number[]>();
  for (const candidate of selected) {
    if (!groups.has(candidate.mesh)) groups.set(candidate.mesh, []);
    groups.get(candidate.mesh)!.push(candidate.vertex);
  }
  return {
    vertexCount: selected.length,
    unavailableReason: selected.length ? undefined : options.bones
      ? "No rendered vertices are weighted to the requested contact part on this model."
      : "No visible mesh triangles are available for this contact part.",
    sample() {
      const result: ReviewProbePoint[] = [];
      for (const [mesh, indices] of groups) {
        const rendered = new Set(reviewRenderedVertexIndices(mesh));
        const eligible = indices.filter((index) => rendered.has(index));
        if (!eligible.length) continue;
        sampleReviewMeshVertices(mesh, eligible).forEach((position, index) => {
          result.push({ id: `${mesh.uuid}:${eligible[index]}`, position });
        });
      }
      return result;
    },
  };
}

/** Current target geometry plus swept tips between adjacent absolute samples. */
export function measureReviewProbeContact(
  previous: readonly ReviewProbePoint[], current: readonly ReviewProbePoint[],
  target: ReviewContactSurface, toleranceMeters = 0.008,
): { contact: ReviewSurfaceContact; probeId: string; intervalFraction: number } | null {
  if (!Number.isFinite(toleranceMeters) || toleranceMeters < 0 || toleranceMeters > 0.05) throw new Error("Contact tolerance must be 0–5 cm");
  const before = new Map(previous.map((point) => [point.id, point.position]));
  let best: ReturnType<typeof measureReviewProbeContact> = null;
  for (const point of current) {
    const start = before.get(point.id);
    const swept = start ? target.segment(start, point.position) : null;
    const contact = swept ?? target.closest(point.position, toleranceMeters);
    if (!contact) continue;
    const fraction = swept && start ? contact.distance / Math.max(start.distanceTo(point.position), 1e-12) : 1;
    if (!best || fraction < best.intervalFraction || fraction === best.intervalFraction && contact.distance < best.contact.distance) {
      best = { contact, probeId: point.id, intervalFraction: fraction };
    }
  }
  return best;
}
