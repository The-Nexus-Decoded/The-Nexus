import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const gameRoot = new URL("../", import.meta.url);

export const DEFAULT_MANIFEST_URL = new URL(
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-coverage.json",
  gameRoot,
);

export const DEFAULT_LIBRARY_URL = new URL(
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
  gameRoot,
);

const REQUIRED_GAP_IDS = [
  "reaction.spell.blowback",
  "reaction.spell.knockdown",
  "reaction.spell.get-up",
  "combat.staff.grip-idle",
  "combat.staff.melee-family",
  "combat.staff.guard-block",
  "combat.staff.channel-cast",
  "combat.staff.draw-stow",
  "interaction.lockpick",
  "interaction.mine",
  "interaction.chop",
  "npc.farewell",
  "water.dive",
  "water.underwater-swim",
  "water.surface.open",
  "death.drowning",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

export function parseGlbJson(bytes) {
  if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error("Animation library is not a valid GLB container");
  }
  if (bytes.readUInt32LE(4) !== 2) {
    throw new Error(`Expected GLB version 2, got ${bytes.readUInt32LE(4)}`);
  }
  if (bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error("GLB header byte length does not match the file length");
  }
  const jsonLength = bytes.readUInt32LE(12);
  const jsonChunkType = bytes.toString("ascii", 16, 20);
  if (jsonChunkType !== "JSON") {
    throw new Error(`Expected first GLB chunk to be JSON, got ${jsonChunkType}`);
  }
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/g, ""));
}

export function readGlbAnimationNames(libraryUrl = DEFAULT_LIBRARY_URL) {
  const bytes = readFileSync(fileURLToPath(libraryUrl));
  const json = parseGlbJson(bytes);
  const names = (json.animations ?? []).map((animation) => animation.name);
  return { bytes, json, names };
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

export function validateManifest({
  manifestUrl = DEFAULT_MANIFEST_URL,
  libraryUrl = DEFAULT_LIBRARY_URL,
} = {}) {
  const manifest = JSON.parse(readFileSync(fileURLToPath(manifestUrl), "utf8"));
  const library = readGlbAnimationNames(libraryUrl);
  const libraryNames = new Set(library.names);
  const errors = [];

  requireCondition(manifest.schemaVersion === 1, "schemaVersion must equal 1", errors);
  requireCondition(manifest.issue === 487, "issue must equal 487", errors);
  requireCondition(Array.isArray(manifest.requiredNow), "requiredNow must be an array", errors);
  requireCondition(Array.isArray(manifest.deferredHigherLevel), "deferredHigherLevel must be an array", errors);
  requireCondition(
    manifest.generatedFrom.libraryBytes === library.bytes.length,
    `library byte receipt mismatch: manifest=${manifest.generatedFrom.libraryBytes} actual=${library.bytes.length}`,
    errors,
  );
  requireCondition(
    manifest.generatedFrom.librarySha256 === sha256(library.bytes),
    "library SHA-256 receipt does not match the committed GLB",
    errors,
  );
  requireCondition(
    manifest.generatedFrom.libraryClipCount === library.names.length,
    `library clip-count receipt mismatch: manifest=${manifest.generatedFrom.libraryClipCount} actual=${library.names.length}`,
    errors,
  );
  requireCondition(
    libraryNames.size === library.names.length,
    "animation library contains duplicate clip names",
    errors,
  );

  const requirementIds = new Set();
  const coverage = { COVERED_NOW: 0, PARTIAL: 0, MISSING: 0 };
  for (const requirement of manifest.requiredNow ?? []) {
    requireCondition(typeof requirement.id === "string" && requirement.id.length > 0, "requiredNow row has no id", errors);
    requireCondition(!requirementIds.has(requirement.id), `duplicate requirement id: ${requirement.id}`, errors);
    requirementIds.add(requirement.id);
    requireCondition(typeof requirement.category === "string" && requirement.category.length > 0, `${requirement.id}: category is required`, errors);
    requireCondition(typeof requirement.motion === "string" && requirement.motion.length > 0, `${requirement.id}: motion is required`, errors);
    requireCondition(Object.hasOwn(coverage, requirement.coverage), `${requirement.id}: invalid coverage ${requirement.coverage}`, errors);
    if (Object.hasOwn(coverage, requirement.coverage)) coverage[requirement.coverage] += 1;
    requireCondition(Array.isArray(requirement.candidates), `${requirement.id}: candidates must be an array`, errors);

    if (requirement.coverage === "COVERED_NOW") {
      requireCondition(requirement.candidates.length > 0, `${requirement.id}: COVERED_NOW requires exact candidates`, errors);
      requireCondition(!requirement.gap, `${requirement.id}: COVERED_NOW cannot carry an unresolved gap`, errors);
    } else if (requirement.coverage === "PARTIAL") {
      requireCondition(requirement.candidates.length > 0, `${requirement.id}: PARTIAL requires the closest exact candidate`, errors);
      requireCondition(typeof requirement.gap === "string" && requirement.gap.length > 0, `${requirement.id}: PARTIAL requires a gap explanation`, errors);
    } else if (requirement.coverage === "MISSING") {
      requireCondition(requirement.candidates.length === 0, `${requirement.id}: MISSING cannot name a false candidate`, errors);
      requireCondition(typeof requirement.gap === "string" && requirement.gap.length > 0, `${requirement.id}: MISSING requires a gap explanation`, errors);
    }

    for (const candidate of requirement.candidates ?? []) {
      requireCondition(libraryNames.has(candidate), `${requirement.id}: candidate is not in the committed GLB: ${candidate}`, errors);
    }
  }

  for (const requiredId of REQUIRED_GAP_IDS) {
    requireCondition(requirementIds.has(requiredId), `mandatory gap row is absent: ${requiredId}`, errors);
  }

  const deferredIds = new Set();
  for (const deferred of manifest.deferredHigherLevel ?? []) {
    requireCondition(deferred.scope === "DEFERRED_HIGHER_LEVEL", `${deferred.id}: deferred scope must be DEFERRED_HIGHER_LEVEL`, errors);
    requireCondition(!requirementIds.has(deferred.id), `${deferred.id}: deferred row also blocks requiredNow`, errors);
    requireCondition(!deferredIds.has(deferred.id), `duplicate deferred id: ${deferred.id}`, errors);
    deferredIds.add(deferred.id);
    for (const candidate of deferred.availableCandidates ?? []) {
      requireCondition(libraryNames.has(candidate), `${deferred.id}: deferred candidate is not in the committed GLB: ${candidate}`, errors);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      requiredNow: (manifest.requiredNow ?? []).length,
      ...coverage,
      deferredHigherLevel: (manifest.deferredHigherLevel ?? []).length,
      candidateLibraryClips: library.names.length,
      libraryBytes: library.bytes.length,
      librarySha256: sha256(library.bytes),
    },
  };
}

const invokedPath = process.argv[1] ? fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`)) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = validateManifest();
  if (!result.ok) {
    for (const error of result.errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result.summary, null, 2));
  }
}
