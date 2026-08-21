import { describe, expect, it } from "vitest";
import { MEMORY_QUESTIONS, deriveCharacter } from "../src/game/character";
import {
  TRIALS,
  applyStarterImprint,
  callingPerkOptions,
  deterministicTrialRoll,
  hardTrialSkillName,
  raceBoonOptions,
  starterImprintLockReason,
  starterTrialLockReason,
  statAllocationTotal,
} from "../src/game/tutorialChoices";

function elfShadowknight() {
  return deriveCharacter({
    name: "Vaelis",
    raceId: "elf",
    callingId: "shadowknight",
    appearance: { hairStyle: "shaved", hairColor: "silver-white", skinTone: "ashen" },
    answers: Object.fromEntries(MEMORY_QUESTIONS.map((question) => [question.id, question.answers[0]!.id])),
  });
}

describe("starter Soul Imprint", () => {
  it("adds exactly three final points plus one matching ancestry boon and calling discipline", () => {
    const profile = elfShadowknight();
    const beforeVitality = profile.stats.vitality;
    const beforeWill = profile.stats.will;
    const record = applyStarterImprint(profile, {
      allocations: { vitality: 2, will: 1 },
      raceBoonId: "elf-memory",
      callingPerkId: "shadowknight-graveiron",
    });

    expect(statAllocationTotal(record.allocations)).toBe(3);
    expect(profile.stats.vitality).toBe(beforeVitality + 3);
    expect(profile.stats.will).toBe(beforeWill + 3);
    expect(profile.skills).toContain("Unbroken Recollection");
    expect(profile.skills).toContain("Grave-Iron Discipline");
    expect(profile.maxHp).toBe(18 + profile.stats.vitality * 2 + 8);
  });

  it("rejects incomplete allocation, mismatched options, and resealing", () => {
    expect(() => applyStarterImprint(elfShadowknight(), {
      allocations: { vitality: 2 },
      raceBoonId: "elf-memory",
      callingPerkId: "shadowknight-graveiron",
    })).toThrow("exactly three");

    expect(() => applyStarterImprint(elfShadowknight(), {
      allocations: { vitality: 3 },
      raceBoonId: "dwarf-anchor",
      callingPerkId: "shadowknight-graveiron",
    })).toThrow("Choose one ancestry boon");

    const sealed = elfShadowknight();
    applyStarterImprint(sealed, {
      allocations: { vitality: 3 },
      raceBoonId: raceBoonOptions("elf")[0]!.id,
      callingPerkId: callingPerkOptions("shadowknight")[0]!.id,
    });
    expect(() => applyStarterImprint(sealed, {
      allocations: { will: 3 },
      raceBoonId: "elf-ghoststep",
      callingPerkId: "shadowknight-hungry-ember",
    })).toThrow("already been sealed");
  });
});

describe("shared-room trial presets", () => {
  it("makes Oathbreaker materially harder and more rewarding without defining another map", () => {
    expect(TRIALS.oathbreaker.enemyHpMultiplier).toBeGreaterThan(TRIALS.wayfarer.enemyHpMultiplier);
    expect(TRIALS.oathbreaker.enemyDamageMultiplier).toBeGreaterThan(TRIALS.wayfarer.enemyDamageMultiplier);
    expect(TRIALS.oathbreaker.skirmishPressure).toBeGreaterThan(TRIALS.wayfarer.skirmishPressure);
    expect(TRIALS.oathbreaker.skillChance).toBeGreaterThan(0);
    expect(hardTrialSkillName("shadowknight")).toBe("Gravefire Riposte");
  });

  it("uses a stable seed roll so the hard reward cannot be rerolled by reopening the cache", () => {
    expect(deterministicTrialRoll(4182)).toBe(deterministicTrialRoll(4182));
    expect(deterministicTrialRoll(4182)).not.toBe(deterministicTrialRoll(4183));
  });
});

describe("required starter progression", () => {
  it("locks the Loom behind the chronicle and the doors behind every shared invariant", () => {
    const profile = elfShadowknight();
    expect(starterImprintLockReason(profile)).toContain("Chronicle");
    expect(starterTrialLockReason(profile, { cofferOpened: false, hasUsableWeapon: false })).toContain("Chronicle");

    profile.onboarding = { storybookCompleted: true, ilyraAnswered: true };
    expect(starterImprintLockReason(profile)).toBeNull();
    expect(starterTrialLockReason(profile, { cofferOpened: false, hasUsableWeapon: true })).toContain("three stat threads");

    applyStarterImprint(profile, {
      allocations: { vitality: 3 },
      raceBoonId: "elf-memory",
      callingPerkId: "shadowknight-graveiron",
    });
    expect(starterTrialLockReason(profile, { cofferOpened: false, hasUsableWeapon: true })).toContain("Coffer");
    expect(starterTrialLockReason(profile, { cofferOpened: true, hasUsableWeapon: false })).toContain("main-hand weapon");
    expect(starterTrialLockReason(profile, { cofferOpened: true, hasUsableWeapon: true })).toBeNull();
  });
});
