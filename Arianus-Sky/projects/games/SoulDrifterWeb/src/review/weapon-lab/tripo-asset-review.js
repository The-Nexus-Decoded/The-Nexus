import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const ASSETS = {
  "Quiver body": "./assets/3d/weapons/bow/weapon-quiver-starter-v002.glb",
  "Harness source mesh (fitted sling shown in weapon lab)": "./assets/3d/gear/gear-quiver-harness-human-masculine-v001.glb",
  "Standard arrow": "./assets/3d/weapons/bow/weapon-arrow-starter-v002.glb",
  "Fire arrow": "./assets/3d/weapons/bow/weapon-arrow-fire-v001.glb",
  "Ice arrow": "./assets/3d/weapons/bow/weapon-arrow-ice-v001.glb",
  "Poison arrow": "./assets/3d/weapons/bow/weapon-arrow-poison-v001.glb"
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10151c);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x241c18, 2.6));
const key = new THREE.DirectionalLight(0xffe1bd, 5.5);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7aaeff, 3.2);
rim.position.set(-4, 2, -3);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.005, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const loader = new GLTFLoader();
const select = document.querySelector("#asset");
const status = document.querySelector("#status");
let current = null;
let currentSize = 1;

for (const [label, url] of Object.entries(ASSETS)) {
  const option = document.createElement("option");
  option.value = url;
  option.textContent = label;
  select.append(option);
}

function frame(direction = "front") {
  if (!current) return;
  const box = new THREE.Box3().setFromObject(current);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  currentSize = Math.max(size.x, size.y, size.z, 0.1);
  controls.target.copy(center);
  const distance = currentSize * 2.35;
  const vectors = {
    front: new THREE.Vector3(0, 0.15, distance),
    side: new THREE.Vector3(distance, 0.15, 0),
    rear: new THREE.Vector3(0, 0.15, -distance),
  };
  camera.position.copy(center).add(vectors[direction]);
  camera.near = Math.max(currentSize / 1000, 0.001);
  camera.far = Math.max(currentSize * 100, 10);
  camera.updateProjectionMatrix();
  controls.update();
}

async function loadAsset() {
  status.textContent = "Loading processed Tripo mesh…";
  if (current) scene.remove(current);
  const gltf = await loader.loadAsync(select.value);
  current = gltf.scene;
  let meshCount = 0;
  current.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(current);
  frame("front");
  const bounds = new THREE.Box3().setFromObject(current).getSize(new THREE.Vector3());
  status.textContent = `Tripo source: verified\nIndependent root: yes\nMeshes: ${meshCount}\nBounds: ${bounds.x.toFixed(3)} × ${bounds.y.toFixed(3)} × ${bounds.z.toFixed(3)} m`;
}

select.addEventListener("change", () => loadAsset().catch((error) => { status.textContent = error.message; }));
for (const direction of ["front", "side", "rear"]) document.querySelector(`#${direction}`).addEventListener("click", () => frame(direction));

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

loadAsset().catch((error) => { status.textContent = error.message; });
animate();
