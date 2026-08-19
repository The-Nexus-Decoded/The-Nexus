/**
 * Anti-cheat groundwork for the multiplayer base layer (see docs/ANTI_CHEAT.md).
 *
 * The base layer is a trust-based presence relay — positions are client-reported
 * by design. This module is the server-side validation net that sits in front of
 * that trust: every state update is checked against movement physics, the world
 * bounds, and the zone registry BEFORE it is accepted or relayed, and every
 * violation is scored and written to an append-only JSONL audit log.
 *
 * Detection model (from the research in docs/ANTI_CHEAT.md):
 *  - Instant warps (EQ/WoW teleport hacks)   → hard distance cap per update.
 *  - Gradual "step" warps / speed hacks      → average path speed over a sliding
 *    window, so many small fast steps accumulate into a flag.
 *  - Zone spoofing (crossing into a shard the player isn't near) → zone
 *    containment vs server/sections.mjs rects, expanded by the crossover band.
 *  - Out-of-bounds / fly hacks               → plate bounds + altitude sanity.
 *  - Lag tolerance                           → speed is measured distance/time,
 *    so a lag burst followed by a catch-up move does NOT flag (dt grows with
 *    the gap); tolerance multiplier absorbs jitter.
 *
 * Enforcement policy is deliberately flag-first: the default AC_MODE is "audit"
 * (log + drop illegal states, no kicks). "enforce" additionally recommends
 * kicking once a player's score crosses the threshold. Server-initiated
 * teleports (spawn, future Connector warps) are explicitly authorized so they
 * can never false-positive.
 */

import { getZone, zoneAt, PLATE_WORLD_WIDTH_M, PLATE_WORLD_HEIGHT_M } from "./sections.mjs";
import nodeFs from "node:fs";
import nodePath from "node:path";

export const ANTI_CHEAT_DEFAULTS = {
  /** Fastest legitimate sustained movement, m/s (run + abilities headroom). */
  maxSpeedMps: 9,
  /** Multiplier on max speed before flagging — absorbs jitter/burst mechanics. */
  speedTolerance: 1.6,
  /** Sliding window for average-speed measurement, ms. */
  windowMs: 4000,
  /** Single-update jump past this many meters is an instant teleport flag. */
  teleportHardDistM: 40,
  /** Altitude sanity band (fly-hack catch), meters above/below sea level. */
  maxAltitudeM: 400,
  /** Positions this far outside the zone rect are zone-mismatch flags — matches
   *  the crossover release distance so seam work never false-flags. */
  zoneBandM: 65,
  /** Plate bounds margin, meters. */
  plateMarginM: 100,
  /** Score weights per flag kind. */
  weights: { TELEPORT: 5, OUT_OF_BOUNDS: 4, ZONE_MISMATCH: 4, SPAWN_OUT_OF_ZONE: 3, SPEED: 2 },
  /** Rolling score window, ms. */
  scoreWindowMs: 10 * 60 * 1000,
  /** Score at which enforce mode recommends a kick. */
  kickScore: 10,
};

const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export class MovementMonitor {
  /**
   * @param {Partial<typeof ANTI_CHEAT_DEFAULTS>} [options]
   */
  constructor(options = {}) {
    this.cfg = { ...ANTI_CHEAT_DEFAULTS, ...options };
    /** @type {Map<string, { samples: { t: number, p: number[] }[], authorized: number[] | null, flags: { t: number, w: number }[] }>} */
    this.players = new Map();
  }

  _record(id) {
    let rec = this.players.get(id);
    if (!rec) {
      rec = { samples: [], authorized: null, flags: [] };
      this.players.set(id, rec);
    }
    return rec;
  }

  /** Server-initiated teleport (spawn, Connector warp): the next state from
   *  this player near `p` is accepted without movement checks. */
  authorizeTeleport(playerId, p) {
    this._record(playerId).authorized = [p[0], p[1], p[2]];
  }

  dropPlayer(playerId) {
    this.players.delete(playerId);
  }

  /** Rolling cheat score for a player (decays outside scoreWindowMs). */
  scoreFor(playerId, now = Date.now()) {
    const rec = this.players.get(playerId);
    if (!rec) return 0;
    const cutoff = now - this.cfg.scoreWindowMs;
    rec.flags = rec.flags.filter((f) => f.t >= cutoff);
    return rec.flags.reduce((sum, f) => sum + f.w, 0);
  }

  _flag(rec, kind, detail, now) {
    const w = this.cfg.weights[kind] ?? 1;
    rec.flags.push({ t: now, w });
    const score = this.scoreForRec(rec, now);
    return {
      ok: false,
      flag: { kind, detail, severity: w, score, kickRecommended: score >= this.cfg.kickScore },
    };
  }

  scoreForRec(rec, now) {
    const cutoff = now - this.cfg.scoreWindowMs;
    rec.flags = rec.flags.filter((f) => f.t >= cutoff);
    return rec.flags.reduce((sum, f) => sum + f.w, 0);
  }

  _inZoneBand(baseZoneId, p) {
    const zone = getZone(baseZoneId);
    if (!zone) return true; // non-registry zone (e.g. "heartvale"): no containment check yet
    const band = this.cfg.zoneBandM;
    const { x0, z0, x1, z1 } = zone.rect;
    return p[0] >= x0 - band && p[0] <= x1 + band && p[2] >= z0 - band && p[2] <= z1 + band;
  }

  /**
   * Validates one state update. Accepted states become the measurement basis
   * for the next update; rejected states are dropped (last accepted stands),
   * so a warper keeps failing validation instead of ratcheting forward.
   *
   * @param {string} playerId
   * @param {string} shardId room id ("hv-1#1") — base zone derived from it
   * @param {{ p: number[], h: number, a: string, seq: number }} state
   * @param {number} now wall-clock ms
   * @returns {{ ok: true } | { ok: false, flag: { kind: string, detail: string, severity: number, score: number, kickRecommended: boolean } }}
   */
  validate(playerId, shardId, state, now) {
    const cfg = this.cfg;
    const rec = this._record(playerId);
    const p = state.p;
    const baseZone = shardId.split("#")[0];

    // World bounds + altitude (always checked, including spawn).
    const m = cfg.plateMarginM;
    if (p[0] < -m || p[0] > PLATE_WORLD_WIDTH_M + m || p[2] < -m || p[2] > PLATE_WORLD_HEIGHT_M + m || Math.abs(p[1]) > cfg.maxAltitudeM) {
      return this._flag(rec, "OUT_OF_BOUNDS", `p=(${p.map((n) => n.toFixed(1)).join(", ")})`, now);
    }

    // Authorized server teleport: accept near the authorized point, once.
    if (rec.authorized) {
      if (dist3(p, rec.authorized) <= 5) {
        rec.authorized = null;
        rec.samples = [{ t: now, p: [...p] }];
        return { ok: true };
      }
      rec.authorized = null; // authorization consumed by a non-matching state
    }

    // Zone containment (spawn and steady-state; band covers seam crossover).
    if (!this._inZoneBand(baseZone, p)) {
      const kind = rec.samples.length === 0 ? "SPAWN_OUT_OF_ZONE" : "ZONE_MISMATCH";
      const at = zoneAt(p[0], p[2]);
      return this._flag(rec, kind, `shard=${shardId} p=(${p[0].toFixed(1)}, ${p[2].toFixed(1)}) actually-in=${at?.id ?? "none"}`, now);
    }

    const last = rec.samples[rec.samples.length - 1];
    if (!last) {
      rec.samples.push({ t: now, p: [...p] });
      return { ok: true };
    }

    const jump = dist3(p, last.p);
    if (jump > cfg.teleportHardDistM) {
      return this._flag(rec, "TELEPORT", `jump=${jump.toFixed(1)}m in ${((now - last.t) / 1000).toFixed(2)}s`, now);
    }

    // Sliding-window average path speed (catches step-warps + speed hacks).
    const cutoff = now - cfg.windowMs;
    const window = rec.samples.filter((s) => s.t >= cutoff);
    let pathLen = jump;
    for (let i = 1; i < window.length; i++) pathLen += dist3(window[i].p, window[i - 1].p);
    const span = Math.max((now - (window[0]?.t ?? last.t)) / 1000, 1 / 20);
    const avgSpeed = pathLen / span;
    if (avgSpeed > cfg.maxSpeedMps * cfg.speedTolerance) {
      return this._flag(rec, "SPEED", `avg=${avgSpeed.toFixed(1)}m/s over ${span.toFixed(1)}s (limit ${(cfg.maxSpeedMps * cfg.speedTolerance).toFixed(1)})`, now);
    }

    rec.samples.push({ t: now, p: [...p] });
    return { ok: true };
  }
}

/**
 * Append-only JSONL anomaly/audit log. One file per UTC day:
 * `<dir>/anticheat-YYYY-MM-DD.jsonl`. Every flag, kick, join, and leave is a
 * single self-contained JSON record so logs can be tailed, grepped, or shipped
 * to a SIEM later. Audit-first: keeping the evidence matters more than any
 * single enforcement action (see docs/ANTI_CHEAT.md §5).
 *
 * @param {{ dir: string, now?: () => number, fs?: typeof import("node:fs") }} options
 */
export function createAnomalyLogger(options) {
  const fs = options.fs ?? nodeFs;
  const now = options.now ?? (() => Date.now());
  let currentFile = null;
  let currentDay = null;

  function fileFor(ts) {
    const day = new Date(ts).toISOString().slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      currentFile = nodePath.join(options.dir, `anticheat-${day}.jsonl`);
    }
    return currentFile;
  }

  return {
    /** @param {Record<string, unknown>} record */
    log(record) {
      const ts = now();
      const file = fileFor(ts);
      fs.mkdirSync(options.dir, { recursive: true });
      fs.appendFileSync(file, JSON.stringify({ ts: new Date(ts).toISOString(), ...record }) + "\n");
      return file;
    },
    get dir() {
      return options.dir;
    },
  };
}
