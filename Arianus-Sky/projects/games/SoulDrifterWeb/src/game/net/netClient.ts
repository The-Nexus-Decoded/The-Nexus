/**
 * Browser WebSocket client for the multiplayer base layer.
 *
 * Owns the connection lifecycle: hello/welcome handshake, join/leave/state
 * dispatch, heartbeat, throttled state sends, and bounded backoff reconnect.
 * Rendering lives in remoteAvatars.ts; this class is transport + session only.
 */

import {
  MP_CLIENT_STATE_HZ,
  MP_IDLE_TIMEOUT_MS,
  MP_MAX_ZONE_PLAYERS,
  MP_PING_INTERVAL_MS,
  MP_PROTOCOL_VERSION,
  withinMessageBudget,
  type MpAppearance,
  type MpClientMessage,
  type MpPlayerSnapshot,
  type MpPlayerState,
  type MpServerMessage,
} from "./protocol";

export type MpConnectionStatus =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "online"; id: string; playerCount: number; cap: number; shard?: string; shards?: number; linking?: string }
  | { kind: "full"; cap: number }
  | { kind: "offline"; reason: string };

export interface NetClientHandlers {
  onStatus(status: MpConnectionStatus): void;
  onJoin(player: MpPlayerSnapshot): void;
  onLeave(id: string): void;
  onState(id: string, state: MpPlayerState): void;
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

export class MpNetClient {
  private ws: WebSocket | null = null;
  private playerId: string | null = null;
  private seq = 0;
  private lastSentAt = 0;
  private lastReceivedAt = 0;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private closedByUser = false;
  private players = new Map<string, MpPlayerSnapshot>();
  private shard: string | undefined;
  private shardCount: number | undefined;

  constructor(
    private readonly url: string,
    private readonly zone: string,
    private readonly name: string,
    private readonly appearance: MpAppearance,
    private readonly handlers: NetClientHandlers,
  ) {}

  connect(): void {
    this.closedByUser = false;
    this.openSocket();
  }

  disconnect(): void {
    this.closedByUser = true;
    this.clearTimers();
    this.ws?.close(1000, "client leaving");
    this.ws = null;
    this.players.clear();
    this.handlers.onStatus({ kind: "idle" });
  }

  get id(): string | null {
    return this.playerId;
  }

  get zoneId(): string {
    return this.zone;
  }

  /** True after a welcome — the connection is joined to a shard. */
  get online(): boolean {
    return this.playerId !== null;
  }

  get playerCount(): number {
    return this.players.size + (this.playerId ? 1 : 0);
  }

  /** Throttled to MP_CLIENT_STATE_HZ; silently dropped while offline. */
  sendState(p: [number, number, number], h: number, a: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.playerId) return;
    const now = performance.now();
    if (now - this.lastSentAt < 1000 / MP_CLIENT_STATE_HZ) return;
    this.lastSentAt = now;
    this.send({ t: "state", state: { p, h, a, seq: this.seq++ } });
  }

  private openSocket(): void {
    this.handlers.onStatus({ kind: "connecting" });
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.lastReceivedAt = performance.now();
      this.send({
        t: "hello",
        v: MP_PROTOCOL_VERSION,
        zone: this.zone,
        name: this.name,
        appearance: this.appearance,
      });
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string" || !withinMessageBudget(event.data)) return;
      this.lastReceivedAt = performance.now();
      let message: MpServerMessage;
      try {
        message = JSON.parse(event.data) as MpServerMessage;
      } catch {
        return;
      }
      this.handleServerMessage(message);
    };

    ws.onclose = () => {
      this.clearTimers();
      this.playerId = null;
      this.players.clear();
      if (this.closedByUser) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]!;
      this.reconnectAttempt++;
      this.handlers.onStatus({ kind: "offline", reason: `connection lost — retrying in ${Math.round(delay / 1000)}s` });
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
    };

    ws.onerror = () => {
      // onclose follows and handles the reconnect path.
    };
  }

  private handleServerMessage(message: MpServerMessage): void {
    switch (message.t) {
      case "welcome": {
        this.playerId = message.id;
        this.shard = message.shard;
        this.shardCount = message.shards;
        this.reconnectAttempt = 0;
        this.players.clear();
        for (const player of message.players) {
          this.players.set(player.id, player);
          this.handlers.onJoin(player);
        }
        this.emitOnline();
        this.startHeartbeat();
        break;
      }
      case "full":
        this.handlers.onStatus({ kind: "full", cap: message.cap ?? MP_MAX_ZONE_PLAYERS });
        this.closedByUser = true; // do not hammer a full room with reconnects
        this.ws?.close(4000, "zone full");
        break;
      case "join":
        this.players.set(message.player.id, message.player);
        this.handlers.onJoin(message.player);
        this.emitOnline();
        break;
      case "leave":
        this.players.delete(message.id);
        this.handlers.onLeave(message.id);
        this.emitOnline();
        break;
      case "state": {
        const known = this.players.get(message.id);
        if (known) {
          this.players.set(message.id, { ...known, state: message.state });
          this.handlers.onState(message.id, message.state);
        }
        break;
      }
      case "pong":
        break;
      case "error":
        this.handlers.onStatus({ kind: "offline", reason: message.message });
        break;
    }
  }

  private emitOnline(): void {
    if (!this.playerId) return;
    this.handlers.onStatus({
      kind: "online",
      id: this.playerId,
      playerCount: this.playerCount,
      cap: MP_MAX_ZONE_PLAYERS,
      shard: this.shard,
      shards: this.shardCount,
    });
  }

  private startHeartbeat(): void {
    this.clearTimers();
    this.pingTimer = window.setInterval(() => {
      if (performance.now() - this.lastReceivedAt > MP_IDLE_TIMEOUT_MS) {
        this.ws?.close(4001, "idle timeout");
        return;
      }
      this.send({ t: "ping", ts: Date.now() });
    }, MP_PING_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.pingTimer = null;
    this.reconnectTimer = null;
  }

  private send(message: MpClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }
}
