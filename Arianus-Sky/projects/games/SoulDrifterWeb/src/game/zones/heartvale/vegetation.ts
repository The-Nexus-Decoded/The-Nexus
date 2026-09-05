/**
 * Heartvale zone preview — vegetation & rocks (T2, Finding 5).
 *
 * Trees/shrubs/rocks instance the Houdini-exported LOD glTFs (one
 * InstancedMesh per species × material slot) with full-res 1k Poly Haven
 * textures re-bound by slot name — leaves use the PNG alpha diffuse with
 * alphaTest, trunks stay opaque. Grass is a 140k-instance clump field
 * (3 crossed cards per clump) with per-instance scale/yaw/dryness and a
 * wind vertex sway, colors tied to the splat's dry/grass balance.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ScatterData, TerrainField } from "./data";

const MODEL_ROOT = "/assets/zones/heartvale/models";

/** Species key -> asset id (mirrors scatter.assets, kept explicit for TS). */
interface SpeciesBinding {
  assetId: string;
  /** slot name -> texture binding */
  slots: SlotBinding[];
}
interface SlotBinding {
  slot: string;
  diffuse: string;
  alphaMap?: string;
  alphaTest?: number;
  doubleSided?: boolean;
  roughness?: number;
}

const TREE_BINDINGS: Record<string, SpeciesBinding> = {
  oak: {
    assetId: "tree_small_02",
    slots: [
      { slot: "trunk", diffuse: "tree_small_02_diff_1k.jpg" },
      { slot: "branches", diffuse: "tree_small_02_branch_diff_1k.jpg" },
      {
        slot: "leaves",
        diffuse: "tree_small_02_leaves_diff_1k.png",
        alphaTest: 0.45,
        doubleSided: true,
      },
    ],
  },
  oakAlt: {
    assetId: "island_tree_02",
    slots: [
      { slot: "island_tree_02", diffuse: "island_tree_02_diff_1k.jpg" },
      { slot: "branches", diffuse: "island_tree_02_branches_diff_1k.jpg" },
      {
        slot: "leaves",
        diffuse: "island_tree_02_leaves_diff_1k.png",
        alphaTest: 0.45,
        doubleSided: true,
      },
    ],
  },
  birch: {
    assetId: "island_tree_03",
    slots: [
      { slot: "island_tree_03", diffuse: "island_tree_03_diff_1k.jpg" },
      { slot: "branches", diffuse: "island_tree_03_branches_diff_1k.jpg" },
      {
        slot: "leaves",
        diffuse: "island_tree_03_leaves_diff_1k.png",
        alphaTest: 0.45,
        doubleSided: true,
      },
    ],
  },
  willow: {
    assetId: "island_tree_01",
    slots: [
      { slot: "island_tree_01", diffuse: "island_tree_01_diff_1k.jpg" },
      { slot: "branches", diffuse: "island_tree_01_branches_diff_1k.jpg" },
      {
        slot: "leaves",
        diffuse: "island_tree_01_leaves_diff_1k.png",
        alphaTest: 0.45,
        doubleSided: true,
      },
    ],
  },
};

const SHRUB_BINDINGS: SpeciesBinding[] = [
  {
    assetId: "shrub_01",
    slots: [{ slot: "shrub_01", diffuse: "shrub_01_diff_1k.png", alphaTest: 0.5, doubleSided: true }],
  },
  {
    assetId: "wild_rooibos_bush",
    slots: [
      { slot: "wild_rooibos_bush", diffuse: "wild_rooibos_bush_diff_1k.jpg" },
      { slot: "twigs", diffuse: "wild_rooibos_bush_diff_1k.jpg" },
      {
        slot: "leaves",
        diffuse: "wild_rooibos_bush_diff_1k.png",
        alphaMap: "wild_rooibos_bush_alpha_1k.png",
        alphaTest: 0.4,
        doubleSided: true,
      },
    ],
  },
];

const ROCK_BINDINGS: Record<string, SpeciesBinding> = {
  boulder: { assetId: "boulder_01", slots: [{ slot: "boulder_01", diffuse: "boulder_01_diff_1k.jpg" }] },
  stone: { assetId: "stone_01", slots: [{ slot: "stone_01", diffuse: "stone_01_diff_1k.jpg" }] },
};

function loadTexture(loader: THREE.TextureLoader, url: string, srgb = true): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function slotMaterial(binding: SpeciesBinding, slot: SlotBinding, loader: THREE.TextureLoader): THREE.Material {
  const material = new THREE.MeshStandardMaterial({
    map: loadTexture(loader, `${MODEL_ROOT}/${binding.assetId}/textures/${slot.diffuse}`),
    roughness: slot.roughness ?? 0.95,
    metalness: 0.0,
  });
  if (slot.alphaTest) {
    material.alphaTest = slot.alphaTest;
    material.transparent = false;
  }
  if (slot.alphaMap) {
    material.alphaMap = loadTexture(
      loader,
      `${MODEL_ROOT}/${binding.assetId}/textures/${slot.alphaMap}`,
      false,
    );
  }
  if (slot.doubleSided) material.side = THREE.DoubleSide;
  return material;
}

const gltfLoader = new GLTFLoader();

async function loadSlotGeometry(assetId: string, slot: string): Promise<THREE.BufferGeometry | null> {
  const url = `${MODEL_ROOT}/${assetId}/${assetId}.lod.${slot}.gltf`;
  try {
    const gltf = await gltfLoader.loadAsync(url);
    let geometry: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((node) => {
      if (!geometry && (node as THREE.Mesh).isMesh) geometry = (node as THREE.Mesh).geometry;
    });
    return geometry;
  } catch (error) {
    console.warn(`slot load failed: ${url}`, error);
    return null;
  }
}

/** Deterministic per-instance yaw so screenshots are reproducible. */
function hashYaw(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

async function buildSpeciesInstances(
  binding: SpeciesBinding,
  placements: { x: number; z: number; y: number; scale: number; yaw: number }[],
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = `species-${binding.assetId}`;
  const texLoader = new THREE.TextureLoader();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  for (const slot of binding.slots) {
    const geometry = await loadSlotGeometry(binding.assetId, slot.slot);
    if (!geometry) continue;
    const material = slotMaterial(binding, slot, texLoader);
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    placements.forEach((p, i) => {
      quat.setFromAxisAngle(up, p.yaw);
      matrix.compose(new THREE.Vector3(p.x, p.y, p.z), quat, new THREE.Vector3(p.scale, p.scale, p.scale));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // one draw per species-slot; camera moves far
    group.add(mesh);
  }
  return group;
}

/** Trees/shrubs/rocks/sedges from the scatter plan. */
export async function createVegetation(scatter: ScatterData, field: TerrainField): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "HeartvaleVegetation";

  // Trees grouped by species key.
  const bySpecies = new Map<string, { x: number; z: number; y: number; scale: number; yaw: number }[]>();
  for (const [x, z, species, scale] of scatter.trees) {
    const list = bySpecies.get(species) ?? [];
    list.push({ x, z, y: field.height(x, z) - 0.06, scale, yaw: hashYaw(x, z) });
    bySpecies.set(species, list);
  }
  const jobs: Promise<THREE.Group>[] = [];
  for (const [species, placements] of bySpecies) {
    const binding = TREE_BINDINGS[species];
    if (!binding || placements.length === 0) continue;
    jobs.push(buildSpeciesInstances(binding, placements));
  }

  // Shrubs: variant index picks the binding (two promoted shrub species).
  const shrubBuckets: { x: number; z: number; y: number; scale: number; yaw: number }[][] = [[], []];
  for (const [x, z, variant, scale] of scatter.shrubs) {
    const bucket = shrubBuckets[variant % 2];
    if (bucket) bucket.push({ x, z, y: field.height(x, z) - 0.03, scale, yaw: hashYaw(x, z) });
  }
  shrubBuckets.forEach((placements, i) => {
    const binding = SHRUB_BINDINGS[i];
    if (binding && placements.length > 0) jobs.push(buildSpeciesInstances(binding, placements));
  });

  // Rocks: radius ≥ 0.9 -> boulder, else stone set piece.
  const boulders: { x: number; z: number; y: number; scale: number; yaw: number }[] = [];
  const stones: { x: number; z: number; y: number; scale: number; yaw: number }[] = [];
  for (const [x, z, radius] of scatter.rocks) {
    const target = radius >= 0.9 ? boulders : stones;
    target.push({ x, z, y: field.height(x, z) - radius * 0.18, scale: radius, yaw: hashYaw(x, z) });
  }
  if (boulders.length && ROCK_BINDINGS.boulder) jobs.push(buildSpeciesInstances(ROCK_BINDINGS.boulder, boulders));
  if (stones.length && ROCK_BINDINGS.stone) jobs.push(buildSpeciesInstances(ROCK_BINDINGS.stone, stones));

  const built = await Promise.all(jobs);
  for (const g of built) group.add(g);
  return group;
}

/** Grass clump card geometry: 3 crossed narrow quads, pivot at ground. */
function grassClumpGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  for (let blade = 0; blade < 3; blade += 1) {
    const angle = (blade / 3) * Math.PI;
    const dx = Math.cos(angle) * 0.17; // narrow cards read as tufts, not agave
    const dz = Math.sin(angle) * 0.17;
    const base = blade * 4;
    positions.push(-dx, 0, -dz, dx, 0, dz, -dx, 1, -dz, dx, 1, dz);
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    const nx = -dz;
    const nz = dx;
    for (let k = 0; k < 4; k += 1) normals.push(nx, 0, nz);
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(index);
  return geometry;
}

/** Procedural blade texture — tapered strokes on alpha, harvest-palette. */
function grassBladeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.clearRect(0, 0, 128, 128);
  const rng = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const rand = rng(90421);
  for (let i = 0; i < 14; i += 1) {
    const x0 = 12 + rand() * 104;
    const lean = (rand() - 0.5) * 40;
    const w = 2.0 + rand() * 2.6;
    const shade = 0.75 + rand() * 0.5;
    const grad = ctx.createLinearGradient(0, 128, 0, 0);
    grad.addColorStop(0, `rgba(${Math.round(72 * shade)},${Math.round(88 * shade)},${Math.round(38 * shade)},1)`);
    grad.addColorStop(1, `rgba(${Math.round(148 * shade)},${Math.round(150 * shade)},${Math.round(72 * shade)},1)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x0 - w, 128);
    ctx.quadraticCurveTo(x0 - w * 0.3 + lean * 0.5, 60, x0 + lean, 4 + rand() * 20);
    ctx.quadraticCurveTo(x0 + w * 0.3 + lean * 0.5, 60, x0 + w, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 140k wind-swayed grass clumps from the scatter plan (T2). */
export function createGrassField(scatter: ScatterData, field: TerrainField): THREE.Mesh {
  const clumps = scatter.grassClumps;
  const geometry = grassClumpGeometry();
  const texture = grassBladeTexture();

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0,
  });

  const uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
attribute float aDry;
varying float vDry;
varying float vSplatTip;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
// Wind sway: phase from instance translation, amplitude grows with height.
#ifdef USE_INSTANCING
vec2 iPos = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
float swayPhase = iPos.x * 0.35 + iPos.y * 0.27 + uTime * 1.6;
float swayAmt = position.y * 0.09;
transformed.x += (sin(swayPhase) * 0.7 + sin(swayPhase * 2.33) * 0.3) * swayAmt;
transformed.z += cos(swayPhase * 0.87) * swayAmt * 0.6;
#endif
vDry = aDry;
vSplatTip = position.y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vDry;
varying float vSplatTip;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// Per-instance dry/lush blend + root-to-tip lightening (harvest palette).
vec3 dryTint = vec3(0.98, 0.82, 0.45);
vec3 lushTint = vec3(0.72, 0.92, 0.5);
diffuseColor.rgb *= mix(lushTint, dryTint, vDry) * (0.55 + 0.45 * vSplatTip);`,
      );
  };
  material.customProgramCacheKey = () => "heartvale-grass-v1";

  const mesh = new THREE.InstancedMesh(geometry, material, clumps.length);
  mesh.name = "HeartvaleGrass";
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const dry = new Float32Array(clumps.length);

  clumps.forEach(([x, z, scale, yaw, variant], i) => {
    const y = field.height(x, z);
    quat.setFromAxisAngle(up, yaw);
    const s = scale * 0.85 * (0.55 + 0.45 * ((i * 2654435761) % 1000) / 1000);
    matrix.compose(new THREE.Vector3(x, y - 0.02, z), quat, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, matrix);
    dry[i] = variant === 0 ? 0.85 : 0.12;
  });
  geometry.setAttribute("aDry", new THREE.InstancedBufferAttribute(dry, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  mesh.userData.tick = (elapsed: number) => {
    uniforms.uTime.value = elapsed;
  };
  return mesh;
}
