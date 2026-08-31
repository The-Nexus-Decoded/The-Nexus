import { DirectionalLight, PCFShadowMap, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { createReviewShadowRig } from "../src/review/weapon-lab/review-shadow-rig";

function setup(maxTextureSize = 4096) {
  const renderer = { shadowMap: { enabled: false, type: PCFShadowMap }, capabilities: { maxTextureSize } };
  const light = new DirectionalLight(0xffe6ca, 5.2); light.position.set(2.5, 4.5, 4);
  const originalDirection = light.position.clone().normalize();
  const rig = createReviewShadowRig(renderer, light);
  return { renderer, light, rig, originalDirection };
}

describe("shared review ground shadows", () => {
  it("enables one bounded map without changing the accepted key color, intensity or direction", () => {
    const { renderer, light, originalDirection } = setup();
    expect(renderer.shadowMap.enabled).toBe(true); expect(light.castShadow).toBe(true);
    expect(light.shadow.mapSize.toArray()).toEqual([2048, 2048]);
    expect(light.color.getHex()).toBe(0xffe6ca); expect(light.intensity).toBe(5.2);
    expect(light.position.clone().sub(light.target.position).normalize().distanceTo(originalDirection)).toBeLessThan(1e-12);
    expect(light.shadow.camera.left).toBe(-14); expect(light.shadow.camera.right).toBe(14);
  });
  it("respects the native renderer texture limit", () => {
    expect(setup(1024).light.shadow.mapSize.toArray()).toEqual([1024, 1024]);
  });
  it("follows the review focus without moving the target or changing light direction", () => {
    const { light, rig, originalDirection } = setup(); const target = new Vector3(16, 2, -8);
    rig.follow(target);
    expect(target.toArray()).toEqual([16, 2, -8]);
    expect(light.target.position.distanceTo(target)).toBeLessThan(0.013);
    expect(light.position.clone().sub(light.target.position).normalize().distanceTo(originalDirection)).toBeLessThan(1e-12);
    expect(light.position.distanceTo(light.target.position)).toBeCloseTo(40);
    const before = light.position.clone(); rig.follow(new Vector3(NaN, 0, 0)); expect(light.position.equals(before)).toBe(true);
  });
  it("holds sub-texel focus movement stable and releases its map once", () => {
    const { light, rig } = setup(); const before = light.position.clone();
    rig.follow(new Vector3(0.00001, 0.00001, 0.00001)); expect(light.position.equals(before)).toBe(true);
    const dispose = vi.spyOn(light.shadow, "dispose"); rig.dispose(); rig.dispose();
    rig.follow(new Vector3(20, 1, 20)); expect(light.position.equals(before)).toBe(true); expect(dispose).toHaveBeenCalledOnce();
  });
  it("rejects an undefined key direction", () => {
    const light = new DirectionalLight(); light.position.set(0, 0, 0);
    expect(() => createReviewShadowRig(setup().renderer, light)).toThrow("direction");
  });
});
