import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  BREACH_V2_PILOT_HEIGHT,
  normalizeBreachV2PreviewAvatar,
} from "../src/game/dungeons/breach-v2-avatar";

describe("BREACH-V2 review-pick avatar", () => {
  it("fits the player to meter-space and grounds the feet at the scene origin", () => {
    const model = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1));
    body.position.y = 3;
    model.add(body);

    const root = normalizeBreachV2PreviewAvatar(model);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root, true);

    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(BREACH_V2_PILOT_HEIGHT, 6);
    expect(body.castShadow).toBe(true);
    expect(body.receiveShadow).toBe(true);
    expect(root.userData.spatialAuditExcluded).toBe("runtime-player-avatar");
  });
});
