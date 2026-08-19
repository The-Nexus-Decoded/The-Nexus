/**
 * ZoneDirectory — shard overflow instancing for zone semi-zones.
 *
 * Sits above ZoneRoom: each zone id (e.g. a Heartvale section like "hv-1")
 * owns one or more shards, shard id `<zone>#<n>`. Joins land in the first
 * non-full shard; when every shard is at the 30-player cap a fresh shard is
 * created on demand, so a busy section pushes overflow players into another
 * instance of the same area instead of rejecting them. `full` only happens
 * when the zone hits the hard `maxShards` ceiling (a safety valve, not the
 * normal path). Empty shards are closed so instance counts track real load.
 *
 * Transport-agnostic like ZoneRoom; server/zone-server.mjs wires it to
 * WebSockets, tests drive it directly.
 */

import { ZoneRoom, ZONE_PLAYER_CAP } from "./zone-room.mjs";

export const DEFAULT_MAX_SHARDS = 10;

export class ZoneDirectory {
  /**
   * @param {{ cap?: number, maxShards?: number,
   *   roomFactory?: (shardId: string) => ZoneRoom }} [options]
   */
  constructor(options = {}) {
    this.cap = options.cap ?? ZONE_PLAYER_CAP;
    this.maxShards = options.maxShards ?? DEFAULT_MAX_SHARDS;
    this.roomFactory = options.roomFactory ?? ((shardId) => new ZoneRoom(shardId, { cap: this.cap }));
    /** @type {Map<string, Map<string, ZoneRoom>>} zone id → (shard id → room) */
    this.zones = new Map();
  }

  /** @param {string} zoneId @returns {Map<string, ZoneRoom>} */
  shardsFor(zoneId) {
    let shards = this.zones.get(zoneId);
    if (!shards) {
      shards = new Map();
      this.zones.set(zoneId, shards);
    }
    return shards;
  }

  /**
   * Admits a player to the first non-full shard of the zone, creating a
   * shard on demand when all existing shards are at cap.
   * @param {string} zoneId
   * @param {{ name: string, appearance: object }} join
   * @returns {{ ok: true, room: ZoneRoom, shard: string, shards: number, player: object, snapshot: object[] }
   *   | { ok: false, reason: "full", cap: number, shards: number }}
   */
  join(zoneId, join) {
    const shards = this.shardsFor(zoneId);
    let room = null;
    for (const candidate of shards.values()) {
      if (candidate.size < candidate.cap) {
        room = candidate;
        break;
      }
    }
    if (!room) {
      if (shards.size >= this.maxShards) {
        return { ok: false, reason: "full", cap: this.cap, shards: shards.size };
      }
      const shardId = `${zoneId}#${this.nextShardSerial(shards)}`;
      room = this.roomFactory(shardId);
      shards.set(shardId, room);
    }
    const result = room.addPlayer(join);
    if (!result.ok) {
      // Raced full shard: retry once through the directory.
      return this.join(zoneId, join);
    }
    return { ok: true, room, shard: room.zoneId, shards: shards.size, player: result.player, snapshot: result.snapshot };
  }

  /**
   * Removes a player and closes the shard if it emptied out.
   * @returns {{ departed: object | null, shard: string, shardClosed: boolean, shards: number }}
   */
  leave(room, playerId) {
    const departed = room.removePlayer(playerId);
    const zoneId = room.zoneId.split("#")[0];
    const shards = this.shardsFor(zoneId);
    let shardClosed = false;
    if (room.size === 0) {
      shards.delete(room.zoneId);
      shardClosed = true;
    }
    if (shards.size === 0) this.zones.delete(zoneId);
    return { departed, shard: room.zoneId, shardClosed, shards: shards.size };
  }

  /** Live shard count for a zone (0 if the zone has never been joined). */
  shardCount(zoneId) {
    return this.zones.get(zoneId)?.size ?? 0;
  }

  /** Health-probe view: zone → shard → players/cap. */
  describe() {
    const view = {};
    for (const [zoneId, shards] of this.zones) {
      view[zoneId] = {};
      for (const [shardId, room] of shards) view[zoneId][shardId] = { players: room.size, cap: room.cap };
    }
    return view;
  }

  /** Lowest unused shard serial ≥ 1, so closed shards' numbers are reused. */
  nextShardSerial(shards) {
    if (shards.size === 0) return 1;
    const prefix = [...shards.keys()][0].split("#")[0];
    let serial = 1;
    while (shards.has(`${prefix}#${serial}`)) serial++;
    return serial;
  }
}
