import {
  Scene, MeshBuilder, StandardMaterial, Texture, Color3, Vector3, Mesh, DynamicTexture,
} from '@babylonjs/core';
import type { GameMap, Vec2 } from '../soul-drifter/game/types';
import { TERRAIN_DEFS } from '../soul-drifter/data/classes';
import { tileToWorld } from './world';
import { playerSpriteURL } from './sprites';

export function nameTag(scene: Scene, text: string, color = '#ffffff'): Mesh {
  const tex = new DynamicTexture(`nt-${text}-${color}`, { width: 256, height: 56 }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 56);
  ctx.font = '700 26px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 28);
  tex.update();
  const mat = new StandardMaterial(`ntm-${text}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  const plane = MeshBuilder.CreatePlane(`ntp-${text}`, { width: 1.4, height: 0.3 }, scene);
  plane.material = mat;
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  return plane;
}

export function makeBillboard(scene: Scene, name: string, dataURL: string, width = 0.85, height = 1.15): Mesh {
  const tex = new Texture(dataURL, scene, true, true, Texture.TRILINEAR_SAMPLINGMODE);
  tex.hasAlpha = true;
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.backFaceCulling = false;
  const plane = MeshBuilder.CreatePlane(name, { width, height }, scene);
  plane.material = mat;
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  return plane;
}

export function makeBlobShadow(scene: Scene, name: string, radius = 0.28): Mesh {
  const disc = MeshBuilder.CreateDisc(name, { radius, tessellation: 20 }, scene);
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = Color3.Black();
  mat.alpha = 0.35;
  mat.disableLighting = true;
  disc.material = mat;
  disc.rotation.x = Math.PI / 2;
  disc.isPickable = false;
  return disc;
}

export function walkableAt(map: GameMap, x: number, y: number, blocked?: Set<string>): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  const tile = map.tiles[y]?.[x];
  if (!tile) return false;
  const def = TERRAIN_DEFS[tile.terrain];
  if (!def || !def.walkable) return false;
  if (blocked && blocked.has(`${x},${y}`)) return false;
  return true;
}

/** 8-dir BFS with no corner cutting. */
export function bfsPath(map: GameMap, from: Vec2, to: Vec2, blocked?: Set<string>): Vec2[] {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walkableAt(map, to.x, to.y, blocked)) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, string>();
  const q: Vec2[] = [from];
  const seen = new Set<string>([key(from.x, from.y)]);
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === to.x && cur.y === to.y) {
      const path: Vec2[] = [];
      let k = key(to.x, to.y);
      while (k !== key(from.x, from.y)) {
        const [px, py] = k.split(',').map(Number);
        path.unshift({ x: px, y: py });
        k = prev.get(k)!;
      }
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const nk = key(nx, ny);
      if (seen.has(nk) || !walkableAt(map, nx, ny, blocked)) continue;
      if (dx !== 0 && dy !== 0) {
        // no cutting corners
        if (!walkableAt(map, cur.x + dx, cur.y, blocked) || !walkableAt(map, cur.x, cur.y + dy, blocked)) continue;
      }
      seen.add(nk);
      prev.set(nk, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  return [];
}

const MOVE_SPEED = 3.6; // tiles per second

export class PlayerController {
  tile: Vec2;
  node: Mesh;
  tag: Mesh;
  shadow: Mesh;
  private queue: Vec2[] = [];
  private moving = false;
  private lerpT = 0;
  private fromWorld = Vector3.Zero();
  private toWorld = Vector3.Zero();
  private keys = new Set<string>();
  private stepCooldown = 0;
  private stepDist = 1;
  private blocked: () => Set<string>;

  constructor(
    private scene: Scene,
    private map: GameMap,
    start: Vec2,
    blockedTiles: () => Set<string>,
    classId?: string,
    playerName = 'Drifter',
  ) {
    this.tile = { ...start };
    this.blocked = blockedTiles;
    this.node = makeBillboard(scene, 'player', playerSpriteURL(classId), 0.8, 1.1);
    const wp = tileToWorld(map, start.x, start.y);
    this.node.position = new Vector3(wp.x, 0.55, wp.z);
    this.tag = nameTag(scene, playerName, '#e8f4ff');
    this.tag.position = new Vector3(wp.x, 1.45, wp.z);
    this.shadow = makeBlobShadow(scene, 'player-shadow');
    this.shadow.position = new Vector3(wp.x, 0.02, wp.z);

    const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    window.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) { this.keys.add(k); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Click-to-move: path to a destination tile. */
  goTo(to: Vec2) {
    const path = bfsPath(this.map, this.currentTile(), to, this.blocked());
    if (path.length) this.queue = path;
  }

  private currentTile(): Vec2 {
    return this.moving ? { ...this.tile } : { ...this.tile };
  }

  private keyDir(): Vec2 | null {
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    return dx === 0 && dy === 0 ? null : { x: dx, y: dy };
  }

  private startStep(to: Vec2) {
    this.fromWorld = tileToWorld(this.map, this.tile.x, this.tile.y);
    this.toWorld = tileToWorld(this.map, to.x, to.y);
    const dist = Math.max(Math.abs(to.x - this.tile.x), Math.abs(to.y - this.tile.y));
    this.lerpT = 0;
    this.moving = true;
    this.tile = { ...to };
    this.stepDist = dist;
  }

  update(dt: number) {
    // bob animation
    const bob = Math.sin(performance.now() / 320) * 0.03;

    if (this.moving) {
      const dist = this.stepDist || 1;
      this.lerpT += (dt * MOVE_SPEED) / dist;
      if (this.lerpT >= 1) {
        this.moving = false;
        this.node.position.set(this.toWorld.x, 0.55, this.toWorld.z);
        this.shadow.position.set(this.toWorld.x, 0.02, this.toWorld.z);
      } else {
        const p = Vector3.Lerp(this.fromWorld, this.toWorld, this.lerpT);
        // little hop while walking
        const hop = Math.sin(this.lerpT * Math.PI) * 0.08;
        this.node.position.set(p.x, 0.55 + hop, p.z);
        this.shadow.position.set(p.x, 0.02, p.z);
      }
      this.tag.position.set(this.node.position.x, this.node.position.y + 0.9 + bob, this.node.position.z);
      return;
    }

    this.node.position.y = 0.55 + bob;
    this.tag.position.set(this.node.position.x, this.node.position.y + 0.9, this.node.position.z);

    // consume click-path queue
    if (this.queue.length) {
      const next = this.queue.shift()!;
      if (walkableAt(this.map, next.x, next.y, this.blocked())) this.startStep(next);
      return;
    }

    // WASD stepping
    this.stepCooldown -= dt;
    const dir = this.keyDir();
    if (dir && this.stepCooldown <= 0) {
      const nx = this.tile.x + dir.x;
      const ny = this.tile.y + dir.y;
      const diag = dir.x !== 0 && dir.y !== 0;
      const ok = walkableAt(this.map, nx, ny, this.blocked())
        && (!diag || (walkableAt(this.map, this.tile.x + dir.x, this.tile.y, this.blocked()) && walkableAt(this.map, this.tile.x, this.tile.y + dir.y, this.blocked())));
      if (ok) {
        this.startStep({ x: nx, y: ny });
        this.stepCooldown = 0.02;
      } else {
        this.stepCooldown = 0.12;
      }
    }
  }

  teleport(map: GameMap, tile: Vec2) {
    this.map = map;
    this.queue = [];
    this.moving = false;
    this.tile = { ...tile };
    const wp = tileToWorld(map, tile.x, tile.y);
    this.node.position.set(wp.x, 0.55, wp.z);
    this.shadow.position.set(wp.x, 0.02, wp.z);
    this.tag.position.set(wp.x, 1.45, wp.z);
  }

  get worldPos(): Vector3 {
    return this.node.position;
  }
}
