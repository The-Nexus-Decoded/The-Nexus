import * as THREE from "three";

/**
 * Procedural three.js visuals for the Breachling acid spit. Every object here is
 * built from generated geometry, generated textures and inline shaders: no
 * external asset is loaded and no package is added.
 *
 * WHAT IT HAS TO READ AS. A stream of poison: a single connected rope of goo,
 * thick and wet, saturated toxic green with a bright core inside a darker body,
 * unmistakable at gameplay distance on a creature only 1.0-1.33 m tall. That is
 * a look contract, and the pieces below meet it in four ways:
 *
 *   1. CONNECTED. The trail gobs are spaced in METRES along the real flight arc
 *      at a fraction of their own calibre, so consecutive gobs overlap into one
 *      continuous lumpy tube instead of a run of separate beads. Spacing used to
 *      be in the caller's flight parameter, which meant the same code drew a
 *      tight rope in the dungeon and scattered beads in the review lab.
 *   2. FAT ENOUGH. The rope calibre is still sized off the measured mouth
 *      aperture, but with a floor: the 5 cm mouths on the review-lab ravager and
 *      stalker packs used to throw a 15 mm bead. This is deliberately a SECOND
 *      number (`acidRopeRadiusMeters`) rather than a change to the contact
 *      body's own radius, because the head gob is what a contact probe sweeps
 *      and the breachling matrix fixture pins the contacts it produces. Nothing
 *      measured moved; the rope around it got fat.
 *   3. WET AND TOXIC. `acidFluidMaterial` is a clearcoated physical material
 *      whose shader is extended with a world-space goo field: it displaces the
 *      surface into travelling bulges, perturbs the shading and clearcoat normal
 *      so the highlight glistens and crawls, and concentrates the emissive into
 *      the middle of the body so the gob has a hot core inside a dark dense
 *      shell rather than blowing out to a white blur.
 *   4. IT DRIPS. Strands sag off the underside of the rope under gravity, stretch,
 *      let go and fall on their own arc, landing separately from the head.
 *
 * Sizes are world metres multiplied by `scale`, the creature height over the
 * 1.025 m base Breachling reference, so the 1.325 m Ravager throws a
 * proportionally larger stream. The four registered bodies span 1.025-1.325 m
 * (fourview-profiles.mjs), so `scale` stays inside roughly 1.00-1.30.
 *
 * The pieces are stateless with respect to clip time: callers feed a normalised
 * flight parameter or an elapsed second count each frame, so scrubbing a clip in
 * Motion Forge shows exactly that frame's state.
 *
 * Structure mirrors cinderbound-warden-vfx.ts (shared resource bundle, small
 * handle objects with root/update/dispose) without importing or editing it.
 */

/** Base Breachling target height; every size below is quoted at this scale. */
export const BREACHLING_ACID_REFERENCE_HEIGHT_METERS = 1.025;

/** Standard gravity, the same constant the spit arc itself is solved under. */
const ACID_GRAVITY = 9.80665;

/** Deterministic PRNG so gob layouts and droplet fans are reproducible. */
export function acidRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function acidNoiseTexture(size: number, cells: number, seed: number): THREE.DataTexture {
  const random = acidRandom(seed);
  const grid = new Float32Array(cells * cells);
  for (let index = 0; index < grid.length; index += 1) grid[index] = random();
  const at = (cx: number, cy: number): number => grid[((cy + cells) % cells) * cells + ((cx + cells) % cells)] ?? 0;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const gx = (x / size) * cells;
      const gy = (y / size) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const sx = (gx - x0) * (gx - x0) * (3 - 2 * (gx - x0));
      const sy = (gy - y0) * (gy - y0) * (3 - 2 * (gy - y0));
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      const value = Math.round((top * (1 - sy) + bottom * sy) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Profile of a hanging strand of goo, lathed into a drip: fat where it clings,
 * pinched into a neck, swelling again into the bead that is about to fall. The
 * profile runs from y = 0 (attached end) down to y = -1, radius 1, so a caller
 * scales it by (calibre, length, calibre) and it hangs straight down.
 */
function acidStrandProfile(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.00, 0.16),
    new THREE.Vector2(0.42, 0.08),
    new THREE.Vector2(0.62, -0.02),
    new THREE.Vector2(0.46, -0.16),
    new THREE.Vector2(0.28, -0.36),
    new THREE.Vector2(0.21, -0.58),
    new THREE.Vector2(0.28, -0.78),
    new THREE.Vector2(0.32, -0.89),
    new THREE.Vector2(0.19, -0.97),
    new THREE.Vector2(0.00, -1.0),
  ];
}

export interface BreachlingAcidResources {
  readonly noise: THREE.DataTexture;
  /**
   * Unit-radius gob used by the STREAM HEAD, and only by it. Its tessellation is
   * part of the measured contact: the review contact probe samples this mesh's
   * vertices and the pinned breachling matrix fixture records the contact time
   * and point that result. Do not retessellate it for looks - use `gob`.
   */
  readonly blob: THREE.SphereGeometry;
  /** Finer unit gob for the rope and the drips; nothing probes these. */
  readonly gob: THREE.SphereGeometry;
  readonly droplet: THREE.SphereGeometry;
  readonly unitDisc: THREE.CircleGeometry;
  /** Unit hanging strand: attached at the origin, bead at y = -1. */
  readonly strand: THREE.LatheGeometry;
  dispose(): void;
}

export function createBreachlingAcidResources(): BreachlingAcidResources {
  // 128 px over 24 cells: fine enough that a 0.5 m pool does not show the
  // interpolation grid as blocks when the shader tiles it.
  const noise = acidNoiseTexture(128, 24, 0x458ac1d);
  const blob = new THREE.SphereGeometry(1, 12, 8);
  // Enough tessellation to carry the shader's surface displacement; still tiny
  // meshes and there are never more than ~30 of them in flight.
  const gob = new THREE.SphereGeometry(1, 20, 14);
  const droplet = new THREE.SphereGeometry(1, 10, 7);
  const unitDisc = new THREE.CircleGeometry(1, 64);
  const strand = new THREE.LatheGeometry(acidStrandProfile(), 12);
  return {
    noise,
    blob,
    gob,
    droplet,
    unitDisc,
    strand,
    dispose: () => {
      noise.dispose();
      blob.dispose();
      gob.dispose();
      droplet.dispose();
      unitDisc.dispose();
      strand.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Fluid material
// ---------------------------------------------------------------------------

/**
 * World-space goo field shared by the vertex and fragment stages. It is sampled
 * at the world position of the surface, so it is fixed in the world and the rope
 * travels through it: bulges appear to run backwards along the stream for free,
 * with no per-gob uniform and nothing to keep in sync while a clip is scrubbed.
 * `uAcidTime` adds a slow churn on top for the pieces that do own a clock.
 */
const ACID_GOO_FIELD = `
uniform float uAcidTime;
uniform float uAcidLump;
uniform float uAcidGloss;
uniform float uAcidScale;
float acidHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 31.17;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float acidValueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = acidHash(i + vec3(0.0, 0.0, 0.0));
  float n100 = acidHash(i + vec3(1.0, 0.0, 0.0));
  float n010 = acidHash(i + vec3(0.0, 1.0, 0.0));
  float n110 = acidHash(i + vec3(1.0, 1.0, 0.0));
  float n001 = acidHash(i + vec3(0.0, 0.0, 1.0));
  float n101 = acidHash(i + vec3(1.0, 0.0, 1.0));
  float n011 = acidHash(i + vec3(0.0, 1.0, 1.0));
  float n111 = acidHash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float acidGoo(vec3 world) {
  vec3 drift = vec3(0.0, uAcidTime * 0.22, uAcidTime * 0.09);
  float coarse = acidValueNoise(world * uAcidScale + drift) - 0.5;
  float fine = acidValueNoise(world * (uAcidScale * 2.9) - drift * 1.7) - 0.5;
  return coarse * 1.35 + fine * 0.55;
}`;

/**
 * Wet acid body. A clearcoated physical material so it takes the scene lights
 * and throws a real glistening highlight, extended with three injections:
 *
 *   vertex   — displaces the surface along its normal by the goo field, which is
 *              what makes the rope lumpy and puts travelling bulges in it.
 *   fragment — re-derives the shading AND clearcoat normal from the world-space
 *              gradient of the same field, so the highlight crawls over the
 *              lumps instead of sitting on a smooth sphere.
 *   fragment — concentrates the emissive into the middle of the body and darkens
 *              the silhouette, giving a hot core inside a dense dark green shell.
 *              Without this, a bright emissive gob just reads as a white blur.
 *
 * `material.userData.acidUniforms` exposes the injected uniforms so a handle that
 * owns a clock (pool, splash, coating) can churn the surface over time.
 *
 * `lumpFraction` is a fraction of the body's own radius, not metres: every
 * geometry in `BreachlingAcidResources` is unit-sized and scaled by the handle,
 * so a 3.2 cm gob and a 6 cm gob lump by the same proportion of themselves.
 */
export function acidFluidMaterial(opacity = 0.96, lumpFraction = 0.18, glisten = 1): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    // Dense, saturated body: the brightness comes from the emissive core below,
    // not from a pale base colour.
    // Very dark albedo on purpose: under ordinary scene lighting a mid-green
    // albedo plus a bright emissive washes out to pale plastic. The colour has to
    // come from the emissive core, with the albedo only holding the dark shell.
    color: 0x1e4a02,
    emissive: 0x9dff17,
    emissiveIntensity: 2.3,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    // A green sheen, not a white one: a pale sheen is what turns goo into plastic.
    sheen: 0.25,
    sheenColor: new THREE.Color(0x7fd11a),
  });
  const uniforms = {
    uAcidTime: { value: 0 },
    uAcidLump: { value: lumpFraction },
    uAcidGloss: { value: glisten },
    // Lumps roughly 4 cm across in world space: about one per gob on the rope.
    uAcidScale: { value: 22 },
    // A high core power keeps the glow to the middle of the body: across a tube
    // dot(N,V) sweeps 1 to 0, so this makes a hot stripe with dark flanks.
    uAcidCore: { value: 5.5 },
    uAcidRim: { value: 0.04 },
  };
  material.userData.acidUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", `varying vec3 vAcidWorld;\n${ACID_GOO_FIELD}\nvoid main() {`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 acidWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        // The geometry is unit-sized, so this is a fraction of the body's radius.
        transformed += normal * acidGoo(acidWorld) * uAcidLump;
        vAcidWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `varying vec3 vAcidWorld;\nuniform float uAcidCore;\nuniform float uAcidRim;\n${ACID_GOO_FIELD}\nvoid main() {`)
      // Perturb before the clearcoat normal is taken, so the wet coat glistens too.
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        {
          float acidStep = 0.004;
          float acidBase = acidGoo(vAcidWorld);
          vec3 acidGrad = vec3(
            acidGoo(vAcidWorld + vec3(acidStep, 0.0, 0.0)) - acidBase,
            acidGoo(vAcidWorld + vec3(0.0, acidStep, 0.0)) - acidBase,
            acidGoo(vAcidWorld + vec3(0.0, 0.0, acidStep)) - acidBase) / acidStep;
          vec3 acidView = normalize((viewMatrix * vec4(acidGrad, 0.0)).xyz);
          float acidWeight = min(1.0, length(acidGrad) * 0.02) * uAcidGloss;
          normal = normalize(normal - (acidView - dot(acidView, normal) * normal) * acidWeight * 0.55);
          nonPerturbedNormal = normal;
        }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        {
          // Facing the camera = looking through the thick middle of the gob, so
          // that is where the acid glows; the silhouette stays dark and dense.
          float acidFacing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          float acidCore = pow(acidFacing, uAcidCore);
          totalEmissiveRadiance *= mix(uAcidRim, 1.0, acidCore);
          diffuseColor.rgb *= mix(0.34, 1.05, acidCore);
          diffuseColor.a *= mix(0.82, 1.0, acidCore);
        }`);
  };
  return material;
}

/** Advance a fluid material's surface churn. Safe before the shader has compiled. */
function setAcidFluidTime(material: THREE.MeshPhysicalMaterial, seconds: number): void {
  const uniforms = material.userData.acidUniforms as { uAcidTime: { value: number } } | undefined;
  if (uniforms) uniforms.uAcidTime.value = seconds;
}

const ACID_POOL_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Pool shader. `uGrow` spreads the puddle outward from the splash point;
 * `uEat` then dissolves it from the rim inward along a noise field, so the acid
 * visibly eats away rather than fading as a uniform disc. `uBurn` lights the
 * dissolving edge.
 *
 * On top of that: a boiling cell field pushes bright and dark blotches around
 * the body so it reads as bubbling rather than as a flat green decal, and the
 * live rim carries a hot band that is brightest exactly where the acid is
 * currently chewing into the floor.
 */
const ACID_POOL_FRAGMENT = `
uniform float uTime;
uniform float uGrow;
uniform float uEat;
uniform float uOpacity;
uniform vec3 uBody;
uniform vec3 uBurn;
uniform vec3 uDeep;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  vec2 centred = vUv - 0.5;
  float radius = length(centred) * 2.0;
  float crawl = texture2D(uNoise, vUv * 0.75 + vec2(uTime * 0.012, uTime * 0.008)).r;
  float rim = radius + crawl * 0.42 - 0.21;
  float spread = 1.0 - smoothstep(uGrow - 0.22, uGrow, rim);
  float eaten = 1.0 - smoothstep(uEat - 0.30, uEat, rim);
  float body = spread * eaten;
  float edge = smoothstep(0.10, 0.0, abs(rim - uEat)) * eaten;
  // Boil: two noise taps drifting against each other make cells that swell and
  // collapse, so the surface is never still while the acid is working.
  float boilA = texture2D(uNoise, vUv * 0.55 + vec2(uTime * 0.030, -uTime * 0.019)).r;
  float boilB = texture2D(uNoise, vUv * 1.05 - vec2(uTime * 0.017, uTime * 0.035)).r;
  float boil = smoothstep(0.38, 0.90, boilA * 0.55 + boilB * 0.55);
  // The outer band of the live pool is where it is eating; light it hot.
  float working = smoothstep(0.30, 0.02, abs(rim - (uEat - 0.13))) * eaten * spread;
  float front = smoothstep(0.17, 0.0, abs(rim - (uGrow - 0.07))) * spread * eaten;
  float hot = clamp(edge * 1.35 + front * 0.95 + working * 0.70, 0.0, 1.0);
  float alpha = clamp(body * 0.92 + hot * 0.55 + boil * body * 0.10, 0.0, 1.0) * uOpacity;
  vec3 colour = mix(uDeep, uBody, clamp(0.50 + boil * 0.45 + crawl * 0.12, 0.0, 1.0));
  colour = mix(colour, uBurn, clamp(hot + boil * 0.10, 0.0, 1.0));
  gl_FragColor = vec4(colour, alpha);
}`;

/**
 * The ground the pool has already eaten. Its RADIUS is monotonic: it grows with
 * the pool and never retreats, so while the acid is working the eaten patch only
 * ever spreads, and the retreating erosion front cannot uncover clean stone.
 *
 * It does NOT outlive the pool. `uOpacity` rides the pool's own fade and both
 * callers dispose the pool root when it finishes, so at the end of the lifetime
 * the floor is clean again. A scar that persists after the acid is gone would be
 * a room-level change - something has to own it once the pool is disposed - and
 * that is deliberately not decided here.
 */
const ACID_ETCH_FRAGMENT = `
uniform float uGrow;
uniform float uOpacity;
uniform vec3 uChar;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  vec2 centred = vUv - 0.5;
  float radius = length(centred) * 2.0;
  float bite = texture2D(uNoise, vUv * 0.6).r;
  float rim = radius + bite * 0.34 - 0.17;
  float mask = 1.0 - smoothstep(uGrow - 0.34, uGrow, rim);
  float pit = smoothstep(0.30, 0.90, texture2D(uNoise, vUv * 1.15).r);
  gl_FragColor = vec4(uChar, mask * (0.10 + pit * 0.17) * uOpacity);
}`;

/** Slow vapour coming off worked acid: round additive points that rise and thin. */
const ACID_VAPOUR_VERTEX = `
uniform float uTime;
uniform float uRadius;
uniform float uRise;
uniform float uPixel;
attribute float aSeed;
varying float vLife;
void main() {
  float life = fract(aSeed + uTime * 0.24);
  vLife = life;
  float angle = aSeed * 41.7;
  float spread = uRadius * (0.12 + 0.72 * fract(aSeed * 7.31)) * (0.55 + life * 0.95);
  vec3 local = vec3(cos(angle) * spread, uRise * life, sin(angle) * spread);
  local.x += sin(uTime * 0.8 + aSeed * 19.0) * uRadius * 0.16 * life;
  local.z += cos(uTime * 1.05 + aSeed * 13.0) * uRadius * 0.16 * life;
  vec4 viewPosition = modelViewMatrix * vec4(local, 1.0);
  gl_PointSize = uPixel * (0.45 + life * 1.9) / max(0.2, -viewPosition.z);
  gl_Position = projectionMatrix * viewPosition;
}`;

const ACID_VAPOUR_FRAGMENT = `
uniform vec3 uColour;
uniform float uOpacity;
varying float vLife;
void main() {
  float radius = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.1, radius);
  // Fade in off the surface and out at the top of the rise.
  float life = smoothstep(0.0, 0.22, vLife) * smoothstep(1.0, 0.55, vLife);
  gl_FragColor = vec4(uColour, disc * life * 0.13 * uOpacity);
}`;

/** Glossy wet splat on the struck surface: a dense middle inside a ragged hot rim. */
const ACID_SPLAT_FRAGMENT = `
uniform float uOpacity;
uniform float uSpread;
uniform vec3 uBody;
uniform vec3 uBurn;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  vec2 centred = vUv - 0.5;
  float radius = length(centred) * 2.0;
  float ragged = texture2D(uNoise, vUv * 0.7).r;
  float rim = radius + ragged * 0.46 - 0.23;
  float mask = 1.0 - smoothstep(uSpread - 0.26, uSpread, rim);
  float edge = smoothstep(0.14, 0.0, abs(rim - uSpread)) * mask;
  float wet = smoothstep(0.4, 1.0, texture2D(uNoise, vUv * 1.6).r) * mask;
  vec3 colour = mix(uBody, uBurn, clamp(edge * 1.2 + wet * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(colour, clamp(mask * 0.94 + edge * 0.5, 0.0, 1.0) * uOpacity);
}`;

// ---------------------------------------------------------------------------
// Stream
// ---------------------------------------------------------------------------

/**
 * Radius of the CONTACT BODY, the head gob a probe sweeps, from the measured
 * mouth aperture, in metres at unit scale.
 *
 * UNCHANGED, and it has to stay that way. This number, the head's geometry and
 * the head's scale together decide where and when a measured contact lands, and
 * the breachling matrix fixture pins the resulting time and point for every
 * body. The look pass fattens the visible rope through `acidRopeRadiusMeters`
 * instead, which touches nothing a probe can see.
 */
export function acidHeadRadiusMeters(gapeMeters: number): number {
  return THREE.MathUtils.clamp(gapeMeters * 0.3, 0.015, 0.06);
}

/**
 * Calibre of the visible rope, its drips, and the splash, pool and coating sized
 * off it, in metres at unit scale.
 *
 * The aperture still drives it, so a 22 cm gape throws a visibly fatter rope than
 * a 5 cm one, but it is floored at 32 mm. The review-lab ravager and stalker packs
 * measure a 5.05 cm and 5.48 cm gape, which under the contact calibre above is a
 * 15 mm bead: at gameplay distance on a 1 m creature that reads as spray, not as
 * a stream of poison. The 60 mm ceiling is the one the contact calibre already
 * carries, so a mis-measured body still cannot throw a boulder.
 */
export function acidRopeRadiusMeters(gapeMeters: number): number {
  return THREE.MathUtils.clamp(0.024 + gapeMeters * 0.16, 0.032, 0.06);
}

export interface AcidStreamOptions {
  readonly resources: BreachlingAcidResources;
  /** Creature height / BREACHLING_ACID_REFERENCE_HEIGHT_METERS. */
  readonly scale: number;
  /** Measured mouth aperture at the release frame; sets the gob calibre. */
  readonly gapeMeters: number;
  /** Gobs behind the head. Default 16 (17 bodies total). */
  readonly trailCount?: number;
  /** Strands that sag off the underside and fall away. Default 5. */
  readonly dripCount?: number;
  /**
   * World Y a fallen drip lands on and flattens. Omit and drips simply keep
   * falling; supply the attacker's floor and they splat where the floor is.
   */
  readonly floorMeters?: number;
  readonly gravityMetersPerSecondSquared?: number;
  readonly seed?: number;
  readonly name?: string;
}

export interface BreachlingAcidStream {
  /** Trail container. The head is NOT under this group. */
  readonly root: THREE.Group;
  /**
   * Sagging and falling strands. A sibling of `root`, not a child of it, for the
   * same reason the head is: nothing here may end up inside a contact probe's
   * body count. Parent it wherever `root` is parented.
   */
  readonly drips: THREE.Group;
  /**
   * Leading gob, returned unparented and already scaled. It is stretched along
   * its local +Z, so a caller that already orients a projectile by mapping +Z
   * onto the flight direction can place it with no extra work — and it is the
   * only body a contact probe sees, because the trail lives in a sibling group.
   */
  readonly head: THREE.Mesh;
  /** Radius of the contact body. Unchanged by the look pass; see `acidHeadRadiusMeters`. */
  readonly headRadiusMeters: number;
  /** Calibre of the visible rope. Size the splash, pool and coating off THIS. */
  readonly ropeRadiusMeters: number;
  /** Trail gobs in flight order behind the head. */
  readonly trail: readonly THREE.Mesh[];
  /**
   * Lay the rope out behind the head. `headU` is the head's normalised flight
   * parameter; `pathAt(u)` returns the world point of the flight at u, so the
   * run of blobs follows the real arc including its gravity drop.
   *
   * Gobs are placed at fixed METRE offsets measured along that arc, not at fixed
   * steps of u, so the rope has the same thickness-to-spacing ratio whatever the
   * caller's flight parameter means — which is what makes it overlap into one
   * connected tube instead of separating into beads.
   *
   * `elapsedSeconds` is real seconds since release and drives the drips only.
   * Leave it out and the rope is drawn without them.
   */
  setTrail(headU: number, pathAt: (u: number) => THREE.Vector3, elapsedSeconds?: number): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/** Samples used to measure arc length along the flight each frame. */
const ACID_ARC_SAMPLES = 48;

interface AcidDrip {
  readonly mesh: THREE.Mesh;
  /** Metres behind the head where the strand clings. */
  readonly anchorMeters: number;
  readonly formSeconds: number;
  readonly hangSeconds: number;
  readonly sway: number;
  readonly calibre: number;
}

/**
 * Viscous rope of poison: overlapping gobs laid along the real flight arc,
 * tapering from a fat head to a thin tail, with strands dripping off it.
 */
export function createBreachlingAcidStream(options: AcidStreamOptions): BreachlingAcidStream {
  const { resources, scale, gapeMeters } = options;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Acid stream needs a positive scale.");
  if (!Number.isFinite(gapeMeters) || gapeMeters <= 0) throw new Error("Acid stream needs a measured mouth gape.");
  const trailCount = options.trailCount ?? 16;
  const dripCount = options.dripCount ?? 5;
  const gravity = options.gravityMetersPerSecondSquared ?? ACID_GRAVITY;
  const floorMeters = options.floorMeters;
  const random = acidRandom(options.seed ?? 0x5c1d);
  const label = options.name ?? "breachling-acid-stream";
  const root = new THREE.Group();
  root.name = `${label}:trail`;
  const drips = new THREE.Group();
  drips.name = `${label}:drips`;
  const headRadius = acidHeadRadiusMeters(gapeMeters) * scale;
  const ropeRadius = acidRopeRadiusMeters(gapeMeters) * scale;
  const material = acidFluidMaterial(0.97, 0.2, 1);
  const head = new THREE.Mesh(resources.blob, material);
  head.name = `${label}:head`;
  // Viscous elongation along local +Z, the axis a projectile caller aims.
  // PINNED: this scale and the geometry above are the swept contact body, and
  // the breachling matrix fixture records the contact they produce. What got
  // fatter is the rope behind it; this did not move.
  head.scale.set(headRadius * 0.86, headRadius * 0.86, headRadius * 2.1);
  const trail: THREE.Mesh[] = [];
  /** Metres behind the head, measured along the arc. */
  const offsets: number[] = [];
  const wobble: THREE.Vector2[] = [];
  const radii: number[] = [];
  let travelled = 0;
  // One wander phase for the whole rope: neighbouring gobs share it, so the tube
  // snakes smoothly instead of jittering gob-to-gob and breaking its own line.
  const wanderPhase = random() * Math.PI * 2;
  for (let index = 0; index < trailCount; index += 1) {
    const mesh = new THREE.Mesh(resources.gob, material);
    mesh.name = `${root.name}:gob-${index + 1}`;
    // Calibre falls monotonically from the full rope calibre to a thin tail.
    const along = trailCount > 1 ? index / (trailCount - 1) : 0;
    const radius = ropeRadius * (0.95 - 0.73 * Math.pow(along, 0.8));
    // Centre-to-centre spacing is well under the sum of the two radii, so
    // consecutive gobs interpenetrate and the run reads as one tube. The first
    // sits close enough behind the head to swallow the head's tail.
    travelled += index === 0 ? ropeRadius * 1.15 : (radii[index - 1]! + radius) * 0.62;
    radii.push(radius);
    offsets.push(travelled);
    wobble.push(new THREE.Vector2(
      Math.sin(wanderPhase + index * 0.85) * 0.34,
      Math.sin(wanderPhase * 1.7 + index * 0.62) * 0.26,
    ).multiplyScalar(radius));
    trail.push(mesh);
    root.add(mesh);
  }
  const ropeMeters = travelled;
  const dripList: AcidDrip[] = [];
  for (let index = 0; index < dripCount; index += 1) {
    const mesh = new THREE.Mesh(resources.strand, material);
    mesh.name = `${drips.name}:strand-${index + 1}`;
    mesh.visible = false;
    dripList.push({
      mesh,
      anchorMeters: ropeMeters * (0.18 + 0.72 * random()),
      formSeconds: 0.05 + random() * 0.30,
      hangSeconds: 0.10 + random() * 0.16,
      sway: (random() - 0.5) * ropeRadius * 0.8,
      calibre: ropeRadius * (0.34 + random() * 0.26),
    });
    drips.add(mesh);
  }

  // Per-frame scratch. The arc table is rebuilt each setTrail so the rope always
  // follows the caller's current path, including a path that changes shape.
  const arcU = new Float64Array(ACID_ARC_SAMPLES + 1);
  const arcS = new Float64Array(ACID_ARC_SAMPLES + 1);
  const point = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const behind = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(0, 0, 1);
  const scratch = new THREE.Vector3();
  const drop = new THREE.Vector3();
  let disposed = false;

  /** Flight parameter at a given arc distance from the start, or -1 past the end. */
  const uAtArc = (target: number): number => {
    if (target < 0) return -1;
    const total = arcS[ACID_ARC_SAMPLES]!;
    if (target > total) return -1;
    for (let index = 1; index <= ACID_ARC_SAMPLES; index += 1) {
      const s1 = arcS[index]!;
      if (target <= s1) {
        const s0 = arcS[index - 1]!;
        const span = s1 - s0;
        const t = span > 1e-9 ? (target - s0) / span : 0;
        return arcU[index - 1]! + (arcU[index]! - arcU[index - 1]!) * t;
      }
    }
    return arcU[ACID_ARC_SAMPLES]!;
  };
  /** Arc distance from the start at a given flight parameter. */
  const arcAtU = (u: number): number => {
    if (u <= arcU[0]!) return 0;
    for (let index = 1; index <= ACID_ARC_SAMPLES; index += 1) {
      const u1 = arcU[index]!;
      if (u <= u1) {
        const u0 = arcU[index - 1]!;
        const span = u1 - u0;
        const t = span > 1e-9 ? (u - u0) / span : 0;
        return arcS[index - 1]! + (arcS[index]! - arcS[index - 1]!) * t;
      }
    }
    return arcS[ACID_ARC_SAMPLES]!;
  };

  return {
    root,
    drips,
    head,
    headRadiusMeters: headRadius,
    ropeRadiusMeters: ropeRadius,
    trail,
    setTrail(headU, pathAt, elapsedSeconds = 0) {
      if (disposed) throw new Error("Acid stream has been disposed.");
      if (!Number.isFinite(headU)) throw new Error("Acid stream needs a finite flight parameter.");
      const clampedHead = Math.max(0, Math.min(1, headU));
      // Arc-length table over the flown part of the path.
      previous.copy(pathAt(0));
      arcU[0] = 0;
      arcS[0] = 0;
      for (let index = 1; index <= ACID_ARC_SAMPLES; index += 1) {
        const u = (clampedHead * index) / ACID_ARC_SAMPLES;
        point.copy(pathAt(u));
        arcU[index] = u;
        arcS[index] = arcS[index - 1]! + point.distanceTo(previous);
        previous.copy(point);
      }
      const flown = arcS[ACID_ARC_SAMPLES]!;
      for (let index = 0; index < trail.length; index += 1) {
        const mesh = trail[index]!;
        const u = uAtArc(flown - offsets[index]!);
        if (u < 0) { mesh.visible = false; continue; }
        mesh.visible = true;
        point.copy(pathAt(u));
        // Tangent from the path itself, so the stretch follows the real arc.
        behind.copy(pathAt(Math.max(0, u - 0.02)));
        tangent.copy(point).sub(behind);
        if (tangent.lengthSq() < 1e-12) tangent.copy(forward); else tangent.normalize();
        lateral.copy(tangent).cross(up);
        if (lateral.lengthSq() < 1e-12) lateral.set(1, 0, 0); else lateral.normalize();
        const sway = wobble[index]!;
        mesh.position.copy(point).addScaledVector(lateral, sway.x).addScaledVector(up, sway.y);
        mesh.quaternion.setFromUnitVectors(forward, tangent);
        const radius = radii[index]!;
        // Stretched along the flow: with the metre spacing above this closes the
        // gaps between neighbours completely.
        mesh.scale.set(radius, radius, radius * 1.45);
        mesh.updateMatrixWorld(true);
      }
      // Drips. The rope is a fluid: strands sag off the underside, stretch, snap
      // and fall on their own. Without a clock they are simply not drawn.
      if (elapsedSeconds <= 0 || flown <= 0) {
        for (const drip of dripList) drip.mesh.visible = false;
        return;
      }
      const meanSpeed = flown / elapsedSeconds;
      for (const drip of dripList) {
        const mesh = drip.mesh;
        if (elapsedSeconds < drip.formSeconds) { mesh.visible = false; continue; }
        const detachSeconds = drip.formSeconds + drip.hangSeconds;
        if (elapsedSeconds < detachSeconds) {
          const u = uAtArc(flown - drip.anchorMeters);
          if (u < 0) { mesh.visible = false; continue; }
          point.copy(pathAt(u));
          behind.copy(pathAt(Math.max(0, u - 0.02)));
          tangent.copy(point).sub(behind);
          if (tangent.lengthSq() < 1e-12) tangent.copy(forward); else tangent.normalize();
          lateral.copy(tangent).cross(up);
          if (lateral.lengthSq() < 1e-12) lateral.set(1, 0, 0); else lateral.normalize();
          const grown = (elapsedSeconds - drip.formSeconds) / drip.hangSeconds;
          mesh.visible = true;
          // Still clinging: the lathed strand, hanging straight down off the rope.
          mesh.geometry = resources.strand;
          mesh.quaternion.identity();
          mesh.position.copy(point).addScaledVector(lateral, drip.sway);
          mesh.scale.set(drip.calibre, drip.calibre * (1.1 + 4.4 * grown), drip.calibre);
          mesh.updateMatrixWorld(true);
          continue;
        }
        // Free. Where the strand let go: the rope point it clung to, at the
        // moment it detached. The flight parameter is taken as proportional to
        // elapsed time, which is exactly true for both shipped callers.
        const fall = elapsedSeconds - detachSeconds;
        const detachArc = arcAtU(clampedHead * (detachSeconds / elapsedSeconds)) - drip.anchorMeters;
        // A strand that formed before the rope was that long let go at its start.
        const u = uAtArc(Math.max(0, detachArc));
        if (u < 0) { mesh.visible = false; continue; }
        point.copy(pathAt(u));
        behind.copy(pathAt(Math.max(0, u - 0.02)));
        tangent.copy(point).sub(behind);
        if (tangent.lengthSq() < 1e-12) tangent.copy(forward); else tangent.normalize();
        // Keeps a fraction of the rope's momentum, then falls under real gravity.
        scratch.copy(point).addScaledVector(tangent, meanSpeed * 0.34 * fall);
        scratch.y -= 0.5 * gravity * fall * fall;
        let squash = 1;
        if (floorMeters !== undefined && scratch.y <= floorMeters + drip.calibre) {
          scratch.y = floorMeters + drip.calibre * 0.12;
          // Landed separately from the head: it flattens into its own splat and
          // is gone within a second.
          const settled = Math.max(0, 1 - fall * 0.9);
          squash = settled;
        }
        mesh.visible = squash > 0.02;
        if (!mesh.visible) continue;
        // A strand that has let go is a falling drop, not something hanging off
        // the rope: a teardrop stretched down its own velocity.
        mesh.geometry = resources.gob;
        mesh.position.copy(scratch);
        drop.copy(tangent).multiplyScalar(meanSpeed * 0.34);
        drop.y -= gravity * fall;
        if (drop.lengthSq() < 1e-12) drop.set(0, -1, 0); else drop.normalize();
        mesh.quaternion.setFromUnitVectors(up, drop);
        const stretch = Math.min(2.1, 1.0 + fall * 3.2) * squash;
        const widen = drip.calibre * 0.72 * (1 + (1 - squash) * 2.2);
        mesh.scale.set(widen, drip.calibre * 0.72 * stretch, widen);
        mesh.updateMatrixWorld(true);
      }
    },
    setVisible(visible) {
      root.visible = visible;
      drips.visible = visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      drips.removeFromParent();
      drips.clear();
      head.removeFromParent();
      material.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Splash
// ---------------------------------------------------------------------------

export interface AcidSplashOptions {
  readonly resources: BreachlingAcidResources;
  readonly scale: number;
  readonly headRadiusMeters: number;
  /** Surface normal the gob struck; droplets fan around it. */
  readonly normal: THREE.Vector3;
  readonly dropletCount?: number;
  /** Sticky strings thrown off the impact. Default 7. */
  readonly stringCount?: number;
  readonly seed?: number;
  readonly gravityMetersPerSecondSquared?: number;
  readonly durationSeconds?: number;
}

export interface BreachlingAcidSplash {
  readonly root: THREE.Group;
  readonly durationSeconds: number;
  /** @param elapsedSeconds seconds since the strike. */
  update(elapsedSeconds: number): void;
  finished(elapsedSeconds: number): boolean;
  dispose(): void;
}

/**
 * What a gob of goo does when it lands: a wet splat that spreads on the struck
 * surface, sticky strings that stretch out of it and thin until they break, and
 * a fan of droplets that fall on real ballistic arcs.
 */
export function createBreachlingAcidSplash(options: AcidSplashOptions): BreachlingAcidSplash {
  const { resources, scale, headRadiusMeters } = options;
  const duration = options.durationSeconds ?? 0.85;
  const gravity = options.gravityMetersPerSecondSquared ?? ACID_GRAVITY;
  const count = options.dropletCount ?? 14;
  const stringCount = options.stringCount ?? 7;
  const random = acidRandom(options.seed ?? 0xacd15);
  const root = new THREE.Group();
  root.name = "breachling-acid-splash";
  const material = acidFluidMaterial(0.94, 0.22, 1);
  const splatUniforms = {
    uOpacity: { value: 1 },
    uSpread: { value: 0 },
    uBody: { value: new THREE.Color(0x63b40c) },
    uBurn: { value: new THREE.Color(0xe4ff72) },
    uNoise: { value: resources.noise },
  };
  const splatMaterial = new THREE.ShaderMaterial({
    uniforms: splatUniforms,
    vertexShader: ACID_POOL_VERTEX,
    fragmentShader: ACID_SPLAT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -6,
  });
  const normal = options.normal.clone();
  if (normal.lengthSq() < 1e-12) normal.set(0, 1, 0); else normal.normalize();
  const tangentA = new THREE.Vector3(0, 1, 0).cross(normal);
  if (tangentA.lengthSq() < 1e-9) tangentA.set(1, 0, 0);
  tangentA.normalize();
  const tangentB = new THREE.Vector3().crossVectors(normal, tangentA).normalize();
  const splat = new THREE.Mesh(resources.unitDisc, splatMaterial);
  splat.name = "breachling-acid-splat";
  splat.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  // A hair off the struck surface so the splat never z-fights it.
  splat.position.copy(normal).multiplyScalar(0.0015);
  root.add(splat);
  const droplets: { mesh: THREE.Mesh; velocity: THREE.Vector3; radius: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const mesh = new THREE.Mesh(resources.droplet, material);
    mesh.name = `breachling-acid-droplet-${index + 1}`;
    const angle = (index / count) * Math.PI * 2 + random() * 0.5;
    const spread = 0.45 + random() * 0.75;
    const speed = (1.1 + random() * 1.6) * scale;
    const velocity = new THREE.Vector3()
      .addScaledVector(normal, speed * (0.55 + random() * 0.5))
      .addScaledVector(tangentA, Math.cos(angle) * speed * spread)
      .addScaledVector(tangentB, Math.sin(angle) * speed * spread);
    const radius = headRadiusMeters * (0.13 + random() * 0.22);
    droplets.push({ mesh, velocity, radius });
    root.add(mesh);
  }
  // Sticky strings. A string is anchored in the splat and drawn out along its own
  // direction, stretching and thinning until it snaps.
  const strings: { mesh: THREE.Mesh; direction: THREE.Vector3; reach: number; calibre: number; snapAt: number }[] = [];
  const stringUp = new THREE.Vector3(0, -1, 0);
  for (let index = 0; index < stringCount; index += 1) {
    const mesh = new THREE.Mesh(resources.strand, material);
    mesh.name = `breachling-acid-string-${index + 1}`;
    const angle = (index / stringCount) * Math.PI * 2 + random() * 0.7;
    // Strings run out along the surface far more than up off it, so they are not
    // hidden inside the gob that threw them.
    const lean = 0.75 + random() * 1.05;
    const direction = new THREE.Vector3()
      .addScaledVector(normal, 0.22 + random() * 0.5)
      .addScaledVector(tangentA, Math.cos(angle) * lean)
      .addScaledVector(tangentB, Math.sin(angle) * lean)
      .normalize();
    strings.push({
      mesh,
      direction,
      reach: headRadiusMeters * (3.0 + random() * 3.0) * scale,
      calibre: headRadiusMeters * (0.42 + random() * 0.30),
      snapAt: 0.36 + random() * 0.34,
    });
    root.add(mesh);
  }
  let disposed = false;
  const position = new THREE.Vector3();
  const stringQuaternion = new THREE.Quaternion();
  return {
    root,
    durationSeconds: duration,
    update(elapsedSeconds) {
      if (disposed) throw new Error("Acid splash has been disposed.");
      if (!Number.isFinite(elapsedSeconds)) throw new Error("Acid splash needs a finite elapsed time.");
      const t = THREE.MathUtils.clamp(elapsedSeconds, 0, duration);
      const phase = t / duration;
      const fade = 1 - phase * phase;
      setAcidFluidTime(material, t);
      splat.scale.setScalar(headRadiusMeters * (1.6 + 5.2 * Math.min(1, phase * 2.4)));
      splatUniforms.uSpread.value = 0.25 + 0.85 * Math.min(1, phase * 2.2);
      splatUniforms.uOpacity.value = Math.max(0, fade);
      for (const droplet of droplets) {
        // Real ballistics from the strike: launch velocity, then gravity. No
        // dialled offset anywhere in here.
        position.copy(droplet.velocity).multiplyScalar(t);
        position.y -= 0.5 * gravity * t * t;
        droplet.mesh.position.copy(position);
        const shrink = droplet.radius * Math.max(0.1, fade);
        droplet.mesh.scale.setScalar(shrink);
        droplet.mesh.visible = elapsedSeconds >= 0;
      }
      for (const string of strings) {
        const local = phase / string.snapAt;
        if (elapsedSeconds < 0 || local >= 1) { string.mesh.visible = false; continue; }
        string.mesh.visible = true;
        // The strand geometry hangs down its local -Y; aim that at the string's
        // own direction so it is drawn out of the splat.
        stringQuaternion.setFromUnitVectors(stringUp, string.direction);
        string.mesh.quaternion.copy(stringQuaternion);
        const drawn = Math.sin(Math.min(1, local) * Math.PI * 0.5);
        // Snapping back is what a string does; it does not shrink to nothing first.
        // Thins as it stretches: constant volume, so it necks and then breaks.
        const thin = Math.max(0.40, 1 - local * 0.7);
        string.mesh.scale.set(string.calibre * thin, string.reach * drawn, string.calibre * thin);
      }
      material.opacity = 0.94 * Math.max(0.05, fade);
    },
    finished: (elapsedSeconds) => elapsedSeconds >= duration,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      material.dispose();
      splatMaterial.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

/**
 * How large a pool one landed gob leaves, given the CONTACT radius that landed.
 *
 * Deliberately the contact body and not the visible rope. Both callers already
 * divided the contact radius by 0.03, and the look pass did not change that
 * radius, so keeping it here leaves every puddle exactly the size it was: the
 * dungeon's four tiers stay at 2.000 / 1.813 / 1.911 / 1.962. An earlier draft
 * divided the ROPE calibre by 0.05 instead, on the theory that the old divisor
 * had been calibrated against the pre-floor calibre. It had not - in the dungeon
 * the caller passed the contact radius, which never moved - so that draft
 * silently shrank gameplay puddles from about 0.84 m to 0.50 m radius. Unmeasured
 * gameplay art does not get rebalanced as a side effect of a look pass.
 *
 * The rope is allowed to read fatter than the body that swept it; the puddle it
 * leaves is not, because the puddle is where the acid actually landed.
 */
export function acidPoolScaleForGob(headRadiusMeters: number): number {
  return Math.max(1e-3, headRadiusMeters / 0.03);
}

export interface AcidPoolOptions {
  readonly resources: BreachlingAcidResources;
  readonly scale: number;
  /** Full spread radius at the reference height, metres. Default 0.42. */
  readonly radiusMeters?: number;
  /** Seconds from splash to fully eaten away. Default 6. */
  readonly lifetimeSeconds?: number;
  readonly bubbleCount?: number;
  /** Vapour motes rising off the working acid. Default 26. */
  readonly vapourCount?: number;
  readonly seed?: number;
}

export interface BreachlingAcidPool {
  readonly root: THREE.Group;
  readonly lifetimeSeconds: number;
  readonly radiusMeters: number;
  update(elapsedSeconds: number): void;
  finished(elapsedSeconds: number): boolean;
  dispose(): void;
}

/**
 * Ground pool. It spreads for the first fifth of its life, boils and bubbles
 * while it works with a hot rim where it is chewing, gives off a slow vapour,
 * then dissolves rim-inward along the noise field: the acid eats away and the
 * last of it fades, leaving the etched floor behind.
 *
 * Both ground discs are lifted off the floor AND carry a negative polygon offset,
 * so the pool cannot z-fight the surface it is eating at any camera distance.
 */
export function createBreachlingAcidPool(options: AcidPoolOptions): BreachlingAcidPool {
  const { resources, scale } = options;
  const lifetime = options.lifetimeSeconds ?? 6;
  const radius = (options.radiusMeters ?? 0.42) * scale;
  const bubbleCount = options.bubbleCount ?? 7;
  const vapourCount = options.vapourCount ?? 26;
  const random = acidRandom(options.seed ?? 0xf00d);
  const root = new THREE.Group();
  root.name = "breachling-acid-pool";
  const etchUniforms = {
    uGrow: { value: 0 },
    uOpacity: { value: 1 },
    uChar: { value: new THREE.Color(0x1d2606) },
    uNoise: { value: resources.noise },
  };
  const etchMaterial = new THREE.ShaderMaterial({
    uniforms: etchUniforms,
    vertexShader: ACID_POOL_VERTEX,
    fragmentShader: ACID_ETCH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const etch = new THREE.Mesh(resources.unitDisc, etchMaterial);
  etch.name = "breachling-acid-pool-etch";
  etch.rotation.x = -Math.PI / 2;
  etch.scale.setScalar(radius * 1.04);
  etch.position.y = 0.0012;
  root.add(etch);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGrow: { value: 0 },
      uEat: { value: 1.6 },
      uOpacity: { value: 1 },
      uBody: { value: new THREE.Color(0x8ee81a) },
      uDeep: { value: new THREE.Color(0x2f6604) },
      uBurn: { value: new THREE.Color(0xeaff7e) },
      uNoise: { value: resources.noise },
    },
    vertexShader: ACID_POOL_VERTEX,
    fragmentShader: ACID_POOL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -8,
  });
  const disc = new THREE.Mesh(resources.unitDisc, material);
  disc.name = "breachling-acid-pool-surface";
  disc.rotation.x = -Math.PI / 2;
  disc.scale.setScalar(radius);
  // Lifted so the pool does not z-fight the floor it eats.
  disc.position.y = 0.0026;
  root.add(disc);
  const bubbleMaterial = acidFluidMaterial(0.9, 0.26, 1);
  const bubbles: { mesh: THREE.Mesh; radius: number; phase: number; offset: THREE.Vector2; period: number }[] = [];
  for (let index = 0; index < bubbleCount; index += 1) {
    const mesh = new THREE.Mesh(resources.droplet, bubbleMaterial);
    mesh.name = `breachling-acid-bubble-${index + 1}`;
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 0.72;
    bubbles.push({
      mesh,
      radius: radius * (0.035 + random() * 0.052),
      phase: random(),
      period: 0.7 + random() * 0.8,
      offset: new THREE.Vector2(Math.cos(angle) * distance * radius, Math.sin(angle) * distance * radius),
    });
    root.add(mesh);
  }
  // Slow vapour. Positions are computed in the vertex shader from a per-mote
  // seed, so nothing is uploaded per frame.
  const vapourGeometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(vapourCount);
  for (let index = 0; index < vapourCount; index += 1) seeds[index] = random();
  vapourGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vapourCount * 3), 3));
  vapourGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const vapourUniforms = {
    uTime: { value: 0 },
    uRadius: { value: radius },
    uRise: { value: radius * 1.35 },
    uPixel: { value: radius * 130 },
    uColour: { value: new THREE.Color(0xc4f95c) },
    uOpacity: { value: 1 },
  };
  const vapourMaterial = new THREE.ShaderMaterial({
    uniforms: vapourUniforms,
    vertexShader: ACID_VAPOUR_VERTEX,
    fragmentShader: ACID_VAPOUR_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const vapour = new THREE.Points(vapourGeometry, vapourMaterial);
  vapour.name = "breachling-acid-vapour";
  // Every mote is placed by the shader, so the CPU-side bounds are a point.
  vapour.frustumCulled = false;
  root.add(vapour);
  let disposed = false;
  return {
    root,
    lifetimeSeconds: lifetime,
    radiusMeters: radius,
    update(elapsedSeconds) {
      if (disposed) throw new Error("Acid pool has been disposed.");
      if (!Number.isFinite(elapsedSeconds)) throw new Error("Acid pool needs a finite elapsed time.");
      const t = THREE.MathUtils.clamp(elapsedSeconds, 0, lifetime);
      const phase = t / lifetime;
      material.uniforms.uTime!.value = t;
      vapourUniforms.uTime.value = t;
      setAcidFluidTime(bubbleMaterial, t);
      // Spread over the first fifth, then hold; erosion closes in over the last two thirds.
      const grow = THREE.MathUtils.clamp(phase / 0.2, 0, 1) * 1.05;
      material.uniforms.uGrow!.value = grow;
      // The etched ground follows the spread and never retreats, so the erosion
      // front closing in below cannot uncover floor the acid already ate. It
      // still fades out with the pool - see ACID_ETCH_FRAGMENT.
      etchUniforms.uGrow.value = Math.max(etchUniforms.uGrow.value, grow);
      const eat = phase < 0.34 ? 1.6 : 1.6 - ((phase - 0.34) / 0.66) * 1.75;
      material.uniforms.uEat!.value = eat;
      const fade = phase > 0.88 ? 1 - (phase - 0.88) / 0.12 : 1;
      material.uniforms.uOpacity!.value = fade;
      etchUniforms.uOpacity.value = fade;
      // Vapour only comes off acid that is still working.
      vapourUniforms.uOpacity.value = THREE.MathUtils.clamp(eat / 1.2, 0, 1) * fade;
      for (const bubble of bubbles) {
        // Each bubble swells, rises a little and pops on its own period.
        const local = ((t / bubble.period) + bubble.phase) % 1;
        const swell = Math.sin(Math.PI * local);
        const alive = eat > 0.15 ? 1 : Math.max(0, eat / 0.15);
        const size = bubble.radius * swell * alive;
        bubble.mesh.visible = size > 1e-4;
        bubble.mesh.scale.setScalar(Math.max(1e-4, size));
        bubble.mesh.position.set(bubble.offset.x, 0.004 + size * 0.7, bubble.offset.y);
      }
    },
    finished: (elapsedSeconds) => elapsedSeconds >= lifetime,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      material.dispose();
      etchMaterial.dispose();
      bubbleMaterial.dispose();
      vapourGeometry.dispose();
      vapourMaterial.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Coating
// ---------------------------------------------------------------------------

export interface AcidCoatingOptions {
  readonly resources: BreachlingAcidResources;
  readonly scale: number;
  readonly headRadiusMeters: number;
  readonly runnerCount?: number;
  readonly seed?: number;
  readonly durationSeconds?: number;
}

export interface BreachlingAcidCoating {
  readonly root: THREE.Group;
  readonly durationSeconds: number;
  update(elapsedSeconds: number): void;
  finished(elapsedSeconds: number): boolean;
  dispose(): void;
}

/**
 * What clings to whatever was hit: a spreading patch plus runners that crawl
 * downward and thin out. Parent it to the impact anchor so it rides the skin.
 * The runners are hanging strands, not beads, so the acid reads as goo running
 * off the victim.
 */
export function createBreachlingAcidCoating(options: AcidCoatingOptions): BreachlingAcidCoating {
  const { resources, scale, headRadiusMeters } = options;
  const duration = options.durationSeconds ?? 4;
  const runnerCount = options.runnerCount ?? 6;
  const random = acidRandom(options.seed ?? 0xc0a7);
  const root = new THREE.Group();
  root.name = "breachling-acid-coating";
  const material = acidFluidMaterial(0.9, 0.24, 1);
  const patch = new THREE.Mesh(resources.blob, material);
  patch.name = "breachling-acid-coating-patch";
  root.add(patch);
  const runners: { mesh: THREE.Mesh; radius: number; drift: THREE.Vector3; delay: number }[] = [];
  for (let index = 0; index < runnerCount; index += 1) {
    const mesh = new THREE.Mesh(resources.strand, material);
    mesh.name = `breachling-acid-runner-${index + 1}`;
    runners.push({
      mesh,
      radius: headRadiusMeters * (0.2 + random() * 0.3),
      drift: new THREE.Vector3((random() - 0.5) * 0.5, -(0.35 + random() * 0.6), (random() - 0.5) * 0.5).multiplyScalar(scale),
      delay: random() * 0.5,
    });
    root.add(mesh);
  }
  let disposed = false;
  return {
    root,
    durationSeconds: duration,
    update(elapsedSeconds) {
      if (disposed) throw new Error("Acid coating has been disposed.");
      if (!Number.isFinite(elapsedSeconds)) throw new Error("Acid coating needs a finite elapsed time.");
      const t = THREE.MathUtils.clamp(elapsedSeconds, 0, duration);
      const phase = t / duration;
      const spread = Math.min(1, t / 0.25);
      setAcidFluidTime(material, t);
      patch.scale.set(headRadiusMeters * (1 + 1.9 * spread), headRadiusMeters * (1 + 1.2 * spread), headRadiusMeters * 0.5);
      material.opacity = 0.9 * (1 - phase * phase);
      for (const runner of runners) {
        const local = Math.max(0, t - runner.delay);
        runner.mesh.position.copy(runner.drift).multiplyScalar(local * 0.22);
        const size = runner.radius * Math.max(0, 1 - phase);
        runner.mesh.visible = local > 0 && size > 1e-4;
        // Strands run downward and lengthen as they go.
        runner.mesh.scale.set(Math.max(1e-4, size), Math.max(1e-4, size * (1.4 + local * 2.2)), Math.max(1e-4, size));
      }
    },
    finished: (elapsedSeconds) => elapsedSeconds >= duration,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      material.dispose();
    },
  };
}
