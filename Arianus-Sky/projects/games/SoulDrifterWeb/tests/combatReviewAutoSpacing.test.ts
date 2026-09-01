import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CombatReviewController, type CombatActorDefinition, type CombatActorLoader } from "../src/review/weapon-lab/combat-review-controller";
import type { ReviewAction } from "../src/review/weapon-lab/combat-review-types";

const definitions: readonly CombatActorDefinition[] = [
  { id: "human", label: "Human", family: "human", note: "fixture" },
  { id: "boss", label: "Boss", family: "warden", note: "fixture" },
  { id: "boss-wide", label: "Wide boss", family: "warden", note: "fixture" },
];
const actions: readonly ReviewAction[] = [
  { id: "idle", clipName: "idle", label: "Idle", semantic: "idle", approvalStatus: "source", durationSeconds: 1, rootPolicy: "in-place" },
  { id: "attack", clipName: "attack", label: "Attack", semantic: "attack", approvalStatus: "draft", durationSeconds: 1, rootPolicy: "in-place" },
];
const dimensions: Record<string, readonly [number, number, number]> = {
  human: [1, 1.8, .8], boss: [2.4, 3.9, 3], "boss-wide": [3.2, 4.1, 4],
};

describe("Combat Review actor-aware spacing", () => {
  it("fits loaded rendered bounds, preserves an explicit override, and refits when the pair changes", async () => {
    const loadActor: CombatActorLoader = async ({ definition, instanceId }) => {
      const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
      const [width, height, depth] = dimensions[definition.id]!;
      const geometry = new THREE.BoxGeometry(width, height, depth), material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material); mesh.position.y = height / 2; model.add(mesh);
      return { actor: { instanceId, definitionId: definition.id, root, model, actions: () => actions,
        sample() { root.updateMatrixWorld(true); }, reset() {},
        dispose() { geometry.dispose(); material.dispose(); root.removeFromParent(); } } };
    };
    const controller = new CombatReviewController({ definitions, loadActor, initial: { a: "human", b: "boss" } });
    try {
      await controller.enter();
      expect(controller.snapshot().placement.separationMeters).toBe(2.25);
      let a = new THREE.Box3().setFromObject(controller.actor("a")!.root, true);
      let b = new THREE.Box3().setFromObject(controller.actor("b")!.root, true);
      expect(b.min.z - a.max.z).toBeCloseTo(.35, 7);

      controller.setPlacement({ separationMeters: 1.9 });
      expect(controller.snapshot().placement.separationMeters).toBe(1.9);

      await controller.selectActor("a", "boss-wide");
      expect(controller.snapshot().placement.separationMeters).toBe(3.85);
      a = new THREE.Box3().setFromObject(controller.actor("a")!.root, true);
      b = new THREE.Box3().setFromObject(controller.actor("b")!.root, true);
      expect(b.min.z - a.max.z).toBeCloseTo(.35, 7);
    } finally { controller.dispose(); }
  });
});
