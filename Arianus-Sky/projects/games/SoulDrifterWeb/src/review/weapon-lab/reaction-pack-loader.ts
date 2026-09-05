import type * as THREE from "three";
import { fetchPinnedReviewAsset } from "./review-asset-loader";
import { reactionArchetypeForFamily, REACTION_PHASE_ROLES, REACTION_SETS, type ReactionArchetype,
  type ReactionClipDurations, type ReactionSetId } from "./reaction-contract";
import { REVIEWED_REACTION_PACKS, type ReviewedReactionPack, type ReviewedReactionPacks } from "./reviewed-reaction-receipt";
import type { ReviewActorFamily } from "./combat-review-types";

/**
 * Only the parse surface is needed; the caller owns loader configuration and caching.
 *
 * `scene` is optional because a caller may hand in a clip-only stub, but when a
 * real GLTF parse supplies one, the pack's own skin is counted and checked against
 * the joint count its receipt pins.
 */
export interface ReactionPackParser {
  parseAsync(data: ArrayBuffer, path: string): Promise<{ animations: THREE.AnimationClip[]; scene?: THREE.Object3D }>;
}

/**
 * Bone names of the skin under `root`: the union over every skinned mesh, which is
 * the skeleton a receipt pins. Used both to count a pack's own joints — what makes
 * 65 / 18 / 30 an archetype property rather than a constant — and to name the bones
 * a body offers `assertReactionClipsBind`.
 */
export function skinnedBoneNames(root: THREE.Object3D | undefined): Set<string> {
  const names = new Set<string>();
  root?.traverse((object) => {
    const skinned = object as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh && skinned.skeleton) for (const bone of skinned.skeleton.bones) names.add(bone.name);
  });
  return names;
}

/** The same union, or null when the parse produced no skinned mesh to count. */
function packJointNames(scene: THREE.Object3D | undefined): Set<string> | null {
  const names = skinnedBoneNames(scene);
  return names.size ? names : null;
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
 *
 * The pinned joint count is checked against the parsed skin, per archetype: a
 * Warden pack is 18 joints, a Breachling pack 30, a humanoid pack 65, and a
 * re-export that dropped or gained bones is rejected before a clip is bound.
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
    const joints = packJointNames(gltf.scene);
    if (joints && joints.size !== pack.jointCount) {
      throw new Error(`${pack.url} carries a ${joints.size}-joint skin, not the ${pack.jointCount} joints its ${pack.archetype} receipt pins.`);
    }
    loaded.push({ pack, clips: Object.freeze([...gltf.animations]), checksumVerified });
  }
  return Object.freeze(loaded);
}

/**
 * The same load, addressed the way the lab actually asks the question: by the
 * defender's catalog family. The family is the only thing an actor knows about
 * itself, and `reactionArchetypeForFamily` is the one map from it to an archetype,
 * so a Warden or a Breachling reaches its own pack here rather than the humanoid
 * one by a hard-coded string at the call site.
 */
export async function loadReactionPacksForFamily(family: ReviewActorFamily, options: {
  parser: ReactionPackParser; registry?: ReviewedReactionPacks; signal?: AbortSignal; baseURI?: string;
  requireChecksum?: boolean;
}): Promise<readonly LoadedReactionPack[]> {
  return loadReactionPacks(reactionArchetypeForFamily(family), options);
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
