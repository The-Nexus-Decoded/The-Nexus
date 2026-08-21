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
import { generateBreachV2, breachV2CellKey } from "./breach-v2-generator.ts";
import { setupBreachV2DevPanel } from "./breach-v2-dev-panel.ts";
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
  __dungeonControls: OrbitControls | null;
  __dungeonFrames: number;
  __dungeonLoopError: string | null;
  __dungeonStats: { calls: number; triangles: number; geometries: number; textures: number };
  __dungeonMode: string;
  __dungeonPlayer: { x: number; z: number };
  __dungeonWalkTo: (x: number, z: number) => boolean;
  __dungeonKeys: Set<string>;
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
function buildShell(layout: BreachV2Layout, materials: { flagstone: THREE.MeshStandardMaterial; masonry: THREE.MeshStandardMaterial }): THREE.Group {
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

  // room ceilings (dark timber-stone caps) — they read as ceiling at eye level
  // and cut away when the review camera rises (see the render loop toggle)
  const ceilingGeos: THREE.BufferGeometry[] = [];
  for (const room of rooms) {
    const wallH = room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
    const g = new THREE.BoxGeometry(room.w + WALL_T * 2, 0.25, room.h + WALL_T * 2);
    scaleBoxUV(g, room.w, 0.25, room.h);
    g.translate(room.x + room.w / 2, wallH + 0.125, room.z + room.h / 2);
    ceilingGeos.push(g);
  }
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: materials.masonry.map, roughness: 0.95, metalness: 0.0, color: 0x3a332c,
  });
  const ceilings = new THREE.Mesh(mergeGeometries(ceilingGeos), ceilingMat);
  ceilings.name = "shell-ceilings";
  ceilings.castShadow = false;
  ceilings.receiveShadow = true;
  shell.add(ceilings);

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

/**
 * Authored architecture that sits above the hidden navigation shell.
 * Gates make every major transition legible, while the boss cover is tagged
 * for the later combat/destruction pass instead of being anonymous scenery.
 */
function buildArchitecturalPolish(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  materials: { flagstone: THREE.MeshStandardMaterial; masonry: THREE.MeshStandardMaterial },
): void {
  const group = new THREE.Group();
  group.name = "breach-v2-architectural-polish";
  scene.add(group);

  const addGate = (
    id: string,
    x: number,
    z: number,
    axis: "x" | "z",
    state: "closed" | "raised" = "raised",
  ): void => {
    const gate = new THREE.Group();
    gate.name = `section-gate-${id}`;
    gate.position.set(x, 0, z);
    gate.userData = { connectorId: id, state, blocksMovement: state === "closed" };
    const span = 3.2;
    const stoneParts: THREE.Mesh[] = [];
    const placeAlong = (mesh: THREE.Object3D, along: number): void => {
      if (axis === "x") mesh.position.z = along;
      else mesh.position.x = along;
    };
    for (const side of [-1, 1]) {
      const post = texturedBox(axis === "x" ? 0.72 : 0.58, 3.25, axis === "x" ? 0.58 : 0.72, materials.masonry);
      post.position.y = 1.625;
      placeAlong(post, side * (span / 2 + 0.28));
      stoneParts.push(post);
    }
    const lintel = texturedBox(axis === "x" ? 0.72 : span + 1.15, 0.54, axis === "x" ? span + 1.15 : 0.72, materials.masonry);
    lintel.position.y = 3.0;
    stoneParts.push(lintel);

    const mergeParts = (parts: THREE.Mesh[], material: THREE.Material, name: string): THREE.Mesh => {
      const geometries = parts.map((part) => {
        part.updateMatrix();
        return part.geometry.clone().applyMatrix4(part.matrix);
      });
      const merged = new THREE.Mesh(mergeGeometries(geometries), material);
      merged.name = name;
      merged.castShadow = true;
      merged.receiveShadow = true;
      return merged;
    };
    gate.add(mergeParts(stoneParts, materials.masonry, "stone-frame"));
    group.add(gate);
  };

  const lm = layout.landmarks;
  addGate("vestibule-link", 30, 11, "x");
  addGate("threshold-entry", 36, 11, "x");
  addGate("wayfarer-choice", lm.doorWayfarer.x, lm.doorWayfarer.z, "x", "closed");
  addGate("oathbreaker-choice", lm.doorOathbreaker.x, lm.doorOathbreaker.z, "x", "closed");
  for (const room of layout.rooms.filter((candidate) => candidate.kind === "gallery")) {
    addGate(`${room.id}-entry`, room.x, room.z + room.h / 2, "x");
  }
  addGate("convergence-lock", 188, 10, "x");
  addGate("ashen-threshold", 192, 10, "x");
  addGate("boss-lock", 208, 10, "x");
  addGate("memory-vault", 242, 7, "x");
  addGate("way-upward", 247, 12, "z");
  addGate("heartvale-threshold", 258, 15, "x");

  const bossRoom = layout.rooms.find((room) => room.kind === "boss");
  if (bossRoom) {
    const cover = new THREE.Group();
    cover.name = "boss-destructible-cover";
    const cx = bossRoom.x + bossRoom.w / 2;
    const cz = bossRoom.z + bossRoom.h / 2;
    const coverPositions: readonly (readonly [number, number])[] = [
      [-10, -2], [-10, 3], [-5, 0], [5, 0], [10, -2], [10, 3],
    ];
    for (const [index, [ox, oz]] of coverPositions.entries()) {
      const pillar = new THREE.Group();
      pillar.name = `destructible-pillar-${index + 1}`;
      pillar.position.set(cx + ox, 0, cz + oz);
      pillar.userData = { destructible: true, hitPoints: 120, combatCover: true };
      const base = texturedBox(1.7, 0.42, 1.7, materials.masonry);
      base.position.y = 0.21;
      const shaft = texturedBox(1.08, 2.45, 1.08, materials.masonry);
      shaft.position.y = 1.62;
      const capital = texturedBox(1.55, 0.38, 1.55, materials.masonry);
      capital.position.y = 3.03;
      pillar.add(base, shaft, capital);
      cover.add(pillar);
    }
    group.add(cover);
  }
}

/**
 * Use the authored 3DAI Studio heavy door at every section boundary. Open
 * doors sit against a jamb so the preview remains walkable. The two closed
 * trial-choice doors remain authored registry placements below.
 */
async function placeSectionDoors(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
): Promise<((elapsed: number) => void)[]> {
  const spec = DUNGEON_PROP_ASSETS["heavy-door"];
  const gltf = await loader.loadAsync(spec.sourceUrl);
  const doors: readonly {
    id: string;
    x: number;
    z: number;
    axis: "x" | "z";
  }[] = [
    { id: "vestibule-link", x: 30, z: 11, axis: "x" },
    { id: "threshold-entry", x: 36, z: 11, axis: "x" },
    ...layout.rooms
      .filter((room) => room.kind === "gallery")
      .map((room) => ({ id: `${room.id}-entry`, x: room.x, z: room.z + room.h / 2, axis: "x" as const })),
    { id: "convergence-lock", x: 188, z: 10, axis: "x" },
    { id: "ashen-threshold", x: 192, z: 10, axis: "x" },
    { id: "boss-lock", x: 208, z: 10, axis: "x" },
    { id: "memory-vault", x: 242, z: 7, axis: "x" },
    { id: "way-upward", x: 247, z: 12, axis: "z" },
    { id: "heartvale-threshold", x: 258, z: 15, axis: "x" },
  ];

  const tickables: ((elapsed: number) => void)[] = [];
  for (const [index, door] of doors.entries()) {
    const instance = instantiateDungeonProp(gltf.scene, spec, index * 0.23);
    instance.root.name = `section-door-${door.id}`;
    instance.root.userData = {
      ...instance.root.userData,
      connectorId: door.id,
      state: "open",
      blocksMovement: false,
      sourceAsset: "heavy-door.glb",
    };
    instance.root.position.set(door.x, 0, door.z);
    // The downloaded source's closed face is local +X, matching the same
    // 90-degree basis correction used by authored registry placements.
    const frameYaw = door.axis === "x" ? Math.PI / 2 : 0;
    // Move the centered model to the jamb before opening it, preserving a
    // clear 2 m navigation lane through the architectural frame.
    if (door.axis === "x") instance.root.position.z += 1.35;
    else instance.root.position.x += 1.35;
    instance.root.rotation.y = frameYaw + THREE.MathUtils.degToRad(35);
    scene.add(instance.root);
    tickables.push(instance.animate);
  }
  return tickables;
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
    // The 3DAI heavy-door source faces across its local X axis, while authored
    // wall yaw is expressed as a wall normal. Correct that source-local basis
    // once here so registry doors sit inside their frames instead of edge-on.
    const sourceYawCorrection = {
      "heavy-door": 90,
      "archive-bookshelf": 90,
      "archive-cupboard": 90,
      "empty-weapon-rack": 90,
    }[p.asset] ?? 0;
    instance.root.rotation.y = THREE.MathUtils.degToRad(p.yaw + sourceYawCorrection);
    scene.add(instance.root);
    tickables.push(instance.animate);
    if (p.fireAnchorY !== null && p.fireColor) {
      // B7 texture-unit discipline: fire lights never cast shadows in the
      // preview — every shadow-casting point light adds a cube shadow map to
      // every lit material, and ~15 braziers blew past MAX_TEXTURE_IMAGE_UNITS
      // on real GPUs. Local glow only; the two landmark lights carry shadows.
      const fire = createDungeonFireEffect({
        anchorY: p.fireAnchorY,
        color: p.fireColor,
        castShadow: false,
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

  // Soul Well (V14, owner-tuned): a rock-and-stone RAISED pool built into the
  // ground — octagonal masonry basin, recessed silvery water with a slow
  // shimmer, small suspended shard. Not a neon disc: silver, stone, water.
  const well = lm.soulWell;
  const basinMat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load(`${TEX_ROOT}/masonry-color.jpg`),
    roughness: 0.85, metalness: 0.04, color: 0x9a9187,
  });
  basinMat.map!.colorSpace = THREE.SRGBColorSpace;
  basinMat.map!.wrapS = THREE.RepeatWrapping;
  basinMat.map!.wrapT = THREE.RepeatWrapping;
  const apron = well.apron ?? 2.65;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(apron, apron * 1.08, 0.75, 8), basinMat);
  basin.position.set(well.x, 0.375, well.z);
  basin.castShadow = true;
  basin.receiveShadow = true;
  group.add(basin);
  // stone rim lip
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(apron - 0.12, 0.16, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x847b6e, roughness: 0.8, metalness: 0.06 }),
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.set(well.x, 0.78, well.z);
  lip.castShadow = true;
  group.add(lip);
  // recessed silvery water (reads as liquid, not UI): soft silver, slow shimmer
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0xc2ccd4, roughness: 0.16, metalness: 0.42,
    emissive: 0x9fb2bd, emissiveIntensity: 0.32, transparent: true, opacity: 0.96,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry((well.r ?? 1.8) + 0.25, 48), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(well.x, 0.56, well.z);
  group.add(water);
  const ripples: THREE.Mesh[] = [];
  [0.7, 1.25, 1.75].forEach((radius) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.014, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.22 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(well.x, 0.58, well.z);
    group.add(ring);
    ripples.push(ring);
  });
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2),
    new THREE.MeshStandardMaterial({
      color: 0xb8ccd8, roughness: 0.25, metalness: 0.5, emissive: 0xaec4d2, emissiveIntensity: 0.5,
    }),
  );
  shard.position.set(well.x, 2.0, well.z);
  group.add(shard);
  // emergence step at the south edge (stone)
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.7), basinMat);
  step.position.set(well.x, 0.11, well.z + apron + 0.15);
  step.castShadow = true;
  group.add(step);
  tickables.push((elapsed) => {
    shard.rotation.y = elapsed * 0.25;
    shard.position.y = 2.0 + Math.sin(elapsed * 0.6) * 0.05;
    waterMat.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.8) * 0.06;
    ripples.forEach((ring, i) => {
      const phase = (elapsed * 0.35 + i / ripples.length) % 1;
      const s = 0.4 + phase * 1.1;
      ring.scale.set(s, s, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.26 * (1 - phase);
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

  // #448/#449 own the real characters/monsters. Placeholder markers stay off
  // in normal review/mobile builds and can be explicitly enabled for socket QA.
  const markersHidden = new URL(window.location.href).searchParams.get("markers") !== "1";
  const markerMat = (color: number) => new THREE.MeshStandardMaterial({
    color, roughness: 0.5, emissive: color, emissiveIntensity: 0.18,
    transparent: true, opacity: 0.42,
  });
  for (const [pos, color, h] of [
    [lm.ilyra, 0x66e080, 1.5], [lm.orren, 0x66cc73, 1.5], [lm.brannoc, 0x80bf60, 1.5],
  ] as const) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, h, 16), markerMat(color));
    marker.position.set(pos.x, h / 2, pos.z);
    marker.visible = !markersHidden;
    group.add(marker);
  }
  for (const enemy of layout.enemies) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12), markerMat(0xbf4030));
    marker.position.set(enemy.x, 0.4, enemy.z);
    marker.visible = !markersHidden;
    group.add(marker);
  }
  // Cinderbound Warden sigil: a coherent realm-lock lattice with eight
  // deliberately different glyphs, not repeated bars or random characters.
  const runeRadius = 3.35;
  const runeGroup = new THREE.Group();
  runeGroup.position.set(layout.boss.x, 0, layout.boss.z);
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x7a2c14, roughness: 0.5, emissive: 0xff5a2c, emissiveIntensity: 1.1,
  });
  for (const [inner, outer] of [[0.93, 1], [0.57, 0.62], [0.25, 0.29]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(runeRadius * inner, runeRadius * outer, 96), runeMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.065;
    runeGroup.add(ring);
  }
  type GlyphSegment = readonly [number, number, number, number];
  const glyphs: readonly (readonly GlyphSegment[])[] = [
    [[-0.34, -0.42, -0.34, 0.42], [-0.34, 0.05, 0.32, -0.38], [-0.34, 0.05, 0.28, 0.38]],
    [[-0.32, -0.42, 0.32, -0.42], [0.32, -0.42, -0.1, 0.05], [-0.1, 0.05, 0.34, 0.42]],
    [[-0.36, 0.38, 0, -0.42], [0, -0.42, 0.36, 0.38], [-0.22, 0.05, 0.22, 0.05]],
    [[-0.36, -0.38, 0.36, 0.38], [-0.36, 0.38, 0.36, -0.38], [0, -0.42, 0, 0.42]],
    [[-0.34, -0.42, -0.34, 0.42], [-0.34, -0.42, 0.34, -0.1], [0.34, -0.1, -0.1, 0.42]],
    [[0, -0.44, 0, 0.44], [-0.34, -0.12, 0, -0.44], [0, 0.44, 0.34, 0.12]],
    [[-0.38, -0.38, 0.38, -0.38], [0.38, -0.38, 0.05, 0.1], [0.05, 0.1, 0.38, 0.4]],
    [[-0.38, 0, 0, -0.42], [0, -0.42, 0.38, 0], [0.38, 0, 0, 0.42], [0, 0.42, -0.38, 0]],
  ];
  const addGlyphSegment = (parent: THREE.Group, [x1, z1, x2, z2]: GlyphSegment): void => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const segment = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dz), 0.025, 0.085), runeMat);
    segment.position.set((x1 + x2) / 2, 0.075, (z1 + z2) / 2);
    segment.rotation.y = -Math.atan2(dz, dx);
    parent.add(segment);
  };
  glyphs.forEach((segments, index) => {
    const angle = (index / glyphs.length) * Math.PI * 2;
    const glyph = new THREE.Group();
    glyph.position.set(Math.cos(angle) * runeRadius * 0.78, 0, Math.sin(angle) * runeRadius * 0.78);
    glyph.rotation.y = -angle + Math.PI / 2;
    segments.forEach((segment) => addGlyphSegment(glyph, segment));
    runeGroup.add(glyph);
  });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(runeRadius * 0.52, 0.025, 0.055), runeMat);
    spoke.position.set(Math.cos(angle) * runeRadius * 0.28, 0.07, Math.sin(angle) * runeRadius * 0.28);
    spoke.rotation.y = -angle;
    runeGroup.add(spoke);
  }
  group.add(runeGroup);
  tickables.push((elapsed) => {
    runeMat.emissiveIntensity = 0.95 + Math.sin(elapsed * 1.6) * 0.3;
  });

  // daylight portal at the east end of the Way Upward (visible from inside)
  const exitGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 3.4),
    new THREE.MeshBasicMaterial({ color: 0xa9c7a2, transparent: true, opacity: 0.62, depthWrite: false }),
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
  "art-banner-wayfarer": `${ART_ROOT}/art-banner-wayfarer.webp`,
  "art-banner-oathbreaker": `${ART_ROOT}/art-banner-oathbreaker.webp`,
  "art-banner-ashen": `${ART_ROOT}/art-banner-ashen.webp`,
  "art-banner-cinderbound": `${ART_ROOT}/art-banner-cinderbound.webp`,
  "art-banner-oathscar": `${ART_ROOT}/art-banner-oathscar.webp`,
  "art-relief-warden": `${ART_ROOT}/art-relief-warden.webp`,
  "art-relief-first-memory": `${ART_ROOT}/art-relief-first-memory.webp`,
  "art-relief-toll": `${ART_ROOT}/art-relief-toll.webp`,
  "art-relief-lock-inscription": `${ART_ROOT}/art-relief-lock-inscription.webp`,
  "art-painting-reliquary": `${ART_ROOT}/art-painting-reliquary.webp`,
  "art-painting-winged-skyship": `${ART_ROOT}/art-painting-winged-skyship.webp`,
  "art-map-thalenyr-scroll": `${ART_ROOT}/art-map-thalenyr-scroll.webp`,
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
      mesh.position.set(p.x, (p.elevation ?? 0) + (p.asset === "scrolls-pile" ? 0.16 : 0.12), p.z);
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
  // per-room soft fills so every chamber reads (warmer with corruption);
  // galleries carry combat light — chambers must never read bare or black
  for (const room of layout.rooms) {
    if (room.kind === "corridor") continue;
    const warm = Math.min(1, 0.35 + room.corruption);
    const color = new THREE.Color().setRGB(0.55 + 0.35 * warm, 0.5, 0.55 - 0.25 * warm);
    const isGallery = room.kind === "gallery";
    const fill = new THREE.PointLight(
      color, isGallery ? 6.5 : 3.4,
      Math.hypot(room.w, room.h) * (isGallery ? 1.0 : 0.75) + 4, 1.6,
    );
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
    const day = new THREE.SpotLight(0xd7e7c7, 22, 34, Math.PI / 3.0, 0.6, 1.25);
    day.position.set(exitSpec.x + 4, 3.4, exitSpec.z);
    day.target.position.set(exitSpec.x - 12, 1.0, exitSpec.z);
    scene.add(day, day.target);
  }
  // wall-map accent lights so the readable art reads (§5A) — maps brightest
  for (const p of layout.placements) {
    if (p.role !== "wall-art") continue;
    const isMap = ["art-thalenyr-atlas", "art-heartvale-section", "art-breach-v2-flatmap"].includes(p.asset);
    const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
    const artLight = new THREE.PointLight(0xfff0d8, isMap ? 3.4 : 1.6, isMap ? 7 : 5, 1.7);
    artLight.position.set(p.x + nx * 1.2, 2.5, p.z + nz * 1.2);
    scene.add(artLight);
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
    overview: { target: [130, 0, 12], offset: [0, 165, -46] },
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
  const shellGroup = buildShell(layout, materials);
  scene.add(shellGroup);
  buildArchitecturalPolish(scene, layout, materials);
  const ceilings = shellGroup.getObjectByName("shell-ceilings");
  const propPlacement = await placeKitProps(scene, layout, gltfLoader, scene);
  const sectionDoorTickables = await placeSectionDoors(scene, layout, gltfLoader);
  const landmarkTickables = buildLandmarks(scene, layout);
  buildWallArtAndBooks(scene, layout, texLoader);
  buildCorruption(scene, layout);
  setupLights(scene, layout);

  const presets = cameraPresets(layout);

  // ---- walk mode: WASD on the hidden nav grid (collision from the generator's
  // own walkable cells — the same data the invariant suite proves reachable)
  const walkMode = options.cam === "walk";
  const genData = generateBreachV2(options.seed, options.path);
  const walkable = new Set(genData.navCells.map(breachV2CellKey));
  for (const cell of genData.blockedCells) walkable.delete(breachV2CellKey(cell));
  const NAV = layout.meta.navCell;
  const isWalkable = (x: number, z: number): boolean => {
    const r = 0.35; // player radius
    for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]] as const) {
      if (!walkable.has(`${Math.floor((x + ox) / NAV)},${Math.floor((z + oz) / NAV)}`)) return false;
    }
    return true;
  };
  const requestedStart = new URL(window.location.href).searchParams.get("start");
  const requestedRoom = requestedStart
    ? layout.rooms.find((room) => room.id === requestedStart || ("poolRoomId" in room && room.poolRoomId === requestedStart))
    : null;
  const nearestWalkable = (x: number, z: number): [number, number] => {
    if (isWalkable(x, z)) return [x, z];
    for (let radius = NAV; radius <= NAV * 5; radius += NAV) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const candidateX = x + Math.cos(angle) * radius;
        const candidateZ = z + Math.sin(angle) * radius;
        if (isWalkable(candidateX, candidateZ)) return [candidateX, candidateZ];
      }
    }
    return [layout.landmarks.playerStart.x, layout.landmarks.playerStart.z];
  };
  const requestedPosition = requestedRoom && requestedRoom.id !== "vestibule"
    ? nearestWalkable(requestedRoom.x + requestedRoom.w / 2, requestedRoom.z + requestedRoom.h / 2)
    : [layout.landmarks.playerStart.x, layout.landmarks.playerStart.z] as [number, number];
  const playerPos = new THREE.Vector3(requestedPosition[0], 0, requestedPosition[1]);
  let camYaw = 0.08; // camera just south of the emergence point — opening view faces the Soul Well
  let camPitch = 0.24;
  let camDist = 4.4;
  const keys = new Set<string>();
  let player: THREE.Mesh | null = null;
  if (walkMode) {
    controls.enabled = false;
    player = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 1.05, 4, 12),
      new THREE.MeshStandardMaterial({
        color: 0x8fd8e8, roughness: 0.5, emissive: 0x2a6a78, emissiveIntensity: 0.35,
      }),
    );
    player.castShadow = true;
    scene.add(player);
    player.position.set(playerPos.x, 0.85, playerPos.z);
    let dragging = false;
    renderer.domElement.addEventListener("pointerdown", (e) => {
      dragging = true;
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener("pointerup", () => { dragging = false; });
    renderer.domElement.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      camYaw -= e.movementX * 0.0052;
      camPitch = Math.min(0.58, Math.max(-0.18, camPitch + e.movementY * 0.004));
    });
    renderer.domElement.addEventListener("wheel", (e) => {
      camDist = Math.min(6.2, Math.max(2.6, camDist + e.deltaY * 0.004));
    }, { passive: true });
    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));
  }

  const preset = presets[options.cam] ?? presets.vestibule!;
  if (!walkMode) {
    controls.target.set(...preset.target);
    camera.position.set(
      preset.target[0] + preset.offset[0],
      preset.target[1] + preset.offset[1],
      preset.target[2] + preset.offset[2],
    );
  }

  const hud = setupHud(container);
  loading.remove();

  const hooks = window as unknown as PreviewHooks;
  hooks.__dungeonScene = scene;
  hooks.__dungeonLayout = layout;
  hooks.__dungeonRenderer = renderer;
  hooks.__dungeonCamera = camera;
  hooks.__dungeonControls = walkMode ? null : controls;
  hooks.__dungeonFrames = 0;
  hooks.__dungeonLoopError = null;
  hooks.__dungeonStats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  hooks.__dungeonMode = walkMode ? "walk" : "orbit";
  hooks.__dungeonPlayer = { x: playerPos.x, z: playerPos.z };
  hooks.__dungeonWalkTo = (x, z) => {
    if (!walkMode || !isWalkable(x, z)) return false;
    playerPos.set(x, 0, z);
    return true;
  };
  hooks.__dungeonKeys = keys; // probe visibility

  const warp = (x: number, z: number): boolean => {
    const [walkX, walkZ] = nearestWalkable(x, z);
    if (walkMode) {
      playerPos.set(walkX, 0, walkZ);
      return true;
    }
    const offset = camera.position.clone().sub(controls.target);
    controls.target.set(x, 1.0, z);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    return true;
  };
  setupBreachV2DevPanel({
    container,
    layout,
    seed: options.seed,
    path: options.path,
    cam: options.cam,
    warp,
  });

  const clock = new THREE.Clock();
  const cameraRaycaster = new THREE.Raycaster();
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsText = "…";
  const tickables = [...propPlacement.tickables, ...sectionDoorTickables, ...landmarkTickables];

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
      if (walkMode && player) {
        // movement relative to the camera's ground forward
        const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const step = (run ? 6.2 : 3.2) * delta;
        if (keys.has("KeyQ")) camYaw += delta * 1.9;
        if (keys.has("KeyE")) camYaw -= delta * 1.9;
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
        let mx = 0;
        let mz = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
        if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
        if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
        if (mx !== 0 || mz !== 0) {
          const move = fwd.multiplyScalar(mz).add(right.multiplyScalar(mx));
          move.normalize().multiplyScalar(step);
          const nx = playerPos.x + move.x;
          const nz = playerPos.z + move.z;
          if (isWalkable(nx, nz)) {
            playerPos.set(nx, 0, nz);
          } else if (isWalkable(nx, playerPos.z)) {
            playerPos.set(nx, 0, playerPos.z); // slide along walls
          } else if (isWalkable(playerPos.x, nz)) {
            playerPos.set(playerPos.x, 0, nz);
          }
          player.rotation.y = Math.atan2(move.x, move.z);
        }
        player.position.set(playerPos.x, 0.85, playerPos.z);
        const cp = Math.cos(camPitch);
        desiredCamera.set(
          playerPos.x + Math.sin(camYaw) * camDist * cp,
          Math.min(2.82, 1.4 + Math.sin(camPitch) * camDist),
          playerPos.z + Math.cos(camYaw) * camDist * cp,
        );
        cameraTarget.set(playerPos.x, 1.4, playerPos.z);
        cameraDirection.copy(desiredCamera).sub(cameraTarget);
        const desiredDistance = cameraDirection.length();
        cameraDirection.normalize();
        cameraRaycaster.set(cameraTarget, cameraDirection);
        cameraRaycaster.far = desiredDistance;
        const wallHit = cameraRaycaster.intersectObject(shellGroup, true)[0];
        const cameraDistance = wallHit
          ? Math.max(0.75, Math.min(desiredDistance, wallHit.distance - 0.18))
          : desiredDistance;
        camera.position.copy(cameraTarget).addScaledVector(cameraDirection, cameraDistance);
        camera.lookAt(cameraTarget);
        hooks.__dungeonPlayer.x = playerPos.x;
        hooks.__dungeonPlayer.z = playerPos.z;
      } else {
        controls.update();
      }
      // ceiling cutaway: caps read as ceilings at eye level (walk mode or a
      // camera inside the room) and step aside for raised orbit review cameras.
      // The walk camera is clamped below the cap so looking up always reveals
      // authored dungeon ceiling instead of the outdoor void.
      if (ceilings) ceilings.visible = walkMode;
      renderer.render(scene, camera);
      hooks.__dungeonFrames += 1;
      hooks.__dungeonStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
      hud.textContent =
        `breach-v2 preview  seed ${options.seed}  path ${options.path}  ${walkMode ? "WALK — WASD/arrows move · drag look · wheel zoom · Q/E rotate · shift sprint" : `cam ${options.cam}`}  ${fpsText}\n` +
        `chambers ${layout.meta.chamberCount} (${layout.rooms.filter((r) => !r.fixed).map((r) => ("poolRoomId" in r ? r.poolRoomId : r.id)).join(", ")})  ` +
        `boss ${layout.boss.pattern}${walkMode ? `  ·  at (${playerPos.x.toFixed(1)}, ${playerPos.z.toFixed(1)})` : ""}\n` +
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
