import type * as THREE from "three";
import { fetchPinnedReviewAsset } from "./review-asset-loader";
import { REACTION_PHASE_ROLES, REACTION_SETS, type ReactionArchetype, type ReactionClipDurations,
  type ReactionSetId } from "./reaction-contract";
import { REVIEWED_REACTION_PACKS, type ReviewedReactionPack, type ReviewedReactionPacks } from "./reviewed-reaction-receipt";

/** Only the parse surface is needed; the caller owns loader configuration and caching. */
export interface ReactionPackParser {
  parseAsync(data: ArrayBuffer, path: string): Promise<{ animations: THREE.AnimationClip[] }>;
}

export interface LoadedReactionPack {
  readonly pack: ReviewedReactionPack;
  readonly clips: readonly THREE.AnimationClip[];
  readonly checksumVerified: boolean;
}

/**
 * Fetch, verify and parse every pinned pack for one archetype.
 *
 * Byte length and SHA-256 are enforced by `fetchPinnedReviewAsset` before a
 * single byte is parsed. Then the clip list is enforced BOTH ways: the file must
 * contain every clip its receipt claims and no clip it does not. A pack that
 * gained a clip in a re-export is rejected here rather than silently installed
 * beside the library under a name nothing selects.
 */
export async function loadReactionPacks(archetype: ReactionArchetype, options: {
  parser: ReactionPackParser; registry?: ReviewedReactionPacks; signal?: AbortSignal; baseURI?: string;
  requireChecksum?: boolean;
}): Promise<readonly LoadedReactionPack[]> {
  const packs = (options.registry ?? REVIEWED_REACTION_PACKS)[archetype];
  if (!packs?.length) throw new Error(`No reviewed reaction pack is registered for the ${archetype} archetype.`);
  const loaded: LoadedReactionPack[] = [];
  for (const pack of packs) {
    const { bytes, resourcePath, checksumVerified } = await fetchPinnedReviewAsset(pack,
      { signal: options.signal, baseURI: options.baseURI, requireChecksum: options.requireChecksum });
    const gltf = await options.parser.parseAsync(bytes, resourcePath);
    options.signal?.throwIfAborted();
    const names = gltf.animations.map((clip) => clip.name);
    const extra = names.filter((name) => !pack.clips.includes(name));
    const missing = pack.clips.filter((name) => !names.includes(name));
    if (missing.length || extra.length || new Set(names).size !== names.length) {
      throw new Error(`${pack.url} does not carry exactly its pinned clip list`
        + `${missing.length ? `; missing ${missing.join(", ")}` : ""}${extra.length ? `; unlisted ${extra.join(", ")}` : ""}.`);
    }
    for (const clip of gltf.animations) {
      if (!Number.isFinite(clip.duration) || clip.duration <= 0) throw new Error(`${pack.url} clip ${clip.name} has no duration.`);
    }
    loaded.push({ pack, clips: Object.freeze([...gltf.animations]), checksumVerified });
  }
  return Object.freeze(loaded);
}

/** Flatten loaded packs into the clip list an actor installs, rejecting a name collision. */
export function reactionPackClips(loaded: readonly LoadedReactionPack[]): readonly THREE.AnimationClip[] {
  const byName = new Map<string, THREE.AnimationClip>();
  for (const entry of loaded) for (const clip of entry.clips) {
    if (byName.has(clip.name)) throw new Error(`Two reaction packs both carry ${clip.name}.`);
    byName.set(clip.name, clip);
  }
  return Object.freeze([...byName.values()]);
}

/**
 * Every bone a pack animates must exist on the body it will be played on. The
 * receipt pins the rig by checksum; this is the runtime proof that the pinned rig
 * is the one actually loaded, and it runs before a clip is ever bound.
 */
export function assertReactionClipsBind(clips: readonly THREE.AnimationClip[], boneNames: Iterable<string>): void {
  const bones = new Set<string>();
  for (const name of boneNames) { bones.add(name); bones.add(name.replace(/[\s.[\]]/g, "")); }
  for (const clip of clips) {
    const unmatched = [...new Set(clip.tracks.map((track) => track.name.split(".")[0] ?? ""))]
      .filter((node) => node && !bones.has(node));
    if (unmatched.length) {
      throw new Error(`Reaction clip ${clip.name} targets ${unmatched.length} node(s) the body does not have: ${unmatched.slice(0, 4).join(", ")}.`);
    }
  }
}

/** Clip durations for one set, read off the actor's installed actions. */
export function reactionSetDurations(setId: ReactionSetId,
  durationOf: (clipName: string) => number | undefined): ReactionClipDurations | null {
  const clips = REACTION_SETS[setId].clips;
  const values = REACTION_PHASE_ROLES.map((role) => durationOf(clips[role]));
  if (values.some((value) => !Number.isFinite(value) || (value as number) <= 0)) return null;
  return { impact: values[0]!, loop: values[1]!, recover: values[2]! };
}
