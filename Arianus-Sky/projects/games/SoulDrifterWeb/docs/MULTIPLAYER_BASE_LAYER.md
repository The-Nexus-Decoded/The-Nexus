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
| Tests | `tests/mpProtocol.test.ts`, `tests/mpInterpolation.test.ts`, `tests/zoneRoom.test.mjs`, `tests/zoneDirectory.test.mjs` | 25 new tests; full suite 168/168 green. |
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

## Run it

```bash
npm run mp:dev          # zone relay on :8787  (PORT=xxxx to override)
npm run dev             # game as usual
```

Join a zone from the game URL:

```
http://localhost:5173/?mp=ws://localhost:8787&zone=heartvale
```

Open the same URL in more windows/machines to share the instance. The
bottom-left badge shows `heartvale · N/30 drifters`. Health probe:
`GET http://localhost:8787/health`.

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
