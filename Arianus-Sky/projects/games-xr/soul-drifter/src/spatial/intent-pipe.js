/**
 * Intent Pipe — Thin MVP
 * Minimal volumetric bridge between Paithan's intent transformer
 * and Soul Drifter's VR feedback system.
 * 
 * Feedback States:
 * - intent_sent: emission glow on target volume
 * - confirmed: 0.3s scale pulse (1.0 → 1.08 → 1.0) + #FFD700 rim
 * - error: red rim + 4-frame shake + red emission burst
 * 
 * Gestures: rotate, double-tap, long-press (passthrough to hand tracker)
 */

import * as THREE from 'three';

export class IntentPipe {
  constructor(scene, handTracker) {
    this.scene = scene;
    this.handTracker = handTracker;
    this.activeVolume = null;
    this.feedbackState = null;
    this.targetPosition = new THREE.Vector3();
    
    // Animation state
    this.animationTime = 0;
    this.shakeFrames = 0;
    this.originalPosition = new THREE.Vector3();
    
    // Colors from spec
    this.colors = {
      intentSent: 0x00ffff,    // cyan glow
      confirmed: 0xFFD700,     // gold
      error: 0xff3333          // red
    };
    
    // Gesture state
    this.gestureState = {
      pinchScale: 1.0,
      rotateAngle: 0,
      lastTapTime: 0,
      commitDebounceMs: 300,
      undoTimeout: null,
      undoWindowMs: 3000,
      lastAction: null
    };
    
    // Degree readout ring (for rotate-gauge)
    this.angleDisplay = null;
    this.createAngleDisplay();
    
    this.setupEventListeners();
    this.createFeedbackVolume();
  }
  
  setupEventListeners() {
    // Listen to gesture events from HandTracker
    window.addEventListener('xr-gesture', (e) => this.onGesture(e.detail));
  }
  
  createFeedbackVolume() {
    // Volumetric feedback element — a subtle wireframe sphere
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.colors.intentSent,
      transparent: true,
      opacity: 0,
      wireframe: true
    });
    
    this.activeVolume = new THREE.Mesh(geometry, material);
    this.activeVolume.visible = false;
    this.scene.add(this.activeVolume);
    
    // Inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.colors.intentSent,
      transparent: true,
      opacity: 0
    });
    this.glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    this.activeVolume.add(this.glowSphere);
    
    // Rim light ring (for confirmed state)
    const ringGeometry = new THREE.TorusGeometry(0.1, 0.01, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.colors.confirmed,
      transparent: true,
      opacity: 0
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.rotation.x = Math.PI / 2;
    this.activeVolume.add(this.ring);
  }
  
  createAngleDisplay() {
    // Arc ring for rotate-gauge degree readout
    const arcGeometry = new THREE.RingGeometry(0.12, 0.14, 32, 1, 0, 0);
    const arcMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.angleDisplay = new THREE.Mesh(arcGeometry, arcMaterial);
    this.angleDisplay.rotation.x = -Math.PI / 2;
    this.angleDisplay.visible = false;
    this.scene.add(this.angleDisplay);
  }
  
  /**
   * Receive intent coordinates from Paithan's intent transformer
   * @param {Object} intent - { x, y, z, type: 'intent_sent'|'confirmed'|'error', realm? }
   */
  receiveIntent(intent) {
    // Set target position
    this.targetPosition.set(intent.x, intent.y, intent.z);
    this.activeVolume.position.copy(this.targetPosition);
    this.originalPosition.copy(this.targetPosition);
    
    // Trigger feedback state
    this.setFeedbackState(intent.type || 'intent_sent');
    
    // Emit to HUD (gesture bridge)
    const coords = {
      x: intent.x,
      y: intent.y,
      z: intent.z,
      realm: intent.realm || 'Arianus',
      type: intent.type,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('samah-gesture-coords', { detail: coords }));
    
    console.log(`[IntentPipe] Intent received: ${intent.type} at`, intent);
  }
  
  setFeedbackState(state) {
    this.feedbackState = state;
    this.animationTime = 0;
    this.shakeFrames = 0;
    this.activeVolume.visible = true;
    
    const material = this.activeVolume.material;
    const glowMaterial = this.glowSphere.material;
    const ringMaterial = this.ring.material;
    
    switch (state) {
      case 'intent_sent':
        // Cyan glow, emission pulse
        material.color.setHex(this.colors.intentSent);
        material.opacity = 0.6;
        glowMaterial.color.setHex(this.colors.intentSent);
        glowMaterial.opacity = 0.4;
        ringMaterial.opacity = 0;
        break;
        
      case 'confirmed':
        // Gold rim + scale pulse (handled in update)
        material.color.setHex(this.colors.confirmed);
        material.opacity = 0.5;
        glowMaterial.color.setHex(this.colors.confirmed);
        glowMaterial.opacity = 0.3;
        ringMaterial.opacity = 0.8;
        break;
        
      case 'error':
        // Red rim + shake + red burst
        material.color.setHex(this.colors.error);
        material.opacity = 0.7;
        glowMaterial.color.setHex(this.colors.error);
        glowMaterial.opacity = 0.6;
        ringMaterial.color.setHex(this.colors.error);
        ringMaterial.opacity = 0.9;
        this.shakeFrames = 4;
        break;
    }
  }
  
  onGesture(gesture) {
    console.log(`[IntentPipe] Gesture: ${gesture.type} (${gesture.hand})`, gesture.active ? 'START' : 'END');
    
    if (!gesture.active) return;
    
    const now = Date.now();
    const state = this.gestureState;
    
    switch (gesture.type) {
      case 'PINCH_SCALE':
        // pinch-scale: update scale factor
        state.pinchScale = gesture.scale || 1.0;
        this.activeVolume.scale.setScalar(state.pinchScale);
        console.log(`[IntentPipe] Pinch-scale: ${state.pinchScale.toFixed(2)}`);
        break;
        
      case 'ROTATE':
        // rotate-gauge: degree readout
        const degrees = (gesture.angle || 0) * (180 / Math.PI);
        state.rotateAngle = degrees;
        this.updateAngleDisplay(degrees);
        console.log(`[IntentPipe] Rotate-gauge: ${degrees.toFixed(1)}°`);
        break;
        
      case 'SELECT':
        // double-tap commit detection
        const timeSinceLastTap = now - state.lastTapTime;
        if (timeSinceLastTap < state.commitDebounceMs && timeSinceLastTap > 50) {
          // Double-tap detected — commit
          this.commit();
          state.lastTapTime = 0; // Reset to prevent triple-tap
        } else {
          state.lastTapTime = now;
        }
        break;
        
      case 'GRAB':
        // Long-press detected — initiate undo window
        this.startUndoWindow();
        break;
    }
  }
  
  updateAngleDisplay(degrees) {
    // Update arc to show rotation angle
    const normalizedAngle = Math.min(Math.abs(degrees) / 360, 1) * Math.PI * 2;
    this.angleDisplay.geometry.dispose();
    this.angleDisplay.geometry = new THREE.RingGeometry(0.12, 0.14, 32, 1, 0, normalizedAngle);
    this.angleDisplay.visible = true;
    this.angleDisplay.material.opacity = 0.9;
  }
  
  commit() {
    console.log('[IntentPipe] Double-tap: COMMIT');
    // Gold pulse on commit
    this.receiveIntent({
      x: this.targetPosition.x,
      y: this.targetPosition.y,
      z: this.targetPosition.z,
      type: 'confirmed'
    });
    this.lastAction = { type: 'commit', position: this.targetPosition.clone() };
  }
  
  startUndoWindow() {
    const state = this.gestureState;
    // Clear existing undo timeout
    if (state.undoTimeout) {
      clearTimeout(state.undoTimeout);
    }
    // Start 3s undo window
    state.undoTimeout = setTimeout(() => {
      console.log('[IntentPipe] Undo window expired');
      state.undoTimeout = null;
    }, state.undoWindowMs);
    console.log('[IntentPipe] Undo window opened (3s)');
  }
  
  undo() {
    if (this.gestureState.undoTimeout && this.lastAction) {
      clearTimeout(this.gestureState.undoTimeout);
      this.gestureState.undoTimeout = null;
      console.log('[IntentPipe] UNDO executed');
      // Show error feedback for undo
      this.receiveIntent({
        x: this.lastAction.position.x,
        y: this.lastAction.position.y,
        z: this.lastAction.position.z,
        type: 'error'
      });
      this.lastAction = null;
    }
  }
  
  update(delta) {
    if (!this.activeVolume.visible) {
      if (this.angleDisplay.visible) {
        this.angleDisplay.visible = false;
      }
      return;
    }
    
    this.animationTime += delta;
    
    // State-specific animations
    switch (this.feedbackState) {
      case 'intent_sent':
        // Gentle pulse
        const pulse = Math.sin(this.animationTime * 4) * 0.1 + 1;
        this.activeVolume.scale.setScalar(pulse);
        break;
        
      case 'confirmed':
        // Scale pulse: 1.0 → 1.08 → 1.0 over 0.3s
        const progress = Math.min(this.animationTime / 0.3, 1);
        const scale = progress < 0.5 
          ? 1 + (progress * 2) * 0.08 
          : 1.08 - ((progress - 0.5) * 2) * 0.08;
        this.activeVolume.scale.setScalar(scale);
        
        // Fade out after pulse
        if (progress >= 1) {
          this.activeVolume.visible = false;
        }
        break;
        
      case 'error':
        // Horizontal shake
        if (this.shakeFrames > 0) {
          const shakeX = (this.shakeFrames % 2 === 0) ? 0.02 : -0.02;
          this.activeVolume.position.x = this.originalPosition.x + shakeX;
          this.shakeFrames--;
        } else {
          this.activeVolume.position.x = this.originalPosition.x;
        }
        
        // Fade out after shakes
        if (this.animationTime > 0.3) {
          const fade = Math.max(0, 1 - (this.animationTime - 0.3) * 3);
          this.activeVolume.material.opacity = fade * 0.7;
          this.glowSphere.material.opacity = fade * 0.6;
          
          if (fade <= 0) {
            this.activeVolume.visible = false;
          }
        }
        break;
    }
  }
  
  /**
   * External API — call this from Paithan's intent transformer
   * @param {number} x - X coordinate in 3D space
   * @param {number} y - Y coordinate in 3D space  
   * @param {number} z - Z coordinate in 3D space
   * @param {string} state - 'intent_sent' | 'confirmed' | 'error'
   */
  static pipeIn(x, y, z, state) {
    // Global singleton access for MVP
    if (window._intentPipeInstance) {
      window._intentPipeInstance.receiveIntent({ x, y, z, type: state });
    }
  }
}
