import { describe, expect, it } from "vitest";
import { dungeonTileKey, generateSoulwellDungeon, parseDebugRunSeed, roomContains } from "../src/game/dungeon";
import { DUNGEON_PROP_ASSET_IDS, dungeonPropAssetSpec } from "../src/game/environment/DungeonPropCatalog";
import { completeHoudiniFirstBreachComposition } from "../src/game/environment/HoudiniFirstBreachComposition";

function reachableTiles(dungeon: ReturnType<typeof generateSoulwellDungeon>): Set<string> {
  const floor = new Set(dungeon.tiles.map(dungeonTileKey));
  const blocked = new Set(
    [
      ...dungeon.props.filter((prop) => prop.blocksMovement),
      ...dungeon.blockedTiles,
    ].map(dungeonTileKey),
  );
  const visited = new Set<string>();
  const queue = [dungeon.playerStart];
  while (queue.length > 0) {
    const point = queue.shift()!;
    const key = dungeonTileKey(point);
    if (visited.has(key) || !floor.has(key) || blocked.has(key)) continue;
    visited.add(key);
    queue.push(
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    );
  }
  return visited;
}

function hasReachableAdjacent(point: { x: number; y: number }, reachable: Set<string>): boolean {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].some((candidate) => reachable.has(dungeonTileKey(candidate)));
}

describe("Soulwell dungeon generation", () => {
  it("accepts only explicit unsigned debug seeds for deterministic visual fixtures", () => {
    expect(parseDebugRunSeed("2215682322")).toBe(2215682322);
    expect(parseDebugRunSeed("0")).toBe(0);
    expect(parseDebugRunSeed("4294967295")).toBe(4294967295);
    expect(parseDebugRunSeed(null)).toBeNull();
    expect(parseDebugRunSeed("-1")).toBeNull();
    expect(parseDebugRunSeed("4294967296")).toBeNull();
    expect(parseDebugRunSeed("not-a-seed")).toBeNull();
  });

  it("is deterministic for a recorded run seed", () => {
    expect(generateSoulwellDungeon(4182)).toEqual(generateSoulwellDungeon(4182));
  });

  it("reproduces the complete Houdini review composition for the approved seed", () => {
    const dungeon = completeHoudiniFirstBreachComposition(generateSoulwellDungeon(4182));
    const kitAssets = new Set(dungeon.props.flatMap((prop) => prop.assetId ? [prop.assetId] : []));

    expect(kitAssets).toEqual(new Set(DUNGEON_PROP_ASSET_IDS));
    expect(dungeon.props.find((prop) => prop.id === "starter-coffer")?.assetId).toBe("storage-chest");
    expect(dungeon.props.find((prop) => prop.id === "training-effigy")?.assetId).toBe("guardian-statue");
    expect(dungeon.props.find((prop) => prop.id === "memory-loom")?.assetId).toBe("ruined-altar");
    expect(dungeon.props.find((prop) => prop.id === "gate-wayfarer")?.assetId).toBe("rusted-portcullis");
    expect(dungeon.props.find((prop) => prop.id === "gate-oathbreaker")?.assetId).toBe("heavy-door");

    const expectedFixtures = {
      training: { "wall-torch-sconce": 5, "floor-brazier": 2, "hanging-brazier": 2 },
      skirmish: { "wall-torch-sconce": 8, "floor-brazier": 3, "hanging-brazier": 3 },
      boss: { "wall-torch-sconce": 4, "floor-brazier": 4, "hanging-brazier": 2 },
    } as const;
    for (const [roomId, fixtures] of Object.entries(expectedFixtures)) {
      for (const [assetId, minimum] of Object.entries(fixtures)) {
        expect(dungeon.props.filter((prop) => prop.roomId === roomId && prop.assetId === assetId)).toHaveLength(minimum);
      }
    }
  });

  it("changes layout, encounters, or modifiers across different runs", () => {
    const first = generateSoulwellDungeon(4182);
    const second = generateSoulwellDungeon(4183);
    expect({
      rooms: first.rooms,
      props: first.props,
      enemies: first.enemies,
      bossPattern: first.bossPattern,
    }).not.toEqual({
      rooms: second.rooms,
      props: second.props,
      enemies: second.enemies,
      bossPattern: second.bossPattern,
    });
  });

  it("varies the gallery crawl between three and five chambers", () => {
    const counts = new Set(Array.from({ length: 120 }, (_, index) => generateSoulwellDungeon(index + 1).crawlSections.length));
    expect(counts).toEqual(new Set([3, 4, 5]));
  });

  it("always builds the authored training, skirmish, and miniboss progression", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const dungeon = generateSoulwellDungeon(seed);
      expect(dungeon.rooms.map((room) => room.id)).toEqual(["training", "skirmish", "boss"]);
      expect(dungeon.crawlSections.length).toBeGreaterThanOrEqual(3);
      expect(dungeon.crawlSections.length).toBeLessThanOrEqual(5);
      expect(new Set(dungeon.crawlSections.map((section) => section.id)).size).toBe(dungeon.crawlSections.length);
      expect(dungeon.rooms[1]!.width).toBeGreaterThanOrEqual(32);
      expect(dungeon.rooms[0]!.width).toBeGreaterThanOrEqual(16);
      expect(dungeon.rooms[0]!.height).toBeGreaterThanOrEqual(14);
      expect(dungeon.npcs.map((npc) => npc.id).sort()).toEqual(["brannoc", "ilyra", "orren"]);
      expect(dungeon.enemies.filter((enemy) => enemy.roomId === "skirmish")).toHaveLength(5);
      expect(dungeon.enemies.filter((enemy) => enemy.kind === "miniboss")).toHaveLength(1);
      expect(dungeon.props.some((prop) => prop.kind === "essence")).toBe(true);
      expect(dungeon.props.filter((prop) => prop.kind === "gate").map((prop) => prop.id).sort()).toEqual(["gate-oathbreaker", "gate-wayfarer"]);
      expect(dungeon.props.some((prop) => prop.kind === "memory-loom")).toBe(true);
      expect(dungeon.props.some((prop) => prop.kind === "training-effigy")).toBe(true);
    }
  });

  it("uses the reusable kit through room-specific boundary sockets instead of room-center scatter", () => {
    const expectedAssets = new Set(DUNGEON_PROP_ASSET_IDS);
    const observedAssets = new Set<string>();
    const forbiddenTrainingAssets = new Set([
      "guardian-statue",
      "monster-egg-nest",
      "cocooned-remains-web-mass",
      "shed-chitin-pile",
      "burrowed-wall-breach-plug",
      "corruption-growth",
      "ruined-altar",
      "broken-stone-stair-dais",
    ]);
    for (let seed = 1; seed <= 160; seed += 1) {
      const dungeon = generateSoulwellDungeon(seed);
      const kitProps = dungeon.props.filter((prop) => prop.assetId !== undefined);
      const floor = new Set(dungeon.tiles.map(dungeonTileKey));
      const well = dungeon.props.find((prop) => prop.kind === "soul-well")!;
      expect(kitProps.length).toBeGreaterThanOrEqual(28);
      for (const prop of kitProps) {
        const spec = dungeonPropAssetSpec(prop.assetId!);
        observedAssets.add(prop.assetId!);
        expect(prop.kind).toBe(spec.kind);
        expect(prop.blocksMovement).toBe(spec.blocksMovement);
        expect(Number.isFinite(prop.rotationY)).toBe(true);
        const touchesBoundary = [
          { x: prop.x + 1, y: prop.y },
          { x: prop.x - 1, y: prop.y },
          { x: prop.x, y: prop.y + 1 },
          { x: prop.x, y: prop.y - 1 },
        ].some((point) => !floor.has(dungeonTileKey(point)));
        expect(touchesBoundary, `${prop.id}, seed ${seed}`).toBe(true);
        expect(Math.abs(prop.offsetX ?? 0) + Math.abs(prop.offsetY ?? 0)).toBeGreaterThan(0);
        if (prop.roomId === "training") {
          expect(forbiddenTrainingAssets.has(prop.assetId!), `${prop.id}, seed ${seed}`).toBe(false);
          expect(Math.abs(prop.x - well.x) + Math.abs(prop.y - well.y)).toBeGreaterThanOrEqual(5);
        }
      }
      const hanging = kitProps.find((prop) => prop.assetId === "hanging-brazier");
      if (hanging) expect(hanging).toMatchObject({ kind: "brazier", blocksMovement: false });
    }
    expect(observedAssets).toEqual(expectedAssets);
  });

  it("keeps required actors and rewards on walkable generated tiles", () => {
    const dungeon = generateSoulwellDungeon(9931);
    const tiles = new Set(dungeon.tiles.map(dungeonTileKey));
    expect(tiles.has(dungeonTileKey(dungeon.playerStart))).toBe(true);
    for (const npc of dungeon.npcs) expect(tiles.has(dungeonTileKey(npc))).toBe(true);
    for (const enemy of dungeon.enemies) expect(tiles.has(dungeonTileKey(enemy))).toBe(true);
    for (const prop of dungeon.props) expect(tiles.has(dungeonTileKey(prop))).toBe(true);
    for (const room of dungeon.rooms) expect(roomContains(room, room.center)).toBe(true);
  });

  it("keeps every objective and encounter reachable across randomized runs", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const dungeon = generateSoulwellDungeon(seed);
      const reachable = reachableTiles(dungeon);
      for (const room of dungeon.rooms) {
        expect(reachable.has(dungeonTileKey(room.center)), `room ${room.id}, seed ${seed}`).toBe(true);
      }
      for (const section of dungeon.crawlSections) {
        expect(reachable.has(dungeonTileKey(section.center)), `crawl section ${section.id}, seed ${seed}`).toBe(true);
      }
      for (const npc of dungeon.npcs) {
        expect(hasReachableAdjacent(npc, reachable), `npc ${npc.id}, seed ${seed}`).toBe(true);
      }
      for (const enemy of dungeon.enemies) {
        expect(hasReachableAdjacent(enemy, reachable), `enemy ${enemy.id}, seed ${seed}`).toBe(true);
      }
      for (const prop of dungeon.props.filter((prop) => ["chest", "essence", "memory-loom", "training-effigy"].includes(prop.kind))) {
        expect(hasReachableAdjacent(prop, reachable), `prop ${prop.id}, seed ${seed}`).toBe(true);
      }
    }
  });
});
