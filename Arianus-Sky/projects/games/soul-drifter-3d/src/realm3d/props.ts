import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, PointLight,
  TransformNode, ShadowGenerator,
} from '@babylonjs/core';
import type { GameMap, MapEntity } from '../soul-drifter/game/types';
import { isWallT, isWaterT, tileToWorld } from './world';
import { makeBillboard } from './player';
import { flameURL } from './sprites';
import { makeBrickTexture, shade } from './textures';

/** Deterministic per-tile hash so decoration is stable across reloads. */
function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export interface Decor {
  root: TransformNode;
  flames: Mesh[];
  torchLights: PointLight[];
  dispose: () => void;
}

const MAX_TORCHES = 6;

export function decorateWorld(scene: Scene, map: GameMap, entities: MapEntity[], shadowGen: ShadowGenerator): Decor {
  const root = new TransformNode(`decor-${map.id}`, scene);
  const flames: Mesh[] = [];
  const torchLights: PointLight[] = [];

  // shared materials
  const trimMat = new StandardMaterial('trim-mat', scene);
  const trimTex = makeBrickTexture(scene, 'trim', '#6a6a7e', '#8a8aa0');
  trimMat.diffuseTexture = trimTex;
  trimMat.specularColor = Color3.Black();
  trimMat.maxSimultaneousLights = 8;

  const pillarMat = new StandardMaterial('pillar-mat', scene);
  const pillarTex = makeBrickTexture(scene, 'pillar', '#4e4e60', '#6e6e82');
  pillarMat.diffuseTexture = pillarTex;
  pillarMat.specularColor = Color3.Black();
  pillarMat.maxSimultaneousLights = 8;

  const rubbleMat = new StandardMaterial('rubble-mat', scene);
  rubbleMat.diffuseColor = Color3.FromHexString('#55555f');
  rubbleMat.specularColor = Color3.Black();
  rubbleMat.maxSimultaneousLights = 8;

  const coralMat = new StandardMaterial('coral-mat', scene);
  coralMat.diffuseColor = Color3.FromHexString('#3e8e7e');
  coralMat.emissiveColor = Color3.FromHexString('#5eead4').scale(0.18);
  coralMat.specularColor = Color3.Black();
  coralMat.maxSimultaneousLights = 8;

  const kelpMat = new StandardMaterial('kelp-mat', scene);
  kelpMat.diffuseColor = Color3.FromHexString('#1e5e3e');
  kelpMat.emissiveColor = Color3.FromHexString('#2e8e5e').scale(0.12);
  kelpMat.specularColor = Color3.Black();
  kelpMat.maxSimultaneousLights = 8;

  const walkable = (x: number, y: number): boolean => {
    const t = map.tiles[y]?.[x];
    if (!t) return false;
    return !isWallT(t.terrain) && !isWaterT(t.terrain);
  };
  const wallAt = (x: number, y: number): boolean => {
    const t = map.tiles[y]?.[x];
    return !!t && isWallT(t.terrain);
  };

  let torches = 0;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      const pos = tileToWorld(map, x, y);
      const elev = (tile.elevation || 0) * 0.25;

      if (isWallT(tile.terrain)) {
        // cap trim on every wall block
        const cap = MeshBuilder.CreateBox(`cap-${x}-${y}`, { width: 1.08, height: 0.12, depth: 1.08 }, scene);
        cap.position = new Vector3(pos.x, elev + 1.56, pos.z);
        cap.material = trimMat;
        cap.parent = root;
        cap.isPickable = false;

        // pillars where a wall touches open floor on 2+ sides (corners / doorframes)
        let openSides = 0;
        if (walkable(x + 1, y)) openSides++;
        if (walkable(x - 1, y)) openSides++;
        if (walkable(x, y + 1)) openSides++;
        if (walkable(x, y - 1)) openSides++;
        if (openSides >= 2 && hash(x, y, 7) < 0.7) {
          const pillar = MeshBuilder.CreateCylinder(`pil-${x}-${y}`, { height: 1.9, diameterTop: 0.42, diameterBottom: 0.55, tessellation: 10 }, scene);
          pillar.position = new Vector3(pos.x, elev + 0.95, pos.z);
          pillar.material = pillarMat;
          pillar.parent = root;
          pillar.isPickable = false;
          pillar.receiveShadows = true;
          shadowGen.addShadowCaster(pillar);
          const pcap = MeshBuilder.CreateBox(`pcap-${x}-${y}`, { width: 0.66, height: 0.14, depth: 0.66 }, scene);
          pcap.position = new Vector3(pos.x, elev + 1.95, pos.z);
          pcap.material = trimMat;
          pcap.parent = root;
          pcap.isPickable = false;
        }
        continue;
      }
      if (isWaterT(tile.terrain)) continue;

      // wall torches: floor tiles beside a wall, hash-gated, capped per map
      if (torches < MAX_TORCHES && hash(x, y, 3) < 0.4) {
        let tx = 0, tz = 0;
        if (wallAt(x, y - 1)) tz = -0.38;
        else if (wallAt(x, y + 1)) tz = 0.38;
        else if (wallAt(x - 1, y)) tx = -0.38;
        else if (wallAt(x + 1, y)) tx = 0.38;
        if (tx !== 0 || tz !== 0) {
          torches++;
          // bracket
          const bracket = MeshBuilder.CreateBox(`tb-${x}-${y}`, { width: 0.08, height: 0.5, depth: 0.08 }, scene);
          bracket.position = new Vector3(pos.x + tx, elev + 0.85, pos.z + tz);
          bracket.material = rubbleMat;
          bracket.parent = root;
          bracket.isPickable = false;
          // flame billboard
          const flame = makeBillboard(scene, `tf-${x}-${y}`, flameURL(), 0.3, 0.45);
          flame.position = new Vector3(pos.x + tx, elev + 1.3, pos.z + tz);
          flame.parent = root;
          flame.isPickable = false;
          flames.push(flame);
          // warm point light
          const light = new PointLight(`tl-${x}-${y}`, new Vector3(pos.x + tx, elev + 1.35, pos.z + tz), scene);
          light.diffuse = Color3.FromHexString('#ff9a3c');
          light.intensity = 0.55;
          light.range = 6.5;
          torchLights.push(light);
        }
      }

      // rubble near cracked stone
      if (tile.terrain === 'floor_stone_cracked' && hash(x, y, 11) < 0.6) {
        const n = 2 + Math.floor(hash(x, y, 12) * 2);
        for (let i = 0; i < n; i++) {
          const s = 0.1 + hash(x, y, 20 + i) * 0.14;
          const rock = MeshBuilder.CreateBox(`rub-${x}-${y}-${i}`, { width: s, height: s * 0.7, depth: s }, scene);
          rock.position = new Vector3(
            pos.x + (hash(x, y, 30 + i) - 0.5) * 0.6,
            elev + s * 0.3,
            pos.z + (hash(x, y, 40 + i) - 0.5) * 0.6,
          );
          rock.rotation.y = hash(x, y, 50 + i) * Math.PI;
          rock.rotation.z = (hash(x, y, 60 + i) - 0.5) * 0.5;
          rock.material = rubbleMat;
          rock.parent = root;
          rock.isPickable = false;
          rock.receiveShadows = true;
        }
      }

      // Chelestra: coral clusters on glowing coral, kelp strands on kelp floor
      if (tile.terrain === 'glow_coral') {
        const n = 2 + Math.floor(hash(x, y, 71) * 3);
        for (let i = 0; i < n; i++) {
          const h = 0.25 + hash(x, y, 80 + i) * 0.45;
          const cone = MeshBuilder.CreateCylinder(`cor-${x}-${y}-${i}`, { height: h, diameterTop: 0.03, diameterBottom: 0.16, tessellation: 7 }, scene);
          cone.position = new Vector3(
            pos.x + (hash(x, y, 90 + i) - 0.5) * 0.7,
            elev + h / 2,
            pos.z + (hash(x, y, 100 + i) - 0.5) * 0.7,
          );
          cone.rotation.z = (hash(x, y, 110 + i) - 0.5) * 0.35;
          cone.material = coralMat;
          cone.parent = root;
          cone.isPickable = false;
        }
      }
      if (tile.terrain === 'floor_kelp' && hash(x, y, 75) < 0.65) {
        const n = 2 + Math.floor(hash(x, y, 76) * 3);
        for (let i = 0; i < n; i++) {
          const h = 0.6 + hash(x, y, 120 + i) * 0.9;
          const strand = MeshBuilder.CreateCylinder(`kelp-${x}-${y}-${i}`, { height: h, diameterTop: 0.02, diameterBottom: 0.07, tessellation: 6 }, scene);
          strand.position = new Vector3(
            pos.x + (hash(x, y, 130 + i) - 0.5) * 0.8,
            elev + h / 2,
            pos.z + (hash(x, y, 140 + i) - 0.5) * 0.8,
          );
          strand.rotation.x = (hash(x, y, 150 + i) - 0.5) * 0.22;
          strand.rotation.z = (hash(x, y, 160 + i) - 0.5) * 0.22;
          strand.material = kelpMat;
          strand.parent = root;
          strand.isPickable = false;
        }
      }
    }
  }

  // arches at door entities: two pillars + a lintel over the doorway
  for (const e of entities) {
    if (e.type !== 'door') continue;
    const wp = tileToWorld(map, e.x, e.y);
    const elev = ((map.tiles[e.y]?.[e.x]?.elevation) || 0) * 0.25;
    for (const dx of [-0.55, 0.55]) {
      const post = MeshBuilder.CreateCylinder(`arch-${e.id}-${dx}`, { height: 1.8, diameterTop: 0.22, diameterBottom: 0.3, tessellation: 8 }, scene);
      post.position = new Vector3(wp.x + dx, elev + 0.9, wp.z);
      post.material = pillarMat;
      post.parent = root;
      post.isPickable = false;
      shadowGen.addShadowCaster(post);
    }
    const lintel = MeshBuilder.CreateBox(`archl-${e.id}`, { width: 1.5, height: 0.22, depth: 0.4 }, scene);
    lintel.position = new Vector3(wp.x, elev + 1.9, wp.z);
    lintel.material = trimMat;
    lintel.parent = root;
    lintel.isPickable = false;
    // accent glow on the lintel, tinted like the gate
    const accent = new StandardMaterial(`archa-${e.id}`, scene);
    accent.emissiveColor = Color3.FromHexString(shade('#a855f7', 0)).scale(0.5);
    accent.disableLighting = true;
    const strip = MeshBuilder.CreateBox(`archs-${e.id}`, { width: 1.2, height: 0.06, depth: 0.42 }, scene);
    strip.position = new Vector3(wp.x, elev + 1.8, wp.z);
    strip.material = accent;
    strip.parent = root;
    strip.isPickable = false;
  }

  return {
    root,
    flames,
    torchLights,
    dispose: () => {
      root.dispose();
      for (const l of torchLights) l.dispose();
    },
  };
}
