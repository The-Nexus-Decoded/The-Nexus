import { describe, expect, it } from "vitest";

import {
  filterHumanFoundationActions,
  humanFoundationActionLabel,
} from "../src/game/dungeons/breach-v2-human-foundation-review";

const actions = [
  "MaleLocomotion__Idle",
  "ProSwordAndShield__SwordAndShieldAttack",
  "GreatSword__GreatSwordAttack",
  "ProLongbow__StandingDrawArrow",
];

describe("Human Foundation animation review inventory", () => {
  it("filters across provider family and readable action words", () => {
    expect(filterHumanFoundationActions(actions, "great sword attack")).toEqual([
      "GreatSword__GreatSwordAttack",
    ]);
    expect(filterHumanFoundationActions(actions, "bow arrow")).toEqual([
      "ProLongbow__StandingDrawArrow",
    ]);
  });

  it("turns provider identifiers into labels without changing the source name", () => {
    expect(humanFoundationActionLabel(actions[1]!)).toBe("Pro Sword And Shield · Sword And Shield Attack");
    expect(actions[1]).toBe("ProSwordAndShield__SwordAndShieldAttack");
  });
});
