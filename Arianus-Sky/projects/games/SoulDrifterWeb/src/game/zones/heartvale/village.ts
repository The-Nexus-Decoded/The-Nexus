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
import type { NpcData, TerrainField, VillageData, VillageHouse } from "./data";

const TEX_ROOT = "/assets/zones/heartvale/textures/buildings";
const MODEL_ROOT = "/assets/zones/heartvale/models";

function tiled(loader: THREE.TextureLoader, url: string, rx: number, ry: number): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
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
  timber: THREE.MeshStandardMaterial;
  thatch: (tint: [number, number, number]) => THREE.MeshStandardMaterial;
  slate: (tint: [number, number, number]) => THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
}

function makeMaterials(): VillageMaterials {
  const loader = new THREE.TextureLoader();
  const timber = new THREE.MeshStandardMaterial({
    map: tiled(loader, `${TEX_ROOT}/wood_planks/wood_planks_diff_1k.jpg`, 1, 1),
    roughness: 0.9,
  });
  const stone = new THREE.MeshStandardMaterial({
    map: tiled(loader, `${TEX_ROOT}/mossy_stone_wall/mossy_stone_wall_diff_1k.jpg`, 1.6, 0.5),
    roughness: 0.95,
  });
  const cobble = new THREE.MeshStandardMaterial({
    map: tiled(loader, `${TEX_ROOT}/mossy_cobblestone/mossy_cobblestone_diff_1k.jpg`, 6, 6),
    roughness: 0.9,
  });
  const wood = new THREE.MeshStandardMaterial({
    map: tiled(loader, `${TEX_ROOT}/wood_planks/wood_planks_diff_1k.jpg`, 1, 1),
    roughness: 0.85,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 1.0 });
  return {
    plaster: (w, h, wash) =>
      new THREE.MeshStandardMaterial({
        map: tiled(loader, `${TEX_ROOT}/plastered_wall/plastered_wall_diff_1k.jpg`, w / 3.2, h / 3.2),
        color: new THREE.Color(wash[0], wash[1], wash[2]),
        roughness: 0.92,
      }),
    timber,
    thatch: (tint) =>
      new THREE.MeshStandardMaterial({
        map: tiled(loader, `${TEX_ROOT}/thatch_roof_angled/thatch_roof_angled_diff_1k.jpg`, 2.4, 1.6),
        color: new THREE.Color(tint[0], tint[1], tint[2]),
        roughness: 1.0,
      }),
    slate: (tint) =>
      new THREE.MeshStandardMaterial({
        map: tiled(loader, `${TEX_ROOT}/roof_slates_02/roof_slates_02_diff_1k.jpg`, 2.6, 1.8),
        color: new THREE.Color(tint[0], tint[1], tint[2]),
        roughness: 0.8,
      }),
    stone,
    cobble,
    wood,
    dark,
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

/** Gabled roof prism with eaves overhang, ridge along local X. */
function roofPrism(
  material: THREE.Material,
  w: number,
  d: number,
  rise: number,
  overhang: number,
): THREE.Mesh {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const y0 = -0.02;
  const positions = new Float32Array([
    // slope north (-z side)
    -hw, y0, -hd, hw, y0, -hd, hw, rise, 0,
    -hw, y0, -hd, hw, rise, 0, -hw, rise, 0,
    // slope south (+z side)
    hw, y0, hd, -hw, y0, hd, -hw, rise, 0,
    hw, y0, hd, -hw, rise, 0, hw, rise, 0,
    // gable west (-x)
    -hw, y0, -hd, -hw, rise, 0, -hw, y0, hd,
    // gable east (+x)
    hw, y0, -hd, hw, y0, hd, hw, rise, 0,
    // underside (closes eaves from below)
    -hw, y0, -hd, -hw, y0, hd, hw, y0, hd,
    -hw, y0, -hd, hw, y0, hd, hw, y0, -hd,
  ]);
  const uvs = new Float32Array([
    0, 0, w / 1.6, 0, w / 1.6, d / 1.6, 0, 0, w / 1.6, d / 1.6, 0, d / 1.6,
    0, 0, w / 1.6, 0, w / 1.6, d / 1.6, 0, 0, w / 1.6, d / 1.6, 0, d / 1.6,
    0, 0, 0, 1, 1, 0,
    0, 0, 1, 0, 0, 1,
    0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
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
  // Plaster walls.
  addBox(g, mats.plaster(w, h, house.wash), w, h, d, 0, 0.42 + h / 2, 0);

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

  // Gable-end timber framing: verticals + diagonals on ±x faces.
  for (const sx of [-1, 1]) {
    const gx = sx * (w / 2 + 0.01);
    addBox(g, timber, 0.09, rise, 0.09, gx, wallTop + rise / 2, 0, false);
    for (const sz of [-1, 1]) {
      const brace = addBox(g, timber, 0.07, rise * 1.15, 0.07, gx, wallTop + rise * 0.45, sz * d * 0.22, false);
      brace.rotation.x = sz * Math.atan2(d / 2, rise);
    }
  }

  // Roof.
  const roofMat = house.roof === "slate" ? mats.slate(house.roofTint) : mats.thatch(house.roofTint);
  const roof = roofPrism(roofMat, w, d, rise, overhang);
  roof.position.y = wallTop;
  g.add(roof);
  // Ridge beam.
  addBox(g, timber, w + overhang * 2 + 0.1, 0.09, 0.12, 0, wallTop + rise, 0, false);

  // Door on the street face (+z), framed and slightly proud.
  const doorX = w * 0.18;
  addBox(g, mats.wood, 0.9, 1.9, 0.08, doorX, 0.42 + 0.95, d / 2 + 0.03, false);
  addBox(g, timber, 1.1, 0.12, 0.1, doorX, 0.42 + 1.95, d / 2 + 0.03, false);
  for (const sx of [-1, 1]) {
    addBox(g, timber, 0.1, 1.9, 0.1, doorX + sx * 0.5, 0.42 + 0.95, d / 2 + 0.03, false);
  }
  // Lintel shadow line above door.
  addBox(g, mats.dark, 1.0, 0.06, 0.06, doorX, 0.42 + 2.02, d / 2 + 0.02, false);

  // Windows: recessed dark pane + timber frame + shutters that catch light.
  const windowXs = [-w * 0.26, w * 0.38];
  for (const wx of windowXs) {
    if (Math.abs(wx) > w / 2 - 0.5) continue;
    addBox(g, mats.dark, 0.62, 0.7, 0.05, wx, 0.42 + h * 0.62, d / 2 + 0.015, false);
    addBox(g, timber, 0.74, 0.08, 0.07, wx, 0.42 + h * 0.62 + 0.39, d / 2 + 0.025, false);
    addBox(g, timber, 0.74, 0.08, 0.07, wx, 0.42 + h * 0.62 - 0.39, d / 2 + 0.025, false);
    for (const sx of [-1, 1]) {
      const shutter = addBox(g, mats.wood, 0.24, 0.72, 0.04, wx + sx * 0.46, 0.42 + h * 0.62, d / 2 + 0.02, false);
      shutter.rotation.y = sx * 0.28;
    }
  }

  if (house.chimney) {
    addBox(g, mats.stone, 0.55, rise + 1.5, 0.55, -w * 0.3, wallTop + (rise + 1.5) / 2 - 0.3, 0, false);
    addBox(g, mats.stone, 0.7, 0.14, 0.7, -w * 0.3, wallTop + rise + 1.1, 0, false);
  }

  g.position.set(house.x, baseY, house.z);
  g.rotation.y = THREE.MathUtils.degToRad(house.yawDeg);
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

function buildDock(village: VillageData, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "anwel-dock";
  const { x, z0, planks, plankSpacing } = village.dock;
  for (let i = 0; i < planks; i += 1) {
    const z = z0 + i * plankSpacing;
    const y = field.height(x, z) + 0.32;
    addBox(g, mats.wood, 1.6, 0.08, 0.62, x, y, z, false);
    if (i % 2 === 0) {
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 6), mats.timber);
        post.position.set(x + sx * 0.7, y - 0.35, z);
        post.castShadow = true;
        g.add(post);
      }
    }
  }
  return g;
}

function buildGarden(garden: { name: string; x: number; z: number; w: number; d: number }, mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = `garden-${garden.name}`;
  const baseY = field.height(garden.x, garden.z);
  // Soil bed.
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(garden.w, 0.14, garden.d),
    new THREE.MeshStandardMaterial({ color: 0x3d2f22, roughness: 1.0 }),
  );
  soil.position.y = 0.07;
  soil.receiveShadow = true;
  g.add(soil);
  // Crop rows: little green tufts.
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x5d7a35, roughness: 1.0 });
  const rows = Math.max(2, Math.floor(garden.d / 0.7));
  const cols = Math.max(3, Math.floor(garden.w / 0.6));
  const tuft = new THREE.ConeGeometry(0.09, 0.3, 5);
  const inst = new THREE.InstancedMesh(tuft, tuftMat, rows * cols);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      m.makeTranslation(
        -garden.w / 2 + 0.3 + (c * (garden.w - 0.6)) / (cols - 1),
        0.28,
        -garden.d / 2 + 0.3 + (r * (garden.d - 0.6)) / (rows - 1),
      );
      inst.setMatrixAt(k, m);
      k += 1;
    }
  }
  inst.castShadow = true;
  g.add(inst);
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
    ["wooden_barrels_01", village.dock.x + 1.3, village.dock.z0 + 0.6, 130],
    ["wooden_crate_01", village.dock.x + 1.2, village.dock.z0 + 2.1, 85],
  ];
  for (const [id, px, pz, yaw] of placements) {
    const node = await prop(id);
    if (!node) continue;
    const isWellBucket = id === "wooden_bucket_01";
    const x = isWellBucket ? village.well.x + px : px;
    const z = isWellBucket ? village.well.z + pz : pz;
    node.position.set(x, field.height(x, z), z);
    node.rotation.y = THREE.MathUtils.degToRad(yaw);
    parent.add(node);
  }
}

/** Placeholder scale figures — tracked placeholder (Finding 8). */
function buildNpcs(npcs: NpcData, field: TerrainField, parent: THREE.Group): void {
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
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
    );
    label.scale.set(1.9, 0.48, 1);
    label.position.y = 2.15;
    g.add(label);

    g.position.set(npc.x, field.height(npc.x, npc.z), npc.z);
    g.rotation.y = THREE.MathUtils.degToRad(npc.yawDeg);
    parent.add(g);
  }
}

/** Soulwell terrace: mossy stone ring + windlass + breach arch stub. */
function buildSoulwell(mats: VillageMaterials, field: TerrainField): THREE.Group {
  const g = new THREE.Group();
  g.name = "soulwell-terrace";
  // Flagstone pad.
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 0.35, 24), mats.cobble);
  pad.position.y = 0.17;
  pad.receiveShadow = true;
  pad.castShadow = false;
  g.add(pad);
  // Well ring.
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 1.1, 18, 1, true), mats.stone);
  ring.position.y = 0.9;
  ring.castShadow = true;
  ring.receiveShadow = true;
  g.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.12, 8, 18), mats.stone);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.47;
  rim.castShadow = true;
  g.add(rim);
  // Soulwell glow — the one magical accent (low-level canon).
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 18),
    new THREE.MeshStandardMaterial({
      color: 0x0e2f33,
      emissive: new THREE.Color(0x2fd3c0),
      emissiveIntensity: 0.85,
      roughness: 0.3,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.62;
  g.add(glow);
  // Windlass frame.
  for (const sx of [-1, 1]) {
    addBox(g, mats.wood, 0.16, 2.5, 0.16, sx * 1.5, 1.55, 0, false);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8), mats.wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.65;
  bar.castShadow = true;
  g.add(bar);
  const canopy = roofPrism(mats.thatch([0.75, 0.78, 0.7]), 3.4, 1.6, 0.6, 0.18);
  canopy.position.y = 3.0;
  g.add(canopy);
  // Breach arch stub behind the well (two column stubs + lintel).
  for (const sx of [-1, 1]) {
    addBox(g, mats.stone, 0.7, 3.2, 0.7, sx * 1.6, 1.6, -3.4, false);
  }
  addBox(g, mats.stone, 4.2, 0.65, 0.8, 0, 3.5, -3.4, false);
  g.position.set(0, field.height(0, 0), 0);
  return g;
}

export async function createVillageAndTerrace(
  village: VillageData,
  npcs: NpcData,
  field: TerrainField,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "HeartvaleVillage";
  const mats = makeMaterials();

  group.add(buildSoulwell(mats, field));
  for (const house of village.houses) {
    group.add(buildHouse(house, mats, field));
  }
  group.add(buildWell(village.well.x, village.well.z, mats, field));
  group.add(buildDock(village, mats, field));
  for (const garden of village.gardens) {
    group.add(buildGarden(garden, mats, field));
  }
  buildNpcs(npcs, field, group);
  await dressWithProps(village, field, group);
  return group;
}
