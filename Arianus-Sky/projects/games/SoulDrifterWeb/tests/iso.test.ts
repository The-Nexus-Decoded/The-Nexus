import { describe, expect, it } from "vitest";
import { gridKey, isoToScreen, manhattan, screenToIso } from "../src/game/iso";

describe("isometric projection", () => {
  it.each([
    { x: 0, y: 0 },
    { x: 3, y: 10 },
    { x: 15, y: 8 },
    { x: 18, y: 12 },
  ])("round-trips grid point $x,$y", (point) => {
    const screen = isoToScreen(point);
    expect(screenToIso(screen.x, screen.y)).toEqual({ ...point, z: 0 });
  });

  it("produces stable grid keys and distances", () => {
    expect(gridKey({ x: 4, y: 9 })).toBe("4,9");
    expect(manhattan({ x: 2, y: 2 }, { x: 6, y: 5 })).toBe(7);
  });
});
