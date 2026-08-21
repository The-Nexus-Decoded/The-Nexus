import { describe, expect, it } from "vitest";
import {
  priestMendingWardHealing,
  recoverWhileSafe,
  recoveryChargesAtBossCheckpoint,
  STARTER_RECOVERY_CHARGES,
} from "../src/game/combatRecovery";

describe("calling recovery", () => {
  it("budgets one finite recovery band for each combat stretch of the starter trial", () => {
    expect(STARTER_RECOVERY_CHARGES).toBe(4);
  });

  it("reweaves a four-band boss reserve without erasing careful conservation", () => {
    expect(recoveryChargesAtBossCheckpoint(0)).toBe(4);
    expect(recoveryChargesAtBossCheckpoint(1)).toBe(4);
    expect(recoveryChargesAtBossCheckpoint(5)).toBe(5);
  });

  it("lets every calling rest between encounters without consuming a recovery band", () => {
    const result = recoverWhileSafe("mage", {
      hp: 12,
      maxHp: 40,
      stability: 30,
      maxStability: 90,
      resource: 10,
    });
    expect(result).toMatchObject({ hp: 16, stability: 54, resource: 28 });
    expect(result.healed).toBe(4);
  });

  it("makes a priest's Mending Ward a real combat heal without over-healing", () => {
    expect(priestMendingWardHealing(20, 50)).toBe(9);
    expect(priestMendingWardHealing(47, 50)).toBe(3);
    expect(priestMendingWardHealing(50, 50)).toBe(0);
  });
});
