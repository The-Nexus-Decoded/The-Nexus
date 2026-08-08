import * as THREE from "three";

function isAnchoredAttackTarget(target: string): boolean {
  const normalized = target.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["root", "armature", "pelvis", "hips"].some((name) => normalized.endsWith(name))
    || /(?:thigh|calf|foot|ball|toe)(?:l|r)$/.test(normalized)
    || /(?:left|right)(?:upleg|leg|foot|toebase|toe)$/.test(normalized)
    || /(?:spine|neck)\d*$/.test(normalized)
    || normalized.endsWith("head");
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
      return !target || !isAnchoredAttackTarget(target);
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
