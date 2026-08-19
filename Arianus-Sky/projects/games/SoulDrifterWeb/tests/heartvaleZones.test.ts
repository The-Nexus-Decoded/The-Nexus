import { describe, expect, it } from "vitest";
import {
  HEARTVALE_ZONES,
  distanceToRect,
  getZone,
  nearestAdjacentEdge,
  zoneAt,
} from "../src/game/net/heartvaleZones";
import {
  HEARTVALE_ZONES as SERVER_ZONES,
  HEARTVALE_POIS,
  zoneAt as serverZoneAt,
} from "../server/sections.mjs";

describe("heartvale zone registry (client mirror)", () => {
  it("matches server/sections.mjs rects and adjacency exactly", () => {
    expect(HEARTVALE_ZONES).toHaveLength(SERVER_ZONES.length);
    for (const serverZone of SERVER_ZONES) {
      const clientZone = getZone(serverZone.id);
      expect(clientZone, serverZone.id).toBeTruthy();
      expect(clientZone!.rect).toEqual(serverZone.rect);
      expect([...clientZone!.adjacent].sort()).toEqual([...serverZone.adjacent].sort());
    }
  });

  it("zoneAt agrees with the server on a sampling sweep", () => {
    for (let x = 4200; x <= 7800; x += 137) {
      for (let z = 1400; z <= 4400; z += 129) {
        const client = zoneAt(x, z)?.id ?? null;
        const server = serverZoneAt(x, z)?.id ?? null;
        expect(client, `(${x}, ${z})`).toBe(server);
      }
    }
  });

  it("places every registered POI inside its declared zone", () => {
    for (const poi of HEARTVALE_POIS) {
      const [x, z] = poi.world;
      expect(zoneAt(x, z)?.id, poi.id).toBe(poi.zone);
    }
  });

  it("adjacency is symmetric", () => {
    for (const zone of HEARTVALE_ZONES) {
      for (const id of zone.adjacent) {
        expect(getZone(id)!.adjacent, `${zone.id} ↔ ${id}`).toContain(zone.id);
      }
    }
  });

  it("distanceToRect is zero inside and Euclidean outside", () => {
    const rect = { x0: 0, z0: 0, x1: 10, z1: 10 };
    expect(distanceToRect(5, 5, rect)).toBe(0);
    expect(distanceToRect(13, 5, rect)).toBe(3);
    expect(distanceToRect(13, 14, rect)).toBe(5);
  });

  it("nearestAdjacentEdge picks the genuinely closest neighbor", () => {
    // Mid hv-1, 30 m south of the hv-2 seam (z = 2531.25), inside hv-1.
    const north = nearestAdjacentEdge(5600, 2561.25);
    expect(north!.neighbor.id).toBe("hv-2");
    expect(north!.distance).toBeCloseTo(30, 5);
    // Same x, 40 m north of the hv-3 edge (shared edge at z = 2970).
    const south = nearestAdjacentEdge(5600, 2930);
    expect(south!.neighbor.id).toBe("hv-3");
    expect(south!.distance).toBeCloseTo(40, 5);
    // hv-6 mid-strip: east edge lands in hv-1 (x edge at 4980).
    const wilds = nearestAdjacentEdge(4950, 2700);
    expect(wilds!.current.id).toBe("hv-6");
    expect(wilds!.neighbor.id).toBe("hv-1");
    expect(wilds!.distance).toBeCloseTo(30, 5);
    // Outside every zone → null.
    expect(nearestAdjacentEdge(0, 0)).toBeNull();
  });
});
