import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generator = join(projectRoot, "scripts/maps/make_breach_v2_wallart.py");
const sourceAtlas = join(projectRoot, "public/lore-atlas/assets/M-003_painted_atlas.png");
const python = process.env.PYTHON || "python";
const tempRoots = [];

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "breach-v2-wallart-"));
  tempRoots.push(root);
  const fonts = join(root, "public/assets/fonts");
  const atlasDir = join(root, "public/lore-atlas/assets");
  const artDir = join(root, "public/assets/textures/environment/breach-v2/art");
  await Promise.all([mkdir(fonts, { recursive: true }), mkdir(atlasDir, { recursive: true }), mkdir(artDir, { recursive: true })]);
  await Promise.all([
    copyFile(join(projectRoot, "public/assets/fonts/Alegreya-Variable.ttf"), join(fonts, "Alegreya-Variable.ttf")),
    copyFile(join(projectRoot, "public/assets/fonts/Cinzel-Variable.ttf"), join(fonts, "Cinzel-Variable.ttf")),
    copyFile(sourceAtlas, join(atlasDir, "M-003_painted_atlas.png")),
  ]);
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "souldrifter-web" }), "utf8");
  await writeFile(join(root, "third-party-assets.json"), JSON.stringify({
    schemaVersion: 1,
    shippingAssets: [
      { id: "breach-v2-wall-art-art-map-thalenyr-scroll", sha256: "stale" },
      { id: "unrelated-approved-art", sha256: "preserve-me" },
    ],
  }, null, 2), "utf8");
  await writeFile(join(artDir, "art-banner-ashen.webp"), "approved-production-bytes", "utf8");
  return { root, atlas: join(atlasDir, "M-003_painted_atlas.png"), artDir };
}

function run(root, atlas, mode = "scroll", extra = []) {
  return spawnSync(python, [generator, "--game-root", root, "--atlas", atlas, "--mode", mode, ...extra], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("BREACH-V2 wall-art generator", () => {
  it("produces identical scroll bytes in separate Python processes and preserves non-requested art", async () => {
    const first = await fixtureRoot();
    const second = await fixtureRoot();
    const firstRun = run(first.root, first.atlas);
    const secondRun = run(second.root, second.atlas);
    expect(firstRun.status, firstRun.stderr).toBe(0);
    expect(secondRun.status, secondRun.stderr).toBe(0);

    const [firstBytes, secondBytes, preserved, firstManifest, secondManifest] = await Promise.all([
      readFile(join(first.artDir, "art-map-thalenyr-scroll.webp")),
      readFile(join(second.artDir, "art-map-thalenyr-scroll.webp")),
      readFile(join(first.artDir, "art-banner-ashen.webp"), "utf8"),
      readFile(join(first.root, "third-party-assets.json"), "utf8"),
      readFile(join(second.root, "third-party-assets.json"), "utf8"),
    ]);
    expect(firstBytes.equals(secondBytes)).toBe(true);
    expect(firstManifest).toBe(secondManifest);
    expect(preserved).toBe("approved-production-bytes");
    expect(JSON.parse(firstManifest).shippingAssets).toContainEqual({
      id: "unrelated-approved-art",
      sha256: "preserve-me",
    });
  });

  it("rejects an atlas whose bytes do not match the pinned source before promotion", async () => {
    const fixture = await fixtureRoot();
    await writeFile(fixture.atlas, "not-the-approved-atlas", "utf8");
    const result = run(fixture.root, fixture.atlas);
    expect(result.status).not.toBe(0);
    await expect(readFile(join(fixture.artDir, "art-map-thalenyr-scroll.webp"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("requires an explicit destructive acknowledgement for the legacy all-art mode", async () => {
    const fixture = await fixtureRoot();
    const result = run(fixture.root, fixture.atlas, "legacy-all");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--acknowledge-placeholder-overwrite");
  });
});
