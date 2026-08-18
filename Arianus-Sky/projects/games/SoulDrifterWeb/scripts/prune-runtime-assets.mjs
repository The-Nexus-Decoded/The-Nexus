import { access, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = resolve(projectRoot, "scripts/runtime-asset-manifest.json");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);

function normalizeAssetPath(path) {
  const normalized = path.split(sep).join("/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe runtime asset path: ${path}`);
  }
  return normalized;
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

export async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const files = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

export async function loadAssetManifest(path = defaultManifestPath) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (!Number.isSafeInteger(manifest.maxBytes) || manifest.maxBytes <= 0) {
    throw new Error("Runtime asset manifest requires a positive integer maxBytes value.");
  }
  manifest.excludeGlobs.forEach(normalizeAssetPath);
  manifest.protectedPaths.forEach(normalizeAssetPath);
  return manifest;
}

export async function collectPrunableFiles(assetRoot, excludeGlobs) {
  const matchers = excludeGlobs.map(globToRegExp);
  const files = await walkFiles(assetRoot);
  return files.filter((path) => {
    const assetPath = normalizeAssetPath(relative(assetRoot, path));
    return matchers.some((matcher) => matcher.test(assetPath));
  });
}

async function assertProtectedAssets(assetRoot, protectedPaths) {
  const missing = [];
  for (const assetPath of protectedPaths) {
    if (!(await exists(resolve(assetRoot, normalizeAssetPath(assetPath))))) missing.push(assetPath);
  }
  if (missing.length > 0) {
    throw new Error(`Runtime build is missing protected assets:\n${missing.join("\n")}`);
  }
}

async function assertCandidatesAreUnreferenced(assetRoot, candidates) {
  if (candidates.length === 0) return;
  const candidatePaths = new Map(candidates.map((path) => {
    const assetPath = normalizeAssetPath(relative(assetRoot, path));
    return [assetPath, assetPath.split("/").at(-1)];
  }));
  const textFiles = (await walkFiles(assetRoot)).filter((path) => {
    if (candidates.includes(path)) return false;
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    return textExtensions.has(extension);
  });
  const references = [];
  for (const textFile of textFiles) {
    const contents = await readFile(textFile, "utf8");
    for (const [assetPath, fileName] of candidatePaths) {
      if (contents.includes(assetPath) || contents.includes(fileName)) {
        references.push(`${normalizeAssetPath(relative(assetRoot, textFile))} -> ${assetPath}`);
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

export async function pruneAssetRoot(assetRoot, manifest) {
  await assertProtectedAssets(assetRoot, manifest.protectedPaths);
  const candidates = await collectPrunableFiles(assetRoot, manifest.excludeGlobs);
  await assertCandidatesAreUnreferenced(assetRoot, candidates);
  const removedBytes = (await Promise.all(candidates.map(async (path) => (await stat(path)).size)))
    .reduce((total, size) => total + size, 0);
  await Promise.all(candidates.map((path) => rm(path, { force: true })));
  await assertProtectedAssets(assetRoot, manifest.protectedPaths);
  return {
    removedFiles: candidates.length,
    removedBytes,
  };
}

export async function pruneRuntimeAssets(root = projectRoot) {
  const manifest = await loadAssetManifest(resolve(root, "scripts/runtime-asset-manifest.json"));
  const results = [];
  for (const target of manifest.targets) {
    const assetRoot = resolve(root, normalizeAssetPath(target.assetRoot));
    if (!(await exists(assetRoot))) continue;
    const result = await pruneAssetRoot(assetRoot, manifest);
    const budgetRoot = resolve(root, normalizeAssetPath(target.budgetRoot));
    const bytes = await directoryBytes(budgetRoot);
    if (bytes > manifest.maxBytes) {
      throw new Error(`${target.budgetRoot} is ${bytes} bytes, exceeding the ${manifest.maxBytes}-byte runtime budget.`);
    }
    results.push({
      target: target.budgetRoot,
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
