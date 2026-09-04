import * as THREE from "three";

/**
 * Procedural three.js visuals for the Cinderbound Warden attacks and damage
 * break-off. Every object here is built from generated geometry, generated
 * textures and inline shaders: no external asset is loaded. Sizes are in world
 * meters and are multiplied by `scale`, the boss height over the 3.6 m
 * Wayfarer reference, so the 3.9 m Greater Warden gets proportionally larger
 * effects.
 *
 * The visuals are stateless with respect to clip time: the effect system feeds
 * them strengths and endpoints each frame, so scrubbing a clip in Motion Forge
 * shows exactly the frame's effect state. Only the flicker phase uses wall time.
 */

export const CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS = 3.6;

const UP = new THREE.Vector3(0, 1, 0);

/** Small deterministic PRNG so particle layouts are reproducible per effect. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function radialGlowTexture(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.min(1, Math.hypot(x - half, y - half) / half);
      const falloff = 1 - distance;
      const alpha = falloff * falloff * (3 - 2 * falloff);
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function valueNoiseTexture(size: number, cells: number, seed: number): THREE.DataTexture {
  const random = mulberry32(seed);
  const grid = new Float32Array(cells * cells);
  for (let index = 0; index < grid.length; index += 1) grid[index] = random();
  const sample = (cx: number, cy: number): number => grid[((cy + cells) % cells) * cells + ((cx + cells) % cells)] ?? 0;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const gx = (x / size) * cells;
      const gy = (y / size) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = gx - x0;
      const ty = gy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const top = sample(x0, y0) * (1 - sx) + sample(x0 + 1, y0) * sx;
      const bottom = sample(x0, y0 + 1) * (1 - sx) + sample(x0 + 1, y0 + 1) * sx;
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

export interface WardenVfxResources {
  readonly glow: THREE.DataTexture;
  readonly noise: THREE.DataTexture;
  /** Open-ended unit cylinder along +Y from -0.5 to +0.5; scaled per use. */
  readonly cylinder: THREE.CylinderGeometry;
  readonly unitRing: THREE.RingGeometry;
  readonly unitDisc: THREE.CircleGeometry;
  dispose(): void;
}

export function createWardenVfxResources(): WardenVfxResources {
  const glow = radialGlowTexture(64);
  const noise = valueNoiseTexture(64, 8, 458);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
  const unitRing = new THREE.RingGeometry(0.86, 1, 48);
  const unitDisc = new THREE.CircleGeometry(1, 40);
  return {
    glow,
    noise,
    cylinder,
    unitRing,
    unitDisc,
    dispose: () => {
      glow.dispose();
      noise.dispose();
      cylinder.dispose();
      unitRing.dispose();
      unitDisc.dispose();
    },
  };
}

export interface WardenVfxVisual {
  readonly root: THREE.Group;
  dispose(): void;
}

function glowSprite(resources: WardenVfxResources, color: number, name: string): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: resources.glow,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = name;
  return sprite;
}

function flatMaterial(color: number, opacity: number, additive: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

const SCROLL_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SCROLL_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uStrength;
uniform float uSpeed;
uniform float uTiling;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  float noise = texture2D(uNoise, vec2(vUv.x * 2.0 + uTime * 0.35, vUv.y * uTiling - uTime * uSpeed)).r;
  float ends = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  float alpha = (0.35 + 0.65 * noise) * ends * uStrength;
  gl_FragColor = vec4(mix(uColorA, uColorB, noise) * alpha, alpha);
}`;

function scrollingSheathMaterial(
  resources: WardenVfxResources,
  colorA: number,
  colorB: number,
  speed: number,
  tiling: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uSpeed: { value: speed },
      uTiling: { value: tiling },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uNoise: { value: resources.noise },
    },
    vertexShader: SCROLL_VERTEX_SHADER,
    fragmentShader: SCROLL_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function setUniform(material: THREE.ShaderMaterial, name: string, value: number): void {
  const uniform = material.uniforms[name];
  if (uniform) uniform.value = value;
}

/** Places a unit cylinder so it spans `from` to `to` with the given radius. */
function spanCylinder(mesh: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number): number {
  const direction = to.clone().sub(from);
  const length = direction.length();
  if (length < 1e-6) {
    mesh.visible = false;
    return 0;
  }
  direction.divideScalar(length);
  mesh.visible = true;
  mesh.position.copy(from).addScaledVector(direction, length / 2);
  mesh.quaternion.setFromUnitVectors(UP, direction);
  mesh.scale.set(radius, length, radius);
  return length;
}

/** A pool of additive glow points with per-particle deterministic seeds. */
export class WardenParticleCloud {
  readonly points: THREE.Points;
  readonly seeds: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;

  constructor(
    resources: WardenVfxResources,
    readonly count: number,
    seed: number,
    size: number,
    name: string,
  ) {
    const random = mulberry32(seed);
    this.seeds = new Float32Array(count * 4);
    for (let index = 0; index < this.seeds.length; index += 1) this.seeds[index] = random();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      map: resources.glow,
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = name;
    this.points.frustumCulled = false;
  }

  seed(index: number, channel: 0 | 1 | 2 | 3): number {
    return this.seeds[index * 4 + channel] ?? 0;
  }

  set(index: number, x: number, y: number, z: number, r: number, g: number, b: number): void {
    const offset = index * 3;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.colors[offset] = r;
    this.colors[offset + 1] = g;
    this.colors[offset + 2] = b;
  }

  commit(): void {
    const position = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const color = this.geometry.getAttribute("color") as THREE.BufferAttribute;
    position.needsUpdate = true;
    color.needsUpdate = true;
  }

  setStrength(strength: number): void {
    this.material.opacity = THREE.MathUtils.clamp(strength, 0, 1);
    this.points.visible = strength > 0.001;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export interface WardenFireBeamVisual extends WardenVfxVisual {
  /** Telegraph and beam share one aim; the beam spans palm to end. */
  setAim(origin: THREE.Vector3, palmForward: THREE.Vector3, end: THREE.Vector3): void;
  setTelegraph(strength: number): void;
  setBeam(strength: number): void;
  setImpact(strength: number): void;
  setTime(seconds: number): void;
  hide(): void;
  readonly origin: THREE.Vector3;
  readonly end: THREE.Vector3;
}

/**
 * PalmFire: a solid fire beam. A white-hot core, a scrolling flame sheath, a wide
 * heat-haze sheath (a shimmering additive veil; no post-process refraction),
 * embers travelling along the beam, a palm telegraph glow with an aim thread,
 * and an impact flare with a ring and a light at the far end.
 */
export function createWardenFireBeamVisual(
  resources: WardenVfxResources,
  scale: number,
  name: string,
): WardenFireBeamVisual {
  const root = new THREE.Group();
  root.name = name;
  const origin = new THREE.Vector3();
  const end = new THREE.Vector3();
  const palmForward = new THREE.Vector3(0, 0, 1);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3cf, toneMapped: false, transparent: true, opacity: 0 });
  const core = new THREE.Mesh(resources.cylinder, coreMaterial);
  core.name = `${name}:core`;
  const sheathMaterial = scrollingSheathMaterial(resources, 0xff5a12, 0xffc24a, 6.5, 3);
  const sheath = new THREE.Mesh(resources.cylinder, sheathMaterial);
  sheath.name = `${name}:sheath`;
  const hazeMaterial = scrollingSheathMaterial(resources, 0xff9a4a, 0xfff0d6, 2.4, 1.5);
  const haze = new THREE.Mesh(resources.cylinder, hazeMaterial);
  haze.name = `${name}:heat-haze`;
  const threadMaterial = flatMaterial(0xffa254, 0, true);
  const aimThread = new THREE.Mesh(resources.cylinder, threadMaterial);
  aimThread.name = `${name}:aim-thread`;
  const palmGlow = glowSprite(resources, 0xff7a2a, `${name}:palm-glow`);
  const palmRingMaterial = flatMaterial(0xffb066, 0, true);
  const palmRing = new THREE.Mesh(resources.unitRing, palmRingMaterial);
  palmRing.name = `${name}:palm-ring`;
  const impactFlare = glowSprite(resources, 0xffd28a, `${name}:impact-flare`);
  const impactRingMaterial = flatMaterial(0xff8a3a, 0, true);
  const impactRing = new THREE.Mesh(resources.unitRing, impactRingMaterial);
  impactRing.name = `${name}:impact-ring`;
  const embers = new WardenParticleCloud(resources, 72, 5201, 0.12 * scale, `${name}:embers`);
  const palmLight = new THREE.PointLight(0xff7a2a, 0, 4.5 * scale, 2);
  palmLight.name = `${name}:palm-light`;
  const impactLight = new THREE.PointLight(0xffa04a, 0, 6 * scale, 2);
  impactLight.name = `${name}:impact-light`;
  root.add(core, sheath, haze, aimThread, palmGlow, palmRing, impactFlare, impactRing, embers.points, palmLight, impactLight);
  let telegraph = 0;
  let beam = 0;
  let impact = 0;
  let time = 0;
  let length = 0;
  const direction = new THREE.Vector3(0, 0, 1);
  const side = new THREE.Vector3();
  const lift = new THREE.Vector3();

  const layout = (): void => {
    length = end.clone().sub(origin).length();
    if (length > 1e-6) direction.copy(end).sub(origin).divideScalar(length);
    side.crossVectors(direction, UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    lift.crossVectors(side, direction).normalize();
    spanCylinder(core, origin, end, 0.11 * scale);
    spanCylinder(sheath, origin, end, 0.27 * scale);
    spanCylinder(haze, origin, end, 0.46 * scale);
    spanCylinder(aimThread, origin, end, 0.02 * scale);
    palmGlow.position.copy(origin).addScaledVector(palmForward, 0.08 * scale);
    palmRing.position.copy(origin).addScaledVector(palmForward, 0.1 * scale);
    palmRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), palmForward);
    palmLight.position.copy(origin).addScaledVector(palmForward, 0.2 * scale);
    impactFlare.position.copy(end);
    impactRing.position.copy(end).addScaledVector(direction, -0.05);
    impactRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().negate());
    impactLight.position.copy(end).addScaledVector(direction, -0.35 * scale);
  };
  const refresh = (): void => {
    const anyVisible = telegraph > 0.001 || beam > 0.001 || impact > 0.001;
    root.visible = anyVisible;
    if (!anyVisible) return;
    const flicker = 0.9 + 0.1 * Math.sin(time * 37) * Math.sin(time * 23);
    coreMaterial.opacity = beam;
    core.visible = beam > 0.001 && length > 1e-6;
    setUniform(sheathMaterial, "uStrength", beam * flicker);
    setUniform(sheathMaterial, "uTime", time);
    sheath.visible = core.visible;
    setUniform(hazeMaterial, "uStrength", beam * 0.35);
    setUniform(hazeMaterial, "uTime", time * 0.7);
    haze.visible = core.visible;
    threadMaterial.opacity = telegraph * 0.55 * (1 - beam);
    aimThread.visible = threadMaterial.opacity > 0.001 && length > 1e-6;
    const palmStrength = Math.max(telegraph, beam * 0.8);
    palmGlow.material.opacity = palmStrength;
    palmGlow.scale.setScalar((0.35 + 0.55 * palmStrength) * scale);
    palmGlow.visible = palmStrength > 0.001;
    palmRingMaterial.opacity = telegraph * 0.85 * (1 - beam * 0.5);
    palmRing.scale.setScalar((0.16 + 0.22 * (1 - telegraph)) * scale);
    palmRing.visible = palmRingMaterial.opacity > 0.001;
    palmLight.intensity = (telegraph * 3 + beam * 5) * flicker;
    impactFlare.material.opacity = Math.max(impact, beam * 0.7);
    impactFlare.scale.setScalar((0.6 + 1.1 * impact + 0.5 * beam) * scale);
    impactFlare.visible = impactFlare.material.opacity > 0.001;
    impactRingMaterial.opacity = impact * 0.9;
    impactRing.scale.setScalar((0.3 + 1.8 * (1 - impact)) * scale);
    impactRing.visible = impact > 0.001;
    impactLight.intensity = impact * 9 + beam * 4;
    embers.setStrength(beam);
    if (beam > 0.001 && length > 1e-6) {
      for (let index = 0; index < embers.count; index += 1) {
        const along = (embers.seed(index, 0) + time * (0.9 + embers.seed(index, 1) * 1.4)) % 1;
        const angle = embers.seed(index, 2) * Math.PI * 2 + time * 3;
        const radius = (0.16 + embers.seed(index, 3) * 0.24) * scale;
        const x = origin.x + direction.x * along * length + (side.x * Math.cos(angle) + lift.x * Math.sin(angle)) * radius;
        const y = origin.y + direction.y * along * length + (side.y * Math.cos(angle) + lift.y * Math.sin(angle)) * radius;
        const z = origin.z + direction.z * along * length + (side.z * Math.cos(angle) + lift.z * Math.sin(angle)) * radius;
        const heat = 0.55 + 0.45 * embers.seed(index, 1);
        embers.set(index, x, y, z, 1, 0.35 + 0.4 * heat, 0.08 * heat);
      }
      embers.commit();
    }
  };

  return {
    root,
    origin,
    end,
    setAim: (nextOrigin, nextPalmForward, nextEnd) => {
      origin.copy(nextOrigin);
      end.copy(nextEnd);
      if (nextPalmForward.lengthSq() > 1e-8) palmForward.copy(nextPalmForward).normalize();
      layout();
      refresh();
    },
    setTelegraph: (strength) => { telegraph = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setBeam: (strength) => { beam = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setImpact: (strength) => { impact = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setTime: (seconds) => { time = seconds; refresh(); },
    hide: () => { telegraph = 0; beam = 0; impact = 0; refresh(); },
    dispose: () => {
      root.removeFromParent();
      coreMaterial.dispose();
      sheathMaterial.dispose();
      hazeMaterial.dispose();
      threadMaterial.dispose();
      palmGlow.material.dispose();
      palmRingMaterial.dispose();
      impactFlare.material.dispose();
      impactRingMaterial.dispose();
      embers.dispose();
      palmLight.dispose();
      impactLight.dispose();
    },
  };
}

export interface WardenSweepWaveVisual extends WardenVfxVisual {
  /** Arc of the wave on the floor plane, angles in radians around +Y. */
  setArc(center: THREE.Vector3, startAngle: number, endAngle: number): void;
  setBladeGlow(tip: THREE.Vector3, strength: number): void;
  setWave(strength: number): void;
  setScorch(strength: number, emberStrength: number): void;
  setTime(seconds: number): void;
  hide(): void;
}

const WAVE_SEGMENTS = 28;

function buildArcRibbon(
  geometry: THREE.BufferGeometry,
  center: THREE.Vector3,
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  height: number,
  colorInner: THREE.Color,
  colorOuter: THREE.Color,
): void {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const color = geometry.getAttribute("color") as THREE.BufferAttribute;
  for (let segment = 0; segment <= WAVE_SEGMENTS; segment += 1) {
    const t = segment / WAVE_SEGMENTS;
    const angle = startAngle + (endAngle - startAngle) * t;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    // Leading edge of the arc is brightest, the trailing tail fades out.
    const trail = 0.25 + 0.75 * t;
    const base = segment * 2;
    position.setXYZ(base, center.x + sin * innerRadius, center.y, center.z + cos * innerRadius);
    position.setXYZ(base + 1, center.x + sin * outerRadius, center.y + height, center.z + cos * outerRadius);
    color.setXYZ(base, colorInner.r * trail, colorInner.g * trail, colorInner.b * trail);
    color.setXYZ(base + 1, colorOuter.r * trail * 0.35, colorOuter.g * trail * 0.35, colorOuter.b * trail * 0.35);
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function ribbonGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = (WAVE_SEGMENTS + 1) * 2;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  const indices: number[] = [];
  for (let segment = 0; segment < WAVE_SEGMENTS; segment += 1) {
    const a = segment * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  return geometry;
}

/**
 * CinderSweep: an arc-shaped fire wave that follows the blade sweep, a ribbon of
 * embers behind the blade tip, and a ground scorch sector that fades.
 */
export function createWardenSweepWaveVisual(
  resources: WardenVfxResources,
  scale: number,
  name: string,
): WardenSweepWaveVisual {
  const root = new THREE.Group();
  root.name = name;
  const waveGeometry = ribbonGeometry();
  const waveMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const wave = new THREE.Mesh(waveGeometry, waveMaterial);
  wave.name = `${name}:wave`;
  wave.frustumCulled = false;
  const crestGeometry = ribbonGeometry();
  const crestMaterial = waveMaterial.clone();
  const crest = new THREE.Mesh(crestGeometry, crestMaterial);
  crest.name = `${name}:crest`;
  crest.frustumCulled = false;
  const scorchGeometry = ribbonGeometry();
  const scorchMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    toneMapped: false,
  });
  const scorch = new THREE.Mesh(scorchGeometry, scorchMaterial);
  scorch.name = `${name}:scorch`;
  scorch.frustumCulled = false;
  const scorchRimGeometry = ribbonGeometry();
  const scorchRimMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    toneMapped: false,
  });
  const scorchRim = new THREE.Mesh(scorchRimGeometry, scorchRimMaterial);
  scorchRim.name = `${name}:scorch-rim`;
  scorchRim.frustumCulled = false;
  const bladeGlow = glowSprite(resources, 0xff8a3a, `${name}:blade-glow`);
  const embers = new WardenParticleCloud(resources, 64, 8817, 0.14 * scale, `${name}:embers`);
  const light = new THREE.PointLight(0xff6a24, 0, 6 * scale, 2);
  light.name = `${name}:light`;
  root.add(wave, crest, scorch, scorchRim, bladeGlow, embers.points, light);
  const center = new THREE.Vector3();
  const tip = new THREE.Vector3();
  let startAngle = 0;
  let endAngle = 0;
  let waveStrength = 0;
  let bladeStrength = 0;
  let scorchStrength = 0;
  let scorchEmber = 0;
  let time = 0;
  const innerRadius = 1.05 * scale;
  const outerRadius = 2.9 * scale;
  const waveInner = new THREE.Color(0xff6a1e);
  const waveOuter = new THREE.Color(0xffd070);
  const scorchColor = new THREE.Color(0x120805);
  const scorchEdge = new THREE.Color(0x2a1208);
  const rimColor = new THREE.Color(0xff5a14);

  const refresh = (): void => {
    const anyVisible = waveStrength > 0.001 || bladeStrength > 0.001 || scorchStrength > 0.001;
    root.visible = anyVisible;
    if (!anyVisible) return;
    const flicker = 0.85 + 0.15 * Math.sin(time * 41);
    waveMaterial.color.setScalar(waveStrength * flicker);
    wave.visible = waveStrength > 0.001;
    crestMaterial.color.setScalar(waveStrength * 0.7);
    crest.visible = wave.visible;
    scorchMaterial.opacity = scorchStrength * 0.82;
    scorch.visible = scorchStrength > 0.001;
    scorchRimMaterial.color.setScalar(scorchEmber * (0.75 + 0.25 * Math.sin(time * 9)));
    scorchRim.visible = scorchEmber > 0.001;
    bladeGlow.material.opacity = bladeStrength;
    bladeGlow.scale.setScalar((0.3 + 0.5 * bladeStrength) * scale);
    bladeGlow.visible = bladeStrength > 0.001;
    bladeGlow.position.copy(tip);
    light.intensity = waveStrength * 7 + bladeStrength * 2.5;
    light.position.copy(tip).setY(center.y + 0.6 * scale);
    embers.setStrength(waveStrength);
    if (waveStrength > 0.001) {
      const span = endAngle - startAngle;
      for (let index = 0; index < embers.count; index += 1) {
        const along = embers.seed(index, 0);
        const angle = startAngle + span * (0.35 + 0.65 * along);
        const radius = (innerRadius + (outerRadius - innerRadius) * embers.seed(index, 1)) * (1 + 0.12 * Math.sin(time * 5 + index));
        const rise = (0.2 + embers.seed(index, 2) * 1.1 + ((time * 0.8 + embers.seed(index, 3)) % 1) * 0.6) * scale;
        embers.set(
          index,
          center.x + Math.sin(angle) * radius,
          center.y + rise,
          center.z + Math.cos(angle) * radius,
          1, 0.3 + 0.4 * embers.seed(index, 3), 0.05,
        );
      }
      embers.commit();
    }
  };

  return {
    root,
    setArc: (nextCenter, nextStart, nextEnd) => {
      center.copy(nextCenter);
      startAngle = nextStart;
      endAngle = nextEnd;
      buildArcRibbon(waveGeometry, center, startAngle, endAngle, innerRadius, outerRadius, 1.15 * scale, waveInner, waveOuter);
      buildArcRibbon(crestGeometry, center, startAngle, endAngle, outerRadius * 0.92, outerRadius * 1.08, 0.5 * scale, waveOuter, waveInner);
      const ground = center.clone();
      ground.y += 0.015;
      buildArcRibbon(scorchGeometry, ground, startAngle, endAngle, innerRadius * 0.9, outerRadius * 1.05, 0, scorchColor, scorchEdge);
      buildArcRibbon(scorchRimGeometry, ground, startAngle, endAngle, innerRadius * 0.9, outerRadius * 1.05, 0.004, rimColor, rimColor);
      refresh();
    },
    setBladeGlow: (nextTip, strength) => { tip.copy(nextTip); bladeStrength = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setWave: (strength) => { waveStrength = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setScorch: (strength, emberStrength) => {
      scorchStrength = THREE.MathUtils.clamp(strength, 0, 1);
      scorchEmber = THREE.MathUtils.clamp(emberStrength, 0, 1);
      refresh();
    },
    setTime: (seconds) => { time = seconds; refresh(); },
    hide: () => { waveStrength = 0; bladeStrength = 0; scorchStrength = 0; scorchEmber = 0; refresh(); },
    dispose: () => {
      root.removeFromParent();
      waveGeometry.dispose();
      waveMaterial.dispose();
      crestGeometry.dispose();
      crestMaterial.dispose();
      scorchGeometry.dispose();
      scorchMaterial.dispose();
      scorchRimGeometry.dispose();
      scorchRimMaterial.dispose();
      bladeGlow.material.dispose();
      embers.dispose();
      light.dispose();
    },
  };
}

export interface WardenAshRingVisual extends WardenVfxVisual {
  setCenter(center: THREE.Vector3): void;
  setTelegraph(strength: number): void;
  /** progress 0..1 expands the burst ring from the body to the full radius. */
  setBurst(progress: number, strength: number): void;
  setAsh(progress: number, strength: number): void;
  setTime(seconds: number): void;
  hide(): void;
  readonly burstRadiusMeters: number;
}

/**
 * AshCall: a telegraph ring on the floor that pulses in first, then an ash burst
 * ring with a low wall of heat and a cloud of drifting ash and embers.
 */
export function createWardenAshRingVisual(
  resources: WardenVfxResources,
  scale: number,
  name: string,
): WardenAshRingVisual {
  const root = new THREE.Group();
  root.name = name;
  const burstRadiusMeters = 3.4 * scale;
  const telegraphMaterial = flatMaterial(0xff9448, 0, true);
  const telegraphRing = new THREE.Mesh(resources.unitRing, telegraphMaterial);
  telegraphRing.name = `${name}:telegraph-ring`;
  telegraphRing.rotation.x = -Math.PI / 2;
  const telegraphFillMaterial = flatMaterial(0x6a4a3a, 0, false);
  const telegraphFill = new THREE.Mesh(resources.unitDisc, telegraphFillMaterial);
  telegraphFill.name = `${name}:telegraph-fill`;
  telegraphFill.rotation.x = -Math.PI / 2;
  const burstMaterial = flatMaterial(0xc9a27e, 0, true);
  const burstRing = new THREE.Mesh(resources.unitRing, burstMaterial);
  burstRing.name = `${name}:burst-ring`;
  burstRing.rotation.x = -Math.PI / 2;
  const wallMaterial = scrollingSheathMaterial(resources, 0x8a7568, 0xffa060, 1.6, 1);
  const wall = new THREE.Mesh(resources.cylinder, wallMaterial);
  wall.name = `${name}:burst-wall`;
  const ash = new WardenParticleCloud(resources, 150, 3311, 0.18 * scale, `${name}:ash`);
  const light = new THREE.PointLight(0xff8040, 0, 7 * scale, 2);
  light.name = `${name}:light`;
  root.add(telegraphRing, telegraphFill, burstRing, wall, ash.points, light);
  const center = new THREE.Vector3();
  let telegraph = 0;
  let burstProgress = 0;
  let burst = 0;
  let ashProgress = 0;
  let ashStrength = 0;
  let time = 0;

  const refresh = (): void => {
    const anyVisible = telegraph > 0.001 || burst > 0.001 || ashStrength > 0.001;
    root.visible = anyVisible;
    if (!anyVisible) return;
    const pulse = 0.7 + 0.3 * Math.sin(time * 8);
    telegraphMaterial.opacity = telegraph * pulse;
    telegraphRing.position.copy(center).setY(center.y + 0.03);
    telegraphRing.scale.setScalar(burstRadiusMeters);
    telegraphRing.visible = telegraph > 0.001;
    telegraphFillMaterial.opacity = telegraph * 0.22;
    telegraphFill.position.copy(center).setY(center.y + 0.02);
    telegraphFill.scale.setScalar(burstRadiusMeters);
    telegraphFill.visible = telegraph > 0.001;
    const radius = Math.max(0.05, burstRadiusMeters * (0.15 + 0.85 * burstProgress));
    burstMaterial.opacity = burst * (1 - burstProgress * 0.6);
    burstRing.position.copy(center).setY(center.y + 0.05);
    burstRing.scale.setScalar(radius);
    burstRing.visible = burst > 0.001;
    // a 3.6 m boss needs a wall the player reads at a glance: shin-to-hip height that settles as the burst spreads
    const wallHeight = (0.9 + 0.9 * (1 - burstProgress)) * scale;
    wall.position.copy(center).setY(center.y + wallHeight / 2);
    wall.scale.set(radius, wallHeight, radius);
    setUniform(wallMaterial, "uStrength", burst * 0.8);
    setUniform(wallMaterial, "uTime", time);
    wall.visible = burst > 0.001;
    light.position.copy(center).setY(center.y + 1.2 * scale);
    light.intensity = burst * 6 + telegraph * 1.5;
    ash.setStrength(ashStrength);
    if (ashStrength > 0.001) {
      for (let index = 0; index < ash.count; index += 1) {
        const angle = ash.seed(index, 0) * Math.PI * 2 + time * 0.4;
        const reach = burstRadiusMeters * (0.2 + 0.8 * ash.seed(index, 1)) * Math.min(1, ashProgress * 1.4 + 0.1);
        const rise = (0.1 + ash.seed(index, 2) * 1.6) * ashProgress * scale + Math.sin(time * 2 + index) * 0.05;
        const ember = ash.seed(index, 3) > 0.78;
        ash.set(
          index,
          center.x + Math.sin(angle) * reach,
          center.y + rise,
          center.z + Math.cos(angle) * reach,
          ember ? 1 : 0.55, ember ? 0.42 : 0.5, ember ? 0.1 : 0.46,
        );
      }
      ash.commit();
    }
  };

  return {
    root,
    burstRadiusMeters,
    setCenter: (next) => { center.copy(next); refresh(); },
    setTelegraph: (strength) => { telegraph = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setBurst: (progress, strength) => {
      burstProgress = THREE.MathUtils.clamp(progress, 0, 1);
      burst = THREE.MathUtils.clamp(strength, 0, 1);
      refresh();
    },
    setAsh: (progress, strength) => {
      ashProgress = THREE.MathUtils.clamp(progress, 0, 1);
      ashStrength = THREE.MathUtils.clamp(strength, 0, 1);
      refresh();
    },
    setTime: (seconds) => { time = seconds; refresh(); },
    hide: () => { telegraph = 0; burst = 0; ashStrength = 0; refresh(); },
    dispose: () => {
      root.removeFromParent();
      telegraphMaterial.dispose();
      telegraphFillMaterial.dispose();
      burstMaterial.dispose();
      wallMaterial.dispose();
      ash.dispose();
      light.dispose();
    },
  };
}

export interface WardenSoulTaxVisual extends WardenVfxVisual {
  setEndpoints(palm: THREE.Vector3, target: THREE.Vector3): void;
  /** Converging rings close on the palm over progress 0..1. */
  setTelegraph(progress: number, strength: number): void;
  setSiphon(strength: number, flow: number): void;
  setPulse(strength: number): void;
  setTime(seconds: number): void;
  hide(): void;
}

/**
 * SoulTax: pale soul-light rather than fire. Two rings converge on the open palm
 * during the telegraph, then a tether of soul motes streams from the target's
 * feet into the palm while a slowing ring holds under the target; the drain
 * pulse flashes both ends.
 */
export function createWardenSoulTaxVisual(
  resources: WardenVfxResources,
  scale: number,
  name: string,
): WardenSoulTaxVisual {
  const root = new THREE.Group();
  root.name = name;
  const palm = new THREE.Vector3();
  const target = new THREE.Vector3();
  const palmVortex = glowSprite(resources, 0x8ee8ff, `${name}:palm-vortex`);
  const ringMaterialA = flatMaterial(0x9ad8ff, 0, true);
  const ringMaterialB = flatMaterial(0xc8a8ff, 0, true);
  const ringA = new THREE.Mesh(resources.unitRing, ringMaterialA);
  ringA.name = `${name}:converge-ring-a`;
  const ringB = new THREE.Mesh(resources.unitRing, ringMaterialB);
  ringB.name = `${name}:converge-ring-b`;
  const targetRingMaterial = flatMaterial(0x7fd6ff, 0, true);
  const targetRing = new THREE.Mesh(resources.unitRing, targetRingMaterial);
  targetRing.name = `${name}:slow-ring`;
  targetRing.rotation.x = -Math.PI / 2;
  const targetFlash = glowSprite(resources, 0xd8f4ff, `${name}:drain-flash`);
  const motes = new WardenParticleCloud(resources, 64, 7741, 0.13 * scale, `${name}:soul-motes`);
  const light = new THREE.PointLight(0x8ee8ff, 0, 5 * scale, 2);
  light.name = `${name}:light`;
  root.add(palmVortex, ringA, ringB, targetRing, targetFlash, motes.points, light);
  let telegraphProgress = 0;
  let telegraph = 0;
  let siphon = 0;
  let flow = 0;
  let pulse = 0;
  let time = 0;
  const direction = new THREE.Vector3();

  const refresh = (): void => {
    const anyVisible = telegraph > 0.001 || siphon > 0.001 || pulse > 0.001;
    root.visible = anyVisible;
    if (!anyVisible) return;
    direction.copy(palm).sub(target);
    const distance = direction.length();
    if (distance > 1e-6) direction.divideScalar(distance);
    const facing = direction.lengthSq() > 1e-6 ? direction : new THREE.Vector3(0, 0, 1);
    const palmStrength = Math.max(telegraph, siphon);
    palmVortex.position.copy(palm);
    palmVortex.material.opacity = palmStrength * (0.75 + 0.25 * Math.sin(time * 6));
    palmVortex.scale.setScalar((0.3 + 0.5 * palmStrength + 0.4 * pulse) * scale);
    palmVortex.visible = palmStrength > 0.001 || pulse > 0.001;
    const converge = 1 - telegraphProgress;
    ringA.position.copy(palm).addScaledVector(facing, -0.9 * converge * scale);
    ringA.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), facing);
    ringA.scale.setScalar((0.12 + 0.9 * converge) * scale);
    ringMaterialA.opacity = telegraph * 0.9;
    ringA.visible = telegraph > 0.001;
    const convergeB = 1 - Math.min(1, telegraphProgress * 1.35);
    ringB.position.copy(palm).addScaledVector(facing, -1.5 * convergeB * scale);
    ringB.quaternion.copy(ringA.quaternion);
    ringB.scale.setScalar((0.1 + 1.3 * convergeB) * scale);
    ringMaterialB.opacity = telegraph * 0.7;
    ringB.visible = telegraph > 0.001;
    targetRing.position.copy(target).setY(target.y + 0.03);
    targetRing.scale.setScalar((0.55 + 0.25 * Math.sin(time * 3)) * scale);
    targetRingMaterial.opacity = siphon * 0.85 + pulse * 0.15;
    targetRing.visible = targetRingMaterial.opacity > 0.001;
    targetFlash.position.copy(target).setY(target.y + 0.9);
    targetFlash.material.opacity = pulse;
    targetFlash.scale.setScalar((0.5 + 1.2 * pulse) * scale);
    targetFlash.visible = pulse > 0.001;
    light.position.copy(palm);
    light.intensity = telegraph * 1.5 + siphon * 3 + pulse * 6;
    motes.setStrength(siphon);
    if (siphon > 0.001) {
      for (let index = 0; index < motes.count; index += 1) {
        const along = (motes.seed(index, 0) + flow * (0.6 + 0.8 * motes.seed(index, 1))) % 1;
        const arc = Math.sin(along * Math.PI);
        const wobble = Math.sin(time * 4 + index) * 0.08 * scale;
        motes.set(
          index,
          target.x + (palm.x - target.x) * along + wobble,
          target.y + 0.15 + (palm.y - target.y - 0.15) * along + arc * 0.55 * scale,
          target.z + (palm.z - target.z) * along + wobble,
          0.5 + 0.3 * motes.seed(index, 2), 0.85, 1,
        );
      }
      motes.commit();
    }
  };

  return {
    root,
    setEndpoints: (nextPalm, nextTarget) => { palm.copy(nextPalm); target.copy(nextTarget); refresh(); },
    setTelegraph: (progress, strength) => {
      telegraphProgress = THREE.MathUtils.clamp(progress, 0, 1);
      telegraph = THREE.MathUtils.clamp(strength, 0, 1);
      refresh();
    },
    setSiphon: (strength, nextFlow) => { siphon = THREE.MathUtils.clamp(strength, 0, 1); flow = nextFlow; refresh(); },
    setPulse: (strength) => { pulse = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setTime: (seconds) => { time = seconds; refresh(); },
    hide: () => { telegraph = 0; siphon = 0; pulse = 0; refresh(); },
    dispose: () => {
      root.removeFromParent();
      palmVortex.material.dispose();
      ringMaterialA.dispose();
      ringMaterialB.dispose();
      targetRingMaterial.dispose();
      targetFlash.material.dispose();
      motes.dispose();
      light.dispose();
    },
  };
}

export interface WardenFurnaceShutdownVisual extends WardenVfxVisual {
  setChest(chest: THREE.Vector3): void;
  setFloor(floorCenter: THREE.Vector3): void;
  /** Vent plume strength: the furnace gutters as it drops toward zero. */
  setVent(strength: number): void;
  setValves(strength: number): void;
  setVulnerability(strength: number): void;
  setReignite(strength: number): void;
  setTime(seconds: number): void;
  hide(): void;
}

/**
 * FurnaceShutdown: the chest furnace vents and gutters out, the exposed valves
 * glow a readable "strike now" red, a gold vulnerability ring holds under the
 * kneeling boss, and the reignite flashes the furnace back to life.
 */
export function createWardenFurnaceShutdownVisual(
  resources: WardenVfxResources,
  scale: number,
  name: string,
): WardenFurnaceShutdownVisual {
  const root = new THREE.Group();
  root.name = name;
  const chest = new THREE.Vector3();
  const floor = new THREE.Vector3();
  const plume = new WardenParticleCloud(resources, 90, 9901, 0.15 * scale, `${name}:vent-plume`);
  const valves = glowSprite(resources, 0xff3a1a, `${name}:valves-glow`);
  const vulnerabilityMaterial = flatMaterial(0xffd27a, 0, true);
  const vulnerabilityRing = new THREE.Mesh(resources.unitRing, vulnerabilityMaterial);
  vulnerabilityRing.name = `${name}:vulnerability-ring`;
  vulnerabilityRing.rotation.x = -Math.PI / 2;
  const reigniteFlash = glowSprite(resources, 0xffc070, `${name}:reignite-flash`);
  const light = new THREE.PointLight(0xff4a1a, 0, 5 * scale, 2);
  light.name = `${name}:light`;
  root.add(plume.points, valves, vulnerabilityRing, reigniteFlash, light);
  let vent = 0;
  let valveStrength = 0;
  let vulnerability = 0;
  let reignite = 0;
  let time = 0;

  const refresh = (): void => {
    const anyVisible = vent > 0.001 || valveStrength > 0.001 || vulnerability > 0.001 || reignite > 0.001;
    root.visible = anyVisible;
    if (!anyVisible) return;
    valves.position.copy(chest);
    valves.material.opacity = valveStrength * (0.65 + 0.35 * Math.sin(time * 7));
    valves.scale.setScalar((0.35 + 0.55 * valveStrength) * scale);
    valves.visible = valveStrength > 0.001;
    vulnerabilityRing.position.copy(floor).setY(floor.y + 0.03);
    vulnerabilityRing.scale.setScalar((1.6 + 0.12 * Math.sin(time * 3)) * scale);
    vulnerabilityMaterial.opacity = vulnerability * 0.8;
    vulnerabilityRing.visible = vulnerability > 0.001;
    reigniteFlash.position.copy(chest);
    reigniteFlash.material.opacity = reignite;
    reigniteFlash.scale.setScalar((0.6 + 1.6 * reignite) * scale);
    reigniteFlash.visible = reignite > 0.001;
    light.position.copy(chest);
    light.intensity = vent * 2 + valveStrength * 2.5 + reignite * 8;
    plume.setStrength(Math.max(vent, reignite));
    if (plume.points.visible) {
      for (let index = 0; index < plume.count; index += 1) {
        const life = (plume.seed(index, 0) + time * (0.5 + plume.seed(index, 1))) % 1;
        const spread = (0.1 + life * 0.5) * scale * (0.6 + reignite);
        const angle = plume.seed(index, 2) * Math.PI * 2;
        plume.set(
          index,
          chest.x + Math.sin(angle) * spread * plume.seed(index, 3),
          chest.y + life * (0.9 + reignite * 1.2) * scale,
          chest.z + Math.cos(angle) * spread * plume.seed(index, 3),
          1, 0.3 + 0.35 * (1 - life), 0.06,
        );
      }
      plume.commit();
    }
  };

  return {
    root,
    setChest: (next) => { chest.copy(next); refresh(); },
    setFloor: (next) => { floor.copy(next); refresh(); },
    setVent: (strength) => { vent = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setValves: (strength) => { valveStrength = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setVulnerability: (strength) => { vulnerability = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setReignite: (strength) => { reignite = THREE.MathUtils.clamp(strength, 0, 1); refresh(); },
    setTime: (seconds) => { time = seconds; refresh(); },
    hide: () => { vent = 0; valveStrength = 0; vulnerability = 0; reignite = 0; refresh(); },
    dispose: () => {
      root.removeFromParent();
      plume.dispose();
      valves.material.dispose();
      vulnerabilityMaterial.dispose();
      reigniteFlash.material.dispose();
      light.dispose();
    },
  };
}

export interface WardenEmberBurstVisual extends WardenVfxVisual {
  /** Advances the burst by wall time; returns true while it is still alive. */
  update(ageSeconds: number): boolean;
  readonly lifetimeSeconds: number;
}

/** Ember burst released when a damage shell tears off the body. */
export function createWardenEmberBurstVisual(
  resources: WardenVfxResources,
  scale: number,
  origin: THREE.Vector3,
  name: string,
): WardenEmberBurstVisual {
  const root = new THREE.Group();
  root.name = name;
  root.position.copy(origin);
  const lifetimeSeconds = 1.4;
  const embers = new WardenParticleCloud(resources, 56, 6121, 0.16 * scale, `${name}:embers`);
  const flash = glowSprite(resources, 0xffb060, `${name}:flash`);
  const light = new THREE.PointLight(0xff7a2a, 0, 4 * scale, 2);
  light.name = `${name}:light`;
  root.add(embers.points, flash, light);
  return {
    root,
    lifetimeSeconds,
    update: (ageSeconds) => {
      const progress = THREE.MathUtils.clamp(ageSeconds / lifetimeSeconds, 0, 1);
      const alive = progress < 1;
      root.visible = alive;
      if (!alive) return false;
      embers.setStrength(1 - progress * progress);
      for (let index = 0; index < embers.count; index += 1) {
        const yaw = embers.seed(index, 0) * Math.PI * 2;
        const pitch = embers.seed(index, 1) * Math.PI * 0.5;
        const speed = (1.4 + embers.seed(index, 2) * 2.6) * scale;
        const t = ageSeconds;
        embers.set(
          index,
          Math.sin(yaw) * Math.cos(pitch) * speed * t,
          Math.sin(pitch) * speed * t - 4.4 * t * t,
          Math.cos(yaw) * Math.cos(pitch) * speed * t,
          1, 0.25 + 0.45 * embers.seed(index, 3), 0.05,
        );
      }
      embers.commit();
      flash.material.opacity = Math.max(0, 1 - progress * 4);
      flash.scale.setScalar((0.5 + 1.5 * progress) * scale);
      flash.visible = flash.material.opacity > 0.001;
      light.intensity = Math.max(0, 1 - progress * 2) * 8;
      return true;
    },
    dispose: () => {
      root.removeFromParent();
      embers.dispose();
      flash.material.dispose();
      light.dispose();
    },
  };
}

export interface WardenScorchMarkVisual extends WardenVfxVisual {
  setStrength(strength: number, emberStrength: number): void;
}

/** Scorch mark burnt into the floor where a detached shell lands. */
export function createWardenScorchMarkVisual(
  resources: WardenVfxResources,
  radiusMeters: number,
  center: THREE.Vector3,
  name: string,
): WardenScorchMarkVisual {
  const root = new THREE.Group();
  root.name = name;
  root.position.copy(center);
  const scorchMaterial = new THREE.MeshBasicMaterial({
    color: 0x0d0704,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    toneMapped: false,
  });
  const scorch = new THREE.Mesh(resources.unitDisc, scorchMaterial);
  scorch.name = `${name}:burn`;
  scorch.rotation.x = -Math.PI / 2;
  scorch.scale.setScalar(radiusMeters);
  const rimMaterial = flatMaterial(0xff6a24, 0, true);
  const rim = new THREE.Mesh(resources.unitRing, rimMaterial);
  rim.name = `${name}:ember-rim`;
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.004;
  rim.scale.setScalar(radiusMeters * 1.05);
  root.add(scorch, rim);
  return {
    root,
    setStrength: (strength, emberStrength) => {
      scorchMaterial.opacity = THREE.MathUtils.clamp(strength, 0, 1) * 0.78;
      rimMaterial.opacity = THREE.MathUtils.clamp(emberStrength, 0, 1) * 0.85;
      root.visible = scorchMaterial.opacity > 0.001 || rimMaterial.opacity > 0.001;
    },
    dispose: () => {
      root.removeFromParent();
      scorchMaterial.dispose();
      rimMaterial.dispose();
    },
  };
}

export interface WardenExposedCoreVisual extends WardenVfxVisual {
  setPulse(seconds: number, damageFraction: number): void;
}

/**
 * Ember treatment for the body area a shell used to cover: a cluster of molten
 * seams, a glow and a small light, parented to the nearest bone so it rides the
 * animation. Sized in world meters regardless of the bone's inherited scale.
 */
export function createWardenExposedCoreVisual(
  resources: WardenVfxResources,
  scale: number,
  worldScaleOfParent: number,
  name: string,
): WardenExposedCoreVisual {
  const root = new THREE.Group();
  root.name = name;
  const inverse = worldScaleOfParent > 1e-6 ? 1 / worldScaleOfParent : 1;
  root.scale.setScalar(inverse);
  const seamMaterial = new THREE.MeshBasicMaterial({ color: 0xff6a1e, toneMapped: false });
  const seamGeometry = new THREE.SphereGeometry(0.09 * scale, 10, 8);
  const random = mulberry32(2211);
  const seams: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const seam = new THREE.Mesh(seamGeometry, seamMaterial);
    seam.name = `${name}:seam-${index}`;
    seam.position.set((random() - 0.5) * 0.36 * scale, (random() - 0.5) * 0.3 * scale, (random() - 0.5) * 0.36 * scale);
    seam.scale.set(1.4, 0.5, 1.1);
    seams.push(seam);
    root.add(seam);
  }
  const glow = glowSprite(resources, 0xff7a2a, `${name}:glow`);
  glow.scale.setScalar(0.7 * scale);
  const light = new THREE.PointLight(0xff6a24, 1.4, 2.6 * scale, 2);
  light.name = `${name}:light`;
  root.add(glow, light);
  return {
    root,
    setPulse: (seconds, damageFraction) => {
      const pulse = 0.72 + 0.28 * Math.sin(seconds * 5.3);
      const dying = damageFraction >= 1 ? 0.3 : 1;
      seamMaterial.color.setRGB(1, 0.32 + 0.18 * pulse, 0.06).multiplyScalar(0.8 + 0.4 * pulse * dying);
      glow.material.opacity = (0.55 + 0.35 * pulse) * dying;
      light.intensity = (1 + 1.2 * pulse) * dying;
    },
    dispose: () => {
      root.removeFromParent();
      seamGeometry.dispose();
      seamMaterial.dispose();
      glow.material.dispose();
      light.dispose();
    },
  };
}
