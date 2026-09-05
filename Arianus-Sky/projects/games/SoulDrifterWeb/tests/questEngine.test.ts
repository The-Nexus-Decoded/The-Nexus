import { describe, expect, it } from "vitest";

import { QuestEngine } from "../src/game/questdb/engine";
import { applyGmCommand, auditTrail, effectiveQuests } from "../src/game/questdb/gm";
import { emptyOverridesDb, validateDefinitionsDb, type QuestDefinitionsDb, type StoredQuest } from "../src/game/questdb/schema";
import { dailyInstances, hashSeed, instantiateTemplate, isExpired } from "../src/game/questdb/templates";

const cullQuest: StoredQuest = {
  id: "q-test-cull",
  name: "Test Cull",
  giverNpcId: "npc-a",
  turnInNpcId: "npc-a",
  level: 1,
  summary: "Kill two test rats.",
  objectives: [{ id: "rats", kind: "kill", targetId: "test-rat", count: 2, label: "Rats" }],
  rewards: { xp: 50, coin: 2, itemIds: [] },
  scaling: { recommendedParty: 1, intendedLevel: 1, soloLevel: 1, difficulty: "solo" },
  requires: [],
  teaches: "testing",
  origin: "authored",
};

const definitions: QuestDefinitionsDb = {
  schemaVersion: 1,
  generatedFrom: "test",
  quests: [cullQuest],
  templates: [{
    id: "t-test",
    namePattern: "Cull {monster} at {place}",
    summaryPattern: "Clear {count} {monster} from {place}. {flavor}.",
    kind: "kill",
    slots: {
      monsterPool: ["test-rat", "test-bat"],
      placePool: [{ id: "cellar", name: "the test cellar" }],
      flavorPool: ["the land remembers"],
    },
    countRange: [2, 4],
    levelRange: [1, 3],
    xpPerUnit: 10,
    coinPerUnit: 1,
    rotation: "daily",
  }],
};

const templateContext = {
  monsterName: (id: string) => (id === "test-rat" ? "Test Rat" : "Test Bat"),
  giverNpcId: "npc-a",
  turnInNpcId: "npc-a",
};

function makeEngine(overrides = emptyOverridesDb()): QuestEngine {
  return new QuestEngine({ definitions, overrides, templateContext });
}

describe("questdb schema", () => {
  it("validates a good DB and flags bad ones", () => {
    expect(validateDefinitionsDb(definitions)).toEqual([]);
    const bad = { ...definitions, quests: [{ ...cullQuest, id: "", objectives: [] }] };
    expect(validateDefinitionsDb(bad).length).toBeGreaterThan(0);
  });
});

describe("quest templates", () => {
  it("same date -> same instance for every player; different date -> different instance", () => {
    const a = instantiateTemplate(definitions.templates[0]!, { ...templateContext, date: "2026-08-18" });
    const b = instantiateTemplate(definitions.templates[0]!, { ...templateContext, date: "2026-08-18" });
    const c = instantiateTemplate(definitions.templates[0]!, { ...templateContext, date: "2026-08-19" });
    expect(a).toEqual(b);
    expect(a.id).not.toBe(c.id);
  });

  it("fills patterns with real content and scales rewards with level", () => {
    const instance = instantiateTemplate(definitions.templates[0]!, { ...templateContext, date: "2026-08-18" });
    expect(instance.name).not.toContain("{");
    expect(instance.summary).not.toContain("{");
    expect(instance.objectives[0]!.count).toBeGreaterThanOrEqual(2);
    expect(instance.rewards.xp).toBeGreaterThan(0);
    expect(instance.expiresAt).toBeTruthy();
    expect(instance.origin).toBe("template");
  });

  it("expires by date", () => {
    const instance = instantiateTemplate(definitions.templates[0]!, { ...templateContext, date: "2026-08-18" });
    expect(isExpired(instance, new Date("2026-08-18T12:00:00Z"))).toBe(false);
    expect(isExpired(instance, new Date("2026-08-19T00:00:01Z"))).toBe(true);
  });

  it("dailyInstances covers all templates", () => {
    expect(dailyInstances(definitions.templates, { ...templateContext, date: "2026-08-18" })).toHaveLength(1);
  });

  it("hashSeed is deterministic", () => {
    expect(hashSeed("a:b")).toBe(hashSeed("a:b"));
  });
});

describe("gm overrides", () => {
  it("patches, retires, injects, and keeps an audit trail", () => {
    let overrides = emptyOverridesDb();
    overrides = applyGmCommand(overrides, { op: "quest.patch", questId: "q-test-cull", patch: { rewards: { xp: 99, coin: 9, itemIds: [] } } }, { author: "gm", reason: "buff", at: "t1" }).overrides;
    expect(effectiveQuests(definitions, overrides).quests[0]!.rewards.xp).toBe(99);

    overrides = applyGmCommand(overrides, { op: "objective.patch", questId: "q-test-cull", objectiveId: "rats", patch: { count: 5 } }, { author: "gm", reason: "harder", at: "t2" }).overrides;
    expect(effectiveQuests(definitions, overrides).quests[0]!.objectives[0]!.count).toBe(5);

    overrides = applyGmCommand(overrides, { op: "quest.retire", questId: "q-test-cull" }, { author: "gm", reason: "broken", at: "t3" }).overrides;
    expect(effectiveQuests(definitions, overrides).quests).toHaveLength(0);

    const injected: StoredQuest = { ...cullQuest, id: "q-live-event", name: "Live Event" };
    overrides = applyGmCommand(overrides, { op: "quest.inject", quest: injected }, { author: "ai-agent", reason: "live event", at: "t4" }).overrides;
    const view = effectiveQuests(definitions, overrides);
    expect(view.quests.some((quest) => quest.id === "q-live-event" && quest.origin === "gm")).toBe(true);

    expect(auditTrail(overrides)).toHaveLength(4);
    expect(auditTrail(overrides)[0]).toContain("gm");
  });

  it("rejects commands without audit metadata and invalid injections", () => {
    expect(() => applyGmCommand(emptyOverridesDb(), { op: "quest.retire", questId: "x" }, { author: "", reason: "r", at: "t" })).toThrow();
    expect(() => applyGmCommand(emptyOverridesDb(), { op: "quest.inject", quest: { ...cullQuest, id: "" } }, { author: "g", reason: "r", at: "t" })).toThrow();
  });
});

describe("quest engine", () => {
  it("offers, accepts, progresses, and turns in quests", () => {
    const engine = makeEngine();
    expect(engine.offeredBy("npc-a").map((quest) => quest.id)).toEqual(["q-test-cull"]);
    engine.accept("q-test-cull");
    expect(engine.offeredBy("npc-a")).toHaveLength(0);
    expect(engine.event("kill", "test-rat")).toEqual([]);
    expect(engine.event("kill", "test-rat")).toEqual(["q-test-cull"]);
    expect(engine.turnableAt("npc-a")).toHaveLength(1);
    const result = engine.turnIn("q-test-cull", "now");
    expect(result.xp).toBe(50);
    expect(engine.statusOf("q-test-cull")).toBe("completed");
  });

  it("rotates dailies deterministically and retires expired ones on tick", () => {
    const engine = makeEngine();
    const first = engine.rotateDailies("2026-08-18");
    expect(first).toHaveLength(1);
    engine.rotateDailies("2026-08-18"); // idempotent
    expect(engine.quests().filter((quest) => quest.origin === "template")).toHaveLength(1);

    const dailyId = first[0]!.id;
    engine.accept(dailyId);
    const retired = engine.tick(new Date("2026-08-19T01:00:00Z"));
    expect(retired).toEqual([dailyId]);
    expect(engine.quests().some((quest) => quest.id === dailyId)).toBe(false);
  });

  it("keeps completed dailies out of expiry retirement", () => {
    const engine = makeEngine();
    const daily = engine.rotateDailies("2026-08-18")[0]!;
    engine.accept(daily.id);
    engine.event("kill", daily.objectives[0]!.targetId, daily.objectives[0]!.count);
    engine.turnIn(daily.id, "now");
    expect(engine.tick(new Date("2026-08-20T01:00:00Z"))).toEqual([]);
  });

  it("supports GM live injection and duplicate rejection", () => {
    const engine = makeEngine();
    engine.injectLive({ ...cullQuest, id: "q-live", name: "Live One" });
    expect(engine.offeredBy("npc-a").some((quest) => quest.id === "q-live")).toBe(true);
    expect(() => engine.injectLive({ ...cullQuest, id: "q-live" })).toThrow();
  });

  it("reflects overrides applied mid-session", () => {
    const engine = makeEngine();
    const overrides = applyGmCommand(emptyOverridesDb(), { op: "quest.retire", questId: "q-test-cull" }, { author: "gm", reason: "live retire", at: "t" }).overrides;
    engine.setOverrides(overrides);
    expect(engine.offeredBy("npc-a")).toHaveLength(0);
    expect(engine.debugSnapshot().retiredQuestIds).toEqual(["q-test-cull"]);
  });

  it("records a bounded debug event log", () => {
    const engine = makeEngine();
    for (let index = 0; index < 250; index += 1) engine.event("kill", "nothing");
    const snapshot = engine.debugSnapshot();
    expect(snapshot.eventLog.length).toBeLessThanOrEqual(200);
    expect(snapshot.quests[0]).toHaveProperty("status");
    expect(snapshot.quests[0]).toHaveProperty("origin");
  });

  it("restores player state for persistence round-trips", () => {
    const engine = makeEngine();
    engine.accept("q-test-cull");
    const saved = engine.state;
    const restored = makeEngine();
    restored.restore(saved);
    expect(restored.statusOf("q-test-cull")).toBe("active");
  });
});
