import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ReviewContactSurface, reviewRenderedVertexIndices } from "../src/review/weapon-lab/combat-review-contact";
import { createReviewMeshProbe, measureReviewProbeContact } from "../src/review/weapon-lab/combat-review-probes";
import { sampleReviewPoses, measureReviewMotionBounds } from "../src/review/weapon-lab/combat-review-posing";
import type { ReviewActorAdapter } from "../src/review/weapon-lab/combat-review-types";

function fixture() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 0, 1, 0, 999, 999, 999], 3));
  geometry.setIndex([0, 1, 2]);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const bone = new THREE.Bone(); bone.name = "actual-claw";
  const model = new THREE.Group(), root = new THREE.Group();
  bone.add(mesh); model.add(bone); root.add(model);
  const actor: ReviewActorAdapter = {
    instanceId: "test", definitionId: "test", root, model, actions: () => [],
    sample(id, time) {
      bone.position.set(id === "move" ? time * 3 : 0, 0, 0);
      bone.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), id === "turn" ? Math.PI / 2 * time : 0);
      bone.scale.setScalar(1);
    }, reset() { this.sample("idle", 0); }, dispose() {},
  };
  return { actor, bone, mesh };
}

describe("shared absolute pose blending and visible contact probes", () => {
  it("blends two complete skeletal poses and is independent of seek history", () => {
    const { actor, bone } = fixture();
    const poses = [{ actionId: "move", timeSeconds: 1, weight: 0.25 }, { actionId: "turn", timeSeconds: 1, weight: 0.75 }];
    const settle = vi.fn();
    sampleReviewPoses(actor, poses, settle);
    expect(bone.position.x).toBeCloseTo(0.75);
    const expectedRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 * 0.75);
    expect(bone.quaternion.angleTo(expectedRotation)).toBeLessThan(1e-7);
    actor.sample("move", 99);
    sampleReviewPoses(actor, poses);
    expect(bone.position.x).toBeCloseTo(0.75);
    expect(settle).toHaveBeenCalledTimes(1);
    sampleReviewPoses(actor, [{ actionId: "move", timeSeconds: 2, weight: 2 }]);
    expect(bone.position.x).toBe(6);
    expect(() => sampleReviewPoses(actor, [{ actionId: "move", timeSeconds: 1, weight: 0 }])).toThrow(/positive total/);
    expect(() => sampleReviewPoses(actor, [{ actionId: "move", timeSeconds: 1, weight: NaN }])).toThrow(/Invalid/);
  });

  it("frames the entire sampled motion, excludes orphan vertices and restores the current pose", async () => {
    const { actor, bone } = fixture();
    const bounds = await measureReviewMotionBounds(actor, [0, 0.5, 1].map((time) => [
      { actionId: "move", timeSeconds: time, weight: 1 },
    ]), { restore: [{ actionId: "move", timeSeconds: 0.2, weight: 1 }] });
    expect(bounds.min.x).toBeCloseTo(-1);
    expect(bounds.max.x).toBeCloseTo(4);
    expect(bounds.max.y).toBeCloseTo(1);
    expect(bone.position.x).toBeCloseTo(0.6);
    const abort = new AbortController(); abort.abort();
    await expect(measureReviewMotionBounds(actor, [[{ actionId: "move", timeSeconds: 1, weight: 1 }]],
      { signal: abort.signal, restore: [{ actionId: "idle", timeSeconds: 0, weight: 1 }] })).rejects.toThrow(/cancelled/);
    expect(bone.position.x).toBe(0);
  });

  it("selects real rigid vertices with stable IDs, not source orphan points", () => {
    const { mesh, bone } = fixture();
    const indices = reviewRenderedVertexIndices(mesh);
    expect(indices).toEqual([0, 1, 2]);
    expect(Object.isFrozen(indices)).toBe(true);
    const probe = createReviewMeshProbe(mesh, { maximumVertices: 2 });
    const before = probe.sample();
    expect(before).toHaveLength(2);
    expect(before.every((point) => point.position.length() < 2)).toBe(true);
    bone.position.z = 4;
    const moved = probe.sample();
    expect(moved.map((point) => point.id)).toEqual(before.map((point) => point.id));
    expect(moved.every((point) => point.position.z === 4)).toBe(true);
    mesh.visible = false;
    expect(probe.sample()).toEqual([]);
    expect(createReviewMeshProbe(mesh).unavailableReason).toBeTruthy();
  });

  it("uses this skeleton's actual weighted contact part and rejects unavailable anatomy", () => {
    const { mesh } = fixture();
    mesh.geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(16), 4));
    const weights = new Float32Array(16); for (let index = 0; index < 4; index++) weights[index * 4] = 1;
    mesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
    const skin = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
    const claw = new THREE.Bone(); claw.name = "front_hand.R";
    skin.add(claw); skin.bind(new THREE.Skeleton([claw]));
    const probe = createReviewMeshProbe(skin, { bones: ["front_handR"] });
    expect(probe.vertexCount).toBe(3);
    expect(createReviewMeshProbe(skin, { bones: ["humanPinky"] }).unavailableReason).toContain("No rendered vertices");
    claw.position.z = 2;
    expect(probe.sample().every((point) => point.position.z === 2)).toBe(true);
  });

  it("detects swept contact, near contact, and misses without inventing a hit", () => {
    const { actor } = fixture();
    const surface = new ReviewContactSurface(actor.root); surface.update();
    const before = [{ id: "claw", position: new THREE.Vector3(0, 0.5, -1) }];
    const current = [{ id: "claw", position: new THREE.Vector3(0, 0.5, 1) }];
    const hit = measureReviewProbeContact(before, current, surface)!;
    expect(hit.intervalFraction).toBeCloseTo(0.5);
    expect(hit.contact.faceIndex).toBe(0);
    expect(hit.contact.evidence).toContain("deformed-triangle");
    expect(measureReviewProbeContact([], [{ id: "near", position: new THREE.Vector3(0, 0.5, 0.003) }], surface)).not.toBeNull();
    expect(measureReviewProbeContact([], [{ id: "miss", position: new THREE.Vector3(3, 0.5, 0) }], surface)).toBeNull();
    expect(() => measureReviewProbeContact([], [], surface, 1)).toThrow(/tolerance/);
    surface.dispose();
  });
});
