/**
 * RealmHUD — Spatial Coordinate Display
 * Renders Samah's real-time position in 3D space
 * 
 * Displays: { x, y, z, realm, timestamp }
 */

import * as THREE from 'three';

export class RealmHUD {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    
    // Samah's current position
    this.samahPosition = new THREE.Vector3(0, 1.6, -1); // Default: 1.6m height, 1m in front
    this.currentRealm = 'Arianus'; // Default realm
    
    // Create HUD elements
    this.createCoordDisplay();
    this.createRealmIndicator();
    this.createConnectionStatus();
    
    // Listen for intent events (gesture pipeline)
    window.addEventListener('samah-position', (e) => this.onPositionUpdate(e.detail));
    window.addEventListener('samah-gesture-coords', (e) => this.onGestureCoords(e.detail));
    window.addEventListener('realm-change', (e) => this.onRealmChange(e.detail));
    
    console.log('[RealmHUD] Initialized');
  }
  
  createCoordDisplay() {
    // Floating panel showing coordinates
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    canvas.id = 'coord-hud';
    document.body.appendChild(canvas);
    
    this.ctx = canvas.getContext('2d');
    this.canvas = canvas;
    
    // Create texture for 3D display
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    
    // 3D panel in world space
    const geometry = new THREE.PlaneGeometry(0.4, 0.1);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    
    this.panel = new THREE.Mesh(geometry, material);
    this.panel.position.set(0, 2.2, -1.5); // Eye-level, forward
    this.panel.visible = false; // Hide until XR session
    this.scene.add(this.panel);
  }
  
  createRealmIndicator() {
    // Realm badge (colored sphere)
    const realmColors = {
      Arianus: 0x4488ff,  // Sky blue
      Pryan: 0xff4422,    // Fire red
      Chelestra: 0x22ff88, // Sea green
      Abarrach: 0x8844ff   // Stone purple
    };
    
    this.realmColor = realmColors[this.currentRealm] || 0xffffff;
    
    const geometry = new THREE.SphereGeometry(0.03, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.realmColor,
      transparent: true,
      opacity: 0.9
    });
    
    this.realmBadge = new THREE.Mesh(geometry, material);
    this.realmBadge.position.set(-0.22, 2.2, -1.5);
    this.realmBadge.visible = false;
    this.scene.add(this.realmBadge);
  }
  
  createConnectionStatus() {
    // Connection indicator (small dot)
    const geometry = new THREE.CircleGeometry(0.01, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green = connected
      transparent: true,
      opacity: 0.8
    });
    
    this.statusDot = new THREE.Mesh(geometry, material);
    this.statusDot.position.set(0.22, 2.2, -1.5);
    this.statusDot.visible = false;
    this.scene.add(this.statusDot);
  }
  
  onPositionUpdate(pos) {
    // Update Samah's position from external source
    this.samahPosition.set(pos.x, pos.y, pos.z);
    this.updateDisplay();
  }
  
  onGestureCoords(coords) {
    // Receive coords from IntentPipe (gesture pipeline)
    console.log('[RealmHUD] Gesture coords received:', coords);
    this.render(coords);
  }
  
  onRealmChange(realm) {
    this.currentRealm = realm;
    
    // Update badge color
    const realmColors = {
      Arianus: 0x4488ff,
      Pryan: 0xff4422,
      Chelestra: 0x22ff88,
      Abarrach: 0x8844ff
    };
    
    this.realmColor = realmColors[realm] || 0xffffff;
    if (this.realmBadge) {
      this.realmBadge.material.color.setHex(this.realmColor);
    }
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.ctx) return;
    
    // Clear
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, 512, 64);
    
    // Border
    this.ctx.strokeStyle = `#${this.realmColor.toString(16).padStart(6, '0')}`;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(2, 2, 508, 60);
    
    // Text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px monospace';
    this.ctx.textAlign = 'left';
    
    // Coordinates
    const x = this.samahPosition.x.toFixed(2);
    const y = this.samahPosition.y.toFixed(2);
    const z = this.samahPosition.z.toFixed(2);
    
    this.ctx.fillText(`X: ${x}`, 20, 28);
    this.ctx.fillText(`Y: ${y}`, 180, 28);
    this.ctx.fillText(`Z: ${z}`, 340, 28);
    
    // Realm
    this.ctx.fillStyle = `#${this.realmColor.toString(16).padStart(6, '0')}`;
    this.ctx.font = 'bold 28px monospace';
    this.ctx.fillText(this.currentRealm.toUpperCase(), 20, 56);
    
    // Timestamp
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(Date.now().toString(), 500, 56);
    
    this.texture.needsUpdate = true;
  }
  
  // Called from gesture pipeline (IntentPipe)
  render(samahCoords) {
    if (!this.enabled) return;
    
    if (samahCoords) {
      this.samahPosition.set(samahCoords.x, samahCoords.y, samahCoords.z);
      if (samahCoords.realm) {
        this.currentRealm = samahCoords.realm;
      }
    }
    
    this.updateDisplay();
  }
  
  show() {
    this.panel.visible = true;
    this.realmBadge.visible = true;
    this.statusDot.visible = true;
  }
  
  hide() {
    this.panel.visible = false;
    this.realmBadge.visible = false;
    this.statusDot.visible = false;
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.hide();
  }
  
  update(delta) {
    // Billboard effect: always face camera
    if (this.panel && this.camera) {
      this.panel.lookAt(this.camera.position);
    }
    
    // Pulse status dot
    if (this.statusDot) {
      const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
      this.statusDot.material.opacity = pulse;
    }
  }
}

// Helper: emit Samah's position for external listeners
export function emitSamahPosition(x, y, z, realm = 'Arianus') {
  const event = new CustomEvent('samah-position', {
    detail: { x, y, z, realm, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
}
