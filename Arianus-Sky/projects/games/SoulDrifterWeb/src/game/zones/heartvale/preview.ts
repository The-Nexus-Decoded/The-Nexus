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
import { createRivers, DEFAULT_WATER_WIDTH, RIVER_WIDTH } from "./water";
import { createGrassField, createVegetation } from "./vegetation";
import { createVillageAndTerrace } from "./village";
import { WaterBody } from "./swim";
import { ZonePlayer } from "./player";
import { WATER_TUNING } from "./waterTuning";

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
    // Village core: the plaza on the dry east bank, not the anchor in the river.
    anwel: { target: [anwel.x + 22.5, anwel.z - 2.0], offset: [26, 17, 26] },
    river: { target: riverLocal, offset: [30, 14, 30] },
    riverclose: { target: riverLocal, offset: [14, 5, 14] },
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

/** Walk-mode HUD: breath + health bars (visible only while walking, #453). */
function setupVitalsHud(container: HTMLElement): { element: HTMLDivElement; set: (breath: number, health: number, contact: string) => void } {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:260px;" +
    "font:11px monospace;color:#e8dcc0;display:none;pointer-events:none;text-align:center;";
  const contact = document.createElement("div");
  contact.style.cssText = "margin-bottom:4px;text-shadow:0 1px 2px #000;";
  wrap.appendChild(contact);
  const bars: HTMLDivElement[] = [];
  for (const [label, color] of [["breath", "#4ec3c9"], ["health", "#c94e4e"]] as const) {
    const row = document.createElement("div");
    row.style.cssText = "height:10px;background:rgba(0,0,0,0.5);border:1px solid #333;border-radius:5px;margin:3px 0;position:relative;";
    const fill = document.createElement("div");
    fill.style.cssText = `height:100%;width:100%;background:${color};border-radius:4px;transition:width 0.15s;`;
    row.appendChild(fill);
    const tag = document.createElement("span");
    tag.textContent = label;
    tag.style.cssText = "position:absolute;left:6px;top:-1px;font-size:9px;color:#fff;text-shadow:0 1px 1px #000;";
    row.appendChild(tag);
    wrap.appendChild(row);
    bars.push(fill);
  }
  container.appendChild(wrap);
  return {
    element: wrap,
    set: (breath, health, contactText) => {
      bars[0]!.style.width = `${Math.round(breath * 100)}%`;
      bars[1]!.style.width = `${Math.round(health * 100)}%`;
      contact.textContent = contactText;
    },
  };
}

/** Underwater full-screen tint when the camera is submerged (#453). */
function setupUnderwaterOverlay(container: HTMLElement): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:absolute;inset:0;pointer-events:none;display:none;" +
    `background:radial-gradient(ellipse at center, rgba(30,74,82,0.35), rgba(20,50,58,0.6));`;
  container.appendChild(overlay);
  return overlay;
}

/** Hidden dev/test teleport panel — never shown to normal users.
 * Open with `?dev=1` or by pressing backtick (`). Buttons teleport the
 * camera to any POI anchor or zone center, or swap camera presets. */
function setupDevPanel(
  container: HTMLElement,
  data: ZoneData,
  visible: boolean,
  teleport: (x: number, z: number, offset: [number, number, number]) => void,
  presetJump: (name: string) => void,
): void {
  const panel = document.createElement("div");
  panel.style.cssText = [
    "position:absolute", "top:10px", "right:10px", "padding:10px 12px",
    "background:rgba(8,10,8,0.78)", "color:#e8dcc0", "font:12px/1.7 monospace",
    "border-radius:8px", "border:1px solid #4a4632", "max-height:90vh",
    "overflow-y:auto",
  ].join(";");
  panel.style.display = visible ? "block" : "none";

  const title = document.createElement("div");
  title.textContent = "DEV TELEPORT (` to hide)";
  title.style.cssText = "color:#c9a84c;font-weight:bold;margin-bottom:6px;";
  panel.appendChild(title);

  const addButton = (label: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText =
      "display:block;width:100%;text-align:left;margin:2px 0;padding:3px 8px;" +
      "background:#232a1e;color:#e8dcc0;border:1px solid #4a4632;border-radius:4px;cursor:pointer;font:11px monospace;";
    btn.onclick = onClick;
    panel.appendChild(btn);
  };

  const section = (label: string) => {
    const div = document.createElement("div");
    div.textContent = label;
    div.style.cssText = "color:#8a9678;margin-top:8px;";
    panel.appendChild(div);
  };

  const [offX, offZ] = data.meta.plateOffset;

  section("POI anchors");
  for (const anchor of data.layout.anchors) {
    const zone = anchor.zone ? ` [${anchor.zone}]` : "";
    // Anwel's anchor sits in the river by canon — teleport to the plaza instead.
    const isAnwel = anchor.id === "anwel";
    const lx = isAnwel ? data.village.plaza.x : anchor.world.x - offX;
    const lz = isAnwel ? data.village.plaza.z : anchor.world.z - offZ;
    addButton(`${anchor.id}${zone}`, () => teleport(lx, lz, [22, 14, 22]));
  }

  section("Zone centers");
  for (const zoneRect of data.meta.zones) {
    const cx = (zoneRect.rect.x0 + zoneRect.rect.x1) / 2 - offX;
    const cz = (zoneRect.rect.z0 + zoneRect.rect.z1) / 2 - offZ;
    addButton(`${zoneRect.id} · ${zoneRect.name}`, () => teleport(cx, cz, [180, 150, 220]));
  }

  section("Camera presets");
  for (const name of ["soulwell", "anwel", "river", "riverclose", "iso"]) {
    addButton(`cam: ${name}`, () => presetJump(name));
  }

  container.appendChild(panel);
  window.addEventListener("keydown", (event) => {
    if (event.key === "`" || event.key === "~") {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    }
  });
}

export async function startZonePreview(container: HTMLElement, zoneId: string): Promise<{ dispose: () => void }> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;overflow:hidden;background:#101410;";
  container.appendChild(host);
  const loading = document.createElement("div");
  loading.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e8dcc0;font:14px monospace;";
  loading.textContent = "Loading Heartvale terrain, textures and vegetation…";
  container.appendChild(loading);

  const data = await loadZoneData(DATA_BASE);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd3d6c4, 0.00042);
  scene.add(createSkyDome());
  const sun = setupLighting(scene);

  const camera = new THREE.PerspectiveCamera(
    34,
    host.clientWidth / host.clientHeight,
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

  // Dev teleport panel (?dev=1 or backtick) — hidden from normal users.
  const teleportTo = (x: number, z: number, offset: [number, number, number]) => {
    const y = data.field.height(x, z);
    controls.target.set(x, y, z);
    camera.position.set(x + offset[0], y + offset[1], z + offset[2]);
  };
  const presetJump = (name: string) => {
    const p = table[name];
    if (!p) return;
    teleportTo(p.target[0], p.target[1], p.offset);
  };
  setupDevPanel(host, data, params.get("dev") === "1", teleportTo, presetJump);

  // --- Content ---
  scene.add(createTerrain(data.meta, data.field));

  const terrain = data.field;
  const [splatA, splatB] = createSplatDataTextures(terrain);
  const rivers = createRivers(data.layout.rivers, terrain, data.meta.plateOffset, splatA, splatB);
  scene.add(rivers);

  const grass = createGrassField(data.scatter, terrain);
  scene.add(grass);

  const village = await createVillageAndTerrace(data.village, data.npcs, terrain, data.layout, data.meta.plateOffset);
  scene.add(village);

  const vegetation = await createVegetation(data.scatter, terrain);
  scene.add(vegetation);

  // --- Post: N8AO contact shadows (T5) ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let aoPass: { setSize: (w: number, h: number) => void } | null = null;
  try {
    const n8aopass = new N8AOPass(scene, camera, host.clientWidth, host.clientHeight);
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

  const hud = setupHud(host);
  const vitals = setupVitalsHud(host);
  const underwaterOverlay = setupUnderwaterOverlay(host);
  loading.remove();

  // --- Swimmable water (#453): water domain + walk-mode player ---
  const water = new WaterBody(
    terrain,
    data.layout.rivers.map((river) => ({
      id: river.id,
      samples: river.samples.map(
        ([wx, wz]) => [wx - data.meta.plateOffset[0], wz - data.meta.plateOffset[1]] as [number, number],
      ),
      halfWidth: (RIVER_WIDTH[river.id] ?? DEFAULT_WATER_WIDTH) / 2,
    })),
  );
  const player = new ZonePlayer(scene);
  player.place(6, 6, terrain); // on the terrace apron, beside the well
  player.root.visible = false;

  const keys = new Set<string>();
  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

  let walkMode = false;
  const setWalkMode = (on: boolean) => {
    walkMode = on;
    player.root.visible = on;
    controls.enablePan = !on;
    controls.enableZoom = !on;
    if (on) {
      // camera swings behind the player
      const p = player.position;
      const y = terrain.height(p.x, p.z);
      controls.target.set(p.x, y + 1.4, p.z);
      camera.position.set(p.x - 5, y + 3.4, p.z - 5);
    }
  };
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "t" && !event.repeat) setWalkMode(!walkMode);
  });

  // Debug/review hook: lets the Playwright probe inspect the scene graph.
  const hooks = window as unknown as {
    __zoneScene: THREE.Scene;
    __zoneData: ZoneData;
    __zoneFrames: number;
    __zoneLoopError: string | null;
    __zoneCamera: THREE.PerspectiveCamera;
    __zoneRenderer: THREE.WebGLRenderer;
    __zoneControls: OrbitControls;
    __zonePlayer: ZonePlayer;
    __zoneWalk: (on: boolean) => void;
    __zoneKeys: Set<string>;
  };
  hooks.__zoneScene = scene;
  hooks.__zoneData = data;
  hooks.__zoneCamera = camera;
  hooks.__zoneRenderer = renderer;
  hooks.__zoneControls = controls;
  hooks.__zonePlayer = player;
  hooks.__zoneWalk = setWalkMode;
  hooks.__zoneKeys = keys;
  hooks.__zoneFrames = 0;
  hooks.__zoneLoopError = null;

  const clock = new THREE.Clock();
  // Collect every animated subsystem's tick (water, grass wind, horses…).
  const tickables: ((elapsed: number, delta: number) => void)[] = [];
  scene.traverse((node) => {
    if (typeof node.userData.tick === "function") tickables.push(node.userData.tick);
  });

  // FPS/frame-ms meter (latency smoke, visible on the dev HUD line).
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsText = "…";

  renderer.setAnimationLoop(() => {
    try {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      fpsAccum += delta;
      fpsFrames += 1;
      if (fpsAccum >= 0.5) {
        const fps = fpsFrames / fpsAccum;
        fpsText = `${fps.toFixed(0)} fps · ${(1000 / fps).toFixed(1)} ms`;
        fpsAccum = 0;
        fpsFrames = 0;
      }
      for (const tick of tickables) tick(elapsed, delta);

      // --- Walk mode (#453): drive the player, follow camera, water HUD ---
      let focus = controls.target;
      if (walkMode) {
        const before = player.position.clone();
        // Camera-relative WASD: project camera forward onto the ground plane.
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const move = new THREE.Vector3();
        if (keys.has("w") || keys.has("arrowup")) move.add(forward);
        if (keys.has("s") || keys.has("arrowdown")) move.sub(forward);
        if (keys.has("d") || keys.has("arrowright")) move.add(right);
        if (keys.has("a") || keys.has("arrowleft")) move.sub(right);
        if (move.lengthSq() > 0) move.normalize();

        const state = player.update(
          delta,
          { x: move.x, z: move.z },
          keys.has("shift"),
          keys.has("c"),
          terrain,
          water,
          elapsed,
        );
        // Debug: expose the last frame's inputs to review probes.
        (window as unknown as { __zoneMoveDebug: object }).__zoneMoveDebug = {
          keysDown: [...keys],
          move: { x: move.x.toFixed(2), z: move.z.toFixed(2) },
          contact: state.contact,
          dt: delta.toFixed(4),
        };
        // Follow: translate camera + target by the player's frame delta.
        const deltaMove = player.position.clone().sub(before);
        camera.position.add(deltaMove);
        controls.target.copy(player.position).add(new THREE.Vector3(0, 1.3, 0));
        focus = controls.target;
        vitals.element.style.display = "block";
        vitals.set(
          state.breath,
          state.health,
          `${state.contact}${state.submerged ? " · SUBMERGED" : ""}${state.health < 1 ? " · DROWNING" : ""}`,
        );
      } else {
        vitals.element.style.display = "none";
      }

      controls.update();

      // Underwater camera feel: dense fog + blue overlay when the camera dips.
      const camSurface = water.waterSurfaceAt(camera.position.x, camera.position.z);
      const camUnder = camSurface !== null && camera.position.y < camSurface;
      underwaterOverlay.style.display = camUnder ? "block" : "none";
      const foggy = scene.fog as THREE.FogExp2;
      foggy.density = camUnder ? WATER_TUNING.underwaterFogDensity : 0.00042;

      // Shadow frustum follows the camera focus.
      sun.target.position.copy(focus);
      sun.position.set(focus.x + 90, focus.y + 130, focus.z + 55);

      const wx = focus.x + data.meta.plateOffset[0];
      const wz = focus.z + data.meta.plateOffset[1];
      const zone = zoneAt(data.meta, wx, wz);
      hud.textContent =
        `zone preview: ${zoneId}  cam: ${presetName}${walkMode ? "  WALK (T to exit)" : ""}  ${fpsText}\n` +
        `world: ${wx.toFixed(1)}, ${wz.toFixed(1)} m  ` +
        `zone: ${zone ? `${zone.id} · ${zone.name}` : "outside section"}`;
      composer.render();
      hooks.__zoneFrames += 1;
    } catch (error) {
      hooks.__zoneLoopError = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
      console.error("zone preview loop error", error);
    }
  });

  window.addEventListener("resize", () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    aoPass?.setSize(w, h);
  });

  return {
    dispose: () => {
      renderer.setAnimationLoop(null);
      composer.dispose();
      renderer.dispose();
      host.remove();
    },
  };
}
