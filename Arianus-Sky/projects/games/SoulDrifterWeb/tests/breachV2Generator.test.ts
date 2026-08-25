/**
 * BREACH-V2 generator invariants (runbook §4, issue #451).
 * Seeded generation from the flat-map-derived registry; the RNG chooses
 * subset + order, never what exists.
 */
import { describe, expect, it } from "vitest";
import {
  breachV2CellKey, generateBreachV2,
  type BreachV2PathId, type GeneratedBreachV2,
} from "../src/game/dungeons/breach-v2-generator";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { BREACH_V2_REGISTRY as R } from "../src/game/dungeons/breach-v2-registry.mjs";

const NAV = R.units.navCellMeters;
const PATHS: BreachV2PathId[] = ["wayfarer", "oathbreaker"];

function cellAt(x: number, y: number) {
  return { col: Math.floor(x / NAV), row: Math.floor(y / NAV) };
}

function walkableKeys(gen: GeneratedBreachV2): Set<string> {
  const blocked = new Set(gen.blockedCells.map(breachV2CellKey));
  return new Set(
    gen.navCells.map(breachV2CellKey).filter((key) => !blocked.has(key)),
  );
}

function reachableCells(gen: GeneratedBreachV2): Set<string> {
  const walkable = walkableKeys(gen);
  const visited = new Set<string>();
  const start = cellAt(gen.playerStart.x, gen.playerStart.y);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = breachV2CellKey(cell);
    if (visited.has(key) || !walkable.has(key)) continue;
    visited.add(key);
    queue.push(
      { col: cell.col + 1, row: cell.row },
      { col: cell.col - 1, row: cell.row },
      { col: cell.col, row: cell.row + 1 },
      { col: cell.col, row: cell.row - 1 },
    );
  }
  return visited;
}

function hasReachableAdjacent(x: number, y: number, reachable: Set<string>): boolean {
  const cell = cellAt(x, y);
  return [
    { col: cell.col + 1, row: cell.row },
    { col: cell.col - 1, row: cell.row },
    { col: cell.col, row: cell.row + 1 },
    { col: cell.col, row: cell.row - 1 },
    cell,
  ].some((c) => reachable.has(breachV2CellKey(c)));
}

function playerPointWalkable(gen: GeneratedBreachV2, x: number, y: number): boolean {
  const walkable = walkableKeys(gen);
  const radius = 0.35;
  return ([[radius, radius], [radius, -radius], [-radius, radius], [-radius, -radius]] as const)
    .every(([ox, oy]) => walkable.has(breachV2CellKey(cellAt(x + ox, y + oy))));
}

describe("BREACH-V2 seeded generator", () => {
  it("is deterministic for a recorded run seed (both paths)", () => {
    for (const pathId of PATHS) {
      expect(generateBreachV2(4182, pathId)).toEqual(generateBreachV2(4182, pathId));
    }
  });

  it("varies layout across seeds", () => {
    const a = generateBreachV2(4182, "wayfarer");
    const b = generateBreachV2(4183, "wayfarer");
    expect(a.chambers.map((c) => c.poolRoomId)).not.toEqual(b.chambers.map((c) => c.poolRoomId));
  });

  it("runs 3-5 chambers on every seed, both counts reachable across the sweep", () => {
    for (const pathId of PATHS) {
      const counts = new Set<number>();
      for (let seed = 1; seed <= 200; seed += 1) {
        const gen = generateBreachV2(seed, pathId);
        expect(gen.chamberCount).toBeGreaterThanOrEqual(3);
        expect(gen.chamberCount).toBeLessThanOrEqual(5);
        expect(gen.chambers).toHaveLength(gen.chamberCount);
        counts.add(gen.chamberCount);
      }
      expect(counts).toEqual(new Set([3, 4, 5]));
    }
  });

  it("honors pool separation and never duplicates rooms in a run", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const easy = generateBreachV2(seed, "wayfarer");
      const hard = generateBreachV2(seed, "oathbreaker");
      expect(easy.chambers.every((c) => c.poolRoomId.startsWith("E-"))).toBe(true);
      expect(hard.chambers.every((c) => c.poolRoomId.startsWith("H-"))).toBe(true);
      for (const gen of [easy, hard]) {
        expect(new Set(gen.chambers.map((c) => c.poolRoomId)).size).toBe(gen.chamberCount);
      }
    }
  });

  it("door/socket integrity: every corridor joins real door sockets", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const path = R.paths[pathId];
      // entry corridor: plaza door -> first chamber W door
      const entry = gen.corridors.find((c) => c.id === "corridor-entry")!;
      const doorLm = R.landmarks.find((l) => l.id === `door-${pathId}`)!;
      const plaza = R.fixedRooms.find((r) => r.id === "threshold-plaza")!;
      expect(entry.from.x).toBeCloseTo(plaza.x + doorLm.x, 6);
      expect(entry.from.y).toBeCloseTo(plaza.y + doorLm.y, 6);
      const first = gen.chambers[0]!;
      expect(Math.hypot(entry.to.x - first.x, entry.to.y - (first.y + first.h / 2))).toBeLessThanOrEqual(0.01);
      // out corridors: chamber E door -> next W door / convergence socket
      gen.corridors.filter((c) => c.id.startsWith("corridor-out-")).forEach((c, i) => {
        const ch = gen.chambers[i]!;
        expect(Math.hypot(c.from.x - (ch.x + ch.w), c.from.y - (ch.y + ch.h / 2))).toBeLessThanOrEqual(0.01);
        if (i + 1 < gen.chambers.length) {
          const next = gen.chambers[i + 1]!;
          expect(Math.hypot(c.to.x - next.x, c.to.y - (next.y + next.h / 2))).toBeLessThanOrEqual(0.01);
        } else {
          expect(c.to.x).toBeCloseTo(path.convergenceSocket[0], 6);
          expect(c.to.y).toBeCloseTo(path.convergenceSocket[1], 6);
        }
        expect(c.width).toBe(path.corridorWidthMeters);
      });
    }
  });

  it("keeps the post-boss route sequential through the memory vault and Way Upward", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const connectorIds = gen.corridors.map((corridor) => corridor.id);
      expect(connectorIds).toEqual(expect.arrayContaining([
        "conv-ante",
        "ante-boss",
        "boss-vault",
        "vault-exit",
        "heartvale-exit",
      ]));
      expect(connectorIds).not.toContain("boss-exit");

      const bossRoom = R.fixedRooms.find((room) => room.id === "ashen-lock")!;
      const vaultRoom = R.fixedRooms.find((room) => room.id === "memory-vault")!;
      const exitRoom = R.fixedRooms.find((room) => room.id === "exit-connector")!;
      const bossVault = gen.corridors.find((corridor) => corridor.id === "boss-vault")!;
      const vaultExit = gen.corridors.find((corridor) => corridor.id === "vault-exit")!;
      const heartvaleExit = gen.corridors.find((corridor) => corridor.id === "heartvale-exit")!;

      expect(bossVault.from.x).toBeCloseTo(bossRoom.x + bossRoom.w, 6);
      expect(bossVault.to.x).toBeCloseTo(vaultRoom.x, 6);
      expect(bossVault.from.y).toBeGreaterThan(bossRoom.y);
      expect(bossVault.from.y).toBeLessThan(bossRoom.y + bossRoom.h);
      expect(bossVault.to.y).toBeGreaterThan(vaultRoom.y);
      expect(bossVault.to.y).toBeLessThan(vaultRoom.y + vaultRoom.h);

      expect(vaultExit.from.y).toBeCloseTo(vaultRoom.y + vaultRoom.h, 6);
      expect(vaultExit.to.y).toBeCloseTo(exitRoom.y, 6);
      expect(vaultExit.from.x).toBeCloseTo(vaultRoom.x + vaultRoom.w / 2, 6);
      expect(vaultExit.to.x).toBeCloseTo(exitRoom.x + 5, 6);

      expect(heartvaleExit.from.x).toBeCloseTo(exitRoom.x + exitRoom.w, 6);
      expect(heartvaleExit.from.y).toBeCloseTo(exitRoom.y + exitRoom.h / 2, 6);
      expect(heartvaleExit.to.x).toBeGreaterThan(heartvaleExit.from.x);
      expect(heartvaleExit.to.y).toBeCloseTo(heartvaleExit.from.y, 6);
    }
  });

  it("preserves a monotonic authored ascent from the Vestibule to Heartvale", () => {
    for (const pathId of PATHS) {
      for (const seed of [7, 1, 2, 4182]) {
        const gen = generateBreachV2(seed, pathId);
        const chamberElevations = gen.chambers.map((chamber) => chamber.floorElevation);
        expect(chamberElevations).toEqual([...chamberElevations].sort((a, b) => a - b));
        expect(new Set(chamberElevations).size).toBe(chamberElevations.length);

        for (const corridor of gen.corridors) {
          expect(corridor.elevations[0], corridor.id).toBeCloseTo(corridor.fromElevation, 6);
          expect(corridor.elevations[corridor.elevations.length - 1], corridor.id)
            .toBeCloseTo(corridor.toElevation, 6);
          expect(corridor.elevations, corridor.id)
            .toEqual([...corridor.elevations].sort((a, b) => a - b));
        }

        const entry = gen.corridors.find((corridor) => corridor.id === "corridor-entry")!;
        const heartvale = gen.corridors.find((corridor) => corridor.id === "heartvale-exit")!;
        expect(entry.fromElevation).toBe(R.fixedRooms.find((room) => room.id === "threshold-plaza")!.floorElevation);
        expect(entry.toElevation).toBe(gen.chambers[0]!.floorElevation);
        expect(heartvale.fromElevation).toBe(R.worldAnchor.elevation);
        expect(heartvale.toElevation).toBe(R.worldAnchor.elevation);
        expect(gen.playerStart.floorElevation).toBe(0);
        expect(gen.exitPoint.floorElevation).toBeGreaterThan(gen.firstMemory.floorElevation);
        expect(gen.exitPoint.floorElevation).toBeLessThan(R.worldAnchor.elevation);
      }
    }
  });

  it("constructively embeds each accepted room from the prior shared boundary", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const pathId of PATHS) {
        const gen = generateBreachV2(seed, pathId);
        const entry = gen.corridors.find((corridor) => corridor.id === "corridor-entry")!;
        const path = R.paths[pathId];

        expect(gen.placement.rootRoomId).toBe("vestibule");
        expect(gen.placement.attempts).toHaveLength(gen.chamberCount);
        expect(gen.placement.attempts.every((attempt) => attempt.accepted)).toBe(true);
        expect(gen.placement.backtracks).toEqual([]);
        expect(gen.placement.rejectedCandidates).toEqual([]);

        let acceptedEastBoundary = entry.from.x;
        for (const [index, chamber] of gen.chambers.entries()) {
          const attempt = gen.placement.attempts[index]!;
          expect(chamber.x, `${pathId} seed ${seed} room ${chamber.id}`)
            .toBeGreaterThan(acceptedEastBoundary);
          expect(chamber.x - acceptedEastBoundary)
            .toBeGreaterThanOrEqual(path.corridorWidthMeters - 0.01);
          expect(attempt.roomId).toBe(chamber.id);
          expect(attempt.destinationSocket.x).toBeCloseTo(chamber.x, 6);
          expect(attempt.connectorGap).toBeCloseTo(chamber.x - acceptedEastBoundary, 6);
          acceptedEastBoundary = chamber.x + chamber.w;
        }

        expect(path.convergenceSocket[0] - acceptedEastBoundary)
          .toBeGreaterThanOrEqual(path.corridorWidthMeters - 0.01);
      }
    }
  });

  it("routes corridor endpoints normal to room walls with explicit polyline elevations", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const routeCorridors = gen.corridors.filter((corridor) => (
        corridor.id === "corridor-entry" || corridor.id.startsWith("corridor-out-")
      ));

      for (const corridor of routeCorridors) {
        expect(corridor.points.length, corridor.id).toBeGreaterThanOrEqual(2);
        expect(corridor.elevations, corridor.id).toHaveLength(corridor.points.length);
        for (let index = 0; index < corridor.points.length - 1; index += 1) {
          const a = corridor.points[index]!;
          const b = corridor.points[index + 1]!;
          expect(Math.hypot(b.x - a.x, b.y - a.y), `${corridor.id} segment ${index}`)
            .toBeGreaterThan(0.01);
        }

        const first = corridor.points[0]!;
        const firstInside = corridor.points[1]!;
        const lastInside = corridor.points[corridor.points.length - 2]!;
        const last = corridor.points[corridor.points.length - 1]!;
        expect(firstInside.y, `${corridor.id} source approach`).toBeCloseTo(first.y, 6);
        expect(lastInside.y, `${corridor.id} destination approach`).toBeCloseTo(last.y, 6);
        expect(Math.abs(firstInside.x - first.x), `${corridor.id} source normal`).toBeGreaterThan(0.01);
        expect(Math.abs(last.x - lastInside.x), `${corridor.id} destination normal`).toBeGreaterThan(0.01);
      }
    }
  });

  it("records the full progression graph including the Heartvale portal transfer", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const edges = new Map(gen.logicalGraph.edges.map((edge) => [edge.edgeId, edge]));

      for (const corridor of gen.corridors) {
        expect(edges.get(corridor.id)).toMatchObject({
          sourceNode: corridor.sourceRoomId,
          destinationNode: corridor.destinationRoomId,
          connectionType: corridor.connectionType,
          requiredForProgression: true,
        });
      }

      expect(edges.get("vestibule-plaza-link")).toMatchObject({
        sourceNode: "vestibule",
        destinationNode: "plaza-link",
        connectionType: "VERTICAL_TRANSITION",
      });
      expect(edges.get("plaza-link-threshold")).toMatchObject({
        sourceNode: "plaza-link",
        destinationNode: "threshold-plaza",
        connectionType: "VERTICAL_TRANSITION",
      });
      expect(edges.get("heartvale-transfer")).toEqual({
        edgeId: "heartvale-transfer",
        sourceNode: "heartvale-threshold",
        destinationNode: "heartvale-hv-1",
        connectionType: "PORTAL_TRANSFER",
        requiredForProgression: true,
      });
    }
  });

  it("passes the SEA whole-level topology gate with one canonical shell inventory", () => {
    for (const pathId of PATHS) {
      const manifest = buildBreachV2Layout(4182, pathId, {}).topology;
      const {
        requiredLogicalEdges,
        physicallyResolvedEdges,
        connectedPhysicalComponents,
        ...failureMetrics
      } = manifest.metrics;
      const boundaryIds = manifest.boundaries.map((boundary) => boundary.boundaryId);
      const apertures = manifest.boundaries.flatMap((boundary) => boundary.apertures);
      const apertureIds = apertures.map((aperture) => aperture.apertureId);
      const aperturesById = new Map(apertures.map((aperture) => [aperture.apertureId, aperture]));
      const assemblies = apertures.map((aperture) => aperture.assembly);

      expect(manifest.automatedGate).toBe("PASS");
      expect(manifest.status).toBe("PLAN_GATE_PASS_REVIEW_REQUIRED");
      expect(physicallyResolvedEdges).toBe(requiredLogicalEdges);
      expect(connectedPhysicalComponents).toBe(1);
      expect(Object.values(failureMetrics).every((value) => value === 0)).toBe(true);
      expect(new Set(boundaryIds).size).toBe(boundaryIds.length);
      expect(new Set(apertureIds).size).toBe(apertureIds.length);
      expect(manifest.boundaries.some((boundary) => boundary.classification === "SHARED_WALL")).toBe(true);
      expect(manifest.boundaries.some((boundary) => boundary.classification === "CORRIDOR_WALL")).toBe(true);
      expect(manifest.connections.every((connection) => (
        connection.physicalResolutionStatus === "RESOLVED"
        && connection.sourceApertureId.length > 0
        && connection.destinationApertureId.length > 0
        && connection.sourceApproachNormal
        && connection.destinationApproachNormal
        && aperturesById.get(connection.sourceApertureId)!.clearWidth >= connection.clearWidth
        && aperturesById.get(connection.destinationApertureId)!.clearWidth >= connection.clearWidth
      ))).toBe(true);
      expect(manifest.connections.every((connection) => (
        connection.transition.rise === 0
        || (connection.transition.mode === "STAIRS" && connection.transition.recommendedSteps > 0)
      ))).toBe(true);
      expect(assemblies).toEqual(expect.arrayContaining(["PORTCULLIS", "DOOR", "PORTAL"]));
      expect(manifest.topDownDiagnostic.layers).toEqual(expect.arrayContaining([
        "room_polygons_and_ids",
        "wall_segments_and_boundary_ids",
        "apertures",
        "doors_gates_portcullises",
        "corridor_polygons_and_centerlines",
        "navigation_clearance",
        "floor_elevations",
        "vertical_transitions",
        "logical_edges",
        "physical_edge_matches",
        "overlap_and_error_overlays",
      ]));
    }
  });

  it("keeps every objective and encounter reachable on a 500-seed sweep (both paths)", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      for (const pathId of PATHS) {
        const gen = generateBreachV2(seed, pathId);
        const reachable = reachableCells(gen);
        for (const ch of gen.chambers) {
          expect(hasReachableAdjacent(ch.x + ch.w / 2, ch.y + ch.h / 2, reachable),
            `chamber ${ch.poolRoomId} seed ${seed} ${pathId}`).toBe(true);
        }
        expect(hasReachableAdjacent(gen.boss.x, gen.boss.y, reachable), `boss seed ${seed}`).toBe(true);
        expect(hasReachableAdjacent(gen.firstMemory.x, gen.firstMemory.y, reachable), `memory ${seed}`).toBe(true);
        expect(hasReachableAdjacent(gen.exitPoint.x, gen.exitPoint.y, reachable), `exit ${seed}`).toBe(true);
        // NPCs, interactions, enemies, loot chests
        const vestibule = R.fixedRooms.find((r) => r.id === "vestibule")!;
        for (const lm of R.landmarks) {
          const room = R.fixedRooms.find((r) => r.id === lm.roomId)!;
          expect(hasReachableAdjacent(room.x + lm.x, room.y + lm.y, reachable),
            `landmark ${lm.id} seed ${seed} ${pathId}`).toBe(true);
        }
        for (const enemy of gen.enemies) {
          expect(hasReachableAdjacent(enemy.x, enemy.y, reachable),
            `enemy ${enemy.id} seed ${seed} ${pathId}`).toBe(true);
        }
        for (const chest of gen.placements.filter((p) => p.role === "loot-cache")) {
          expect(hasReachableAdjacent(chest.worldX, chest.worldY, reachable),
            `chest ${chest.roomId} seed ${seed} ${pathId}`).toBe(true);
        }
        expect(vestibule.kind).toBe("start");
      }
    }
  });

  it("never blocks doors, spawn sockets, or interaction approaches", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const pathId of PATHS) {
        const gen = generateBreachV2(seed, pathId);
        const blocked = new Set(gen.blockedCells.map(breachV2CellKey));
        const walkable = walkableKeys(gen);
        // every corridor endpoint cell stays walkable (door approach)
        for (const c of gen.corridors) {
          for (const p of [c.from, c.to]) {
            const key = breachV2CellKey(cellAt(p.x, p.y));
            expect(blocked.has(key), `door ${c.id} seed ${seed}`).toBe(false);
            expect(walkable.has(key), `door cell ${c.id} seed ${seed}`).toBe(true);
          }
        }
        // spawn sockets stay walkable
        for (const enemy of gen.enemies) {
          expect(blocked.has(breachV2CellKey(cellAt(enemy.x, enemy.y))), `spawn ${enemy.id}`).toBe(false);
        }
        // player start walkable
        expect(walkable.has(breachV2CellKey(cellAt(gen.playerStart.x, gen.playerStart.y)))).toBe(true);
      }
    }
  });

  it("keeps a full player-width approach clear through either selected route gate", () => {
    for (const pathId of PATHS) {
      const gen = generateBreachV2(4182, pathId);
      const entry = gen.corridors.find((corridor) => corridor.id === "corridor-entry")!;
      for (let x = entry.from.x - 3; x <= entry.from.x + 5; x += 0.5) {
        expect(playerPointWalkable(gen, x, entry.from.y),
          `${pathId} route blocked at (${x}, ${entry.from.y})`).toBe(true);
      }
    }
  });

  it("exactly one boss per run, seeded pattern from the canon set", () => {
    const patterns = new Set(["cinder-sweep", "ash-call", "soul-tax"]);
    for (let seed = 1; seed <= 60; seed += 1) {
      const gen = generateBreachV2(seed, "wayfarer");
      expect(gen.boss.id).toBe("cinderbound-warden");
      expect(patterns.has(gen.boss.pattern)).toBe(true);
      expect(R.bossSet.anchorSockets.some(
        ([x, y]) => x === gen.boss.anchorSocket[0] && y === gen.boss.anchorSocket[1],
      )).toBe(true);
    }
  });

  it("easy vs hard is meaningful: enemies, pressure, rewards", () => {
    const easy = generateBreachV2(4182, "wayfarer");
    const hard = generateBreachV2(4182, "oathbreaker");
    expect(easy.enemies).toHaveLength(3);
    expect(hard.enemies).toHaveLength(5);
    expect(hard.galleryPressure).toBeGreaterThan(easy.galleryPressure);
    expect(hard.bossPressure).toBeGreaterThan(easy.bossPressure);
    expect(easy.bonusSkillAwakened).toBeNull();
    expect(typeof hard.bonusSkillAwakened).toBe("boolean");
    expect(easy.rewardId).toBe("tempered-training-gear");
    expect(hard.rewardId).toBe("grave-iron-class-implement");
  });

  it("comparison seed 4182 stays pinned (direct comparison with #450)", () => {
    // pinned snapshot — regenerate expectations ONLY via a conscious design change
    expect(generateBreachV2(4182, "wayfarer").chambers.map((c) => c.poolRoomId))
      .toEqual(["E-04", "E-05", "E-06", "E-07", "E-01"]);
    expect(generateBreachV2(4182, "oathbreaker").chambers.map((c) => c.poolRoomId))
      .toEqual(["H-04", "H-05", "H-06", "H-07", "H-01"]);
    expect(generateBreachV2(4182, "wayfarer").boss.pattern).toBe("cinder-sweep");
    expect(generateBreachV2(4182, "oathbreaker").boss.pattern).toBe("cinder-sweep");
    expect(generateBreachV2(4182, "oathbreaker").bonusSkillAwakened).toBe(true);
  });
});
