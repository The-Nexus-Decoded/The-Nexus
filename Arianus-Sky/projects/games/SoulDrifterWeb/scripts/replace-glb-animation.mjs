import fs from "node:fs";
import path from "node:path";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${filePath} is not a GLB file.`);
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`${filePath} is not GLB version 2.`);

  let offset = 12;
  let json;
  let bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(payload.toString("utf8").trimEnd());
    else if (type === BIN_CHUNK) bin = Buffer.from(payload);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${filePath} has no JSON chunk.`);
  return { json, bin };
}

function pad4(bytes, fill = 0) {
  const padding = (4 - (bytes.length % 4)) % 4;
  return padding === 0 ? bytes : Buffer.concat([bytes, Buffer.alloc(padding, fill)]);
}

function encodeGlb(json, bin) {
  const jsonBytes = pad4(Buffer.from(JSON.stringify(json), "utf8"), 0x20);
  const binBytes = pad4(bin, 0);
  const output = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + binBytes.length);
  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(2, 4);
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

function requireArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1];
}

const targetPath = path.resolve(requireArg("--target"));
const sourcePath = path.resolve(requireArg("--source"));
const outputPath = path.resolve(requireArg("--output"));
const animationName = requireArg("--animation");
const appendIfMissing = process.argv.includes("--append-if-missing");

const target = parseGlb(targetPath);
const source = parseGlb(sourcePath);
const targetNodeNames = (target.json.nodes ?? []).map((node) => node.name ?? "");
const sourceNodeNames = (source.json.nodes ?? []).map((node) => node.name ?? "");
if (JSON.stringify(targetNodeNames) !== JSON.stringify(sourceNodeNames)) {
  throw new Error("Source and target GLBs do not have the same indexed skeleton/scene nodes.");
}

const sourceAnimation = (source.json.animations ?? []).find((animation) => animation.name === animationName);
const targetAnimationIndex = (target.json.animations ?? []).findIndex((animation) => animation.name === animationName);
if (!sourceAnimation) throw new Error(`Source animation ${animationName} was not found.`);
if (targetAnimationIndex < 0 && !appendIfMissing) throw new Error(`Target animation ${animationName} was not found.`);

target.json.bufferViews ??= [];
target.json.accessors ??= [];
let targetBin = Buffer.from(target.bin);
const bufferViewMap = new Map();
const accessorMap = new Map();

function copyBufferView(sourceIndex) {
  if (bufferViewMap.has(sourceIndex)) return bufferViewMap.get(sourceIndex);
  const sourceView = source.json.bufferViews?.[sourceIndex];
  if (!sourceView) throw new Error(`Missing source bufferView ${sourceIndex}.`);
  if ((sourceView.buffer ?? 0) !== 0) throw new Error("Only single-buffer GLBs are supported.");
  targetBin = pad4(targetBin, 0);
  const byteOffset = targetBin.length;
  const sourceOffset = sourceView.byteOffset ?? 0;
  const payload = source.bin.subarray(sourceOffset, sourceOffset + sourceView.byteLength);
  targetBin = Buffer.concat([targetBin, payload]);
  const copied = { ...structuredClone(sourceView), buffer: 0, byteOffset };
  const targetIndex = target.json.bufferViews.push(copied) - 1;
  bufferViewMap.set(sourceIndex, targetIndex);
  return targetIndex;
}

function copyAccessor(sourceIndex) {
  if (accessorMap.has(sourceIndex)) return accessorMap.get(sourceIndex);
  const sourceAccessor = source.json.accessors?.[sourceIndex];
  if (!sourceAccessor) throw new Error(`Missing source accessor ${sourceIndex}.`);
  if (sourceAccessor.sparse) throw new Error("Sparse animation accessors are not supported.");
  if (sourceAccessor.bufferView === undefined) throw new Error(`Animation accessor ${sourceIndex} has no bufferView.`);
  const copied = structuredClone(sourceAccessor);
  copied.bufferView = copyBufferView(sourceAccessor.bufferView);
  const targetIndex = target.json.accessors.push(copied) - 1;
  accessorMap.set(sourceIndex, targetIndex);
  return targetIndex;
}

const copiedAnimation = structuredClone(sourceAnimation);
copiedAnimation.samplers = copiedAnimation.samplers.map((sampler) => ({
  ...sampler,
  input: copyAccessor(sampler.input),
  output: copyAccessor(sampler.output),
}));
if (targetAnimationIndex < 0) target.json.animations.push(copiedAnimation);
else target.json.animations[targetAnimationIndex] = copiedAnimation;
target.json.buffers[0].byteLength = pad4(targetBin, 0).length;

const encoded = encodeGlb(target.json, targetBin);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, encoded);
process.stdout.write(JSON.stringify({
  status: targetAnimationIndex < 0 ? "animation_appended" : "animation_replaced",
  animation: animationName,
  target: targetPath,
  source: sourcePath,
  output: outputPath,
  bytes: encoded.length,
  copiedAccessors: accessorMap.size,
  copiedBufferViews: bufferViewMap.size,
}, null, 2));
