import { describe, expect, it } from "vitest";
import { MEMORY_QUESTIONS, deriveCharacter } from "../src/game/character";
import { prologuePages } from "../src/game/prologue";

describe("Chronicle of Returning", () => {
  it("separates historical Cycle pages from the SoulDrifter continuation and ends with the active soul", () => {
    const profile = deriveCharacter({
      name: "Vaelis",
      raceId: "elf",
      callingId: "shadowknight",
      appearance: { hairStyle: "shaved", skinTone: "ashen" },
      answers: Object.fromEntries(MEMORY_QUESTIONS.map((question) => [question.id, question.answers[0]!.id])),
    });
    const pages = prologuePages(profile);
    expect(pages).toHaveLength(7);
    expect(pages[0]!.era).toBe("The Death Gate Cycle");
    expect(pages.find((page) => page.id === "souldrift")?.era).toBe("SoulDrifter continuation");
    expect(pages[0]!.narration.join(" ")).toContain("Nuclear and antimatter war");
    expect(pages.find((page) => page.id === "sundering")?.narration.join(" ")).toContain("Arianus, Pryan, Abarrach, and Chelestra");
    expect(pages.at(-1)?.title).toContain("Vaelis");
    expect(pages.at(-1)?.narration.join(" ")).toContain("Elf Shadowknight");
    expect(new Set(pages.map((page) => page.id)).size).toBe(pages.length);
  });
});
