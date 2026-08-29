import { describe, expect, it } from "vitest";
import npcData from "../public/data/npcs.json";
import {
  BODY_TYPES,
  CALLINGS,
  deriveCharacter,
  FACE_TYPES,
  FACIAL_HAIR_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MEMORY_QUESTIONS,
  RACES,
  raceCallingBonus,
  raceCallingEligibility,
  normalizeLegacyCharacterProfile,
  resolveCharacterAppearance,
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
  it("derives allowed and rare combinations while rejecting every forbidden matrix cell", () => {
    expect(RACES).toHaveLength(4);
    expect(CALLINGS).toHaveLength(9);

    for (const race of RACES) {
      for (const calling of CALLINGS) {
        const eligibility = raceCallingEligibility(race.id, calling.id);
        if (eligibility.status === "forbidden") {
          expect(() => deriveCharacter(completeDraft(race.id, calling.id))).toThrow(`${race.name} cannot become ${calling.name}`);
          continue;
        }
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

  it("normalizes the current Human pilot body and modular head contract", () => {
    const human = deriveCharacter(completeDraft("human", "warrior"));
    expect(BODY_TYPES.map((body) => body.id)).toEqual(["foundation"]);
    expect(FACE_TYPES.map((face) => face.id)).toEqual(["foundation"]);
    expect(HAIR_STYLES.map((style) => style.id)).toEqual([
      "shaved-buzzed", "cropped", "parted", "curly-coiled", "long", "tied-back", "braided",
    ]);
    expect(FACIAL_HAIR_STYLES.map((style) => style.id)).toEqual([
      "none", "stubble", "moustache", "goatee", "short-beard", "full-beard",
    ]);
    expect(Object.keys(HAIR_COLORS)).toEqual([
      "black", "dark-brown", "medium-brown", "light-brown", "auburn", "copper-red",
      "golden-blonde", "ash-blonde", "grey", "white",
    ]);
    expect(human.appearance).toMatchObject({
      hairStyle: "shaved-buzzed",
      skinTone: "ashen",
      facialHair: "none",
      hairColor: "dark-brown",
      age: 0,
      hairGreying: 0,
      facialHairGreying: 0,
      bodyType: "foundation",
      faceType: "foundation",
    });
  });

  it("preserves skin tone while canonicalizing aliases and clamping adult appearance controls", () => {
    const resolved = resolveCharacterAppearance({
      hairStyle: "silver-sweep",
      skinTone: "deep",
      facialHair: "short-beard",
      hairColor: "auburn",
      age: 1.7,
      hairGreying: -0.4,
      facialHairGreying: 0.65,
    });

    expect(resolved).toEqual({
      hairStyle: "long",
      skinTone: "deep",
      facialHair: "short-beard",
      hairColor: "auburn",
      age: 1,
      hairGreying: 0,
      facialHairGreying: 0.65,
      bodyType: "foundation",
      faceType: "foundation",
    });
  });

  it("locks the owner-approved forbidden and rare ancestry paths", () => {
    expect(raceCallingEligibility("dwarf", "mage").status).toBe("forbidden");
    expect(raceCallingEligibility("dwarf", "shadowknight").status).toBe("forbidden");
    expect(raceCallingEligibility("halfling", "mage").status).toBe("forbidden");
    expect(raceCallingEligibility("halfling", "shadowknight").status).toBe("forbidden");
    expect(raceCallingEligibility("dwarf", "sharpshooter").status).toBe("allowed");
    expect(raceCallingEligibility("elf", "shadowknight").status).toBe("rare");
  });

  it("applies the approved ancestry baselines", () => {
    const human = deriveCharacter(completeDraft("human", "priest"));
    const elf = deriveCharacter(completeDraft("elf", "priest"));
    const dwarf = deriveCharacter(completeDraft("dwarf", "priest"));
    const halfling = deriveCharacter(completeDraft("halfling", "priest"));
    expect(human.skills).toContain("Adaptive Training");
    expect(elf.stats.insight).toBe(human.stats.insight + 2);
    expect(dwarf.stats.will).toBeGreaterThan(halfling.stats.will);
    expect(dwarf.stats.vitality).toBe(human.stats.vitality + 1);
    expect(halfling.stats.finesse).toBe(human.stats.finesse + 2);
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

  it("applies favored ancestry resonance while rare builds remain viable", () => {
    const dwarfPriest = deriveCharacter(completeDraft("dwarf", "priest"));
    const elfShadowknight = deriveCharacter(completeDraft("elf", "shadowknight"));
    expect(raceCallingBonus("dwarf", "priest")?.name).toBe("Ancestor Litany");
    expect(dwarfPriest.skills).toContain("Ancestor Litany");
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
      appearanceNeedsReview: false,
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
      appearance: {
        hairStyle: "shaved-buzzed",
        skinTone: "ashen",
        facialHair: "none",
        hairColor: "dark-brown",
        age: 0,
        hairGreying: 0,
        facialHairGreying: 0,
        bodyType: "foundation",
        faceType: "foundation",
      },
      appearanceNeedsReview: true,
      onboarding: legacy.onboarding,
    });
    expect(legacy.appearance).toBeUndefined();
    expect(normalized.skills).toEqual(current.skills);
  });

  it("preserves but refuses to normalize a legacy forbidden pairing", () => {
    const allowed = deriveCharacter(completeDraft("human", "shadowknight"));
    const legacy = { ...allowed, raceId: "dwarf", raceName: "Dwarf" };
    expect(() => normalizeLegacyCharacterProfile(legacy)).toThrow("Dwarf cannot become Shadowknight");
    expect(legacy.callingId).toBe("shadowknight");
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
