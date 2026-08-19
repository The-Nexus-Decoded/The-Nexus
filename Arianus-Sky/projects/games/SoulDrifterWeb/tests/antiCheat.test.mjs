/**
 * Anti-cheat movement validation + anomaly logging tests.
 * Drives MovementMonitor standalone and through ZoneRoom, using the real
 * server/sections.mjs zone rects (hv-1: x 4980–6240, z 2531.25–2970).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MovementMonitor, createAnomalyLogger, ANTI_CHEAT_DEFAULTS } from "../server/anti-cheat.mjs";
import { ZoneRoom, resetPlayerSerialForTests } from "../server/zone-room.mjs";

// hv-1 world-frame landmarks (meters).
const HV1_CENTER = [5600, 0, 2750];
const INSIDE_HV2_NEAR_SEAM = [5600, 0, 2480]; // in hv-2 but inside the 65 m band
const DEEP_HV2 = [5600, 0, 2000]; // hv-2, far past the band

let now = 0;
const advance = (ms) => (now += ms);
const stateAt = (p, seq = 1) => ({ p: [...p], h: 0, a: "move", seq });

beforeEach(() => {
  now = 1_000_000;
  resetPlayerSerialForTests();
});

describe("MovementMonitor", () => {
  it("accepts normal running movement at 12 Hz", () => {
    const monitor = new MovementMonitor();
    let p = [...HV1_CENTER];
    for (let seq = 1; seq <= 24; seq++) {
      advance(83);
      p = [p[0] + 0.4, 0, p[2]]; // ~4.8 m/s
      expect(monitor.validate("p1", "hv-1#1", stateAt(p, seq), now).ok, `seq ${seq}`).toBe(true);
    }
  });

  it("tolerates a lag burst: long silence then a catch-up move is fine", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    advance(3000); // 3 s of silence (lag)
    const result = monitor.validate("p1", "hv-1#1", stateAt([HV1_CENTER[0] + 25, 0, HV1_CENTER[2]], 2), now);
    expect(result.ok).toBe(true); // 25 m over 3 s = 8.3 m/s — plausible
  });

  it("flags an instant teleport (EQ/WoW warp hack) and does not accept the position", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    advance(100);
    const result = monitor.validate("p1", "hv-1#1", stateAt([5600, 0, 2600], 2), now); // 150 m jump
    expect(result.ok).toBe(false);
    expect(result.flag.kind).toBe("TELEPORT");
    // Ratchet check: the warped position was NOT accepted, so the next update
    // is still measured from the last legitimate one and keeps failing.
    advance(100);
    const again = monitor.validate("p1", "hv-1#1", stateAt([5600, 0, 2605], 3), now);
    expect(again.ok).toBe(false);
    expect(again.flag.kind).toBe("TELEPORT");
  });

  it("catches a gradual step-warp via windowed average speed", () => {
    const monitor = new MovementMonitor();
    let p = [...HV1_CENTER];
    monitor.validate("p1", "hv-1#1", stateAt(p), now);
    let flagged = null;
    for (let seq = 2; seq <= 30 && !flagged; seq++) {
      advance(80);
      p = [p[0] + 2, 0, p[2]]; // 2 m steps every 80 ms = 25 m/s — under the 40 m jump cap
      const result = monitor.validate("p1", "hv-1#1", stateAt(p, seq), now);
      if (!result.ok) flagged = result.flag;
    }
    expect(flagged).toBeTruthy();
    expect(flagged.kind).toBe("SPEED");
  });

  it("accepts a server-authorized teleport (spawn / Connector warp)", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    advance(50);
    monitor.authorizeTeleport("p1", DEEP_HV2);
    // Authorized point is deep in hv-2 — but the shard is hv-2's for this player now.
    const result = monitor.validate("p1", "hv-2#1", stateAt(DEEP_HV2, 2), now);
    expect(result.ok).toBe(true);
  });

  it("flags out-of-bounds positions and absurd altitude (fly hack)", () => {
    const monitor = new MovementMonitor();
    const oob = monitor.validate("p1", "hv-1#1", stateAt([-500, 0, 2750]), now);
    expect(oob.ok).toBe(false);
    expect(oob.flag.kind).toBe("OUT_OF_BOUNDS");
    const fly = monitor.validate("p2", "hv-1#1", stateAt([5600, 999, 2750]), now);
    expect(fly.ok).toBe(false);
    expect(fly.flag.kind).toBe("OUT_OF_BOUNDS");
  });

  it("flags positions past the crossover band as ZONE_MISMATCH but tolerates the seam band", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    advance(500);
    // Inside hv-2 but within 65 m of the hv-1 seam: legitimate crossover traffic.
    // (Walk there legally first so the speed check doesn't interfere.)
    monitor.authorizeTeleport("p1", INSIDE_HV2_NEAR_SEAM);
    const seam = monitor.validate("p1", "hv-1#1", stateAt(INSIDE_HV2_NEAR_SEAM, 2), now);
    expect(seam.ok).toBe(true);
    // Deep in hv-2 with no authorization: spoofed zone presence.
    advance(500);
    const deep = monitor.validate("p1", "hv-1#1", stateAt(DEEP_HV2, 3), now);
    expect(deep.ok).toBe(false);
    expect(deep.flag.kind).toBe("ZONE_MISMATCH");
  });

  it("flags a first state spawned outside the joined zone as SPAWN_OUT_OF_ZONE", () => {
    const monitor = new MovementMonitor();
    const result = monitor.validate("p1", "hv-1#1", stateAt(DEEP_HV2), now);
    expect(result.ok).toBe(false);
    expect(result.flag.kind).toBe("SPAWN_OUT_OF_ZONE");
  });

  it("skips zone containment for non-registry zones (e.g. heartvale)", () => {
    const monitor = new MovementMonitor();
    const result = monitor.validate("p1", "heartvale#1", stateAt([100, 0, 100]), now);
    expect(result.ok).toBe(true);
  });

  it("accumulates a rolling score and recommends a kick at the threshold", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    let verdict = null;
    for (let i = 1; i <= 2; i++) {
      advance(100);
      verdict = monitor.validate("p1", "hv-1#1", stateAt([5600, 0, 2600], i + 1), now); // 150 m warp each time
      expect(verdict.flag.kind).toBe("TELEPORT");
    }
    expect(verdict.flag.score).toBeGreaterThanOrEqual(ANTI_CHEAT_DEFAULTS.kickScore);
    expect(verdict.flag.kickRecommended).toBe(true);
  });

  it("score decays outside the score window", () => {
    const monitor = new MovementMonitor();
    monitor.validate("p1", "hv-1#1", stateAt(HV1_CENTER), now);
    advance(100);
    monitor.validate("p1", "hv-1#1", stateAt([5600, 0, 2600], 2), now); // TELEPORT +5
    expect(monitor.scoreFor("p1", now)).toBe(5);
    advance(ANTI_CHEAT_DEFAULTS.scoreWindowMs + 1000);
    expect(monitor.scoreFor("p1", now)).toBe(0);
  });
});

describe("ZoneRoom integration", () => {
  it("drops flagged states before relay and keeps the last legal position", () => {
    const monitor = new MovementMonitor();
    const flags = [];
    const room = new ZoneRoom("hv-1#1", { now: () => now, monitor, onFlag: (player, verdict) => flags.push({ player, verdict }) });
    const { player } = room.addPlayer({ name: "Warper", appearance: {} });

    const legal = room.applyState(player.id, stateAt(HV1_CENTER, 1));
    expect(legal.broadcast).toBeTruthy();

    advance(100);
    const warped = room.applyState(player.id, stateAt([5600, 0, 2600], 2));
    expect(warped.drop).toBe(true);
    expect(warped.flag.kind).toBe("TELEPORT");
    expect(flags).toHaveLength(1);
    expect(flags[0].player.name).toBe("Warper");
    // Last accepted state is still the legal one — nothing illegal was relayed.
    expect(room.snapshotFor("someone-else")[0].state.p).toEqual(HV1_CENTER);
  });

  it("clears monitor state when the player leaves", () => {
    const monitor = new MovementMonitor();
    const room = new ZoneRoom("hv-1#1", { now: () => now, monitor });
    const { player } = room.addPlayer({ name: "Leaver", appearance: {} });
    room.applyState(player.id, stateAt(HV1_CENTER, 1));
    expect(monitor.players.has(player.id)).toBe(true);
    room.removePlayer(player.id);
    expect(monitor.players.has(player.id)).toBe(false);
  });
});

describe("anomaly audit log", () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ac-log-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes one self-contained JSON record per line to a daily JSONL file", () => {
    const logger = createAnomalyLogger({ dir, now: () => Date.UTC(2026, 7, 19, 12, 0, 0) });
    const file = logger.log({ kind: "flag", rule: "TELEPORT", playerId: "drifter-1", detail: "jump=150m" });
    logger.log({ kind: "join", playerId: "drifter-2" });
    expect(path.basename(file)).toBe("anticheat-2026-08-19.jsonl");
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.ts).toBe("2026-08-19T12:00:00.000Z");
    expect(first.rule).toBe("TELEPORT");
    expect(JSON.parse(lines[1]).kind).toBe("join");
  });

  it("rolls to a new file when the UTC day changes", () => {
    let t = Date.UTC(2026, 7, 19, 23, 59, 59);
    const logger = createAnomalyLogger({ dir, now: () => t });
    const dayOne = logger.log({ kind: "flag", rule: "SPEED" });
    t = Date.UTC(2026, 7, 20, 0, 0, 1);
    const dayTwo = logger.log({ kind: "flag", rule: "SPEED" });
    expect(dayOne).not.toBe(dayTwo);
    expect(fs.existsSync(dayOne)).toBe(true);
    expect(fs.existsSync(dayTwo)).toBe(true);
  });
});
