import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertProtectedCollections,
  collectPrunableFiles,
  directoryBytes,
  loadAssetManifest,
  normalizeAssetPath,
  pruneRuntimeAssets,
  resolveRuntimeTarget,
} from "../scripts/prune-runtime-assets.mjs";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

const temporaryRoots = [];

async function writeFixture(root, path, contents = path) {
  const output = resolve(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, contents);
}

async function writeManifest(root, overrides = {}) {
  const manifest = {
    maxBytes: 500_000_000,
    preferredMaxBytes: 475_000_000,
    excludeGlobs: [],
    protectedPaths: [],
    protectedGlobs: [],
    targets: [{ assetRoot: "dist/client", budgetRoot: "dist" }],
    ...overrides,
  };
  await writeFixture(root, "scripts/runtime-asset-manifest.json", JSON.stringify(manifest));
  return manifest;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runtime asset budget", () => {
  it("rejects Windows drives, UNC paths, POSIX absolute paths, and traversal", () => {
    const root = resolve("runtime-target-fixture");
    const unsafePaths = [
      "C:\\outside",
      "C:/outside",
      "C:outside",
      "\\\\server\\share\\outside",
      "//server/share/outside",
      "/tmp/outside",
      "dist/client/../../outside",
      "dist-pages/../outside",
    ];

    for (const assetRoot of unsafePaths) {
      expect(() => resolveRuntimeTarget(root, { assetRoot, budgetRoot: "dist" })).toThrow(/Unsafe runtime asset/);
      expect(() => resolveRuntimeTarget(root, { assetRoot: "dist/client", budgetRoot: assetRoot }))
        .toThrow(/Unsafe runtime asset/);
    }
    expect(() => normalizeAssetPath("..\\outside")).toThrow(/Unsafe runtime asset path/);
  });

  it("accepts only the explicit build roots and their relative subpaths", () => {
    const root = resolve("runtime-target-fixture");

    expect(resolveRuntimeTarget(root, { assetRoot: ".\\dist\\client", budgetRoot: "dist" }))
      .toMatchObject({ normalizedAssetRoot: "dist/client", normalizedBudgetRoot: "dist" });
    expect(resolveRuntimeTarget(root, { assetRoot: "dist/client/assets", budgetRoot: "dist" }))
      .toMatchObject({ normalizedAssetRoot: "dist/client/assets", normalizedBudgetRoot: "dist" });
    expect(resolveRuntimeTarget(root, { assetRoot: "dist-pages", budgetRoot: "dist-pages" }))
      .toMatchObject({ normalizedAssetRoot: "dist-pages", normalizedBudgetRoot: "dist-pages" });
    expect(() => resolveRuntimeTarget(root, { assetRoot: "public", budgetRoot: "public" }))
      .toThrow(/Unsafe runtime asset target/);
    expect(() => resolveRuntimeTarget(root, { assetRoot: "dist/client", budgetRoot: "dist-pages" }))
      .toThrow(/Unsafe runtime asset target/);
  });

  it("keeps QA and production bundles under the permanent 500 MB ceiling", async () => {
    const manifest = await loadAssetManifest();

    expect(manifest.maxBytes).toBe(500_000_000);
    expect(manifest.preferredMaxBytes).toBe(475_000_000);
    expect(manifest.targets).toEqual([
      { assetRoot: "dist/client", budgetRoot: "dist" },
      { assetRoot: "dist-pages", budgetRoot: "dist-pages" },
    ]);
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
      writeFixture(root, "dist/client/assets/generated/human-class-atlas-alpha-v1.png"),
      writeFixture(root, "dist/client/assets/generated/characters/advanced/human-warrior.png"),
      writeFixture(root, "dist/client/assets/generated/first-breach-environment-v1.png"),
      writeFixture(root, "dist/client/index.html", "<main>SoulDrifter</main>"),
    ]);
    await writeManifest(root, {
      excludeGlobs: ["assets/generated/*-class-atlas-*-v1.png", "assets/generated/characters/advanced/**"],
      protectedPaths: ["assets/generated/first-breach-environment-v1.png", "index.html"],
    });

    const [result] = await pruneRuntimeAssets(root);

    expect(result.removedFiles).toBe(2);
    await expect(readFile(resolve(root, "dist/client/assets/generated/human-class-atlas-alpha-v1.png")))
      .rejects.toThrow();
    await expect(readFile(resolve(root, "dist/client/assets/generated/first-breach-environment-v1.png"), "utf8"))
      .resolves.toContain("first-breach");
    expect(await directoryBytes(resolve(root, "dist"))).toBeGreaterThan(0);
  });

  it("protects every catalog GLB and BREACH-V2 data file by exact inventory and SHA-256", async () => {
    const manifest = await loadAssetManifest();
    const publicRoot = resolve(import.meta.dirname, "../public");
    const kit = manifest.protectedGlobs.find(({ id }) => id === "first-breach-dungeon-kit");
    const runtimeData = manifest.protectedGlobs.find(({ id }) => id === "breach-v2-runtime-data");
    const catalogPaths = new Set(Object.values(DUNGEON_PROP_ASSETS).map(
      ({ sourceUrl }) => normalizeAssetPath(sourceUrl.slice(1)),
    ));

    expect(kit.expectedCount).toBe(37);
    expect(Object.keys(kit.sha256).sort()).toEqual([...catalogPaths].sort());
    expect(runtimeData.expectedCount).toBe(10);
    await expect(assertProtectedCollections(
      publicRoot,
      await realpath(publicRoot),
      manifest.protectedGlobs,
    )).resolves.toBeUndefined();
  });

  it("fails closed when a protected collection is missing, gains, or changes bytes", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    temporaryRoots.push(root);
    const assetRoot = resolve(root, "dist/client");
    const firstPath = "assets/3d/environment/dungeon-kit/first.glb";
    const secondPath = "assets/3d/environment/dungeon-kit/second.glb";
    const firstBytes = Buffer.from("first-reviewed-glb");
    const secondBytes = Buffer.from("second-reviewed-glb");
    const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
    await Promise.all([
      writeFixture(root, "dist/client/" + firstPath, firstBytes),
      writeFixture(root, "dist/client/" + secondPath, secondBytes),
    ]);
    await writeManifest(root, {
      protectedGlobs: [{
        id: "fixture-kit",
        glob: "assets/3d/environment/dungeon-kit/*.glb",
        expectedCount: 2,
        sha256: {
          [firstPath]: digest(firstBytes),
          [secondPath]: digest(secondBytes),
        },
      }],
    });

    await expect(pruneRuntimeAssets(root)).resolves.toHaveLength(1);
    await writeFixture(root, "dist/client/" + firstPath, "changed");
    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/SHA-256 drifted/);
    await writeFixture(root, "dist/client/" + firstPath, firstBytes);
    await rm(resolve(assetRoot, secondPath));
    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/inventory drifted/);
    await writeFixture(root, "dist/client/" + secondPath, secondBytes);
    await writeFixture(root, "dist/client/assets/3d/environment/dungeon-kit/unexpected.glb", "extra");
    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/inventory drifted/);
  });

  it("fails closed when a future runtime file references an excluded asset", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    temporaryRoots.push(root);
    await Promise.all([
      writeFixture(root, "dist/client/lore-atlas/assets/P-ARIANUS_painted.png"),
      writeFixture(root, "dist/client/lore-atlas/index.html", '<img src="assets/P-ARIANUS_painted.png">'),
    ]);
    await writeManifest(root, {
      excludeGlobs: ["lore-atlas/assets/P-*_painted.png"],
      protectedPaths: ["lore-atlas/index.html"],
    });

    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/Refusing to prune referenced runtime assets/);
    await expect(readFile(resolve(root, "dist/client/lore-atlas/assets/P-ARIANUS_painted.png")))
      .resolves.toBeTruthy();
  });

  it("validates every manifest target before deleting from an allowed target", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    temporaryRoots.push(root);
    const candidate = "dist/client/assets/generated/human-class-atlas-alpha-v1.png";
    await writeFixture(root, candidate);
    await writeManifest(root, {
      excludeGlobs: ["assets/generated/*-class-atlas-*-v1.png"],
      targets: [
        { assetRoot: "dist/client", budgetRoot: "dist" },
        { assetRoot: "C:\\outside", budgetRoot: "dist" },
      ],
    });

    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/Unsafe runtime asset path/);
    await expect(readFile(resolve(root, candidate))).resolves.toBeTruthy();
  });

  it("fails closed on symlink or junction traversal without deleting the external file", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-"));
    const outside = await mkdtemp(resolve(tmpdir(), "souldrifter-assets-outside-"));
    temporaryRoots.push(root, outside);
    const externalFile = resolve(outside, "human-class-atlas-alpha-v1.png");
    const linkPath = resolve(root, "dist/client/assets/generated/escape");
    await Promise.all([
      writeFile(externalFile, "must survive"),
      writeManifest(root, { excludeGlobs: ["assets/generated/**"] }),
      mkdir(dirname(linkPath), { recursive: true }),
    ]);
    try {
      await symlink(outside, linkPath, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EACCES", "EPERM", "UNKNOWN"].includes(error.code)) return;
      throw error;
    }

    await expect(pruneRuntimeAssets(root)).rejects.toThrow(/Unsafe runtime asset link/);
    await expect(readFile(externalFile, "utf8")).resolves.toBe("must survive");
  });
});
