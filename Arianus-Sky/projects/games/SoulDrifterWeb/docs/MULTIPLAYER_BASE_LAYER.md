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
| Zone server | `server/zone-server.mjs` + `server/zone-room.mjs` | Node `ws` relay. One room per zone id, 30 cap, 20 Hz per-player relay clamp, 45 s idle reap, `/health` probe. |
| Tests | `tests/mpProtocol.test.ts`, `tests/mpInterpolation.test.ts`, `tests/zoneRoom.test.mjs` | 19 new tests; full suite 162/162 green. |
| Live smoke test | `scripts/mp-smoke-test.mjs` | 31 real clients: 30 welcomed, 31st `full`, relay verified, leave frees slot. |

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

Server → client: `welcome` (assigned id + snapshot of current players),
`full` (cap reached — client must not auto-reconnect), `join`, `leave`,
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
