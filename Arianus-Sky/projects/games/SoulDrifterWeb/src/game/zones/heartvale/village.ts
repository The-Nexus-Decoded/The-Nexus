/**
 * Heartvale zone preview — Anwel village + soulwell terrace dressing (T4).
 *
 * Houses are parametric from village.json: stone foundation course,
 * plaster walls with timber corner posts and gable framing, overhanging
 * eaves, thatch/slate roofs with per-house tint, chimneys, framed doors
 * and shuttered windows that catch light. Plus the windlass well, dock
 * planks, fenced gardens, Poly Haven prop dressing, and placeholder NPC
 * scale figures (tracked placeholder — see session handoff).
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LayoutData, NpcData, TerrainField, VillageData, VillageHouse } from "./data";

const TEX_ROOT = "/assets/zones/heartvale/textures/buildings";
const MODEL_ROOT = "/assets/zones/heartvale/models";

function tiled(loader: THREE.TextureLoader, url: string, rx: number, ry: number, srgb = true): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function boxUV(geometry: THREE.BoxGeometry, sx: number, sy: number): void {
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  }
  uv.needsUpdate = true;
}

interface VillageMaterials {
  plaster: (w: number, h: number, wash: [number, number, number]) => THREE.MeshStandardMaterial;
  plankWall: (w: number, h: number, tint: [number, number, number]) => THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  thatch: (tint: [number, number, number]) => THREE.MeshStandardMaterial;
  slate: (tint: [number, number, number]) => THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  mud: THREE.MeshStandardMaterial;
}

function makeMaterials(): VillageMaterials {
  const loader = new THREE.TextureLoader();
  // Full PBR per the Quality Bible §1.2 — diffuse + normal + roughness on
  // every building surface (the promoted Poly Haven sets carry all three).
  const pbr = (set: string, rx: number, ry: number) => ({
    map: tiled(loader, `${TEX_ROOT}/${set}/${set}_diff_1k.jpg`, rx, ry),
    normalMap: tiled(loader, `${TEX_ROOT}/${set}/${set}_nor_gl_1k.jpg`, rx, ry, false),
    roughnessMap: tiled(loader, `${TEX_ROOT}/${set}/${set}_rough_1k.jpg`, rx, ry, false),
  });
  const timberMaps = pbr("wood_planks", 1, 1);
  const timber = new THREE.MeshStandardMaterial({ ...timberMaps, roughness: 0.9 });
  const stoneMaps = pbr("mossy_stone_wall", 1.6, 0.5);
  const stone = new THREE.MeshStandardMaterial({ ...stoneMaps, roughness: 0.95 });
  const cobbleMaps = pbr("mossy_cobblestone", 6, 6);
  const cobble = new THREE.MeshStandardMaterial({ ...cobbleMaps, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ ...pbr("wood_planks", 1, 1), roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 1.0 });
  const mudMaps = pbr("brown_mud", 4, 4);
  const mud = new THREE.MeshStandardMaterial({ ...mudMaps, roughness: 1.0 });
  return {
    plaster: (w, h, wash) =>
      new THREE.MeshStandardMaterial({
        ...pbr("plastered_wall", w / 3.2, h / 3.2),
        color: new THREE.Color(wash[0], wash[1], wash[2]),
        roughness: 0.92,
      }),
    // Log/plank-course walls for cottages/barn (medieval construction language).
    plankWall: (w, h, tint) =>
      new THREE.MeshStandardMaterial({
        ...pbr("wood_planks", w / 2.6, h / 2.6),
        color: new THREE.Color(tint[0], tint[1], tint[2]),
        roughness: 0.9,
      }),
    timber,
    thatch: (tint) =>
      new THREE.MeshStandardMaterial({
        ...pbr("thatch_roof_angled", 2.4, 1.6),
        color: new THREE.Color(tint[0] * 1.06, tint[1] * 0.88, tint[2] * 0.55), // golden straw
        roughness: 1.0,
      }),
    slate: (tint) =>
      new THREE.MeshStandardMaterial({
        ...pbr("roof_slates_02", 2.6, 1.8),
        color: new THREE.Color(tint[0] * 0.6, tint[1] * 0.64, tint[2] * 0.7), // weathered blue-grey
        roughness: 0.8,
      }),
    stone,
    cobble,
    wood,
    dark,
    mud,
  };
}

function addBox(
  parent: THREE.Group,
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  uvScale = true,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  if (uvScale) boxUV(geometry, Math.max(w, d) / 2.5, h / 2.5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Gabled roof prism with eaves overhang, ridge along local X.
 * Slopes get the roof material; gable ends get wall plaster (with the timber
 * framing already on the wall beneath); the underside gets plain timber. */
function roofPrism(
  material: THREE.Material,
  w: number,
  d: number,
  rise: number,
  overhang: number,
  gableMaterial?: THREE.Material,
  undersideMaterial?: THREE.Material,
): THREE.Mesh {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const y0 = -0.02;
  const positions = new Float32Array([
    // slope north (-z side) — faces up-north (winding fixed: was inverted and
    // backface-culled, so this slope was invisible from street level)
    -hw, y0, -hd, hw, rise, 0, hw, y0, -hd,
    -hw, y0, -hd, -hw, rise, 0, hw, rise, 0,
    // slope south (+z side) — faces up-south
    -hw, y0, hd, hw, y0, hd, hw, rise, 0,
    -hw, y0, hd, hw, rise, 0, -hw, rise, 0,
    // gable west (-x) — wound so the face looks OUTWARD (−x)
    -hw, y0, -hd, -hw, y0, hd, -hw, rise, 0,
    // gable east (+x) — outward (+x)
    hw, y0, -hd, hw, rise, 0, hw, y0, hd,
    // underside (closes eaves from below) — faces DOWN
    -hw, y0, -hd, hw, y0, hd, -hw, y0, hd,
    -hw, y0, -hd, hw, y0, -hd, hw, y0, hd,
  ]);
  const uvs = new Float32Array([
    0, 0, w / 1.6, d / 1.6, w / 1.6, 0, 0, 0, 0, d / 1.6, w / 1.6, d / 1.6,
    0, 0, w / 1.6, 0, w / 1.6, d / 1.6, 0, 0, w / 1.6, d / 1.6, 0, d / 1.6,
    0, 0, 0, 1, 1, 0,
    0, 0, 1, 0, 0, 1,
    0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  // Face groups: verts 0-11 slopes (4 tris), 12-17 gables (2 tris),
  // 18-23 underside (2 tris — NOT 4; the overrun drew garbage = "roof holes").
  let mesh: THREE.Mesh;
  if (gableMaterial || undersideMaterial) {
    geometry.addGroup(0, 12, 0); // slopes
    geometry.addGroup(12, 6, 1); // gables
    geometry.addGroup(18, 6, 2); // underside
    mesh = new THREE.Mesh(geometry, [material, gableMaterial ?? material, undersideMaterial ?? material]);
  } else {
    mesh = new THREE.Mesh(geometry, material);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildHouse(house: VillageHouse, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = `house-${house.name}`;
  const { w, d, h } = house;
  const baseY = field.height(house.x, house.z);
  const rise = Math.min(1.4, Math.max(0.9, Math.min(w, d) * 0.32));
  const overhang = 0.28;

  // Foundation course — stone, slightly proud of the walls.
  addBox(g, mats.stone, w + 0.18, 0.42, d + 0.18, 0, 0.21, 0);
  // Dirt/weathering skirt at the wall base (Quality Bible §1.3 completeness).
  addBox(g, mats.mud, w + 0.1, 0.3, d + 0.1, 0, 0.5, 0);
  // Walls: plaster+timber for civic/shop buildings, log-plank courses for
  // cottages and the barn (reviewer: no plain stucco boxes everywhere).
  const isTimberBuilt = house.kind === "cottage" || house.kind === "barn";
  const wallMat = isTimberBuilt
    ? mats.plankWall(w, h, house.wash.map((c) => c * 0.55) as [number, number, number])
    : mats.plaster(w, h, house.wash);
  addBox(g, wallMat, w, h, d, 0, 0.42 + h / 2, 0);

  const wallTop = 0.42 + h;
  const timber = mats.timber;

  // Corner posts.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, timber, 0.14, h, 0.14, sx * (w / 2 - 0.02), 0.42 + h / 2, sz * (d / 2 - 0.02), false);
    }
  }
  // Top/bottom wall plates.
  addBox(g, timber, w + 0.06, 0.12, d + 0.06, 0, wallTop - 0.06, 0, false);
  addBox(g, timber, w + 0.06, 0.1, d + 0.06, 0, 0.47, 0, false);
  // Mid rail on the long faces.
  addBox(g, timber, w + 0.04, 0.09, 0.09, 0, 0.42 + h * 0.55, d / 2 + 0.01, false);
  addBox(g, timber, w + 0.04, 0.09, 0.09, 0, 0.42 + h * 0.55, -d / 2 - 0.01, false);

  // Gable-end timber: an A-frame of battens lying flat ON the gable plaster
  // face (never diagonal posts in the air — those spiked through the roof).
  for (const sx of [-1, 1]) {
    const gx = sx * (w / 2 + overhang + 0.02);
    // vertical king post
    addBox(g, timber, 0.07, rise * 0.92, 0.07, gx, wallTop + rise * 0.46, 0, false);
    // diagonal struts along the gable slope, pressed against the face
    for (const sz of [-1, 1]) {
      const run = (d / 2 + overhang) * 0.92;
      const strutLen = Math.hypot(run, rise) * 0.96;
      const strut = addBox(g, timber, 0.06, strutLen, 0.06, gx, wallTop + rise / 2, sz * run / 2, false);
      strut.rotation.x = -sz * Math.atan2(run, rise); // long axis along the slope (YZ plane)
    }
  }

  // Roof: slopes in thatch/slate, gable triangles in plaster, eave undersides
  // in dark timber.
  const roofMat = house.roof === "slate" ? mats.slate(house.roofTint) : mats.thatch(house.roofTint);
  const gableMat = mats.plaster(w, rise, house.wash);
  const roof = roofPrism(roofMat, w, d, rise, overhang, gableMat, mats.timber);
  roof.position.y = wallTop;
  g.add(roof);
  // Ridge cap (rounded beam over the ridge line) + eave shadow lines so the
  // roof reads as thatch/slate construction, not a flat cap (#452 review).
  const ridgeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, w + overhang * 2 + 0.2, 8), roofMat);
  ridgeCap.rotation.z = Math.PI / 2;
  ridgeCap.position.set(0, wallTop + rise + 0.02, 0);
  ridgeCap.castShadow = true;
  g.add(ridgeCap);
  for (const sz of [-1, 1]) {
    addBox(g, mats.dark, w + overhang * 2, 0.06, 0.08, 0, wallTop - 0.02, sz * (d / 2 + overhang - 0.1), false);
  }
  // Ridge beam below the cap.
  addBox(g, timber, w + overhang * 2 + 0.1, 0.09, 0.12, 0, wallTop + rise - 0.06, 0, false);

  // Door on the street face (+z), framed and slightly proud, with stone
  // steps down to ground so players can actually walk in (#452).
  const doorX = w * 0.18;
  addBox(g, mats.wood, 0.9, 1.9, 0.08, doorX, 0.42 + 0.95, d / 2 + 0.03, false);
  addBox(g, timber, 1.1, 0.12, 0.1, doorX, 0.42 + 1.95, d / 2 + 0.03, false);
  for (const sx of [-1, 1]) {
    addBox(g, timber, 0.1, 1.9, 0.1, doorX + sx * 0.5, 0.42 + 0.95, d / 2 + 0.03, false);
  }
  // Lintel shadow line above door.
  addBox(g, mats.dark, 1.0, 0.06, 0.06, doorX, 0.42 + 2.02, d / 2 + 0.02, false);
  // Stone steps: two treads descending from the threshold.
  addBox(g, mats.stone, 1.2, 0.16, 0.4, doorX, 0.42 - 0.08, d / 2 + 0.24, false);
  addBox(g, mats.stone, 1.3, 0.14, 0.42, doorX, 0.42 - 0.24, d / 2 + 0.52, false);

  // Windows: recessed dark pane + FULL timber frame (jambs close the gaps,
  // #452) + sill + shutters that catch light.
  const windowXs = [-w * 0.26, w * 0.38];
  for (const wx of windowXs) {
    if (Math.abs(wx) > w / 2 - 0.5) continue;
    const wy = 0.42 + h * 0.62;
    addBox(g, mats.dark, 0.62, 0.7, 0.05, wx, wy, d / 2 + 0.015, false);
    addBox(g, timber, 0.74, 0.08, 0.07, wx, wy + 0.39, d / 2 + 0.025, false); // header
    addBox(g, timber, 0.74, 0.08, 0.07, wx, wy - 0.39, d / 2 + 0.025, false); // sill
    for (const jx of [-1, 1]) {
      addBox(g, timber, 0.08, 0.78, 0.07, wx + jx * 0.37, wy, d / 2 + 0.025, false); // jambs
    }
    for (const sx of [-1, 1]) {
      const shutter = addBox(g, mats.wood, 0.24, 0.72, 0.04, wx + sx * 0.5, wy, d / 2 + 0.02, false);
      shutter.rotation.y = sx * 0.28;
    }
  }

  if (house.chimney) {
    // Ridge-seated: the stack rises ON the ridge line with a flashing collar
    // where it exits — never spearing through a slope mid-field (#452).
    addBox(g, mats.stone, 0.55, rise + 1.5, 0.55, -w * 0.3, wallTop + (rise + 1.5) / 2 - 0.3, 0, false);
    addBox(g, mats.stone, 0.85, 0.16, 0.85, -w * 0.3, wallTop + rise + 0.06, 0, false); // flashing collar at the ridge
    addBox(g, mats.stone, 0.7, 0.14, 0.7, -w * 0.3, wallTop + rise + 1.1, 0, false);
  }

  dressByKind(g, house, mats);

  g.position.set(house.x, baseY, house.z);
  // yawDeg aims local +X at the street (Houdini convention); the runtime door
  // wall is +Z, and three.js rotation.y maps +Z to (sinθ, 0, cosθ) — so the
  // door faces the street at θ = 90° − yawDeg.
  g.rotation.y = THREE.MathUtils.degToRad(90 - house.yawDeg);
  return g;
}

function buildWell(x: number, z: number, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "anwel-well";
  const baseY = field.height(x, z);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.85, 14, 1, true), mats.stone);
  ring.position.y = 0.425;
  ring.castShadow = true;
  ring.receiveShadow = true;
  g.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 8, 14), mats.stone);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.88;
  rim.castShadow = true;
  g.add(rim);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 14),
    new THREE.MeshStandardMaterial({ color: 0x14333a, roughness: 0.15 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.35;
  g.add(water);
  // Windlass posts + crossbar + crank.
  for (const sx of [-1, 1]) {
    addBox(g, mats.wood, 0.12, 1.9, 0.12, sx * 0.85, 0.95, 0, false);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), mats.wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.75;
  bar.castShadow = true;
  g.add(bar);
  const crank = addBox(g, mats.dark, 0.05, 0.34, 0.05, 0.95, 1.62, 0.1, false);
  crank.rotation.x = 0.5;
  // Little gable canopy.
  const canopy = roofPrism(mats.thatch([0.9, 0.85, 0.7]), 1.9, 1.1, 0.45, 0.12);
  canopy.position.y = 2.05;
  g.add(canopy);
  g.position.set(x, baseY, z);
  return g;
}

/** Cobbled street strip following the layout's village-lane spline, hugging
 * the terrain — the spine the houses face (#452 street-surface continuity).
 * Cobble in the village core, packed-mud aprons where it merges into the
 * dirt roads at both ends (no abrupt texture edges, rule 7). */
function buildStreet(
  village: VillageData,
  field: TerrainField,
  laneSamples: [number, number][],
  plateOffset: [number, number],
  mats: VillageMaterials,
): THREE.Group {
  const g = new THREE.Group();
  g.name = "anwel-street";
  const pts = laneSamples.map(([wx, wz]) => ({ x: wx - plateOffset[0], z: wz - plateOffset[1] }));
  if (pts.length < 2) return g;

  const width = 3.0;
  const half = width / 2;
  const cobbleUntil = Math.floor(pts.length * 0.85); // ends merge to dirt

  type Run = { start: number; end: number; mud: boolean };
  const runs: Run[] = [
    { start: 0, end: Math.max(2, pts.length - cobbleUntil), mud: true },
    { start: Math.max(2, pts.length - cobbleUntil) - 1, end: cobbleUntil, mud: false },
    { start: cobbleUntil - 1, end: pts.length - 1, mud: true },
  ];

  for (const run of runs) {
    const runPts = pts.slice(run.start, run.end + 1);
    if (runPts.length < 2) continue;
    const count = runPts.length;
    const positions = new Float32Array(count * 2 * 3);
    const uvs = new Float32Array(count * 2 * 2);
    const index = new Uint32Array((count - 1) * 6);
    let distance = 0;
    for (let i = 0; i < count; i += 1) {
      const prev = runPts[Math.max(i - 1, 0)] ?? runPts[i]!;
      const next = runPts[Math.min(i + 1, count - 1)] ?? runPts[i]!;
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      if (i > 0) distance += Math.hypot(runPts[i]!.x - runPts[i - 1]!.x, runPts[i]!.z - runPts[i - 1]!.z);
      const lx = runPts[i]!.x + dz * half;
      const lz = runPts[i]!.z - dx * half;
      const rx = runPts[i]!.x - dz * half;
      const rz = runPts[i]!.z + dx * half;
      const o = i * 6;
      positions[o] = lx;
      positions[o + 1] = field.height(lx, lz) + 0.07;
      positions[o + 2] = lz;
      positions[o + 3] = rx;
      positions[o + 4] = field.height(rx, rz) + 0.07;
      positions[o + 5] = rz;
      uvs[i * 4] = 0;
      uvs[i * 4 + 1] = distance / 3.0;
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = distance / 3.0;
    }
    let q = 0;
    for (let i = 0; i < count - 1; i += 1) {
      const a = i * 2;
      index[q] = a; index[q + 1] = a + 1; index[q + 2] = a + 2;
      index[q + 3] = a + 1; index[q + 4] = a + 3; index[q + 5] = a + 2;
      q += 6;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, run.mud ? mats.mud : mats.cobble);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    g.add(mesh);
  }
  return g;
}
function ropeBetween(a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Group, mats: VillageMaterials): void {
  const len = a.distanceTo(b);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), mats.dark);
  rope.position.copy(a).lerp(b, 0.5);
  rope.lookAt(b);
  rope.rotateX(Math.PI / 2);
  parent.add(rope);
}

/** Stable (owner addition #7): open-front stall shed + tack rail + hay,
 * facing the street's north end. Paddock fence uses the garden builder. */
function buildStable(village: VillageData, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const stable = village.stable;
  if (!stable) return new THREE.Group();
  const g = new THREE.Group();
  g.name = "anwel-stable";
  const { x, z, w, d, h } = stable;
  const baseY = field.height(x, z);

  // Posts + thatch roof (open front faces +x, toward the street).
  for (const px of [-w / 2 + 0.15, w / 2 - 0.15]) {
    for (const pz of [-d / 2 + 0.15, d / 2 - 0.15]) {
      addBox(g, mats.timber, 0.16, h, 0.16, px, h / 2, pz, false);
    }
  }
  const roof = roofPrism(mats.thatch([0.85, 0.78, 0.6]), w + 0.8, d + 0.8, 0.9, 0.25, mats.plankWall(w, 1, [0.5, 0.42, 0.34]), mats.timber);
  roof.position.y = h;
  g.add(roof);
  // Back + side half-walls (plank courses).
  const halfWall = mats.plankWall(w, 1.9, [0.5, 0.42, 0.34]);
  addBox(g, halfWall, 0.14, 1.9, d - 0.3, -w / 2 + 0.07, 0.95, 0);
  addBox(g, halfWall, w - 0.3, 1.9, 0.14, 0, 0.95, -d / 2 + 0.07);
  addBox(g, halfWall, w - 0.3, 1.9, 0.14, 0, 0.95, d / 2 - 0.07);
  // Stall divider + hay pile + tack rail with saddle blanket.
  addBox(g, mats.timber, 0.08, 1.5, d - 0.6, 0.4, 0.75, 0, false);
  addBox(g, mats.thatch([0.9, 0.85, 0.6]), 1.2, 0.7, 0.9, -0.8, 0.35, 0.8, false);
  addBox(g, mats.timber, 0.06, 1.0, 0.06, w / 2 - 0.5, 0.92, -d / 2 - 0.6, false);
  addBox(g, mats.timber, 0.06, 1.0, 0.06, w / 2 - 0.5, 0.92, -d / 2 - 1.8, false);
  addBox(g, mats.wood, 0.06, 0.06, 1.3, w / 2 - 0.5, 1.4, -d / 2 - 1.2, false);
  addBox(g, new THREE.MeshStandardMaterial({ color: 0x7a3b2e, roughness: 0.95 }), 0.5, 0.35, 0.12, w / 2 - 0.5, 1.22, -d / 2 - 1.2, false);

  g.position.set(x, baseY, z);
  return g;
}

/** Horses in the paddock — Quaternius CC0 animated GLBs. Behavior timer:
 *  cycles idle ↔ graze (with the occasional look-around), cross-faded, on
 *  randomized per-horse durations — never one clip looping forever. */
async function buildHorses(village: VillageData, field: TerrainField): Promise<THREE.Group> {
  const g = new THREE.Group();
  g.name = "anwel-horses";
  const horses = village.horses ?? [];
  if (horses.length === 0) return g;

  interface HorseActor {
    mixer: THREE.AnimationMixer;
    actions: Partial<Record<"idle" | "graze" | "look", THREE.AnimationAction>>;
    current: "idle" | "graze" | "look";
    until: number;
    seed: number;
  }
  const actors: HorseActor[] = [];
  // Deterministic per-horse variation so the paddock never moves in sync.
  const rand = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  };

  const loader = new GLTFLoader();
  for (const [index, horse] of horses.entries()) {
    try {
      const gltf = await loader.loadAsync(`${MODEL_ROOT}/${horse.id}.glb`);
      const model = gltf.scene;
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.frustumCulled = false;
        }
      });
      // Normalize to ~1.55 m at the withers regardless of author units.
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;
      const scale = height > 0 ? 1.55 / height : 1;
      model.scale.setScalar(scale);
      model.position.set(horse.x, field.height(horse.x, horse.z) - box.min.y * scale, horse.z);
      model.rotation.y = THREE.MathUtils.degToRad(horse.yawDeg);
      g.add(model);

      const mixer = new THREE.AnimationMixer(model);
      const find = (re: RegExp) => gltf.animations.find((c) => re.test(c.name));
      const actions: HorseActor["actions"] = {};
      for (const [key, re] of [["idle", /idle|stand/i], ["graze", /eating|graze/i], ["look", /look|alert|head/i]] as const) {
        const clip = find(re);
        if (clip) {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          actions[key] = action;
        }
      }
      if (!actions.idle && !actions.graze && gltf.animations[0]) {
        actions.idle = mixer.clipAction(gltf.animations[0]);
      }
      const first = actions.idle ?? actions.graze ?? actions.look;
      first?.play();
      const rng = rand(4182 + index * 977);
      actors.push({
        mixer,
        actions,
        current: actions.idle ? "idle" : actions.graze ? "graze" : "look",
        until: 4 + rng() * 8,
        seed: rng() * 1000,
      });
    } catch (error) {
      console.warn(`horse load failed: ${horse.id}`, error);
    }
  }

  let clock = 0;
  g.userData.tick = (elapsed: number, delta: number) => {
    clock += delta;
    for (const actor of actors) {
      actor.mixer.update(delta);
      if (clock < actor.until) continue;
      // Behavior timer fired: pick the next beat. Mostly calm idling with
      // grazing spells; occasional look-around. Durations stay randomized.
      const rng = rand(Math.floor(actor.seed + clock * 1000));
      const roll = rng();
      const next: HorseActor["current"] =
        roll < 0.45 && actor.actions.idle ? "idle"
        : roll < 0.85 && actor.actions.graze ? "graze"
        : actor.actions.look ? "look"
        : actor.actions.idle ? "idle" : "graze";
      const action = actor.actions[next];
      if (action && next !== actor.current) {
        const prev = actor.actions[actor.current];
        action.reset().play();
        if (prev) action.crossFadeFrom(prev, 0.6, false);
        actor.current = next;
      }
      actor.until = clock + (next === "graze" ? 8 + rng() * 10 : next === "look" ? 2 + rng() * 3 : 6 + rng() * 9);
    }
  };
  return g;
}

function buildJetty(village: VillageData, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "anwel-jetty";
  const { x0, x1, z } = village.jetty;
  // Deck height: just above the bank, level all the way over the water.
  const deckY = field.height(x0 + 1.5, z) + 0.45;
  // Deck planks (bank -> T-head).
  for (let x = x0; x >= x1; x -= 0.68) {
    addBox(g, mats.wood, 0.62, 0.08, 1.7, x, deckY, z, false);
  }
  // T-head cross planks.
  for (let t = 0; t < 4; t += 1) {
    addBox(g, mats.wood, 1.7, 0.08, 0.62, x1, deckY, z - 1.6 + t * 1.05, false);
  }
  // Piles into the water.
  const piles: [number, number][] = [
    [x0 - 2.0, z - 0.8], [x0 - 2.0, z + 0.8],
    [x1 + 1.6, z - 0.8], [x1 + 1.6, z + 0.8],
    [x1, z - 1.5], [x1, z + 1.5],
  ];
  for (const [px, pz] of piles) {
    const bed = field.height(px, pz);
    const top = deckY + 0.25;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, top - bed + 0.3, 7), mats.timber);
    post.position.set(px, (top + bed) / 2 - 0.1, pz);
    post.castShadow = true;
    g.add(post);
  }
  // Hand rail on the north side + rope along the top (#452 finish pass).
  const railZ = z - 0.8;
  const railTops: THREE.Vector3[] = [];
  for (let x = x0 - 0.3; x >= x1 - 0.2; x -= 1.6) {
    addBox(g, mats.timber, 0.07, 0.9, 0.07, x, deckY + 0.45, railZ, false);
    railTops.push(new THREE.Vector3(x, deckY + 0.88, railZ));
  }
  for (let i = 0; i < railTops.length - 1; i += 1) {
    ropeBetween(railTops[i]!, railTops[i + 1]!, g, mats);
  }
  // Boarding ladder on the T-head south side, rungs into the water (#452).
  const ladderX = x1 - 0.5;
  const ladderZ = z + 0.9;
  const bedY = field.height(ladderX, ladderZ);
  for (const lx of [-0.22, 0.22]) {
    addBox(g, mats.wood, 0.06, deckY - bedY + 0.7, 0.06, ladderX + lx, (deckY + bedY) / 2 + 0.15, ladderZ, false);
  }
  for (let rung = 0; rung < 4; rung += 1) {
    addBox(g, mats.wood, 0.5, 0.05, 0.05, ladderX, deckY - 0.25 - rung * 0.32, ladderZ, false);
  }
  return g;
}

function buildBoats(village: VillageData, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "anwel-boats";
  for (const [index, boat] of village.boats.entries()) {
    const b = new THREE.Group();
    b.name = `boat-${index}`;
    const waterY = field.height(boat.x, boat.z) + 0.55; // floats on the ribbon
    // Flat-bottomed punt: hull, raised ends, gunwales, bench.
    addBox(b, mats.wood, 2.6, 0.28, 1.0, 0, 0, 0, false);
    for (const end of [-1, 1]) {
      addBox(b, mats.wood, 0.35, 0.42, 0.9, end * 1.35, 0.14, 0, false);
    }
    for (const side of [-1, 1]) {
      addBox(b, mats.wood, 2.5, 0.14, 0.08, 0, 0.18, side * 0.52, false);
    }
    addBox(b, mats.timber, 0.3, 0.06, 0.85, 0, 0.16, 0, false);
    addBox(b, mats.timber, 0.3, 0.06, 0.85, 0.7, 0.16, 0, false); // second bench
    // Oar resting across the gunwales (#452: punts read as boats).
    const oar = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), mats.wood);
    shaft.rotation.z = Math.PI / 2;
    oar.add(shaft);
    addBox(oar, mats.wood, 0.35, 0.03, 0.12, 1.05, 0, 0, false); // blade
    oar.position.set(-0.2, 0.3, 0.1);
    oar.rotation.y = 0.35;
    b.add(oar);
    b.position.set(boat.x, waterY, boat.z);
    b.rotation.y = THREE.MathUtils.degToRad(boat.yawDeg);
    g.add(b);
    // Mooring rope: bow cleat to the nearest jetty pile (#452).
    const j = village.jetty;
    const bowLocal = new THREE.Vector3(1.35, 0.3, 0);
    const bow = bowLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(boat.yawDeg))
      .add(new THREE.Vector3(boat.x, waterY, boat.z));
    const pileTop = new THREE.Vector3(j.x1 + 0.4, field.height(j.x0 + 1.5, j.z) + 0.7, j.z);
    ropeBetween(bow, pileTop, g, mats);
  }
  return g;
}

/** Kind-specific dressing (#452): distinct silhouettes, not just sign boards.
 * Local space — the door wall is +Z (street-facing after the group yaw). */
function dressByKind(g: THREE.Group, house: VillageHouse, mats: VillageMaterials): void {
  const { w, d, h } = house;
  const frontZ = d / 2;
  const doorX = w * 0.18;
  const wallTop = 0.42 + h;

  // Shop sign: arm + colored board beside the door (all service buildings).
  if (house.kind === "apothecary" || house.kind === "vendor" || house.kind === "smithy") {
    addBox(g, mats.timber, 0.08, 0.08, 0.9, doorX - 0.9, 2.6, frontZ + 0.4, false);
    const boardColor = house.kind === "apothecary" ? 0x3e6b3a : house.kind === "smithy" ? 0x4a4a4e : 0x8a6a3a;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.55, 0.05),
      new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.85 }),
    );
    board.position.set(doorX - 0.9, 2.25, frontZ + 0.72);
    board.castShadow = true;
    g.add(board);
  }

  if (house.kind === "vendor") {
    // Market stall on the street face: 4 posts + big striped awning + counter
    // with goods — the adventurer buy/sell stop.
    const stallZ = frontZ + 1.5;
    for (const [px, pz] of [[-1.0, -0.9], [1.0, -0.9], [-1.0, 0.9], [1.0, 0.9]] as const) {
      addBox(g, mats.timber, 0.08, 2.1, 0.08, doorX + px, 1.47, stallZ + pz, false);
    }
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xa8492e, roughness: 0.9, side: THREE.DoubleSide }),
    );
    awning.rotation.x = -Math.PI / 2 + 0.16;
    awning.position.set(doorX, 2.6, stallZ);
    awning.castShadow = true;
    g.add(awning);
    addBox(g, mats.wood, 1.8, 0.78, 0.6, doorX, 0.81, stallZ, false); // counter
    addBox(g, mats.dark, 0.4, 0.22, 0.3, doorX - 0.4, 1.31, stallZ, false); // goods
    addBox(g, mats.timber, 0.35, 0.3, 0.35, doorX + 0.5, 1.35, stallZ, false); // crate of wares
  }

  if (house.kind === "smithy") {
    // Open-front forge lean-to on the south gable side + anvil + quench barrel.
    const sideX = w / 2 + 1.2;
    for (const pz of [-d / 2 + 0.4, d / 2 - 0.4]) {
      addBox(g, mats.timber, 0.1, 2.2, 0.1, sideX + 0.9, 1.1, pz, false);
    }
    const lean = new THREE.Mesh(new THREE.PlaneGeometry(2.2, d - 0.6), mats.thatch([0.7, 0.66, 0.55]));
    lean.rotation.z = Math.PI / 2 - 0.32;
    lean.rotation.y = Math.PI / 2;
    lean.position.set(sideX + 0.45, 2.65, 0);
    lean.castShadow = true;
    g.add(lean);
    addBox(g, mats.dark, 0.55, 0.32, 0.28, sideX + 0.2, 0.75, 0.3, false); // anvil
    addBox(g, mats.timber, 0.5, 0.35, 0.5, sideX + 0.2, 0.42, 0.3, false); // anvil block
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.7, 10), mats.wood);
    barrel.position.set(sideX + 0.3, 0.77, -0.9);
    barrel.castShadow = true;
    g.add(barrel);
  }

  if (house.kind === "apothecary") {
    // Roof dormer on the street slope + herb drying rack by the door.
    const dormer = new THREE.Group();
    addBox(dormer, mats.plaster(1, 1, house.wash), 0.9, 0.7, 0.8, 0, 0, 0, false);
    const dRoof = roofPrism(mats.thatch(house.roofTint), 0.9, 0.8, 0.35, 0.1);
    dRoof.position.y = 0.35;
    dormer.add(dRoof);
    dormer.position.set(-w * 0.1, wallTop + 0.55, frontZ - 0.45);
    g.add(dormer);
    // drying rack: two posts + bar + hanging bundles
    const rackZ = frontZ + 0.9;
    addBox(g, mats.timber, 0.06, 1.4, 0.06, doorX + 1.2, 1.12, rackZ, false);
    addBox(g, mats.timber, 0.06, 1.4, 0.06, doorX + 2.0, 1.12, rackZ, false);
    addBox(g, mats.timber, 0.9, 0.05, 0.05, doorX + 1.6, 1.78, rackZ, false);
    const bundleMat = new THREE.MeshStandardMaterial({ color: 0x5d7a35, roughness: 1.0 });
    for (const bx of [1.35, 1.6, 1.85]) {
      const bundle = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 5), bundleMat);
      bundle.position.set(doorX + bx, 1.55, rackZ);
      bundle.rotation.x = Math.PI;
      g.add(bundle);
    }
  }

  if (house.kind === "reeve") {
    // Headman's porch: two posts + flat canopy over the door + banner pole.
    for (const px of [-0.9, 0.9]) {
      addBox(g, mats.timber, 0.12, 2.2, 0.12, doorX + px, 1.1 + 0.42, frontZ + 1.0, false);
    }
    addBox(g, mats.wood, 2.4, 0.1, 1.3, doorX, 2.72, frontZ + 0.7, false);
    addBox(g, mats.timber, 0.07, 3.4, 0.07, doorX + 1.8, 1.7 + 0.42, frontZ + 1.2, false); // banner pole
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x6d2e2e, roughness: 0.9, side: THREE.DoubleSide }),
    );
    banner.position.set(doorX + 2.09, 3.3, frontZ + 1.2);
    banner.castShadow = true;
    g.add(banner);
  }

  if (house.kind === "hall") {
    // Town hall: bell post beside the door + double door read.
    addBox(g, mats.timber, 0.14, 3.0, 0.14, doorX - 1.6, 1.5 + 0.42, frontZ + 0.9, false);
    addBox(g, mats.timber, 0.8, 0.12, 0.12, doorX - 1.6, 3.3, frontZ + 0.9, false);
    const bell = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x8f7b3a, metalness: 0.6, roughness: 0.5 }),
    );
    bell.position.set(doorX - 1.6, 3.05, frontZ + 0.9);
    bell.castShadow = true;
    g.add(bell);
  }

  if (house.kind === "barn") {
    // Hayloft opening high on the street gable + wider double door read.
    addBox(g, mats.dark, 0.8, 0.7, 0.06, 0, wallTop + 0.45, frontZ + 0.01, false);
    addBox(g, mats.timber, 0.9, 0.08, 0.08, 0, wallTop + 0.85, frontZ + 0.02, false);
  }
}

function buildGarden(
  garden: { name: string; x: number; z: number; w: number; d: number },
  mats: VillageMaterials,
  field: TerrainField,
  pastureOnly = false,
): THREE.Group {
  const g = new THREE.Group();
  g.name = `garden-${garden.name}`;
  const baseY = field.height(garden.x, garden.z);
  const m = new THREE.Matrix4();
  if (!pastureOnly) {
  // Soil bed.
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(garden.w, 0.14, garden.d),
    new THREE.MeshStandardMaterial({ color: 0x3d2f22, roughness: 1.0 }),
  );
  soil.position.y = 0.07;
  soil.receiveShadow = true;
  g.add(soil);

  // Crop rows (#452): tilled ridges + leafy cross-cards that read as
  // vegetables at gameplay distance — not flat icons.
  const rows = Math.max(2, Math.floor(garden.d / 0.8));
  const cols = Math.max(3, Math.floor(garden.w / 0.55));
  // tilled ridges
  for (let r = 0; r < rows; r += 1) {
    const rz = -garden.d / 2 + 0.4 + (r * (garden.d - 0.8)) / (rows - 1);
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(garden.w - 0.5, 0.09, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x2e2318, roughness: 1.0 }),
    );
    ridge.position.set(0, 0.18, rz);
    ridge.receiveShadow = true;
    g.add(ridge);
  }
  // leafy crop card (procedural separated leaves — gaps keep it from reading
  // as a solid cone at distance)
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = 64;
  leafCanvas.height = 64;
  const lctx = leafCanvas.getContext("2d");
  if (lctx) {
    lctx.clearRect(0, 0, 64, 64);
    const leaves: [number, number, number, number][] = [
      [20, 34, -0.5, 1.0], [44, 34, 0.5, 1.0], [32, 26, 0.0, 1.15],
      [14, 44, -0.9, 0.85], [50, 44, 0.9, 0.85], [26, 48, -0.25, 0.8], [40, 48, 0.25, 0.8],
    ];
    leaves.forEach(([lx, ly, rot, s], i) => {
      lctx.fillStyle = i % 2 ? "#4e6b2a" : "#637f36";
      lctx.beginPath();
      lctx.ellipse(lx, ly, 5 * s, 11 * s, rot, 0, Math.PI * 2);
      lctx.fill();
    });
  }
  const leafTex = new THREE.CanvasTexture(leafCanvas);
  leafTex.colorSpace = THREE.SRGBColorSpace;
  const cropMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 1.0,
  });
  const card = new THREE.BufferGeometry();
  // two crossed quads, 0.3 m tall
  card.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.14, 0, 0, 0.14, 0, 0, -0.14, 0.3, 0, 0.14, 0.3, 0,
    0, 0, -0.14, 0, 0, 0.14, 0, 0.3, -0.14, 0, 0.3, 0.14,
  ], 3));
  card.setAttribute("uv", new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 0, 1, 1, 1,
    0, 0, 1, 0, 0, 1, 1, 1,
  ], 2));
  card.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
  card.computeVertexNormals();
  const crops = new THREE.InstancedMesh(card, cropMat, rows * cols);
  let k = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const jitter = ((r * 31 + c * 17) % 10) / 10 - 0.5;
      m.makeTranslation(
        -garden.w / 2 + 0.35 + (c * (garden.w - 0.7)) / (cols - 1),
        0.2,
        -garden.d / 2 + 0.4 + (r * (garden.d - 0.8)) / (rows - 1) + jitter * 0.06,
      );
      crops.setMatrixAt(k, m);
      k += 1;
    }
  }
  crops.castShadow = true;
  g.add(crops);
  } // end if (!pastureOnly) — paddocks keep grazed grass
  // Wattle fence: posts + two rails per side.
  const post = new THREE.CylinderGeometry(0.045, 0.05, 0.85, 5);
  const postMat = mats.timber;
  const fence = new THREE.Group();
  const perim: [number, number][] = [];
  const step = 0.75;
  for (let x = -garden.w / 2; x <= garden.w / 2 + 0.01; x += step) {
    perim.push([x, -garden.d / 2], [x, garden.d / 2]);
  }
  for (let z = -garden.d / 2; z <= garden.d / 2 + 0.01; z += step) {
    perim.push([-garden.w / 2, z], [garden.w / 2, z]);
  }
  const posts = new THREE.InstancedMesh(post, postMat, perim.length);
  perim.forEach(([px, pz], i) => {
    m.makeTranslation(px, 0.42, pz);
    posts.setMatrixAt(i, m);
  });
  posts.castShadow = true;
  fence.add(posts);
  for (const [rx, rz, rw, rd] of [
    [0, -garden.d / 2, garden.w, 0.05],
    [0, garden.d / 2, garden.w, 0.05],
    [-garden.w / 2, 0, 0.05, garden.d],
    [garden.w / 2, 0, 0.05, garden.d],
  ] as const) {
    addBox(fence, postMat, rw, 0.05, rd, rx, 0.68, rz, false);
    addBox(fence, postMat, rw, 0.05, rd, rx, 0.38, rz, false);
  }
  g.add(fence);
  g.position.set(garden.x, baseY, garden.z);
  return g;
}

/** Full-res prop glTFs (small bins) cloned into place. */
async function dressWithProps(village: VillageData, field: TerrainField, parent: THREE.Group): Promise<void> {
  const loader = new GLTFLoader();
  const cache = new Map<string, THREE.Object3D>();
  async function prop(id: string): Promise<THREE.Object3D | null> {
    if (!cache.has(id)) {
      try {
        const gltf = await loader.loadAsync(`${MODEL_ROOT}/${id}/${id}.gltf`);
        gltf.scene.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        cache.set(id, gltf.scene);
      } catch (error) {
        console.warn(`prop load failed: ${id}`, error);
        cache.set(id, new THREE.Group());
      }
    }
    const template = cache.get(id);
    return template ? template.clone(true) : null;
  }

  const plaza = village.plaza;
  const placements: [string, number, number, number][] = [
    // [asset, dx, dz, yawDeg] around plaza / dock
    ["wooden_barrels_01", plaza.x + 1.6, plaza.z + 1.2, 15],
    ["wine_barrel_01", plaza.x + 2.1, plaza.z + 0.4, 70],
    ["wooden_crate_01", plaza.x - 1.4, plaza.z + 1.6, 40],
    ["wooden_crate_02", plaza.x - 1.7, plaza.z + 1.1, 5],
    ["wooden_bucket_01", 0.9, 0.6, 0], // relative to well, patched below
    ["wooden_lantern_01", plaza.x - 2.2, plaza.z - 1.4, 0],
    ["planter_box_01", plaza.x + 0.4, plaza.z - 2.4, 95],
    ["wooden_barrels_01", village.jetty.x0 + 0.8, village.jetty.z - 1.6, 130],
    ["wooden_crate_01", village.jetty.x0 + 0.3, village.jetty.z + 1.3, 85],
  ];
  for (const [id, px, pz, yaw] of placements) {
    const node = await prop(id);
    if (!node) continue;
    const isWellBucket = id === "wooden_bucket_01";
    const x = isWellBucket ? village.well.x + px : px;
    const z = isWellBucket ? village.well.z + pz : pz;
    // Ground-snap by bounding box: prop origins vary (center vs base), so seat
    // each prop's lowest point on the terrain — no floating or half-sunk props.
    const box = new THREE.Box3().setFromObject(node);
    const groundY = field.height(x, z);
    node.position.set(x, groundY - (box.isEmpty() ? 0 : box.min.y), z);
    node.rotation.y = THREE.MathUtils.degToRad(yaw);
    parent.add(node);
  }
}

/** Placeholder scale figures — tracked placeholder (Finding 8). */
function buildNpcs(npcs: NpcData, field: TerrainField, parent: THREE.Group, village?: VillageData): void {
  for (const npc of npcs.npcs) {
    const g = new THREE.Group();
    g.name = `npc-${npc.id}`;
    const tunic = new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.tunic[0], npc.tunic[1], npc.tunic[2]),
      roughness: 0.95,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.85, 4, 10), tunic);
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xc9a183, roughness: 0.8 }),
    );
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);

    // Floating name label (canvas sprite) so scale/organization reads.
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(12, 10, 8, 0.55)";
      ctx.fillRect(0, 8, 256, 44);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.fillText(npc.id.replace(/-/g, " "), 128, 40);
    }
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, depthTest: true }),
    );
    label.scale.set(1.25, 0.31, 1);
    label.position.y = 2.0;
    g.add(label);

    // Ground snap — but NPCs on the jetty stand on the deck, not the riverbed.
    let groundY = field.height(npc.x, npc.z);
    if (village) {
      const j = village.jetty;
      if (npc.x <= j.x0 + 0.5 && npc.x >= j.x1 - 1.2 && Math.abs(npc.z - j.z) < 1.9) {
        groundY = field.height(j.x0 + 1.5, j.z) + 0.45 + 0.05;
      }
    }
    g.position.set(npc.x, groundY, npc.z);
    g.rotation.y = THREE.MathUtils.degToRad(npc.yawDeg);
    parent.add(g);
  }
}

/** Soulwell terrace: mossy stone ring + windlass + breach arch stub. */
/** Silvery machine-liquid surface (V14): reflective metal-silver with slow
 * machinic motion — rotating concentric bands + fresnel sky sheen + a low
 * teal pulse. Not water: no foam, no depth fade, fully opaque. */
function soulLiquidMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uSky: { value: new THREE.Color(0xcfe4ea) },
      uSilverDeep: { value: new THREE.Color(0x46545c) },
      uSilverBright: { value: new THREE.Color(0xb9c8cc) },
      uPulse: { value: new THREE.Color(0x2fd3c0) },
    },
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vLocal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vLocal = position.xy; // circle geometry is authored in XY before rotation
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uSky;
      uniform vec3 uSilverDeep;
      uniform vec3 uSilverBright;
      uniform vec3 uPulse;
      varying vec2 vLocal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        float r = length(vLocal);
        float ang = atan(vLocal.y, vLocal.x);
        // Machinic motion: concentric bands slowly rotating + breathing.
        float bands = sin(r * 9.0 - uTime * 0.7 + sin(ang * 4.0 + uTime * 0.35) * 0.8);
        float fine = sin(r * 26.0 + uTime * 1.1 - ang * 6.0);
        float m = 0.5 + 0.5 * bands * 0.8 + 0.25 * fine * bands;
        vec3 silver = mix(uSilverDeep, uSilverBright, m);
        // Fresnel sky sheen across the liquid metal.
        float fres = pow(1.0 - max(vViewDir.y, 0.0), 2.0);
        silver = mix(silver, uSky, fres * 0.4);
        // Slow teal pulse — the Well "breathing".
        float pulse = 0.5 + 0.5 * sin(uTime * 0.6);
        silver += uPulse * (0.10 + 0.18 * pulse) * smoothstep(0.9, 0.2, r);
        gl_FragColor = vec4(silver, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

/** V14: the Soul Well is a shallow silvery POOL in ancient ruins — a landing
 * and gathering place. Stepped basin + liquid, weathered pillar ring (some
 * broken), two small stepped pyramids flanking the approach, the breach arch
 * behind, echo shards hovering over the liquid. NO well furniture (ruling). */
function buildSoulwell(mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "soulwell-terrace";
  const baseY = field.height(0, 0);
  const top = 0.35; // pad top, local to the group

  // Flagstone pad (wider apron — this is a gathering place).
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.7, 0.35, 28), mats.cobble);
  pad.position.y = 0.17;
  pad.receiveShadow = true;
  g.add(pad);

  // Stepped pool basin: open rim steps (walls + flat annulus caps — never a
  // solid cap over the liquid), floor, then the silvery surface inside.
  const rimWall = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.9, 0.55, 24, 1, true), mats.stone);
  rimWall.position.y = top + 0.275;
  rimWall.castShadow = true;
  rimWall.receiveShadow = true;
  g.add(rimWall);
  const rimTop = new THREE.Mesh(new THREE.RingGeometry(2.26, 2.82, 24), mats.stone);
  rimTop.rotation.x = -Math.PI / 2;
  rimTop.position.y = top + 0.55;
  rimTop.receiveShadow = true;
  g.add(rimTop);
  const innerWall = new THREE.Mesh(new THREE.CylinderGeometry(2.26, 2.26, 0.3, 24, 1, true), mats.stone);
  innerWall.position.y = top + 0.4;
  g.add(innerWall);
  // Basin floor (dark stone visible at the rim shallows).
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.26, 24), mats.dark);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = top + 0.26;
  g.add(floor);
  // The silvery liquid — above the floor, just below the rim.
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(2.24, 40), soulLiquidMaterial());
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = top + 0.46;
  g.add(liquid);

  // Echo shards hover over the pool (canon: recovered memories have weight).
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8d2,
    emissive: new THREE.Color(0x2fd3c0),
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.3,
  });
  const shards: THREE.Mesh[] = [];
  const shardSizes = [0.5, 0.32, 0.22];
  shardSizes.forEach((s, i) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(s), shardMat);
    shard.castShadow = true;
    shards.push(shard);
    g.add(shard);
    void i;
  });

  // Weathered pillar ring — varied heights, two broken stubs with rubble.
  const pillarHeights = [3.3, 1.0, 2.9, 3.5, 0.85, 3.1, 2.6, 1.25, 3.35];
  const rubbleSpots: [number, number][] = [];
  pillarHeights.forEach((height, i) => {
    const ang = (i / pillarHeights.length) * Math.PI * 2 + 0.19;
    const px = Math.cos(ang) * 8.2;
    const pz = Math.sin(ang) * 8.2;
    const broken = height < 1.4;
    const py = field.height(px, pz) - baseY;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, height, 10), mats.stone);
    pillar.position.set(px, py + height / 2, pz);
    pillar.rotation.z = broken ? 0 : (i % 2 ? 0.035 : -0.028); // weathered lean
    pillar.rotation.x = broken ? 0 : (i % 3 ? 0.02 : -0.025);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    g.add(pillar);
    if (!broken) {
      // capital: a wider weathered cap so tall pillars read as columns
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.85), mats.stone);
      cap.position.set(px, py + height + 0.08, pz);
      cap.rotation.z = pillar.rotation.z;
      cap.castShadow = true;
      g.add(cap);
    } else {
      rubbleSpots.push([px, pz]);
    }
  });
  // Rubble: fallen drums beside the broken stubs.
  for (const [rx, rz] of rubbleSpots) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.9, 9), mats.stone);
    const ry = field.height(rx + 0.8, rz + 0.5) - baseY;
    drum.position.set(rx + 0.8, ry + 0.30, rz + 0.5);
    drum.rotation.z = Math.PI / 2;
    drum.rotation.y = rx * 2.3;
    drum.castShadow = true;
    drum.receiveShadow = true;
    g.add(drum);
  }

  // Two small stepped pyramids flanking the south approach.
  for (const sx of [-1, 1]) {
    const bx = sx * 6.8;
    const bz = 4.6;
    const by = field.height(bx, bz) - baseY;
    for (let tier = 0; tier < 3; tier += 1) {
      const w = 1.7 - tier * 0.5;
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, w), mats.stone);
      block.position.set(bx, by + 0.21 + tier * 0.42, bz);
      block.castShadow = true;
      block.receiveShadow = true;
      g.add(block);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 4), mats.stone);
    cap.position.set(bx, by + 0.42 * 3 + 0.25, bz);
    cap.rotation.y = Math.PI / 4;
    cap.castShadow = true;
    g.add(cap);
  }

  // Breach arch behind the pool (the door you walked out of).
  for (const sx of [-1, 1]) {
    addBox(g, mats.stone, 0.7, 3.2, 0.7, sx * 1.6, 1.6, -3.4, false);
  }
  addBox(g, mats.stone, 4.2, 0.65, 0.8, 0, 3.5, -3.4, false);

  // The pool's quiet glow on the stones (canon low-level magic accent).
  const glowLight = new THREE.PointLight(0x66e0cf, 1.1, 13, 2.0);
  glowLight.position.set(0, top + 2.2, 0);
  g.add(glowLight);

  g.position.set(0, baseY, 0);
  // Animate: liquid time + shard orbit/bob.
  const liquidMat = liquid.material as THREE.ShaderMaterial;
  g.userData.tick = (elapsed: number) => {
    (liquidMat.uniforms.uTime as { value: number }).value = elapsed;
    shards.forEach((shard, i) => {
      const t = elapsed * (0.22 + i * 0.07) + i * 2.1;
      shard.position.set(Math.cos(t) * (0.5 + i * 0.35), top + 1.5 + Math.sin(elapsed * 0.8 + i) * 0.18 + i * 0.5, Math.sin(t) * (0.5 + i * 0.35));
      shard.rotation.y = elapsed * 0.4 + i;
    });
  };
  return g;
}

export async function createVillageAndTerrace(
  village: VillageData,
  npcs: NpcData,
  field: TerrainField,
  layout?: LayoutData,
  plateOffset: [number, number] = [0, 0],
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "HeartvaleVillage";
  const mats = makeMaterials();

  // Street surface first — the spine everything faces (#452).
  const lane = layout?.roads.find((r) => r.id === "anwel-village-lane");
  if (lane) {
    group.add(buildStreet(village, field, lane.samples, plateOffset, mats));
  }

  group.add(buildSoulwell(mats, field));
  for (const house of village.houses) {
    group.add(buildHouse(house, mats, field));
  }
  group.add(buildWell(village.well.x, village.well.z, mats, field));
  // Plaza cobbles: a worn stone apron under the well between the shopfronts —
  // sized to clear every house footprint (nearest corner ≈ 5.1 m away).
  const plazaPad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.5, 0.08, 20),
    mats.cobble,
  );
  plazaPad.position.set(
    village.plaza.x,
    field.height(village.plaza.x, village.plaza.z) + 0.04,
    village.plaza.z,
  );
  plazaPad.receiveShadow = true;
  group.add(plazaPad);
  group.add(buildJetty(village, mats, field));
  group.add(buildBoats(village, mats, field));
  for (const garden of village.gardens) {
    group.add(buildGarden(garden, mats, field));
  }
  // Stable + paddock + horses (owner addition #7).
  group.add(buildStable(village, mats, field));
  if (village.paddock) {
    group.add(buildGarden({ ...village.paddock, name: "paddock" }, mats, field, true));
  }
  const horses = await buildHorses(village, field);
  group.add(horses);
  buildNpcs(npcs, field, group, village);
  await dressWithProps(village, field, group);
  return group;
}
