/**
 * BREACH-V2 dungeon preview — `?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=vestibule`.
 *
 * True-3D indoor zone on the Heartvale preview pattern (owner ruling V15):
 * Three.js perspective camera, PBR kit + first-breach shell textures, real-time
 * lights, continuous geometry with the nav grid hidden underneath. Assembles
 * the seeded run LIVE from the registry via breach-v2-layout.ts — the same
 * data the Houdini build consumes — so preview and build never drift.
 *
 * Review hooks (runbook §5.5): window.__dungeonScene / __dungeonLayout /
 * __dungeonRenderer / __dungeonCamera / __dungeonControls / __dungeonFrames /
 * __dungeonLoopError / __dungeonStats.
 *
 * Level 01 is untouched: this module only runs behind the preview flag.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { buildBreachV2Layout, type BreachV2Layout } from "./breach-v2-layout.ts";
import { DUNGEON_PROP_ASSETS } from "../environment/DungeonPropCatalog";
import { instantiateDungeonProp, createDungeonFireEffect } from "../environment/DungeonPropKit";

const TEX_ROOT = "/assets/textures/environment/first-breach";
const ART_ROOT = "/assets/textures/environment/breach-v2/art";

const WALL_H = 3.2;
const WALL_H_GRAND = 4.0;
const WALL_H_BOSS = 4.5;
const WALL_T = 0.5;
const FLOOR_T = 0.3;
const DOOR_LINTEL_H = 2.6;

interface PreviewHooks {
  __dungeonScene: THREE.Scene;
  __dungeonLayout: BreachV2Layout;
  __dungeonRenderer: THREE.WebGLRenderer;
  __dungeonCamera: THREE.PerspectiveCamera;
  __dungeonControls: OrbitControls;
  __dungeonFrames: number;
  __dungeonLoopError: string | null;
  __dungeonStats: { calls: number; triangles: number; geometries: number; textures: number };
}

// ---------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------
function loadShellTextures(loader: THREE.TextureLoader) {
  const load = (name: string, srgb = false) => {
    const tex = loader.load(`${TEX_ROOT}/${name}`);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const make = (set: string) => {
    const ao = load(`${set}-ao.jpg`);
    ao.channel = 0; // share the world-scale UV channel
    return new THREE.MeshStandardMaterial({
      map: load(`${set}-color.jpg`, true),
      normalMap: load(`${set}-normal-gl.jpg`),
      roughnessMap: load(`${set}-roughness.jpg`),
      aoMap: ao,
      roughness: 1.0,
      metalness: 0.02,
    });
  };
  return { flagstone: make("flagstone"), masonry: make("masonry") };
}

/** World-scale UVs: one texture repeat per 4 m, so the grid never shows. */
function scaleBoxUV(geometry: THREE.BufferGeometry, w: number, h: number, d: number, repeat = 4): void {
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — 4 verts each
  const faceSizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face += 1) {
    const [fw, fh] = faceSizes[face]!;
    for (let v = 0; v < 4; v += 1) {
      const i = face * 4 + v;
      uv.setXY(i, uv.getX(i) * (fw / repeat), uv.getY(i) * (fh / repeat));
    }
  }
  uv.needsUpdate = true;
}

function texturedBox(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geometry, w, h, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// shell: floors + walls with door gaps + corridors (mirrors the Houdini build)
// ---------------------------------------------------------------------------
function buildShell(layout: BreachV2Layout, materials: { flagstone: THREE.Material; masonry: THREE.Material }): THREE.Group {
  const shell = new THREE.Group();
  shell.name = "breach-v2-shell";
  const rooms = layout.rooms;
  const corridors = layout.corridors;

  // ---- openings per room side ------------------------------------------------
  const openings = new Map<string, [number, number][]>();
  const sideOf = (room: BreachV2Layout["rooms"][number], px: number, pz: number): string | null => {
    const tol = 0.75;
    if (Math.abs(px - room.x) <= tol) return "W";
    if (Math.abs(px - (room.x + room.w)) <= tol) return "E";
    if (Math.abs(pz - room.z) <= tol) return "N";
    if (Math.abs(pz - (room.z + room.h)) <= tol) return "S";
    return null;
  };
  for (const corridor of corridors) {
    const pts = corridor.points;
    const width = Math.min(corridor.width, 3.2);
    for (const [ex, ez] of [pts[0]!, pts[pts.length - 1]!]) {
      for (const room of rooms) {
        const side = sideOf(room, ex, ez);
        if (!side) continue;
        const along = side === "N" || side === "S" ? ex : ez;
        const base = side === "N" || side === "S" ? room.x : room.z;
        const key = `${room.id}:${side}`;
        if (!openings.has(key)) openings.set(key, []);
        openings.get(key)!.push([along - base, width]);
      }
    }
  }
  const fixed = rooms.filter((r) => r.fixed);
  for (const a of fixed) {
    for (const b of fixed) {
      if (a.id >= b.id) continue;
      if (Math.abs(a.x + a.w - b.x) < 0.05) {
        const lo = Math.max(a.z, b.z);
        const hi = Math.min(a.z + a.h, b.z + b.h);
        if (hi - lo > 1.0) {
          const width = Math.min(hi - lo - 1.0, 4.0);
          const center = (lo + hi) / 2;
          if (!openings.has(`${a.id}:E`)) openings.set(`${a.id}:E`, []);
          openings.get(`${a.id}:E`)!.push([center - a.z, width]);
          if (!openings.has(`${b.id}:W`)) openings.set(`${b.id}:W`, []);
          openings.get(`${b.id}:W`)!.push([center - b.z, width]);
        }
      }
    }
  }

  // ---- geometry buckets merged per material (draw-call discipline) ----------
  const buckets = { flagstone: [] as THREE.BufferGeometry[], masonry: [] as THREE.BufferGeometry[] };
  const pushBox = (bucket: THREE.BufferGeometry[], w: number, h: number, d: number,
                   cx: number, cy: number, cz: number): void => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(geometry, w, h, d);
    geometry.translate(cx, cy, cz);
    bucket.push(geometry);
  };
  const addWall = (cx: number, cz: number, sx: number, sz: number, h: number): void => {
    pushBox(buckets.masonry, sx, h, sz, cx, h / 2, cz);
  };

  for (const room of rooms) {
    const { x: rx, z: rz, w: rw, h: rh } = room;
    const wallH = room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
    pushBox(buckets.flagstone, rw + WALL_T * 2, FLOOR_T, rh + WALL_T * 2, rx + rw / 2, -FLOOR_T / 2, rz + rh / 2);

    const sides: Record<string, [boolean, number, number, number]> = {
      N: [true, rx - WALL_T, rz - WALL_T / 2, rw + 2 * WALL_T],
      S: [true, rx - WALL_T, rz + rh + WALL_T / 2, rw + 2 * WALL_T],
      W: [false, rx - WALL_T / 2, rz, rh],
      E: [false, rx + rw + WALL_T / 2, rz, rh],
    };
    for (const [side, [alongX, startA, fixedC, length]] of Object.entries(sides)) {
      const spans = (openings.get(`${room.id}:${side}`) ?? [])
        .map(([center, width]): [number, number] => [
          Math.max(0.4, center - width / 2),
          Math.min(length - 0.4, center + width / 2),
        ])
        .filter(([o0, o1]) => o1 > o0)
        .sort((a, b) => a[0] - b[0]);
      let cursor = 0;
      for (const [o0, o1] of [...spans, [length, length] as [number, number]]) {
        if (o0 - cursor > 0.1) {
          const segLen = o0 - cursor;
          const mid = cursor + segLen / 2;
          if (alongX) addWall(startA + mid, fixedC, segLen, WALL_T, wallH);
          else addWall(fixedC, startA + mid, WALL_T, segLen, wallH);
        }
        if (o0 < length) {
          const lintelH = wallH - DOOR_LINTEL_H;
          if (lintelH > 0.05) {
            const mid = (o0 + o1) / 2;
            if (alongX) pushBox(buckets.masonry, o1 - o0, lintelH, WALL_T, startA + mid, DOOR_LINTEL_H + lintelH / 2, fixedC);
            else pushBox(buckets.masonry, WALL_T, lintelH, o1 - o0, fixedC, DOOR_LINTEL_H + lintelH / 2, startA + mid);
          }
        }
        cursor = Math.max(cursor, o1);
      }
    }
  }

  for (const corridor of corridors) {
    const pts = corridor.points;
    const w = corridor.width;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      const x0 = Math.min(ax, bx);
      const x1 = Math.max(ax, bx);
      const z0 = Math.min(az, bz);
      const z1 = Math.max(az, bz);
      if (x1 - x0 < 0.01 && z1 - z0 < 0.01) continue;
      if (x1 - x0 < 0.01) {
        pushBox(buckets.flagstone, w + WALL_T * 2, FLOOR_T, z1 - z0, ax, -FLOOR_T / 2, (z0 + z1) / 2);
        addWall(ax - w / 2 - WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0, WALL_H);
        addWall(ax + w / 2 + WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0, WALL_H);
      } else {
        pushBox(buckets.flagstone, x1 - x0, FLOOR_T, w + WALL_T * 2, (x0 + x1) / 2, -FLOOR_T / 2, az);
        addWall((x0 + x1) / 2, az - w / 2 - WALL_T / 2, x1 - x0, WALL_T, WALL_H);
        addWall((x0 + x1) / 2, az + w / 2 + WALL_T / 2, x1 - x0, WALL_T, WALL_H);
      }
    }
  }

  // merge buckets into single meshes per material
  const flagstoneMesh = new THREE.Mesh(mergeGeometries(buckets.flagstone), materials.flagstone);
  flagstoneMesh.name = "shell-floors";
  flagstoneMesh.receiveShadow = true;
  shell.add(flagstoneMesh);
  const masonryMesh = new THREE.Mesh(mergeGeometries(buckets.masonry), materials.masonry);
  masonryMesh.name = "shell-walls";
  masonryMesh.castShadow = true;
  masonryMesh.receiveShadow = true;
  shell.add(masonryMesh);

  // void undercroft
  const bx0 = Math.min(...rooms.map((r) => r.x)) - 4;
  const bx1 = Math.max(...rooms.map((r) => r.x + r.w)) + 4;
  const bz0 = Math.min(...rooms.map((r) => r.z)) - 4;
  const bz1 = Math.max(...rooms.map((r) => r.z + r.h)) + 4;
  const voidMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bx1 - bx0, 3, bz1 - bz0),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.95 }),
  );
  voidMesh.position.set((bx0 + bx1) / 2, -1.8, (bz0 + bz1) / 2);
  voidMesh.receiveShadow = true;
  shell.add(voidMesh);
  return shell;
}
// ---------------------------------------------------------------------------
// kit props via DungeonPropKit (catalog-normalized, hanging assemblies, fires)
// ---------------------------------------------------------------------------
interface PropPlacements {
  tickables: ((elapsed: number) => void)[];
}

async function placeKitProps(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
  fireParent: THREE.Scene,
): Promise<PropPlacements> {
  const used = new Map<string, Promise<GLTF>>();
  for (const p of layout.placements) {
    if (p.glbRuntime && !used.has(p.glbRuntime)) used.set(p.glbRuntime, loader.loadAsync(p.glbRuntime));
  }
  const loaded = new Map<string, GLTF>();
  await Promise.all([...used.entries()].map(async ([url, promise]) => {
    loaded.set(url, await promise);
  }));

  const tickables: ((elapsed: number) => void)[] = [];
  let phase = 0;
  for (const p of layout.placements) {
    if (!p.glbRuntime) continue;
    const spec = DUNGEON_PROP_ASSETS[p.asset as keyof typeof DUNGEON_PROP_ASSETS];
    const gltf = loaded.get(p.glbRuntime)!;
    const instance = instantiateDungeonProp(gltf.scene, spec, phase);
    phase += 0.37;
    instance.root.position.set(p.x, p.elevation, p.z);
    instance.root.rotation.y = THREE.MathUtils.degToRad(p.yaw);
    scene.add(instance.root);
    tickables.push(instance.animate);
    if (p.fireAnchorY !== null && p.fireColor) {
      const fire = createDungeonFireEffect({
        anchorY: p.fireAnchorY,
        color: p.fireColor,
        castShadow: p.fireCastsShadow,
        phase,
      });
      fire.root.position.set(p.x, p.elevation, p.z);
      fireParent.add(fire.root);
      tickables.push(fire.animate);
    }
  }
  return { tickables };
}

// ---------------------------------------------------------------------------
// landmarks (custom — never kit-substituted)
// ---------------------------------------------------------------------------
function buildLandmarks(scene: THREE.Scene, layout: BreachV2Layout): ((elapsed: number) => void)[] {
  const tickables: ((elapsed: number) => void)[] = [];
  const lm = layout.landmarks;
  const group = new THREE.Group();
  group.name = "breach-v2-landmarks";
  scene.add(group);

  // Soul Well (V14): silvery glowing pool — basin rim, pool, ripples, shard
  const well = lm.soulWell;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(well.apron ?? 2.65, 0.24, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0x5a5b66, roughness: 0.7, metalness: 0.3 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(well.x, 0.24, well.z);
  rim.castShadow = true;
  group.add(rim);
  const poolMaterial = new THREE.MeshStandardMaterial({
    color: 0x9fd8e8, roughness: 0.12, metalness: 0.55,
    emissive: 0x63d8ee, emissiveIntensity: 1.1, transparent: true, opacity: 0.92,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(well.r ?? 1.8, 48), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(well.x, 0.18, well.z);
  group.add(pool);
  const ripples: THREE.Mesh[] = [];
  [0.62, 1.16, 1.68].forEach((radius, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xbdf3ff, transparent: true, opacity: 0.35 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(well.x, 0.2, well.z);
    group.add(ring);
    ripples.push(ring);
    void i;
  });
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshStandardMaterial({
      color: 0x8fe8ff, roughness: 0.2, metalness: 0.4, emissive: 0x7fdfff, emissiveIntensity: 0.9,
    }),
  );
  shard.position.set(well.x, 2.1, well.z);
  group.add(shard);
  tickables.push((elapsed) => {
    shard.rotation.y = elapsed * 0.4;
    shard.position.y = 2.1 + Math.sin(elapsed * 0.9) * 0.08;
    ripples.forEach((ring, i) => {
      const pulse = 1 + Math.sin(elapsed * 1.4 + i * 1.3) * 0.05;
      ring.scale.set(pulse, pulse, 1);
    });
  });

  // Memory Loom (TRUE loom): frame + glowing threads
  const loom = lm.memoryLoom;
  const loomMat = new THREE.MeshStandardMaterial({ color: 0x52402a, roughness: 0.7, metalness: 0.1 });
  const threadMat = new THREE.MeshStandardMaterial({
    color: 0x8070c0, roughness: 0.4, emissive: 0x8c73d9, emissiveIntensity: 0.7,
  });
  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  };
  addBox(loom.x - 1.1, 1.3, loom.z, 0.18, 2.6, 0.18, loomMat);
  addBox(loom.x + 1.1, 1.3, loom.z, 0.18, 2.6, 0.18, loomMat);
  addBox(loom.x, 2.5, loom.z, 2.4, 0.18, 0.18, loomMat);
  addBox(loom.x, 0.11, loom.z, 2.2, 0.22, 0.5, loomMat);
  const threads: THREE.Mesh[] = [];
  for (let t = 0; t < 9; t += 1) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.0, 0.02), threadMat);
    thread.position.set(loom.x - 0.96 + t * 0.24, 1.4, loom.z);
    group.add(thread);
    threads.push(thread);
  }
  tickables.push((elapsed) => {
    threads.forEach((thread, i) => {
      thread.rotation.z = Math.sin(elapsed * 0.7 + i * 0.8) * 0.04;
    });
  });

  // Training effigy
  const effigy = lm.effigy;
  const effigyMat = new THREE.MeshStandardMaterial({ color: 0x735626, roughness: 0.85 });
  addBox(effigy.x, 0.85, effigy.z, 0.22, 1.7, 0.22, effigyMat);
  addBox(effigy.x, 1.35, effigy.z, 1.5, 0.18, 0.18, effigyMat);
  addBox(effigy.x, 1.95, effigy.z, 0.42, 0.5, 0.42, effigyMat);

  // trial door veils
  const veilFor = (door: { x: number; z: number }, color: number): THREE.Mesh => {
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    veil.position.set(door.x + 0.28, 1.3, door.z);
    veil.rotation.y = Math.PI / 2;
    group.add(veil);
    return veil;
  };
  const veilW = veilFor(lm.doorWayfarer, 0x46d9e8);
  const veilO = veilFor(lm.doorOathbreaker, 0xe86a3c);
  tickables.push((elapsed) => {
    (veilW.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(elapsed * 1.1) * 0.07;
    (veilO.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.cos(elapsed * 1.3) * 0.07;
  });

  // First Memory: dais + floating crystal
  const fm = lm.firstMemory;
  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.6 }),
  );
  dais.position.set(fm.x, 0.25, fm.z);
  dais.castShadow = true;
  group.add(dais);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34),
    new THREE.MeshStandardMaterial({
      color: 0x9980e0, roughness: 0.15, emissive: 0xa680ff, emissiveIntensity: 1.6,
    }),
  );
  crystal.position.set(fm.x, 1.6, fm.z);
  group.add(crystal);
  tickables.push((elapsed) => {
    crystal.rotation.y = elapsed * 0.8;
    crystal.position.y = 1.6 + Math.sin(elapsed * 1.2) * 0.1;
  });

  // actor markers (#448/#449 own the real characters/monsters)
  const markerMat = (color: number) => new THREE.MeshStandardMaterial({
    color, roughness: 0.5, emissive: color, emissiveIntensity: 0.25,
  });
  for (const [pos, color, h] of [
    [lm.ilyra, 0x66e080, 1.75], [lm.orren, 0x66cc73, 1.75], [lm.brannoc, 0x80bf60, 1.75],
  ] as const) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, h, 16), markerMat(color));
    marker.position.set(pos.x, h / 2, pos.z);
    marker.castShadow = true;
    group.add(marker);
  }
  for (const enemy of layout.enemies) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), markerMat(0xbf4030));
    marker.position.set(enemy.x, 0.45, enemy.z);
    group.add(marker);
  }
  const bossRing = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xe85a2c, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  bossRing.rotation.x = -Math.PI / 2;
  bossRing.position.set(layout.boss.x, 0.06, layout.boss.z);
  group.add(bossRing);

  // daylight portal at the east end of the Way Upward (visible from inside)
  const exitGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 3.4),
    new THREE.MeshBasicMaterial({ color: 0xd8e8c4, transparent: true, opacity: 0.95 }),
  );
  exitGlow.position.set(lm.exitPoint.x + 0.6, 1.7, lm.exitPoint.z);
  exitGlow.rotation.y = -Math.PI / 2;
  group.add(exitGlow);

  return tickables;
}


// ---------------------------------------------------------------------------
// wall art (§5A framed planes) + book/scroll props
// ---------------------------------------------------------------------------
const ART_TEXTURES: Record<string, string> = {
  "art-thalenyr-atlas": `${ART_ROOT}/thalenyr-atlas.webp`,
  "art-heartvale-section": `${ART_ROOT}/heartvale-section.webp`,
  "art-breach-v2-flatmap": `${ART_ROOT}/breach-v2-flatmap.webp`,
};
const ART_FACING_NORMAL: Record<string, [number, number]> = {
  south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0],
};

function buildWallArtAndBooks(scene: THREE.Scene, layout: BreachV2Layout, texLoader: THREE.TextureLoader): void {
  const group = new THREE.Group();
  group.name = "breach-v2-wall-art";
  scene.add(group);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1a, roughness: 0.5, metalness: 0.35 });
  const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x4d424d, roughness: 0.8 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.85 });

  for (const p of layout.placements) {
    if (p.role === "wall-art") {
      const w = p.width ?? 1.6;
      const h = p.height ?? w * 0.7;
      const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
      const yaw = Math.atan2(nx, nz);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), frameMat);
      frame.position.set(p.x, 1.65, p.z);
      frame.rotation.y = yaw;
      frame.castShadow = true;
      group.add(frame);
      const url = ART_TEXTURES[p.asset];
      let artMat: THREE.Material = placeholderMat;
      if (url) {
        const tex = texLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      }
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
      art.position.set(p.x + nx * 0.07, 1.65, p.z + nz * 0.07);
      art.rotation.y = yaw;
      group.add(art);
    } else if (p.role === "readable-props") {
      const mesh = p.asset === "scrolls-pile"
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10), paperMat)
        : new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.36), paperMat);
      mesh.position.set(p.x, p.asset === "scrolls-pile" ? 0.16 : 0.12, p.z);
      if (p.asset === "scrolls-pile") mesh.rotation.z = Math.PI / 2;
      mesh.rotation.y = THREE.MathUtils.degToRad(p.yaw);
      mesh.castShadow = true;
      group.add(mesh);
    }
  }
}

/** Corruption veins: emissive strips scaling with room corruption level. */
function buildCorruption(scene: THREE.Scene, layout: BreachV2Layout): void {
  const group = new THREE.Group();
  group.name = "breach-v2-corruption";
  scene.add(group);
  for (const room of layout.rooms) {
    if (room.corruption < 0.45) continue;
    const intensity = 0.35 + room.corruption * 0.8;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x661f14, roughness: 0.5, emissive: 0xd94d26, emissiveIntensity: intensity,
    });
    for (const [cx, cz, sx, sz] of [
      [room.x + room.w / 2, room.z + 0.12, room.w * 0.8, 0.06],
      [room.x + 0.12, room.z + room.h / 2, 0.06, room.h * 0.8],
    ] as const) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, sz), mat);
      strip.position.set(cx, 0.06, cz);
      group.add(strip);
    }
  }
}

// ---------------------------------------------------------------------------
// lights + cameras + HUD + hooks
// ---------------------------------------------------------------------------
function setupLights(scene: THREE.Scene, layout: BreachV2Layout): void {
  // readable base layer — darkness never blocks navigation or readability
  scene.add(new THREE.HemisphereLight(0x46536a, 0x2a231a, 1.25));
  scene.add(new THREE.AmbientLight(0x343a44, 0.85));
  // cool "breach light" from the east so far walls never fall to black
  const breachGlow = new THREE.DirectionalLight(0x5a6c80, 0.6);
  breachGlow.position.set(260, 40, 10);
  scene.add(breachGlow);
  // Shadow discipline: only the two landmark lights cast (each shadow-casting
  // point light adds a cube shadow pass AND one shader texture unit per light —
  // uncapped shadows exceed MAX_TEXTURE_IMAGE_UNITS and explode the frame cost).
  const SHADOW_LIGHTS = new Set(["soul-well-glow", "boss-ember"]);
  for (const spec of layout.lights) {
    const light = new THREE.PointLight(new THREE.Color(spec.color), spec.intensity * 14, spec.radius * 2.4, 1.5);
    light.position.set(spec.x, spec.y, spec.z);
    light.castShadow = spec.castsShadow && SHADOW_LIGHTS.has(spec.id);
    if (light.castShadow) {
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.01;
    }
    scene.add(light);
  }
  // per-room soft fills so every chamber reads (warmer with corruption)
  for (const room of layout.rooms) {
    if (room.kind === "corridor") continue;
    const warm = Math.min(1, 0.35 + room.corruption);
    const color = new THREE.Color().setRGB(0.55 + 0.35 * warm, 0.5, 0.55 - 0.25 * warm);
    const fill = new THREE.PointLight(color, 3.2, Math.hypot(room.w, room.h) * 0.75 + 4, 1.7);
    fill.position.set(room.x + room.w / 2, 3.1, room.z + room.h / 2);
    scene.add(fill);
  }
  // trial-door accents: cyan over Wayfarer, ember over Oathbreaker
  for (const [lm, color] of [[layout.landmarks.doorWayfarer, 0x46d9e8], [layout.landmarks.doorOathbreaker, 0xe86a3c]] as const) {
    const doorLight = new THREE.PointLight(color, 8, 9, 1.6);
    doorLight.position.set(lm.x - 1.2, 2.6, lm.z);
    scene.add(doorLight);
  }
  // the "first outdoor moment": daylight spilling west into the Way Upward
  const exitSpec = layout.lights.find((l) => l.id === "exit-daylight");
  if (exitSpec) {
    const day = new THREE.SpotLight(0xe8f0d0, 60, 34, Math.PI / 3.0, 0.55, 1.1);
    day.position.set(exitSpec.x + 4, 3.4, exitSpec.z);
    day.target.position.set(exitSpec.x - 12, 1.0, exitSpec.z);
    scene.add(day, day.target);
  }
}

interface CameraPreset { target: [number, number, number]; offset: [number, number, number] }

function cameraPresets(layout: BreachV2Layout): Record<string, CameraPreset> {
  const lm = layout.landmarks;
  const firstChamber = layout.rooms.find((r) => !r.fixed) ?? layout.rooms[0]!;
  return {
    vestibule: { target: [lm.soulWell.x, 0.8, lm.soulWell.z], offset: [10.5, 6.2, 9.0] },
    plaza: { target: [lm.doorWayfarer.x - 4, 1.2, lm.doorWayfarer.z + 3.5], offset: [-9, 3.4, 0.5] },
    gallery: {
      target: [firstChamber.x + firstChamber.w / 2, 1.0, firstChamber.z + firstChamber.h / 2],
      offset: [-6.5, 4.4, -5.0],
    },
    boss: { target: [layout.boss.x, 1.2, layout.boss.z], offset: [-9.5, 5.4, -6.5] },
    exit: { target: [lm.exitPoint.x - 2, 1.4, lm.exitPoint.z], offset: [-10.5, 3.2, 0.2] },
    overview: { target: [126, 0, 12], offset: [0, 155, -42] },
  };
}

function setupHud(container: HTMLElement): HTMLDivElement {
  const hud = document.createElement("div");
  hud.style.cssText = [
    "position:absolute", "left:10px", "bottom:10px", "padding:6px 10px",
    "background:rgba(10,10,14,0.6)", "color:#e0d8c0", "font:12px/1.5 monospace",
    "border-radius:6px", "pointer-events:none", "white-space:pre",
  ].join(";");
  container.appendChild(hud);
  return hud;
}

export async function startDungeonPreview(
  container: HTMLElement,
  options: { seed: number; path: "wayfarer" | "oathbreaker"; cam: string },
): Promise<void> {
  container.style.cssText = "position:fixed;inset:0;overflow:hidden;background:#0b0d10;";
  const loading = document.createElement("div");
  loading.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e0d8c0;font:14px monospace;";
  loading.textContent = `Assembling BREACH-V2 — seed ${options.seed} · ${options.path}…`;
  container.appendChild(loading);

  const layout = buildBreachV2Layout(options.seed, options.path, DUNGEON_PROP_ASSETS);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  scene.fog = new THREE.FogExp2(0x0d0f14, 0.0055);

  const camera = new THREE.PerspectiveCamera(
    50, container.clientWidth / container.clientHeight, 0.2, 400,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 180;

  const texLoader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder); // kit GLBs are meshopt-compressed

  const materials = loadShellTextures(texLoader);
  scene.add(buildShell(layout, materials));
  const propPlacement = await placeKitProps(scene, layout, gltfLoader, scene);
  const landmarkTickables = buildLandmarks(scene, layout);
  buildWallArtAndBooks(scene, layout, texLoader);
  buildCorruption(scene, layout);
  setupLights(scene, layout);

  const presets = cameraPresets(layout);
  const preset = presets[options.cam] ?? presets.vestibule!;
  controls.target.set(...preset.target);
  camera.position.set(
    preset.target[0] + preset.offset[0],
    preset.target[1] + preset.offset[1],
    preset.target[2] + preset.offset[2],
  );

  const hud = setupHud(container);
  loading.remove();

  const hooks = window as unknown as PreviewHooks;
  hooks.__dungeonScene = scene;
  hooks.__dungeonLayout = layout;
  hooks.__dungeonRenderer = renderer;
  hooks.__dungeonCamera = camera;
  hooks.__dungeonControls = controls;
  hooks.__dungeonFrames = 0;
  hooks.__dungeonLoopError = null;
  hooks.__dungeonStats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };

  const clock = new THREE.Clock();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsText = "…";
  const tickables = [...propPlacement.tickables, ...landmarkTickables];

  renderer.setAnimationLoop(() => {
    try {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      fpsAccum += delta;
      fpsFrames += 1;
      if (fpsAccum >= 0.5) {
        const fps = fpsFrames / fpsAccum;
        fpsText = `${fps.toFixed(0)} fps · ${(1000 / fps).toFixed(1)} ms`;
        fpsAccum = 0;
        fpsFrames = 0;
      }
      for (const tick of tickables) tick(elapsed);
      controls.update();
      renderer.render(scene, camera);
      hooks.__dungeonFrames += 1;
      hooks.__dungeonStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
      hud.textContent =
        `breach-v2 preview  seed ${options.seed}  path ${options.path}  cam ${options.cam}  ${fpsText}\n` +
        `chambers ${layout.meta.chamberCount} (${layout.rooms.filter((r) => !r.fixed).map((r) => ("poolRoomId" in r ? r.poolRoomId : r.id)).join(", ")})  ` +
        `boss ${layout.boss.pattern}\n` +
        `calls ${hooks.__dungeonStats.calls} · tris ${hooks.__dungeonStats.triangles.toLocaleString()} · ` +
        `textures ${hooks.__dungeonStats.textures}`;
    } catch (error) {
      hooks.__dungeonLoopError = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
      console.error("dungeon preview loop error", error);
    }
  });

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
