import * as THREE from "three";

function isGroundingAttackTarget(target: string): boolean {
  const normalized = target.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["root", "armature", "pelvis", "hips"].some((name) => normalized.endsWith(name))
    || /(?:thigh|calf|foot|ball|toe)(?:l|r)$/.test(normalized)
    || /(?:left|right)(?:upleg|leg|foot|toebase|toe)$/.test(normalized);
}

export function cloneActorMaterial(
  source: THREE.Material,
  tint: number,
  preserveAuthoredPalette: boolean,
): THREE.Material {
  const material = source.clone();
  if (preserveAuthoredPalette || !(material instanceof THREE.MeshStandardMaterial)) return material;

  material.color.lerp(new THREE.Color(tint), 0.08);
  material.roughness = Math.max(material.roughness, 0.48);
  material.emissive.copy(material.color).multiplyScalar(0.09);
  material.emissiveIntensity = 0.48;
  return material;
}

export function sanitizeAttackClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks
    .filter((track) => {
      const separator = track.name.lastIndexOf(".");
      if (separator < 0) return true;
      const target = track.name.slice(0, separator).split(/[|/:]/).at(-1)?.toLowerCase();
      return !target || !isGroundingAttackTarget(target);
    })
    .map((track) => track.clone());
  return new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
}

export function screenPanToWorld(
  cameraAzimuth: number,
  horizontal: number,
  vertical: number,
): THREE.Vector2 {
  return new THREE.Vector2(
    horizontal * Math.cos(cameraAzimuth) + vertical * Math.sin(cameraAzimuth),
    -horizontal * Math.sin(cameraAzimuth) + vertical * Math.cos(cameraAzimuth),
  );
}

export function cameraPanBounds(
  roomWidth: number,
  roomHeight: number,
  tileSize: number,
  visibleMarginTiles: number,
): THREE.Vector2 {
  const margin = tileSize * visibleMarginTiles;
  return new THREE.Vector2(
    Math.max(0, roomWidth * tileSize * 0.5 - margin),
    Math.max(0, roomHeight * tileSize * 0.5 - margin),
  );
}

export interface CameraFollowState {
  center: THREE.Vector2;
  lookAhead: THREE.Vector2;
  manualOffset: THREE.Vector2;
  manualIdleSeconds: number;
}

export interface CameraFollowFrame {
  player: THREE.Vector2;
  movement: THREE.Vector2;
  cameraAzimuth: number;
  verticalSpan: number;
  aspect: number;
  zoom: number;
  compact: boolean;
  deltaSeconds: number;
  roomCenter: THREE.Vector2;
  roomBounds: THREE.Vector2;
}

export interface CameraFollowResult extends CameraFollowState {
  target: THREE.Vector2;
  deadZone: THREE.Vector2;
}

function dampingAlpha(lambda: number, deltaSeconds: number): number {
  return 1 - Math.exp(-lambda * THREE.MathUtils.clamp(deltaSeconds, 0, 0.1));
}

export function cameraFollowStep(
  previous: CameraFollowState,
  frame: CameraFollowFrame,
): CameraFollowResult {
  const center = previous.center.clone();
  const lookAhead = previous.lookAhead.clone();
  const manualOffset = previous.manualOffset.clone();
  const moving = frame.movement.lengthSq() > 1e-8;
  const manualIdleSeconds = moving
    ? previous.manualIdleSeconds
    : previous.manualIdleSeconds + frame.deltaSeconds;
  const halfWidth = (frame.verticalSpan * Math.max(0.1, frame.aspect)) / (2 * Math.max(0.1, frame.zoom));
  const halfGroundDepth = (frame.verticalSpan * 0.82) / (2 * Math.max(0.1, frame.zoom));
  const deadZoneRatio = frame.compact ? 0.12 : 0.18;
  const deadZone = new THREE.Vector2(halfWidth * deadZoneRatio, halfGroundDepth * deadZoneRatio);
  const screenRight = screenPanToWorld(frame.cameraAzimuth, 1, 0).normalize();
  const screenUp = screenPanToWorld(frame.cameraAzimuth, 0, 1).normalize();
  const relative = frame.player.clone().sub(center);
  const screenX = relative.dot(screenRight);
  const screenY = relative.dot(screenUp);
  const overflowX = Math.sign(screenX) * Math.max(0, Math.abs(screenX) - deadZone.x);
  const overflowY = Math.sign(screenY) * Math.max(0, Math.abs(screenY) - deadZone.y);
  const desiredCenter = center.clone()
    .addScaledVector(screenRight, overflowX)
    .addScaledVector(screenUp, overflowY);
  center.lerp(desiredCenter, dampingAlpha(8.5, frame.deltaSeconds));

  const desiredLookAhead = moving
    ? frame.movement.clone().normalize().multiplyScalar(frame.compact ? 0.72 : 0.9)
    : new THREE.Vector2();
  lookAhead.lerp(desiredLookAhead, dampingAlpha(moving ? 5.5 : 3.5, frame.deltaSeconds));

  if (moving || manualIdleSeconds > 1.25) {
    manualOffset.lerp(new THREE.Vector2(), dampingAlpha(moving ? 8 : 2.2, frame.deltaSeconds));
  }

  const roomMin = frame.roomCenter.clone().sub(frame.roomBounds);
  const roomMax = frame.roomCenter.clone().add(frame.roomBounds);
  center.clamp(roomMin, roomMax);
  const target = center.clone().add(lookAhead).add(manualOffset).clamp(roomMin, roomMax);
  return { center, lookAhead, manualOffset, manualIdleSeconds, target, deadZone };
}
