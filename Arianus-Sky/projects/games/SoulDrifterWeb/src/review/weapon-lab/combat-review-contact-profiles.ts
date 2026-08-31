import * as THREE from "three";
import { createReviewMeshProbe, type ReviewMeshProbe } from "./combat-review-probes";
import { reviewRenderedVertexIndices, sampleReviewMeshVertices } from "./combat-review-contact";
import type { ReviewActorAdapter } from "./combat-review-types";

export type ReviewStrikeSurface =
  | { readonly kind: "indexed"; readonly meshName: string; readonly vertices: readonly number[] }
  | { readonly kind: "bones"; readonly names: readonly string[]; readonly minimumWeight?: number }
  | { readonly kind: "weapon"; readonly role: "primary" | "offhand" };

/** Explicit clip-second interval; availability is not contact or gameplay approval. */
export interface ReviewContactProfile {
  readonly id: string;
  readonly actionId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly surface: ReviewStrikeSurface;
  readonly evidence: string;
  readonly definitionId?: string;
  readonly assetSha256?: string;
}

const BASE_SHA = "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217";
// Frozen continuous-v5 author key intervals, not collision guarantees. Approach,
// reset, body/feet and the ranged Spit clip are deliberately not strike probes.
const BASE_STRIKES = {
  BiteAttack: { start: 3.05, end: 3.36, vertices: [22577], phase: "brace → fang contact" },
  ClawAttack: { start: 2.30, end: 2.67, vertices: [389], phase: "claw windup → followthrough" },
  LungeAttack: { start: 0.52, end: 0.66, vertices: [14545, 3], phase: "airborne reach → both-claw contact" },
  TailWhip: { start: 2.90, end: 3.85, vertices: [36325], phase: "tail load → followthrough" },
} as const;

function sourceSha(actor: ReviewActorAdapter): string | undefined {
  return (actor as ReviewActorAdapter & { definition?: { sha256?: string } }).definition?.sha256;
}

export function reviewContactProfile(actor: ReviewActorAdapter, actionId: string): ReviewContactProfile | null {
  if (actor.definitionId !== "breachling-base" || sourceSha(actor) !== BASE_SHA) return null;
  const strike = BASE_STRIKES[actionId as keyof typeof BASE_STRIKES];
  if (!strike) return null;
  return { id: `base-continuous-v5:${actionId}`, actionId, startSeconds: strike.start, endSeconds: strike.end,
    definitionId: actor.definitionId, assetSha256: BASE_SHA,
    surface: { kind: "indexed", meshName: "Breachling_Mesh", vertices: [...strike.vertices] },
    evidence: `continuous-v5 1ddbd4e5 author key interval: ${strike.phase}; sampled mesh contact required` };
}

export function validateReviewContactProfile(actor: ReviewActorAdapter, profile: ReviewContactProfile): void {
  const action = actor.actions().find((entry) => entry.id === profile.actionId);
  if (!profile.id.trim() || !profile.evidence.trim() || !action || action.unavailableReason
    || action.semantic !== "attack") throw new Error("An explicit available melee attack/profile is required.");
  if (![profile.startSeconds, profile.endSeconds].every(Number.isFinite) || profile.startSeconds < 0
    || profile.endSeconds <= profile.startSeconds || profile.endSeconds > action.durationSeconds + 1e-6) {
    throw new Error("Contact interval must lie inside the selected attack clip.");
  }
  if (profile.definitionId && profile.definitionId !== actor.definitionId
    || profile.assetSha256 && profile.assetSha256 !== sourceSha(actor)) throw new Error("Contact profile source identity does not match this actor.");
}

const unavailable = (reason: string): ReviewMeshProbe => ({ vertexCount: 0, unavailableReason: reason, sample: () => [] });

/** Reuses the shared rendered-topology and deformed-vertex samplers for exact tips. */
export function createReviewStrikeProbe(actor: ReviewActorAdapter, profile: ReviewContactProfile): ReviewMeshProbe {
  validateReviewContactProfile(actor, profile);
  const surface = profile.surface;
  if (surface.kind === "bones") {
    if (!surface.names.length) return unavailable("No rig-specific strike bones were selected.");
    return createReviewMeshProbe(actor.model, { bones: surface.names, minimumWeight: surface.minimumWeight,
      maximumVertices: 96 });
  }
  if (surface.kind === "weapon") {
    const equipped = actor as ReviewActorAdapter & { sockets?: readonly { role: string; prepared: { visual: THREE.Object3D } }[] };
    const weapon = equipped.sockets?.find((entry) => entry.role === surface.role)?.prepared.visual;
    return weapon ? createReviewMeshProbe(weapon, { maximumVertices: 96 })
      : unavailable(`No actual ${surface.role} weapon mesh is attached.`);
  }
  if (surface.kind !== "indexed" || !surface.vertices.length || surface.vertices.length > 256
    || surface.vertices.some((id) => !Number.isInteger(id) || id < 0)) throw new Error("Invalid indexed strike surface.");
  const matches: THREE.Mesh[] = [];
  actor.model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && object.name === surface.meshName) matches.push(object as THREE.Mesh);
  });
  if (matches.length !== 1) return unavailable("The exact strike mesh is missing or ambiguous.");
  const mesh = matches[0]!, vertices = [...new Set(surface.vertices)];
  const eligible = () => {
    const rendered = new Set(reviewRenderedVertexIndices(mesh));
    return vertices.every((id) => rendered.has(id));
  };
  if (!eligible()) return unavailable("A selected strike vertex is orphaned, hidden or outside the rendered topology.");
  return { vertexCount: vertices.length, sample: () => eligible()
    ? sampleReviewMeshVertices(mesh, vertices).map((position, index) => ({ id: `${mesh.uuid}:${vertices[index]}`, position })) : [] };
}

const sourceObjects = new WeakMap<object, number>();
let nextSourceObject = 0;
function attributeToken(value?: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): unknown {
  if (!value) return null;
  if (!sourceObjects.has(value)) sourceObjects.set(value, ++nextSourceObject);
  return [sourceObjects.get(value), value.count, "data" in value ? value.data.version : value.version];
}

/** Mutable calibration is owned by the actor; this detects replacement/source edits. */
export function reviewContactSourceToken(actor: ReviewActorAdapter): string {
  const meshes: unknown[] = [];
  actor.model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes.push([mesh.uuid, mesh.geometry.uuid, attributeToken(mesh.geometry.index ?? undefined),
      ...["position", "skinIndex", "skinWeight"].map((name) => attributeToken(mesh.geometry.getAttribute(name))),
      mesh.geometry.morphAttributes.position?.map(attributeToken)]);
  });
  return JSON.stringify([actor.instanceId, actor.definitionId, sourceSha(actor), actor.model.uuid,
    actor.root.position.toArray(), actor.root.quaternion.toArray(), actor.root.scale.toArray(), meshes]);
}
