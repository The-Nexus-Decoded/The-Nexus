/**
 * Realm Manager
 * Visualizes the four Death Gate Cycle realms:
 * - Arianus (Sky - air/land)
 * - Pryan (Fire - endless burning)
 * - Chelestra (Sea - water/void)
 * - Abarrach (Stone - death/petrification)
 */

import * as THREE from 'three';

const REALM_CONFIG = {
  arianus: {
    name: 'Arianus',
    color: 0x4a9eff,
    description: 'The Realm of Sky',
    position: new THREE.Vector3(-3, 1.5, -2)
  },
  pryan: {
    name: 'Pryan',
    color: 0xff6b35,
    description: 'The Realm of Fire',
    position: new THREE.Vector3(3, 1.5, -2)
  },
  chelestra: {
    name: 'Chelestra',
    color: 0x00d4aa,
    description: 'The Realm of Sea',
    position: new THREE.Vector3(0, 1.5, -4)
  },
  abarrach: {
    name: 'Abarrach',
    color: 0x9b59b6,
    description: 'The Realm of Stone',
    position: new THREE.Vector3(0, 2.5, -6)
  }
};

export class RealmManager {
  constructor(scene) {
    this.scene = scene;
    this.realms = new Map();
    this.currentRealm = null;
    this.transitioning = false;
    
    this.createRealms();
    this.listenForGestures();
  }
  
  createRealms() {
    Object.entries(REALM_CONFIG).forEach(([key, config]) => {
      const realm = this.createRealmVisual(key, config);
      this.realms.set(key, realm);
      this.scene.add(realm.group);
    });
  }
  
  createRealmVisual(key, config) {
    const group = new THREE.Group();
    group.position.copy(config.position);
    
    // Central portal
    const portalGeometry = new THREE.TorusGeometry(0.5, 0.08, 16, 32);
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.rotation.x = Math.PI / 2;
    group.add(portal);
    
    // Inner glow
    const glowGeometry = new THREE.CircleGeometry(0.45, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.01;
    group.add(glow);
    
    // Floating particles
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.4;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: config.color,
      size: 0.02,
      transparent: true,
      opacity: 0.6
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);
    
    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, 128, 40);
    
    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ 
      map: labelTexture, 
      transparent: true 
    });
    const label = new THREE.Sprite(labelMaterial);
    label.scale.set(1, 0.25, 1);
    label.position.y = 0.8;
    group.add(label);
    
    return {
      group,
      portal,
      glow,
      particles,
      config,
      key
    };
  }
  
  listenForGestures() {
    window.addEventListener('xr-gesture', (e) => {
      const { type, hand, active } = e.detail;
      
      if (type === 'SELECT' && active) {
        this.handleRealmSelect(hand);
      }
    });
  }
  
  handleRealmSelect(hand) {
    // Cycle through realms on SELECT
    const keys = Array.from(this.realms.keys());
    const currentIndex = this.currentRealm ? keys.indexOf(this.currentRealm) : -1;
    const nextIndex = (currentIndex + 1) % keys.length;
    const nextRealm = keys[nextIndex];
    
    this.transitionTo(nextRealm);
  }
  
  transitionTo(realmKey) {
    if (this.transitioning || this.currentRealm === realmKey) return;
    
    this.transitioning = true;
    console.log(`[Realm] Transitioning to ${realmKey}`);
    
    // Animate transition
    const targetRealm = this.realms.get(realmKey);
    if (targetRealm) {
      // Pulse effect
      const originalScale = targetRealm.group.scale.clone();
      targetRealm.group.scale.multiplyScalar(1.2);
      
      setTimeout(() => {
        targetRealm.group.scale.copy(originalScale);
        this.currentRealm = realmKey;
        this.transitioning = false;
      }, 300);
    }
  }
  
  update(delta) {
    // Animate each realm
    this.realms.forEach((realm) => {
      // Rotate portal
      realm.portal.rotation.z += delta * 0.5;
      
      // Pulse glow
      realm.glow.material.opacity = 0.2 + Math.sin(Date.now() * 0.002) * 0.1;
      
      // Rotate particles
      realm.particles.rotation.y += delta * 0.2;
    });
  }
}
