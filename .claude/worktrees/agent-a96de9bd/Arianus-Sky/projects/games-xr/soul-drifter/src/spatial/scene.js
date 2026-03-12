/**
 * Spatial Scene Setup
 * Three.js scene, camera, lighting for XR
 */

import * as THREE from 'three';

export function setupScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
  
  // Camera
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.6, 3);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Point lights for realm ambiance
  const arianusLight = new THREE.PointLight(0x4a9eff, 2, 20);
  arianusLight.position.set(-3, 2, -3);
  scene.add(arianusLight);
  
  const pryanLight = new THREE.PointLight(0xff6b35, 2, 20);
  pryanLight.position.set(3, 2, -3);
  scene.add(pryanLight);
  
  // Ground plane (for reference)
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Grid helper for spatial reference
  const gridHelper = new THREE.GridHelper(20, 40, 0x2a2a4e, 0x1a1a3e);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
  
  return { scene, camera };
}
