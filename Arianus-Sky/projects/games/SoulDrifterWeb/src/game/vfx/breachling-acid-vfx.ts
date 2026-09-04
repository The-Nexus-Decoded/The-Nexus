import * as THREE from "three";

/**
 * Procedural three.js visuals for the Breachling acid spit. Every object here is
 * built from generated geometry, generated textures and inline shaders: no
 * external asset is loaded and no package is added.
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

export interface BreachlingAcidResources {
  readonly noise: THREE.DataTexture;
  /** Unit-radius gob; every stream blob and droplet is a scaled instance. */
  readonly blob: THREE.SphereGeometry;
  readonly droplet: THREE.SphereGeometry;
  readonly unitDisc: THREE.CircleGeometry;
  dispose(): void;
}

export function createBreachlingAcidResources(): BreachlingAcidResources {
  const noise = acidNoiseTexture(64, 8, 0x458ac1d);
  const blob = new THREE.SphereGeometry(1, 12, 8);
  const droplet = new THREE.SphereGeometry(1, 6, 4);
  const unitDisc = new THREE.CircleGeometry(1, 48);
  return {
    noise,
    blob,
    droplet,
    unitDisc,
    dispose: () => {
      noise.dispose();
      blob.dispose();
      droplet.dispose();
      unitDisc.dispose();
    },
  };
}

/** Wet acid body: a bright caustic green with a clearcoat so it reads as viscous, not glowing gas. */
export function acidFluidMaterial(opacity = 0.94): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x9fd633,
    emissive: 0x3f7a08,
    emissiveIntensity: 1.35,
    roughness: 0.14,
    metalness: 0,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
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
 */
const ACID_POOL_FRAGMENT = `
uniform float uTime;
uniform float uGrow;
uniform float uEat;
uniform float uOpacity;
uniform vec3 uBody;
uniform vec3 uBurn;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  vec2 centred = vUv - 0.5;
  float radius = length(centred) * 2.0;
  float crawl = texture2D(uNoise, vUv * 2.2 + vec2(uTime * 0.03, uTime * 0.021)).r;
  float rim = radius + crawl * 0.42 - 0.21;
  float spread = 1.0 - smoothstep(uGrow - 0.22, uGrow, rim);
  float eaten = 1.0 - smoothstep(uEat - 0.30, uEat, rim);
  float body = spread * eaten;
  float edge = smoothstep(0.10, 0.0, abs(rim - uEat)) * eaten;
  float alpha = clamp(body * 0.82 + edge * 0.55, 0.0, 1.0) * uOpacity;
  vec3 colour = mix(uBody, uBurn, edge + crawl * 0.18);
  gl_FragColor = vec4(colour, alpha);
}`;

// ---------------------------------------------------------------------------
// Stream
// ---------------------------------------------------------------------------

export interface AcidStreamOptions {
  readonly resources: BreachlingAcidResources;
  /** Creature height / BREACHLING_ACID_REFERENCE_HEIGHT_METERS. */
  readonly scale: number;
  /** Measured mouth aperture at the release frame; sets the gob calibre. */
  readonly gapeMeters: number;
  /** Gobs behind the head. Default 8 (9 bodies total). */
  readonly trailCount?: number;
  readonly seed?: number;
  readonly name?: string;
}

export interface BreachlingAcidStream {
  /** Trail container. The head is NOT under this group. */
  readonly root: THREE.Group;
  /**
   * Leading gob, returned unparented and already scaled. It is stretched along
   * its local +Z, so a caller that already orients a projectile by mapping +Z
   * onto the flight direction can place it with no extra work — and it is the
   * only body a contact probe sees, because the trail lives in a sibling group.
   */
  readonly head: THREE.Mesh;
  readonly headRadiusMeters: number;
  /** Trail gobs in flight order behind the head. */
  readonly trail: readonly THREE.Mesh[];
  /**
   * Lay the trail out behind the head. `headU` is the head's normalised flight
   * parameter; `pathAt(u)` returns the world point of the flight at u, so the
   * run of blobs follows the real arc including its gravity drop.
   */
  setTrail(headU: number, pathAt: (u: number) => THREE.Vector3): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/** Viscous run of gobs: a stretched leading blob with a tapering, wobbling tail. */
export function createBreachlingAcidStream(options: AcidStreamOptions): BreachlingAcidStream {
  const { resources, scale, gapeMeters } = options;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Acid stream needs a positive scale.");
  if (!Number.isFinite(gapeMeters) || gapeMeters <= 0) throw new Error("Acid stream needs a measured mouth gape.");
  const trailCount = options.trailCount ?? 8;
  const random = acidRandom(options.seed ?? 0x5c1d);
  const root = new THREE.Group();
  root.name = `${options.name ?? "breachling-acid-stream"}:trail`;
  // The aperture bounds the calibre: a 0.05 m gape throws a 15 mm gob, a 0.22 m
  // gape a 60 mm one. Clamped so a mis-measured body cannot produce a boulder.
  const headRadius = THREE.MathUtils.clamp(gapeMeters * 0.3, 0.015, 0.06) * scale;
  const material = acidFluidMaterial();
  const head = new THREE.Mesh(resources.blob, material);
  head.name = `${options.name ?? "breachling-acid-stream"}:head`;
  // Viscous elongation along local +Z, the axis a projectile caller aims.
  head.scale.set(headRadius * 0.86, headRadius * 0.86, headRadius * 2.1);
  const trail: THREE.Mesh[] = [];
  const offsets: number[] = [];
  const wobble: THREE.Vector2[] = [];
  const radii: number[] = [];
  for (let index = 1; index <= trailCount; index += 1) {
    const mesh = new THREE.Mesh(resources.blob, material);
    mesh.name = `${root.name}:gob-${index}`;
    // Calibre tapers back along the rope; the head carries the mass.
    radii.push(headRadius * Math.max(0.24, 0.86 - 0.055 * (index - 1)));
    offsets.push(index * 0.042);
    wobble.push(new THREE.Vector2(random() - 0.5, random() - 0.5).multiplyScalar(headRadius * 0.9));
    trail.push(mesh);
    root.add(mesh);
  }
  const tangent = new THREE.Vector3();
  const point = new THREE.Vector3();
  const behind = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(0, 0, 1);
  let disposed = false;
  return {
    root,
    head,
    headRadiusMeters: headRadius,
    trail,
    setTrail(headU, pathAt) {
      if (disposed) throw new Error("Acid stream has been disposed.");
      if (!Number.isFinite(headU)) throw new Error("Acid stream needs a finite flight parameter.");
      for (let index = 0; index < trail.length; index += 1) {
        const mesh = trail[index]!;
        const u = headU - offsets[index]!;
        if (u < 0) { mesh.visible = false; continue; }
        mesh.visible = true;
        const clamped = Math.min(1, u);
        point.copy(pathAt(clamped));
        // Tangent from the path itself, so the stretch follows the real arc.
        behind.copy(pathAt(Math.max(0, clamped - 0.02)));
        tangent.copy(point).sub(behind);
        if (tangent.lengthSq() < 1e-12) tangent.copy(forward); else tangent.normalize();
        lateral.copy(tangent).cross(up);
        if (lateral.lengthSq() < 1e-12) lateral.set(1, 0, 0); else lateral.normalize();
        const sway = wobble[index]!;
        mesh.position.copy(point).addScaledVector(lateral, sway.x).addScaledVector(up, sway.y);
        mesh.quaternion.setFromUnitVectors(forward, tangent);
        const radius = radii[index]!;
        mesh.scale.set(radius, radius, radius * 1.5);
        mesh.updateMatrixWorld(true);
      }
    },
    setVisible(visible) {
      root.visible = visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
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

/** Burst of droplets plus a flattened splat that spreads on the struck surface. */
export function createBreachlingAcidSplash(options: AcidSplashOptions): BreachlingAcidSplash {
  const { resources, scale, headRadiusMeters } = options;
  const duration = options.durationSeconds ?? 0.85;
  const gravity = options.gravityMetersPerSecondSquared ?? 9.81;
  const count = options.dropletCount ?? 14;
  const random = acidRandom(options.seed ?? 0xacd15);
  const root = new THREE.Group();
  root.name = "breachling-acid-splash";
  const material = acidFluidMaterial(0.9);
  const splatMaterial = new THREE.MeshBasicMaterial({
    color: 0x8fc72c, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
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
    const radius = headRadiusMeters * (0.18 + random() * 0.32);
    droplets.push({ mesh, velocity, radius });
    root.add(mesh);
  }
  let disposed = false;
  const position = new THREE.Vector3();
  return {
    root,
    durationSeconds: duration,
    update(elapsedSeconds) {
      if (disposed) throw new Error("Acid splash has been disposed.");
      if (!Number.isFinite(elapsedSeconds)) throw new Error("Acid splash needs a finite elapsed time.");
      const t = THREE.MathUtils.clamp(elapsedSeconds, 0, duration);
      const phase = t / duration;
      const fade = 1 - phase * phase;
      splat.scale.setScalar(headRadiusMeters * (1.6 + 5.2 * Math.min(1, phase * 2.4)));
      splatMaterial.opacity = 0.7 * fade;
      for (const droplet of droplets) {
        position.copy(droplet.velocity).multiplyScalar(t);
        position.y -= 0.5 * gravity * t * t;
        droplet.mesh.position.copy(position);
        const shrink = droplet.radius * Math.max(0.1, fade);
        droplet.mesh.scale.setScalar(shrink);
        droplet.mesh.visible = elapsedSeconds >= 0;
      }
      material.opacity = 0.9 * Math.max(0.05, fade);
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

export interface AcidPoolOptions {
  readonly resources: BreachlingAcidResources;
  readonly scale: number;
  /** Full spread radius at the reference height, metres. Default 0.42. */
  readonly radiusMeters?: number;
  /** Seconds from splash to fully eaten away. Default 6. */
  readonly lifetimeSeconds?: number;
  readonly bubbleCount?: number;
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
 * Ground pool. It spreads for the first fifth of its life, bubbles while it
 * works, then dissolves rim-inward along the noise field: the acid eats away
 * and the last of it fades.
 */
export function createBreachlingAcidPool(options: AcidPoolOptions): BreachlingAcidPool {
  const { resources, scale } = options;
  const lifetime = options.lifetimeSeconds ?? 6;
  const radius = (options.radiusMeters ?? 0.42) * scale;
  const bubbleCount = options.bubbleCount ?? 7;
  const random = acidRandom(options.seed ?? 0xf00d);
  const root = new THREE.Group();
  root.name = "breachling-acid-pool";
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGrow: { value: 0 },
      uEat: { value: 1.6 },
      uOpacity: { value: 1 },
      uBody: { value: new THREE.Color(0x7fbb18) },
      uBurn: { value: new THREE.Color(0xd8ff5e) },
      uNoise: { value: resources.noise },
    },
    vertexShader: ACID_POOL_VERTEX,
    fragmentShader: ACID_POOL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(resources.unitDisc, material);
  disc.name = "breachling-acid-pool-surface";
  disc.rotation.x = -Math.PI / 2;
  disc.scale.setScalar(radius);
  // Lifted a millimetre so the pool does not z-fight the floor it eats.
  disc.position.y = 0.002;
  root.add(disc);
  const bubbleMaterial = acidFluidMaterial(0.85);
  const bubbles: { mesh: THREE.Mesh; radius: number; phase: number; offset: THREE.Vector2; period: number }[] = [];
  for (let index = 0; index < bubbleCount; index += 1) {
    const mesh = new THREE.Mesh(resources.droplet, bubbleMaterial);
    mesh.name = `breachling-acid-bubble-${index + 1}`;
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 0.72;
    bubbles.push({
      mesh,
      radius: radius * (0.05 + random() * 0.07),
      phase: random(),
      period: 0.7 + random() * 0.8,
      offset: new THREE.Vector2(Math.cos(angle) * distance * radius, Math.sin(angle) * distance * radius),
    });
    root.add(mesh);
  }
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
      // Spread over the first fifth, then hold; erosion closes in over the last two thirds.
      material.uniforms.uGrow!.value = THREE.MathUtils.clamp(phase / 0.2, 0, 1) * 1.05;
      const eat = phase < 0.34 ? 1.6 : 1.6 - ((phase - 0.34) / 0.66) * 1.75;
      material.uniforms.uEat!.value = eat;
      material.uniforms.uOpacity!.value = phase > 0.88 ? 1 - (phase - 0.88) / 0.12 : 1;
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
      bubbleMaterial.dispose();
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
 */
export function createBreachlingAcidCoating(options: AcidCoatingOptions): BreachlingAcidCoating {
  const { resources, scale, headRadiusMeters } = options;
  const duration = options.durationSeconds ?? 4;
  const runnerCount = options.runnerCount ?? 6;
  const random = acidRandom(options.seed ?? 0xc0a7);
  const root = new THREE.Group();
  root.name = "breachling-acid-coating";
  const material = acidFluidMaterial(0.85);
  const patch = new THREE.Mesh(resources.blob, material);
  patch.name = "breachling-acid-coating-patch";
  root.add(patch);
  const runners: { mesh: THREE.Mesh; radius: number; drift: THREE.Vector3; delay: number }[] = [];
  for (let index = 0; index < runnerCount; index += 1) {
    const mesh = new THREE.Mesh(resources.droplet, material);
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
      patch.scale.set(headRadiusMeters * (1 + 1.9 * spread), headRadiusMeters * (1 + 1.2 * spread), headRadiusMeters * 0.5);
      material.opacity = 0.85 * (1 - phase * phase);
      for (const runner of runners) {
        const local = Math.max(0, t - runner.delay);
        runner.mesh.position.copy(runner.drift).multiplyScalar(local * 0.22);
        const size = runner.radius * Math.max(0, 1 - phase);
        runner.mesh.visible = local > 0 && size > 1e-4;
        runner.mesh.scale.setScalar(Math.max(1e-4, size));
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
