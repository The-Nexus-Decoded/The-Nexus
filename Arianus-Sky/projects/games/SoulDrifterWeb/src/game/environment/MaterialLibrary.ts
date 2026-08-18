import * as THREE from "three";

export interface SoulwellMaterialLibrary {
  flagstone: THREE.MeshStandardMaterial;
  masonry: THREE.MeshStandardMaterial;
  masonryOccluder: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  darkIron: THREE.MeshStandardMaterial;
  soulglass: THREE.MeshPhysicalMaterial;
  moss: THREE.MeshStandardMaterial;
  ash: THREE.MeshStandardMaterial;
  tomes: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  void: THREE.MeshBasicMaterial;
  dispose(): void;
}

interface PbrTextureSet {
  color: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  ao: THREE.Texture;
}

const FIRST_BREACH_TEXTURE_ROOT = "/assets/textures/environment/first-breach";

async function loadPbrTextureSet(name: "flagstone" | "masonry", repeat: [number, number]): Promise<PbrTextureSet> {
  const loader = new THREE.TextureLoader();
  const [color, normal, roughness, ao] = await Promise.all([
    loader.loadAsync(`${FIRST_BREACH_TEXTURE_ROOT}/${name}-color.jpg`),
    loader.loadAsync(`${FIRST_BREACH_TEXTURE_ROOT}/${name}-normal-gl.jpg`),
    loader.loadAsync(`${FIRST_BREACH_TEXTURE_ROOT}/${name}-roughness.jpg`),
    loader.loadAsync(`${FIRST_BREACH_TEXTURE_ROOT}/${name}-ao.jpg`),
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [color, normal, roughness, ao]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }
  // ambientCG AO maps can use the model's primary UVs. This avoids requiring a
  // duplicate UV channel on every procedural chamber module.
  ao.channel = 0;
  return { color, normal, roughness, ao };
}

function seededNoise(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSurfaceTexture(
  seed: number,
  base: [number, number, number],
  variation: number,
  style: "stone" | "wood" | "metal" | "moss",
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create Soulwell material texture.");
  const random = seededNoise(seed);
  const image = context.createImageData(canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const grain = (random() - 0.5) * variation;
    const band = style === "wood" ? Math.sin((index / 4 % canvas.width) * 0.09) * 8 : 0;
    image.data[index] = Math.max(0, Math.min(255, base[0] + grain + band));
    image.data[index + 1] = Math.max(0, Math.min(255, base[1] + grain * 0.85 + band * 0.55));
    image.data[index + 2] = Math.max(0, Math.min(255, base[2] + grain * 0.7 + band * 0.25));
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  context.globalAlpha = style === "stone" ? 0.22 : 0.14;
  context.strokeStyle = style === "moss" ? "#8ea377" : style === "metal" ? "#9a8061" : "#050809";
  context.lineWidth = style === "stone" ? 1.4 : 0.8;
  const marks = style === "stone" ? 34 : 18;
  for (let mark = 0; mark < marks; mark += 1) {
    const x = random() * 256;
    const y = random() * 256;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 42, y + (random() - 0.5) * 42);
    if (style === "stone" && mark % 3 === 0) context.lineTo(x + (random() - 0.5) * 58, y + (random() - 0.5) * 58);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(style === "stone" ? 2.4 : 1.3, style === "stone" ? 2.4 : 1.3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export async function createSoulwellMaterialLibrary(seed: number): Promise<SoulwellMaterialLibrary> {
  const [floorPbr, wallPbr] = await Promise.all([
    loadPbrTextureSet("flagstone", [1, 1]),
    loadPbrTextureSet("masonry", [0.9, 0.9]),
  ]);
  const proceduralTextures = [
    makeSurfaceTexture(seed + 37, [101, 70, 39], 32, "wood"),
    makeSurfaceTexture(seed + 41, [91, 79, 63], 25, "metal"),
    makeSurfaceTexture(seed + 53, [63, 79, 63], 35, "moss"),
  ];
  const [woodMap, metalMap, mossMap] = proceduralTextures;
  const flagstone = new THREE.MeshStandardMaterial({
    map: floorPbr.color,
    normalMap: floorPbr.normal,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: floorPbr.roughness,
    aoMap: floorPbr.ao,
    aoMapIntensity: 0.72,
    color: 0xb6c4c0,
    roughness: 0.92,
    metalness: 0.01,
  });
  const masonry = new THREE.MeshStandardMaterial({
    map: wallPbr.color,
    normalMap: wallPbr.normal,
    normalScale: new THREE.Vector2(0.88, 0.88),
    roughnessMap: wallPbr.roughness,
    aoMap: wallPbr.ao,
    aoMapIntensity: 0.78,
    color: 0xa4b0b0,
    roughness: 0.94,
    metalness: 0.02,
  });
  const masonryOccluder = masonry.clone();
  masonryOccluder.transparent = true;
  const bronze = new THREE.MeshStandardMaterial({ map: metalMap, color: 0x9f7143, roughness: 0.48, metalness: 0.7 });
  const oak = new THREE.MeshStandardMaterial({ map: woodMap, color: 0x745234, roughness: 0.82, metalness: 0.02 });
  const darkIron = new THREE.MeshStandardMaterial({ map: metalMap, color: 0x30383a, roughness: 0.66, metalness: 0.62 });
  const soulglass = new THREE.MeshPhysicalMaterial({
    color: 0x86fff4,
    emissive: 0x1d8d88,
    emissiveIntensity: 2.1,
    roughness: 0.14,
    metalness: 0.08,
    transmission: 0.38,
    thickness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const moss = new THREE.MeshStandardMaterial({ map: mossMap, color: 0x738266, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false });
  const ash = new THREE.MeshStandardMaterial({ color: 0x292b2a, roughness: 1, transparent: true, opacity: 0.76, depthWrite: false });
  const tomes: SoulwellMaterialLibrary["tomes"] = [
    new THREE.MeshStandardMaterial({ color: 0x5d3a32, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x334f4d, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x6c5b35, roughness: 0.9 }),
  ];
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x010204, fog: false });
  return {
    flagstone,
    masonry,
    masonryOccluder,
    bronze,
    oak,
    darkIron,
    soulglass,
    moss,
    ash,
    tomes,
    void: voidMaterial,
    dispose: () => {
      [...Object.values(floorPbr), ...Object.values(wallPbr), ...proceduralTextures]
        .forEach((texture) => texture.dispose());
      [flagstone, masonry, masonryOccluder, bronze, oak, darkIron, soulglass, moss, ash, ...tomes, voidMaterial]
        .forEach((material) => material.dispose());
    },
  };
}
