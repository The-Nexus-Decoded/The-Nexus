/**
 * MultiplayerLayer — facade wiring the net client(s) to the 3D world.
 *
 * The game creates one layer per active World3D when multiplayer is enabled
 * (see main.ts). The layer:
 *   - connects to the zone server and joins the zone room (30-player cap,
 *     shard overflow instancing server-side)
 *   - publishes the local player's transform every frame (throttled client-side)
 *   - mirrors remote players into the scene via RemoteAvatarManager
 *   - reports status to a callback (HUD badge, logs, telemetry)
 *
 * Crossover mode (options.crossover): a ZoneCrossover state machine owns the
 * connections — pre-joining the adjacent zone's shard within ~50 m of a
 * seam, dual-receiving during the crossover band, and transferring presence
 * on crossing with hysteresis. No loading screens at zone seams. Remote
 * players from both shards render through the SAME RemoteAvatarManager
 * (player ids are unique per relay server process).
 *
 * Heartvale integration: pass zone "hv-1" (or any registry id) and, when the
 * real rigs are ready, call avatars.setAvatarFactory(...) with the
 * GLB-backed factory.
 */

import type * as THREE from "three";
import { MpNetClient, type MpConnectionStatus } from "./netClient";
import { RemoteAvatarManager } from "./remoteAvatars";
import type { MpAppearance } from "./protocol";
import { ZoneCrossover, type CrossoverStatus } from "./zoneCrossover";

/** Read-only view of the live world the layer needs. Provided by World3D. */
export interface WorldMultiplayerBridge {
  readonly scene: THREE.Scene;
  /** Local player transform + locomotion tag for this frame. */
  localPlayerState(): { p: [number, number, number]; h: number; a: string };
  /** Register a per-frame callback; returns an unregister function. */
  onFrame(cb: (delta: number, elapsed: number) => void): () => void;
}

export interface MultiplayerLayerOptions {
  url: string;
  zone: string;
  playerName: string;
  appearance: MpAppearance;
  bridge: WorldMultiplayerBridge;
  onStatus?: (status: MpConnectionStatus) => void;
  /** Enable seamless zone crossover (zone must be a registry id, e.g. "hv-1"). */
  crossover?: boolean;
}

export class MultiplayerLayer {
  readonly avatars: RemoteAvatarManager;
  private client: MpNetClient | null = null;
  private crossover: ZoneCrossover | null = null;
  private unregisterFrame: (() => void) | null = null;
  /** Last per-zone connection status, for badge composition in crossover mode. */
  private readonly clientStatus = new Map<string, MpConnectionStatus>();
  private linking: string | undefined;

  constructor(private readonly options: MultiplayerLayerOptions) {
    this.avatars = new RemoteAvatarManager(options.bridge.scene);
    if (options.crossover) {
      this.crossover = new ZoneCrossover({
        startZone: options.zone,
        clientFactory: (zoneId) => this.makeClient(zoneId),
        onStatus: (status) => this.handleCrossoverStatus(status),
      });
    } else {
      this.client = this.makeClient(options.zone);
    }
  }

  private makeClient(zoneId: string): MpNetClient {
    const { url, playerName, appearance } = this.options;
    return new MpNetClient(url, zoneId, playerName, appearance, {
      onStatus: (status) => {
        this.clientStatus.set(zoneId, status);
        if (!this.crossover) this.options.onStatus?.(status);
        else this.emitCrossoverStatus();
      },
      onJoin: (player) => this.avatars.add(player),
      onLeave: (id) => this.avatars.remove(id),
      onState: (id, state) => this.avatars.applyState(id, state),
    });
  }

  private handleCrossoverStatus(status: CrossoverStatus): void {
    this.linking = status.phase === "dual" || status.phase === "prejoining" ? status.linkingZone : undefined;
    this.emitCrossoverStatus();
  }

  /** Composes the badge status from the primary zone's client + phase. */
  private emitCrossoverStatus(): void {
    if (!this.crossover) return;
    const primary = this.clientStatus.get(this.crossover.primaryZoneId);
    if (!primary) {
      this.options.onStatus?.({ kind: "connecting" });
      return;
    }
    if (primary.kind === "online") {
      this.options.onStatus?.({ ...primary, linking: this.linking });
    } else {
      this.options.onStatus?.(primary);
    }
  }

  connect(): void {
    if (this.unregisterFrame) return;
    this.unregisterFrame = this.options.bridge.onFrame(() => {
      const local = this.options.bridge.localPlayerState();
      if (this.crossover) {
        this.crossover.update(local.p[0], local.p[2]);
        this.crossover.sendState(local.p, local.h, local.a);
      } else {
        this.client?.sendState(local.p, local.h, local.a);
      }
      this.avatars.update(performance.now());
    });
    if (this.crossover) this.crossover.connect();
    else this.client?.connect();
  }

  disconnect(): void {
    this.unregisterFrame?.();
    this.unregisterFrame = null;
    this.crossover?.disconnect();
    this.client?.disconnect();
    this.avatars.removeAll();
  }

  get status(): string {
    return this.crossover?.primaryZoneId ?? this.client?.id ?? "offline";
  }
}

export function createMultiplayerLayer(options: MultiplayerLayerOptions): MultiplayerLayer {
  return new MultiplayerLayer(options);
}
