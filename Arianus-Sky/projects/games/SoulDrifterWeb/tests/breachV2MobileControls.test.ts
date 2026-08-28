import { describe, expect, it } from "vitest";

import {
  BREACH_V2_ISOMETRIC_MAX_DISTANCE,
  BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  resolveBreachV2PinchDistance,
} from "../src/game/dungeons/breach-v2-mobile-controls";

describe("BREACH-V2 mobile camera pinch", () => {
  it("zooms out when two fingers move closer together", () => {
    expect(resolveBreachV2PinchDistance(14.5, 160, 80)).toBe(29);
  });

  it("zooms in when two fingers move farther apart", () => {
    expect(resolveBreachV2PinchDistance(14.5, 80, 160)).toBe(7.25);
  });

  it("keeps a stationary pinch stable and clamps the playable camera range", () => {
    expect(resolveBreachV2PinchDistance(14.5, 120, 120)).toBe(14.5);
    expect(resolveBreachV2PinchDistance(35, 160, 40)).toBe(BREACH_V2_ISOMETRIC_MAX_DISTANCE);
    expect(resolveBreachV2PinchDistance(7, 40, 160)).toBe(BREACH_V2_ISOMETRIC_MIN_DISTANCE);
  });
});
