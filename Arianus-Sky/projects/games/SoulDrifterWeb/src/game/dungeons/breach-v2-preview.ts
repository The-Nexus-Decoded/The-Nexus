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
import { createBreachV2RunController, type BreachV2RunState } from "./breach-v2-gameplay";
import { setupBreachV2GameplayUi } from "./breach-v2-gameplay-ui";
import { findPath } from "../pathfinding";
import { storyDatabase } from "../persistence";
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
const DOOR_PORTAL_W = 2.5;

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
  __dungeonPlayer: { x: number; y: number; z: number };
  __dungeonWalkTo: (x: number, z: number) => boolean;
  __dungeonSetDoorsOpen: (open: boolean) => void;
  __dungeonKeys: Set<string>;
  __dungeonGameplay: {
    snapshot: () => BreachV2RunState;
    objective: () => string;
    interact: (targetId: string) => string;
    enterRoom: (roomId: string) => void;
    attack: () => void;
    guard: () => void;
    recover: () => void;
    restartEncounter: () => void;
    setCombatStyle: (style: "real-time" | "turn-based") => void;
    requestDoor: (doorId: string) => boolean;
  };
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

interface SharedAscent {
  axis: "x" | "z";
  along: number;
  width: number;
  from: number;
  to: number;
  fromElevation: number;
  toElevation: number;
}

function sharedAscents(layout: BreachV2Layout): SharedAscent[] {
  const ascents: SharedAscent[] = [];
  const fixedRooms = layout.rooms.filter((room) => room.fixed);
  for (const a of fixedRooms) {
    for (const b of fixedRooms) {
      if (a.id >= b.id || Math.abs(a.floorElevation - b.floorElevation) < 0.01) continue;
      const z0 = Math.max(a.z, b.z);
      const z1 = Math.min(a.z + a.h, b.z + b.h);
      if (z1 - z0 > 1 && (Math.abs(a.x + a.w - b.x) < 0.05 || Math.abs(b.x + b.w - a.x) < 0.05)) {
        const west = a.x < b.x ? a : b;
        const east = west === a ? b : a;
        const boundary = west.x + west.w;
        const run = Math.min(1.8, (west.floorElevation < east.floorElevation ? west.w : east.w) * 0.2);
        ascents.push({
          axis: "x", along: (z0 + z1) / 2,
          width: Math.min(z1 - z0 - 1, DOOR_PORTAL_W),
          from: west.floorElevation < east.floorElevation ? boundary - run : boundary + run,
          to: boundary,
          fromElevation: west.floorElevation < east.floorElevation ? west.floorElevation : east.floorElevation,
          toElevation: west.floorElevation < east.floorElevation ? east.floorElevation : west.floorElevation,
        });
      }
    }
  }
  return ascents;
}

function segmentElevation(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  fromElevation: number,
  toElevation: number,
  x: number,
  z: number,
): { elevation: number; distance: number; progress: number; rawProgress: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const rawProgress = lengthSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lengthSq : 0;
  const progress = THREE.MathUtils.clamp(rawProgress, 0, 1);
  const px = ax + dx * progress;
  const pz = az + dz * progress;
  return {
    elevation: THREE.MathUtils.lerp(fromElevation, toElevation, progress),
    distance: Math.hypot(x - px, z - pz),
    progress,
    rawProgress,
  };
}

function floorElevationSampleAt(layout: BreachV2Layout, x: number, z: number): number | null {
  for (const corridor of layout.corridors) {
    for (let index = 0; index < corridor.points.length - 1; index += 1) {
      const [ax, az] = corridor.points[index]!;
      const [bx, bz] = corridor.points[index + 1]!;
      if (Math.hypot(bx - ax, bz - az) < 0.01) continue;
      const sample = segmentElevation(
        ax, az, bx, bz,
        corridor.elevations[index]!, corridor.elevations[index + 1]!,
        x, z,
      );
      if (
        sample.rawProgress >= -0.005
        && sample.rawProgress <= 1.005
        && sample.distance <= corridor.width / 2 + 0.1
      ) return sample.elevation;
    }
  }
  for (const ascent of sharedAscents(layout)) {
    const low = Math.min(ascent.from, ascent.to);
    const high = Math.max(ascent.from, ascent.to);
    const cross = ascent.axis === "x" ? x : z;
    const along = ascent.axis === "x" ? z : x;
    if (cross >= low && cross <= high && Math.abs(along - ascent.along) <= ascent.width / 2) {
      const progress = Math.abs(cross - ascent.from) / Math.abs(ascent.to - ascent.from);
      return THREE.MathUtils.lerp(ascent.fromElevation, ascent.toElevation, progress);
    }
  }
  const room = layout.rooms.find((candidate) => (
    x >= candidate.x - 0.05 && x <= candidate.x + candidate.w + 0.05
    && z >= candidate.z - 0.05 && z <= candidate.z + candidate.h + 0.05
  ));
  if (!room) return null;
  const progress = room.w > 0 ? THREE.MathUtils.clamp((x - room.x) / room.w, 0, 1) : 0;
  return THREE.MathUtils.lerp(room.floorElevation, room.endElevation, progress);
}

export function floorElevationAt(layout: BreachV2Layout, x: number, z: number): number {
  return floorElevationSampleAt(layout, x, z) ?? 0;
}

export function hasDungeonFloorAt(layout: BreachV2Layout, x: number, z: number): boolean {
  return floorElevationSampleAt(layout, x, z) !== null;
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
    const width = Math.min(corridor.width, DOOR_PORTAL_W);
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
  // The generator only emits the selected branch corridor, but both authored
  // choice portals must be real openings. The inactive opening is visually
  // sealed by its closed portcullis and dense mist, never by a wall hidden
  // behind the gate.
  const thresholdRoom = rooms.find((room) => room.id === "threshold-plaza");
  if (thresholdRoom) {
    const key = `${thresholdRoom.id}:E`;
    const spans = openings.get(key) ?? [];
    for (const landmark of [layout.landmarks.doorWayfarer, layout.landmarks.doorOathbreaker]) {
      const center = landmark.z - thresholdRoom.z;
      if (!spans.some(([existing]) => Math.abs(existing - center) < 0.05)) {
        spans.push([center, DOOR_PORTAL_W]);
      }
    }
    openings.set(key, spans);
  }
  const fixed = rooms.filter((r) => r.fixed);
  const addSharedEastWestOpening = (
    west: BreachV2Layout["rooms"][number],
    east: BreachV2Layout["rooms"][number],
  ): void => {
    const lo = Math.max(west.z, east.z);
    const hi = Math.min(west.z + west.h, east.z + east.h);
    if (hi - lo <= 1.0) return;
    const width = Math.min(hi - lo - 1.0, DOOR_PORTAL_W);
    const center = (lo + hi) / 2;
    if (!openings.has(`${west.id}:E`)) openings.set(`${west.id}:E`, []);
    openings.get(`${west.id}:E`)!.push([center - west.z, width]);
    if (!openings.has(`${east.id}:W`)) openings.set(`${east.id}:W`, []);
    openings.get(`${east.id}:W`)!.push([center - east.z, width]);
  };
  for (const a of fixed) {
    for (const b of fixed) {
      if (a.id >= b.id) continue;
      if (Math.abs(a.x + a.w - b.x) < 0.05) {
        addSharedEastWestOpening(a, b);
      } else if (Math.abs(b.x + b.w - a.x) < 0.05) {
        addSharedEastWestOpening(b, a);
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
  const addWall = (cx: number, cz: number, sx: number, sz: number, h: number, baseY: number): void => {
    pushBox(buckets.masonry, sx, h, sz, cx, baseY + h / 2, cz);
  };
  let stairTreadCount = 0;
  const addSteppedRun = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    width: number,
    fromElevation: number,
    toElevation: number,
  ): void => {
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 0.01) return;
    const rise = Math.abs(toElevation - fromElevation);
    const steps = rise < 0.01 ? 1 : Math.max(2, Math.ceil(rise / 0.18));
    const vertical = Math.abs(bx - ax) < 0.01;
    for (let index = 0; index < steps; index += 1) {
      const p0 = index / steps;
      const p1 = (index + 1) / steps;
      const elevation = THREE.MathUtils.lerp(fromElevation, toElevation, steps === 1 ? 0 : index / (steps - 1));
      const cx = THREE.MathUtils.lerp(ax, bx, (p0 + p1) / 2);
      const cz = THREE.MathUtils.lerp(az, bz, (p0 + p1) / 2);
      const run = length / steps + 0.03;
      pushBox(
        buckets.flagstone,
        vertical ? width : run,
        FLOOR_T,
        vertical ? run : width,
        cx,
        elevation - FLOOR_T / 2,
        cz,
      );
    }
    if (steps > 1) stairTreadCount += steps;
  };

  for (const room of rooms) {
    const { x: rx, z: rz, w: rw, h: rh } = room;
    const wallH = room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
    if (Math.abs(room.endElevation - room.floorElevation) < 0.01) {
      pushBox(buckets.flagstone, rw + WALL_T * 2, FLOOR_T, rh + WALL_T * 2, rx + rw / 2, room.floorElevation - FLOOR_T / 2, rz + rh / 2);
    } else {
      addSteppedRun(rx, rz + rh / 2, rx + rw, rz + rh / 2, rh + WALL_T * 2, room.floorElevation, room.endElevation);
    }

    const sides: Record<string, [boolean, number, number, number]> = {
      N: [true, rx - WALL_T, rz - WALL_T / 2, rw + 2 * WALL_T],
      S: [true, rx - WALL_T, rz + rh + WALL_T / 2, rw + 2 * WALL_T],
      W: [false, rz, rx - WALL_T / 2, rh],
      E: [false, rz, rx + rw + WALL_T / 2, rh],
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
          if (alongX && Math.abs(room.endElevation - room.floorElevation) >= 0.01) {
            const slices = Math.max(1, Math.ceil(segLen / 1.2));
            for (let index = 0; index < slices; index += 1) {
              const sliceStart = cursor + (segLen * index) / slices;
              const sliceEnd = cursor + (segLen * (index + 1)) / slices;
              const sliceMid = (sliceStart + sliceEnd) / 2;
              const baseY = THREE.MathUtils.lerp(room.floorElevation, room.endElevation, sliceMid / room.w);
              addWall(startA + sliceMid, fixedC, sliceEnd - sliceStart + 0.02, WALL_T, wallH, baseY);
            }
          } else {
            const baseY = alongX
              ? THREE.MathUtils.lerp(room.floorElevation, room.endElevation, mid / room.w)
              : side === "E" ? room.endElevation : room.floorElevation;
            if (alongX) addWall(startA + mid, fixedC, segLen, WALL_T, wallH, baseY);
            else addWall(fixedC, startA + mid, WALL_T, segLen, wallH, baseY);
          }
        }
        if (o0 < length) {
          const lintelH = wallH - DOOR_LINTEL_H;
          if (lintelH > 0.05) {
            const mid = (o0 + o1) / 2;
            const baseY = alongX
              ? THREE.MathUtils.lerp(room.floorElevation, room.endElevation, mid / room.w)
              : side === "E" ? room.endElevation : room.floorElevation;
            if (alongX) pushBox(buckets.masonry, o1 - o0, lintelH, WALL_T, startA + mid, baseY + DOOR_LINTEL_H + lintelH / 2, fixedC);
            else pushBox(buckets.masonry, WALL_T, lintelH, o1 - o0, fixedC, baseY + DOOR_LINTEL_H + lintelH / 2, startA + mid);
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
      const fromElevation = corridor.elevations[i]!;
      const toElevation = corridor.elevations[i + 1]!;
      addSteppedRun(ax, az, bx, bz, w + WALL_T * 2, fromElevation, toElevation);
      const baseY = Math.min(fromElevation, toElevation);
      const wallHeight = WALL_H + Math.abs(toElevation - fromElevation);
      if (x1 - x0 < 0.01) {
        addWall(ax - w / 2 - WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0, wallHeight, baseY);
        addWall(ax + w / 2 + WALL_T / 2, (z0 + z1) / 2, WALL_T, z1 - z0, wallHeight, baseY);
      } else {
        addWall((x0 + x1) / 2, az - w / 2 - WALL_T / 2, x1 - x0, WALL_T, wallHeight, baseY);
        addWall((x0 + x1) / 2, az + w / 2 + WALL_T / 2, x1 - x0, WALL_T, wallHeight, baseY);
      }
    }
  }

  for (const ascent of sharedAscents(layout)) {
    if (ascent.axis === "x") {
      addSteppedRun(ascent.from, ascent.along, ascent.to, ascent.along, ascent.width, ascent.fromElevation, ascent.toElevation);
    }
  }

  // merge buckets into single meshes per material
  const flagstoneMesh = new THREE.Mesh(mergeGeometries(buckets.flagstone), materials.flagstone);
  flagstoneMesh.name = "shell-floors";
  flagstoneMesh.userData = { stairTreadCount };
  flagstoneMesh.receiveShadow = true;
  shell.add(flagstoneMesh);
  const masonryMesh = new THREE.Mesh(mergeGeometries(buckets.masonry), materials.masonry);
  masonryMesh.name = "shell-walls";
  masonryMesh.castShadow = true;
  masonryMesh.receiveShadow = true;
  shell.add(masonryMesh);

  // Room and corridor ceilings (dark timber-stone caps) read as a continuous
  // dungeon shell at eye level and cut away together when the review camera
  // rises (see the render loop toggle).
  const ceilingGeos: THREE.BufferGeometry[] = [];
  for (const room of rooms) {
    const wallH = room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
    const g = new THREE.BoxGeometry(room.w + WALL_T * 2, 0.25, room.h + WALL_T * 2);
    scaleBoxUV(g, room.w, 0.25, room.h);
    g.translate(room.x + room.w / 2, Math.max(room.floorElevation, room.endElevation) + wallH + 0.125, room.z + room.h / 2);
    ceilingGeos.push(g);
  }
  let corridorCeilingSegmentCount = 0;
  for (const corridor of corridors) {
    const pts = corridor.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.01) continue;
      const vertical = Math.abs(bx - ax) < 0.01;
      const width = vertical ? corridor.width + WALL_T * 2 : length;
      const depth = vertical ? length : corridor.width + WALL_T * 2;
      const g = new THREE.BoxGeometry(width, 0.25, depth);
      scaleBoxUV(g, width, 0.25, depth);
      g.translate((ax + bx) / 2, Math.max(corridor.elevations[i]!, corridor.elevations[i + 1]!) + WALL_H + 0.125, (az + bz) / 2);
      ceilingGeos.push(g);
      corridorCeilingSegmentCount += 1;
    }
  }
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: materials.masonry.map,
    emissiveMap: materials.masonry.map,
    roughness: 0.96,
    metalness: 0.0,
    color: 0x6b6258,
    emissive: 0x241f1a,
    emissiveIntensity: 0.34,
    side: THREE.DoubleSide,
  });
  const ceilings = new THREE.Mesh(mergeGeometries(ceilingGeos), ceilingMat);
  ceilings.name = "shell-ceilings";
  ceilings.castShadow = false;
  ceilings.receiveShadow = true;
  ceilings.userData = {
    roomCapCount: rooms.length,
    corridorCapCount: corridorCeilingSegmentCount,
  };
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

/** Boss cover is tagged for the later combat/destruction pass. */
function buildArchitecturalPolish(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  materials: { flagstone: THREE.MeshStandardMaterial; masonry: THREE.MeshStandardMaterial },
): void {
  const group = new THREE.Group();
  group.name = "breach-v2-architectural-polish";
  scene.add(group);

  const bossRoom = layout.rooms.find((room) => room.kind === "boss");
  if (bossRoom) {
    const cover = new THREE.Group();
    cover.name = "boss-destructible-cover";
    const cx = bossRoom.x + bossRoom.w / 2;
    const cz = bossRoom.z + bossRoom.h / 2;
    cover.position.set(cx, bossRoom.floorElevation, cz);
    cover.userData = { combatCoverSet: true, lineOfSightBlockerCount: 6 };
    const coverPositions: readonly (readonly [number, number])[] = [
      [-10, -2], [-10, 3], [-5, 0], [5, 0], [10, -2], [10, 3],
    ];
    for (const [index, [ox, oz]] of coverPositions.entries()) {
      const pillar = new THREE.Group();
      pillar.name = `destructible-pillar-${index + 1}`;
      pillar.position.set(ox, 0, oz);
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

interface SectionDoorSystem {
  tickables: ((elapsed: number) => void)[];
  cullables: THREE.Object3D[];
  isBlocked(x: number, z: number, radius: number): boolean;
  setAllOpen(open: boolean): void;
  toggleNearest(x: number, z: number, maxDistance?: number): string | null;
  toggleAt(
    playerX: number,
    playerZ: number,
    targetX: number,
    targetZ: number,
    maxPlayerDistance?: number,
    maxTargetDistance?: number,
  ): string | null;
}

/** Use authored 3DAI Studio doors and portcullises at section boundaries. */
async function placeSectionDoors(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
  authorizeDoor: (doorId: string) => boolean,
): Promise<SectionDoorSystem> {
  const doorSpec = DUNGEON_PROP_ASSETS["heavy-door"];
  const gateSpec = DUNGEON_PROP_ASSETS["rusted-portcullis"];
  const [doorGltf, gateGltf] = await Promise.all([
    loader.loadAsync(doorSpec.sourceUrl),
    loader.loadAsync(gateSpec.sourceUrl),
  ]);
  const doors: readonly {
    id: string;
    x: number;
    z: number;
    axis: "x" | "z";
  }[] = [
    { id: "vestibule-link", x: 30, z: 11, axis: "x" },
    { id: "threshold-entry", x: 36, z: 11, axis: "x" },
    { id: "wayfarer-choice", x: layout.landmarks.doorWayfarer.x, z: layout.landmarks.doorWayfarer.z, axis: "x" },
    { id: "oathbreaker-choice", x: layout.landmarks.doorOathbreaker.x, z: layout.landmarks.doorOathbreaker.z, axis: "x" },
    ...layout.rooms
      .filter((room) => room.kind === "gallery")
      // Generated route corridors enter each gallery at the midpoint of its
      // west wall (room.x, room.z + room.h / 2). The portal normal and its
      // collision band therefore stay on X while the leaf spans Z.
      .map((room) => ({ id: `${room.id}-entry`, x: room.x, z: room.z + room.h / 2, axis: "x" as const })),
    { id: "convergence-lock", x: 188, z: 10, axis: "x" },
    { id: "ashen-threshold", x: 192, z: 10, axis: "x" },
    { id: "boss-lock", x: 208, z: 10, axis: "x" },
    { id: "memory-vault", x: 242, z: 7, axis: "x" },
    { id: "way-upward", x: 247, z: 12, axis: "z" },
  ];

  const tickables: ((elapsed: number) => void)[] = [];
  const portcullisIds = new Set([
    "wayfarer-choice", "oathbreaker-choice", "ashen-threshold", "boss-lock",
  ]);
  const routeMists: THREE.Object3D[] = [];
  const routeMistByDoorId = new Map<string, {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    closedOpacity: number;
  }>();
  const states: {
    id: string;
    x: number;
    z: number;
    axis: "x" | "z";
    floorY: number;
    root: THREE.Group;
    kind: "door" | "gate";
    active: boolean;
    open: boolean;
    progress: number;
  }[] = [];
  for (const [index, door] of doors.entries()) {
    const floorY = floorElevationAt(layout, door.x, door.z);
    const kind = portcullisIds.has(door.id) ? "gate" : "door";
    const active = door.id !== "wayfarer-choice" && door.id !== "oathbreaker-choice"
      ? true
      : door.id === `${layout.meta.path}-choice`;
    const sourceSpec = kind === "door" ? doorSpec : gateSpec;
    const sourceScene = kind === "door" ? doorGltf.scene : gateGltf.scene;
    const instance = instantiateDungeonProp(sourceScene, sourceSpec, index * 0.23);
    const sourceModel = instance.root.getObjectByName(`${sourceSpec.id}-model`);
    if (kind === "door" && sourceModel) {
      // Fit the actual 3DAI Studio leaf into the authored 2.5 m portal. The
      // catalog-normalized source is 1.94 m wide and otherwise left daylight
      // gaps at both jambs.
      sourceModel.visible = true;
      sourceModel.position.y = (DOOR_LINTEL_H + 0.08) / 2;
      sourceModel.scale.set(3, DOOR_LINTEL_H + 0.08, 3.96);
      sourceModel.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        });
      });
    } else if (kind === "gate" && sourceModel) {
      // The height-constrained catalog fit leaves this particular source GLB
      // only ~2.17 m wide. Widen its dominant horizontal axis so the metal
      // overlaps the 2.5 m stone jambs instead of leaving daylight seams.
      sourceModel.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(sourceModel, true).getSize(new THREE.Vector3());
      const targetWidth = DOOR_PORTAL_W + 0.08;
      if (size.z >= size.x) sourceModel.scale.z *= targetWidth / Math.max(size.z, 0.001);
      else sourceModel.scale.x *= targetWidth / Math.max(size.x, 0.001);
      sourceModel.updateMatrixWorld(true);
    }
    const pivot = new THREE.Group();
    pivot.name = `section-${kind}-${door.id}`;
    pivot.userData = {
      ...instance.root.userData,
      connectorId: door.id,
      state: active ? "closed" : "sealed",
      blocksMovement: true,
      activeRouteDoor: active,
      portalKind: kind,
      sourceAsset: kind === "door" ? "heavy-door.glb" : "rusted-portcullis.glb",
      portalX: door.x,
      portalZ: door.z,
      portalAxis: door.axis,
      floorElevation: floorY,
    };
    instance.root.name = `section-${kind}-leaf-${door.id}`;
    const frameYaw = door.axis === "x" ? 0 : Math.PI / 2;
    pivot.rotation.y = frameYaw;
    if (kind === "door") {
      // Swing around the jamb-side hinge instead of rotating the leaf around
      // its centre. The paid model's leaf and hardware stay together.
      const closedLeafOffset = new THREE.Vector3(0, 0, DOOR_PORTAL_W / 2)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), frameYaw);
      pivot.position.set(door.x - closedLeafOffset.x, floorY, door.z - closedLeafOffset.z);
      instance.root.position.set(0, 0, DOOR_PORTAL_W / 2);
    } else {
      // Portcullises sit centered in the opening and lift into the lintel.
      // Their open motion is vertical; they never rotate like a hinged leaf.
      pivot.position.set(door.x, floorY, door.z);
      instance.root.position.set(0, 0, 0);
    }
    pivot.add(instance.root);
    scene.add(pivot);
    tickables.push(instance.animate);
    states.push({ ...door, floorY, root: pivot, kind, active, open: false, progress: 0 });

    if (door.id === "wayfarer-choice" || door.id === "oathbreaker-choice") {
      const smokeMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: active ? 0.78 : 0.96 },
          uTint: {
            value: new THREE.Color(door.id === "wayfarer-choice" ? 0x46d9e8 : 0xe86a3c),
          },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uOpacity;
          uniform vec3 uTint;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
          }
          void main() {
            vec2 flow = vec2(vUv.x * 3.8 + sin(vUv.y * 7.0 + uTime) * 0.2,
              vUv.y * 5.2 - uTime * 0.18);
            float smoke = noise(flow) * 0.55 + noise(flow * 2.1 + 4.0) * 0.3;
            float wisp = pow(0.5 + 0.5 * sin(
              vUv.y * 31.0 - uTime * 2.1 + noise(vec2(vUv.x * 7.0, uTime * 0.08)) * 8.0
            ), 7.0);
            float shimmer = pow(0.5 + 0.5 * sin(
              vUv.x * 46.0 + vUv.y * 9.0 + uTime * 2.8
            ), 14.0) * (0.25 + smoke * 0.75);
            float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x)
              * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            vec3 color = mix(vec3(0.008, 0.006, 0.012), uTint, 0.20 + smoke * 0.63 + wisp * 0.14);
            color += uTint * shimmer * 0.22;
            gl_FragColor = vec4(color, uOpacity * edge * (0.17 + smoke * 0.66 + wisp * 0.12));
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const smoke = new THREE.Mesh(
        new THREE.PlaneGeometry(DOOR_PORTAL_W + 0.18, DOOR_LINTEL_H + 0.08, 1, 1),
        smokeMaterial,
      );
      smoke.name = `route-mist-${door.id}`;
      smoke.position.set(door.x + (door.axis === "x" ? 0.34 : 0), floorY + (DOOR_LINTEL_H + 0.08) / 2,
        door.z + (door.axis === "z" ? 0.34 : 0));
      smoke.rotation.y = door.axis === "x" ? Math.PI / 2 : 0;
      smoke.userData = {
        activeRoute: active,
        connectorId: door.id,
        blocksMovement: false,
      };
      scene.add(smoke);
      routeMists.push(smoke);
      routeMistByDoorId.set(door.id, {
        mesh: smoke,
        material: smokeMaterial,
        closedOpacity: active ? 0.78 : 0.96,
      });
      tickables.push((elapsed) => { smokeMaterial.uniforms.uTime!.value = elapsed; });
    }
  }

  let lastDoorTickElapsed: number | null = null;
  tickables.push((elapsed) => {
    const delta = lastDoorTickElapsed === null
      ? 1 / 30
      : Math.min(0.5, Math.max(0, elapsed - lastDoorTickElapsed));
    lastDoorTickElapsed = elapsed;
    const animationAlpha = 1 - Math.exp(-5.5 * delta);
    for (const state of states) {
      const target = state.open ? 1 : 0;
      state.progress += (target - state.progress) * animationAlpha;
      if (Math.abs(target - state.progress) < 0.001) state.progress = target;
      const frameYaw = state.axis === "x" ? 0 : Math.PI / 2;
      const closedLeafOffset = new THREE.Vector3(0, 0, DOOR_PORTAL_W / 2)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), frameYaw);
      if (state.kind === "door") {
        state.root.position.set(state.x - closedLeafOffset.x, state.floorY, state.z - closedLeafOffset.z);
        state.root.rotation.y = frameYaw + state.progress * (Math.PI / 2);
      } else {
        state.root.position.set(state.x, state.floorY + state.progress * (DOOR_LINTEL_H + 0.42), state.z);
        state.root.rotation.y = frameYaw;
      }
      state.root.userData.state = state.active ? (state.open ? "open" : "closed") : "sealed";
      state.root.userData.blocksMovement = !state.open || state.progress < 0.88;
      const routeMist = routeMistByDoorId.get(state.id);
      if (routeMist) {
        // The inactive route remains visibly sealed. The chosen route's mist
        // follows the physical portal progress so an open route-choice door
        // never leaves an opaque phantom barrier across the aperture.
        const openFactor = state.active ? 1 - state.progress : 1;
        routeMist.material.uniforms.uOpacity!.value = routeMist.closedOpacity * openFactor;
        routeMist.mesh.userData.openProgress = state.progress;
      }
    }
  });

  const setOpen = (state: (typeof states)[number], open: boolean): void => {
    state.open = state.active && open;
  };
  return {
    tickables,
    cullables: [...states.map((state) => state.root), ...routeMists],
    isBlocked: (x, z, radius) => states.some((state) => {
      if (!state.root.userData.blocksMovement) return false;
      const normalDistance = state.axis === "x" ? Math.abs(x - state.x) : Math.abs(z - state.z);
      const alongDistance = state.axis === "x" ? Math.abs(z - state.z) : Math.abs(x - state.x);
      return normalDistance <= radius + 0.24 && alongDistance <= DOOR_PORTAL_W / 2 + radius;
    }),
    setAllOpen: (open) => states.forEach((state) => setOpen(state, open)),
    toggleNearest: (x, z, maxDistance = 4.2) => {
      const nearest = states
        .map((state) => ({ state, distance: Math.hypot(state.x - x, state.z - z) }))
        .filter(({ state, distance }) => state.active && distance <= maxDistance)
        // Short connectors can put two doors inside the keyboard interaction
        // radius. Continue forward by preferring a closed door over an open
        // door behind the player; once both share a state, distance wins.
        .sort((a, b) => a.state.open === b.state.open
          ? a.distance - b.distance
          : a.state.open ? 1 : -1)[0]?.state;
      if (!nearest) return null;
      if (!nearest.open && !authorizeDoor(nearest.id)) return nearest.id;
      setOpen(nearest, !nearest.open);
      return nearest.id;
    },
    toggleAt: (
      playerX,
      playerZ,
      targetX,
      targetZ,
      maxPlayerDistance = 4.2,
      maxTargetDistance = 1.55,
    ) => {
      const nearest = states
        .map((state) => ({
          state,
          playerDistance: Math.hypot(state.x - playerX, state.z - playerZ),
          targetDistance: Math.hypot(state.x - targetX, state.z - targetZ),
        }))
        .filter(({ state, playerDistance, targetDistance }) => (
          state.active
          && playerDistance <= maxPlayerDistance
          && targetDistance <= maxTargetDistance
        ))
        .sort((a, b) => a.targetDistance - b.targetDistance)[0]?.state;
      if (!nearest) return null;
      if (!nearest.open && !authorizeDoor(nearest.id)) return nearest.id;
      setOpen(nearest, !nearest.open);
      return nearest.id;
    },
  };
}
// ---------------------------------------------------------------------------
// kit props via DungeonPropKit (catalog-normalized, hanging assemblies, fires)
// ---------------------------------------------------------------------------
interface PropPlacements {
  tickables: ((elapsed: number) => void)[];
  cullables: THREE.Object3D[];
}

async function placeKitProps(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
): Promise<PropPlacements> {
  const used = new Map<string, Promise<GLTF>>();
  const hasWeaponRacks = layout.placements.some((placement) => placement.asset === "empty-weapon-rack");
  const rackWeaponPromise = hasWeaponRacks
    ? loader.loadAsync("/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb")
    : null;
  for (const p of layout.placements) {
    if (p.glbRuntime && p.asset !== "heavy-door" && !used.has(p.glbRuntime)) {
      used.set(p.glbRuntime, loader.loadAsync(p.glbRuntime));
    }
  }
  const needsCandelabraSupports = layout.placements.some((placement) => (
    placement.asset === "candelabra-cluster" && placement.elevation - placement.floorElevation < 0.2
  ));
  const candelabraSupportSpec = DUNGEON_PROP_ASSETS["reinforced-crate"];
  if (needsCandelabraSupports && !used.has(candelabraSupportSpec.sourceUrl)) {
    used.set(candelabraSupportSpec.sourceUrl, loader.loadAsync(candelabraSupportSpec.sourceUrl));
  }
  const loaded = new Map<string, GLTF>();
  await Promise.all([...used.entries()].map(async ([url, promise]) => {
    loaded.set(url, await promise);
  }));

  // The environment kit intentionally ships an empty rack. Populate it with
  // the real starter longsword meshes from the imported Shadowknight kit,
  // preserving their authored geometry and materials instead of drawing
  // procedural box "weapons" over the rack.
  const rackWeaponSource = new THREE.Group();
  if (rackWeaponPromise) {
    const rackWeaponGltf = await rackWeaponPromise;
    const weaponParts = new THREE.Group();
    for (const name of [
      "SK_StarterLongsword_Blade",
      "SK_StarterLongsword_Guard",
      "SK_StarterLongsword_Grip",
      "SK_StarterLongsword_Pommel",
    ]) {
      const sourcePart = rackWeaponGltf.scene.getObjectByName(name);
      if (!(sourcePart instanceof THREE.Mesh)) continue;
      const part = sourcePart.clone(false);
      part.position.copy(sourcePart.position);
      part.quaternion.copy(sourcePart.quaternion);
      part.scale.copy(sourcePart.scale);
      part.castShadow = true;
      part.receiveShadow = true;
      weaponParts.add(part);
    }
    weaponParts.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(weaponParts);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      weaponParts.position.sub(center);
      rackWeaponSource.scale.setScalar(1.24 / Math.max(size.x, size.y, size.z));
    }
    rackWeaponSource.add(weaponParts);
  }

  const tickables: ((elapsed: number) => void)[] = [];
  const cullables: THREE.Object3D[] = [];
  const addRackWeapons = (x: number, y: number, z: number, yaw: number): void => {
    if (rackWeaponSource.children.length === 0) return;
    const dressing = new THREE.Group();
    dressing.name = "training-rack-imported-longswords";
    dressing.position.set(x, y, z);
    dressing.rotation.y = yaw;
    [-0.62, 0, 0.62].forEach((offset, index) => {
      const weapon = rackWeaponSource.clone(true);
      weapon.position.set(offset, 1.18, 0.08);
      weapon.rotation.z = (index - 1) * 0.12;
      dressing.add(weapon);
    });
    dressing.userData = { importedWeaponDisplay: true, sourceAsset: "elf-shadowknight-starter-longsword" };
    scene.add(dressing);
    cullables.push(dressing);
  };
  let phase = 0;
  const litSconceSides = new Map<string, number>();
  const litBrazierRooms = new Set<string>();
  for (const p of layout.placements) {
    if (!p.glbRuntime || p.asset === "heavy-door") continue;
    const spec = DUNGEON_PROP_ASSETS[p.asset as keyof typeof DUNGEON_PROP_ASSETS];
    const gltf = loaded.get(p.glbRuntime)!;
    const needsCandleStand = p.asset === "candelabra-cluster" && p.elevation - p.floorElevation < 0.2;
    const instance = instantiateDungeonProp(gltf.scene, {
      ...spec,
      targetHeight: needsCandleStand ? 0.72 : p.height,
      maxFootprint: needsCandleStand ? 0.82 : p.footprint,
    }, phase);
    phase += 0.37;
    instance.root.position.set(p.x, p.elevation + (needsCandleStand ? 0.76 : 0), p.z);
    if (needsCandleStand) {
      const supportGltf = loaded.get(candelabraSupportSpec.sourceUrl)!;
      const support = instantiateDungeonProp(supportGltf.scene, {
        ...candelabraSupportSpec,
        targetHeight: 0.74,
        maxFootprint: 0.9,
      }, phase + 0.11);
      support.root.name = "candelabra-imported-crate-support";
      support.root.position.set(p.x, p.elevation, p.z);
      support.root.rotation.y = THREE.MathUtils.degToRad(p.yaw + 90);
      support.root.userData = {
        ...support.root.userData,
        supportFor: "candelabra-cluster",
        sourceAsset: "reinforced-crate",
      };
      scene.add(support.root);
      cullables.push(support.root);
    }
    // The 3DAI heavy-door source faces across its local X axis, while authored
    // wall yaw is expressed as a wall normal. Correct that source-local basis
    // once here so registry doors sit inside their frames instead of edge-on.
    const sourceYawCorrection = {
      "archive-bookshelf": 90,
      "archive-cupboard": 90,
      "empty-weapon-rack": 90,
      "guardian-statue": 270,
      "reliquary-wall-alcove": 90,
      "ruined-stone-archway": 90,
    }[p.asset] ?? 0;
    const tutorialAsset = p.roomId === "vestibule" && [
      "trestle-table", "high-backed-chair", "storage-chest",
      "reinforced-crate", "storage-barrel",
    ].includes(p.asset);
    const authoredFloorFacing = tutorialAsset || p.asset === "guardian-statue";
    const vestibuleGuardianFacing = p.roomId === "vestibule" && p.asset === "guardian-statue"
      ? 270 // both flanking guardians look west into the approaching room
      : null;
    const tutorialFacing = vestibuleGuardianFacing ?? (authoredFloorFacing
      ? ({ north: 0, east: 90, south: 180, west: 270 }[p.facing] ?? p.yaw)
      : p.yaw);
    instance.root.rotation.y = THREE.MathUtils.degToRad(tutorialFacing + sourceYawCorrection);
    if (tutorialAsset) {
      const actions = p.asset === "storage-chest"
        ? ["inspect", "open", "move"]
        : p.asset === "reinforced-crate" || p.asset === "storage-barrel"
          ? ["inspect", "move", "destroy"]
          : ["inspect", "move"];
      instance.root.userData = {
        ...instance.root.userData,
        tutorialProp: true,
        interactable: true,
        interactionActions: actions,
      };
    }
    if (p.role === "destructible-cover") {
      instance.root.userData = {
        ...instance.root.userData,
        combatCover: true,
        destructible: true,
        hitPoints: p.asset === "broken-handcart" ? 90 : 55,
        interactionActions: ["inspect", "move", "destroy"],
      };
    }
    if (p.role === "loot-cache") {
      const unlockCondition = p.roomId.startsWith("chamber-")
        ? "room-complete"
        : p.roomId === "memory-vault"
          ? "boss-defeated"
          : "available";
      instance.root.userData = {
        ...instance.root.userData,
        lootCache: true,
        lootRoomId: p.roomId,
        unlockCondition,
        interactable: true,
        interactionActions: ["inspect", "open"],
      };
    }
    scene.add(instance.root);
    cullables.push(instance.root);
    tickables.push((elapsed) => {
      if (instance.root.visible) instance.animate(elapsed);
    });
    if (p.asset === "empty-weapon-rack") {
      addRackWeapons(p.x, p.elevation, p.z, instance.root.rotation.y);
    }
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
      // Fire belongs to the imported fixture, not to the world. The sconce's
      // authored torch cup is offset from its wall plate; this one loader-side
      // source-space correction seats the flame in that cup for every wall
      // orientation. Braziers stay centered, and hanging flames inherit sway.
      const fixtureFireOffset = p.asset === "wall-torch-sconce"
        ? new THREE.Vector3(0.1, p.fireAnchorY - 0.22, -0.31)
        : new THREE.Vector3(0, p.fireAnchorY, 0);
      fire.root.position.copy(fixtureFireOffset);
      fire.root.userData = {
        fixtureAsset: p.asset,
        fixtureRoomId: p.roomId,
        fixtureLocalAnchor: fixtureFireOffset.toArray(),
      };
      const flameScale = p.asset === "wall-torch-sconce" ? 0.48
        : p.asset === "floor-brazier" ? 0.68
          : 0.58;
      fire.root.scale.setScalar(flameScale);
      // Large rooms keep two real sconce lights on each opposing wall so
      // tutorial props remain readable. Smaller rooms keep one per wall.
      // Fire roots are distance-culled, so only nearby rooms contribute lights.
      const sconceSide = `${p.roomId}:${p.facing}`;
      const roomWidth = layout.rooms.find((room) => room.id === p.roomId)?.w ?? 0;
      const sconceLimit = roomWidth >= 18 ? 2 : 1;
      const sconceCount = litSconceSides.get(sconceSide) ?? 0;
      const keepSconce = p.asset === "wall-torch-sconce"
        && (p.facing === "north" || p.facing === "south")
        && sconceCount < sconceLimit;
      const keepBrazier = p.asset === "floor-brazier" && !litBrazierRooms.has(p.roomId);
      if (keepSconce) litSconceSides.set(sconceSide, sconceCount + 1);
      if (keepBrazier) litBrazierRooms.add(p.roomId);
      const keepLocalLight = keepSconce || keepBrazier;
      const localLights: THREE.PointLight[] = [];
      fire.root.traverse((child) => {
        if (!(child instanceof THREE.PointLight)) return;
        child.visible = keepLocalLight;
        child.distance = p.asset === "floor-brazier" ? 15 : 12;
        child.decay = 1.5;
        localLights.push(child);
      });
      instance.fireMount.add(fire.root);
      cullables.push(fire.root);
      tickables.push((elapsed) => {
        // Hidden rooms do not need particle-buffer or shader-uniform updates.
        // For visible rooms, lift the physical-light energy after the shared
        // fire animator applies its flicker baseline.
        if (!fire.root.visible) return;
        fire.animate(elapsed);
        const lightScale = p.asset === "floor-brazier" ? 3.4
          : p.asset === "hanging-brazier" ? 2.6
            : 1.7;
        localLights.forEach((light) => { light.intensity *= lightScale; });
      });
    }
  }
  return { tickables, cullables };
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

  // Soul Well: dungeon-masonry basin, animated water, splashes, and a suspended
  // cluster of soul-memory crystal rather than a smooth UI-like pool.
  const well = lm.soulWell;
  const basinMat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load(`${TEX_ROOT}/masonry-color.jpg`),
    roughness: 0.85, metalness: 0.04, color: 0x9a9187,
  });
  basinMat.map!.colorSpace = THREE.SRGBColorSpace;
  basinMat.map!.wrapS = THREE.RepeatWrapping;
  basinMat.map!.wrapT = THREE.RepeatWrapping;
  const apron = well.apron ?? 2.65;
  const basinBase = new THREE.Mesh(
    new THREE.CylinderGeometry(apron - 0.18, apron + 0.08, 0.58, 8),
    basinMat,
  );
  basinBase.position.set(well.x, 0.29, well.z);
  basinBase.castShadow = true;
  basinBase.receiveShadow = true;
  group.add(basinBase);
  const ringRadius = apron - 0.14;
  const blockLength = 2 * ringRadius * Math.tan(Math.PI / 8) * 0.94;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const block = texturedBox(blockLength, 0.55, 0.48, basinMat);
    block.position.set(well.x + Math.cos(angle) * ringRadius, 0.68, well.z + Math.sin(angle) * ringRadius);
    block.rotation.y = Math.PI / 2 - angle;
    group.add(block);
  }
  // Recessed soul-water is an opaque abyssal realm surface. It deliberately
  // hides the masonry below; shallow translucent water makes the Soul Well
  // read as a basin instead of a one-way passage into another realm.
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vLift;
      void main() {
        vUv = uv;
        vec2 p = (uv - 0.5) * 2.0;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float spiral = sin(angle * 5.0 - radius * 19.0 - uTime * 1.85);
        float crossWave = sin(p.x * 15.0 + p.y * 11.0 + uTime * 1.35);
        float edgeEnvelope = 1.0 - smoothstep(0.76, 1.0, radius);
        vLift = (spiral * 0.72 + crossWave * 0.28) * edgeEnvelope;
        vec3 displaced = position;
        displaced.z += vLift * 0.045;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vLift;
      uniform float uTime;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radius = length(p);
        if (radius > 1.0) discard;
        float angle = atan(p.y, p.x);
        float spiralA = sin(angle * 6.0 - radius * 23.0 - uTime * 2.05) * 0.5 + 0.5;
        float spiralB = sin(angle * -4.0 - radius * 34.0 + uTime * 1.45) * 0.5 + 0.5;
        float current = pow(max(0.0, spiralA + spiralB - 1.12), 2.6);
        float fineCurrent = pow(0.5 + 0.5 * sin(
          angle * 10.0 - radius * 52.0 - uTime * 3.1
        ), 9.0);
        float abyss = 1.0 - smoothstep(0.08, 0.78, radius);
        float rim = smoothstep(0.76, 0.98, radius);
        vec3 blackDepth = vec3(0.002, 0.018, 0.026);
        vec3 deepSoul = vec3(0.015, 0.115, 0.145);
        vec3 currentColor = vec3(0.12, 0.48, 0.54);
        vec3 soulWhite = vec3(0.68, 0.94, 0.91);
        vec3 color = mix(deepSoul, blackDepth, abyss * 0.88);
        color = mix(color, currentColor, current * (0.38 + radius * 0.28));
        color = mix(color, soulWhite, fineCurrent * (0.08 + rim * 0.30));
        color += currentColor * max(vLift, 0.0) * 0.08;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const waterRadius = (well.r ?? 1.8) + 0.24;
  const waterGeometry = new THREE.PlaneGeometry(waterRadius * 2, waterRadius * 2, 48, 48);
  const water = new THREE.Mesh(waterGeometry, waterMat);
  water.name = "vestibule-soulwell-abyss-water";
  water.rotation.x = -Math.PI / 2;
  water.position.set(well.x, 0.575, well.z);
  water.userData = {
    vfxKind: "abyssal-soulwell-vortex",
    visualDepth: "bottomless-realm-threshold",
    sourceLane: "HOUDINI_APPRENTICE_POC_RUNTIME_SHADER",
    collisionMode: "landmark-boundary",
  };
  group.add(water);
  const jetGeometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < 3; index += 1) {
    const angle = index * (Math.PI * 2 / 3) + 0.35;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const curve = new THREE.QuadraticBezierCurve3(
      direction.clone().multiplyScalar(0.18),
      direction.clone().multiplyScalar(0.5).setY(0.46),
      direction.clone().multiplyScalar(0.92),
    );
    jetGeometries.push(new THREE.TubeGeometry(curve, 16, 0.008, 5, false));
  }
  const splashGeometry = mergeGeometries(jetGeometries)!;
  const splashMaterial = new THREE.MeshBasicMaterial({
    color: 0x4faeb8,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const splashes = new THREE.Mesh(splashGeometry, splashMaterial);
  splashes.name = "vestibule-soulwell-current-jets";
  splashes.position.set(well.x, 0.59, well.z);
  group.add(splashes);
  const ripples: THREE.Mesh[] = [];
  [0.7, 1.25, 1.75].forEach((radius) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.014, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x75c7cf, transparent: true, opacity: 0.14 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(well.x, 0.58, well.z);
    group.add(ring);
    ripples.push(ring);
  });
  const soulWellKey = new THREE.PointLight(0x66dce1, 7.2, 11, 1.75);
  soulWellKey.name = "soulwell-fx-key";
  soulWellKey.position.set(well.x, 1.28, well.z);
  soulWellKey.castShadow = true;
  soulWellKey.shadow.mapSize.set(512, 512);
  soulWellKey.shadow.bias = -0.01;
  group.add(soulWellKey);
  const soulWellBounce = new THREE.PointLight(0x245c70, 2.4, 7.5, 1.9);
  soulWellBounce.name = "soulwell-fx-bounce";
  soulWellBounce.position.set(well.x, 0.72, well.z);
  group.add(soulWellBounce);
  const moteCount = 22;
  const motePositions = new Float32Array(moteCount * 3);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const soulMotes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: 0x89f5ed,
      size: 0.075,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  soulMotes.name = "vestibule-soulwell-rising-motes";
  soulMotes.position.set(well.x, 0.61, well.z);
  group.add(soulMotes);
  // emergence step at the south edge (stone)
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.7), basinMat);
  step.position.set(well.x, 0.11, well.z + apron + 0.15);
  step.castShadow = true;
  group.add(step);
  tickables.push((elapsed) => {
    waterMat.uniforms.uTime!.value = elapsed;
    const jetPulse = 0.88 + Math.sin(elapsed * 1.8) * 0.12;
    splashes.scale.set(1, jetPulse, 1);
    splashMaterial.opacity = 0.14 + Math.sin(elapsed * 1.8) * 0.04;
    ripples.forEach((ring, i) => {
      const phase = (elapsed * 0.35 + i / ripples.length) % 1;
      const s = 0.4 + phase * 1.1;
      ring.scale.set(s, s, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.16 * (1 - phase);
    });
    soulWellKey.intensity = 6.8 + Math.sin(elapsed * 1.15) * 0.65;
    soulWellKey.position.y = 1.26 + Math.sin(elapsed * 0.7) * 0.08;
    soulWellBounce.intensity = 2.2 + Math.sin(elapsed * 0.8 + 1.4) * 0.25;
    for (let index = 0; index < moteCount; index += 1) {
      const rise = (elapsed * (0.12 + (index % 5) * 0.012) + index * 0.137) % 1;
      const angle = index * 2.399 + elapsed * (0.18 + (index % 3) * 0.035);
      const radius = 0.32 + (index % 7) * 0.17;
      motePositions[index * 3] = Math.cos(angle) * radius;
      motePositions[index * 3 + 1] = 0.12 + rise * 2.15;
      motePositions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    moteGeometry.attributes.position!.needsUpdate = true;
  });

  // Memory Loom: recognizable timber loom with heddles, shuttle, wheel, and
  // woven memory strands instead of a cage-like row of vertical bars.
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
  addBox(loom.x, 1.05, loom.z, 2.0, 0.12, 0.22, loomMat);
  addBox(loom.x, 1.72, loom.z, 1.9, 0.1, 0.18, loomMat);
  const loomWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 8, 24), loomMat);
  loomWheel.position.set(loom.x - 1.18, 0.78, loom.z + 0.02);
  group.add(loomWheel);
  const shuttle = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.09, 0.16), threadMat);
  shuttle.position.set(loom.x, 1.32, loom.z - 0.08);
  group.add(shuttle);
  const threads: THREE.Mesh[] = [];
  for (let t = 0; t < 6; t += 1) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.32, 0.018), threadMat);
    thread.position.set(loom.x - 0.72 + t * 0.29, 1.78, loom.z);
    group.add(thread);
    threads.push(thread);
  }
  tickables.push((elapsed) => {
    loomWheel.rotation.z = elapsed * 0.22;
    shuttle.position.x = loom.x + Math.sin(elapsed * 0.55) * 0.42;
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

  // First Memory: an open illuminated codex grounded on the imported ruined
  // altar. This is a readable reward object, not a floating white UI marker.
  const fm = lm.firstMemory;
  const memoryTexture = new THREE.TextureLoader().load(`${ART_ROOT}/art-relief-first-memory.webp`);
  memoryTexture.colorSpace = THREE.SRGBColorSpace;
  const coverMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b1b14,
    roughness: 0.78,
    metalness: 0.05,
  });
  const pageMaterial = new THREE.MeshStandardMaterial({
    map: memoryTexture,
    emissiveMap: memoryTexture,
    emissive: new THREE.Color(0x4b2314),
    emissiveIntensity: 0.28,
    roughness: 0.7,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const memoryCodex = new THREE.Group();
  memoryCodex.name = "first-memory-codex";
  memoryCodex.position.set(fm.x, 1.5, fm.z);
  memoryCodex.userData = {
    objective: "first-memory",
    interactable: true,
    unlockCondition: "boss-defeated",
    interactionActions: ["inspect", "claim"],
  };
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.02), coverMaterial);
  cover.position.y = -0.06;
  cover.castShadow = true;
  cover.receiveShadow = true;
  memoryCodex.add(cover);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.02, 10), coverMaterial);
  spine.rotation.x = Math.PI / 2;
  spine.position.y = 0.015;
  spine.castShadow = true;
  memoryCodex.add(spine);
  const pages: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.92, 2, 2), pageMaterial);
    page.position.set(side * 0.35, 0.045, 0);
    page.rotation.set(-Math.PI / 2, 0, side * -0.075);
    page.castShadow = true;
    memoryCodex.add(page);
    pages.push(page);
  }
  group.add(memoryCodex);
  tickables.push((elapsed) => {
    pageMaterial.emissiveIntensity = 0.24 + Math.sin(elapsed * 0.9) * 0.06;
    pages.forEach((page, index) => {
      page.rotation.z = (index === 0 ? 1 : -1) * (0.075 + Math.sin(elapsed * 0.55) * 0.006);
    });
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
  const bossRoom = layout.rooms.find((room) => room.kind === "boss")!;
  const arenaCenter = new THREE.Vector3(
    bossRoom.x + bossRoom.w / 2,
    0,
    bossRoom.z + bossRoom.h / 2,
  );
  const runeRadius = 3.35;
  const runeGroup = new THREE.Group();
  runeGroup.name = "boss-activation-sigil";
  runeGroup.position.copy(arenaCenter);
  runeGroup.userData = {
    encounterAnchor: true,
    bossId: layout.boss.id,
    periodicHazard: "radial-cinder-lanes",
  };
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
  // Preserve the V1 encounter grammar: the centre lock periodically sends
  // cinder down readable radial lanes. These meshes are also semantic combat
  // sockets for the later encounter controller, not arbitrary decoration.
  const hazardMaterials = [0, 1].map(() => new THREE.MeshBasicMaterial({
    color: 0xff5d28,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const hazardLength = 7.0;
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(hazardLength, 0.028, 0.16),
      hazardMaterials[index % 2]!,
    );
    const laneRadius = runeRadius + hazardLength / 2 - 0.12;
    lane.position.set(Math.cos(angle) * laneRadius, 0.055, Math.sin(angle) * laneRadius);
    lane.rotation.y = -angle;
    lane.name = `boss-cinder-hazard-lane-${index + 1}`;
    lane.userData = {
      periodicHazard: true,
      damageType: "fire",
      activationGroup: index % 2,
      telegraphSeconds: 1.1,
    };
    runeGroup.add(lane);
  }
  group.add(runeGroup);
  tickables.push((elapsed) => {
    runeMat.emissiveIntensity = 0.95 + Math.sin(elapsed * 1.6) * 0.3;
    const pulse = Math.sin(elapsed * 1.8);
    hazardMaterials[0]!.opacity = 0.2 + Math.max(0, pulse) * 0.44;
    hazardMaterials[1]!.opacity = 0.2 + Math.max(0, -pulse) * 0.44;
  });

  // Sparse authored puddles sit at room-edge low points. They are intentionally
  // shallow, nonblocking, and visually distinct from the opaque Soul Well.
  const puddleMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float irregularRadius = length(p * vec2(0.86, 1.08))
          + sin(atan(p.y, p.x) * 5.0 + 0.7) * 0.065;
        if (irregularRadius > 0.94) discard;
        float edge = smoothstep(0.94, 0.64, irregularRadius);
        float waveA = sin(p.x * 13.0 + p.y * 7.0 - uTime * 1.65) * 0.5 + 0.5;
        float waveB = sin(p.y * 17.0 - p.x * 5.0 + uTime * 1.15) * 0.5 + 0.5;
        float shimmer = pow(max(0.0, waveA + waveB - 1.18), 3.2);
        vec3 color = mix(vec3(0.035, 0.16, 0.18), vec3(0.52, 0.78, 0.75), shimmer * 0.68);
        gl_FragColor = vec4(color, edge * (0.54 + shimmer * 0.20));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const puddleRoomIds = new Set([
    "threshold-plaza", "convergence", "ashen-threshold", "memory-vault", "exit-connector",
  ]);
  const puddleRooms = layout.rooms.filter((room, index) => (
    puddleRoomIds.has(room.id) || (room.kind === "gallery" && index % 2 === 0)
  ));
  for (const [index, room] of puddleRooms.entries()) {
    const insetX = 1.15 + (index % 3) * 0.16;
    const insetZ = 1.05 + (index % 2) * 0.2;
    const candidates = [
      [room.x + insetX, room.z + insetZ],
      [room.x + room.w - insetX, room.z + insetZ],
      [room.x + insetX, room.z + room.h - insetZ],
      [room.x + room.w - insetX, room.z + room.h - insetZ],
    ] as const;
    const roomProps = layout.placements.filter((placement) => placement.roomId === room.id);
    const puddlePosition = candidates
      .map(([x, z]) => ({
        x,
        z,
        clearance: roomProps.reduce(
          (minimum, placement) => Math.min(minimum, Math.hypot(x - placement.x, z - placement.z)),
          Number.POSITIVE_INFINITY,
        ),
      }))
      .sort((a, b) => b.clearance - a.clearance)[0]!;
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.02, 12, 8), puddleMaterial);
    puddle.name = `dungeon-puddle-${room.id}`;
    puddle.rotation.set(-Math.PI / 2, 0, index * 0.73);
    puddle.scale.set(0.78 + (index % 3) * 0.14, 0.72 + (index % 2) * 0.16, 1);
    puddle.position.set(puddlePosition.x, 0.028, puddlePosition.z);
    puddle.renderOrder = 2;
    puddle.userData = {
      vfxKind: "shallow-animated-puddle",
      collisionMode: "nonblocking",
      visualDepth: "shallow",
      authoredLowPoint: true,
    };
    group.add(puddle);
  }
  tickables.push((elapsed) => { puddleMaterial.uniforms.uTime!.value = elapsed; });

  const fogBase = new THREE.Color(0x0d0f14);
  const fogSoulTint = new THREE.Color(0x102229);
  tickables.push((elapsed) => {
    if (!(scene.fog instanceof THREE.FogExp2)) return;
    const breath = 0.5 + 0.5 * Math.sin(elapsed * 0.23);
    scene.fog.density = 0.00525 + breath * 0.00035;
    scene.fog.color.lerpColors(fogBase, fogSoulTint, breath * 0.18);
  });

  // The Heartvale threshold is not a door: it is the vertical skin of the
  // Soulwell above. Keep this runtime layer traversable and translucent so the
  // outdoor terrain remains visible through the downward-flowing water. Its
  // dimensions, arch mask, flow phases, and normal displacement mirror the
  // isolated Houdini FX POC in build-soulwell-exit-water-poc.py.
  const exitWaterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x123c49) },
      uSoul: { value: new THREE.Color(0x69d7d5) },
      uShimmer: { value: new THREE.Color(0xd9fff4) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vUv = uv;
        vec3 displaced = position;
        float edge = smoothstep(0.0, 0.13, uv.x) * smoothstep(0.0, 0.13, 1.0 - uv.x);
        vRipple = sin(uv.y * 22.0 - uTime * 2.8 + sin(uv.x * 11.0) * 1.8);
        displaced.z += vRipple * 0.055 * edge;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uSoul;
      uniform vec3 uShimmer;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vec2 p = vUv;
        float halfWidth = 0.205;
        float shoulderY = 0.58;
        float body = (1.0 - step(halfWidth, abs(p.x - 0.5))) * (1.0 - step(shoulderY, p.y));
        vec2 archPoint = vec2((p.x - 0.5) / halfWidth, (p.y - shoulderY) / 0.28);
        float crown = (1.0 - step(1.0, length(archPoint))) * step(shoulderY, p.y);
        float archMask = max(body, crown);
        if (archMask < 0.5) discard;
        float fallA = sin(p.x * 18.0 + p.y * 7.0 + uTime * 1.4) * 0.5 + 0.5;
        float fallB = sin(p.x * 31.0 - p.y * 13.0 - uTime * 2.1) * 0.5 + 0.5;
        float verticalFlow = sin((p.y + fallA * 0.045) * 52.0 + uTime * 5.2) * 0.5 + 0.5;
        float caustic = pow(max(0.0, fallA + fallB + verticalFlow * 0.45 - 1.42), 2.4);
        float fallingStreak = pow(0.5 + 0.5 * sin(
          p.x * 93.0 + sin(p.y * 19.0 - uTime * 3.1) * 2.8 - uTime * 5.7
        ), 17.0);
        float crossingStreak = pow(0.5 + 0.5 * sin(
          p.x * 51.0 - p.y * 14.0 + uTime * 3.4
        ), 15.0);
        float rippleLine = pow(0.5 + 0.5 * sin(
          p.y * 84.0 + sin(p.x * 21.0) * 2.2 + uTime * 7.2
        ), 18.0);
        float sheetShimmer = max(fallingStreak * 0.74, crossingStreak * 0.18)
          + rippleLine * 0.10;
        float edge = 1.0 - smoothstep(0.34, 0.5, abs(p.x - 0.5));
        float baseMix = 0.3 + fallA * 0.18 + (vRipple * 0.5 + 0.5) * 0.08;
        vec3 color = mix(uDeep, uSoul, baseMix);
        color = mix(color, uShimmer, min(0.72, caustic * 0.38 + sheetShimmer * 0.54));
        float alpha = 0.30 + caustic * 0.12 + sheetShimmer * 0.22 + edge * 0.06;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const exitWater = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4, 32, 24), exitWaterMaterial);
  exitWater.name = "heartvale-soulwell-water-threshold";
  exitWater.position.set(lm.exitPoint.x + 0.6, 1.7, lm.exitPoint.z);
  exitWater.rotation.y = -Math.PI / 2;
  exitWater.renderOrder = 5;
  exitWater.userData = {
    vfxKind: "soulwell-water-threshold",
    collisionMode: "traversable",
    sourceLane: "HOUDINI_APPRENTICE_POC_RUNTIME_SHADER",
    houdiniProductionStatus: "POC_VALIDATED_NONCOMMERCIAL",
  };
  group.add(exitWater);
  tickables.push((elapsed) => { exitWaterMaterial.uniforms.uTime!.value = elapsed; });

  // Landmark builders use local floor-relative Y values. Lift each authored
  // assembly once after construction so animated children retain local motion.
  for (const child of group.children) {
    child.position.y += floorElevationAt(layout, child.position.x, child.position.z);
  }

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
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xc9b78f, roughness: 0.92 });
  const bookCoverMats = [0x4d211d, 0x233a32, 0x2b3154, 0x5b4421].map((color) => (
    new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0.02 })
  ));

  for (const p of layout.placements) {
    if (p.role === "wall-art") {
      const w = p.width ?? 1.6;
      const h = p.height ?? w * 0.7;
      const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
      const yaw = Math.atan2(nx, nz);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), frameMat);
      frame.position.set(p.x, p.floorElevation + 1.65, p.z);
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
      art.position.set(p.x + nx * 0.07, p.floorElevation + 1.65, p.z + nz * 0.07);
      art.rotation.y = yaw;
      group.add(art);
    } else if (p.role === "readable-props") {
      const pile = new THREE.Group();
      pile.name = `readable-${p.asset}`;
      pile.position.set(p.x, p.elevation ?? 0, p.z);
      pile.rotation.y = THREE.MathUtils.degToRad(p.yaw);
      if (p.asset === "scrolls-pile") {
        for (let index = 0; index < 3; index += 1) {
          const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.46 + index * 0.05, 10), paperMat);
          scroll.position.set((index - 1) * 0.15, 0.09 + index * 0.035, (index % 2) * 0.09);
          scroll.rotation.z = Math.PI / 2;
          scroll.rotation.y = index * 0.22;
          scroll.castShadow = true;
          pile.add(scroll);
        }
      } else {
        const dimensions = [[0.54, 0.09, 0.36], [0.48, 0.1, 0.34], [0.5, 0.085, 0.32]] as const;
        let y = 0;
        for (const [index, [w, h, d]] of dimensions.entries()) {
          const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bookCoverMats[index % bookCoverMats.length]);
          cover.position.set((index - 1) * 0.025, y + h / 2, index % 2 === 0 ? 0.01 : -0.015);
          cover.rotation.y = (index - 1) * 0.08;
          cover.castShadow = true;
          const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.62, d * 0.93), paperMat);
          pages.position.copy(cover.position);
          pages.rotation.copy(cover.rotation);
          pages.castShadow = true;
          pile.add(cover, pages);
          y += h + 0.012;
        }
      }
      group.add(pile);
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
      strip.position.set(cx, floorElevationAt(layout, cx, cz) + 0.06, cz);
      group.add(strip);
    }
  }
}

// ---------------------------------------------------------------------------
// lights + cameras + HUD + hooks
// ---------------------------------------------------------------------------
function setupLights(scene: THREE.Scene, layout: BreachV2Layout): void {
  // readable base layer — darkness never blocks navigation or readability
  scene.add(new THREE.HemisphereLight(0x526177, 0x342b20, 1.65));
  scene.add(new THREE.AmbientLight(0x404752, 1.15));
  // cool "breach light" from the east so far walls never fall to black
  const breachGlow = new THREE.DirectionalLight(0x667b94, 0.8);
  breachGlow.position.set(260, 40, 10);
  scene.add(breachGlow);
  // Shadow discipline: only the two landmark lights cast (each shadow-casting
  // point light adds a cube shadow pass AND one shader texture unit per light —
  // uncapped shadows exceed MAX_TEXTURE_IMAGE_UNITS and explode the frame cost).
  const SHADOW_LIGHTS = new Set(["boss-ember"]);
  for (const spec of layout.lights) {
    // Each authored fire fixture already owns its local point light. Creating
    // the registry light again doubled the per-fragment lighting cost. The
    // Soul Well owns a tuned animated key/bounce pair in buildLandmarks.
    if (spec.id.startsWith("fire-") || spec.id === "exit-daylight" || spec.id === "soul-well-glow") continue;
    const light = new THREE.PointLight(new THREE.Color(spec.color), spec.intensity * 14, spec.radius * 2.4, 1.5);
    light.position.set(spec.x, spec.y, spec.z);
    light.castShadow = spec.castsShadow && SHADOW_LIGHTS.has(spec.id);
    if (light.castShadow) {
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.01;
    }
    scene.add(light);
  }
  // trial-door accents: cyan over Wayfarer, ember over Oathbreaker
  for (const [lm, color] of [[layout.landmarks.doorWayfarer, 0x46d9e8], [layout.landmarks.doorOathbreaker, 0xe86a3c]] as const) {
    const doorLight = new THREE.PointLight(color, 8, 9, 1.6);
    doorLight.position.set(lm.x - 1.2, lm.elevation + 2.6, lm.z);
    scene.add(doorLight);
  }
  const vestibuleExitLight = new THREE.PointLight(0xffa35c, 10, 11, 1.65);
  vestibuleExitLight.name = "vestibule-exit-read-light";
  vestibuleExitLight.position.set(27.2, floorElevationAt(layout, 27.2, 11) + 2.35, 11);
  scene.add(vestibuleExitLight);
  // the "first outdoor moment": daylight spilling west into the Way Upward
  const exitSpec = layout.lights.find((l) => l.id === "exit-daylight");
  if (exitSpec) {
    const day = new THREE.SpotLight(0xd7e7c7, 10, 34, Math.PI / 3.0, 0.6, 1.25);
    day.name = "heartvale-threshold-daylight";
    day.position.set(exitSpec.x + 4, exitSpec.y + 0.4, exitSpec.z);
    day.target.position.set(exitSpec.x - 12, floorElevationAt(layout, exitSpec.x - 12, exitSpec.z) + 1.0, exitSpec.z);
    scene.add(day, day.target);
  }
  // wall-map accent lights so the readable art reads (§5A) — maps brightest
  for (const p of layout.placements) {
    if (p.role !== "wall-art") continue;
    const isMap = ["art-thalenyr-atlas", "art-heartvale-section", "art-breach-v2-flatmap"].includes(p.asset);
    if (!isMap) continue;
    const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
    const artLight = new THREE.PointLight(0xfff0d8, isMap ? 3.4 : 1.6, isMap ? 7 : 5, 1.7);
    artLight.position.set(p.x + nx * 1.2, p.floorElevation + 2.5, p.z + nz * 1.2);
    scene.add(artLight);
  }
}

interface CameraPreset { target: [number, number, number]; offset: [number, number, number] }

function cameraPresets(layout: BreachV2Layout): Record<string, CameraPreset> {
  const lm = layout.landmarks;
  const firstChamber = layout.rooms.find((r) => !r.fixed) ?? layout.rooms[0]!;
  return {
    vestibule: { target: [lm.soulWell.x, lm.soulWell.elevation + 0.8, lm.soulWell.z], offset: [10.5, 6.2, 9.0] },
    isometric: { target: [lm.playerStart.x, lm.playerStart.elevation + 0.8, lm.playerStart.z], offset: [10.5, 12.5, 10.5] },
    plaza: { target: [lm.doorWayfarer.x - 4, lm.doorWayfarer.elevation + 1.2, lm.doorWayfarer.z + 3.5], offset: [-9, 3.4, 0.5] },
    gallery: {
      target: [firstChamber.x + firstChamber.w / 2, firstChamber.floorElevation + 1.0, firstChamber.z + firstChamber.h / 2],
      offset: [-6.5, 4.4, -5.0],
    },
    boss: { target: [layout.boss.x, layout.boss.elevation + 1.2, layout.boss.z], offset: [-9.5, 5.4, -6.5] },
    exit: { target: [lm.exitPoint.x - 2, lm.exitPoint.elevation + 1.4, lm.exitPoint.z], offset: [-10.5, 3.2, 0.2] },
    overview: { target: [130, 4, 12], offset: [0, 165, -46] },
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
  const runId = `breach-v2:${options.seed}:${options.path}`;
  const previewUrl = new URL(window.location.href);
  // The preview is a production-zone test harness: active-route doors are
  // unlocked by default so reviewers can traverse every section. Add
  // `gates=on` only when explicitly validating the campaign progression locks.
  const progressionGatesEnabled = previewUrl.searchParams.get("gates") === "on";
  if (previewUrl.searchParams.get("fresh") === "1") {
    await storyDatabase.clearDungeonRun(runId);
    previewUrl.searchParams.delete("fresh");
    window.history.replaceState(null, "", previewUrl);
  }
  const savedState = await storyDatabase.loadDungeonRun<BreachV2RunState>(runId);
  const gameplay = createBreachV2RunController({
    seed: options.seed,
    path: options.path,
    chamberIds: layout.rooms.filter((room) => !room.fixed).map((room) => room.id),
    rewardId: layout.rewardId,
    bossHp: layout.boss.maxHp,
    savedState,
    onChange: (state) => {
      void storyDatabase.saveDungeonRun(runId, state).catch((error: unknown) => {
        console.error("unable to persist BREACH-V2 run", error);
      });
    },
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarsePointer ? 1 : 1.25));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  const propPlacement = await placeKitProps(scene, layout, gltfLoader);
  const sectionDoors = await placeSectionDoors(
    scene,
    layout,
    gltfLoader,
    (doorId) => !progressionGatesEnabled || gameplay.requestDoor(doorId).allowed,
  );
  const landmarkTickables = buildLandmarks(scene, layout);
  buildWallArtAndBooks(scene, layout, texLoader);
  buildCorruption(scene, layout);
  setupLights(scene, layout);

  const presets = cameraPresets(layout);

  // ---- walk mode: WASD on the hidden nav grid (collision from the generator's
  // own walkable cells — the same data the invariant suite proves reachable)
  const firstPersonMode = options.cam === "firstperson";
  const isometricMode = options.cam === "isometric";
  const walkMode = options.cam === "walk" || firstPersonMode || isometricMode;
  const genData = generateBreachV2(options.seed, options.path);
  const walkable = new Set(genData.navCells.map(breachV2CellKey));
  for (const cell of genData.blockedCells) walkable.delete(breachV2CellKey(cell));
  const NAV = layout.meta.navCell;
  const isWalkable = (x: number, z: number): boolean => {
    const r = 0.35; // player radius
    if (sectionDoors.isBlocked(x, z, r)) return false;
    for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]] as const) {
      if (!hasDungeonFloorAt(layout, x + ox, z + oz)) return false;
      if (!walkable.has(`${Math.floor((x + ox) / NAV)},${Math.floor((z + oz) / NAV)}`)) return false;
    }
    return true;
  };
  const requestedStart = new URL(window.location.href).searchParams.get("start");
  const requestedRoom = requestedStart
    ? layout.rooms.find((room) => room.id === requestedStart || ("poolRoomId" in room && room.poolRoomId === requestedStart))
    : null;
  const isSpawnClear = (x: number, z: number): boolean => layout.placements.every((placement) => {
    if (placement.placement !== "floor") return true;
    const clearance = (placement.footprint ?? 0.8) / 2 + 0.55;
    return Math.hypot(x - placement.x, z - placement.z) >= clearance;
  });
  const nearestWalkable = (x: number, z: number, requirePropClear = false): [number, number] => {
    const valid = (candidateX: number, candidateZ: number): boolean => (
      isWalkable(candidateX, candidateZ)
      && (!requirePropClear || isSpawnClear(candidateX, candidateZ))
    );
    if (valid(x, z)) return [x, z];
    for (let radius = NAV; radius <= NAV * 5; radius += NAV) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const candidateX = x + Math.cos(angle) * radius;
        const candidateZ = z + Math.sin(angle) * radius;
        if (valid(candidateX, candidateZ)) return [candidateX, candidateZ];
      }
    }
    return [layout.landmarks.playerStart.x, layout.landmarks.playerStart.z];
  };
  const requestedPosition = requestedRoom && requestedRoom.id !== "vestibule"
    ? nearestWalkable(requestedRoom.x + requestedRoom.w / 2, requestedRoom.z + requestedRoom.h / 2, true)
    : nearestWalkable(layout.landmarks.playerStart.x, layout.landmarks.playerStart.z);
  const playerPos = new THREE.Vector3(
    requestedPosition[0],
    floorElevationAt(layout, requestedPosition[0], requestedPosition[1]),
    requestedPosition[1],
  );
  const setPlayerPosition = (x: number, z: number): void => {
    playerPos.set(x, floorElevationAt(layout, x, z), z);
  };
  const gameplayUi = setupBreachV2GameplayUi({
    container,
    layout,
    controller: gameplay,
    getPlayerPosition: () => playerPos,
  });
  let camYaw = isometricMode ? Math.PI / 4 : 0.08;
  let camPitch = isometricMode ? 0.76 : 0.24;
  let camDist = firstPersonMode ? 0 : isometricMode ? 14.5 : 4.4;
  const keys = new Set<string>();
  const clickPath: THREE.Vector3[] = [];
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
    player.visible = !firstPersonMode;
    scene.add(player);
    player.position.set(playerPos.x, playerPos.y + 0.85, playerPos.z);
    let dragging = false;
    let pointerTravel = 0;
    const pointerRaycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const pickWalkPoint = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      pointerRaycaster.setFromCamera(pointerNdc, camera);
      return pointerRaycaster.intersectObject(shellGroup, true)
        .find((intersection) => intersection.object.name === "shell-floors")?.point.clone() ?? null;
    };
    const setClickDestination = (point: THREE.Vector3): void => {
      const [targetX, targetZ] = nearestWalkable(point.x, point.z);
      const startCell = { x: Math.floor(playerPos.x / NAV), y: Math.floor(playerPos.z / NAV) };
      const targetCell = { x: Math.floor(targetX / NAV), y: Math.floor(targetZ / NAV) };
      const cells = findPath(startCell, targetCell, (cell) => isWalkable((cell.x + 0.5) * NAV, (cell.y + 0.5) * NAV));
      clickPath.splice(0, clickPath.length, ...cells.map((cell) => (
        new THREE.Vector3(
          (cell.x + 0.5) * NAV,
          floorElevationAt(layout, (cell.x + 0.5) * NAV, (cell.y + 0.5) * NAV),
          (cell.y + 0.5) * NAV,
        )
      )));
    };
    renderer.domElement.addEventListener("pointerdown", (e) => {
      dragging = true;
      pointerTravel = 0;
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener("pointerup", (e) => {
      if (pointerTravel < 8) {
        const target = pickWalkPoint(e.clientX, e.clientY);
        const toggledDoor = target
          ? sectionDoors.toggleAt(playerPos.x, playerPos.z, target.x, target.z)
          : null;
        if (!toggledDoor && target) setClickDestination(target);
      }
      dragging = false;
    });
    renderer.domElement.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      pointerTravel += Math.abs(e.movementX) + Math.abs(e.movementY);
      camYaw -= e.movementX * 0.0052;
      const maxPitch = isometricMode ? 1.08 : 0.58;
      camPitch = Math.min(maxPitch, Math.max(-0.18, camPitch + e.movementY * 0.004));
    });
    renderer.domElement.addEventListener("wheel", (e) => {
      if (!firstPersonMode) {
        const maxDistance = isometricMode ? 22 : 8;
        camDist = Math.min(maxDistance, Math.max(2.4, camDist + e.deltaY * 0.008));
      }
    }, { passive: true });
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (e.code === "KeyF" && !e.repeat) sectionDoors.toggleNearest(playerPos.x, playerPos.z);
      if (e.code === "KeyR" && !e.repeat) gameplayUi.interactNearest();
      if (e.code === "Digit1" && !e.repeat) gameplay.attack();
      if (e.code === "Digit2" && !e.repeat) gameplay.guard();
      if (e.code === "Digit3" && !e.repeat) gameplay.recover();
    });
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
  hooks.__dungeonPlayer = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
  hooks.__dungeonWalkTo = (x, z) => {
    if (!walkMode || !isWalkable(x, z)) return false;
    setPlayerPosition(x, z);
    return true;
  };
  hooks.__dungeonSetDoorsOpen = (open) => sectionDoors.setAllOpen(open);
  hooks.__dungeonKeys = keys; // probe visibility
  hooks.__dungeonGameplay = {
    snapshot: () => gameplay.snapshot(),
    objective: () => gameplay.objective(),
    interact: (targetId) => gameplay.interact(targetId),
    enterRoom: (roomId) => gameplay.enterRoom(roomId),
    attack: () => gameplay.attack(),
    guard: () => gameplay.guard(),
    recover: () => gameplay.recover(),
    restartEncounter: () => gameplay.restartEncounter(),
    setCombatStyle: (style) => gameplay.setCombatStyle(style),
    requestDoor: (doorId) => gameplay.requestDoor(doorId).allowed,
  };

  const warp = (x: number, z: number): boolean => {
    const [walkX, walkZ] = nearestWalkable(x, z, true);
    if (walkMode) {
      setPlayerPosition(walkX, walkZ);
      return true;
    }
    // The dev panel handles a false result by reloading this destination in
    // walk mode. Moving only an orbit camera left no avatar to continue with.
    return false;
  };
  setupBreachV2DevPanel({
    container,
    layout,
    seed: options.seed,
    path: options.path,
    cam: options.cam,
    warp,
    setAllDoorsOpen: (open) => sectionDoors.setAllOpen(open),
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  const cameraRaycaster = new THREE.Raycaster();
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsText = "…";
  const tickables = [...propPlacement.tickables, ...sectionDoors.tickables, ...landmarkTickables];
  const detailCullables: THREE.Object3D[] = [
    ...propPlacement.cullables,
    ...sectionDoors.cullables,
  ];
  for (const groupName of [
    "breach-v2-architectural-polish",
    "breach-v2-landmarks",
    "breach-v2-wall-art",
    "breach-v2-corruption",
  ]) {
    const group = scene.getObjectByName(groupName);
    if (group) detailCullables.push(...group.children);
  }
  const detailBaseVisibility = new Map(detailCullables.map((object) => [object, object.visible]));
  const cullOrigin = new THREE.Vector3();
  const cullObjectPosition = new THREE.Vector3();
  const updateDetailVisibility = (): void => {
    if (options.cam === "overview") {
      detailCullables.forEach((object) => { object.visible = false; });
      return;
    }
    if (walkMode) cullOrigin.copy(playerPos);
    else cullOrigin.set(controls.target.x, 0, controls.target.z);
    const radius = isometricMode ? 44 : 38;
    const radiusSq = radius * radius;
    detailCullables.forEach((object) => {
      object.getWorldPosition(cullObjectPosition);
      const dx = cullObjectPosition.x - cullOrigin.x;
      const dz = cullObjectPosition.z - cullOrigin.z;
      object.visible = detailBaseVisibility.get(object) !== false && dx * dx + dz * dz <= radiusSq;
    });
  };
  updateDetailVisibility();
  let cullFrames = 0;
  const targetFrameMs = 1000 / (coarsePointer ? 30 : 45);
  let lastFrameMs = -targetFrameMs;

  renderer.setAnimationLoop((frameMs) => {
    if (frameMs - lastFrameMs < targetFrameMs) return;
    lastFrameMs = frameMs;
    try {
      timer.update(frameMs);
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();
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
        // A thin portal must never be skipped by one long low-FPS movement
        // sample. The cap stays above normal 45 fps travel but below the
        // closed-door collision band, so keyboard and click travel remain
        // governed by the same runtime walkability predicate.
        const step = Math.min((run ? 6.2 : 3.2) * delta, 0.28);
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
          clickPath.length = 0;
          const move = fwd.multiplyScalar(mz).add(right.multiplyScalar(mx));
          move.normalize().multiplyScalar(step);
          const nx = playerPos.x + move.x;
          const nz = playerPos.z + move.z;
          if (isWalkable(nx, nz)) {
            setPlayerPosition(nx, nz);
          } else if (isWalkable(nx, playerPos.z)) {
            setPlayerPosition(nx, playerPos.z); // slide along walls
          } else if (isWalkable(playerPos.x, nz)) {
            setPlayerPosition(playerPos.x, nz);
          }
          player.rotation.y = Math.atan2(move.x, move.z);
        } else if (clickPath.length > 0) {
          const target = clickPath[0]!;
          const dx = target.x - playerPos.x;
          const dz = target.z - playerPos.z;
          const distance = Math.hypot(dx, dz);
          const nextX = distance <= step ? target.x : playerPos.x + (dx / distance) * step;
          const nextZ = distance <= step ? target.z : playerPos.z + (dz / distance) * step;
          if (isWalkable(nextX, nextZ)) {
            setPlayerPosition(nextX, nextZ);
            if (distance <= step) clickPath.shift();
          } else {
            // Door state may have changed after the path was planned. Never let
            // click movement coast through a newly closed portal.
            clickPath.length = 0;
          }
          player.rotation.y = Math.atan2(dx, dz);
        }
        player.position.set(playerPos.x, playerPos.y + 0.85, playerPos.z);
        if (firstPersonMode) {
          camera.position.set(playerPos.x, playerPos.y + 1.62, playerPos.z);
          cameraTarget.set(
            playerPos.x - Math.sin(camYaw) * Math.cos(camPitch),
            playerPos.y + 1.62 - Math.sin(camPitch),
            playerPos.z - Math.cos(camYaw) * Math.cos(camPitch),
          );
          camera.lookAt(cameraTarget);
        } else {
          const cp = Math.cos(camPitch);
          desiredCamera.set(
            playerPos.x + Math.sin(camYaw) * camDist * cp,
            playerPos.y + 1.4 + Math.sin(camPitch) * camDist,
            playerPos.z + Math.cos(camYaw) * camDist * cp,
          );
          cameraTarget.set(playerPos.x, playerPos.y + 1.4, playerPos.z);
          if (isometricMode) {
            camera.position.copy(desiredCamera);
          } else {
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
          }
          camera.lookAt(cameraTarget);
        }
        hooks.__dungeonPlayer.x = playerPos.x;
        hooks.__dungeonPlayer.y = playerPos.y;
        hooks.__dungeonPlayer.z = playerPos.z;
      } else {
        controls.update();
      }
      const currentRoom = layout.rooms.find((room) => (
        playerPos.x >= room.x
        && playerPos.x <= room.x + room.w
        && playerPos.z >= room.z
        && playerPos.z <= room.z + room.h
      ));
      if (currentRoom) gameplay.enterRoom(currentRoom.id);
      gameplay.tick(delta * 1000);
      gameplayUi.update();
      cullFrames += 1;
      if (cullFrames % 8 === 0) updateDetailVisibility();
      // ceiling cutaway: caps read as ceilings at eye level (walk mode or a
      // camera inside the room) and step aside for raised orbit review cameras.
      // The walk camera is clamped below the cap so looking up always reveals
      // authored dungeon ceiling instead of the outdoor void.
      if (ceilings) ceilings.visible = walkMode && !isometricMode;
      renderer.render(scene, camera);
      hooks.__dungeonFrames += 1;
      hooks.__dungeonStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
      hud.textContent =
        `breach-v2 preview  seed ${options.seed}  path ${options.path}  ${progressionGatesEnabled ? "CAMPAIGN GATES" : "TEST UNLOCKED"}  ${walkMode ? `${firstPersonMode ? "FIRST PERSON" : isometricMode ? "ISOMETRIC" : "THIRD PERSON"} — click floor or WASD move · F/tap door · drag camera · wheel zoom · Q/E rotate · shift sprint` : `cam ${options.cam}`}  ${fpsText}\n` +
        `chambers ${layout.meta.chamberCount} (${layout.rooms.filter((r) => !r.fixed).map((r) => ("poolRoomId" in r ? r.poolRoomId : r.id)).join(", ")})  ` +
        `boss ${layout.boss.pattern}${walkMode ? `  ·  at (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}↑, ${playerPos.z.toFixed(1)})` : ""}\n` +
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
