import * as THREE from "three";

export interface AnimationPackSpec {
  url: string;
  sourceClipName: string;
  semanticClipName: string;
  sourceSha256: string;
  rootPolicy: "in-place" | "authored";
  rootNodeName: string;
  sourceFps: number;
  sourceFrameWindow: readonly [number, number];
  sourceContactNormalizedTime: number;
}

export const SIPHON_CLEAVE_PACK: AnimationPackSpec = {
  url: "/assets/3d/animations/elf-shadowknight/siphon-cleave-baseline.glb",
  sourceClipName: "ElfShadowknight_Armature|mixamo.com|Layer0",
  semanticClipName: "SiphonCleaveBaseline",
  sourceSha256: "77C91BD70CD06D6B8BF452E0C66BF8A0B6CA200B21957B7E7A2A3ABC23C60BC5",
  rootPolicy: "in-place",
  rootNodeName: "ElfShadowknight_Armature",
  sourceFps: 30,
  sourceFrameWindow: [15, 31],
  sourceContactNormalizedTime: 0.46,
};

/**
 * The basic strike uses the same source-preserving route as Siphon Cleave:
 * untouched Mixamo curves, a visually approved compact strike window, and no
 * pelvis/foot reconstruction. Runtime crossfade supplies the idle recovery.
 */
export const WEAPON_STRIKE_PACK: AnimationPackSpec = {
  url: "/assets/3d/animations/elf-shadowknight/weapon-strike-baseline.glb",
  sourceClipName: "ElfShadowknight_Armature|mixamo.com|Layer0",
  semanticClipName: "WeaponStrikeBaseline",
  sourceSha256: "F22925A610BB55E4BF53CB6282B36BF30102D7CE00836CDB31FA9022EE4DB588",
  rootPolicy: "in-place",
  rootNodeName: "ElfShadowknight_Armature",
  sourceFps: 30,
  sourceFrameWindow: [17, 36],
  sourceContactNormalizedTime: 0.82,
};

const RAW_MIXAMO_CLIP = "ElfShadowknight_Armature|mixamo.com|Layer0";
const RAW_MIXAMO_ROOT = "ElfShadowknight_Armature";

function rawHumanoidPack(
  slug: string,
  semanticClipName: string,
  sourceSha256: string,
  sourceFrameWindow: readonly [number, number],
  sourceContactNormalizedTime = 0.5,
): AnimationPackSpec {
  return {
    url: `/assets/3d/animations/elf-shadowknight/${slug}.glb`,
    sourceClipName: RAW_MIXAMO_CLIP,
    semanticClipName,
    sourceSha256,
    rootPolicy: "in-place",
    rootNodeName: RAW_MIXAMO_ROOT,
    sourceFps: 30,
    sourceFrameWindow,
    sourceContactNormalizedTime,
  };
}

/**
 * Every active humanoid action uses the same source-preserving boundary as
 * Siphon Cleave: untouched Mixamo curves, an explicit frame envelope, and
 * root-only X/Z normalization at runtime. Embedded clips remain fallbacks for
 * non-compatible legacy rigs, not the authoritative Elf-rig animation path.
 */
export const HUMANOID_ACTIVE_ANIMATION_PACKS: readonly AnimationPackSpec[] = [
  rawHumanoidPack("idle-relaxed", "IdleRelaxed", "2F31140DF1E7A47FFE8BBEE05E8800DE606344B12E1452F9E6194AB9B420E748", [12, 248]),
  rawHumanoidPack("walk-baseline", "WalkBaseline", "2852200802C89584AB60DB7C2D4DB5D124C6D24844F4E119ECCC868ABB153C4D", [1, 33]),
  rawHumanoidPack("run-baseline", "RunBaseline", "2B70727AF9E58D4415006BBAB4EF6BB3054E92EE24C62C7A34D64AA84989F0B1", [1, 23]),
  rawHumanoidPack("draw-sword", "DrawSword", "181A9767F1B130EF06134BF978D932DA70BB0B590E65F41AD55D866C49485C3D", [1, 17]),
  rawHumanoidPack("sheathe-sword", "SheatheSword", "C1A7880B3999F42D223193C944F70295BA182ADA79B9FF8ED6DED47F2465047F", [1, 52]),
  rawHumanoidPack("unarmed-punch", "UnarmedPunch", "5144280CFA2B2EEF1F283133A91910B4A75FDA5D6E8104BFC5D8ACA1CD3FB1F1", [1, 62], 0.56),
  rawHumanoidPack("unarmed-kick", "UnarmedKick", "568B7674F726F176F07D05A7816D2C4BF044856BD8EF801E793E43E5076CE984", [1, 50], 0.54),
  rawHumanoidPack("cast-ward", "CastWard", "4783F42F0EA4BE6D96C9330F1D87E6BBD113728B2900114790F2A01CE912C1AA", [1, 67], 0.45),
  rawHumanoidPack("cast-summon", "CastSummon", "22B823743C6C16537A0CED6E123621A15EBC45178320CDA5394A974EC1FE9004", [1, 128], 0.67),
  rawHumanoidPack("cast-projectile", "CastProjectile", "E9E1E5116B47D0A167DB0F86021D2D12E44B0457B9911A92424F061A0460C515", [1, 71], 0.52),
  rawHumanoidPack("door-open-inward", "DoorOpenInward", "C0D15B723C9F6AF190903B5BE77F5169BAB94D4DE09BFE4C33CB83D583D423D7", [1, 193], 0.55),
  rawHumanoidPack("door-open-outward", "DoorOpenOutward", "3471B084998CA2C578C9D51FF9F6418F4195BA2827BCC8112B63FBC7EAE907F1", [1, 125], 0.55),
  rawHumanoidPack("pickup-waist", "PickupWaist", "34CACBC2AB9E9D1BEE3F8AEA6688246632A69089BA99FE8E8C8752D47C3B241B", [1, 105], 0.58),
  rawHumanoidPack("pickup-ground", "PickupGround", "B4500D749AB89CC13656391EF0935AD7E91EF797C190D3C89C13854139CCDCC4", [1, 289], 0.62),
  rawHumanoidPack("pull-lever", "PullLever", "9E3FDBDCF8F5C776AAEDE7F234EDBB0F2353874165293593AD40D9AFCF19F5F7", [1, 190], 0.54),
  rawHumanoidPack("hit-reaction", "HitReactionMixamo", "AD47D107972BE0A9AE805467B1B0C98EFDEF04E4C1E82C546A470A1FDFFD47AF", [1, 15], 0.42),
  rawHumanoidPack("death", "DeathMixamo", "28079AB4327A9E6F179063F97E6EC758D469846DCC12E013897C1B83E3CF24D9", [1, 93], 0.408),
];

interface TrackBinding {
  track: THREE.KeyframeTrack;
  sourceNode: string;
  targetNode: string;
  property: string;
}

export interface AnimationClipCompatibility {
  compatible: boolean;
  missingNodes: string[];
  remappedTracks: Array<{ from: string; to: string }>;
  bindings: TrackBinding[];
}

function splitTrackName(trackName: string): { node: string; property: string } | null {
  const separator = trackName.lastIndexOf(".");
  if (separator <= 0 || separator === trackName.length - 1) return null;
  return { node: trackName.slice(0, separator), property: trackName.slice(separator + 1) };
}

function targetNodeName(sourceNode: string, targetRoot: THREE.Object3D): string | null {
  if (targetRoot.getObjectByName(sourceNode)) return sourceNode;
  const unprefixed = sourceNode.split(/[|/:]/).at(-1) ?? sourceNode;
  if (targetRoot.getObjectByName(unprefixed)) return unprefixed;
  // Armature-root tracks must follow the target model's own armature node so
  // same-rig packs bind across rigs that do not share the source armature name.
  if (/armature$/i.test(unprefixed)) {
    let found: string | null = null;
    targetRoot.traverse((node) => {
      if (found === null && /armature$/i.test(node.name)) found = node.name;
    });
    if (found !== null) return found;
  }
  return null;
}

export function validateAnimationClipCompatibility(
  source: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
): AnimationClipCompatibility {
  const missingNodes = new Set<string>();
  const remappedTracks = new Map<string, string>();
  const bindings: TrackBinding[] = [];

  for (const track of source.tracks) {
    const parsed = splitTrackName(track.name);
    if (!parsed) {
      missingNodes.add(track.name);
      continue;
    }
    const targetNode = targetNodeName(parsed.node, targetRoot);
    if (!targetNode) {
      missingNodes.add(parsed.node);
      continue;
    }
    if (targetNode !== parsed.node) remappedTracks.set(parsed.node, targetNode);
    bindings.push({ track, sourceNode: parsed.node, targetNode, property: parsed.property });
  }

  return {
    compatible: missingNodes.size === 0,
    missingNodes: [...missingNodes].sort(),
    remappedTracks: [...remappedTracks].map(([from, to]) => ({ from, to })),
    bindings,
  };
}

export function bindCompatibleAnimationClip(
  source: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  semanticName: string,
): THREE.AnimationClip {
  const report = validateAnimationClipCompatibility(source, targetRoot);
  if (!report.compatible) {
    throw new Error(`Animation pack ${source.name} is incompatible with the actor rig; missing nodes: ${report.missingNodes.join(", ")}`);
  }
  const tracks = report.bindings.map(({ track, targetNode, property }) => {
    const clone = track.clone();
    clone.name = `${targetNode}.${property}`;
    return clone;
  });
  return new THREE.AnimationClip(semanticName, source.duration, tracks, source.blendMode);
}

/**
 * Optional presentation packs must never prevent an otherwise valid avatar
 * from loading. Identity routing keeps known same-rig packs together, while
 * this final compatibility boundary protects legacy saves and future models.
 */
export function bindOptionalCompatibleAnimationClip(
  source: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  semanticName: string,
): THREE.AnimationClip | null {
  const report = validateAnimationClipCompatibility(source, targetRoot);
  if (!report.compatible) return null;
  const tracks = report.bindings.map(({ track, targetNode, property }) => {
    const clone = track.clone();
    clone.name = `${targetNode}.${property}`;
    return clone;
  });
  return new THREE.AnimationClip(semanticName, source.duration, tracks, source.blendMode);
}

/**
 * Retargets an imported armature-position track around the target armature's
 * rest position. Horizontal travel remains in-place for world navigation;
 * authored vertical deltas can be preserved for airborne actions or locked
 * for grounded locomotion.
 */
export function normalizeAnimationPackRootMotion(
  source: THREE.AnimationClip,
  rootNodeName: string,
  targetRestPosition?: THREE.Vector3,
  verticalRootMotion: "preserve" | "lock-to-rest" = "preserve",
): THREE.AnimationClip {
  const tracks = source.tracks.map((track) => {
    const clone = track.clone();
    const parsed = splitTrackName(track.name);
    if (parsed?.node !== rootNodeName || parsed.property !== "position" || clone.getValueSize() < 3) return clone;
    const anchorX = clone.values[0] ?? 0;
    const anchorY = clone.values[1] ?? 0;
    const anchorZ = clone.values[2] ?? 0;
    const restX = targetRestPosition?.x ?? anchorX;
    const restY = targetRestPosition?.y ?? anchorY;
    const restZ = targetRestPosition?.z ?? anchorZ;
    for (let index = 0; index < clone.values.length; index += clone.getValueSize()) {
      clone.values[index] = restX;
      clone.values[index + 1] = verticalRootMotion === "preserve"
        ? restY + ((clone.values[index + 1] ?? anchorY) - anchorY)
        : restY;
      clone.values[index + 2] = restZ;
    }
    return clone;
  });
  return new THREE.AnimationClip(source.name, source.duration, tracks, source.blendMode);
}

export interface AnimatedPoseGroundingMeasurement {
  floorWorldY: number;
  lowerBoundWorldY: number;
  clearanceMeters: number;
}

export interface AnimatedPoseGroundingCalibration extends AnimatedPoseGroundingMeasurement {
  basePivotY: number;
  appliedPivotY: number;
  floorCorrectionMeters: number;
  penetrationLiftMeters: number;
  pivotResponseMetersPerMeter: number;
}

const GROUNDING_RESPONSE_PROBE_METERS = 0.25;

/** Measures the evaluated lower bound against a feet-origin actor root. */
export function measureAnimatedPoseGrounding(
  actorRoot: THREE.Object3D,
  animatedModel: THREE.Object3D,
): AnimatedPoseGroundingMeasurement {
  actorRoot.updateWorldMatrix(true, true);
  animatedModel.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.skeleton.update();
  });
  const floorWorldY = actorRoot.getWorldPosition(new THREE.Vector3()).y;
  const posedBounds = new THREE.Box3().setFromObject(animatedModel, true);
  if (posedBounds.isEmpty() || !Number.isFinite(posedBounds.min.y)) {
    throw new Error("Animated actor has no finite skinned bounds for floor measurement.");
  }
  return {
    floorWorldY,
    lowerBoundWorldY: posedBounds.min.y,
    clearanceMeters: posedBounds.min.y - floorWorldY,
  };
}

/**
 * Seats a stable parent pivot from one evaluated grounded pose. Callers keep
 * that pivot fixed during playback so jumps, falls, and reactions retain
 * their authored vertical motion.
 */
export function calibrateAnimatedPoseOnFloor(
  actorRoot: THREE.Object3D,
  animatedModel: THREE.Object3D,
  groundingPivot: THREE.Object3D,
  basePivotY: number,
): AnimatedPoseGroundingCalibration {
  groundingPivot.position.y = basePivotY;
  groundingPivot.updateWorldMatrix(true, true);
  const measured = measureAnimatedPoseGrounding(actorRoot, animatedModel);

  groundingPivot.position.y = basePivotY + GROUNDING_RESPONSE_PROBE_METERS;
  groundingPivot.updateWorldMatrix(true, true);
  const probe = measureAnimatedPoseGrounding(actorRoot, animatedModel);
  const pivotResponseMetersPerMeter = (
    probe.lowerBoundWorldY - measured.lowerBoundWorldY
  ) / GROUNDING_RESPONSE_PROBE_METERS;
  if (!(pivotResponseMetersPerMeter > 1e-6) || !Number.isFinite(pivotResponseMetersPerMeter)) {
    throw new Error("Animated actor grounding pivot has no finite positive world-space response.");
  }

  const floorCorrectionMeters = -measured.clearanceMeters / pivotResponseMetersPerMeter;
  groundingPivot.position.y = basePivotY + floorCorrectionMeters;
  groundingPivot.updateWorldMatrix(true, true);
  const finalMeasurement = measureAnimatedPoseGrounding(actorRoot, animatedModel);
  return {
    ...finalMeasurement,
    basePivotY,
    appliedPivotY: groundingPivot.position.y,
    floorCorrectionMeters,
    penetrationLiftMeters: Math.max(0, floorCorrectionMeters),
    pivotResponseMetersPerMeter,
  };
}

/** Keeps only authored keys inside an exact source-frame envelope. */
export function trimAnimationPackClipEnvelope(
  source: THREE.AnimationClip,
  frameWindow: readonly [number, number],
  fps: number,
): THREE.AnimationClip {
  return THREE.AnimationUtils.subclip(source, source.name, frameWindow[0], frameWindow[1], fps);
}

export function loadCachedAnimationPack(
  cache: Map<string, Promise<readonly THREE.AnimationClip[]>>,
  key: string,
  load: () => Promise<readonly THREE.AnimationClip[]>,
): Promise<readonly THREE.AnimationClip[]> {
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}
