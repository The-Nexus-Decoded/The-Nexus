import { describe, expect, it } from "vitest";

import {
  BREACH_V2_RUN_SCHEMA_VERSION,
  createBreachV2RunController,
  type BreachV2RunController,
} from "../src/game/dungeons/breach-v2-gameplay";
import { shouldCollapseBreachV2GameplayUi } from "../src/game/dungeons/breach-v2-gameplay-ui";

const chambers = ["chamber-1", "chamber-2", "chamber-3"] as const;
const environmentObjects = [
  ...["crate", "barrel", "table", "chair", "wall-brace", "cover-1", "cover-2", "cover-3", "cover-4"]
    .map((id) => ({
      id,
      label: id,
      destructionClass: "DESTRUCTIBLE_SOLID_PROP" as const,
      durability: 55,
    })),
  {
    id: "boss-lock-structure",
    label: "boss lock structure",
    destructionClass: "PROTECTED_PROP_OR_STRUCTURE" as const,
    durability: 999,
    protectionReason: "progression mechanism",
  },
  {
    id: "vestibule:storage-chest:7",
    label: "Wayfarer's Coffer",
    destructionClass: "INTERACTABLE_CONTAINER" as const,
    durability: 80,
  },
] as const;

function create(savedState?: unknown): BreachV2RunController {
  return createBreachV2RunController({
    seed: 4182,
    path: "wayfarer",
    chamberIds: chambers,
    rewardId: "tempered-training-gear",
    bossHp: 30,
    cofferObjectId: "vestibule:storage-chest:7",
    deterministicTestItemId: "test-starter-4182-wayfarer",
    environmentObjects,
    savedState,
  });
}

function completeTutorial(run: BreachV2RunController): void {
  run.interact("ilyra");
  run.interact("memory-loom");
  run.interact("coffer");
  run.interact("coffer-pickup");
  run.interact("effigy");
  expect(run.requestDoor("wayfarer-choice").allowed).toBe(true);
}

function defeatActiveEncounter(run: BreachV2RunController): void {
  run.setCombatStyle("turn-based");
  for (let strike = 0; strike < 20 && run.snapshot().activeEncounter; strike += 1) run.attack();
  expect(run.snapshot().activeEncounter).toBeNull();
}

describe("BREACH-V2 isolated gameplay spine", () => {
  it("starts the gameplay controls collapsed on phone-width viewports", () => {
    expect(shouldCollapseBreachV2GameplayUi(390)).toBe(true);
    expect(shouldCollapseBreachV2GameplayUi(640)).toBe(true);
    expect(shouldCollapseBreachV2GameplayUi(641)).toBe(false);
    expect(shouldCollapseBreachV2GameplayUi(1280)).toBe(false);
  });

  it("enforces tutorial order and the selected route", () => {
    const run = create();

    expect(run.requestDoor("vestibule-link").allowed).toBe(false);
    expect(run.requestDoor("wayfarer-choice").allowed).toBe(false);
    expect(run.requestDoor("oathbreaker-choice").allowed).toBe(false);
    run.interact("memory-loom");
    expect(run.snapshot().tutorial.imprintSealed).toBe(false);

    completeTutorial(run);

    expect(run.snapshot().routeChosen).toBe(true);
    expect(run.requestDoor("oathbreaker-choice").allowed).toBe(false);
    expect(run.requestDoor("chamber-2-entry").allowed).toBe(false);
    expect(run.requestDoor("chamber-1-entry").allowed).toBe(true);
  });

  it("clears galleries sequentially, defeats the Warden, grants one memory reward, exits, and restores", () => {
    const run = create();
    completeTutorial(run);

    chambers.forEach((roomId, index) => {
      if (index + 1 < chambers.length) {
        expect(run.requestDoor(`${chambers[index + 1]}-entry`).allowed).toBe(false);
      }
      expect(run.requestDoor(`${roomId}-entry`).allowed).toBe(true);
      run.enterRoom(roomId);
      expect(run.snapshot().activeEncounter?.roomId).toBe(roomId);
      defeatActiveEncounter(run);
    });

    expect(run.requestDoor("boss-lock").allowed).toBe(true);
    expect(run.requestDoor("memory-vault").allowed).toBe(false);
    run.enterRoom("ashen-lock");
    expect(run.snapshot().activeEncounter?.kind).toBe("boss");
    defeatActiveEncounter(run);
    expect(run.snapshot().bossDefeated).toBe(true);
    expect(run.requestDoor("memory-vault").allowed).toBe(true);

    run.interact("first-memory");
    run.interact("first-memory");
    const claimed = run.snapshot();
    expect(claimed.firstMemoryClaimed).toBe(true);
    expect(claimed.rewardIds).toEqual(["tempered-training-gear"]);
    expect(run.requestDoor("way-upward").allowed).toBe(true);
    expect(run.requestDoor("heartvale-threshold").allowed).toBe(true);

    run.interact("heartvale-exit");
    const completed = run.snapshot();
    expect(completed.phase).toBe("complete");
    expect(completed.exitedToHeartvale).toBe(true);

    const restored = create(completed).snapshot();
    expect(restored).toEqual(completed);
  });

  it("switches combat presentation without replacing the authoritative encounter", () => {
    const run = create();
    completeTutorial(run);
    run.enterRoom("chamber-1");
    run.attack();
    const realTimeState = run.snapshot();

    run.setCombatStyle("turn-based");
    const turnBasedState = run.snapshot();
    expect(turnBasedState.activeEncounter).toEqual(realTimeState.activeEncounter);
    expect(turnBasedState.playerHp).toBe(realTimeState.playerHp);

    const parallel = create();
    completeTutorial(parallel);
    parallel.enterRoom("chamber-1");
    parallel.setCombatStyle("turn-based");
    parallel.attack();
    expect(parallel.snapshot().activeEncounter?.enemyHp).toBe(realTimeState.activeEncounter?.enemyHp);
  });

  it("opens the coffer, drops and collects one deterministic item, and restores without duplication", () => {
    const run = create();
    run.interact("ilyra");
    run.interact("memory-loom");

    run.interact("coffer");
    run.interact("coffer");
    let state = run.snapshot();
    expect(state.environment.cofferOpened).toBe(true);
    expect(state.environment.pickupDropped).toBe(true);
    expect(state.environment.pickupCollected).toBe(false);
    expect(state.environment.removedColliderIds).toEqual(["vestibule:storage-chest:7"]);

    run.interact("coffer-pickup");
    run.interact("coffer-pickup");
    state = run.snapshot();
    expect(state.environment.pickupCollected).toBe(true);
    expect(state.environment.collectedItemIds).toEqual(["test-starter-4182-wayfarer"]);
    expect(state.tutorial.cofferOpened).toBe(true);
    expect(create(state).snapshot()).toEqual(state);
  });

  it("clears destroyed colliders, bounds debris, rejects protected damage, and persists the route-safe state", () => {
    const run = create();
    const partial = run.damageEnvironmentObject("crate", 20);
    expect(partial).toMatchObject({ accepted: true, destroyed: false });
    expect(run.snapshot().environment.objectHitPoints.crate).toBe(35);

    const destroyed = run.damageEnvironmentObject("crate", 35);
    expect(destroyed).toMatchObject({ accepted: true, destroyed: true });
    expect(run.snapshot().environment.removedColliderIds).toContain("crate");
    run.damageEnvironmentObject("crate", 999);
    expect(run.snapshot().environment.debrisObjectIds.filter((id) => id === "crate")).toHaveLength(1);

    const protectedResult = run.damageEnvironmentObject("boss-lock-structure", 999);
    expect(protectedResult).toMatchObject({ accepted: false, destroyed: false });
    expect(run.snapshot().environment.removedColliderIds).not.toContain("boss-lock-structure");

    for (const id of ["barrel", "table", "chair", "wall-brace", "cover-1", "cover-2", "cover-3", "cover-4"]) {
      run.damageEnvironmentObject(id, 999);
    }
    expect(run.snapshot().environment.debrisObjectIds).toHaveLength(8);
    run.cleanupEnvironmentDebris();
    const cleaned = run.snapshot();
    expect(cleaned.environment.debrisObjectIds).toEqual([]);
    expect(cleaned.environment.destroyedObjectIds).toContain("wall-brace");
    expect(cleaned.environment.removedColliderIds).toContain("wall-brace");
    const restored = create(cleaned);
    expect(restored.snapshot()).toEqual(cleaned);
    completeTutorial(restored);
    expect(restored.requestDoor("chamber-1-entry").allowed).toBe(true);
  });

  it("migrates incomplete schema-v1 environment saves without crashing preview consumers", () => {
    const legacy = create().snapshot();
    legacy.tutorial.cofferOpened = true;
    const restored = create({
      ...legacy,
      schemaVersion: 1,
      environment: {},
    }).snapshot();

    expect(restored.schemaVersion).toBe(BREACH_V2_RUN_SCHEMA_VERSION);
    expect(restored.environment).toMatchObject({
      cofferOpened: true,
      pickupDropped: true,
      pickupCollected: true,
      collectedItemIds: ["test-starter-4182-wayfarer"],
      removedColliderIds: ["vestibule:storage-chest:7"],
      destroyedObjectIds: [],
      debrisObjectIds: [],
      objectHitPoints: {},
    });
  });

  it("normalizes malformed nested environment values and bounds restored debris", () => {
    const saved = create().snapshot();
    const restored = create({
      ...saved,
      environment: {
        cofferObjectId: "",
        cofferOpened: "yes",
        pickupDropped: true,
        pickupCollected: false,
        deterministicItemId: null,
        collectedItemIds: "invalid",
        objectHitPoints: { crate: 12, negative: -1, infinite: Number.POSITIVE_INFINITY },
        destroyedObjectIds: ["crate", 42],
        removedColliderIds: ["crate", "crate"],
        debrisObjectIds: Array.from({ length: 12 }, (_, index) => `debris-${index}`),
      },
    }).snapshot();

    expect(restored.environment).toMatchObject({
      cofferObjectId: "vestibule:storage-chest:7",
      cofferOpened: false,
      pickupDropped: true,
      pickupCollected: false,
      deterministicItemId: "test-starter-4182-wayfarer",
      collectedItemIds: [],
      objectHitPoints: { crate: 12 },
      destroyedObjectIds: [],
      removedColliderIds: ["crate"],
    });
    expect(restored.environment.debrisObjectIds).toEqual(
      Array.from({ length: 8 }, (_, index) => `debris-${index + 4}`),
    );
  });
});
