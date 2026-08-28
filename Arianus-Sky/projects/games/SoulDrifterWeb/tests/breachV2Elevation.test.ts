/**
 * BREACH-V2 runtime elevation sampling (issue #451).
 * The browser shell, doors, props, and player all consume this same sampler.
 */
import { describe, expect, it } from "vitest";

import { floorElevationAt, hasDungeonFloorAt } from "../src/game/dungeons/breach-v2-preview";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

describe("BREACH-V2 upward runtime topology", () => {
  for (const path of ["wayfarer", "oathbreaker"] as const) {
    it(`samples the authored ${path} ascent without flat or descending seams`, () => {
      const layout = buildBreachV2Layout(4182, path, DUNGEON_PROP_ASSETS);

      expect(floorElevationAt(layout, 10.5, 14.2)).toBeCloseTo(0, 6);
      expect(floorElevationAt(layout, 30, 11)).toBeCloseTo(0.4, 6);
      expect(floorElevationAt(layout, 36, 11)).toBeCloseTo(0.8, 6);

      const routeCorridors = layout.corridors.filter((corridor) => (
        corridor.id === "corridor-entry" || corridor.id.startsWith("corridor-out-")
      ));
      const routeElevations = routeCorridors.flatMap((corridor) => corridor.elevations);
      for (let index = 1; index < routeElevations.length; index += 1) {
        expect(routeElevations[index]!).toBeGreaterThanOrEqual(routeElevations[index - 1]!);
      }

      // The duplicate bend in vault-exit must not mask the real final rise.
      expect(floorElevationAt(layout, 247, 11)).toBeCloseTo(7.6, 6);
      expect(floorElevationAt(layout, 247, 12)).toBeCloseTo(7.9, 6);

      const wayUpward = [
        floorElevationAt(layout, 242, 15),
        floorElevationAt(layout, 246, 15),
        floorElevationAt(layout, 250, 15),
        floorElevationAt(layout, 254, 15),
        floorElevationAt(layout, 258, 15),
      ];
      expect(wayUpward).toEqual([...wayUpward].sort((a, b) => a - b));
      expect(wayUpward[0]).toBeCloseTo(7.9, 6);
      expect(wayUpward.at(-1)).toBeCloseTo(10.4, 6);
      expect(floorElevationAt(layout, 262, 15)).toBeCloseTo(10.4, 6);
      expect(hasDungeonFloorAt(layout, 261.9, 15)).toBe(true);
      expect(hasDungeonFloorAt(layout, 262.4, 15)).toBe(false);
    });
  }
});
