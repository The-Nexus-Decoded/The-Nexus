/**
 * BREACH-V2 runtime export fixtures (runbook §5.4, issue #451).
 * The committed fixtures must match live generation exactly.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

const OUT_DIR = resolve("public/data/dungeons/breach-v2");
const readJson = (file) => JSON.parse(readFileSync(resolve(OUT_DIR, file), "utf8"));

describe("BREACH-V2 runtime exports", () => {
  it("committed fixtures match live generation byte-for-byte", () => {
    const index = readJson("index.json");
    for (const fixture of index.fixtures) {
      const live = buildBreachV2Layout(fixture.seed, fixture.path, DUNGEON_PROP_ASSETS);
      const committed = readJson(fixture.file);
      expect(committed, fixture.file).toEqual(JSON.parse(JSON.stringify(live)));
    }
  });

  it("fixture set pins comparison/sparse/median/dense per path", () => {
    const index = readJson("index.json");
    const labels = new Set(index.fixtures.map((f) => `${f.label}:${f.path}`));
    for (const label of ["comparison", "sparse-3ch", "median-4ch", "dense-5ch"]) {
      for (const path of ["wayfarer", "oathbreaker"]) {
        expect(labels.has(`${label}:${path}`), `${label}:${path}`).toBe(true);
      }
    }
    for (const f of index.fixtures) {
      const expected = { "sparse-3ch": 3, "median-4ch": 4, "dense-5ch": 5 }[f.label];
      if (expected) expect(f.chambers, f.file).toBe(expected);
      if (f.label === "comparison") expect(f.seed).toBe(4182);
    }
  });

  it("registry.json matches the registry module", () => {
    const registry = readJson("registry.json");
    expect(registry.id).toBe("breach-v2");
    expect(registry.fixedRooms).toHaveLength(8);
    expect(registry.pools.easy).toHaveLength(7);
    expect(registry.pools.hard).toHaveLength(7);
  });

  it("layout placements carry runtime GLB URLs for kit assets only", () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    for (const p of layout.placements) {
      if (DUNGEON_PROP_ASSETS[p.asset]) {
        expect(p.glbRuntime, p.asset).toMatch(/^\/assets\/3d\/environment\/dungeon-kit\/.+\.glb$/);
      } else {
        expect(p.glbRuntime, p.asset).toBeNull();
      }
    }
    expect(layout.lights.some((l) => l.id === "soul-well-glow")).toBe(true);
    expect(layout.lights.some((l) => l.id === "exit-daylight")).toBe(true);
    expect(layout.lights.filter((l) => l.id.startsWith("fire-")).length).toBeGreaterThan(10);
  });
});
