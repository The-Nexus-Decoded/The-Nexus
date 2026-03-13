/**
 * Soul Drifter - Main Application
 * Phase 1: Spatial Foundation
 * 
 * WebXR entry point with hand tracking support
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { setupScene } from './spatial/scene.js';
import { HandTracker } from './spatial/hands.js';
import { RealmManager } from './spatial/realm.js';

class SoulDrifterApp {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.handTracker = null;
    this.realmManager = null;
    this.isXRMode = false;
    
    this.init();
  }
  
  async init() {
    this.setupRenderer();
    this.setupScene();
    this.setupXR();
    this.setupHands();
    this.setupRealms();
    
    // Hide loading, show enter button
    document.getElementById('loading').style.display = 'none';
    document.getElementById('enter-vr').style.display = 'block';
    
    this.animate();
  }
  
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('xr-canvas'),
      antialias: true,
      alpha: true
    });
    
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    window.addEventListener('resize', () => this.onResize());
  }
  
  setupScene() {
    const sceneData = setupScene(this.renderer);
    this.scene = sceneData.scene;
    this.camera = sceneData.camera;
  }
  
  setupXR() {
    const vrButton = document.getElementById('vr-button');
    const arButton = document.getElementById('ar-button');
    
    // Check XR support
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        vrButton.style.display = supported ? 'block' : 'none';
      });
      
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        arButton.style.display = supported ? 'block' : 'none';
      });
    } else {
      vrButton.style.display = 'none';
      arButton.style.display = 'none';
    }
    
    vrButton.addEventListener('click', () => this.enterXR('immersive-vr'));
    arButton.addEventListener('click', () => this.enterXR('immersive-ar'));
  }
  
  async enterXR(mode) {
    try {
      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      
      this.renderer.xr.setSession(session);
      this.isXRMode = true;
      
      document.getElementById('enter-vr').style.display = 'none';
      
      session.addEventListener('end', () => {
        this.isXRMode = false;
        document.getElementById('enter-vr').style.display = 'block';
      });
      
    } catch (err) {
      console.error('Failed to enter XR:', err);
    }
  }
  
  setupHands() {
    this.handTracker = new HandTracker(this.renderer, this.scene);
  }
  
  setupRealms() {
    this.realmManager = new RealmManager(this.scene);
  }
  
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    this.renderer.setAnimationLoop((time, frame) => {
      const delta = this.clock.getDelta();
      
      // Update hand tracking
      if (this.handTracker && frame) {
        this.handTracker.update(frame);
      }
      
      // Update realm animations
      if (this.realmManager) {
        this.realmManager.update(delta);
      }
      
      // Render
      this.renderer.render(this.scene, this.camera);
    });
  }
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  new SoulDrifterApp();
});
