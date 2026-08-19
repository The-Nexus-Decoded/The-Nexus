/**
 * SoulDrifter multiplayer base-layer zone server.
 *
 * WebSocket relay for zone semi-zones with shard overflow instancing:
 * each zone id (e.g. a Heartvale section) holds up to 30 concurrent players
 * per shard; when every shard is full a new shard instance of the same zone
 * is created on demand, so a busy section pushes overflow into another
 * instance rather than rejecting players. Presence + transform relay only —
 * no combat/inventory authority yet.
 *
 * Usage:
 *   node server/zone-server.mjs            # listens on :8787
 *   PORT=8791 node server/zone-server.mjs
 *
 * Health probe: GET http://host:8787/health → {"ok":true,"zones":{...}}
 *
 * Client handshake: {"t":"hello","v":1,"zone":"hv-1","name":"…","appearance":{…}}
 * Game client: append ?mp=ws://host:8787&zone=hv-1 to the game URL.
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { ZoneDirectory } from "./zone-directory.mjs";
import { ZONE_PLAYER_CAP } from "./zone-room.mjs";

const PROTOCOL_VERSION = 1;
const MAX_MESSAGE_BYTES = 4096;
const IDLE_TIMEOUT_MS = 45_000;
const HEARTBEAT_SCAN_MS = 10_000;
const MAX_NAME_LENGTH = 24;

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const MAX_SHARDS = Number.parseInt(process.env.MAX_SHARDS || "10", 10);

/** Minimal mirror of src/game/net/protocol.ts validation (keep in sync). */
function parseHello(raw) {
  if (typeof raw !== "object" || raw === null || raw.t !== "hello") return null;
  if (raw.v !== PROTOCOL_VERSION) return null;
  if (typeof raw.zone !== "string" || !/^[a-z0-9-]{1,48}$/.test(raw.zone)) return null;
  if (typeof raw.name !== "string") return null;
  const name = raw.name.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  const appearance = raw.appearance;
  if (typeof appearance !== "object" || appearance === null) return null;
  if (typeof appearance.raceId !== "string" || appearance.raceId.length === 0 || appearance.raceId.length > 64) return null;
  if (typeof appearance.callingId !== "string" || appearance.callingId.length === 0 || appearance.callingId.length > 64) return null;
  if (appearance.tint !== undefined && (typeof appearance.tint !== "string" || !/^#[0-9a-fA-F]{6}$/.test(appearance.tint))) return null;
  return { zone: raw.zone, name, appearance };
}

function parseState(raw) {
  if (typeof raw !== "object" || raw === null || raw.t !== "state") return null;
  const state = raw.state;
  if (typeof state !== "object" || state === null) return null;
  const p = state.p;
  if (!Array.isArray(p) || p.length !== 3 || !p.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  if (typeof state.h !== "number" || !Number.isFinite(state.h) || Math.abs(state.h) > Math.PI * 4) return null;
  if (typeof state.a !== "string" || state.a.length === 0 || state.a.length > 32) return null;
  if (!Number.isSafeInteger(state.seq) || state.seq < 0) return null;
  return state;
}

const directory = new ZoneDirectory({ cap: ZONE_PLAYER_CAP, maxShards: MAX_SHARDS });
/** @type {Map<import("ws").WebSocket, { room: import("./zone-room.mjs").ZoneRoom, playerId: string, lastSeen: number }>} */
const sessions = new Map();

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function broadcast(room, exceptId, message) {
  const raw = JSON.stringify(message);
  for (const [ws, session] of sessions) {
    if (session.room === room && session.playerId !== exceptId && ws.readyState === ws.OPEN) ws.send(raw);
  }
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, zones: directory.describe() }));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("SoulDrifter zone relay — connect via WebSocket.\n");
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });

wss.on("connection", (ws) => {
  let joined = false;

  ws.on("message", (data) => {
    if (data.length > MAX_MESSAGE_BYTES) {
      send(ws, { t: "error", code: "message-too-large", message: "Message exceeds 4 KiB budget." });
      return;
    }
    let raw;
    try {
      raw = JSON.parse(data.toString());
    } catch {
      send(ws, { t: "error", code: "bad-json", message: "Messages must be JSON." });
      return;
    }

    const session = sessions.get(ws);
    if (session) session.lastSeen = Date.now();

    if (!joined) {
      const hello = parseHello(raw);
      if (!hello) {
        send(ws, { t: "error", code: "bad-hello", message: "Expected a valid v1 hello." });
        ws.close(4002, "bad hello");
        return;
      }
      const result = directory.join(hello.zone, hello);
      if (!result.ok) {
        send(ws, { t: "full", cap: result.cap, shards: result.shards });
        ws.close(4000, "zone full");
        return;
      }
      sessions.set(ws, { room: result.room, playerId: result.player.id, lastSeen: Date.now() });
      joined = true;
      send(ws, {
        t: "welcome",
        v: PROTOCOL_VERSION,
        id: result.player.id,
        zone: hello.zone,
        shard: result.shard,
        shards: result.shards,
        cap: result.room.cap,
        players: result.snapshot,
      });
      broadcast(result.room, result.player.id, {
        t: "join",
        player: { id: result.player.id, name: result.player.name, appearance: result.player.appearance, state: null },
      });
      console.log(
        `[${result.shard}] ${result.player.name} joined (${result.room.size}/${result.room.cap}, ${result.shards} shard(s))`,
      );
      return;
    }

    if (!session) return;
    if (raw.t === "state") {
      const state = parseState(raw);
      if (!state) return;
      const outcome = session.room.applyState(session.playerId, state);
      if (outcome.broadcast) broadcast(session.room, session.playerId, outcome.broadcast);
      return;
    }
    if (raw.t === "ping") {
      send(ws, { t: "pong", ts: raw.ts });
      return;
    }
  });

  ws.on("close", () => {
    const session = sessions.get(ws);
    sessions.delete(ws);
    if (!session) return;
    const { departed, shard, shardClosed } = directory.leave(session.room, session.playerId);
    if (departed) {
      broadcast(session.room, session.playerId, { t: "leave", id: session.playerId });
      console.log(
        `[${shard}] ${departed.name} left (${session.room.size}/${session.room.cap})${shardClosed ? " — shard closed" : ""}`,
      );
    }
  });
});

const heartbeat = setInterval(() => {
  const cutoff = Date.now() - IDLE_TIMEOUT_MS;
  for (const [ws, session] of sessions) {
    if (session.lastSeen < cutoff) ws.terminate();
  }
}, HEARTBEAT_SCAN_MS);
heartbeat.unref();

httpServer.listen(PORT, () => {
  console.log(`SoulDrifter zone relay listening on :${PORT} (cap ${ZONE_PLAYER_CAP}/shard, max ${MAX_SHARDS} shards/zone)`);
});
