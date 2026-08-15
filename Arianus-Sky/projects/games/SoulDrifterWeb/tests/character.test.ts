import { describe, expect, it } from "vitest";
import npcData from "../public/data/npcs.json";
import {
  CALLINGS,
  deriveCharacter,
  MEMORY_QUESTIONS,
  RACES,
  raceCallingBonus,
  normalizeLegacyCharacterProfile,
  type CharacterDraft,
} from "../src/game/character";
import { buildDialogue, type NpcDatabase, type NpcStoryOverride } from "../src/game/npc";
import { characterPortraitPath } from "../src/characterCreation";

function completeDraft(raceId: string, callingId: string): CharacterDraft {
  const answers: Record<string, string> = {};
  for (const question of MEMORY_QUESTIONS) {
    const answer = question.answers[0];
    if (!answer) throw new Error(`Question ${question.id} has no answers.`);
    answers[question.id] = answer.id;
  }
  return {
    name: "Aster",
    raceId,
    callingId,
    appearance: { hairStyle: "shaved", skinTone: "ashen" },
    answers,
  };
}

describe("character weaving", () => {
  it("derives every race and calling combination and ships its starter sprite", () => {
    expect(RACES).toHaveLength(4);
    expect(CALLINGS).toHaveLength(9);

    for (const race of RACES) {
      for (const calling of CALLINGS) {
        const profile = deriveCharacter(completeDraft(race.id, calling.id));
        expect(profile.raceName).toBe(race.name);
        expect(profile.callingName).toBe(calling.name);
        expect(profile.skills).toContain(race.talent);
        expect(profile.skills).toContain(calling.signatureSkill);
        expect(profile.skills).toContain(calling.defensiveSkill);
        expect(profile.memoryConsequences).toHaveLength(MEMORY_QUESTIONS.length);
        expect(`/assets/generated/characters/${race.id}-${calling.id}.png`).toMatch(/\.png$/);
      }
    }
  });

  it("uses grave-plate greatsword art only for the high-level Shadowknight selection preview", () => {
    expect(characterPortraitPath("human", "shadowknight")).toBe("/assets/generated/characters/human-shadowknight-highlevel.png");
    expect(characterPortraitPath("elf", "shadowknight")).toBe("/assets/generated/characters/elf-shadowknight-highlevel.png");
    expect(characterPortraitPath("dwarf", "shadowknight")).toBe("/assets/generated/characters/dwarf-shadowknight-highlevel.png");
    expect(characterPortraitPath("halfling", "shadowknight")).toBe("/assets/generated/characters/halfling-shadowknight-highlevel.png");
    expect(characterPortraitPath("elf", "mage")).toBe("/assets/generated/characters/elf-mage.png");
  });

  it("requires every remembered answer", () => {
    const draft = completeDraft("human", "warrior");
    delete draft.answers.identity;
    expect(() => deriveCharacter(draft)).toThrow(/Soul Well offers/);
  });

  it("makes armored starters more forgiving and fragile casters scale from a harder start", () => {
    const mage = deriveCharacter(completeDraft("human", "mage"));
    const warrior = deriveCharacter(completeDraft("human", "warrior"));
    const paladin = deriveCharacter(completeDraft("human", "paladin"));
    expect(mage.maxHp).toBeLessThan(warrior.maxHp);
    expect(warrior.maxHp).toBeLessThan(paladin.maxHp);
    expect(CALLINGS.find((calling) => calling.id === "mage")?.lateGameCeiling).toBe("Extreme");
    expect(CALLINGS.find((calling) => calling.id === "paladin")?.learningCurve).toBe("Forgiving");
  });

  it("applies favored ancestry and calling resonance without locking other builds", () => {
    const dwarfShadowknight = deriveCharacter(completeDraft("dwarf", "shadowknight"));
    const elfShadowknight = deriveCharacter(completeDraft("elf", "shadowknight"));
    expect(raceCallingBonus("dwarf", "shadowknight")?.name).toBe("Ember Sepulcher");
    expect(dwarfShadowknight.skills).toContain("Ember Sepulcher");
    expect(elfShadowknight.callingName).toBe("Shadowknight");
    expect(elfShadowknight.ancestryCallingBonus).toBeUndefined();
  });

  it("non-destructively normalizes legacy identity and appearance without replacing the saved soul", () => {
    const current = deriveCharacter(completeDraft("elf", "shadowknight"));
    const legacy = {
      ...current,
      raceName: "Human",
      callingName: "Warrior",
      appearance: undefined,
      onboarding: { ilyraAnswered: true, storybookCompleted: true, storybookPage: 7 },
    } as unknown as typeof current;
    const normalized = normalizeLegacyCharacterProfile(legacy);
    expect(normalized).not.toBe(legacy);
    expect(normalized).toMatchObject({
      name: current.name,
      raceId: "elf",
      raceName: "Elf",
      callingId: "shadowknight",
      callingName: "Shadowknight",
      appearance: { hairStyle: "shaved", skinTone: "ashen" },
      appearanceNeedsReview: true,
      onboarding: legacy.onboarding,
    });
    expect(legacy.appearance).toBeUndefined();
    expect(normalized.skills).toEqual(current.skills);
  });
});

describe("data-authored NPC stories", () => {
  const database = npcData as NpcDatabase;
  const profile = deriveCharacter(completeDraft("elf", "summoner"));

  it("adds ancestry and calling lore to the shared opening", () => {
    const dialogue = buildDialogue(database, "ilyra", profile);
    expect(dialogue.lines).toHaveLength(5);
    expect(dialogue.lines.join(" ")).toContain("Elven memory");
    expect(dialogue.lines.join(" ")).toContain("shapes answering your commands");
    expect(dialogue.lines[0]).toContain(profile.name);
  });

  it("merges a saved story override without losing ancestry branches", () => {
    const override: NpcStoryOverride = {
      role: "Keeper of the Changed Well",
      scene: {
        opening: ["The breach changed while you slept, {name}."],
        raceLines: { elf: "Your long memory noticed first." },
      },
    };
    const dialogue = buildDialogue(database, "ilyra", profile, override);
    expect(dialogue.role).toBe("Keeper of the Changed Well");
    expect(dialogue.lines).toContain("The breach changed while you slept, Aster.");
    expect(dialogue.lines).toContain("Your long memory noticed first.");
    expect(dialogue.lines.join(" ")).toContain("shapes answering your commands");
    expect(dialogue.choices.length).toBeGreaterThan(0);
  });
});
