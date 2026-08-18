import { describe, expect, it } from "vitest";

import { LOOT_TABLES } from "../src/game/loot";
import { monsterXp, xpToReachLevel } from "../src/game/progression";
import {
  HEARTVALE_ANCHORS,
  HEARTVALE_ESCORTS,
  HEARTVALE_MONSTERS,
  HEARTVALE_NPC_DATABASE,
  HEARTVALE_PUZZLES,
  HEARTVALE_QUESTS,
  HEARTVALE_SPAWN_AREAS,
  SOULWELL_GRID,
  phasedSpawnAreas,
  requiredKillXp,
  totalQuestXp,
} from "../src/game/zoneHeartvale";
import { completedQuestIds, createHeartvaleState } from "../src/game/zoneState";

describe("Heartvale zone content integrity", () => {
  it("anchors sit at the canon atlas coordinates", () => {
    expect(SOULWELL_GRID).toEqual({ x: 40, y: 72.5 });
    const anwel = HEARTVALE_ANCHORS.find((anchor) => anchor.id === "anwel");
    expect(anwel?.grid).toEqual({ x: 40, y: 57.5 });
    const lockroot = HEARTVALE_ANCHORS.find((anchor) => anchor.id === "lockroot");
    expect(lockroot?.grid).toEqual({ x: 52.5, y: 35 });
    for (const anchor of HEARTVALE_ANCHORS) {
      expect(anchor.grid.x).toBeGreaterThanOrEqual(0);
      expect(anchor.grid.x).toBeLessThanOrEqual(160);
      expect(anchor.grid.y).toBeGreaterThanOrEqual(0);
      expect(anchor.grid.y).toBeLessThanOrEqual(160);
    }
  });

  it("fields at least ten quest NPCs with dialogue scenes", () => {
    expect(Object.keys(HEARTVALE_NPC_DATABASE.npcs).length).toBeGreaterThanOrEqual(10);
    for (const npc of Object.values(HEARTVALE_NPC_DATABASE.npcs)) {
      expect(npc.scene.opening.length).toBeGreaterThan(0);
      expect(npc.scene.choices.length).toBeGreaterThan(0);
    }
  });

  it("covers every quest objective target with real content", () => {
    const lootItemIds = new Set(
      Object.values(LOOT_TABLES).flatMap((table) => table.entries.map((entry) => entry.itemId)),
    );
    const puzzleIds = new Set(HEARTVALE_PUZZLES.map((puzzle) => puzzle.id));
    const escortIds = new Set(HEARTVALE_ESCORTS.map((escort) => escort.id));
    for (const quest of HEARTVALE_QUESTS) {
      expect(HEARTVALE_NPC_DATABASE.npcs[quest.giverNpcId], quest.id).toBeTruthy();
      expect(HEARTVALE_NPC_DATABASE.npcs[quest.turnInNpcId], quest.id).toBeTruthy();
      for (const objective of quest.objectives) {
        if (objective.kind === "kill") expect(HEARTVALE_MONSTERS[objective.targetId], quest.id).toBeTruthy();
        if (objective.kind === "collect") expect(lootItemIds.has(objective.targetId), quest.id).toBe(true);
        if (objective.kind === "puzzle") expect(puzzleIds.has(objective.targetId), quest.id).toBe(true);
        if (objective.kind === "escort") expect(escortIds.has(objective.targetId), quest.id).toBe(true);
      }
    }
  });

  it("keeps the quest DAG acyclic and anchored at q-first-roof", () => {
    const ids = new Set(HEARTVALE_QUESTS.map((quest) => quest.id));
    for (const quest of HEARTVALE_QUESTS) {
      for (const required of quest.requires) expect(ids.has(required), quest.id).toBe(true);
    }
    const roots = HEARTVALE_QUESTS.filter((quest) => quest.requires.length === 0);
    expect(roots.map((quest) => quest.id)).toEqual(["q-first-roof"]);
    // Every quest is reachable from the root.
    const reachable = new Set<string>(["q-first-roof"]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const quest of HEARTVALE_QUESTS) {
        if (!reachable.has(quest.id) && quest.requires.every((required) => reachable.has(required))) {
          reachable.add(quest.id);
          grew = true;
        }
      }
    }
    expect(reachable.size).toBe(HEARTVALE_QUESTS.length);
  });

  it("budgets the chain plus required kills to reach level 10", () => {
    const budget = totalQuestXp() + requiredKillXp(monsterXp);
    expect(budget).toBeGreaterThanOrEqual(xpToReachLevel(10));
    // ...but the chain must not sprint past the zone band on its own.
    expect(totalQuestXp()).toBeLessThan(xpToReachLevel(12));
  });

  it("spawns reference real monsters and quests", () => {
    const questIds = new Set(HEARTVALE_QUESTS.map((quest) => quest.id));
    for (const area of HEARTVALE_SPAWN_AREAS) {
      expect(HEARTVALE_MONSTERS[area.monsterId], area.id).toBeTruthy();
      if (area.questId) expect(questIds.has(area.questId), area.id).toBe(true);
      if (area.phasedInBy) expect(questIds.has(area.phasedInBy), area.id).toBe(true);
    }
  });

  it("mutations only touch real spawn areas", () => {
    const areaIds = new Set(HEARTVALE_SPAWN_AREAS.map((area) => area.id));
    const phasedIds = new Set(HEARTVALE_SPAWN_AREAS.filter((area) => area.phasedInBy).map((area) => area.id));
    for (const quest of HEARTVALE_QUESTS) {
      for (const removed of quest.onComplete?.removeSpawns ?? []) {
        expect(areaIds.has(removed), quest.id).toBe(true);
      }
      for (const added of quest.onComplete?.addSpawns ?? []) {
        expect(phasedIds.has(added.spawnId), quest.id).toBe(true);
      }
    }
  });

  it("phases the world per player without touching wander mobs", () => {
    const state = createHeartvaleState();
    const fresh = phasedSpawnAreas(completedQuestIds(state));
    expect(fresh.some((area) => area.id === "camp-mudclaw-shallows")).toBe(true);
    expect(fresh.some((area) => area.id === "phase-fisher-shallows")).toBe(false);
    expect(fresh.some((area) => area.id === "wander-moth-meadow")).toBe(true);

    const completer = createHeartvaleState();
    completer.questLog.completed["q-mudclaw-toll"] = { completedAt: "now" };
    const phased = phasedSpawnAreas(completedQuestIds(completer));
    expect(phased.some((area) => area.id === "camp-mudclaw-shallows")).toBe(false);
    expect(phased.some((area) => area.id === "phase-fisher-shallows")).toBe(true);
    // Wander and unrelated quest areas are identical for both players.
    for (const id of ["wander-moth-meadow", "wander-muster-field", "camp-thornback-field"]) {
      expect(phased.some((area) => area.id === id)).toBe(true);
    }
  });

  it("keeps zone bosses on party/raid scaling with a solo out-level path", () => {
    const bosses = HEARTVALE_QUESTS.filter((quest) => quest.scaling.difficulty !== "solo");
    expect(bosses.length).toBeGreaterThanOrEqual(3); // elite camp + two zone bosses
    for (const quest of bosses) {
      expect(quest.scaling.recommendedParty).toBeGreaterThanOrEqual(3);
      expect(quest.scaling.soloLevel).toBeGreaterThan(quest.scaling.intendedLevel);
    }
  });

  it("carries the canon direction: quests push terrace -> Anwel -> roads -> Lockroot", () => {
    const lockroot = HEARTVALE_QUESTS.find((quest) => quest.id === "q-humming-roots");
    expect(lockroot?.onComplete?.atlasPromotion).toEqual({ realmId: "thalenyr", poiId: "lockroot", status: "explored" });
    const ids = HEARTVALE_QUESTS.map((quest) => quest.id);
    expect(ids.indexOf("q-first-roof")).toBeLessThan(ids.indexOf("q-weirwight"));
  });
});
