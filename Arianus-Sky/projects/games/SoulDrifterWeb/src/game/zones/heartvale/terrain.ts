/**
 * Heartvale zone preview — splat-blended terrain (T3, Finding 1/6).
 *
 * One BufferGeometry over the exported heightmap (decimated ×2 → ~5 m
 * texels), skinned by a MeshStandardMaterial whose fragment blends the
 * seven Poly Haven ground sets through the exported splat weights, then
 * multiplies by the painted tint raster (M-003 harvest palette anchor,
 * Finding 9). Lighting/shadow/fog stay stock Three.js so T5 tuning works
 * on top of it.
 */

import * as THREE from "three";
import type { TerrainField, TerrainMeta } from "./data";

const CHANNELS = ["grass", "dry", "road", "riverbed", "wet", "stone", "forest"] as const;

/** World-meters per texture repeat for each splat channel. */
const CHANNEL_TILING: Record<(typeof CHANNELS)[number], number> = {
  grass: 7.0,
  dry: 8.0,
  road: 5.5,
  riverbed: 4.5,
  wet: 5.0,
  stone: 3.5,
  forest: 6.0,
};

const TEXTURE_ROOT = "/assets/zones/heartvale/textures";

function loadTiled(loader: THREE.TextureLoader, url: string, srgb: boolean): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Pack the 7 u8 splat planes into two RGBA data textures (RGBA keeps
 * WebGL2 texStorage happy; RGB uploads fail on some drivers). */
export function createSplatDataTextures(field: TerrainField): [THREE.DataTexture, THREE.DataTexture] {
  const { nx, nz, splat } = field;
  const plane = nx * nz;
  const a = new Uint8Array(plane * 4);
  const b = new Uint8Array(plane * 4);
  for (let i = 0; i < plane; i += 1) {
    a[i * 4 + 0] = splat[0 * plane + i] ?? 0;
    a[i * 4 + 1] = splat[1 * plane + i] ?? 0;
    a[i * 4 + 2] = splat[2 * plane + i] ?? 0;
    a[i * 4 + 3] = splat[3 * plane + i] ?? 0;
    b[i * 4 + 0] = splat[4 * plane + i] ?? 0;
    b[i * 4 + 1] = splat[5 * plane + i] ?? 0;
    b[i * 4 + 2] = splat[6 * plane + i] ?? 0;
    b[i * 4 + 3] = 255;
  }
  const texA = new THREE.DataTexture(a, nx, nz, THREE.RGBAFormat);
  const texB = new THREE.DataTexture(b, nx, nz, THREE.RGBAFormat);
  for (const tex of [texA, texB]) {
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  }
  return [texA, texB];
}

function buildTintTexture(field: TerrainField): THREE.DataTexture {
  const { nx, nz, tint } = field;
  const plane = nx * nz;
  const rgba = new Uint8Array(plane * 4);
  for (let i = 0; i < plane; i += 1) {
    rgba[i * 4 + 0] = tint[0 * plane + i] ?? 0;
    rgba[i * 4 + 1] = tint[1 * plane + i] ?? 0;
    rgba[i * 4 + 2] = tint[2 * plane + i] ?? 0;
    rgba[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(rgba, nx, nz, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function buildGeometry(field: TerrainField, stride: number): THREE.BufferGeometry {
  const { nx, nz, originX, originZ, step, heights } = field;
  const sx = Math.floor((nx - 1) / stride) + 1;
  const sz = Math.floor((nz - 1) / stride) + 1;
  const positions = new Float32Array(sx * sz * 3);
  const uvs = new Float32Array(sx * sz * 2);
  let p = 0;
  let t = 0;
  for (let j = 0; j < sz; j += 1) {
    const gz = Math.min(j * stride, nz - 1);
    const z = originZ + gz * step;
    for (let i = 0; i < sx; i += 1) {
      const gx = Math.min(i * stride, nx - 1);
      positions[p] = originX + gx * step;
      positions[p + 1] = heights[gz * nx + gx] ?? 0;
      positions[p + 2] = z;
      p += 3;
      uvs[t] = gx / (nx - 1);
      uvs[t + 1] = gz / (nz - 1);
      t += 2;
    }
  }
  const index = new Uint32Array((sx - 1) * (sz - 1) * 6);
  let q = 0;
  for (let j = 0; j < sz - 1; j += 1) {
    for (let i = 0; i < sx - 1; i += 1) {
      const a = j * sx + i;
      const b = a + 1;
      const c = a + sx;
      const d = c + 1;
      index[q] = a; index[q + 1] = c; index[q + 2] = b;
      index[q + 3] = b; index[q + 4] = c; index[q + 5] = d;
      q += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createTerrain(meta: TerrainMeta, field: TerrainField): THREE.Mesh {
  const loader = new THREE.TextureLoader();
  const channelMaps = CHANNELS.map((channel) =>
    loadTiled(loader, `${TEXTURE_ROOT}/ground-${channel}-diff.jpg`, true),
  );
  const [splatA, splatB] = createSplatDataTextures(field);
  const tint = buildTintTexture(field);

  const extentX = (meta.samples.x - 1) * meta.metersPerSample;
  const extentZ = (meta.samples.z - 1) * meta.metersPerSample;

  // Dummy 1×1 map so the standard material compiles its UV path.
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    map: white,
    roughness: 1.0,
    metalness: 0.0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSplatA = { value: splatA };
    shader.uniforms.uSplatB = { value: splatB };
    shader.uniforms.uTint = { value: tint };
    shader.uniforms.uGroundOrigin = { value: new THREE.Vector2(field.originX, field.originZ) };
    shader.uniforms.uGroundExtent = { value: new THREE.Vector2(extentX, extentZ) };
    CHANNELS.forEach((channel, i) => {
      shader.uniforms[`uTex${i}`] = { value: channelMaps[i] };
      shader.uniforms[`uTile${i}`] = { value: CHANNEL_TILING[channel] };
    });

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vGroundXZ;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvGroundXZ = position.xz;",
      );

    const samplers = CHANNELS.map((_, i) => `uniform sampler2D uTex${i};\nuniform float uTile${i};`).join("\n");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vGroundXZ;
uniform sampler2D uSplatA;
uniform sampler2D uSplatB;
uniform sampler2D uTint;
uniform vec2 uGroundOrigin;
uniform vec2 uGroundExtent;
${samplers}`,
      )
      .replace(
        "#include <map_fragment>",
        `
vec2 groundUv = (vGroundXZ - uGroundOrigin) / uGroundExtent;
vec4 wA = texture2D(uSplatA, groundUv);
vec4 wB = texture2D(uSplatB, groundUv);
float wSum = max(wA.r + wA.g + wA.b + wA.a + wB.r + wB.g + wB.b, 1e-4);
vec3 blend =
    texture2D(uTex0, vGroundXZ / uTile0).rgb * wA.r * vec3(0.80, 0.98, 0.58)
  + texture2D(uTex1, vGroundXZ / uTile1).rgb * wA.g * vec3(1.06, 0.94, 0.58)
  + texture2D(uTex2, vGroundXZ / uTile2).rgb * wA.b * vec3(0.98, 0.82, 0.62)
  + texture2D(uTex3, vGroundXZ / uTile3).rgb * wA.a * vec3(0.82, 0.78, 0.70)
  + texture2D(uTex4, vGroundXZ / uTile4).rgb * wB.r * vec3(0.74, 0.64, 0.52)
  + texture2D(uTex5, vGroundXZ / uTile5).rgb * wB.g * vec3(1.12, 1.08, 0.98)
  + texture2D(uTex6, vGroundXZ / uTile6).rgb * wB.b * vec3(0.78, 0.78, 0.55);
blend /= wSum;
vec3 tint = texture2D(uTint, groundUv).rgb;
diffuseColor.rgb = blend * mix(vec3(1.0), tint * 1.8, 0.42);
`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
// Wet banks and packed road read glossier than meadow.
float wetW = wB.r;
float roadW = wA.b;
roughnessFactor = clamp(roughnessFactor - wetW * 0.45 - roadW * 0.12, 0.35, 1.0);
`,
      );
  };

  // Force a distinct program hash so the injected shader never collides with
  // a stock MeshStandardMaterial program in the cache.
  material.customProgramCacheKey = () => "heartvale-splat-terrain-v1";

  const mesh = new THREE.Mesh(buildGeometry(field, 2), material);
  mesh.name = "HeartvaleTerrain";
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
