import {
  Scene, MeshBuilder, StandardMaterial, DynamicTexture, Color3,
  TransformNode, AbstractMesh, ShadowGenerator, Vector3, Mesh,
} from '@babylonjs/core';
import type { GameMap, MapTile } from '../soul-drifter/game/types';
import { TERRAIN_DEFS } from '../soul-drifter/data/classes';
import { makeGroundTexture, makeBrickTexture, shade, type GroundKind } from './textures';

const WALL_T = new Set(['wall_stone', 'wall_rune', 'wall_breach', 'wall_basalt', 'wall_coral']);
const WATER_T = new Set(['water_shallow', 'water_deep', 'current_lane']);
export const isWallT = (t: string) => WALL_T.has(t);
export const isWaterT = (t: string) => WATER_T.has(t);

function groundKind(terrain: string): GroundKind {
  switch (terrain) {
    case 'floor_stone': return 'flagstone';
    case 'floor_stone_cracked': return 'cracked';
    case 'floor_soulwell': return 'soulwell';
    case 'floor_wood': return 'planks';
    case 'floor_grass': return 'grass';
    case 'floor_sand': return 'sand';
    case 'floor_kelp': return 'kelp';
    case 'water_shallow': case 'current_lane': return 'water';
    case 'water_deep': return 'deepwater';
    case 'glow_coral': return 'glow';
    case 'lava': return 'lava';
    default: return 'plain';
  }
}

export interface BuiltWorld {
  root: TransformNode;
  waterTextures: DynamicTexture[];
  groundByTile: Map<string, AbstractMesh>;
  entityMeshes: AbstractMesh[];
  dispose: () => void;
}

const matCache = new Map<string, StandardMaterial>();

function groundMaterial(scene: Scene, terrain: string): { mat: StandardMaterial; tex: DynamicTexture | null } {
  const def = TERRAIN_DEFS[terrain];
  const base = def?.color || '#3a3a4a';
  const detail = def?.detailColor || shade(base, 20);
  const kind = groundKind(terrain);
  const key = `${terrain}`;
  let mat = matCache.get(key);
  let tex: DynamicTexture | null = null;
  if (!mat) {
    tex = makeGroundTexture(scene, key, base, detail, kind);
    mat = new StandardMaterial(`gm-${key}`, scene);
    mat.diffuseTexture = tex;
    mat.specularColor = Color3.Black();
    if (kind === 'water' || kind === 'deepwater') {
      mat.alpha = 0.88;
      mat.emissiveColor = Color3.FromHexString(detail).scale(0.12);
      mat.specularColor = new Color3(0.4, 0.5, 0.55);
      mat.specularPower = 64;
    } else if (kind === 'glow') {
      mat.emissiveColor = Color3.FromHexString(detail).scale(0.35);
    } else if (kind === 'lava') {
      mat.emissiveColor = Color3.FromHexString('#FF6B35').scale(0.5);
    } else if (kind === 'soulwell') {
      mat.emissiveColor = Color3.FromHexString(detail).scale(0.15);
    }
    matCache.set(key, mat);
  }
  return { mat, tex };
}

function wallMaterial(scene: Scene, terrain: string): StandardMaterial {
  const def = TERRAIN_DEFS[terrain];
  const base = def?.color || '#5a5a6a';
  const detail = def?.detailColor || shade(base, 20);
  const key = `wall-${terrain}`;
  let mat = matCache.get(key);
  if (!mat) {
    const tex = makeBrickTexture(scene, key, base, detail);
    mat = new StandardMaterial(`wm-${key}`, scene);
    mat.diffuseTexture = tex;
    mat.specularColor = Color3.Black();
    if (terrain === 'wall_rune') mat.emissiveColor = Color3.FromHexString('#a855f7').scale(0.08);
    if (terrain === 'wall_coral') mat.emissiveColor = Color3.FromHexString('#5eead4').scale(0.06);
    matCache.set(key, mat);
  }
  return mat;
}

/** Tile grid → world coords. Map is centered on the origin. */
export function tileToWorld(map: GameMap, x: number, y: number): Vector3 {
  return new Vector3(x - map.width / 2 + 0.5, 0, y - map.height / 2 + 0.5);
}

export function worldToTile(map: GameMap, wx: number, wz: number): { x: number; y: number } {
  return { x: Math.floor(wx + map.width / 2), y: Math.floor(wz + map.height / 2) };
}

const WALL_H = 1.5;

export function buildWorld(scene: Scene, map: GameMap, shadowGen: ShadowGenerator): BuiltWorld {
  const root = new TransformNode(`world-${map.id}`, scene);
  const waterTextures: DynamicTexture[] = [];
  const groundByTile = new Map<string, AbstractMesh>();
  const entityMeshes: AbstractMesh[] = [];
  const disposables: { dispose: () => void }[] = [root];

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile: MapTile | undefined = map.tiles[y]?.[x];
      if (!tile) continue;
      const pos = tileToWorld(map, x, y);
      const elev = (tile.elevation || 0) * 0.25;

      if (isWallT(tile.terrain)) {
        // base block under wall
        const base = MeshBuilder.CreateGround(`wb-${x}-${y}`, { width: 1, height: 1 }, scene);
        base.position = new Vector3(pos.x, elev + 0.001, pos.z);
        base.material = groundMaterial(scene, tile.terrain).mat;
        base.parent = root;
        base.receiveShadows = true;
        // the wall itself
        const wall = MeshBuilder.CreateBox(`w-${x}-${y}`, { width: 1, height: WALL_H, depth: 1 }, scene);
        wall.position = new Vector3(pos.x, elev + WALL_H / 2, pos.z);
        wall.material = wallMaterial(scene, tile.terrain);
        wall.parent = root;
        wall.receiveShadows = true;
        shadowGen.addShadowCaster(wall);
        groundByTile.set(`${x},${y}`, wall);
      } else if (isWaterT(tile.terrain)) {
        // sunken bed + animated water surface
        const bed = MeshBuilder.CreateGround(`wbed-${x}-${y}`, { width: 1, height: 1 }, scene);
        bed.position = new Vector3(pos.x, elev - 0.22, pos.z);
        const bedMat = new StandardMaterial(`wbedm-${x}-${y}`, scene);
        bedMat.diffuseColor = Color3.FromHexString('#0a1e30');
        bedMat.specularColor = Color3.Black();
        bed.material = bedMat;
        bed.parent = root;
        const water = MeshBuilder.CreateGround(`ww-${x}-${y}`, { width: 1, height: 1 }, scene);
        water.position = new Vector3(pos.x, elev - 0.08, pos.z);
        const { mat, tex } = groundMaterial(scene, tile.terrain);
        water.material = mat;
        if (tex && !waterTextures.includes(tex)) waterTextures.push(tex);
        water.parent = root;
        water.isPickable = false;
        groundByTile.set(`${x},${y}`, water);
      } else {
        const ground = MeshBuilder.CreateGround(`g-${x}-${y}`, { width: 1, height: 1 }, scene);
        ground.position = new Vector3(pos.x, elev, pos.z);
        ground.material = groundMaterial(scene, tile.terrain).mat;
        ground.parent = root;
        ground.receiveShadows = true;
        ground.metadata = { kind: 'ground', tileX: x, tileY: y };
        groundByTile.set(`${x},${y}`, ground);

        // glow accents
        if (tile.terrain === 'glow_coral' || tile.terrain === 'conduit_active') {
          const glowColor = tile.terrain === 'glow_coral' ? '#5eead4' : '#a855f7';
          const orb = MeshBuilder.CreateSphere(`orb-${x}-${y}`, { diameter: 0.18 }, scene);
          orb.position = new Vector3(pos.x, elev + 0.3, pos.z);
          const om = new StandardMaterial(`om-${x}-${y}`, scene);
          om.emissiveColor = Color3.FromHexString(glowColor);
          om.disableLighting = true;
          orb.material = om;
          orb.parent = root;
          orb.isPickable = false;
        }
        if (tile.terrain === 'cover_half') {
          const block = MeshBuilder.CreateBox(`cov-${x}-${y}`, { width: 0.7, height: 0.55, depth: 0.7 }, scene);
          block.position = new Vector3(pos.x, elev + 0.275, pos.z);
          block.material = wallMaterial(scene, 'wall_stone');
          block.parent = root;
          block.receiveShadows = true;
          shadowGen.addShadowCaster(block);
        }
      }
    }
  }

  return {
    root,
    waterTextures,
    groundByTile,
    entityMeshes,
    dispose: () => disposables.forEach(d => d.dispose()),
  };
}
