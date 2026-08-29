import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_SHA256 = "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793";
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

export const HUMAN_FOUNDATION_CORE_CLIPS = Object.freeze([
  "MaleLocomotion__Idle",
  "MaleLocomotion__Walking",
  "MaleLocomotion__StandardRun",
  "ProSwordAndShield__DrawSword1",
  "ProSwordAndShield__SwordAndShieldIdle",
  "ProSwordAndShield__SwordAndShieldAttack",
  "ProSwordAndShield__SheathSword1",
  "GreatSword__DrawAGreatSword1",
  "GreatSword__GreatSwordIdle",
  "GreatSword__GreatSwordAttack",
  "GreatSword__GreatSwordWalk",
  "GreatSword__GreatSwordRun",
  "Interactions__HumanMasculineAthleticMuscularStaffButtSmash",
  "ProLongbow__StandingEquipBow",
  "ProLongbow__StandingIdle01",
  "ProLongbow__StandingDrawArrow",
  "ProLongbow__StandingAimRecoil",
  "ProLongbow__StandingDisarmBow",
]);

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), "..");
const assetRoot = join(projectRoot, "public", "assets", "3d", "animations", "human-foundation-pilot");
const sourcePath = join(assetRoot, "human-foundation-pilot-animation-library.glb");
const outputPath = join(assetRoot, "human-foundation-pilot-core-actions.glb");
const manifestPath = join(assetRoot, "human-foundation-pilot-core-actions.json");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();

function pad4(bytes, fill = 0) {
  const padding = (4 - bytes.length % 4) % 4;
  return padding === 0 ? bytes : Buffer.concat([bytes, Buffer.alloc(padding, fill)]);
}

export function parseGlb(bytes, label = "GLB") {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${label} is not a GLB.`);
  if (bytes.readUInt32LE(4) !== GLB_VERSION) throw new Error(`${label} is not GLB version 2.`);
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`${label} length header is invalid.`);
  let json;
  let bin = Buffer.alloc(0);
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (payload.length !== length) throw new Error(`${label} has a truncated chunk.`);
    if (type === JSON_CHUNK) json = JSON.parse(payload.toString("utf8").trimEnd());
    if (type === BIN_CHUNK) bin = Buffer.from(payload);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${label} has no JSON chunk.`);
  return { json, bin };
}

function encodeGlb(json, bin) {
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

function buildPack(source, animations) {
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
      issue: 458,
      purpose: "Human Foundation production core actions",
      sourceLibrarySha256: SOURCE_SHA256,
      creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
    },
  };
  if (source.json.extensionsUsed) document.extensionsUsed = structuredClone(source.json.extensionsUsed);
  if (source.json.extensionsRequired) document.extensionsRequired = structuredClone(source.json.extensionsRequired);

  let outputBin = Buffer.alloc(0);
  const bufferViewMap = new Map();
  const accessorMap = new Map();
  const copyBufferView = (sourceIndex) => {
    if (bufferViewMap.has(sourceIndex)) return bufferViewMap.get(sourceIndex);
    const view = source.json.bufferViews?.[sourceIndex];
    if (!view || (view.buffer ?? 0) !== 0) throw new Error(`Unsupported bufferView ${sourceIndex}.`);
    outputBin = pad4(outputBin, 0);
    const byteOffset = outputBin.length;
    const sourceOffset = view.byteOffset ?? 0;
    outputBin = Buffer.concat([outputBin, source.bin.subarray(sourceOffset, sourceOffset + view.byteLength)]);
    const targetIndex = document.bufferViews.push({ ...structuredClone(view), buffer: 0, byteOffset }) - 1;
    bufferViewMap.set(sourceIndex, targetIndex);
    return targetIndex;
  };
  const copyAccessor = (sourceIndex) => {
    if (accessorMap.has(sourceIndex)) return accessorMap.get(sourceIndex);
    const accessor = source.json.accessors?.[sourceIndex];
    if (!accessor || accessor.sparse || accessor.bufferView === undefined) {
      throw new Error(`Unsupported accessor ${sourceIndex}.`);
    }
    const copied = structuredClone(accessor);
    copied.bufferView = copyBufferView(accessor.bufferView);
    const targetIndex = document.accessors.push(copied) - 1;
    accessorMap.set(sourceIndex, targetIndex);
    return targetIndex;
  };

  document.skins = (source.json.skins ?? []).map((skin) => ({
    ...structuredClone(skin),
    ...(skin.inverseBindMatrices === undefined ? {} : { inverseBindMatrices: copyAccessor(skin.inverseBindMatrices) }),
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

export function buildHumanFoundationCorePack() {
  const sourceBytes = readFileSync(sourcePath);
  if (sha256(sourceBytes) !== SOURCE_SHA256) throw new Error("Human Foundation animation source SHA-256 drifted.");
  const source = parseGlb(sourceBytes, sourcePath);
  const byName = new Map((source.json.animations ?? []).map((animation) => [animation.name, animation]));
  const selected = HUMAN_FOUNDATION_CORE_CLIPS.map((name) => {
    const animation = byName.get(name);
    if (!animation) throw new Error(`Human Foundation source is missing ${name}.`);
    return animation;
  });
  const outputBytes = buildPack(source, selected);
  writeFileSync(outputPath, outputBytes);
  const parsedOutput = parseGlb(outputBytes, outputPath);
  const outputNames = parsedOutput.json.animations.map((animation) => animation.name);
  if (JSON.stringify(outputNames) !== JSON.stringify(HUMAN_FOUNDATION_CORE_CLIPS)) {
    throw new Error("Human Foundation core-pack inventory changed during export.");
  }
  const manifest = {
    schemaVersion: 1,
    issue: 458,
    source: {
      path: relative(projectRoot, sourcePath).replaceAll("\\", "/"),
      sha256: SOURCE_SHA256,
      clipCount: source.json.animations.length,
    },
    output: {
      url: "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-core-actions.glb",
      path: relative(projectRoot, outputPath).replaceAll("\\", "/"),
      sha256: sha256(outputBytes),
      bytes: outputBytes.length,
      clipCount: outputNames.length,
      clips: outputNames,
    },
    creationMethod: "RAW_GLB_ACCESSOR_COPY_NO_RESAMPLING",
    builder: relative(projectRoot, scriptPath).replaceAll("\\", "/"),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  process.stdout.write(`${JSON.stringify(buildHumanFoundationCorePack(), null, 2)}\n`);
}
