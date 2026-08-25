import { describe, expect, it } from "vitest";

import {
  createBreachV2RunController,
  type BreachV2RunController,
} from "../src/game/dungeons/breach-v2-gameplay";

const chambers = ["chamber-1", "chamber-2", "chamber-3"] as const;

function create(savedState?: unknown): BreachV2RunController {
  return createBreachV2RunController({
    seed: 4182,
    path: "wayfarer",
    chamberIds: chambers,
    rewardId: "tempered-training-gear",
    bossHp: 30,
    savedState,
  });
}

function completeTutorial(run: BreachV2RunController): void {
  run.interact("ilyra");
  run.interact("memory-loom");
  run.interact("coffer");
  run.interact("effigy");
  expect(run.requestDoor("wayfarer-choice").allowed).toBe(true);
}

function defeatActiveEncounter(run: BreachV2RunController): void {
  run.setCombatStyle("turn-based");
  for (let strike = 0; strike < 20 && run.snapshot().activeEncounter; strike += 1) run.attack();
  expect(run.snapshot().activeEncounter).toBeNull();
}

describe("BREACH-V2 isolated gameplay spine", () => {
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
});
