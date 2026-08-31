import { DirectionalLight, PCFShadowMap, Vector3, type ShadowMapType } from "three";

interface ShadowRenderer {
  shadowMap: { enabled: boolean; type: ShadowMapType };
  capabilities: { maxTextureSize: number };
}

/** One bounded shadow map shared by solo, paired and interaction review.
 * Presentation only: never moves actors or hides their real floor clearance.
 */
export function createReviewShadowRig(renderer: ShadowRenderer, light: DirectionalLight) {
  const direction = light.position.clone().sub(light.target.position).normalize();
  if (direction.lengthSq() === 0) throw new Error("Review key light needs a direction");
  const referenceUp = Math.abs(direction.y) > 0.99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const right = referenceUp.cross(direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const focus = new Vector3();
  const resolution = Math.min(2048, renderer.capabilities.maxTextureSize);
  const extent = 14;
  const texelSize = extent * 2 / resolution;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  light.castShadow = true;
  light.shadow.mapSize.set(resolution, resolution);
  Object.assign(light.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 80 });
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias = -0.00003;
  light.shadow.normalBias = 0.004;
  light.shadow.radius = 2;
  let disposed = false;

  function follow(target: Vector3) {
    if (disposed || ![target.x, target.y, target.z].every(Number.isFinite)) return;
    // Quantize in the light plane so small orbit/animation changes do not
    // continuously crawl the depth-map sample grid over the character.
    focus.set(0, 0, 0);
    for (const axis of [right, up, direction]) {
      focus.addScaledVector(axis, Math.round(target.dot(axis) / texelSize) * texelSize);
    }
    light.target.position.copy(focus);
    light.position.copy(focus).addScaledVector(direction, 40);
    light.target.updateMatrixWorld(true);
    light.updateMatrixWorld(true);
  }
  follow(light.target.position.clone());
  return { follow, dispose() { if (!disposed) { disposed = true; light.shadow.dispose(); } } };
}
