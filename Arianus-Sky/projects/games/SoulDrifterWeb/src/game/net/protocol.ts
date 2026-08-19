/**
 * SoulDrifter multiplayer base-layer protocol (v1).
 *
 * Shared between the browser client (src/game/net/*) and the zone server
 * (server/*.mjs, mirrored types). JSON messages over WebSocket.
 *
 * Flow: client connects → hello → welcome (with snapshot) | full | error.
 * Then: state relay both ways, join/leave notifications, ping/pong heartbeat.
 */

export const MP_PROTOCOL_VERSION = 1;
/** Hard cap of concurrent players per zone instance (Heartvale target). */
export const MP_MAX_ZONE_PLAYERS = 30;
/** Server-side per-player state relay clamp. */
export const MP_MAX_STATE_HZ = 20;
/** Client-side state send rate. */
export const MP_CLIENT_STATE_HZ = 12;
/** Server terminates sockets silent for longer than this. */
export const MP_IDLE_TIMEOUT_MS = 45_000;
/** Client heartbeat cadence. */
export const MP_PING_INTERVAL_MS = 10_000;
/** Absolute ceiling for any single message (bytes). */
export const MP_MAX_MESSAGE_BYTES = 4096;

export const MP_MAX_NAME_LENGTH = 24;

/** Appearance descriptor sent at join. Placeholder-friendly: the base layer
 *  only needs identity + tint hints; a real rig factory can consume more later. */
export interface MpAppearance {
  raceId: string;
  callingId: string;
  /** Optional CSS-ish hex tint, e.g. "#8ab4ff". */
  tint?: string;
}

export interface MpPlayerInfo {
  id: string;
  name: string;
  appearance: MpAppearance;
}

/** Transform + animation state for one player at one moment. */
export interface MpPlayerState {
  /** Position [x, y, z] in world units. */
  p: [number, number, number];
  /** Heading in radians (rotation around +Y). */
  h: number;
  /** Animation/locomotion tag: "idle" | "move" | "guard" | future tags. */
  a: string;
  /** Sender-side monotonically increasing sequence number. */
  seq: number;
}

export interface MpPlayerSnapshot extends MpPlayerInfo {
  state: MpPlayerState | null;
}

/* Client → Server */
export type MpClientMessage =
  | { t: "hello"; v: number; zone: string; name: string; appearance: MpAppearance }
  | { t: "state"; state: MpPlayerState }
  | { t: "ping"; ts: number };

/* Server → Client */
export type MpServerMessage =
  | {
      t: "welcome";
      v: number;
      id: string;
      zone: string;
      cap: number;
      players: MpPlayerSnapshot[];
      /** Shard instance this client landed in, e.g. "hv-1#2" (directory servers). */
      shard?: string;
      /** Live shard count for the zone (directory servers). */
      shards?: number;
    }
  | { t: "full"; cap: number; shards?: number }
  | { t: "join"; player: MpPlayerSnapshot }
  | { t: "leave"; id: string }
  | { t: "state"; id: string; state: MpPlayerState }
  | { t: "pong"; ts: number }
  | { t: "error"; code: string; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function isValidAppearance(value: unknown): value is MpAppearance {
  if (!isRecord(value)) return false;
  if (typeof value.raceId !== "string" || value.raceId.length === 0 || value.raceId.length > 64) return false;
  if (typeof value.callingId !== "string" || value.callingId.length === 0 || value.callingId.length > 64) return false;
  if (value.tint !== undefined && (typeof value.tint !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.tint))) return false;
  return true;
}

export function isValidPlayerState(value: unknown): value is MpPlayerState {
  if (!isRecord(value)) return false;
  const p = value.p;
  if (!Array.isArray(p) || p.length !== 3 || !p.every(isFiniteNumber)) return false;
  if (!isFiniteNumber(value.h) || Math.abs(value.h) > Math.PI * 4) return false;
  if (typeof value.a !== "string" || value.a.length === 0 || value.a.length > 32) return false;
  if (!Number.isSafeInteger(value.seq) || (value.seq as number) < 0) return false;
  return true;
}

export function parseClientMessage(raw: unknown): MpClientMessage | null {
  if (!isRecord(raw)) return null;
  switch (raw.t) {
    case "hello": {
      if (raw.v !== MP_PROTOCOL_VERSION) return null;
      if (typeof raw.zone !== "string" || !/^[a-z0-9-]{1,48}$/.test(raw.zone)) return null;
      if (typeof raw.name !== "string") return null;
      const name = raw.name.trim();
      if (name.length === 0 || name.length > MP_MAX_NAME_LENGTH) return null;
      if (!isValidAppearance(raw.appearance)) return null;
      return { t: "hello", v: raw.v, zone: raw.zone, name, appearance: raw.appearance };
    }
    case "state":
      return isValidPlayerState(raw.state) ? { t: "state", state: raw.state } : null;
    case "ping":
      return isFiniteNumber(raw.ts) ? { t: "ping", ts: raw.ts } : null;
    default:
      return null;
  }
}

/** Wire-size guard applied before JSON.parse on both ends. */
export function withinMessageBudget(raw: string | { byteLength: number }): boolean {
  const bytes = typeof raw === "string" ? raw.length : raw.byteLength;
  return bytes <= MP_MAX_MESSAGE_BYTES;
}
