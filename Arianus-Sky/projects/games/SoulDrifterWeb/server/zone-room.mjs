/**
 * ZoneRoom — pure zone-instance logic for the multiplayer base layer.
 *
 * One room per zone id (e.g. "heartvale"). Enforces the 30-player concurrent
 * cap, tracks last-known state per player, rate-limits state relay, and
 * produces the exact outbound messages for each event. Transport-agnostic:
 * server/zone-server.mjs wires it to WebSockets; tests drive it directly.
 */

export const ZONE_PLAYER_CAP = 30;
export const MAX_STATE_RELAYS_PER_SECOND = 20;

let nextPlayerSerial = 1;

export function resetPlayerSerialForTests() {
  nextPlayerSerial = 1;
}

export class ZoneRoom {
  /**
   * @param {string} zoneId
   * @param {{ cap?: number, maxStateHz?: number, now?: () => number }} [options]
   */
  constructor(zoneId, options = {}) {
    this.zoneId = zoneId;
    this.cap = options.cap ?? ZONE_PLAYER_CAP;
    this.maxStateHz = options.maxStateHz ?? MAX_STATE_RELAYS_PER_SECOND;
    this.now = options.now ?? (() => Date.now());
    /** @type {Map<string, { id: string, name: string, appearance: object, state: object|null, relays: number[] }>} */
    this.players = new Map();
  }

  get size() {
    return this.players.size;
  }

  /**
   * @param {{ name: string, appearance: object }} join
   * @returns {{ ok: true, player: object, snapshot: object[] } | { ok: false, reason: "full", cap: number }}
   */
  addPlayer(join) {
    if (this.players.size >= this.cap) {
      return { ok: false, reason: "full", cap: this.cap };
    }
    const player = {
      id: `drifter-${nextPlayerSerial++}`,
      name: join.name,
      appearance: join.appearance,
      state: null,
      relays: [],
    };
    this.players.set(player.id, player);
    const snapshot = [...this.players.values()]
      .filter((other) => other.id !== player.id)
      .map((other) => ({ id: other.id, name: other.name, appearance: other.appearance, state: other.state }));
    return { ok: true, player, snapshot };
  }

  /**
   * @returns {{ id: string, name: string, appearance: object, state: object|null } | null}
   */
  removePlayer(id) {
    const player = this.players.get(id);
    if (!player) return null;
    this.players.delete(id);
    return { id: player.id, name: player.name, appearance: player.appearance, state: player.state };
  }

  /**
   * Records a state update and decides the relay message, honoring the
   * per-player relay clamp. Out-of-order seqs are dropped.
   * @returns {{ broadcast: { t: "state", id: string, state: object } } | { drop: true }}
   */
  applyState(id, state) {
    const player = this.players.get(id);
    if (!player) return { drop: true };
    if (player.state && state.seq <= player.state.seq) return { drop: true };

    const now = this.now();
    const windowStart = now - 1000;
    player.relays = player.relays.filter((at) => at >= windowStart);
    if (player.relays.length >= this.maxStateHz) return { drop: true };
    player.relays.push(now);

    player.state = state;
    return { broadcast: { t: "state", id, state } };
  }

  /** Snapshot for a late joiner (excludes the joiner). */
  snapshotFor(id) {
    return [...this.players.values()]
      .filter((other) => other.id !== id)
      .map((other) => ({ id: other.id, name: other.name, appearance: other.appearance, state: other.state }));
  }
}
