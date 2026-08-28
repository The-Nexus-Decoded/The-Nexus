import * as THREE from "three";

export type PilotSkinPresetId =
  | "source-light"
  | "fair-warm"
  | "golden-neutral"
  | "warm-olive"
  | "deep-dark"
  | "dark-elf";

export interface PilotSkinPreset {
  id: PilotSkinPresetId;
  name: string;
  color: readonly [number, number, number];
  allowedAncestries?: readonly string[];
}

export const PILOT_SKIN_PRESETS: readonly PilotSkinPreset[] = [
  { id: "source-light", name: "Light / source master", color: [0.82, 0.64, 0.56] },
  { id: "fair-warm", name: "Fair warm / rose", color: [0.77, 0.53, 0.43] },
  { id: "golden-neutral", name: "Golden neutral", color: [0.63, 0.40, 0.29] },
  { id: "warm-olive", name: "Warm olive-brown", color: [0.49, 0.29, 0.22] },
  { id: "deep-dark", name: "Deep dark neutral-warm", color: [0.27, 0.14, 0.11] },
  {
    id: "dark-elf",
    name: "Dark Elf blue-gray",
    color: [0.57, 0.61, 0.72],
    allowedAncestries: ["elf"],
  },
] as const;

const originalMaps = new WeakMap<THREE.MeshStandardMaterial, THREE.Texture>();
const textureCache = new WeakMap<THREE.Texture, Map<PilotSkinPresetId, THREE.CanvasTexture>>();

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = clamp((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

/** Softly identifies reddish skin texels while excluding the gray boxer fabric. */
export function pilotSkinMaskWeight(red: number, green: number, blue: number): number {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const chroma = maximum - minimum;
  return smoothstep(0.012, 0.075, red - blue)
    * smoothstep(-0.004, 0.045, red - green)
    * smoothstep(0.018, 0.095, chroma);
}

export function pilotSkinPresetAllowed(preset: PilotSkinPresetId, ancestry: string): boolean {
  const definition = PILOT_SKIN_PRESETS.find((candidate) => candidate.id === preset);
  if (!definition) return false;
  return definition.allowedAncestries?.includes(ancestry) ?? true;
}

export function recolorPilotSkinPixel(
  source: readonly [number, number, number],
  target: readonly [number, number, number],
): [number, number, number] {
  const [red, green, blue] = source;
  const weight = pilotSkinMaskWeight(red, green, blue);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
  const shade = clamp(luminance / 0.64, 0.34, 1.38);
  const detail: [number, number, number] = [
    (red - luminance) * 0.34,
    (green - luminance) * 0.34,
    (blue - luminance) * 0.34,
  ];
  return source.map((channel, index) => {
    const colored = clamp(target[index]! * shade + detail[index]!);
    return channel + (colored - channel) * weight;
  }) as [number, number, number];
}

function textureImage(texture: THREE.Texture): CanvasImageSource {
  const image = texture.image as CanvasImageSource | undefined;
  if (!image) throw new Error("The pilot body texture is not ready for skin review.");
  return image;
}

function imageDimensions(image: CanvasImageSource): { width: number; height: number } {
  if (image instanceof HTMLVideoElement) {
    return { width: image.videoWidth, height: image.videoHeight };
  }
  const sized = image as CanvasImageSource & { width: number; height: number };
  return { width: sized.width, height: sized.height };
}

async function recoloredTexture(
  source: THREE.Texture,
  preset: PilotSkinPreset,
): Promise<THREE.CanvasTexture> {
  const cached = textureCache.get(source)?.get(preset.id);
  if (cached) return cached;
  const image = textureImage(source);
  const { width, height } = imageDimensions(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas skin review is unavailable.");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let index = 0; index < data.length; index += 4) {
    const recolored = recolorPilotSkinPixel(
      [data[index]! / 255, data[index + 1]! / 255, data[index + 2]! / 255],
      preset.color,
    );
    data[index] = Math.round(recolored[0] * 255);
    data[index + 1] = Math.round(recolored[1] * 255);
    data[index + 2] = Math.round(recolored[2] * 255);
  }
  context.putImageData(pixels, 0, 0);
  const output = new THREE.CanvasTexture(canvas);
  output.colorSpace = source.colorSpace;
  output.flipY = source.flipY;
  output.wrapS = source.wrapS;
  output.wrapT = source.wrapT;
  output.magFilter = source.magFilter;
  output.minFilter = source.minFilter;
  output.anisotropy = source.anisotropy;
  output.needsUpdate = true;
  const variants = textureCache.get(source) ?? new Map<PilotSkinPresetId, THREE.CanvasTexture>();
  variants.set(preset.id, output);
  textureCache.set(source, variants);
  return output;
}

export async function applyPilotSkinPreset(
  model: THREE.Object3D,
  presetId: PilotSkinPresetId,
  ancestry: string,
): Promise<{ applied: boolean; materialCount: number; reason?: string }> {
  if (!pilotSkinPresetAllowed(presetId, ancestry)) {
    return { applied: false, materialCount: 0, reason: `${presetId} is not allowed for ${ancestry}.` };
  }
  const preset = PILOT_SKIN_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return { applied: false, materialCount: 0, reason: `Unknown skin preset ${presetId}.` };
  const materials = new Set<THREE.MeshStandardMaterial>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const assigned = Array.isArray(object.material) ? object.material : [object.material];
    assigned.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial && material.map) materials.add(material);
    });
  });
  await Promise.all([...materials].map(async (material) => {
    const original = originalMaps.get(material) ?? material.map!;
    originalMaps.set(material, original);
    material.map = presetId === "source-light" ? original : await recoloredTexture(original, preset);
    material.needsUpdate = true;
  }));
  return { applied: materials.size > 0, materialCount: materials.size };
}
