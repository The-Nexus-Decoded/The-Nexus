/**
 * MultiplayerLayer — facade wiring the net client to the 3D world.
 *
 * The game creates one layer per active World3D when multiplayer is enabled
 * (see main.ts). The layer:
 *   - connects to the zone server and joins the zone room (30-player cap)
 *   - publishes the local player's transform every frame (throttled client-side)
 *   - mirrors remote players into the scene via RemoteAvatarManager
 *   - reports status to a callback (HUD badge, logs, telemetry)
 *
 * Heartvale integration: pass zone "heartvale" and, when the real rigs are
 * ready, call avatars.setAvatarFactory(...) with the GLB-backed factory.
 */

import type * as THREE from "three";
import { MpNetClient, type MpConnectionStatus } from "./netClient";
import { RemoteAvatarManager } from "./remoteAvatars";
import type { MpAppearance } from "./protocol";

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
}

export class MultiplayerLayer {
  readonly avatars: RemoteAvatarManager;
  private readonly client: MpNetClient;
  private unregisterFrame: (() => void) | null = null;

  constructor(private readonly options: MultiplayerLayerOptions) {
    this.avatars = new RemoteAvatarManager(options.bridge.scene);
    this.client = new MpNetClient(options.url, options.zone, options.playerName, options.appearance, {
      onStatus: (status) => options.onStatus?.(status),
      onJoin: (player) => this.avatars.add(player),
      onLeave: (id) => this.avatars.remove(id),
      onState: (id, state) => this.avatars.applyState(id, state),
    });
  }

  connect(): void {
    if (this.unregisterFrame) return;
    this.unregisterFrame = this.options.bridge.onFrame(() => {
      const local = this.options.bridge.localPlayerState();
      this.client.sendState(local.p, local.h, local.a);
      this.avatars.update(performance.now());
    });
    this.client.connect();
  }

  disconnect(): void {
    this.unregisterFrame?.();
    this.unregisterFrame = null;
    this.client.disconnect();
    this.avatars.removeAll();
  }

  get status(): string {
    return this.client.id ?? "offline";
  }
}

export function createMultiplayerLayer(options: MultiplayerLayerOptions): MultiplayerLayer {
  return new MultiplayerLayer(options);
}
