import { describe, expect, it } from "vitest";
import { deriveCharacter, MEMORY_QUESTIONS, type CharacterDraft } from "../src/game/character";
import { resolveCharacterIdentity, resolvePlayerModelPath } from "../src/game/avatarIdentity";

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

  it("routes the Elf Shadowknight to its exact avatar without forcing that Elf model on other races", () => {
    const elf = elfShadowknight();
    const human = { ...elf, raceId: "human", raceName: "Human" };
    expect(resolvePlayerModelPath(elf)).toBe("/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb");
    expect(resolvePlayerModelPath(human))
      .toBe("/assets/3d/characters/shadowknight.gltf");
  });
});
