import { describe, expect, it } from "vitest";
import { deriveCharacter, MEMORY_QUESTIONS, type CharacterDraft } from "../src/game/character";
import {
  resolveCharacterIdentity,
  resolvePlayerAvatarManifest,
  resolvePlayerModelPath,
} from "../src/game/avatarIdentity";
import {
  HUMANOID_ACTIVE_ANIMATION_PACKS,
  SIPHON_CLEAVE_PACK,
  WEAPON_STRIKE_PACK,
} from "../src/game/animationPacks";

function elfShadowknight() {
  const answers = Object.fromEntries(MEMORY_QUESTIONS.map((question) => [question.id, question.answers[0]!.id]));
  const draft: CharacterDraft = {
    name: "Aster",
    raceId: "elf",
    callingId: "shadowknight",
    appearance: { hairStyle: "silver-sweep", skinTone: "ashen" },
    answers,
  };
  return deriveCharacter(draft);
}

describe("canonical avatar identity", () => {
  it("derives visible race and calling from canonical IDs even when saved display names drift", () => {
    const stale = { ...elfShadowknight(), raceName: "Human", callingName: "Warrior" };
    expect(resolveCharacterIdentity(stale)).toMatchObject({
      raceId: "elf",
      raceName: "Elf",
      callingId: "shadowknight",
      callingName: "Shadowknight",
    });
  });

  it("routes every supported humanoid Shadowknight race through a compatible rig", () => {
    const elf = elfShadowknight();
    const human = { ...elf, raceId: "human", raceName: "Human" };
    const dwarf = { ...elf, raceId: "dwarf", raceName: "Dwarf" };
    const halfling = { ...elf, raceId: "halfling", raceName: "Halfling" };
    expect(resolvePlayerModelPath(elf)).toBe("/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb");
    expect(resolvePlayerModelPath(human)).toBe("/assets/3d/characters/human-shadowknight/human-shadowknight.glb");
    expect(resolvePlayerModelPath(dwarf)).toBe(resolvePlayerModelPath(human));
    expect(resolvePlayerModelPath(halfling)).toBe(resolvePlayerModelPath(human));
  });

  it("keeps model and optional same-rig animation packs on one identity manifest", () => {
    const elf = elfShadowknight();
    const dwarf = { ...elf, raceId: "dwarf", raceName: "Dwarf" };

    const elfExpected = {
      modelPath: "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb",
      animationPacks: [...HUMANOID_ACTIVE_ANIMATION_PACKS, SIPHON_CLEAVE_PACK, WEAPON_STRIKE_PACK],
    };
    const humanExpected = {
      modelPath: "/assets/3d/characters/human-shadowknight/human-shadowknight.glb",
      animationPacks: [...HUMANOID_ACTIVE_ANIMATION_PACKS, SIPHON_CLEAVE_PACK, WEAPON_STRIKE_PACK],
    };
    expect(resolvePlayerAvatarManifest(elf)).toEqual(elfExpected);
    expect(resolvePlayerAvatarManifest(dwarf)).toEqual(humanExpected);

    const dwarfWarrior = { ...dwarf, callingId: "warrior" as const, callingName: "Warrior" };
    expect(resolvePlayerAvatarManifest(dwarfWarrior)).toEqual({
      modelPath: "/assets/3d/characters/warrior.gltf",
      animationPacks: [],
    });
  });
});
