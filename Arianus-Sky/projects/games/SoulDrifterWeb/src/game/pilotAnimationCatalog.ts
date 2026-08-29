import type { AnimationClip } from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const PILOT_ANIMATION_CATALOG_URL =
  "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-catalog.json";
export const PILOT_ANIMATION_SOURCE_SHA256 =
  "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793";
export const PILOT_ANIMATION_SOURCE_BYTES = 32_441_884;
export const PILOT_ANIMATION_SOURCE_CLIP_COUNT = 400;

const SHA256_PATTERN = /^[A-F0-9]{64}$/;
const MAX_PACK_CLIPS = 24;
const MAX_PACK_BYTES = 4 * 1024 * 1024;

export interface PilotAnimationPackCatalogEntry {
  id: string;
  prefix: string;
  url: string;
  sha256: string;
  bytes: number;
  clipCount: number;
  clipNames: readonly string[];
}

export interface PilotAnimationClipCatalogEntry {
  name: string;
  kind: "pack";
  packId: string;
  fingerprint: string;
}

export interface PilotStandaloneAnimationCatalogEntry {
  name: string;
  kind: "standalone";
  sourceClipName: string;
  url: string;
  sha256: string;
  bytes: number;
  reviewStatus: "OWNER_APPROVED" | "IN_GAME_QA_ACCEPTED";
}

export interface PilotAnimationCatalog {
  schemaVersion: 1;
  issue: 487;
  catalogId: "human-foundation-pilot-lazy-review-v1";
  source: {
    url: string;
    sha256: typeof PILOT_ANIMATION_SOURCE_SHA256;
    bytes: typeof PILOT_ANIMATION_SOURCE_BYTES;
    clipCount: typeof PILOT_ANIMATION_SOURCE_CLIP_COUNT;
  };
  packPolicy: {
    maxClipCount: typeof MAX_PACK_CLIPS;
    maxBytes: typeof MAX_PACK_BYTES;
    creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING";
    exactAccessorPayloadBytes: true;
  };
  packs: readonly PilotAnimationPackCatalogEntry[];
  clips: readonly PilotAnimationClipCatalogEntry[];
  standaloneApprovedClips: readonly PilotStandaloneAnimationCatalogEntry[];
  canonicalClipCount: typeof PILOT_ANIMATION_SOURCE_CLIP_COUNT;
  reviewClipCount: number;
  builder: {
    path: string;
    sha256: string;
  };
}

interface AnimationAssetLoader {
  loadAsync(url: string): Promise<Pick<GLTF, "animations">>;
}

interface ResidentAnimationAsset {
  clips: Map<string, AnimationClip>;
}

export interface PilotAnimationCatalogResidency {
  maxResidentAssets: number;
  residentAssetIds: readonly string[];
  residentPackIds: readonly string[];
  residentClipCount: number;
  pendingAssetIds: readonly string[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value as number;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function sha256(value: unknown, label: string): string {
  const hash = stringValue(value, label);
  if (!SHA256_PATTERN.test(hash)) throw new Error(`${label} must be an uppercase SHA-256 hash.`);
  return hash;
}

function exact<T>(actual: unknown, expected: T, label: string): T {
  if (actual !== expected) throw new Error(`${label} must be ${String(expected)}, got ${String(actual)}.`);
  return expected;
}

export function validatePilotAnimationCatalog(value: unknown): PilotAnimationCatalog {
  const source = record(value, "Pilot animation catalog");
  exact(source.schemaVersion, 1, "Pilot animation catalog schemaVersion");
  exact(source.issue, 487, "Pilot animation catalog issue");
  exact(source.catalogId, "human-foundation-pilot-lazy-review-v1", "Pilot animation catalog catalogId");

  const sourceReceipt = record(source.source, "Pilot animation catalog source");
  const sourceUrl = stringValue(sourceReceipt.url, "Pilot animation catalog source.url");
  exact(sourceReceipt.sha256, PILOT_ANIMATION_SOURCE_SHA256, "Pilot animation catalog source.sha256");
  exact(sourceReceipt.bytes, PILOT_ANIMATION_SOURCE_BYTES, "Pilot animation catalog source.bytes");
  exact(sourceReceipt.clipCount, PILOT_ANIMATION_SOURCE_CLIP_COUNT, "Pilot animation catalog source.clipCount");

  const policy = record(source.packPolicy, "Pilot animation catalog packPolicy");
  exact(policy.maxClipCount, MAX_PACK_CLIPS, "Pilot animation catalog packPolicy.maxClipCount");
  exact(policy.maxBytes, MAX_PACK_BYTES, "Pilot animation catalog packPolicy.maxBytes");
  exact(
    policy.creationMethod,
    "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
    "Pilot animation catalog packPolicy.creationMethod",
  );
  exact(policy.exactAccessorPayloadBytes, true, "Pilot animation catalog packPolicy.exactAccessorPayloadBytes");

  const packIds = new Set<string>();
  const packedNames = new Set<string>();
  const packs = array(source.packs, "Pilot animation catalog packs").map((candidate, index) => {
    const item = record(candidate, `Pilot animation catalog packs[${index}]`);
    const id = stringValue(item.id, `Pilot animation catalog packs[${index}].id`);
    if (packIds.has(id)) throw new Error(`Pilot animation catalog has duplicate pack id ${id}.`);
    packIds.add(id);
    const clipNames = array(item.clipNames, `Pilot animation catalog pack ${id}.clipNames`).map((name, clipIndex) => (
      stringValue(name, `Pilot animation catalog pack ${id}.clipNames[${clipIndex}]`)
    ));
    const clipCount = integer(item.clipCount, `Pilot animation catalog pack ${id}.clipCount`);
    const bytes = integer(item.bytes, `Pilot animation catalog pack ${id}.bytes`);
    if (clipNames.length === 0 || clipNames.length !== clipCount || clipCount > MAX_PACK_CLIPS) {
      throw new Error(`Pilot animation catalog pack ${id} violates the ${MAX_PACK_CLIPS}-clip boundary.`);
    }
    if (bytes === 0 || bytes > MAX_PACK_BYTES) {
      throw new Error(`Pilot animation catalog pack ${id} violates the ${MAX_PACK_BYTES}-byte boundary.`);
    }
    for (const name of clipNames) {
      if (packedNames.has(name)) throw new Error(`Pilot animation catalog packs duplicate clip ${name}.`);
      packedNames.add(name);
    }
    return {
      id,
      prefix: stringValue(item.prefix, `Pilot animation catalog pack ${id}.prefix`),
      url: stringValue(item.url, `Pilot animation catalog pack ${id}.url`),
      sha256: sha256(item.sha256, `Pilot animation catalog pack ${id}.sha256`),
      bytes,
      clipCount,
      clipNames,
    } satisfies PilotAnimationPackCatalogEntry;
  });

  const packById = new Map(packs.map((pack) => [pack.id, pack]));
  const clipNames = new Set<string>();
  const clips = array(source.clips, "Pilot animation catalog clips").map((candidate, index) => {
    const item = record(candidate, `Pilot animation catalog clips[${index}]`);
    const name = stringValue(item.name, `Pilot animation catalog clips[${index}].name`);
    exact(item.kind, "pack", `Pilot animation catalog clip ${name}.kind`);
    const packId = stringValue(item.packId, `Pilot animation catalog clip ${name}.packId`);
    const pack = packById.get(packId);
    if (!pack || !pack.clipNames.includes(name)) {
      throw new Error(`Pilot animation catalog clip ${name} does not belong to declared pack ${packId}.`);
    }
    if (clipNames.has(name)) throw new Error(`Pilot animation catalog has duplicate canonical clip ${name}.`);
    clipNames.add(name);
    return {
      name,
      kind: "pack" as const,
      packId,
      fingerprint: sha256(item.fingerprint, `Pilot animation catalog clip ${name}.fingerprint`),
    } satisfies PilotAnimationClipCatalogEntry;
  });
  if (clips.length !== PILOT_ANIMATION_SOURCE_CLIP_COUNT || packedNames.size !== clips.length) {
    throw new Error(`Pilot animation catalog must contain exactly ${PILOT_ANIMATION_SOURCE_CLIP_COUNT} canonical clips.`);
  }
  for (const packedName of packedNames) {
    if (!clipNames.has(packedName)) throw new Error(`Pilot animation catalog pack clip ${packedName} has no clip entry.`);
  }

  const reviewNames = new Set(clipNames);
  const standaloneApprovedClips = array(
    source.standaloneApprovedClips,
    "Pilot animation catalog standaloneApprovedClips",
  ).map((candidate, index) => {
    const item = record(candidate, `Pilot animation catalog standaloneApprovedClips[${index}]`);
    const name = stringValue(item.name, `Pilot standalone animation ${index}.name`);
    exact(item.kind, "standalone", `Pilot standalone animation ${name}.kind`);
    if (reviewNames.has(name)) throw new Error(`Pilot animation catalog has duplicate review clip ${name}.`);
    reviewNames.add(name);
    const reviewStatus = stringValue(item.reviewStatus, `Pilot standalone animation ${name}.reviewStatus`);
    if (reviewStatus !== "OWNER_APPROVED" && reviewStatus !== "IN_GAME_QA_ACCEPTED") {
      throw new Error(`Pilot standalone animation ${name} has invalid reviewStatus ${reviewStatus}.`);
    }
    return {
      name,
      kind: "standalone" as const,
      sourceClipName: stringValue(item.sourceClipName, `Pilot standalone animation ${name}.sourceClipName`),
      url: stringValue(item.url, `Pilot standalone animation ${name}.url`),
      sha256: sha256(item.sha256, `Pilot standalone animation ${name}.sha256`),
      bytes: integer(item.bytes, `Pilot standalone animation ${name}.bytes`),
      reviewStatus,
    } satisfies PilotStandaloneAnimationCatalogEntry;
  });

  exact(source.canonicalClipCount, PILOT_ANIMATION_SOURCE_CLIP_COUNT, "Pilot animation catalog canonicalClipCount");
  exact(source.reviewClipCount, reviewNames.size, "Pilot animation catalog reviewClipCount");
  const builder = record(source.builder, "Pilot animation catalog builder");

  return {
    schemaVersion: 1,
    issue: 487,
    catalogId: "human-foundation-pilot-lazy-review-v1",
    source: {
      url: sourceUrl,
      sha256: PILOT_ANIMATION_SOURCE_SHA256,
      bytes: PILOT_ANIMATION_SOURCE_BYTES,
      clipCount: PILOT_ANIMATION_SOURCE_CLIP_COUNT,
    },
    packPolicy: {
      maxClipCount: MAX_PACK_CLIPS,
      maxBytes: MAX_PACK_BYTES,
      creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
      exactAccessorPayloadBytes: true,
    },
    packs,
    clips,
    standaloneApprovedClips,
    canonicalClipCount: PILOT_ANIMATION_SOURCE_CLIP_COUNT,
    reviewClipCount: reviewNames.size,
    builder: {
      path: stringValue(builder.path, "Pilot animation catalog builder.path"),
      sha256: sha256(builder.sha256, "Pilot animation catalog builder.sha256"),
    },
  };
}

export async function loadPilotAnimationCatalog(
  url = PILOT_ANIMATION_CATALOG_URL,
  request: typeof fetch = fetch,
): Promise<PilotAnimationCatalog> {
  const response = await request(url);
  if (!response.ok) throw new Error(`Pilot animation catalog request failed (${response.status} ${response.statusText}).`);
  return validatePilotAnimationCatalog(await response.json());
}

export class PilotAnimationCatalogLoader {
  private readonly packById: Map<string, PilotAnimationPackCatalogEntry>;
  private readonly clipByName = new Map<
    string,
    PilotAnimationClipCatalogEntry | PilotStandaloneAnimationCatalogEntry
  >();
  private readonly resident = new Map<string, ResidentAnimationAsset>();
  private readonly pending = new Map<string, Promise<ResidentAnimationAsset>>();
  private readonly sortedNames: readonly string[];

  constructor(
    readonly catalog: PilotAnimationCatalog,
    private readonly loader: AnimationAssetLoader | Pick<GLTFLoader, "loadAsync">,
    private readonly maxResidentAssets = 2,
  ) {
    if (!Number.isInteger(maxResidentAssets) || maxResidentAssets < 1) {
      throw new Error("Pilot animation catalog maxResidentAssets must be a positive integer.");
    }
    this.packById = new Map(catalog.packs.map((pack) => [pack.id, pack]));
    for (const clip of catalog.clips) this.clipByName.set(clip.name, clip);
    for (const clip of catalog.standaloneApprovedClips) this.clipByName.set(clip.name, clip);
    // Match the existing review bridge's deterministic code-unit ordering.
    this.sortedNames = [...this.clipByName.keys()].sort();
  }

  reviewAnimations(): readonly string[] {
    return this.sortedNames;
  }

  has(name: string): boolean {
    return this.clipByName.has(name);
  }

  async loadClip(name: string): Promise<AnimationClip> {
    const entry = this.clipByName.get(name);
    if (!entry) throw new Error(`Unknown issue #487 pilot animation: ${name}`);
    if (entry.kind === "standalone") {
      const asset = await this.loadAsset(
        `standalone:${entry.name}`,
        entry.url,
        [entry.sourceClipName],
        false,
      );
      const source = asset.clips.get(entry.sourceClipName);
      if (!source) throw new Error(`Approved standalone ${entry.name} is missing ${entry.sourceClipName}.`);
      if (source.name === entry.name) return source;
      const semantic = source.clone();
      semantic.name = entry.name;
      return semantic;
    }

    const pack = this.packById.get(entry.packId);
    if (!pack) throw new Error(`Pilot animation ${name} references unknown pack ${entry.packId}.`);
    const asset = await this.loadAsset(pack.id, pack.url, pack.clipNames, true);
    const clip = asset.clips.get(name);
    if (!clip) throw new Error(`Pilot animation pack ${pack.id} is missing ${name}.`);
    return clip;
  }

  residency(): PilotAnimationCatalogResidency {
    const residentAssetIds = [...this.resident.keys()];
    return {
      maxResidentAssets: this.maxResidentAssets,
      residentAssetIds,
      residentPackIds: residentAssetIds.filter((id) => !id.startsWith("standalone:")),
      residentClipCount: [...this.resident.values()].reduce((total, asset) => total + asset.clips.size, 0),
      pendingAssetIds: [...this.pending.keys()],
    };
  }

  clear(): void {
    this.resident.clear();
    this.pending.clear();
  }

  private touch(assetId: string, asset: ResidentAnimationAsset): void {
    this.resident.delete(assetId);
    this.resident.set(assetId, asset);
    while (this.resident.size > this.maxResidentAssets) {
      const oldest = this.resident.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.resident.delete(oldest);
    }
  }

  private async loadAsset(
    assetId: string,
    url: string,
    expectedNames: readonly string[],
    exactInventory: boolean,
  ): Promise<ResidentAnimationAsset> {
    const cached = this.resident.get(assetId);
    if (cached) {
      this.touch(assetId, cached);
      return cached;
    }
    const active = this.pending.get(assetId);
    if (active) return active;

    const pending = this.loader.loadAsync(url).then((gltf) => {
      const clips = new Map<string, AnimationClip>();
      for (const clip of gltf.animations) {
        if (clips.has(clip.name)) throw new Error(`Pilot animation asset ${assetId} duplicates ${clip.name}.`);
        clips.set(clip.name, clip);
      }
      for (const name of expectedNames) {
        if (!clips.has(name)) throw new Error(`Pilot animation asset ${assetId} is missing ${name}.`);
      }
      if (exactInventory && clips.size !== expectedNames.length) {
        throw new Error(`Pilot animation asset ${assetId} has ${clips.size} clips; expected ${expectedNames.length}.`);
      }
      const asset = { clips } satisfies ResidentAnimationAsset;
      this.pending.delete(assetId);
      this.touch(assetId, asset);
      return asset;
    }).catch((error: unknown) => {
      this.pending.delete(assetId);
      throw error;
    });
    this.pending.set(assetId, pending);
    return pending;
  }
}
