/**
 * Heartvale zone preview — river water (Finding 2 / T3 wet-bank feather).
 *
 * Ribbons follow the layout authority's river samples (snapped to measured
 * POIs at crossings), displaced to sit just above the carved riverbed.
 * Shader: two scrolling procedural normal fields, sky-fresnel, sun glint,
 * edge fade + foam driven by the exported riverbed/wet splat channels so
 * water meets bank as a gradient, never a hard line.
 */

import * as THREE from "three";
import type { LayoutRiver, TerrainField } from "./data";

/** Per-river visual width (m) — main stem widest, tributaries narrower. */
const RIVER_WIDTH: Record<string, number> = {
  "anwel-run": 12.0,
  "lockroot-run": 8.0,
  "heir-run": 10.0,
};
const DEFAULT_WIDTH = 9.0;
const WATER_LIFT = 0.5;

interface Ribbon {
  positions: Float32Array;
  across: Float32Array;
  along: Float32Array;
  index: Uint32Array;
}

function buildRibbon(
  river: LayoutRiver,
  field: TerrainField,
  offset: [number, number],
): Ribbon | null {
  const samples = river.samples;
  if (samples.length < 2) return null;
  const width = RIVER_WIDTH[river.id] ?? DEFAULT_WIDTH;
  const half = width / 2;

  // Convert to local frame and pre-compute smoothed water heights.
  const pts: THREE.Vector2[] = samples.map(([wx = 0, wz = 0]) => new THREE.Vector2(wx - offset[0], wz - offset[1]));
  const rawY = pts.map((p) => field.height(p.x, p.y) + WATER_LIFT);
  const smoothY = rawY.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -4; k <= 4; k += 1) {
      const j = Math.min(Math.max(i + k, 0), rawY.length - 1);
      sum += rawY[j] ?? 0;
      n += 1;
    }
    return sum / n;
  });

  const count = pts.length;
  const positions = new Float32Array(count * 2 * 3);
  const across = new Float32Array(count * 2);
  const along = new Float32Array(count * 2);
  let distance = 0;

  for (let i = 0; i < count; i += 1) {
    const prev = pts[Math.max(i - 1, 0)] ?? new THREE.Vector2();
    const next = pts[Math.min(i + 1, count - 1)] ?? new THREE.Vector2();
    const dir = new THREE.Vector2().subVectors(next, prev);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0);
    dir.normalize();
    const normal = new THREE.Vector2(-dir.y, dir.x);
    if (i > 0) distance += (pts[i] ?? prev).distanceTo(pts[i - 1] ?? prev);

    const y = smoothY[i] ?? 0;
    const o = i * 6;
    const px = pts[i]?.x ?? 0;
    const pz = pts[i]?.y ?? 0;
    const lx = px - normal.x * half;
    const lz = pz - normal.y * half;
    const rx = px + normal.x * half;
    const rz = pz + normal.y * half;
    // Waterline tuck: ribbon edges hug the bank — clamp each edge vertex just
    // under the local terrain so banks never stair-step through the surface.
    const ly = Math.min(y, field.height(lx, lz) - 0.06);
    const ry = Math.min(y, field.height(rx, rz) - 0.06);
    positions[o] = lx;
    positions[o + 1] = ly;
    positions[o + 2] = lz;
    positions[o + 3] = rx;
    positions[o + 4] = ry;
    positions[o + 5] = rz;
    across[i * 2] = -1;
    across[i * 2 + 1] = 1;
    along[i * 2] = distance;
    along[i * 2 + 1] = distance;
  }

  const index = new Uint32Array((count - 1) * 6);
  let q = 0;
  for (let i = 0; i < count - 1; i += 1) {
    const a = i * 2; // left vertex of sample i; a+1 = right, a+2/a+3 next sample
    index[q] = a; index[q + 1] = a + 1; index[q + 2] = a + 2;
    index[q + 3] = a + 1; index[q + 4] = a + 3; index[q + 5] = a + 2;
    q += 6;
  }
  return { positions, across, along, index };
}

export function createRivers(
  rivers: LayoutRiver[],
  field: TerrainField,
  plateOffset: [number, number],
  splatA: THREE.DataTexture | null,
  splatB: THREE.DataTexture | null,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "HeartvaleRivers";

  // Confluence rule: where a narrower tributary meets a wider stem, trim the
  // tributary's overlapping end samples so the main stem's ribbon carries the
  // junction — overlapping ribbons interleave into ugly zigzags otherwise.
  const sorted = [...rivers].sort(
    (a, b) => (RIVER_WIDTH[b.id] ?? DEFAULT_WIDTH) - (RIVER_WIDTH[a.id] ?? DEFAULT_WIDTH),
  );
  const corridors: { samples: [number, number][]; half: number }[] = [];
  const trimmedRivers: LayoutRiver[] = sorted.map((river) => {
    const width = RIVER_WIDTH[river.id] ?? DEFAULT_WIDTH;
    let samples = river.samples;
    for (const corridor of corridors) {
      const joinDist = (corridor.half + width / 2) * 0.75;
      const nearCorridor = (s: [number, number]) =>
        corridor.samples.some((c) => Math.hypot(s[0] - c[0], s[1] - c[1]) < joinDist);
      // Trim from the join end(s) only — never punch mid-river holes.
      let start = 0;
      let end = samples.length;
      while (start < end && nearCorridor(samples[start]!)) start += 1;
      while (end > start && nearCorridor(samples[end - 1]!)) end -= 1;
      // Keep at least a stub; a fully-overlapped tributary disappears.
      samples = samples.slice(start, Math.max(end, start + 2));
    }
    corridors.push({ samples: river.samples, half: width / 2 });
    return { ...river, samples };
  });

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uDeepColor: { value: new THREE.Color(0x14454a) },
      uShallowColor: { value: new THREE.Color(0x3f8478) },
      uSkyColor: { value: new THREE.Color(0x9fc3d4) },
      uFoamColor: { value: new THREE.Color(0xe8f2ec) },
      uSplatA: { value: splatA },
      uSplatB: { value: splatB },
      uGroundOrigin: { value: new THREE.Vector2(field.originX, field.originZ) },
      uGroundExtent: {
        value: new THREE.Vector2(
          (field.nx - 1) * field.step,
          (field.nz - 1) * field.step,
        ),
      },
    },
    vertexShader: `
      #include <fog_pars_vertex>
      attribute float across;
      attribute float along;
      varying float vAcross;
      varying float vAlong;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vAcross = across;
        vAlong = along;
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
      uniform vec3 uSunDir;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyColor;
      uniform vec3 uFoamColor;
      uniform sampler2D uSplatA;
      uniform sampler2D uSplatB;
      uniform vec2 uGroundOrigin;
      uniform vec2 uGroundExtent;
      varying float vAcross;
      varying float vAlong;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float ripple(vec2 p) {
        return sin(p.x * 1.7 + uTime * 1.1) * 0.5
             + sin(p.y * 2.3 - uTime * 0.9) * 0.35
             + sin((p.x + p.y) * 3.1 + uTime * 1.7) * 0.15;
      }

      void main() {
        vec2 flow = vec2(vAlong * 0.35, vAcross * 2.2);
        float h = ripple(flow);
        float hx = ripple(flow + vec2(0.15, 0.0)) - h;
        float hz = ripple(flow + vec2(0.0, 0.15)) - h;
        vec3 normal = normalize(vec3(-hx * 0.9, 1.0, -hz * 0.9));

        vec2 groundUv = (vWorldPos.xz - uGroundOrigin) / uGroundExtent;
        float wet = texture2D(uSplatB, groundUv).r;

        // Depth cue: banks (high wet weight) read shallow and warm.
        float shallow = clamp(wet * 1.6, 0.0, 1.0);
        vec3 water = mix(uDeepColor, uShallowColor, shallow);

        float fresnel = pow(1.0 - max(dot(normal, vViewDir), 0.0), 2.2);
        water = mix(water, uSkyColor, fresnel * 0.32);

        vec3 halfDir = normalize(uSunDir + vViewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 90.0);
        water += vec3(1.0, 0.95, 0.8) * spec * 0.45;

        // Foam: wet-bank band near the ribbon edge, broken by ripple noise.
        float edge = smoothstep(0.45, 0.95, abs(vAcross));
        float foamMask = edge * clamp(wet * 2.2, 0.0, 1.0);
        float foamNoise = smoothstep(0.35, 0.9, ripple(flow * 3.0 + 7.0) * 0.5 + 0.5);
        water = mix(water, uFoamColor, foamMask * foamNoise * 0.7);

        float alpha = 0.92 - edge * (1.0 - shallow) * 0.35;
        gl_FragColor = vec4(water, alpha);
        // V8: water keeps its teal into the haze — partial fog so distant
        // river stays a river, not a white glare band.
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * 0.55);
      }
    `,
  });

  for (const river of trimmedRivers) {
    const ribbon = buildRibbon(river, field, plateOffset);
    if (!ribbon) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(ribbon.positions, 3));
    geometry.setAttribute("across", new THREE.BufferAttribute(ribbon.across, 1));
    geometry.setAttribute("along", new THREE.BufferAttribute(ribbon.along, 1));
    geometry.setIndex(new THREE.BufferAttribute(ribbon.index, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `river-${river.id}`;
    mesh.renderOrder = 2;
    group.add(mesh);
  }

  group.userData.tick = (elapsed: number) => {
    (material.uniforms.uTime as { value: number }).value = elapsed;
  };
  return group;
}
