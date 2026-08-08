import { describe, expect, it } from "vitest";
import { findPath } from "../src/game/pathfinding";

describe("pathfinding", () => {
  it("routes around a blocked tile", () => {
    const blocked = new Set(["1,0"]);
    const path = findPath(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      ({ x, y }) => x >= 0 && x <= 2 && y >= 0 && y <= 2 && !blocked.has(`${x},${y}`),
    );

    expect(path).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
  });

  it("returns no path when the destination is sealed", () => {
    const path = findPath(
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      ({ x, y }) => x === 0 && y === 0,
    );
    expect(path).toEqual([]);
  });
});
