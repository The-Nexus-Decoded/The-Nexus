import { access, lstat, readFile, readdir, realpath, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve, win32 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = resolve(projectRoot, "scripts/runtime-asset-manifest.json");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);
const allowedBuildTargets = [
  { assetRoot: "dist/client", budgetRoot: "dist" },
  { assetRoot: "dist-pages", budgetRoot: "dist-pages" },
];

export function normalizeAssetPath(assetPath) {
  if (typeof assetPath !== "string" || assetPath.includes("\0")) {
    throw new Error(`Unsafe runtime asset path: ${String(assetPath)}`);
  }
  if (isAbsolute(assetPath) || win32.isAbsolute(assetPath) || /^[A-Za-z]:/.test(assetPath)) {
    throw new Error(`Unsafe runtime asset path: ${assetPath}`);
  }
  const normalized = assetPath.replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
  const segments = normalized.split("/");
  if (!normalized || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Unsafe runtime asset path: ${assetPath}`);
  }
  return normalized;
}

function isContained(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..\\")
    && !pathFromRoot.startsWith("../")
    && pathFromRoot !== ".."
    && !isAbsolute(pathFromRoot)
    && !win32.isAbsolute(pathFromRoot));
}

function assertContained(root, candidate, label) {
  if (!isContained(root, candidate)) {
    throw new Error(`Unsafe runtime asset ${label}: ${candidate} escapes ${root}`);
  }
}

export function resolveRuntimeTarget(root, target) {
  if (!target || typeof target !== "object") {
    throw new Error("Runtime asset manifest target must be an object.");
  }
  const normalizedAssetRoot = normalizeAssetPath(target.assetRoot);
  const normalizedBudgetRoot = normalizeAssetPath(target.budgetRoot);
  const allowedTarget = allowedBuildTargets.find(({ assetRoot }) => (
    normalizedAssetRoot === assetRoot || normalizedAssetRoot.startsWith(`${assetRoot}/`)
  ));
  if (!allowedTarget || normalizedBudgetRoot !== allowedTarget.budgetRoot) {
    throw new Error(
      `Unsafe runtime asset target: ${normalizedAssetRoot} with budget root ${normalizedBudgetRoot}`,
    );
  }

  const resolvedProjectRoot = resolve(root);
  const allowedAssetRoot = resolve(resolvedProjectRoot, allowedTarget.assetRoot);
  const assetRoot = resolve(resolvedProjectRoot, normalizedAssetRoot);
  const budgetRoot = resolve(resolvedProjectRoot, normalizedBudgetRoot);
  assertContained(allowedAssetRoot, assetRoot, "target");
  assertContained(resolvedProjectRoot, allowedAssetRoot, "allowed root");
  assertContained(resolvedProjectRoot, budgetRoot, "budget root");
  return {
    assetRoot,
    allowedAssetRoot,
    budgetRoot,
    normalizedAssetRoot,
    normalizedBudgetRoot,
  };
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function globToRegExp(glob) {
  const normalized = normalizeAssetPath(glob);
  let expression = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character !== "*") {
      expression += escapeRegExp(character);
      continue;
    }
    if (normalized[index + 1] === "*") {
      expression += ".*";
      index += 1;
    } else {
      expression += "[^/]*";
    }
  }
  return new RegExp(`^${expression}$`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertExistingPathContained(root, candidate, label) {
  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)]);
  assertContained(realRoot, realCandidate, label);
  return { realRoot, realCandidate };
}

export async function validateRuntimeTarget(root, target) {
  const resolvedTarget = resolveRuntimeTarget(root, target);
  const realProjectRoot = await realpath(resolve(root));
  if (await exists(resolvedTarget.budgetRoot)) {
    const realBudgetRoot = await realpath(resolvedTarget.budgetRoot);
    assertContained(realProjectRoot, realBudgetRoot, "budget root");
  }
  if (!(await exists(resolvedTarget.assetRoot))) {
    return { ...resolvedTarget, exists: false };
  }
  const realAllowedAssetRoot = await realpath(resolvedTarget.allowedAssetRoot);
  const realAssetRoot = await realpath(resolvedTarget.assetRoot);
  assertContained(realProjectRoot, realAllowedAssetRoot, "allowed root");
  assertContained(realAllowedAssetRoot, realAssetRoot, "target");
  return { ...resolvedTarget, exists: true, realAllowedAssetRoot, realAssetRoot };
}

async function walkContainedFiles(root, realContainmentRoot) {
  await assertExistingPathContained(realContainmentRoot, root, "walk root");
  const files = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Unsafe runtime asset link: ${entryPath}`);
    }
    const { realCandidate } = await assertExistingPathContained(
      realContainmentRoot,
      entryPath,
      "walk candidate",
    );
    if (entry.isDirectory()) files.push(...await walkContainedFiles(entryPath, realContainmentRoot));
    else if (entry.isFile()) files.push(realCandidate);
  }
  return files;
}

export async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const realRoot = await realpath(root);
  return walkContainedFiles(root, realRoot);
}

export async function loadAssetManifest(path = defaultManifestPath) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (!Number.isSafeInteger(manifest.maxBytes) || manifest.maxBytes <= 0) {
    throw new Error("Runtime asset manifest requires a positive integer maxBytes value.");
  }
  if (!Array.isArray(manifest.excludeGlobs)
    || !Array.isArray(manifest.protectedPaths)
    || !Array.isArray(manifest.protectedGlobs)
    || !Array.isArray(manifest.targets)) {
    throw new Error("Runtime asset manifest requires path, glob, and target arrays.");
  }
  manifest.excludeGlobs.forEach(normalizeAssetPath);
  manifest.protectedPaths.forEach(normalizeAssetPath);
  const collectionIds = new Set();
  for (const collection of manifest.protectedGlobs) {
    if (!collection || typeof collection !== "object"
      || typeof collection.id !== "string" || !collection.id
      || collectionIds.has(collection.id)
      || !Number.isSafeInteger(collection.expectedCount) || collection.expectedCount <= 0
      || !collection.sha256 || typeof collection.sha256 !== "object"
      || Array.isArray(collection.sha256)) {
      throw new Error("Runtime asset manifest has an invalid protected glob collection.");
    }
    collectionIds.add(collection.id);
    const matcher = globToRegExp(collection.glob);
    const hashes = Object.entries(collection.sha256);
    if (hashes.length !== collection.expectedCount) {
      throw new Error(`Protected collection ${collection.id} hash count does not match expectedCount.`);
    }
    for (const [assetPath, hash] of hashes) {
      const normalizedPath = normalizeAssetPath(assetPath);
      if (!matcher.test(normalizedPath) || !/^[0-9a-f]{64}$/.test(hash)) {
        throw new Error(`Protected collection ${collection.id} has an invalid path or SHA-256.`);
      }
    }
  }
  return manifest;
}

export async function collectPrunableFiles(assetRoot, excludeGlobs) {
  const realAssetRoot = await realpath(assetRoot);
  const matchers = excludeGlobs.map(globToRegExp);
  const files = await walkContainedFiles(assetRoot, realAssetRoot);
  return files.filter((path) => {
    const assetPath = normalizeAssetPath(relative(realAssetRoot, path));
    return matchers.some((matcher) => matcher.test(assetPath));
  });
}

async function resolveProtectedAsset(assetRoot, realAssetRoot, assetPath) {
  const candidate = resolve(assetRoot, normalizeAssetPath(assetPath));
  assertContained(assetRoot, candidate, "protected path");
  if (!(await exists(candidate))) return null;
  const { realCandidate } = await assertExistingPathContained(realAssetRoot, candidate, "protected path");
  return realCandidate;
}

async function assertProtectedAssets(assetRoot, realAssetRoot, protectedPaths) {
  const missing = [];
  for (const assetPath of protectedPaths) {
    if (!(await resolveProtectedAsset(assetRoot, realAssetRoot, assetPath))) missing.push(assetPath);
  }
  if (missing.length > 0) {
    throw new Error(`Runtime build is missing protected assets:\n${missing.join("\n")}`);
  }
}

async function assertCandidatesAreUnreferenced(assetRoot, realAssetRoot, candidates) {
  if (candidates.length === 0) return;
  const candidatePaths = new Map(candidates.map((path) => {
    const assetPath = normalizeAssetPath(relative(realAssetRoot, path));
    return [assetPath, assetPath.split(/[\\/]/).at(-1)];
  }));
  const textFiles = (await walkContainedFiles(assetRoot, realAssetRoot)).filter((path) => {
    if (candidates.includes(path)) return false;
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    return textExtensions.has(extension);
  });
  const references = [];
  for (const textFile of textFiles) {
    const contents = await readFile(textFile, "utf8");
    for (const [assetPath, fileName] of candidatePaths) {
      if (contents.includes(assetPath) || contents.includes(fileName)) {
        references.push(`${normalizeAssetPath(relative(realAssetRoot, textFile))} -> ${assetPath}`);
      }
    }
  }
  if (references.length > 0) {
    throw new Error(`Refusing to prune referenced runtime assets:\n${references.join("\n")}`);
  }
}

export async function directoryBytes(root) {
  const sizes = await Promise.all((await walkFiles(root)).map(async (path) => (await stat(path)).size));
  return sizes.reduce((total, size) => total + size, 0);
}

async function assertCandidateSafeForRemoval(realAssetRoot, candidate) {
  const metadata = await lstat(candidate);
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new Error(`Unsafe runtime asset removal candidate: ${candidate}`);
  }
  const { realCandidate } = await assertExistingPathContained(realAssetRoot, candidate, "removal candidate");
  return realCandidate;
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function assertProtectedCollections(assetRoot, realAssetRoot, protectedGlobs) {
  const files = await walkContainedFiles(assetRoot, realAssetRoot);
  const filesByPath = new Map(files.map((path) => [
    normalizeAssetPath(relative(realAssetRoot, path)),
    path,
  ]));
  for (const collection of protectedGlobs) {
    const matcher = globToRegExp(collection.glob);
    const matchedPaths = [...filesByPath.keys()].filter((path) => matcher.test(path)).sort();
    const expectedPaths = Object.keys(collection.sha256).map(normalizeAssetPath).sort();
    if (matchedPaths.length !== collection.expectedCount
      || expectedPaths.length !== collection.expectedCount
      || matchedPaths.some((path, index) => path !== expectedPaths[index])) {
      throw new Error(
        `Runtime build protected collection ${collection.id} inventory drifted: `
        + `expected ${collection.expectedCount}, found ${matchedPaths.length}.`,
      );
    }
    for (const assetPath of expectedPaths) {
      const actualHash = await sha256(filesByPath.get(assetPath));
      if (actualHash !== collection.sha256[assetPath]) {
        throw new Error(`Runtime build protected collection ${collection.id} SHA-256 drifted: ${assetPath}`);
      }
    }
  }
}

async function pruneAssetRoot(assetRoot, realAssetRoot, manifest) {
  await assertProtectedAssets(assetRoot, realAssetRoot, manifest.protectedPaths);
  await assertProtectedCollections(assetRoot, realAssetRoot, manifest.protectedGlobs);
  const candidates = await collectPrunableFiles(assetRoot, manifest.excludeGlobs);
  await assertCandidatesAreUnreferenced(assetRoot, realAssetRoot, candidates);
  const verifiedCandidates = await Promise.all(
    candidates.map((candidate) => assertCandidateSafeForRemoval(realAssetRoot, candidate)),
  );
  const removedBytes = (await Promise.all(verifiedCandidates.map(async (path) => (await stat(path)).size)))
    .reduce((total, size) => total + size, 0);
  await Promise.all(verifiedCandidates.map((path) => rm(path, { force: true })));
  await assertProtectedAssets(assetRoot, realAssetRoot, manifest.protectedPaths);
  await assertProtectedCollections(assetRoot, realAssetRoot, manifest.protectedGlobs);
  return {
    removedFiles: verifiedCandidates.length,
    removedBytes,
  };
}

export async function pruneRuntimeAssets(root = projectRoot) {
  const manifest = await loadAssetManifest(resolve(root, "scripts/runtime-asset-manifest.json"));
  const targets = await Promise.all(manifest.targets.map((target) => validateRuntimeTarget(root, target)));
  const results = [];
  for (const [index, target] of targets.entries()) {
    if (!target.exists) continue;
    const result = await pruneAssetRoot(target.assetRoot, target.realAssetRoot, manifest);
    const bytes = await directoryBytes(target.budgetRoot);
    if (bytes > manifest.maxBytes) {
      throw new Error(
        `${manifest.targets[index].budgetRoot} is ${bytes} bytes, exceeding the permanent ${manifest.maxBytes}-byte QA/production ceiling.`,
      );
    }
    results.push({
      target: target.normalizedBudgetRoot,
      bytes,
      preferredBudgetMet: bytes <= manifest.preferredMaxBytes,
      ...result,
    });
  }
  if (results.length === 0) throw new Error("No runtime build targets were found to prune.");
  return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const results = await pruneRuntimeAssets();
  process.stdout.write(`${JSON.stringify({ ok: true, results }, null, 2)}\n`);
}
