# SoulDrifter Multiplayer — Base Layer (v1)

Branch: `feat/multiplayer-base-layer` (cut from `qa` @ `f58427bb`)

Presence + transform relay so multiple characters can share one zone
instance. Built for the Heartvale outdoor zone: when the zone ships, up to
**30 concurrent players** see each other move in the same map. This layer is
deliberately a foundation — no combat, inventory, or chat authority yet.

## What landed

| Piece | Path | Notes |
|---|---|---|
| Protocol v1 | `src/game/net/protocol.ts` | Message schemas + validators shared client/server. Cap constant `MP_MAX_ZONE_PLAYERS = 30`. |
| Snapshot interpolation | `src/game/net/interpolation.ts` | Renders remotes 120 ms behind newest snapshot; short-arc heading lerp; teleport snap > 6 units. Pure, unit-tested. |
| Net client | `src/game/net/netClient.ts` | hello/welcome handshake, throttled 12 Hz state sends, heartbeat, bounded backoff reconnect, no reconnect storm on `full`. |
| Remote avatars | `src/game/net/remoteAvatars.ts` | Placeholder rig (capsule + head + nameplate), deterministic per-player tint, interpolation-driven. `setAvatarFactory()` is the hook for real GLB rigs. |
| Layer facade | `src/game/net/multiplayerLayer.ts` | Wires bridge + client + avatars. One per active world. |
| World bridge | `src/game/World3D.ts` (`multiplayerBridge()`) | Read-only scene access, local player transform, per-frame observer hook. ~25 lines added; internals untouched. |
| Opt-in wiring | `src/main.ts` | Active only with `?mp=` or `VITE_MP_URL`. Status badge is created from JS — no static HTML/CSS changes. |
| Zone server | `server/zone-server.mjs` + `server/zone-room.mjs` + `server/zone-directory.mjs` | Node `ws` relay. Shard overflow instancing: 30 players per shard, new shard of the same zone created on demand when all shards fill (see below), 20 Hz per-player relay clamp, 45 s idle reap, `/health` probe. |
| Section registry | `server/sections.mjs` | Heartvale's 7 sections (world-meter rects + adjacency) and the Thalenyr scale constants. See `docs/THALENYR_SCALE_AND_SECTIONS.md`. |
| Client zone registry | `src/game/net/heartvaleZones.ts` | TS mirror of `server/sections.mjs` — same rects/adjacency, `zoneAt`, `nearestAdjacentEdge`, `distanceToRect`. Parity-tested against the server module so the two can never drift. |
| Seamless crossover | `src/game/net/zoneCrossover.ts` | State machine that pre-joins the adjacent zone inside a 50 m edge band, receives on both shards while overlapping, transfers presence when `zoneAt` flips, and holds the old shard as the return pre-join (2 s / 10 m hysteresis — no connect/disconnect churn at a seam). |
| Tests | `tests/mpProtocol.test.ts`, `tests/mpInterpolation.test.ts`, `tests/zoneRoom.test.mjs`, `tests/zoneDirectory.test.mjs`, `tests/heartvaleZones.test.ts`, `tests/zoneCrossover.test.ts` | 39 new tests; full suite 182/182 green. |
| Live smoke test | `scripts/mp-smoke-test.mjs` | 31 real clients: 30 fill shard #1, 31st overflows into shard #2, relay isolated per shard, empty shard closes. |

## Shard overflow instancing

Each zone id (a Heartvale section such as `hv-1`) is a semi-zone backed by
one or more shards, shard id `<zone>#<n>`. Joins land in the first non-full
shard; when every shard holds 30 players a new shard instance of the same
zone is created on demand, so a busy area pushes overflow into another
instance instead of rejecting anyone. `full` is returned only past the hard
`maxShards` ceiling (default 10, env `MAX_SHARDS`). Empty shards close and
their serials are reused. `welcome` carries `shard` + `shards`; the badge
shows `hv-1 · #2 · 27/30 drifters`. Relay is isolated per shard. Full design:
`docs/THALENYR_SCALE_AND_SECTIONS.md`.

## Seamless zone crossover

With crossover mode on, the client tracks the local player's world-meter
position against the Heartvale section rects and manages **two** relay
connections near a seam so crossing it never drops presence:

1. **Pre-join** — within 50 m of an adjacent section's edge, a second client
   connects to that zone and waits for its `welcome`.
2. **Dual** — both shards are online; the local state still publishes only
   through the current zone, but players near the seam on the neighboring
   shard are already visible (and vice versa).
3. **Transfer** — the moment `zoneAt` flips, the neighbor client becomes
   primary and publishing switches over. The retired shard is *retained* as
   the return pre-join while still in the band, so hovering on a seam does
   not thrash connections. Settling requires 2 s or 10 m past the edge
   (hysteresis); the old client is released past 65 m.

Teleport/spawn into a non-adjacent zone joins the new zone cold. Crossover
mode is opt-in: `?crossover=1` or `VITE_MP_CROSSOVER=1`, and it defaults the
zone to `hv-1` instead of `heartvale`. While a pre-join is in flight the
badge shows a linking hint, e.g. `hv-1 ⇄ hv-2 · #1 · 27/30 drifters`.

**Frame requirement:** crossover positions must be in the shared world frame
(plate meters, origin at plate top-left, +x east / +z south — see
`docs/THALENYR_SCALE_AND_SECTIONS.md`). The layer feeds the local player's
transform from the active world's bridge, so real in-world use lands with
the Heartvale zone build; until then the state machine is covered by its
unit tests (simulated walks across every seam behavior above).

## Run it

```bash
npm run mp:dev          # zone relay on :8787  (PORT=xxxx to override)
npm run dev             # game as usual
```

Join a zone from the game URL:

```
http://localhost:5173/?mp=ws://localhost:8787&zone=heartvale
```

Crossover mode (section rects + seamless seam transitions):

```
http://localhost:5173/?mp=ws://localhost:8787&crossover=1&zone=hv-1
```

Open the same URL in more windows/machines to share the instance. The
bottom-left badge shows `heartvale · N/30 drifters` (or
`hv-1 ⇄ hv-2 · #1 · N/30 drifters` while a crossover pre-join is in
flight). Health probe: `GET http://localhost:8787/health`.

## Protocol v1 (JSON over WebSocket)

Client → server: `hello` (version, zone, name ≤ 24 chars, appearance),
`state` (`p:[x,y,z]`, `h` heading, `a` anim tag, `seq`), `ping`.

Server → client: `welcome` (assigned id + snapshot of current players +
`shard`/`shards` from the directory), `full` (all shards at cap past
`maxShards` — client must not auto-reconnect), `join`, `leave`,
`state` (relayed, sender excluded), `pong`, `error`.

Guards: 4 KiB message ceiling, per-player 20 Hz relay clamp, out-of-order
`seq` dropped, idle sockets reaped at 45 s, empty rooms discarded.

## Heartvale integration checklist (follow-up work)

1. **Zone id**: keep `zone=heartvale` (default) or map zone ids from the
   Heartvale world when it lands.
2. **Real rigs**: call `avatars.setAvatarFactory(...)` with a GLB-backed
   factory reusing the character pipeline; the appearance payload already
   carries `raceId`/`callingId`/optional `tint`.
3. **Deploy**: the relay is a plain Node process (`ws`). For Cloudflare,
   port `zone-room.mjs` into a Durable Object — the room logic is
   transport-free for exactly that reason.
4. **Auth**: `hello` is unauthenticated by design (dev). Add the beta-gate
   token check (see `worker/static-sites-worker.js`) before public testing.
5. **Authority**: positions are client-reported (trust-based). Fine for a
   co-op presence layer; combat/economy will need server validation later.

## Notes

- No new runtime assets; 150 MB budget unaffected (build verified).
- `ws` added as a devDependency (server + tests only; not in the client bundle).
- Existing single-player flow is untouched when `?mp=` is absent.
