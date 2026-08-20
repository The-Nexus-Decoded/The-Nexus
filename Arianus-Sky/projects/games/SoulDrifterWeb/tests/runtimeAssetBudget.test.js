import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectPrunableFiles,
  directoryBytes,
  isRuntimeHardBudgetEnforced,
  loadAssetManifest,
  pruneAssetRoot,
} from "../scripts/prune-runtime-assets.mjs";

const temporaryRoots = [];

async function writeFixture(root, path, contents = path) {
  const output = resolve(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, contents);
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runtime asset budget", () => {
  it("reports size without enforcing the 150 MB hard cap for QA builds only", () => {
    expect(isRuntimeHardBudgetEnforced({ GITHUB_REF_NAME: "qa" })).toBe(false);
    expect(isRuntimeHardBudgetEnforced({ GITHUB_BASE_REF: "qa" })).toBe(false);
    expect(isRuntimeHardBudgetEnforced({ SOULDRIFTER_RELEASE_CHANNEL: "qa" })).toBe(false);
    expect(isRuntimeHardBudgetEnforced({ GITHUB_REF_NAME: "main" })).toBe(true);
    expect(isRuntimeHardBudgetEnforced({})).toBe(true);
  });

  it("identifies only build-time source art in the real public asset tree", async () => {
    const manifest = await loadAssetManifest();
    const publicRoot = resolve(import.meta.dirname, "../public");
    const candidates = (await collectPrunableFiles(publicRoot, manifest.excludeGlobs))
      .map((path) => path.replaceAll("\\", "/"));
    const removableBytes = await Promise.all(candidates.map(async (path) => (await readFile(path)).byteLength));

    expect(candidates.some((path) => path.endsWith("/P-ARIANUS_painted.png"))).toBe(true);
    expect(candidates.some((path) => path.endsWith("/human-class-atlas-alpha-v1.png"))).toBe(true);
    expect(candidates.some((path) => path.endsWith("/characters/advanced/human-warrior.png"))).toBe(true);
    expect(candidates.some((path) => path.endsWith("/first-breach-environment-v1.png"))).toBe(false);
    expect(candidates.some((path) => path.endsWith("/maps/arianus_painted.png"))).toBe(false);
    expect(removableBytes.reduce((total, size) => total + size, 0)).toBeGreaterThan(70 * 1024 * 1024);
  });

  it("prunes matching unreferenced files while preserving required runtime assets", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    temporaryRoots.push(root);
    await Promise.all([
      writeFixture(root, "assets/generated/human-class-atlas-alpha-v1.png"),
      writeFixture(root, "assets/generated/characters/advanced/human-warrior.png"),
      writeFixture(root, "assets/generated/first-breach-environment-v1.png"),
      writeFixture(root, "index.html", "<main>SoulDrifter</main>"),
    ]);
    const manifest = {
      excludeGlobs: ["assets/generated/*-class-atlas-*-v1.png", "assets/generated/characters/advanced/**"],
      protectedPaths: ["assets/generated/first-breach-environment-v1.png", "index.html"],
    };

    const result = await pruneAssetRoot(root, manifest);

    expect(result.removedFiles).toBe(2);
    await expect(readFile(resolve(root, "assets/generated/human-class-atlas-alpha-v1.png"))).rejects.toThrow();
    await expect(readFile(resolve(root, "assets/generated/first-breach-environment-v1.png"), "utf8"))
      .resolves.toContain("first-breach");
    expect(await directoryBytes(root)).toBeGreaterThan(0);
  });

  it("fails closed when a future runtime file references an excluded asset", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    temporaryRoots.push(root);
    await Promise.all([
      writeFixture(root, "lore-atlas/assets/P-ARIANUS_painted.png"),
      writeFixture(root, "lore-atlas/index.html", '<img src="assets/P-ARIANUS_painted.png">'),
    ]);
    const manifest = {
      excludeGlobs: ["lore-atlas/assets/P-*_painted.png"],
      protectedPaths: ["lore-atlas/index.html"],
    };

    await expect(pruneAssetRoot(root, manifest)).rejects.toThrow(/Refusing to prune referenced runtime assets/);
    await expect(readFile(resolve(root, "lore-atlas/assets/P-ARIANUS_painted.png"))).resolves.toBeTruthy();
  });
});
