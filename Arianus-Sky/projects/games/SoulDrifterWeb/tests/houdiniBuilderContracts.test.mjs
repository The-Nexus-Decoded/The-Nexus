import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const builderPath = path.join(root, "scripts", "houdini", "build-breach-v2-apprentice.py");
const builder = fs.readFileSync(builderPath, "utf8");
const layoutDirectory = path.join(root, "public", "data", "dungeons", "breach-v2");

function shippedLayouts() {
  return fs.readdirSync(layoutDirectory)
    .filter((name) => /^layout-.*\.json$/.test(name))
    .map((name) => JSON.parse(fs.readFileSync(path.join(layoutDirectory, name), "utf8")));
}

describe("Houdini Breach V2 builder contracts", () => {
  it("clears the HIP and material cache before creating any scene material", () => {
    const main = builder.slice(builder.indexOf("def main() -> None:"));
    const clearHip = main.indexOf("hou.hipFile.clear(suppress_save_prompt=True)");
    const clearCache = main.indexOf("MATERIALS.clear()");
    const firstMaterial = main.indexOf("textured_material(");

    expect(clearHip).toBeGreaterThan(-1);
    expect(clearCache).toBeGreaterThan(clearHip);
    expect(firstMaterial).toBeGreaterThan(clearCache);
    expect(main).toContain("missing_materials = [path for path in MATERIALS.values() if hou.node(path) is None]");
  });

  it("maps every shipped wall-art placement to an existing approved runtime texture", () => {
    const texturePairs = [...builder.matchAll(/^\s{4}"(art-[^"]+)":\s*"([^"]+\.webp)",$/gm)];
    const textureByAsset = new Map(texturePairs.map((match) => [match[1], match[2]]));
    const placedAssets = new Set(
      shippedLayouts().flatMap((layout) => layout.placements)
        .filter((placement) => placement.role === "wall-art")
        .map((placement) => placement.asset),
    );

    expect(placedAssets.size).toBeGreaterThan(0);
    for (const assetId of placedAssets) {
      const fileName = textureByAsset.get(assetId);
      expect(fileName, `missing canonical texture mapping for ${assetId}`).toBeTruthy();
      expect(fs.existsSync(path.join(root, "public", "assets", "textures", "environment", "breach-v2", "art", fileName))).toBe(true);
    }
    expect(builder).not.toContain("BV2_ArtPlaceholder");
  });

  it("fails closed for unknown readable props and builds multi-part books and scrolls", () => {
    expect(builder).toContain('if p["asset"] == "scrolls-pile":');
    expect(builder).toContain('elif p["asset"] == "books-pile":');
    expect(builder).toContain("No approved readable-prop builder is registered");
    expect(builder).toContain("for scroll_index");
    expect(builder).toContain("for book_index");
    expect(builder).toContain("book_pages_");
  });
});
