import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const MAX_PACK_CLIPS = 24;
const MAX_PACK_BYTES = 4 * 1024 * 1024;
const EXPECTED_SOURCE_SHA256 = "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793";
const EXPECTED_SOURCE_BYTES = 32_441_884;
const EXPECTED_SOURCE_CLIPS = 400;

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), "..");
const assetRoot = join(projectRoot, "public", "assets", "3d", "animations", "human-foundation-pilot");
const sourcePath = join(assetRoot, "human-foundation-pilot-animation-library.glb");
const outputDir = join(assetRoot, "review-packs");
const catalogPath = join(assetRoot, "human-foundation-pilot-animation-catalog.json");

const standaloneApproved = [
  {
    name: "AuthoredUtility__Lockpick",
    sourceClipName: "AuthoredUtility__Lockpick",
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lockpick.glb",
    localPath: join(assetRoot, "human-foundation-pilot-authored-lockpick.glb"),
    sha256: "2AB154B7E9F58419A15D6F7C33557CFE77413F8B7448D507F1304DD06F84255A",
    reviewStatus: "OWNER_APPROVED",
  },
  {
    name: "AuthoredReaction__SpellImpactKnockbackAndFall",
    sourceClipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-spell-impact-knockback-fall.glb",
    localPath: join(assetRoot, "human-foundation-pilot-authored-spell-impact-knockback-fall.glb"),
    sha256: "6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
  },
  {
    name: "AuthoredUtility__NpcListen",
    sourceClipName: "AuthoredUtility__NpcListen",
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-npc-listen.glb",
    localPath: join(assetRoot, "human-foundation-pilot-authored-npc-listen.glb"),
    sha256: "23615F625DC7C095D5BABF1358075060A6B69CC93FC7453AEDE88A8595F61DD6",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
  },
  {
    name: "AuthoredUtility__Farewell",
    sourceClipName: "AuthoredUtility__Farewell",
    url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-farewell.glb",
    localPath: join(assetRoot, "human-foundation-pilot-authored-farewell.glb"),
    sha256: "760C60A83805918CB4034279998EC85F6A1D41E773F69DF850223DBF013E7F28",
    reviewStatus: "IN_GAME_QA_ACCEPTED",
  },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function pad4(bytes, fill = 0) {
  const padding = (4 - (bytes.length % 4)) % 4;
  return padding === 0 ? bytes : Buffer.concat([bytes, Buffer.alloc(padding, fill)]);
}

export function parseGlb(bytes, label = "GLB") {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error(`${label} is not a GLB file.`);
  }
  if (bytes.readUInt32LE(4) !== GLB_VERSION) {
    throw new Error(`${label} is not GLB version ${GLB_VERSION}.`);
  }
  if (bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${label} header length does not match its file length.`);
  }

  let offset = 12;
  let json;
  let bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (payload.length !== length) throw new Error(`${label} has a truncated GLB chunk.`);
    if (type === JSON_CHUNK) json = JSON.parse(payload.toString("utf8").trimEnd());
    else if (type === BIN_CHUNK) bin = Buffer.from(payload);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${label} has no JSON chunk.`);
  if (offset !== bytes.length) throw new Error(`${label} has an invalid GLB chunk boundary.`);
  return { json, bin };
}

export function encodeGlb(json, bin) {
  const jsonBytes = pad4(Buffer.from(JSON.stringify(json), "utf8"), 0x20);
  const binBytes = pad4(bin, 0);
  const output = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + binBytes.length);
  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(GLB_VERSION, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonBytes.length, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  jsonBytes.copy(output, 20);
  const binHeader = 20 + jsonBytes.length;
  output.writeUInt32LE(binBytes.length, binHeader);
  output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  binBytes.copy(output, binHeader + 8);
  return output;
}

const componentBytes = new Map([
  [5120, 1],
  [5121, 1],
  [5122, 2],
  [5123, 2],
  [5125, 4],
  [5126, 4],
]);
const typeComponents = new Map([
  ["SCALAR", 1],
  ["VEC2", 2],
  ["VEC3", 3],
  ["VEC4", 4],
  ["MAT2", 4],
  ["MAT3", 9],
  ["MAT4", 16],
]);

function accessorPayload(source, accessorIndex) {
  const accessor = source.json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Missing accessor ${accessorIndex}.`);
  if (accessor.sparse) throw new Error(`Sparse accessor ${accessorIndex} is not supported.`);
  if (accessor.bufferView === undefined) throw new Error(`Accessor ${accessorIndex} has no bufferView.`);
  const view = source.json.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`Missing bufferView ${accessor.bufferView}.`);
  if ((view.buffer ?? 0) !== 0) throw new Error("Only single-buffer GLBs are supported.");
  const scalarBytes = componentBytes.get(accessor.componentType);
  const componentCount = typeComponents.get(accessor.type);
  if (!scalarBytes || !componentCount) throw new Error(`Accessor ${accessorIndex} has an unsupported format.`);
  const elementBytes = scalarBytes * componentCount;
  const stride = view.byteStride ?? elementBytes;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  if (stride === elementBytes) {
    return source.bin.subarray(start, start + accessor.count * elementBytes);
  }
  const payload = Buffer.alloc(accessor.count * elementBytes);
  for (let index = 0; index < accessor.count; index += 1) {
    source.bin.copy(payload, index * elementBytes, start + index * stride, start + index * stride + elementBytes);
  }
  return payload;
}

function accessorFingerprint(source, accessorIndex) {
  const accessor = source.json.accessors[accessorIndex];
  const view = source.json.bufferViews[accessor.bufferView];
  return {
    componentType: accessor.componentType,
    count: accessor.count,
    type: accessor.type,
    normalized: accessor.normalized ?? false,
    min: accessor.min ?? null,
    max: accessor.max ?? null,
    byteOffset: accessor.byteOffset ?? 0,
    byteStride: view.byteStride ?? null,
    payloadSha256: sha256(accessorPayload(source, accessorIndex)),
  };
}

export function animationFingerprint(source, animation) {
  const structure = {
    name: animation.name,
    channels: animation.channels.map((channel) => ({
      sampler: channel.sampler,
      target: {
        node: channel.target.node,
        path: channel.target.path,
      },
    })),
    samplers: animation.samplers.map((sampler) => ({
      interpolation: sampler.interpolation ?? "LINEAR",
      input: accessorFingerprint(source, sampler.input),
      output: accessorFingerprint(source, sampler.output),
    })),
  };
  return sha256(Buffer.from(JSON.stringify(structure), "utf8"));
}

function copyTopLevel(document, sourceJson, key) {
  if (sourceJson[key] !== undefined) document[key] = structuredClone(sourceJson[key]);
}

export function buildPack(source, animations, packId) {
  const document = {
    asset: structuredClone(source.json.asset),
    scene: source.json.scene,
    scenes: structuredClone(source.json.scenes ?? []),
    nodes: structuredClone(source.json.nodes ?? []),
    animations: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
    extras: {
      issue: 487,
      packId,
      creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
      sourceLibrarySha256: EXPECTED_SOURCE_SHA256,
    },
  };
  copyTopLevel(document, source.json, "extensionsUsed");
  copyTopLevel(document, source.json, "extensionsRequired");

  let outputBin = Buffer.alloc(0);
  const bufferViewMap = new Map();
  const accessorMap = new Map();

  const copyBufferView = (sourceIndex) => {
    const cached = bufferViewMap.get(sourceIndex);
    if (cached !== undefined) return cached;
    const sourceView = source.json.bufferViews?.[sourceIndex];
    if (!sourceView) throw new Error(`Missing source bufferView ${sourceIndex}.`);
    if ((sourceView.buffer ?? 0) !== 0) throw new Error("Only single-buffer GLBs are supported.");
    outputBin = pad4(outputBin, 0);
    const byteOffset = outputBin.length;
    const sourceOffset = sourceView.byteOffset ?? 0;
    const payload = source.bin.subarray(sourceOffset, sourceOffset + sourceView.byteLength);
    outputBin = Buffer.concat([outputBin, payload]);
    const copied = { ...structuredClone(sourceView), buffer: 0, byteOffset };
    const targetIndex = document.bufferViews.push(copied) - 1;
    bufferViewMap.set(sourceIndex, targetIndex);
    return targetIndex;
  };

  const copyAccessor = (sourceIndex) => {
    const cached = accessorMap.get(sourceIndex);
    if (cached !== undefined) return cached;
    const sourceAccessor = source.json.accessors?.[sourceIndex];
    if (!sourceAccessor) throw new Error(`Missing source accessor ${sourceIndex}.`);
    if (sourceAccessor.sparse) throw new Error(`Sparse accessor ${sourceIndex} is not supported.`);
    if (sourceAccessor.bufferView === undefined) throw new Error(`Accessor ${sourceIndex} has no bufferView.`);
    const copied = structuredClone(sourceAccessor);
    copied.bufferView = copyBufferView(sourceAccessor.bufferView);
    const targetIndex = document.accessors.push(copied) - 1;
    accessorMap.set(sourceIndex, targetIndex);
    return targetIndex;
  };

  document.skins = (source.json.skins ?? []).map((skin) => ({
    ...structuredClone(skin),
    ...(skin.inverseBindMatrices === undefined
      ? {}
      : { inverseBindMatrices: copyAccessor(skin.inverseBindMatrices) }),
  }));
  document.animations = animations.map((animation) => {
    const copied = structuredClone(animation);
    copied.samplers = copied.samplers.map((sampler) => ({
      ...sampler,
      input: copyAccessor(sampler.input),
      output: copyAccessor(sampler.output),
    }));
    return copied;
  });
  outputBin = pad4(outputBin, 0);
  document.buffers[0].byteLength = outputBin.length;
  return encodeGlb(document, outputBin);
}

function slug(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function createShards(source) {
  const byPrefix = new Map();
  for (const animation of source.json.animations) {
    const prefix = animation.name.split("__")[0];
    const group = byPrefix.get(prefix) ?? [];
    group.push(animation);
    byPrefix.set(prefix, group);
  }

  const shards = [];
  for (const [prefix, group] of [...byPrefix.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const sorted = [...group].sort((left, right) => left.name.localeCompare(right.name));
    let current = [];
    for (const animation of sorted) {
      const candidate = [...current, animation];
      const candidateBytes = buildPack(source, candidate, `${slug(prefix)}-candidate`);
      if (current.length > 0 && (candidate.length > MAX_PACK_CLIPS || candidateBytes.length > MAX_PACK_BYTES)) {
        shards.push({ prefix, animations: current });
        current = [animation];
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) shards.push({ prefix, animations: current });
  }
  return shards;
}

function validateSource(sourceBytes, source) {
  const sourceHash = sha256(sourceBytes);
  if (sourceHash !== EXPECTED_SOURCE_SHA256) {
    throw new Error(`Pilot source SHA mismatch: expected ${EXPECTED_SOURCE_SHA256}, got ${sourceHash}.`);
  }
  if (sourceBytes.length !== EXPECTED_SOURCE_BYTES) {
    throw new Error(`Pilot source bytes mismatch: expected ${EXPECTED_SOURCE_BYTES}, got ${sourceBytes.length}.`);
  }
  const animations = source.json.animations ?? [];
  if (animations.length !== EXPECTED_SOURCE_CLIPS) {
    throw new Error(`Pilot source clip count mismatch: expected ${EXPECTED_SOURCE_CLIPS}, got ${animations.length}.`);
  }
  const names = animations.map((animation) => animation.name);
  if (names.some((name) => typeof name !== "string" || name.length === 0) || new Set(names).size !== names.length) {
    throw new Error("Pilot source animation names must be non-empty and unique.");
  }
  if ((source.json.meshes ?? []).length > 0 || (source.json.cameras ?? []).length > 0) {
    throw new Error("Pilot source library unexpectedly contains renderable geometry or cameras.");
  }
}

function validateStandalone() {
  return standaloneApproved.map(({ localPath, ...spec }) => {
    const bytes = readFileSync(localPath);
    const actualHash = sha256(bytes);
    if (actualHash !== spec.sha256) {
      throw new Error(`Approved standalone ${spec.name} SHA mismatch: expected ${spec.sha256}, got ${actualHash}.`);
    }
    const parsed = parseGlb(bytes, spec.name);
    if (!(parsed.json.animations ?? []).some((animation) => animation.name === spec.sourceClipName)) {
      throw new Error(`Approved standalone ${spec.name} is missing ${spec.sourceClipName}.`);
    }
    return { ...spec, bytes: bytes.length };
  });
}

export function buildReviewPacks() {
  const sourceBytes = readFileSync(sourcePath);
  const source = parseGlb(sourceBytes, sourcePath);
  validateSource(sourceBytes, source);
  const standalone = validateStandalone();
  const sourceFingerprints = new Map(
    source.json.animations.map((animation) => [animation.name, animationFingerprint(source, animation)]),
  );

  mkdirSync(outputDir, { recursive: true });
  for (const name of readdirSync(outputDir)) {
    if (/^human-foundation-pilot-review-[a-z0-9-]+\.glb$/.test(name)) unlinkSync(join(outputDir, name));
  }

  const shards = createShards(source);
  const prefixCounts = new Map();
  const packs = [];
  const clips = [];
  for (const shard of shards) {
    const ordinal = (prefixCounts.get(shard.prefix) ?? 0) + 1;
    prefixCounts.set(shard.prefix, ordinal);
    const packId = `${slug(shard.prefix)}-${String(ordinal).padStart(2, "0")}`;
    const fileName = `human-foundation-pilot-review-${packId}.glb`;
    const outputPath = join(outputDir, fileName);
    const bytes = buildPack(source, shard.animations, packId);
    if (shard.animations.length > MAX_PACK_CLIPS || bytes.length > MAX_PACK_BYTES) {
      throw new Error(`${packId} exceeds the pack limits (${shard.animations.length} clips, ${bytes.length} bytes).`);
    }
    const parsed = parseGlb(bytes, packId);
    const fingerprints = Object.fromEntries(
      parsed.json.animations.map((animation) => [animation.name, animationFingerprint(parsed, animation)]),
    );
    for (const animation of shard.animations) {
      const expected = sourceFingerprints.get(animation.name);
      if (fingerprints[animation.name] !== expected) {
        throw new Error(`${packId}/${animation.name} changed animation accessor bytes.`);
      }
      clips.push({
        name: animation.name,
        kind: "pack",
        packId,
        fingerprint: expected,
      });
    }
    writeFileSync(outputPath, bytes);
    packs.push({
      id: packId,
      prefix: shard.prefix,
      url: `/assets/3d/animations/human-foundation-pilot/review-packs/${fileName}`,
      sha256: sha256(bytes),
      bytes: bytes.length,
      clipCount: shard.animations.length,
      clipNames: shard.animations.map((animation) => animation.name),
    });
  }

  clips.sort((left, right) => left.name.localeCompare(right.name));
  if (clips.length !== EXPECTED_SOURCE_CLIPS || new Set(clips.map((clip) => clip.name)).size !== EXPECTED_SOURCE_CLIPS) {
    throw new Error("Generated review catalog does not contain exactly 400 unique source clips.");
  }
  const reviewNames = [...clips.map((clip) => clip.name), ...standalone.map((clip) => clip.name)];
  if (new Set(reviewNames).size !== reviewNames.length) {
    throw new Error("Generated review catalog contains duplicate canonical and standalone clip names.");
  }

  const catalog = {
    schemaVersion: 1,
    issue: 487,
    catalogId: "human-foundation-pilot-lazy-review-v1",
    source: {
      url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
      sha256: EXPECTED_SOURCE_SHA256,
      bytes: EXPECTED_SOURCE_BYTES,
      clipCount: EXPECTED_SOURCE_CLIPS,
    },
    packPolicy: {
      maxClipCount: MAX_PACK_CLIPS,
      maxBytes: MAX_PACK_BYTES,
      creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
      exactAccessorPayloadBytes: true,
    },
    packs,
    clips,
    standaloneApprovedClips: standalone.map((clip) => ({
      name: clip.name,
      kind: "standalone",
      sourceClipName: clip.sourceClipName,
      url: clip.url,
      sha256: clip.sha256,
      bytes: clip.bytes,
      reviewStatus: clip.reviewStatus,
    })),
    canonicalClipCount: clips.length,
    reviewClipCount: reviewNames.length,
    builder: {
      path: relative(projectRoot, scriptPath).replaceAll("\\", "/"),
      sha256: sha256(readFileSync(scriptPath)),
    },
  };
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalog;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const catalog = buildReviewPacks();
  process.stdout.write(`${JSON.stringify({
    status: "built",
    catalog: relative(projectRoot, catalogPath).replaceAll("\\", "/"),
    sourceSha256: catalog.source.sha256,
    canonicalClipCount: catalog.canonicalClipCount,
    reviewClipCount: catalog.reviewClipCount,
    packCount: catalog.packs.length,
    largestPackBytes: Math.max(...catalog.packs.map((pack) => pack.bytes)),
  }, null, 2)}\n`);
}
