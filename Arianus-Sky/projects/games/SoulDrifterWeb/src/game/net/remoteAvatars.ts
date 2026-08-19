/**
 * Remote avatar manager for the multiplayer base layer.
 *
 * Spawns one placeholder rig per remote player (capsule body + head +
 * floating nameplate sprite), drives it from interpolated snapshots, and
 * disposes everything on leave. The placeholder is deliberately simple:
 * `setAvatarFactory` is the documented hook to swap in the real GLB
 * character rigs once the Heartvale zone integration lands.
 */

import * as THREE from "three";
import { SnapshotBuffer, type InterpolatedPose } from "./interpolation";
import type { MpPlayerSnapshot, MpPlayerState } from "./protocol";

export interface RemoteAvatar {
  root: THREE.Group;
  buffer: SnapshotBuffer;
  info: MpPlayerSnapshot;
  dispose(): void;
}

/** Factory hook: build a custom rig for a remote player. Must return a Group
 *  whose +Z faces the heading direction. */
export type RemoteAvatarFactory = (info: MpPlayerSnapshot) => THREE.Group;

function tintForPlayer(info: MpPlayerSnapshot): THREE.Color {
  if (info.appearance.tint) return new THREE.Color(info.appearance.tint);
  // Deterministic pleasant tint from the id so every client sees the same color.
  let hash = 0;
  for (let i = 0; i < info.id.length; i++) hash = (hash * 31 + info.id.charCodeAt(i)) | 0;
  const hue = ((hash % 360) + 360) % 360;
  return new THREE.Color().setHSL(hue / 360, 0.45, 0.55);
}

function buildNameplate(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(6, 10, 10, 0.55)";
  const textWidth = Math.min(240, ctx.measureText(name).width + 24);
  ctx.fillRect(128 - textWidth / 2, 10, textWidth, 44);
  ctx.fillStyle = "#e8dfc8";
  ctx.fillText(name, 128, 33, 232);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

function buildPlaceholderRig(info: MpPlayerSnapshot): THREE.Group {
  const group = new THREE.Group();
  group.name = `remote-player:${info.id}`;
  const tint = tintForPlayer(info);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.75, 6, 12),
    new THREE.MeshLambertMaterial({ color: tint }),
  );
  body.position.y = 0.85;
  body.name = "body";
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshLambertMaterial({ color: tint.clone().offsetHSL(0, 0, 0.12) }),
  );
  head.position.y = 1.62;
  head.name = "head";
  group.add(head);

  // Forward marker so heading reads at a glance (+Z forward).
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.22, 8),
    new THREE.MeshLambertMaterial({ color: 0xf2ead2 }),
  );
  nose.position.set(0, 1.62, 0.26);
  nose.rotation.x = Math.PI / 2;
  nose.name = "nose";
  group.add(nose);

  const plate = buildNameplate(info.name);
  plate.position.y = 2.1;
  plate.name = "nameplate";
  group.add(plate);
  return group;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      for (const m of Array.isArray(material) ? material : [material]) m.dispose();
    }
    if (child instanceof THREE.Sprite) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  });
}

export class RemoteAvatarManager {
  private readonly avatars = new Map<string, RemoteAvatar>();
  private factory: RemoteAvatarFactory = buildPlaceholderRig;

  constructor(private readonly scene: THREE.Scene) {}

  /** Swap the placeholder rig for real character models (Heartvale follow-up). */
  setAvatarFactory(factory: RemoteAvatarFactory): void {
    this.factory = factory;
  }

  get size(): number {
    return this.avatars.size;
  }

  has(id: string): boolean {
    return this.avatars.has(id);
  }

  add(info: MpPlayerSnapshot): void {
    if (this.avatars.has(info.id)) return;
    const root = this.factory(info);
    if (info.state) {
      root.position.set(info.state.p[0], info.state.p[1], info.state.p[2]);
      root.rotation.y = info.state.h;
    }
    this.scene.add(root);
    const buffer = new SnapshotBuffer();
    if (info.state) buffer.push(performance.now(), info.state);
    this.avatars.set(info.id, {
      root,
      buffer,
      info,
      dispose: () => disposeObject(root),
    });
  }

  applyState(id: string, state: MpPlayerState): void {
    this.avatars.get(id)?.buffer.push(performance.now(), state);
  }

  remove(id: string): void {
    const avatar = this.avatars.get(id);
    if (!avatar) return;
    this.scene.remove(avatar.root);
    avatar.dispose();
    this.avatars.delete(id);
  }

  removeAll(): void {
    for (const id of [...this.avatars.keys()]) this.remove(id);
  }

  /** Advance interpolation. Call once per rendered frame. */
  update(now: number): void {
    for (const avatar of this.avatars.values()) {
      const pose: InterpolatedPose | null = avatar.buffer.sample(now);
      if (!pose) continue;
      avatar.root.position.set(pose.x, pose.y, pose.z);
      avatar.root.rotation.y = pose.heading;
      // Placeholder locomotion cue: lean slightly while moving.
      const body = avatar.root.getObjectByName("body");
      if (body) body.rotation.x = pose.anim === "move" ? 0.12 : 0;
    }
  }
}
