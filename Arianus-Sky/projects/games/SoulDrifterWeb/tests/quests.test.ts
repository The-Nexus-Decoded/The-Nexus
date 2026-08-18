import { describe, expect, it } from "vitest";

import {
  acceptQuest,
  canAccept,
  createQuestLog,
  encounterScale,
  questStatus,
  recordQuestEvent,
  turnInQuest,
  type QuestDefinition,
} from "../src/game/quests";

const cullQuest: QuestDefinition = {
  id: "test-cull",
  name: "Test Cull",
  giverNpcId: "giver",
  turnInNpcId: "giver",
  level: 1,
  summary: "Kill three test rats.",
  objectives: [{ id: "rats", kind: "kill", targetId: "test-rat", count: 3, label: "Rats" }],
  rewards: { xp: 100, coin: 5, itemIds: [] },
  scaling: { recommendedParty: 1, intendedLevel: 1, soloLevel: 1, difficulty: "solo" },
  requires: [],
  teaches: "testing",
};

const chainedQuest: QuestDefinition = {
  ...cullQuest,
  id: "test-chained",
  requires: ["test-cull"],
  onComplete: {
    removeSpawns: ["camp-test-rats"],
    addSpawns: [{ spawnId: "phase-clean-barn", monsterId: "test-rat" }],
    worldNote: "The barn is clean.",
  },
};

describe("quest engine", () => {
  it("walks available -> active -> ready -> completed", () => {
    let log = createQuestLog();
    expect(questStatus(log, cullQuest)).toBe("available");
    log = acceptQuest(log, cullQuest);
    expect(questStatus(log, cullQuest)).toBe("active");

    log = recordQuestEvent(log, [cullQuest], { kind: "kill", targetId: "test-rat" });
    expect(log.active["test-cull"]!.counts.rats).toBe(1);
    expect(questStatus(log, cullQuest)).toBe("active");

    log = recordQuestEvent(log, [cullQuest], { kind: "kill", targetId: "test-rat", amount: 5 });
    expect(log.active["test-cull"]!.counts.rats).toBe(3); // capped at objective count
    expect(questStatus(log, cullQuest)).toBe("ready-to-turn-in");

    const result = turnInQuest(log, cullQuest, "2026-08-18T18:00:00Z");
    expect(questStatus(result.log, cullQuest)).toBe("completed");
    expect(result.rewards.xp).toBe(100);
  });

  it("ignores events that match no active objective", () => {
    let log = acceptQuest(createQuestLog(), cullQuest);
    const before = log.active["test-cull"];
    log = recordQuestEvent(log, [cullQuest], { kind: "kill", targetId: "other-monster" });
    log = recordQuestEvent(log, [cullQuest], { kind: "find", targetId: "test-rat" });
    expect(log.active["test-cull"]).toEqual(before);
  });

  it("gates chained quests behind prerequisites", () => {
    let log = createQuestLog();
    expect(canAccept(log, chainedQuest)).toBe(false);
    log = acceptQuest(log, cullQuest);
    log = recordQuestEvent(log, [cullQuest], { kind: "kill", targetId: "test-rat", amount: 3 });
    log = turnInQuest(log, cullQuest, "now").log;
    expect(canAccept(log, chainedQuest)).toBe(true);
  });

  it("returns the world mutation payload on turn-in", () => {
    const mutatingQuest: QuestDefinition = { ...chainedQuest, id: "test-mutating", requires: [] };
    let log = acceptQuest(createQuestLog(), mutatingQuest);
    log = recordQuestEvent(log, [mutatingQuest], { kind: "kill", targetId: "test-rat", amount: 3 });
    const result = turnInQuest(log, mutatingQuest, "now");
    expect(result.mutation?.removeSpawns).toEqual(["camp-test-rats"]);
    expect(result.mutation?.addSpawns[0]?.spawnId).toBe("phase-clean-barn");
  });

  it("refuses to turn in a quest that is not ready", () => {
    const log = acceptQuest(createQuestLog(), cullQuest);
    expect(() => turnInQuest(log, cullQuest, "now")).toThrow();
  });

  it("scales encounters by party size and level gap", () => {
    const bossScaling = { recommendedParty: 4, intendedLevel: 9, soloLevel: 13, difficulty: "raid" as const };
    const fullParty = encounterScale({ partySize: 4, playerLevel: 9, scaling: bossScaling });
    const solo = encounterScale({ partySize: 1, playerLevel: 9, scaling: bossScaling });
    const outleveled = encounterScale({ partySize: 1, playerLevel: 13, scaling: bossScaling });
    expect(fullParty).toBe(1);
    expect(solo).toBeGreaterThan(fullParty);
    expect(outleveled).toBeLessThan(solo);
    expect(encounterScale({ partySize: 5, playerLevel: 9, scaling: bossScaling })).toBeLessThanOrEqual(1);
  });
});
