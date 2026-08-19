/**
 * Heartvale zone preview — scene assembly (T5 + runbook §4.6 hook).
 *
 * Judging ground for the visual review gate: day lighting per
 * docs/LIGHTING-PROFILES.md (ACES, PCF-soft shadows, warm key + sky fill),
 * exponential harvest-haze fog, gradient sky dome, and N8AO contact
 * shadows — the "grounding" pass Finding 4/T5 demands. Camera presets via
 * ?cam=soulwell|anwel|river|iso for deterministic review screenshots.
 * HUD reports the camera focus in plate-world meters + zoneAt() so the
 * multiplayer boundary hook is exercised even in preview.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { N8AOPass } from "n8ao";

import { loadZoneData, zoneAt, type ZoneData } from "./data";
import { createSplatDataTextures, createTerrain } from "./terrain";
import { createRivers } from "./water";
import { createGrassField, createVegetation } from "./vegetation";
import { createVillageAndTerrace } from "./village";

const DATA_BASE = "/data/zones/heartvale";

interface CameraPreset {
  target: [number, number];
  offset: [number, number, number];
}

function presets(data: ZoneData): Record<string, CameraPreset> {
  const field = data.field;
  const anwel = data.village.anchor;
  // River bend: midpoint of the main stem, in local frame.
  const main = data.layout.rivers[0];
  const mid = main?.samples[Math.floor((main?.samples.length ?? 0) / 2)];
  const riverLocal: [number, number] = [
    (mid?.[0] ?? 0) - data.meta.plateOffset[0],
    (mid?.[1] ?? 0) - data.meta.plateOffset[1],
  ];
  return {
    soulwell: { target: [0, 0], offset: [16, 11, 16] },
    anwel: { target: [anwel.x, anwel.z], offset: [24, 16, 24] },
    river: { target: riverLocal, offset: [30, 14, 30] },
    iso: { target: [anwel.x * 0.4, anwel.z * 0.4], offset: [260, 210, 300] },
  };
}

function createSkyDome(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(4200, 24, 12);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0x7fa8cc) },
      uHorizon: { value: new THREE.Color(0xe8dfc0) },
      uSunDir: { value: new THREE.Vector3(0.55, 0.62, 0.35).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));
        float sun = pow(max(dot(normalize(vDir), uSunDir), 0.0), 220.0);
        float halo = pow(max(dot(normalize(vDir), uSunDir), 0.0), 8.0);
        sky += vec3(1.0, 0.86, 0.6) * (sun * 1.6 + halo * 0.18);
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.name = "SkyDome";
  dome.renderOrder = -10;
  return dome;
}

function setupLighting(scene: THREE.Scene): THREE.DirectionalLight {
  // Day profile (LIGHTING-PROFILES.md): warm key, cool-sky fill, soft shadows.
  const sun = new THREE.DirectionalLight(0xffe6bd, 2.7);
  sun.position.set(90, 130, 55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 480;
  const span = 150;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  scene.add(sun);
  scene.add(sun.target);

  const hemisphere = new THREE.HemisphereLight(0xbdd2e4, 0x8a7a52, 0.95);
  scene.add(hemisphere);
  const ambient = new THREE.AmbientLight(0xfff2dd, 0.22);
  scene.add(ambient);
  return sun;
}

function setupHud(container: HTMLElement): HTMLDivElement {
  const hud = document.createElement("div");
  hud.style.cssText = [
    "position:absolute", "left:10px", "bottom:10px", "padding:6px 10px",
    "background:rgba(10,12,10,0.55)", "color:#e8dcc0", "font:12px/1.5 monospace",
    "border-radius:6px", "pointer-events:none", "white-space:pre",
  ].join(";");
  container.appendChild(hud);
  return hud;
}

export async function startZonePreview(container: HTMLElement, zoneId: string): Promise<void> {
  container.style.cssText = "position:fixed;inset:0;overflow:hidden;background:#101410;";
  const loading = document.createElement("div");
  loading.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e8dcc0;font:14px monospace;";
  loading.textContent = "Loading Heartvale terrain, textures and vegetation…";
  container.appendChild(loading);

  const data = await loadZoneData(DATA_BASE);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd3d6c4, 0.0015);
  scene.add(createSkyDome());
  const sun = setupLighting(scene);

  const camera = new THREE.PerspectiveCamera(
    34,
    container.clientWidth / container.clientHeight,
    0.3,
    6000,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.maxDistance = 1400;

  const params = new URL(window.location.href).searchParams;
  const presetName = params.get("cam") ?? "soulwell";
  const table = presets(data);
  const preset = table[presetName] ?? table.soulwell ?? { target: [0, 0] as [number, number], offset: [16, 11, 16] as [number, number, number] };
  const [tx, tz] = preset.target;
  const [ox, oy, oz] = preset.offset;
  const ty = data.field.height(tx, tz);
  controls.target.set(tx, ty, tz);
  camera.position.set(tx + (ox ?? 16), ty + (oy ?? 11), tz + (oz ?? 16));

  // --- Content ---
  scene.add(createTerrain(data.meta, data.field));

  const terrain = data.field;
  const [splatA, splatB] = createSplatDataTextures(terrain);
  const rivers = createRivers(data.layout.rivers, terrain, data.meta.plateOffset, splatA, splatB);
  scene.add(rivers);

  const grass = createGrassField(data.scatter, terrain);
  scene.add(grass);

  const village = await createVillageAndTerrace(data.village, data.npcs, terrain);
  scene.add(village);

  const vegetation = await createVegetation(data.scatter, terrain);
  scene.add(vegetation);

  // --- Post: N8AO contact shadows (T5) ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let aoPass: { setSize: (w: number, h: number) => void } | null = null;
  try {
    const n8aopass = new N8AOPass(scene, camera, container.clientWidth, container.clientHeight);
    n8aopass.configuration.aoRadius = 2.0;
    n8aopass.configuration.distanceFalloff = 3.0;
    n8aopass.configuration.intensity = 3.2;
    n8aopass.configuration.halfRes = true;
    composer.addPass(n8aopass as unknown as import("three/examples/jsm/postprocessing/Pass.js").Pass);
    aoPass = n8aopass;
  } catch (error) {
    console.warn("N8AO unavailable; continuing without AO pass.", error);
  }
  composer.addPass(new OutputPass());

  const hud = setupHud(container);
  loading.remove();

  const clock = new THREE.Clock();
  const tickables = [rivers.userData.tick, grass.userData.tick].filter(Boolean);

  renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    for (const tick of tickables) tick(elapsed);
    controls.update();

    // Shadow frustum follows the camera focus.
    sun.target.position.copy(controls.target);
    sun.position.set(
      controls.target.x + 90,
      controls.target.y + 130,
      controls.target.z + 55,
    );

    const wx = controls.target.x + data.meta.plateOffset[0];
    const wz = controls.target.z + data.meta.plateOffset[1];
    const zone = zoneAt(data.meta, wx, wz);
    hud.textContent =
      `zone preview: ${zoneId}  cam: ${presetName}\n` +
      `world: ${wx.toFixed(1)}, ${wz.toFixed(1)} m  ` +
      `zone: ${zone ? `${zone.id} · ${zone.name}` : "outside section"}`;
    composer.render();
  });

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    aoPass?.setSize(w, h);
  });
}
