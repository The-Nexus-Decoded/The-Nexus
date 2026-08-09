import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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

function buildShelf(materials: SoulwellMaterialLibrary, seed: number): THREE.Group {
  const root = new THREE.Group();
  const frameGeometry = new RoundedBoxGeometry(0.16, 2.35, 0.34, 2, 0.035);
  const shelfGeometry = new RoundedBoxGeometry(1.55, 0.12, 0.42, 2, 0.025);
  const frameParts: THREE.BufferGeometry[] = [];
  for (const x of [-0.76, 0.76]) {
    const part = frameGeometry.clone();
    part.translate(x, 1.18, 0);
    frameParts.push(part);
  }
  for (let level = 0; level < 4; level += 1) {
    const part = shelfGeometry.clone();
    part.translate(0, 0.18 + level * 0.67, 0);
    frameParts.push(part);
  }
  const mergedFrameGeometry = mergeGeometries(frameParts, false)!;
  frameParts.forEach((geometry) => geometry.dispose());
  frameGeometry.dispose();
  shelfGeometry.dispose();
  const frame = new THREE.Mesh(mergedFrameGeometry, materials.oak);
  frame.castShadow = true;
  frame.receiveShadow = true;
  root.add(frame);

  const random = seeded(seed);
  const bookGeometry = new RoundedBoxGeometry(0.12, 0.42, 0.24, 1, 0.015);
  const bookMatrices: THREE.Matrix4[][] = materials.tomes.map(() => []);
  for (let level = 0; level < 3; level += 1) {
    for (let book = 0; book < 8; book += 1) {
      const materialIndex = (book + level) % materials.tomes.length;
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(-0.63 + book * 0.18, 0.43 + level * 0.67, 0.01),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (random() - 0.5) * 0.08)),
        new THREE.Vector3(1, 0.78 + random() * 0.34, 1),
      );
      bookMatrices[materialIndex]!.push(matrix);
    }
  }
  bookMatrices.forEach((matrices, materialIndex) => {
    const books = new THREE.InstancedMesh(bookGeometry, materials.tomes[materialIndex]!, matrices.length);
    matrices.forEach((matrix, index) => books.setMatrixAt(index, matrix));
    books.instanceMatrix.needsUpdate = true;
    books.castShadow = true;
    books.receiveShadow = true;
    root.add(books);
  });
  root.userData.disposableGeometries = [mergedFrameGeometry, bookGeometry];
  return root;
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

function buildRealmBrazier(materials: SoulwellMaterialLibrary, ember = false): { root: THREE.Group; flame: THREE.Mesh } {
  const root = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 0.22, 10), materials.masonry);
  base.position.y = 0.11;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 1.05, 8), materials.darkIron);
  stem.position.y = 0.72;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.24, 0.3, 12), materials.bronze);
  bowl.position.y = 1.34;
  const flameMaterial = materials.soulglass.clone();
  flameMaterial.color.setHex(ember ? 0xff7047 : 0x64e7dc);
  flameMaterial.emissive.setHex(ember ? 0xb42a18 : 0x1b9e96);
  flameMaterial.emissiveIntensity = 2.8;
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), flameMaterial);
  flame.scale.set(0.75, 1.45, 0.75);
  flame.position.y = 1.77;
  flame.userData.flame = true;
  const light = new THREE.PointLight(ember ? 0xff6d45 : 0x62e6db, 3.2, 6.5, 2);
  light.position.y = 1.8;
  root.add(base, stem, bowl, flame, light);
  return { root, flame };
}

function buildSoulwell(materials: SoulwellMaterialLibrary): {
  root: THREE.Group;
  water: THREE.Mesh;
  shard: THREE.Mesh;
  ripples: THREE.Mesh[];
} {
  const root = new THREE.Group();
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.6, 0.42, 48), materials.masonry);
  lower.position.y = 0.21;
  const middle = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.28, 0.38, 48), materials.flagstone);
  middle.position.y = 0.57;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 2.02, 0.52, 64, 1, true), materials.masonry);
  basin.position.y = 0.94;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.18, 12, 64), materials.bronze);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.2;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), materials.soulwater);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.16;
  const ripples = [0.7, 1.25].map((radius, index) => {
    const material = materials.soulglass.clone();
    material.opacity = 0.34 - index * 0.08;
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 8, 64), material);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.y = 1.19 + index * 0.012;
    return ripple;
  });
  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 1), materials.soulglass);
  shard.scale.set(0.62, 1.58, 0.74);
  shard.position.y = 2.62;
  shard.userData.floatBase = 2.62;
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
  root.add(lower, middle, basin, rim, water, ...ripples, shard, beam, chains);
  const light = new THREE.PointLight(0x66eee3, 7.5, 11, 1.8);
  light.position.y = 2.1;
  root.add(light);
  return { root, water, shard, ripples };
}

export async function buildSoulwellChamber(options: BuildOptions): Promise<SoulwellChamberBuild> {
  const { tiles, props, seed, tileSize } = options;
  const root = new THREE.Group();
  root.name = "authored-soulwell-chamber";
  const materials = await createSoulwellMaterialLibrary(seed);
  const random = seeded(seed ^ 0xa11ce);
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const chamberWidth = Math.max(...tiles.map((tile) => tile.x)) + 1;
  const chamberHeight = Math.max(...tiles.map((tile) => tile.y)) + 1;
  const roomCenterX = (chamberWidth - 1) * tileSize * 0.5;
  const roomCenterZ = (chamberHeight - 1) * tileSize * 0.5;

  // The old 0.96 scale exposed black gutters between every logical tile and
  // made the chamber read like a board-game grid. Slight overlap keeps the
  // navigation grid invisible while the PBR texture supplies real stone seams.
  const floorGeometry = new RoundedBoxGeometry(tileSize * 1.008, 0.28, tileSize * 1.008, 2, 0.055);
  disposableGeometries.push(floorGeometry);
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
  disposableGeometries.push(brickGeometry);
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

  const shelfPlacements = [
    { x: 2.8, z: 0.12 },
    { x: 9.3, z: 0.12 },
    { x: 12.4, z: 0.12 },
    { x: 0.08, z: 4.1, y: Math.PI / 2 },
  ];
  shelfPlacements.forEach((placement, index) => {
    const shelf = buildShelf(materials, seed + index * 101);
    shelf.position.set(placement.x * tileSize, 0, placement.z * tileSize);
    shelf.rotation.y = placement.y ?? 0;
    shelf.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    root.add(shelf);
  });

  const tableGeometry = new RoundedBoxGeometry(2.15, 0.16, 0.9, 2, 0.035);
  const legGeometry = new RoundedBoxGeometry(0.16, 0.86, 0.16, 2, 0.025);
  disposableGeometries.push(tableGeometry, legGeometry);
  for (const placement of [{ x: 11.2, z: 2.3 }, { x: 1.7, z: 10.1 }, { x: 12.8, z: 11.2 }]) {
    const table = new THREE.Group();
    const tableParts: THREE.BufferGeometry[] = [];
    const top = tableGeometry.clone();
    top.translate(0, 0.92, 0);
    tableParts.push(top);
    for (const x of [-0.82, 0.82]) for (const z of [-0.3, 0.3]) {
      const leg = legGeometry.clone();
      leg.translate(x, 0.45, z);
      tableParts.push(leg);
    }
    const tableMesh = new THREE.Mesh(mergeGeometries(tableParts, false)!, materials.oak);
    tableParts.forEach((geometry) => geometry.dispose());
    table.add(tableMesh);
    table.position.set(placement.x * tileSize, 0, placement.z * tileSize);
    table.rotation.y = placement.x > 5 ? -0.18 : 0.32;
    tableMesh.castShadow = true;
    tableMesh.receiveShadow = true;
    root.add(table);
  }

  const storyObjects: SoulwellChamberStoryObject[] = [];
  const wellProp = props.find((prop) => prop.kind === "soul-well")!;
  const soulwell = buildSoulwell(materials);
  soulwell.root.position.set(wellProp.x * tileSize, 0, wellProp.y * tileSize);
  addInteractId(soulwell.root, wellProp.id);
  soulwell.root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
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

  const ambientFlames: THREE.Mesh[] = [];
  [
    { x: 2.1, z: 6.1, ember: false },
    { x: 9.6, z: 2.0, ember: false },
    { x: 13.5, z: 6.95, ember: true },
    { x: 9.6, z: 11.8, ember: true },
  ].forEach((placement) => {
    const brazier = buildRealmBrazier(materials, placement.ember);
    brazier.root.position.set(placement.x * tileSize, 0, placement.z * tileSize);
    root.add(brazier.root);
    ambientFlames.push(brazier.flame);
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
    disposableGeometries.push(conduit.geometry);
    conduit.receiveShadow = true;
    root.add(conduit);
  });

  // Abandoned coffers and untouched dust explain why the useful starter cache
  // is exceptional rather than making the hub look freshly furnished.
  for (const placement of [{ x: 1.25, z: 12.25, r: 0.28 }, { x: 13.65, z: 12.55, r: -0.5 }]) {
    const emptyCoffer = buildCoffer(materials);
    const lid = emptyCoffer.children[1];
    if (lid) {
      lid.rotation.x = -0.72;
      lid.position.y += 0.18;
      lid.position.z -= 0.18;
    }
    emptyCoffer.scale.setScalar(0.78);
    emptyCoffer.position.set(placement.x * tileSize, 0, placement.z * tileSize);
    emptyCoffer.rotation.y = placement.r;
    root.add(emptyCoffer);
  }

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
  disposableGeometries.push(webGeometry);
  const webMaterial = new THREE.LineBasicMaterial({ color: 0xc6d0cc, transparent: true, opacity: 0.32, depthWrite: false });
  const webs = new THREE.LineSegments(webGeometry, webMaterial);
  root.add(webs);

  const lampGeometry = new THREE.OctahedronGeometry(0.18, 0);
  disposableGeometries.push(lampGeometry);
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
  disposableGeometries.push(debrisGeometry);
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
  disposableGeometries.push(moteGeometry);
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
      soulwell.water.rotation.z += delta * 0.035;
      (soulwell.water.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 1.2 + Math.sin(elapsed * 1.2) * 0.18;
      soulwell.ripples.forEach((ripple, index) => {
        const pulse = (elapsed * (0.22 + index * 0.05)) % 1;
        ripple.scale.setScalar(0.82 + pulse * 0.38);
        (ripple.material as THREE.MeshPhysicalMaterial).opacity = (0.32 - index * 0.06) * (1 - pulse);
      });
      loom.rings.forEach((ring, index) => {
        ring.rotation.y += delta * (index % 2 === 0 ? 0.38 : -0.31);
        ring.rotation.z += delta * (0.12 + index * 0.035);
      });
      ambientFlames.forEach((flame, index) => {
        flame.scale.y = 1.2 + Math.sin(elapsed * 7.5 + index * 1.7) * 0.24;
        flame.rotation.y += delta * (1.5 + index * 0.12);
      });
      motes.rotation.y += delta * 0.009;
    },
    dispose: () => {
      root.traverse((child) => {
        const geometries = child.userData.disposableGeometries as THREE.BufferGeometry[] | undefined;
        geometries?.forEach((geometry) => geometry.dispose());
      });
      disposableGeometries.forEach((geometry) => geometry.dispose());
      moteMaterial.dispose();
      webMaterial.dispose();
      materials.dispose();
    },
  };
}
