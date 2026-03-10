/**
 * Mobile WebXR Fallback Bootstrap
 * Initializes Soul Drifter with appropriate mode based on device capabilities
 * 
 * Usage:
 *   import { initMobileFallback } from './mobile-fallback.js';
 *   initMobileFallback(container, options).then(app => { ... });
 */

import { IntentPipe } from './intent-pipe.js';
import { RealmHUD } from './realm-hud.js';
import { MobileInput } from './mobile-input.js';
import { DeviceOrientation } from './device-orientation.js';
import { XRModeDetector } from './xr-mode-detector.js';
import { LODManager } from './lod-manager.js';
import * as THREE from 'three';

export class SoulDrifterApp {
  constructor(options = {}) {
    this.options = options;
    this.modeDetector = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.intentPipe = null;
    this.realmHud = null;
    this.mobileInput = null;
    this.deviceOrientation = null;
    this.lodManager = null;
    this.clock = new THREE.Clock();
    this.running = false;
    
    // XR session
    this.xrSession = null;
    this.xrRefSpace = null;
  }
  
  async init(container) {
    container = container || document.body;
    
    // Detect mode first
    this.modeDetector = new XRModeDetector();
    await this.modeDetector.checkXRSupport();
    
    const mode = this.modeDetector.getMode();
    console.log('[SoulDrifterApp] Initializing in mode:', mode);
    
    // Setup Three.js
    this.setupRenderer(this.modeDetector.getRendererSettings());
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    
    // Setup LOD manager
    this.lodManager = new LODManager(mode, this.modeDetector.getPolyBudget());
    
    // Setup spatial systems
    this.intentPipe = new IntentPipe(this.scene, null);
    this.realmHud = new RealmHUD(this.scene, this.camera);
    
    // Mode-specific setup
    if (mode === 'vr' || mode === 'ar') {
      await this.setupXR();
    } else if (mode === '3dof') {
      await this.setup3DoF();
    } else if (mode === 'mobile') {
      this.setupMobile();
    this.setupDesktop();
 } else {
         }
    
    // Create initial realm content
    this.createRealmContent();
    
    // Start render loop
    this.running = true;
    this.animate();
    
    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    console.log('[SoulDrifterApp] Ready in mode:', mode);
    return this;
  }
  
  setupRenderer(settings) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.antialias ?? true,
      powerPreference: settings.powerPreference ?? 'high-performance',
      alpha: settings.alpha ?? false,
      stencil: settings.stencil ?? false,
      depth: settings.depth ?? true
    });
    
    this.renderer.setPixelRatio(settings.pixelRatio ?? window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    
    document.body.appendChild(this.renderer.domElement);
  }
  
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e); // Dark space blue
  }
  
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.position.set(0, 1.6, 0); // Standing height
  }
  
  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);
    
    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    this.scene.add(sun);
    
    // Hemisphere light for sky/ground
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x222244, 0.3);
    this.scene.add(hemi);
  }
  
  async setupXR() {
    // WebXR setup
    try {
      const session = await this.modeDetector.requestSession('immersive-vr');
      this.xrSession = session;
      
      const gl = this.renderer.getContext();
      await this.renderer.xr.setSession(session);
      
      this.xrRefSpace = await session.requestReferenceSpace('local-floor');
      
      console.log('[SoulDrifterApp] XR session active');
      
    } catch (e) {
      console.warn('[SoulDrifterApp] XR setup failed, falling back:', e);
      this.setupMobile();
    }
  }
  
  async setup3DoF() {
    // 3DoF setup with gyroscope
    this.deviceOrientation = new DeviceOrientation(this.camera);
    
    try {
      await this.deviceOrientation.requestPermission();
    } catch (e) {
      console.warn('[SoulDrifterApp] Device orientation permission denied');
    }
    
    this.deviceOrientation.calibrate();
    this.setupMobile();
  }
  
  setupMobile() {
    // Touch input
    this.mobileInput = new MobileInput(this.renderer.domElement, this.intentPipe);
    
    // Connect to HUD
    this.intentPipe.receiveIntent = (intent) => {
      // Override to also update HUD
      this.intentPipe.receiveIntent(intent);
      this.realmHud.render(intent);
    };
    
    // Show HUD
    this.realmHud.show();
  }
  
  setupDesktop() {
    // Mouse/keyboard fallback
    this.mobileInput = new MobileInput(this.renderer.domElement, this.intentPipe);
    
    // Enable mouse fallback
    this.mobileInput.canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    this.realmHud.show();
  }
  
  createRealmContent() {
    // Create placeholder realm geometry
    // In full implementation, this would load realm-specific assets
    
    // Arianus - floating islands
    const islandGeo = new THREE.ConeGeometry(2, 1, 6);
    const islandMat = new THREE.MeshStandardMaterial({ 
      color: 0x4488ff,
      flatShading: true 
    });
    
    for (let i = 0; i < 5; i++) {
      const island = new THREE.Mesh(islandGeo, islandMat);
      island.position.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 3 + 1,
        -5 - Math.random() * 10
      );
      island.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      this.scene.add(island);
      this.lodManager.register(island);
    }
    
    // Floor grid
    const grid = new THREE.GridHelper(20, 20, 0x444488, 0x222244);
    grid.position.y = 0;
    this.scene.add(grid);
    
    // Register for LOD
    this.lodManager.register(grid, 400); // Grid is cheap
  }
  
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  animate() {
    if (!this.running) return;
    
    this.renderer.setAnimationLoop((timestamp, frame) => {
      const delta = this.clock.getDelta();
      
      // Update systems
      if (this.intentPipe) {
        this.intentPipe.update(delta);
      }
      
      if (this.realmHud) {
        this.realmHud.update(delta);
      }
      
      if (this.deviceOrientation) {
        this.deviceOrientation.update(delta);
      }
      
      if (this.lodManager && this.camera) {
        this.lodManager.update(this.camera);
      }
      
      // Render
      if (frame) {
        this.renderer.render(this.scene, this.camera);
      } else {
        // Fallback for non-XR
        this.renderer.render(this.scene, this.camera);
      }
    });
  }
  
  dispose() {
    this.running = false;
    
    if (this.xrSession) {
      this.xrSession.end();
    }
    
    this.renderer.dispose();
    
    // Dispose geometries and materials
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}

// Export convenience function
export async function initMobileFallback(container, options = {}) {
  const app = new SoulDrifterApp(options);
  return await app.init(container);
}
