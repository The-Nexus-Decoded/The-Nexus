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
    expect(pages[0]!.narration.join(" ")).toContain("collectively called mensch");
    expect(pages[0]!.narration.join(" ")).toContain("not gods or demons");
    expect(pages.find((page) => page.id === "sundering")?.narration.join(" ")).toContain("Arianus, Pryan, Abarrach, and Chelestra");
    expect(pages.find((page) => page.id === "sundering")?.narration.join(" ")).toMatch(/fought over who would shape.+ordered, collective guidance.+individual will.+war for control/s);
    expect(pages.find((page) => page.id === "xar-and-haplo")?.narration.join(" ")).toMatch(/Xar.+most powerful living Patryn.+Lord of the Nexus.+returned into the Labyrinth.+Haplo/s);
    expect(pages.find((page) => page.id === "haplo-journey")?.narration.join(" ")).toMatch(/Alfred.+Sartan.+Xar's engineered chaos.+Haplo opposed his lord/s);
    expect(pages.find((page) => page.id === "seventh-gate")?.narration.join(" ")).toMatch(/Marit.+Patryn/s);
    expect(pages.find((page) => page.id === "souldrift")?.narration.join(" ")).toContain("SoulDrifters are dead mensch returned");
    expect(pages.at(-1)?.title).toContain("Vaelis");
    expect(pages.at(-1)?.narration.join(" ")).toContain("Elf Shadowknight");
    expect(pages.at(-1)?.narration.join(" ")).toContain("I am Ilyra, a mensch Wellkeeper");
    expect(new Set(pages.map((page) => page.id)).size).toBe(pages.length);
  });
});
