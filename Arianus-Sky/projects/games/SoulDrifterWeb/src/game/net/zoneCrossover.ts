/**
 * ZoneCrossover — the seamless zone-transition state machine (client half).
 *
 * Design: docs/THALENYR_SCALE_AND_SECTIONS.md §4. While the player walks a
 * Heartvale section, this manager:
 *   1. tracks zone membership by coordinates (zoneAt — never by road/river);
 *   2. PRE-JOIN: when the player comes within `prejoinDistance` (~50 m) of
 *      an adjacent zone's edge, opens a second client connection to that
 *      zone's shard;
 *   3. DUAL-RECEIVE: while inside the crossover band, remote players from
 *      both shards flow to the avatar manager; local state keeps publishing
 *      to the current (primary) zone only;
 *   4. TRANSFER: when zoneAt reports the neighbor, the secondary client
 *      becomes primary and starts publishing; the old primary is dropped
 *      after hysteresis (~2 s or ~10 m past the edge) to prevent flap;
 *   5. If the player turns back before crossing, the pre-joined client is
 *      dropped once the edge is farther than `releaseDistance`.
 *
 * Transport-agnostic: MpNetClient satisfies CrossoverClient; tests drive it
 * with fakes. One relay server process = globally unique player ids across
 * zones/shards, so dual-receive can share one RemoteAvatarManager.
 */

import { getZone, nearestAdjacentEdge, zoneAt, type ZoneDef } from "./heartvaleZones";

export interface CrossoverClient {
  readonly zoneId: string;
  readonly online: boolean;
  connect(): void;
  disconnect(): void;
  sendState(p: [number, number, number], h: number, a: string): void;
}

export type CrossoverPhase = "single" | "prejoining" | "dual" | "transferring";

export interface CrossoverStatus {
  phase: CrossoverPhase;
  primaryZone: string;
  /** Zone being pre-joined, when in the crossover band. */
  linkingZone?: string;
}

export interface ZoneCrossoverOptions {
  startZone: string;
  clientFactory: (zoneId: string) => CrossoverClient;
  prejoinDistance?: number;
  /** Secondary is dropped when the edge recedes past this (hysteresis margin). */
  releaseDistance?: number;
  hysteresisMs?: number;
  hysteresisMeters?: number;
  now?: () => number;
  onStatus?: (status: CrossoverStatus) => void;
}

export class ZoneCrossover {
  private primary: CrossoverClient;
  private secondary: CrossoverClient | null = null;
  private phase: CrossoverPhase = "single";
  private transferAt = 0;
  private readonly prejoinDistance: number;
  private readonly releaseDistance: number;
  private readonly hysteresisMs: number;
  private readonly hysteresisMeters: number;
  private readonly now: () => number;

  constructor(private readonly options: ZoneCrossoverOptions) {
    this.primary = options.clientFactory(options.startZone);
    this.prejoinDistance = options.prejoinDistance ?? 50;
    this.releaseDistance = options.releaseDistance ?? 65;
    this.hysteresisMs = options.hysteresisMs ?? 2000;
    this.hysteresisMeters = options.hysteresisMeters ?? 10;
    this.now = options.now ?? (() => performance.now());
  }

  get currentPhase(): CrossoverPhase {
    return this.phase;
  }

  get primaryZoneId(): string {
    return this.primary.zoneId;
  }

  connect(): void {
    this.primary.connect();
    this.emitStatus();
  }

  disconnect(): void {
    this.primary.disconnect();
    this.secondary?.disconnect();
    this.secondary = null;
    this.phase = "single";
  }

  /** Publishes through the primary zone only — even while dual-receiving. */
  sendState(p: [number, number, number], h: number, a: string): void {
    this.primary.sendState(p, h, a);
  }

  /** Per-frame update with the local player's world-frame position (meters). */
  update(x: number, z: number): void {
    // 1. Settle a pending transfer FIRST (never in the same call that
    //    started it, so "transferring" is always observable for a frame).
    if (this.phase === "transferring") {
      this.finishTransferWhenSettled(x, z);
    }

    // 2. Crossing confirm: zone membership changed → transfer presence.
    const here = zoneAt(x, z);
    if (here && here.id !== this.primary.zoneId) {
      this.transferTo(here);
      this.emitStatus();
      return; // no band management until the transfer settles
    }
    if (this.phase === "transferring") {
      this.emitStatus();
      return; // still inside the hysteresis window
    }

    // 3. Crossover-band management from the primary zone.
    const edge = nearestAdjacentEdge(x, z);
    if (!edge || edge.current.id !== this.primary.zoneId) {
      // Outside zoned ground: hold current connections, nothing to pre-join.
      this.emitStatus();
      return;
    }

    if (edge.distance <= this.prejoinDistance) {
      if (!this.secondary) {
        this.secondary = this.options.clientFactory(edge.neighbor.id);
        this.secondary.connect();
        this.phase = "prejoining";
      } else if (this.secondary.zoneId !== edge.neighbor.id && this.phase !== "dual") {
        // Corner case: nearest edge changed before the join finished — retarget.
        this.secondary.disconnect();
        this.secondary = this.options.clientFactory(edge.neighbor.id);
        this.secondary.connect();
      }
      if (this.secondary.zoneId === edge.neighbor.id && this.secondary.online) {
        this.phase = "dual";
      }
    } else if (this.secondary && edge.distance > this.releaseDistance) {
      // Turned back before crossing: release the pre-joined connection.
      this.secondary.disconnect();
      this.secondary = null;
      this.phase = "single";
    }
    this.emitStatus();
  }

  private transferTo(here: ZoneDef): void {
    const outgoing = this.primary;
    if (this.secondary && this.secondary.zoneId === here.id) {
      // The pre-joined client becomes primary; the old one enters hysteresis.
      this.primary = this.secondary;
      this.secondary = outgoing; // repurposed as the retired connection
    } else {
      // Crossed without a pre-join (teleport, spawn): join the new zone cold.
      this.primary = this.options.clientFactory(here.id);
      this.primary.connect();
      this.secondary = outgoing;
    }
    this.phase = "transferring";
    this.transferAt = this.now();
    this.emitStatus();
  }

  /** Drops the retired connection once past the hysteresis window. */
  private finishTransferWhenSettled(x: number, z: number): void {
    if (!this.secondary) {
      this.phase = "single";
      return;
    }
    const zone = getZone(this.primary.zoneId);
    if (!zone) return;
    const settledMs = this.now() - this.transferAt >= this.hysteresisMs;
    const { x0, z0, x1, z1 } = zone.rect;
    const inside = Math.min(x - x0, x1 - x, z - z0, z1 - z);
    const settledMeters = inside >= this.hysteresisMeters;
    if (!settledMs && !settledMeters) return;

    // Settled. If the player is still inside the crossover band, RETAIN the
    // retired client as the secondary (pre-join back the way we came) —
    // disconnecting and immediately re-joining the same zone would be churn.
    const edge = nearestAdjacentEdge(x, z);
    if (
      edge &&
      edge.current.id === this.primary.zoneId &&
      edge.distance <= this.prejoinDistance &&
      edge.neighbor.id === this.secondary.zoneId
    ) {
      this.phase = this.secondary.online ? "dual" : "prejoining";
      return;
    }
    this.secondary.disconnect();
    this.secondary = null;
    this.phase = "single";
  }

  private emitStatus(): void {
    this.options.onStatus?.({
      phase: this.phase,
      primaryZone: this.primary.zoneId,
      linkingZone: this.secondary && this.phase !== "transferring" ? this.secondary.zoneId : undefined,
    });
  }
}
