import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const TRIANGLES_MODE = 4;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source-root" || argument === "--output") {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    }
  }

  if (!options["source-root"] || !options.output) {
    throw new Error(
      "Usage: node scripts/audit-first-breach-source-glbs.mjs --source-root <issue-448 intake> --output <report.json>",
    );
  }

  return {
    output: resolve(options.output),
    sourceRoot: resolve(options["source-root"]),
  };
}

async function findGlbs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return findGlbs(path);
      if (entry.isFile() && extname(entry.name).toLowerCase() === ".glb") return [path];
      return [];
    }),
  );
  return nested.flat();
}

function parseGlb(buffer, file) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error(`${file} is not a valid GLB 2 container`);
  }

  const version = buffer.readUInt32LE(4);
  const declaredBytes = buffer.readUInt32LE(8);
  if (version !== 2 || declaredBytes !== buffer.length) {
    throw new Error(`${file} has an invalid GLB header`);
  }

  let offset = 12;
  let json;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > buffer.length) throw new Error(`${file} contains a truncated GLB chunk`);
    if (chunkType === JSON_CHUNK) {
      json = JSON.parse(buffer.subarray(chunkStart, chunkEnd).toString("utf8").trim());
      break;
    }
    offset = chunkEnd;
  }

  if (!json) throw new Error(`${file} has no JSON chunk`);
  return { json, version };
}

function sourceCategory(file) {
  const name = basename(file);
  if (name.startsWith("sd-body-")) return "body";
  if (name.startsWith("sd-npc-")) return "npc";
  if (name.startsWith("sd-creature-")) return "creature";
  if (name.startsWith("sd-gear-")) return "gear";
  if (name.startsWith("sd-hair-")) return "hair";
  if (name.startsWith("sd-wearable-")) return "wearable";
  return "other";
}

function primitiveTriangleCount(primitive, accessors) {
  if ((primitive.mode ?? TRIANGLES_MODE) !== TRIANGLES_MODE) return 0;
  const count = primitive.indices === undefined
    ? accessors[primitive.attributes?.POSITION]?.count ?? 0
    : accessors[primitive.indices]?.count ?? 0;
  return Math.floor(count / 3);
}

function inspect(json) {
  const accessors = json.accessors ?? [];
  const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
  const positionAccessors = primitives
    .map((primitive) => accessors[primitive.attributes?.POSITION])
    .filter(Boolean);

  return {
    generator: json.asset?.generator ?? null,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    primitives: primitives.length,
    vertices: positionAccessors.reduce((total, accessor) => total + (accessor.count ?? 0), 0),
    triangles: primitives.reduce(
      (total, primitive) => total + primitiveTriangleCount(primitive, accessors),
      0,
    ),
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    images: json.images?.length ?? 0,
    skins: json.skins?.length ?? 0,
    joints: (json.skins ?? []).reduce((total, skin) => total + (skin.joints?.length ?? 0), 0),
    animations: (json.animations ?? []).map((animation, index) => animation.name ?? `animation-${index}`),
    morphTargetSets: primitives.reduce(
      (total, primitive) => total + (primitive.targets?.length ?? 0),
      0,
    ),
    positionBoundsPresent: positionAccessors.every(
      (accessor) => Array.isArray(accessor.min) && Array.isArray(accessor.max),
    ),
  };
}

async function auditFile(file, sourceRoot) {
  const buffer = await readFile(file);
  const { json, version } = parseGlb(buffer, file);
  return {
    file: basename(file),
    relativePath: relative(sourceRoot, file).replaceAll("\\", "/"),
    category: sourceCategory(file),
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex").toUpperCase(),
    glbVersion: version,
    ...inspect(json),
    shippingTree: false,
    runtimePromotionAllowed: false,
  };
}

const { output, sourceRoot } = parseArguments(process.argv.slice(2));
const files = (await findGlbs(sourceRoot)).sort((left, right) => left.localeCompare(right));
const assets = await Promise.all(files.map((file) => auditFile(file, sourceRoot)));
const categoryCounts = Object.fromEntries(
  [...new Set(assets.map((asset) => asset.category))]
    .sort()
    .map((category) => [category, assets.filter((asset) => asset.category === category).length]),
);

const report = {
  schemaVersion: 1,
  issue: 448,
  branch: "codex/448-souldrifter-first-breach-models",
  generatedAt: new Date().toISOString(),
  sourceRootPolicy: "external-owner-controlled-issue-448-intake-not-shipping-tree",
  assetCount: assets.length,
  categoryCounts,
  gate: {
    purpose: "offline-source-intake-and-technicalization-planning",
    provesRuntimeReadiness: false,
    requiredNextSteps: [
      "owner-source-selection",
      "blender-cleanup-and-part-separation",
      "deformation-friendly-retopology-and-pbr-bake",
      "canonical-scale-orientation-pivots-and-sockets",
      "rig-or-rigid-hierarchy-and-facial-controls",
      "animation-gameplay-camera-clipping-and-performance-proof",
    ],
  },
  assets,
};

await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Audited ${assets.length} GLBs from ${sourceRoot}`);
console.log(`Wrote ${output}`);
