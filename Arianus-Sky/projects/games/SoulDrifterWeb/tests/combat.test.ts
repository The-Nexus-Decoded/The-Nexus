import { describe, expect, it } from "vitest";
import { CombatEngine } from "../src/game/combat";
import type { ActorState } from "../src/game/types";

function actor(id: "player" | "sentinel", hp: number): ActorState {
  return {
    id,
    name: id,
    x: id === "player" ? 0 : 1,
    y: 0,
    maxHp: hp,
    hp,
    movement: 4,
    guard: false,
    alive: true,
  };
}

describe("combat engine", () => {
  it("alternates actors in tactical-turn mode", () => {
    const combat = new CombatEngine(actor("player", 30), actor("sentinel", 20));
    combat.begin("turn-based");
    expect(combat.currentActor).toBe("player");
    expect(combat.endTurn()).toBe("sentinel");
    expect(combat.endTurn()).toBe("player");
  });

  it("keeps guard active through the opposing turn and reduces damage", () => {
    const combat = new CombatEngine(actor("player", 30), actor("sentinel", 20));
    combat.begin("turn-based");
    combat.setGuard("player", true);
    combat.endTurn();
    expect(combat.damage("player", 10)).toBe(5);
    expect(combat.actors.player.hp).toBe(25);
  });

  it("declares victory when the Sentinel reaches zero hp", () => {
    const combat = new CombatEngine(actor("player", 30), actor("sentinel", 10));
    combat.begin("real-time");
    combat.damage("sentinel", 12);
    expect(combat.actors.sentinel.alive).toBe(false);
    expect(combat.state).toBe("victory");
  });
});
