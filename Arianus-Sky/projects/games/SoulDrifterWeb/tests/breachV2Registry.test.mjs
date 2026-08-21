/**
 * BREACH-V2 registry consistency (runbook §3 + ticket §6, issue #451).
 * Validates the registry derived measured-only from the flat map:
 * docs/maps/breach-v2/breach-v2-flatmap-1600.webp
 */
import { describe, expect, it } from "vitest";
import { BREACH_V2_REGISTRY as R } from "../src/game/dungeons/breach-v2-registry.mjs";
import { DUNGEON_PROP_ASSETS, DUNGEON_PROP_ASSET_IDS } from "../src/game/environment/DungeonPropCatalog";

const fixedById = Object.fromEntries(R.fixedRooms.map((r) => [r.id, r]));
const pools = R.pools;
const allPoolRooms = [...pools.easy, ...pools.hard];

function doorSockets(room) {
  // pool rooms carry explicit sockets; fixed rooms use landmark doors
  return room.doors ?? [];
}

describe("BREACH-V2 registry (flat-map derived)", () => {
  it("carries the fixed spine in order with true meter dims", () => {
    expect(R.fixedRooms.map((r) => r.id)).toEqual([
      "vestibule", "plaza-link", "threshold-plaza", "convergence",
      "ashen-threshold", "ashen-lock", "memory-vault", "exit-connector",
    ]);
    expect(fixedById.vestibule.w).toBe(30);
    expect(fixedById.vestibule.h).toBe(22);
    expect(fixedById["ashen-lock"].w).toBe(30);
    expect(fixedById["ashen-lock"].h).toBe(22);
    // spine adjacency: vestibule -> link -> plaza are x-contiguous
    expect(fixedById["plaza-link"].x).toBe(fixedById.vestibule.x + fixedById.vestibule.w);
    expect(fixedById["threshold-plaza"].x).toBe(fixedById["plaza-link"].x + fixedById["plaza-link"].w);
    // exit connector is the east end and names the Heartvale hv-1 anchor
    expect(R.worldAnchor.x).toBe(5437.5);
    expect(R.worldAnchor.z).toBe(2648.4);
    expect(R.worldAnchor.zone).toContain("hv-1");
  });

  it("has the canon Vestibule landmarks incl. the small silvery Soul Well (V14)", () => {
    const ids = R.landmarks.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining([
      "soul-well", "player-emergence", "ilyra", "memory-loom", "coffer", "effigy",
      "orren", "brannoc", "door-wayfarer", "door-oathbreaker",
    ]));
    const well = R.landmarks.find((l) => l.id === "soul-well");
    expect(well.roomId).toBe("vestibule");
    expect(well.r).toBeLessThanOrEqual(2); // small pool, not a lake
    const v = fixedById.vestibule;
    for (const lm of R.landmarks.filter((l) => l.roomId === "vestibule")) {
      expect(lm.x).toBeGreaterThanOrEqual(0);
      expect(lm.x).toBeLessThanOrEqual(v.w);
      expect(lm.y).toBeGreaterThanOrEqual(0);
      expect(lm.y).toBeLessThanOrEqual(v.h);
    }
  });

  it("two physically distinct trial doors on the plaza east wall", () => {
    const w = R.landmarks.find((l) => l.id === "door-wayfarer");
    const o = R.landmarks.find((l) => l.id === "door-oathbreaker");
    expect(w.roomId).toBe("threshold-plaza");
    expect(o.roomId).toBe("threshold-plaza");
    const plaza = fixedById["threshold-plaza"];
    expect(w.x).toBe(plaza.w); // both on the east wall (room-local meters)
    expect(o.x).toBe(plaza.w);
    expect(Math.abs(w.y - o.y)).toBeGreaterThanOrEqual(5); // physically separate
    // plaza hosts Orren + Brannoc before the choice
    for (const npc of ["orren", "brannoc"]) {
      const lm = R.landmarks.find((l) => l.id === npc);
      expect(lm.x).toBeGreaterThan(0);
      expect(lm.x).toBeLessThan(plaza.w);
    }
  });

  it("pools: 7 easy + 7 hard rooms, disjoint, true dims, sockets legal", () => {
    expect(pools.easy).toHaveLength(7);
    expect(pools.hard).toHaveLength(7);
    const easyIds = new Set(pools.easy.map((r) => r.id));
    const hardIds = new Set(pools.hard.map((r) => r.id));
    expect([...easyIds].every((id) => id.startsWith("E-"))).toBe(true);
    expect([...hardIds].every((id) => id.startsWith("H-"))).toBe(true);
    expect([...easyIds].filter((id) => hardIds.has(id))).toEqual([]); // pool separation
    for (const room of allPoolRooms) {
      expect(room.w).toBeGreaterThanOrEqual(9); // combat-viable minimums
      expect(room.h).toBeGreaterThanOrEqual(9);
      expect(room.w * room.h).toBeLessThanOrEqual(300); // gallery, not arena
      const sides = doorSockets(room).map((d) => d.side);
      expect(sides).toContain("W");
      expect(sides).toContain("E");
      expect(room.spawnSockets.length).toBeGreaterThanOrEqual(1);
      // hard pool is tighter than easy on average
    }
    const area = (rs) => rs.reduce((s, r) => s + r.w * r.h, 0) / rs.length;
    expect(area(pools.hard)).toBeLessThan(area(pools.easy));
  });

  it("every combat chamber carries a storage-chest loot cache", () => {
    for (const room of allPoolRooms) {
      const chests = room.placements.filter((p) => p.role === "loot-cache");
      expect(chests.length, room.id).toBeGreaterThanOrEqual(1);
      for (const c of chests) expect(c.asset).toBe("storage-chest");
    }
  });

  it("mounts flame-anchored sconces on both opposing walls in every room", () => {
    for (const room of [...R.fixedRooms, ...allPoolRooms]) {
      const sconces = room.placements.filter((p) => p.asset === "wall-torch-sconce");
      expect(sconces.some((p) => p.facing === "south"), `${room.id}: north-wall sconce`).toBe(true);
      expect(sconces.some((p) => p.facing === "north"), `${room.id}: south-wall sconce`).toBe(true);
    }
  });

  it("placement records carry the §6 minimum metadata and stay in bounds", () => {
    const rooms = [
      ...R.fixedRooms.map((r) => ({ ...r, sockets: [] })),
      ...allPoolRooms,
    ];
    for (const room of rooms) {
      const sockets = (room.doors ?? []).map((d) => ({ x: d.x, y: d.y }));
      const spawns = room.spawnSockets ?? [];
      for (const p of room.placements) {
        expect(p.asset).toBeTruthy();
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(room.w);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(room.h);
        expect(["floor", "wall", "ceiling"]).toContain(p.placement);
        expect(p.facing).toBeTruthy();
        expect(typeof p.blocking).toBe("boolean");
        expect(p.role).toBeTruthy();
        // wall art is named and zoom-sized (Add-on A)
        if (p.role === "wall-art") {
          expect(p.asset).toMatch(/^art-/);
          expect(p.width).toBeGreaterThanOrEqual(1.4);
        }
        // blocking props never sit on door or spawn sockets (min clearance 1.2 m)
        if (p.blocking) {
          for (const s of [...sockets, ...spawns]) {
            const d = Math.hypot(p.x - s.x, p.y - s.y);
            expect(d, `${room.id}:${p.asset}@${p.x},${p.y} vs socket`).toBeGreaterThanOrEqual(1.2);
          }
        }
      }
    }
  });

  it("places all 38 dungeon-kit assets somewhere in the zone", () => {
    const used = new Set();
    for (const room of [...R.fixedRooms, ...allPoolRooms]) {
      for (const p of room.placements) used.add(p.asset);
    }
    const missing = DUNGEON_PROP_ASSET_IDS.filter((id) => !used.has(id));
    expect(missing).toEqual([]);
  });

  it("registry footprint/height mirror the prop catalog 1:1 (§6 metadata)", () => {
    for (const room of [...R.fixedRooms, ...allPoolRooms]) {
      for (const p of room.placements) {
        const spec = DUNGEON_PROP_ASSETS[p.asset];
        if (!spec) continue; // custom props (books/scrolls, wall art) are not kit assets
        expect(p.footprint, `${room.id}:${p.asset} footprint`).toBeCloseTo(spec.maxFootprint, 6);
        expect(p.height, `${room.id}:${p.asset} height`).toBeCloseTo(spec.targetHeight, 6);
      }
    }
  });

  it("boss set: exactly one Cinderbound Warden per run, 3 anchor sockets", () => {
    expect(R.bossSet.perRun).toBe(1);
    expect(R.bossSet.bosses).toHaveLength(1);
    expect(R.bossSet.bosses[0].id).toBe("cinderbound-warden");
    expect(R.bossSet.bosses[0].patterns).toEqual(["cinder-sweep", "ash-call", "soul-tax"]);
    expect(R.bossSet.anchorSockets).toHaveLength(3); // future boss-set ready
  });

  it("paths: 3-5 chambers, own pools, distinct corridor widths, convergence", () => {
    for (const key of ["wayfarer", "oathbreaker"]) {
      expect(R.paths[key].minChambers).toBe(3);
      expect(R.paths[key].maxChambers).toBe(5);
      expect(R.paths[key].slotCenters).toHaveLength(5);
    }
    expect(R.paths.wayfarer.pool).toBe("easy");
    expect(R.paths.oathbreaker.pool).toBe("hard");
    expect(R.paths.wayfarer.corridorWidthMeters).toBeGreaterThan(R.paths.oathbreaker.corridorWidthMeters);
  });

  it("spawn table matches canon presets (3 light vs 5 scaled)", () => {
    expect(R.tables.spawn.wayfarer.enemyCount).toBe(3);
    expect(R.tables.spawn.wayfarer.healthMult).toBe(1);
    expect(R.tables.spawn.oathbreaker.enemyCount).toBe(5);
    expect(R.tables.spawn.oathbreaker.healthMult).toBeCloseTo(1.55);
    expect(R.tables.spawn.oathbreaker.damageMult).toBeCloseTo(1.22);
    expect(R.tables.spawn.wayfarer.galleryPressureBase).toBe(34);
    expect(R.tables.spawn.oathbreaker.bossPressureBase).toBe(84);
  });

  it("wall art: Vestibule carries lore art and excludes developer planning sheets", () => {
    const vestibuleArt = fixedById.vestibule.placements.filter((p) => p.role === "wall-art");
    const artIds = vestibuleArt.map((p) => p.asset);
    expect(artIds).toContain("art-thalenyr-atlas"); // the readable world map
    expect(artIds).toContain("art-painting-reliquary");
    expect(artIds).not.toContain("art-heartvale-section");
    expect(artIds).not.toContain("art-breach-v2-flatmap");
    const allArtIds = [...R.fixedRooms, ...allPoolRooms]
      .flatMap((room) => room.placements)
      .filter((p) => p.role === "wall-art")
      .map((p) => p.asset);
    expect(allArtIds).not.toContain("art-heartvale-section");
    expect(allArtIds).not.toContain("art-breach-v2-flatmap");
    const atlas = vestibuleArt.find((p) => p.asset === "art-thalenyr-atlas");
    expect(atlas.width).toBeGreaterThanOrEqual(2); // >= 2 m wide for readability
    // Route banners identify both choices without occupying either portal.
    const plazaArt = fixedById["threshold-plaza"].placements.filter((p) => p.role === "wall-art");
    const w = R.landmarks.find((l) => l.id === "door-wayfarer");
    const o = R.landmarks.find((l) => l.id === "door-oathbreaker");
    const plaza = fixedById["threshold-plaza"];
    const bannerW = plazaArt.find((p) => p.asset === "art-banner-wayfarer");
    const bannerO = plazaArt.find((p) => p.asset === "art-banner-oathbreaker");
    expect(Math.hypot(bannerW.x - (w.x - plaza.x), bannerW.y - (w.y - plaza.y))).toBeGreaterThan(2.5);
    expect(Math.hypot(bannerO.x - (o.x - plaza.x), bannerO.y - (o.y - plaza.y))).toBeGreaterThan(2.5);
    // books/scrolls in Vestibule + Fallen Archive
    expect(fixedById.vestibule.placements.some((p) => p.group === "books")).toBe(true);
    const e07 = pools.easy.find((r) => r.id === "E-07");
    expect(e07.placements.filter((p) => p.group === "books").length).toBeGreaterThanOrEqual(2);
  });

  it("corruption gradient: cleanest Vestibule, densest Ashen Lock", () => {
    const level = Object.fromEntries(R.corruption.map((c) => [c.area, c.level]));
    expect(level["Vestibule"]).toBeLessThan(level["Threshold Plaza"]);
    expect(level["Threshold Plaza"]).toBeLessThan(level["Wayfarer path"]);
    expect(level["Wayfarer path"]).toBeLessThan(level["Oathbreaker path"]);
    expect(level["Oathbreaker path"]).toBeLessThan(level["Convergence"]);
    expect(level["Ashen Lock"]).toBe(1.0);
  });

  it("seed policy: layout + dressing seeds, mulberry32 lineage, comparison seed 4182", () => {
    expect(R.seedPolicy.comparisonSeed).toBe(4182);
    expect(R.invariants.chambersPerRun).toEqual([3, 5]);
    expect(R.invariants.comparisonSeed).toBe(4182);
    expect(R.seedPolicy.rng).toContain("mulberry32");
  });
});
