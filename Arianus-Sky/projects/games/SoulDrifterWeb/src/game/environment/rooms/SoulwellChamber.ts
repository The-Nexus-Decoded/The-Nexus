import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { DungeonProp, DungeonTile } from "../../dungeon";
import { createSoulwellMaterialLibrary, type SoulwellMaterialLibrary } from "../MaterialLibrary";

export interface SoulwellChamberStoryObject {
  id: string;
  grid: { x: number; y: number };
  root: THREE.Object3D;
  kind: DungeonProp["kind"];
}

export interface SoulwellChamberBuild {
  root: THREE.Group;
  floor: THREE.InstancedMesh;
  occluders: THREE.Mesh[];
  storyObjects: SoulwellChamberStoryObject[];
  animate(elapsed: number, delta: number): void;
  dispose(): void;
}

interface BuildOptions {
  tiles: DungeonTile[];
  props: DungeonProp[];
  seed: number;
  tileSize: number;
}

function getSoulwellLibraryMaterials(materials: SoulwellMaterialLibrary): Set<THREE.Material> {
  return new Set([
    materials.flagstone,
    materials.masonry,
    materials.masonryOccluder,
    materials.bronze,
    materials.oak,
    materials.darkIron,
    materials.soulglass,
    materials.soulwater,
    materials.moss,
    materials.ash,
    ...materials.tomes,
    materials.void,
  ]);
}

export function disposeSoulwellChamberResources(
  root: THREE.Object3D,
  materials: SoulwellMaterialLibrary,
): void {
  const libraryMaterials = getSoulwellLibraryMaterials(materials);
  const geometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (
      child instanceof THREE.Mesh
      || child instanceof THREE.Line
      || child instanceof THREE.Points
    ) {
      geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        if (!libraryMaterials.has(material)) ownedMaterials.add(material);
      });
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  ownedMaterials.forEach((material) => material.dispose());
  materials.dispose();
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function archPanel(
  width: number,
  height: number,
  depth: number,
  openingWidth: number,
  openingHeight: number,
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-openingWidth / 2, 0);
  opening.lineTo(openingWidth / 2, 0);
  opening.lineTo(openingWidth / 2, openingHeight);
  opening.absarc(0, openingHeight, openingWidth / 2, 0, Math.PI, false);
  opening.lineTo(-openingWidth / 2, 0);
  shape.holes.push(opening);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.05,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addInteractId(root: THREE.Object3D, id: string): void {
  root.traverse((child) => {
    child.userData.interactId = id;
  });
}

function buildCoffer(materials: SoulwellMaterialLibrary): THREE.Group {
  const root = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.72, 0.95, 3, 0.09), materials.oak);
  base.position.y = 0.4;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.44, 1.02, 4, 0.16), materials.oak);
  lid.name = "coffer-lid";
  lid.position.y = 0.92;
  const bandGeometry = new RoundedBoxGeometry(0.16, 1.18, 1.06, 2, 0.025);
  const leftBand = new THREE.Mesh(bandGeometry, materials.darkIron);
  const rightBand = leftBand.clone();
  leftBand.position.x = -0.48;
  rightBand.position.x = 0.48;
  leftBand.position.y = rightBand.position.y = 0.56;
  const lock = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.38, 0.12, 2, 0.025), materials.bronze);
  lock.position.set(0, 0.66, 0.55);
  root.add(base, lid, leftBand, rightBand, lock);
  return root;
}

function buildMemoryLoom(materials: SoulwellMaterialLibrary): {
  root: THREE.Group;
  core: THREE.Mesh;
  rings: THREE.Mesh[];
} {
  const root = new THREE.Group();
  root.name = "memory-loom";
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.08, 0.46, 12), materials.masonry);
  plinth.position.y = 0.23;
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.82, 0.34, 12), materials.bronze);
  step.position.y = 0.56;
  const cradle = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.14, 0.62, 2, 0.04), materials.darkIron);
  cradle.position.y = 0.84;
  cradle.rotation.x = -0.17;
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), materials.soulglass);
  core.position.y = 1.82;
  core.scale.set(0.72, 1.28, 0.72);
  core.userData.floatBase = 1.82;
  root.userData.animatedOrb = core;
  const rings = [0.58, 0.82, 1.04].map((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035 + index * 0.008, 8, 42), index === 1 ? materials.bronze : materials.soulglass);
    ring.position.y = 1.8;
    ring.rotation.set(index === 0 ? Math.PI / 2 : 0.45 + index * 0.34, index * 0.78, index * 0.35);
    return ring;
  });
  const arms = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.15, 1.9, 0.15, 2, 0.025), materials.darkIron);
    arm.position.set(side * 0.86, 1.08, 0);
    arm.rotation.z = side * -0.28;
    arms.add(arm);
  }
  const light = new THREE.PointLight(0x70eee1, 4.8, 7.5, 2);
  light.position.y = 1.95;
  root.add(plinth, step, cradle, arms, core, ...rings, light);
  return { root, core, rings };
}

function buildTrainingEffigy(materials: SoulwellMaterialLibrary): THREE.Group {
  const root = new THREE.Group();
  root.name = "battered-training-effigy";
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.88, 0.28, 10), materials.masonry);
  foot.position.y = 0.14;
  const post = new THREE.Mesh(new RoundedBoxGeometry(0.28, 2.55, 0.28, 2, 0.035), materials.oak);
  post.position.y = 1.47;
  post.rotation.z = -0.035;
  const crossbar = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.25, 0.25, 2, 0.035), materials.oak);
  crossbar.position.set(0, 2.16, 0);
  crossbar.rotation.z = 0.08;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.12, 8), materials.darkIron);
  torso.position.y = 1.55;
  torso.rotation.z = -0.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), materials.masonry);
  head.scale.set(0.85, 1.1, 0.8);
  head.position.set(-0.04, 2.55, 0);
  const target = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.045, 6, 24), materials.bronze);
  target.position.set(0, 1.62, 0.53);
  const slashMaterial = materials.soulglass.clone();
  slashMaterial.color.setHex(0xe46c4a);
  slashMaterial.emissive.setHex(0x7d2119);
  slashMaterial.emissiveIntensity = 0.9;
  for (const offset of [-0.14, 0.08, 0.27]) {
    const scar = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.54, 0.035, 1, 0.01), slashMaterial);
    scar.position.set(offset, 1.62 + offset * 0.3, 0.58);
    scar.rotation.z = -0.58;
    root.add(scar);
  }
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 10), materials.bronze);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(0.76, 1.75, -0.05);
  shield.rotation.z = 0.24;
  root.add(foot, post, crossbar, torso, head, target, shield);
  return root;
}

function buildSoulwell(materials: SoulwellMaterialLibrary): {
  root: THREE.Group;
  water: THREE.Mesh;
  shard: THREE.Mesh;
  ripples: THREE.Mesh[];
} {
  const root = new THREE.Group();
  const excavation = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.7, 0.34, 64), materials.masonry);
  excavation.position.y = -0.12;
  const stoneApron = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.75, 64), materials.flagstone);
  stoneApron.rotation.x = -Math.PI / 2;
  stoneApron.position.y = 0.035;
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.2, 12, 64), materials.masonry);
  outerRim.rotation.x = Math.PI / 2;
  outerRim.position.y = 0.11;
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.075, 10, 64), materials.bronze);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = 0.075;
  const depth = new THREE.Mesh(new THREE.CircleGeometry(2.08, 64), materials.void);
  depth.rotation.x = -Math.PI / 2;
  depth.position.y = -0.24;
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x063f4b) },
      uGlow: { value: new THREE.Color(0x43e9e0) },
      uHighlight: { value: new THREE.Color(0xc5fff8) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 displaced = position;
        float radial = length(uv - 0.5);
        float envelope = 1.0 - smoothstep(0.28, 0.52, radial);
        float crossing = sin(position.x * 3.1 + uTime * 1.65) + cos(position.y * 4.4 - uTime * 1.28);
        float rings = sin(radial * 52.0 - uTime * 3.0);
        vWave = crossing * 0.5 + rings * 0.5;
        displaced.z += vWave * 0.035 * envelope;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uGlow;
      uniform vec3 uHighlight;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        float radial = length(vUv - 0.5);
        float causticA = sin((vUv.x + vUv.y) * 34.0 + uTime * 1.7);
        float causticB = cos((vUv.x - vUv.y) * 29.0 - uTime * 1.35);
        float caustics = smoothstep(0.7, 1.72, causticA + causticB + vWave * 0.55);
        float centerGlow = 1.0 - smoothstep(0.04, 0.52, radial);
        float edge = smoothstep(0.33, 0.51, radial);
        vec3 color = mix(uDeep, uGlow, 0.34 + centerGlow * 0.48);
        color += uHighlight * caustics * 0.42;
        color += uGlow * edge * 0.18;
        gl_FragColor = vec4(color, 0.79 + caustics * 0.13);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.08, 96), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.065;
  water.renderOrder = 4;
  const ripples = [0.62, 1.16, 1.68].map((radius, index) => {
    const material = materials.soulglass.clone();
    material.opacity = 0.3 - index * 0.045;
    material.depthWrite = false;
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 64), material);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.y = 0.082 + index * 0.006;
    return ripple;
  });
  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 1), materials.soulglass);
  shard.scale.set(0.62, 1.58, 0.74);
  shard.position.y = 1.8;
  shard.userData.floatBase = 1.8;
  root.userData.animatedOrb = shard;

  const supportGeometry = new RoundedBoxGeometry(0.18, 2.85, 0.18, 2, 0.03);
  const beamGeometry = new RoundedBoxGeometry(3.1, 0.17, 0.18, 2, 0.03);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(supportGeometry, materials.darkIron);
    post.position.set(side * 1.48, 2.32, 0);
    post.rotation.z = side * -0.13;
    root.add(post);
  }
  const beam = new THREE.Mesh(beamGeometry, materials.darkIron);
  beam.position.y = 3.72;
  const chainGeometry = new THREE.TorusGeometry(0.1, 0.022, 6, 12);
  const chains = new THREE.InstancedMesh(chainGeometry, materials.bronze, 8);
  for (let link = 0; link < 8; link += 1) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0, 3.52 - link * 0.16, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, link % 2 === 0 ? 0 : Math.PI / 2, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    chains.setMatrixAt(link, matrix);
  }
  chains.instanceMatrix.needsUpdate = true;
  root.add(excavation, stoneApron, outerRim, innerRim, depth, water, ...ripples, shard, beam, chains);
  const light = new THREE.PointLight(0x66eee3, 8.6, 12.5, 1.75);
  light.position.y = 1.35;
  root.add(light);
  return { root, water, shard, ripples };
}

export async function buildSoulwellChamber(options: BuildOptions): Promise<SoulwellChamberBuild> {
  const { tiles, props, seed, tileSize } = options;
  const root = new THREE.Group();
  root.name = "authored-soulwell-chamber";
  const materials = await createSoulwellMaterialLibrary(seed);
  const random = seeded(seed ^ 0xa11ce);
  const chamberWidth = Math.max(...tiles.map((tile) => tile.x)) + 1;
  const chamberHeight = Math.max(...tiles.map((tile) => tile.y)) + 1;
  const roomCenterX = (chamberWidth - 1) * tileSize * 0.5;
  const roomCenterZ = (chamberHeight - 1) * tileSize * 0.5;

  // The old 0.96 scale exposed black gutters between every logical tile and
  // made the chamber read like a board-game grid. Slight overlap keeps the
  // navigation grid invisible while the PBR texture supplies real stone seams.
  const floorGeometry = new RoundedBoxGeometry(tileSize * 1.008, 0.28, tileSize * 1.008, 2, 0.055);
  const floor = new THREE.InstancedMesh(floorGeometry, materials.flagstone, tiles.length);
  floor.name = "authored-flagstone-floor";
  floor.receiveShadow = true;
  floor.userData.tileLookup = tiles.map((tile) => ({ x: tile.x, y: tile.y }));
  const matrix = new THREE.Matrix4();
  tiles.forEach((tile, index) => {
    const lift = ((tile.x * 17 + tile.y * 31 + seed) % 5) * 0.012;
    matrix.compose(
      new THREE.Vector3(tile.x * tileSize, -0.14 + lift, tile.y * tileSize),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(
        0,
        ((tile.x * 3 + tile.y + seed) % 4) * (Math.PI / 2) + (((tile.x + tile.y) % 3) - 1) * 0.006,
        0,
      )),
      new THREE.Vector3(1, 1, 1),
    );
    floor.setMatrixAt(index, matrix);
    floor.setColorAt(index, new THREE.Color(0x81918e).offsetHSL(0, 0, (random() - 0.5) * 0.12));
  });
  floor.instanceMatrix.needsUpdate = true;
  floor.instanceColor!.needsUpdate = true;
  root.add(floor);

  const undercroft = new THREE.Mesh(new THREE.BoxGeometry(chamberWidth * tileSize + 1.2, 2.8, chamberHeight * tileSize + 1.2), materials.void);
  undercroft.position.set(roomCenterX, -1.68, roomCenterZ);
  root.add(undercroft);

  const brickGeometry = new RoundedBoxGeometry(1.52, 0.72, 0.48, 2, 0.055);
  const brickTransforms: THREE.Matrix4[] = [];
  const addBrickRun = (axis: "x" | "z", fixed: number, from: number, to: number, rows: number): void => {
    for (let row = 0; row < rows; row += 1) {
      for (let value = from; value <= to; value += 1) {
        const offset = row % 2 === 0 ? 0 : tileSize * 0.46;
        const position = axis === "x"
          ? new THREE.Vector3(value * tileSize + offset, 0.38 + row * 0.7, fixed)
          : new THREE.Vector3(fixed, 0.38 + row * 0.7, value * tileSize + offset);
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, axis === "z" ? Math.PI / 2 : 0, 0));
        const scale = new THREE.Vector3(0.92 + random() * 0.08, 0.9 + random() * 0.1, 1);
        brickTransforms.push(new THREE.Matrix4().compose(position, rotation, scale));
      }
    }
  };
  addBrickRun("x", -tileSize * 0.53, 2, chamberWidth - 3, 6);
  addBrickRun("z", -tileSize * 0.53, 2, chamberHeight - 3, 5);
  addBrickRun("z", (chamberWidth - 0.47) * tileSize, 0, 4, 5);
  addBrickRun("z", (chamberWidth - 0.47) * tileSize, 10, chamberHeight - 1, 5);
  addBrickRun("x", (chamberHeight - 0.47) * tileSize, 2, 5, 2);
  addBrickRun("x", (chamberHeight - 0.47) * tileSize, chamberWidth - 6, chamberWidth - 3, 2);
  const brickWall = new THREE.InstancedMesh(brickGeometry, materials.masonry, brickTransforms.length);
  brickTransforms.forEach((transform, index) => brickWall.setMatrixAt(index, transform));
  brickWall.instanceMatrix.needsUpdate = true;
  brickWall.castShadow = true;
  brickWall.receiveShadow = true;
  root.add(brickWall);

  const shrine = archPanel(4.1, 4.6, 0.48, 2.7, 1.85, materials.masonry);
  shrine.position.set(6 * tileSize, 2.12, -tileSize * 0.32);
  const shrineRelief = new THREE.Group();
  shrineRelief.position.set(6 * tileSize, 2.4, 0.03);
  for (let ring = 0; ring < 3; ring += 1) {
    const relief = new THREE.Mesh(new THREE.TorusGeometry(0.42 + ring * 0.23, 0.035, 8, 28), ring === 1 ? materials.soulglass : materials.bronze);
    relief.position.z = 0.18 + ring * 0.01;
    shrineRelief.add(relief);
  }
  root.add(shrine, shrineRelief);

  // Furniture is supplied by the imported dungeon kit. Keeping these sockets
  // out of the structural chamber prevents primitive shelves and tables from
  // overlapping the authored GLBs selected by the semantic placement planner.

  const storyObjects: SoulwellChamberStoryObject[] = [];
  const wellProp = props.find((prop) => prop.kind === "soul-well")!;
  const soulwell = buildSoulwell(materials);
  soulwell.root.position.set(wellProp.x * tileSize, 0, wellProp.y * tileSize);
  addInteractId(soulwell.root, wellProp.id);
  soulwell.root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = child !== soulwell.water;
      child.receiveShadow = true;
    }
  });
  root.add(soulwell.root);
  storyObjects.push({ id: wellProp.id, grid: { x: wellProp.x, y: wellProp.y }, root: soulwell.root, kind: "soul-well" });

  const chestProp = props.find((prop) => prop.kind === "chest")!;
  const coffer = buildCoffer(materials);
  coffer.position.set(chestProp.x * tileSize, 0, chestProp.y * tileSize);
  coffer.rotation.y = -0.42;
  addInteractId(coffer, chestProp.id);
  coffer.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  root.add(coffer);
  storyObjects.push({ id: chestProp.id, grid: { x: chestProp.x, y: chestProp.y }, root: coffer, kind: "chest" });

  const loomProp = props.find((prop) => prop.kind === "memory-loom")!;
  const loom = buildMemoryLoom(materials);
  loom.root.position.set(loomProp.x * tileSize, 0, loomProp.y * tileSize);
  loom.root.rotation.y = 0.32;
  addInteractId(loom.root, loomProp.id);
  loom.root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  root.add(loom.root);
  storyObjects.push({ id: loomProp.id, grid: { x: loomProp.x, y: loomProp.y }, root: loom.root, kind: "memory-loom" });

  const effigyProp = props.find((prop) => prop.kind === "training-effigy")!;
  const effigy = buildTrainingEffigy(materials);
  effigy.position.set(effigyProp.x * tileSize, 0, effigyProp.y * tileSize);
  effigy.rotation.y = -0.55;
  addInteractId(effigy, effigyProp.id);
  effigy.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  root.add(effigy);
  storyObjects.push({ id: effigyProp.id, grid: { x: effigyProp.x, y: effigyProp.y }, root: effigy, kind: "training-effigy" });

  const gateProps = props.filter((prop) => prop.kind === "gate");
  gateProps.forEach((gateProp) => {
    const gateRoot = new THREE.Group();
    const hard = gateProp.id.includes("oathbreaker");
    const archMaterial = materials.masonry.clone();
    archMaterial.emissive = new THREE.Color(hard ? 0x48150f : 0x0d514e);
    archMaterial.emissiveIntensity = 0.2;
    const exitArch = archPanel(2.8, 5.65, 0.72, 1.68, 2.48, archMaterial);
    exitArch.rotation.y = Math.PI / 2;
    exitArch.position.set((chamberWidth - 0.45) * tileSize, 2.52, gateProp.y * tileSize);
    const veilMaterial = new THREE.MeshBasicMaterial({
      color: hard ? 0xd65337 : 0x58d8cf,
      transparent: true,
      opacity: hard ? 0.2 : 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const doorVeil = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 2.38, 18, 12), veilMaterial);
    doorVeil.name = "trial-door-veil";
    doorVeil.rotation.y = Math.PI / 2;
    doorVeil.position.set((chamberWidth - 0.77) * tileSize, 1.43, gateProp.y * tileSize);
    const portcullis = new THREE.Group();
    portcullis.name = "trial-portcullis";
    portcullis.position.set((chamberWidth - 0.8) * tileSize, 1.35, gateProp.y * tileSize);
    for (const offset of [-0.58, -0.29, 0, 0.29, 0.58]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.12), materials.darkIron);
      bar.position.z = offset;
      bar.castShadow = true;
      portcullis.add(bar);
    }
    for (const railY of [-0.86, 0.1, 0.86]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 1.48), hard ? materials.bronze : materials.darkIron);
      rail.position.y = railY;
      rail.castShadow = true;
      portcullis.add(rail);
    }
    const threshold = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.7, 28, 1, 0, Math.PI), hard ? materials.bronze : materials.soulglass);
    threshold.rotation.x = -Math.PI / 2;
    threshold.rotation.z = Math.PI / 2;
    threshold.position.set((chamberWidth - 1.15) * tileSize, 0.07, gateProp.y * tileSize);
    const seal = new THREE.Mesh(hard ? new THREE.OctahedronGeometry(0.22, 0) : new THREE.IcosahedronGeometry(0.2, 0), hard ? materials.bronze : materials.soulglass);
    seal.position.set((chamberWidth - 1.05) * tileSize, 2.85, gateProp.y * tileSize);
    seal.userData.floatBase = 2.85;
    gateRoot.userData.animatedOrb = seal;
    addInteractId(exitArch, gateProp.id);
    addInteractId(doorVeil, gateProp.id);
    addInteractId(portcullis, gateProp.id);
    addInteractId(threshold, gateProp.id);
    addInteractId(seal, gateProp.id);
    const doorLight = new THREE.PointLight(hard ? 0xe05a39 : 0x5de1d6, hard ? 2.2 : 1.7, 5.5, 2);
    doorLight.position.set((chamberWidth - 1.25) * tileSize, 2.1, gateProp.y * tileSize);
    gateRoot.add(exitArch, doorVeil, portcullis, threshold, seal, doorLight);
    root.add(gateRoot);
    storyObjects.push({ id: gateProp.id, grid: { x: gateProp.x, y: gateProp.y }, root: gateRoot, kind: "gate" });
  });

  // Four scarred columns define distinct activity bays without shrinking the
  // walkable room. Their broken upper drums and rubble sell an ancient lock
  // that has survived repeated realm breaches.
  const pillarPlacements = [
    { x: 0.58, z: 2.1, broken: true },
    { x: 0.58, z: 11.4, broken: false },
    { x: 14.45, z: 2.2, broken: false },
    { x: 14.25, z: 11.7, broken: true },
  ];
  pillarPlacements.forEach((placement, index) => {
    const pillar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.34, 10), materials.masonry);
    base.position.y = 0.17;
    const shaftHeight = placement.broken ? 2.25 : 3.85;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.6, shaftHeight, 10), materials.masonry);
    shaft.position.y = 0.34 + shaftHeight * 0.5;
    shaft.rotation.z = placement.broken ? (index % 2 === 0 ? 0.08 : -0.07) : 0;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.08, 7, 24), materials.bronze);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = placement.broken ? 1.45 : 2.45;
    pillar.add(base, shaft, collar);
    if (placement.broken) {
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 9), materials.masonry);
      fallen.rotation.z = Math.PI / 2.25;
      fallen.rotation.y = index * 0.7;
      fallen.position.set(index % 2 === 0 ? 0.9 : -0.8, 0.48, 0.42);
      pillar.add(fallen);
    }
    pillar.position.set(placement.x * tileSize, 0, placement.z * tileSize);
    pillar.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    root.add(pillar);
  });

  // Realm-memory reliefs are not modern framed pictures: they are bronze and
  // soulglass machine records of fire, sea, stone, and air realms.
  const muralColors = [0xe16a42, 0x4b9cc2, 0xb7a064, 0x8bd6c8];
  const muralX = [4.25, 7.2, 10.15, 13.1];
  muralX.forEach((x, index) => {
    const panel = new THREE.Group();
    const backing = new THREE.Mesh(new RoundedBoxGeometry(2.65, 1.75, 0.18, 3, 0.08), materials.darkIron);
    const fieldMaterial = materials.tomes[index % materials.tomes.length]!.clone();
    fieldMaterial.color.setHex(muralColors[index]!);
    fieldMaterial.emissive.setHex(muralColors[index]!);
    fieldMaterial.emissiveIntensity = 0.24;
    const field = new THREE.Mesh(new RoundedBoxGeometry(2.28, 1.38, 0.12, 3, 0.06), fieldMaterial);
    field.position.z = 0.14;
    const world = new THREE.Mesh(index === 2
      ? new THREE.ConeGeometry(0.44, 0.82, 7)
      : new THREE.SphereGeometry(0.4, 16, 10), materials.soulglass);
    world.scale.set(1, index === 1 ? 0.55 : 1, 0.35);
    world.position.set(-0.42, 0.05, 0.26);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 30), materials.bronze);
    orbit.position.set(-0.42, 0.05, 0.3);
    orbit.rotation.x = 0.45 + index * 0.18;
    const fracture = new THREE.Mesh(new RoundedBoxGeometry(0.055, 1.02, 0.05, 1, 0.01), materials.soulglass);
    fracture.position.set(0.62, 0, 0.3);
    fracture.rotation.z = -0.35 + index * 0.19;
    panel.add(backing, field, world, orbit, fracture);
    panel.position.set(x * tileSize, 3.25, -tileSize * 0.31);
    root.add(panel);
  });

  // Cracked conduits visibly carry power between the Memory Loom, Soul Well,
  // and paired doors. They make the chamber read as machinery with a purpose.
  const conduitCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(loomProp.x * tileSize, 0.09, loomProp.y * tileSize),
      new THREE.Vector3(4.3 * tileSize, 0.09, 8.1 * tileSize),
      new THREE.Vector3(wellProp.x * tileSize, 0.09, wellProp.y * tileSize),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3((wellProp.x + 1.8) * tileSize, 0.09, wellProp.y * tileSize),
      new THREE.Vector3(10.3 * tileSize, 0.09, 7.0 * tileSize),
      new THREE.Vector3((chamberWidth - 0.9) * tileSize, 0.09, 7.0 * tileSize),
    ]),
  ];
  conduitCurves.forEach((curve, index) => {
    const conduit = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.035 + index * 0.01, 6, false), index === 0 ? materials.soulglass : materials.bronze);
    conduit.receiveShadow = true;
    root.add(conduit);
  });

  // One combined line mesh creates sagging cobwebs in the undisturbed corners.
  const webPoints: number[] = [];
  const addWeb = (origin: THREE.Vector3, mirror: number): void => {
    const anchors = [
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.6 * mirror, 0, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.45, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.25 * mirror, -1.1, 0),
      new THREE.Vector3(0.42 * mirror, -0.36, 0), new THREE.Vector3(1.18 * mirror, -0.35, 0),
      new THREE.Vector3(0.22 * mirror, -0.72, 0), new THREE.Vector3(0.82 * mirror, -1.08, 0),
    ];
    anchors.forEach((point) => webPoints.push(point.x + origin.x, point.y + origin.y, point.z + origin.z));
  };
  addWeb(new THREE.Vector3(0.15 * tileSize, 4.7, 0.08 * tileSize), 1);
  addWeb(new THREE.Vector3((chamberWidth - 0.18) * tileSize, 4.55, 0.12 * tileSize), -1);
  const webGeometry = new THREE.BufferGeometry();
  webGeometry.setAttribute("position", new THREE.Float32BufferAttribute(webPoints, 3));
  const webMaterial = new THREE.LineBasicMaterial({ color: 0xc6d0cc, transparent: true, opacity: 0.32, depthWrite: false });
  const webs = new THREE.LineSegments(webGeometry, webMaterial);
  root.add(webs);

  const lampGeometry = new THREE.OctahedronGeometry(0.18, 0);
  const lampPositions = [
    [2.2, 2.7, 0.2], [7.8, 2.7, 0.2], [12.7, 2.7, 0.2], [0.18, 2.45, 3.2], [0.18, 2.45, 9.6], [14.9, 2.5, 3.2], [14.9, 2.5, 10.4],
  ];
  const lamps = new THREE.InstancedMesh(lampGeometry, materials.soulglass, lampPositions.length);
  lampPositions.forEach(([x, y, z], index) => {
    const position = new THREE.Vector3(x! * tileSize, y!, z! * tileSize);
    lamps.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
    if (index % 2 === 0) {
      const light = new THREE.PointLight(0x5ddbd4, 1.2, 4.8, 2);
      light.position.copy(position);
      root.add(light);
    }
  });
  lamps.instanceMatrix.needsUpdate = true;
  root.add(lamps);

  const debrisGeometry = new THREE.DodecahedronGeometry(0.18, 0);
  const stoneDebrisMatrices: THREE.Matrix4[] = [];
  const mossDebrisMatrices: THREE.Matrix4[] = [];
  for (let index = 0; index < 22; index += 1) {
    const south = index % 2 === 0;
    const position = new THREE.Vector3(
      (south ? 2.1 + random() * 7.7 : 0.35 + random() * 0.7) * tileSize,
      0.12 + random() * 0.13,
      (south ? 9.75 + random() * 0.7 : 2 + random() * 6.8) * tileSize,
    );
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 2, random() * 2, random() * 2));
    const scale = 0.7 + random() * 1.4;
    const transform = new THREE.Matrix4().compose(position, rotation, new THREE.Vector3(scale, scale, scale));
    (index % 5 === 0 ? mossDebrisMatrices : stoneDebrisMatrices).push(transform);
  }
  for (const [matrices, material] of [[stoneDebrisMatrices, materials.masonry], [mossDebrisMatrices, materials.moss]] as const) {
    const debris = new THREE.InstancedMesh(debrisGeometry, material, matrices.length);
    matrices.forEach((matrix, index) => debris.setMatrixAt(index, matrix));
    debris.instanceMatrix.needsUpdate = true;
    debris.castShadow = true;
    debris.receiveShadow = true;
    root.add(debris);
  }

  const motePositions = new Float32Array(130 * 3);
  for (let index = 0; index < 130; index += 1) {
    motePositions[index * 3] = random() * chamberWidth * tileSize;
    motePositions[index * 3 + 1] = 0.3 + random() * 5.2;
    motePositions[index * 3 + 2] = random() * chamberHeight * tileSize;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = new THREE.PointsMaterial({ color: 0x87d8cf, size: 0.035, transparent: true, opacity: 0.32, depthWrite: false });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  root.add(motes);

  return {
    root,
    floor,
    occluders: [],
    storyObjects,
    animate: (elapsed, delta) => {
      soulwell.shard.position.y = soulwell.shard.userData.floatBase + Math.sin(elapsed * 1.55) * 0.12;
      soulwell.shard.rotation.y += delta * 0.48;
      (soulwell.water.material as THREE.ShaderMaterial).uniforms.uTime!.value = elapsed;
      soulwell.ripples.forEach((ripple, index) => {
        const pulse = (elapsed * (0.22 + index * 0.05)) % 1;
        ripple.scale.setScalar(0.82 + pulse * 0.38);
        (ripple.material as THREE.MeshPhysicalMaterial).opacity = (0.32 - index * 0.06) * (1 - pulse);
      });
      loom.rings.forEach((ring, index) => {
        ring.rotation.y += delta * (index % 2 === 0 ? 0.38 : -0.31);
        ring.rotation.z += delta * (0.12 + index * 0.035);
      });
      motes.rotation.y += delta * 0.009;
    },
    dispose: () => {
      disposeSoulwellChamberResources(root, materials);
    },
  };
}
