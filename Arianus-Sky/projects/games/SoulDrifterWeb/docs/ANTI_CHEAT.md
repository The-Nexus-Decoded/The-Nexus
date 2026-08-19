# SoulDrifter Anti-Cheat — Research & Design (v1)

Branch: `feat/multiplayer-base-layer`. Status: **Phase 1 implemented**
(server-side movement validation + anomaly audit log). Phases 2–4 are
designed here and land with combat/economy work.

This document exists because the owner asked for anti-cheat to be researched
*first* and built into the foundation — not retrofitted after the EQ/WoW
failure modes show up in our game.

---

## 1. What the research says (2026-08-19)

Sources: Microsoft Research DVE security survey (UCAM-CL-TR-809), University
of Oulu cheat-detection taxonomy, AccelByte server-authority guide, Unreal
movement-validation docs, SA-MP/Roblox/Funcom practitioner threads, and the
public post-mortems of EverQuest (MacroQuest warps) and WoW (teleport/fly
hacks, Warden).

### How the classic EQ/WoW hacks actually worked

| Hack | Mechanism | Why it worked |
|---|---|---|
| **Warp/teleport** (EQ `MoveLocalPlayerToSafeCoords`, WoW teleport) | Client writes its own X/Y/Z in memory; server accepts the next position update verbatim | Server trusted client-reported position; no delta check between consecutive updates |
| **Gradual/step warp** | Same, but moved in small steps under naive per-packet delta thresholds | Detectors measured per-packet jumps, not *average speed over time* |
| **Speed hack** | Client-side clock/tick manipulation or direct velocity edits | Server never compared distance traveled against wall-clock time |
| **Fly / no-clip** | Y-coordinate edits; collision only simulated client-side | Server had no altitude/bounds sanity |
| **Drop-rate / spawn manipulation** | Client memory edits; in the worst cases the client *decided* loot/spawns | Game logic that should be server-only ran (or was trusted) on the client |
| **Map/ESP hacks** | Reading positions of entities the player shouldn't see from local memory | Server sent every entity to every client (no interest management) |
| **Zone spoofing** | Forcing zone-transfer calls with arbitrary destination coords | Zone transfers were client-initiated without validating the player was near a boundary |

### The five consensus principles

1. **Server authority over outcomes.** Clients send *inputs and requests*,
   never *results*. "Accepting a position from the client means any modified
   client can teleport anywhere" — the single root cause of the EQ/WoW era.
   Anything the server doesn't compute (yet) must be treated as untrusted
   display data and validated against physics.
2. **Validate movement distance/time, not per-packet deltas.** Measure
   average speed over a sliding window so step-warps accumulate into a flag;
   use wall-clock time so lag bursts don't false-positive (dt grows with the
   silence). Generous tolerance multipliers (~1.2–1.6×) are load-bearing —
   too tight and you disconnect legitimate laggy players.
3. **Server-initiated teleports must be first-class.** Spawn, death,
   Connector warps: the server *authorizes* the jump explicitly so legitimate
   teleports never trip the warp detector.
4. **Flag-first enforcement, always audit-logged.** Practitioner consensus
   (and painful industry history): instant auto-bans on heuristic detection
   punish lag and edge cases. Log everything, drop illegal state, warn,
   kick only on accumulated scores, keep humans in the loop for bans.
   "Keep logs & perform audits" is its own top-tier recommendation.
5. **Don't send data the client isn't entitled to.** Interest management
   (only relay entities a player could plausibly observe) is the only real
   fix for map/ESP hacks — validation can't catch a passive reader.

### What validation can NOT catch (design honestly around this)

- **Aimbots/skill augmentation** — valid inputs, inhuman precision → needs
  behavioral analysis (Phase 4).
- **Passive wallhack/ESP** — no false data sent → needs interest management
  (Phase 2).
- **Bots/automation** — valid inputs at inhuman consistency → input-pattern
  analysis (Phase 4); research shows 12-minute traces distinguish bots from
  humans ~98%.
- **Latency abuse / lag switches** — timing manipulation of valid state →
  needs rate/timing analysis (Phase 4).

---

## 2. SoulDrifter threat model (mapped to our stack)

| Threat | Our exposure today | Mitigation |
|---|---|---|
| Warp/teleport/speed/fly | **High** — positions are client-reported (trust-based presence relay) | ✅ Phase 1: `MovementMonitor` validates every state pre-relay |
| Zone spoofing (joining/crossing to shards illegitimately) | Medium — crossover client transfers zones; server accepted any position in any shard | ✅ Phase 1: zone containment vs `server/sections.mjs` rects + crossover band |
| Drop-rate / spawn manipulation | **None today** — no loot/spawn systems exist. **Critical to preserve:** when they land, ALL rolls/spawns/economy are server-side only; the client gets results, never tables or rolls | 🔒 Phase 2 design rule (below), enforced in code review |
| Map/ESP (seeing players across the map / through fog) | Medium — shard relays every player to every client | Phase 2: distance-based interest culling on relay |
| Replay/out-of-order injection | Low | ✅ Already: monotonic `seq`, 4 KiB cap, 20 Hz relay clamp, idle reap |
| Session theft / impersonation | Medium — `hello` is unauthenticated (dev) | Phase 3: beta-gate token in `hello` |
| Bots, aimbots, lag switches | Future (combat) | Phase 4: behavioral telemetry on the audit-log data |

**The standing rule for every future system (combat, loot, spawns, economy,
travel-map warping):** *the server computes, the client requests.* If a
system cannot be server-authoritative yet (like presence today), it must sit
behind a validation + audit layer like Phase 1. Drop tables, spawn tables,
and warp destinations must **never ship in the client bundle** — the client
renders outcomes, it never knows odds.

---

## 3. Phase 1 — implemented (this branch)

### `server/anti-cheat.mjs` — `MovementMonitor`

Runs inside `ZoneRoom.applyState`, **before** a state is accepted or
relayed. Rejected states are dropped (not relayed, not ratcheted into
last-known position), so illegal movement never reaches other clients and a
warper keeps failing from their last legal position.

| Check | Catches | Mechanics |
|---|---|---|
| `OUT_OF_BOUNDS` | fly hacks, void/under-map edits | plate bounds (12 000 × 6 750 m + margin), altitude ≤ 400 m |
| `TELEPORT` | instant warps | single-update jump > 40 m without server authorization |
| `SPEED` | step-warps, speed hacks | average path speed over a 4 s sliding window > 9 m/s × 1.6 tolerance; distance/**wall-clock** so lag bursts pass |
| `ZONE_MISMATCH` / `SPAWN_OUT_OF_ZONE` | zone spoofing | position must be inside the room's zone rect (from `server/sections.mjs`) expanded by the 65 m crossover band, so legitimate seam pre-joins never false-flag; non-registry zones skip containment until they get rects |
| authorized teleport | (false-positive prevention) | `authorizeTeleport(id, p)` — spawn/Connector warps accepted once, near the authorized point |

Each flag adds to a **rolling 10-minute score** (TELEPORT 5, OUT_OF_BOUNDS 4,
ZONE_MISMATCH 4, SPAWN_OUT_OF_ZONE 3, SPEED 2). Score ≥ 10 ⇒
`kickRecommended`.

### `createAnomalyLogger` — audit trail

Append-only JSONL: `logs/anticheat-YYYY-MM-DD.jsonl` (one file per UTC day,
`logs/` is git-ignored). Every **flag, kick, join, and leave** (with the
departing player's final score) is one self-contained JSON record — tail it,
grep it, or ship it to a SIEM later. This is the raw material for Phase 4
behavioral analysis and for manual review before any ban.

### Enforcement modes (`AC_MODE`)

- **`audit` (default):** log + drop illegal states. No kicks. Use while
  thresholds are tuned against real traffic.
- **`enforce`:** additionally disconnects (`4003`) players whose score
  crosses the threshold. Bans stay manual and log-driven.

Config: `AC_MODE`, `AC_MAX_SPEED_MPS` (default 9), `AC_LOG_DIR`
(default `logs/`). Startup banner prints the active mode.

---

## 4. Phase 2 — server authority for gameplay (lands with combat/economy)

- **Loot/drops:** server rolls everything; drop tables live only on the
  server (not in the client bundle, not in `public/`).
- **Spawns:** server-side spawn director; clients render what they're told.
- **Travel-map warping / Connectors:** warp is a server *request → validate
  (in-world, at a real Connector) → authorizeTeleport → transfer* flow, never
  a client-chosen destination.
- **Interest management:** relay only players within observation range
  (anti-ESP), and keep fog-of-war/sealed-map data server-gated (the admin
  unseal must stay an authenticated server decision, not a client flag).
- **Combat:** inputs in, outcomes out; server re-simulation with
  reconciliation, 1.2–1.6× tolerances tuned from audit-log percentiles.

## 5. Phase 3 — identity

- Signed beta-gate token in `hello` (HMAC, short-lived), server-verified.
- One session per account; kick-on-new-login.
- Audit log gains account id (not just per-session `drifter-N`).

## 6. Phase 4 — behavioral layer (on the audit data)

- Bot detection: input cadence/consistency analysis (research: ~98%
  accuracy on 12-min traces).
- Aim/skill anomaly: reaction-time and snap distributions when combat lands.
- Lag-switch: heartbeat jitter asymmetry per player.
- Weekly audit review ritual: top scores, repeat offenders, false-positive
  rate → tune `AC_MAX_SPEED_MPS`, tolerances, weights.

---

## 7. Operations cheat-sheet

```bash
npm run mp:dev                                   # audit mode (default)
AC_MODE=enforce npm run mp:dev                   # kick at score threshold
AC_MAX_SPEED_MPS=12 npm run mp:dev               # raise speed ceiling
tail -f logs/anticheat-$(date -u +%F).jsonl      # live anomaly feed
```

Tuning guidance: if legit players appear in the log, raise tolerances —
never lower the audit verbosity. A false ban costs more than a missed cheat
at this stage; the log is the safety net either way.
