import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ReviewContactSurface, sampleReviewMeshVertices } from "../src/review/weapon-lab/combat-review-contact";
import { createReviewImpactAttachment } from "../src/review/weapon-lab/combat-review-impact-anchor";
import type { ReviewActorAdapter, ReviewEvent } from "../src/review/weapon-lab/combat-review-types";

function fixture() {
  const root = new THREE.Group(), model = new THREE.Group(), bone = new THREE.Bone();
  root.add(model); model.add(bone);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(12), 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = "weighted-target"; model.add(mesh); root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton([bone]));
  const actor: ReviewActorAdapter = { instanceId: "target", definitionId: "fixture", root, model,
    actions: () => [{ id: "idle", clipName: "idle", label: "Idle", durationSeconds: 1, semantic: "idle",
      approvalStatus: "source", rootPolicy: "in-place" }],
    sample: (_id, time) => { bone.position.z = time; bone.rotation.y = time * 0.3; root.updateMatrixWorld(true); },
    reset: () => {}, dispose: () => {},
  };
  const surface = new ReviewContactSurface(model); surface.update();
  const contact = surface.closest(new THREE.Vector3(0, 0, 0.01), 0.02)!; surface.dispose();
  const event: ReviewEvent = { id: "measured", actorId: "attacker", targetId: actor.instanceId,
    projectileId: "arrow-1", kind: "contact", result: "hit", timeSeconds: 0.5,
    position: contact.point.toArray(), normal: contact.normal.toArray(), surfaceAnchor: contact.surfaceAnchor,
    evidence: contact.evidence };
  return { actor, mesh, bone, geometry, event, contact };
}

describe("Exact deformed-triangle impact attachment", () => {
  it("owns the event and follows current target deformation as a rigid offset", () => {
    const { actor, mesh, geometry, event, contact } = fixture();
    const source = Array.from(geometry.getAttribute("position").array);
    const projectilePosition = contact.point.clone().addScaledVector(contact.normal, 0.2);
    const projectileQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.4, 0.1));
    const mutableEvent = structuredClone(event);
    const attachment = createReviewImpactAttachment({ target: actor, event: mutableEvent, projectilePosition, projectileQuaternion });
    const initial = attachment.sample();
    expect(initial.position.distanceTo(projectilePosition)).toBeLessThan(1e-10);
    expect(initial.quaternion.angleTo(projectileQuaternion)).toBeLessThan(1e-7);
    expect(Object.isFrozen(attachment.event)).toBe(true);
    expect(Object.isFrozen(attachment.event.surfaceAnchor!.worldTriangle[0])).toBe(true);
    (mutableEvent.position as unknown as number[])[0] = 99;
    (mutableEvent.surfaceAnchor!.barycentric as unknown as number[])[0] = 0.9;
    actor.sample("idle", 0.8); actor.root.position.set(2, 0.5, -1); actor.root.rotation.y = 0.4;
    const moved = attachment.sample(), anchor = attachment.event.surfaceAnchor!;
    const points = sampleReviewMeshVertices(mesh, anchor.vertexIndices), point = new THREE.Vector3();
    points.forEach((value, corner) => point.addScaledVector(value, anchor.barycentric[corner]!));
    expect(moved.position.distanceTo(point)).toBeCloseTo(0.2, 7);
    expect(moved.position.distanceTo(projectilePosition)).toBeGreaterThan(0.5);
    expect(moved.quaternion.angleTo(projectileQuaternion)).toBeGreaterThan(0.05);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual(source);
  });

  it("rejects timer cues, foreign targets and malformed receipts instead of inventing an attachment", () => {
    for (const mutate of [
      (event: ReviewEvent) => ({ ...event, kind: "reaction" as const }),
      (event: ReviewEvent) => ({ ...event, targetId: "other-target" }),
      (event: ReviewEvent) => ({ ...event, surfaceAnchor: undefined }),
      (event: ReviewEvent) => ({ ...event, surfaceAnchor: { ...event.surfaceAnchor!, geometryId: "other-geometry" } }),
      (event: ReviewEvent) => ({ ...event, surfaceAnchor: { ...event.surfaceAnchor!, vertexIndices: [2, 1, 0] as const } }),
      (event: ReviewEvent) => ({ ...event, surfaceAnchor: { ...event.surfaceAnchor!, barycentric: [0.8, 0.8, -0.6] as const } }),
      (event: ReviewEvent) => ({ ...event, normal: [0, 0, -1] as const }),
    ]) {
      const { actor, event, contact } = fixture();
      expect(() => createReviewImpactAttachment({ target: actor, event: mutate(event),
        projectilePosition: contact.point, projectileQuaternion: new THREE.Quaternion() })).toThrow();
    }
  });

  it("fails closed after geometry, topology, visibility or deformation becomes invalid", () => {
    for (const invalidate of [
      ({ mesh }: ReturnType<typeof fixture>) => { mesh.geometry = mesh.geometry.clone(); },
      ({ geometry }: ReturnType<typeof fixture>) => { geometry.setDrawRange(3, 0); },
      ({ mesh }: ReturnType<typeof fixture>) => { mesh.visible = false; },
      ({ geometry }: ReturnType<typeof fixture>) => { geometry.getAttribute("position").needsUpdate = true; },
      ({ geometry }: ReturnType<typeof fixture>) => { geometry.morphAttributes = { ...geometry.morphAttributes }; },
      ({ bone }: ReturnType<typeof fixture>) => { bone.scale.set(0, 0, 0); },
    ]) {
      const value = fixture();
      const attachment = createReviewImpactAttachment({ target: value.actor, event: value.event,
        projectilePosition: value.contact.point, projectileQuaternion: new THREE.Quaternion() });
      invalidate(value); expect(() => attachment.sample()).toThrow();
    }
    const value = fixture();
    const attachment = createReviewImpactAttachment({ target: value.actor, event: value.event,
      projectilePosition: value.contact.point, projectileQuaternion: new THREE.Quaternion() });
    attachment.dispose(); attachment.dispose(); expect(() => attachment.sample()).toThrow(/disposed/);
  });
});
