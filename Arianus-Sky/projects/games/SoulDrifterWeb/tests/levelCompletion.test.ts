import { describe, expect, it } from "vitest";
import { resolveFirstMemoryAction } from "../src/game/levelCompletion";

describe("First Breach completion", () => {
  it("keeps the memory sealed until the Warden is defeated", () => {
    expect(resolveFirstMemoryAction({ bossDefeated: false, memoryClaimed: false, ascended: false })).toBe("sealed");
  });

  it("requires claiming the memory before ascending", () => {
    expect(resolveFirstMemoryAction({ bossDefeated: true, memoryClaimed: false, ascended: false })).toBe("claim");
    expect(resolveFirstMemoryAction({ bossDefeated: true, memoryClaimed: true, ascended: false })).toBe("ascend");
  });

  it("records arrival in the Above as the terminal state", () => {
    expect(resolveFirstMemoryAction({ bossDefeated: true, memoryClaimed: true, ascended: true })).toBe("arrived");
  });
});
