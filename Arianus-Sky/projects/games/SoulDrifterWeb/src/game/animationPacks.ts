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
 * Anchors only horizontal travel on the imported armature object. Every
 * skeletal curve plus authored armature Y/orientation stays intact; world/grid
 * movement must never rewrite pelvis, legs, or feet at this boundary.
 */
export function normalizeAnimationPackRootMotion(
  source: THREE.AnimationClip,
  rootNodeName: string,
): THREE.AnimationClip {
  const tracks = source.tracks.map((track) => {
    const clone = track.clone();
    const parsed = splitTrackName(track.name);
    if (parsed?.node !== rootNodeName || parsed.property !== "position" || clone.getValueSize() < 3) return clone;
    const anchorX = clone.values[0] ?? 0;
    const anchorZ = clone.values[2] ?? 0;
    for (let index = 0; index < clone.values.length; index += clone.getValueSize()) {
      clone.values[index] = anchorX;
      clone.values[index + 2] = anchorZ;
    }
    return clone;
  });
  return new THREE.AnimationClip(source.name, source.duration, tracks, source.blendMode);
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
