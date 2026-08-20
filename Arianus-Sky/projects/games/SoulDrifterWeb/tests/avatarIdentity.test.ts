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

  it("routes Shadowknight races through their lineage rigs (elf v2 / human)", () => {
    const elf = elfShadowknight();
    const human = { ...elf, raceId: "human", raceName: "Human" };
    const dwarf = { ...elf, raceId: "dwarf", raceName: "Dwarf" };
    const halfling = { ...elf, raceId: "halfling", raceName: "Halfling" };
    const elfPath = "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb";
    const humanPath = "/assets/3d/characters/human-shadowknight/human-shadowknight.glb";
    expect(resolvePlayerModelPath(elf)).toBe(elfPath);
    expect(resolvePlayerModelPath(human)).toBe(humanPath);
    expect(resolvePlayerModelPath(dwarf)).toBe(humanPath);
    expect(resolvePlayerModelPath(halfling)).toBe(humanPath);
  });

  it("keeps model and optional same-rig animation packs on one identity manifest", () => {
    const elf = elfShadowknight();
    const dwarf = { ...elf, raceId: "dwarf", raceName: "Dwarf" };

    const animationPacks = [...HUMANOID_ACTIVE_ANIMATION_PACKS, SIPHON_CLEAVE_PACK, WEAPON_STRIKE_PACK];
    expect(resolvePlayerAvatarManifest(elf)).toEqual({
      modelPath: "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb",
      animationPacks,
    });
    expect(resolvePlayerAvatarManifest(dwarf)).toEqual({
      modelPath: "/assets/3d/characters/human-shadowknight/human-shadowknight.glb",
      animationPacks,
    });

    const dwarfWarrior = { ...dwarf, callingId: "warrior" as const, callingName: "Warrior" };
    expect(resolvePlayerAvatarManifest(dwarfWarrior)).toEqual({
      modelPath: "/assets/3d/characters/warrior.gltf",
      animationPacks: [],
    });
  });
});
