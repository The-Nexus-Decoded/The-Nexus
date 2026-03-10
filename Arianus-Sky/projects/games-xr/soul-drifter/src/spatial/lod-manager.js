/**
 * LOD Manager & Poly Reducer
 * Dynamic level-of-detail based on device capabilities
 * Reduces polygon count for mobile/3DoF modes
 */

import * as THREE from 'three';

export class LODManager {
  constructor(mode = 'desktop', budget = 100000) {
    this.mode = mode;
    this.budget = budget;
    this.lodLevels = [];
    this.objects = new Map();
    
    // Default LOD distances
    this.distances = [5, 15, 30, 50]; // meters
    
    this.setupLODLevels();
    console.log('[LODManager] Initialized mode:', mode, 'budget:', budget);
  }
  
  setupLODLevels() {
    // LOD level configurations based on mode
    this.lodLevels = {
      vr: [
        { distance: 5, detail: 1.0 },   // Full detail
        { distance: 15, detail: 0.5 },  // 50% tris
        { distance: 30, detail: 0.25 }, // 25% tris
        { distance: 50, detail: 0.1 }   // 10% tris
      ],
      '3dof': [
        { distance: 5, detail: 0.7 },
        { distance: 15, detail: 0.4 },
        { distance: 30, detail: 0.2 },
        { distance: 50, detail: 0.1 }
      ],
      mobile: [
        { distance: 5, detail: 0.5 },
        { distance: 15, detail: 0.25 },
        { distance: 30, detail: 0.1 },
        { distance: 50, detail: 0.05 }
      ],
      desktop: [
        { distance: 10, detail: 1.0 },
        { distance: 30, detail: 0.6 },
        { distance: 60, detail: 0.3 },
        { distance: 100, detail: 0.15 }
      ]
    };
  }
  
  // Register an object for LOD management
  register(mesh, basePolyCount = null) {
    const polyCount = basePolyCount || this.estimatePolyCount(mesh.geometry);
    
    this.objects.set(mesh, {
      basePolyCount: polyCount,
      currentLOD: 0,
      lastUpdate: 0
    });
    
    // Replace with LOD object if not already
    if (!(mesh instanceof THREE.LOD)) {
      this.convertToLOD(mesh);
    }
    
    return mesh;
  }
  
  convertToLOD(mesh) {
    const levels = this.lodLevels[this.mode] || this.lodLevels.desktop;
    const lod = new THREE.LOD();
    
    // Get original material
    const material = mesh.material;
    
    // Create LOD levels
    levels.forEach((level, index) => {
      let geometry = mesh.geometry.clone();
      
      // Reduce geometry based on detail level
      if (level.detail < 1.0) {
        geometry = this.reduceGeometry(geometry, level.detail);
      }
      
      const lodMesh = new THREE.Mesh(geometry, material);
      lodMesh.visible = index === 0; // Only first level visible initially
      lod.addLevel(lodMesh, level.distance);
    });
    
    // Copy position/rotation/scale
    lod.position.copy(mesh.position);
    lod.rotation.copy(mesh.rotation);
    lod.scale.copy(mesh.scale);
    
    // Replace in parent
    if (mesh.parent) {
      mesh.parent.add(lod);
      mesh.parent.remove(mesh);
    }
    
    return lod;
  }
  
  reduceGeometry(geometry, detail) {
    // Simple geometry reduction
    // For real use, you'd use a proper decimation library
    
    if (geometry.type === 'BoxGeometry' || geometry.type === 'SphereGeometry') {
      // Adjust segments based on detail
      const type = geometry.type;
      const params = geometry.parameters;
      
      if (type === 'SphereGeometry') {
        const widthSegments = Math.max(4, Math.floor((params.widthSegments || 32) * detail));
        const heightSegments = Math.max(4, Math.floor((params.heightSegments || 16) * detail));
        return new THREE.SphereGeometry(params.radius, widthSegments, heightSegments);
      }
      
      if (type === 'BoxGeometry') {
        return new THREE.BoxGeometry(
          params.width, params.height, params.depth,
          Math.max(1, Math.floor((params.widthSegments || 1) * detail)),
          Math.max(1, Math.floor((params.heightSegments || 1) * detail)),
          Math.max(1, Math.floor((params.depthSegments || 1) * detail))
        );
      }
    }
    
    // For BufferGeometry, reduce position attribute
    if (geometry.attributes.position) {
      const positions = geometry.attributes.position;
      const targetCount = Math.floor(positions.count * detail);
      
      if (targetCount < positions.count) {
        // Create new smaller geometry
        const newPositions = new Float32Array(targetCount * 3);
        
        // Sample every nth vertex
        const step = Math.floor(positions.count / targetCount);
        
        for (let i = 0; i < targetCount; i++) {
          const srcIndex = Math.min(i * step, positions.count - 1) * 3;
          const dstIndex = i * 3;
          
          newPositions[dstIndex] = positions.array[srcIndex];
          newPositions[dstIndex + 1] = positions.array[srcIndex + 1];
          newPositions[dstIndex + 2] = positions.array[srcIndex + 2];
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        geometry.computeVertexNormals();
      }
    }
    
    return geometry;
  }
  
  estimatePolyCount(geometry) {
    if (geometry.index) {
      return geometry.index.count / 3;
    }
    
    if (geometry.attributes.position) {
      return geometry.attributes.position.count / 3;
    }
    
    return 0;
  }
  
  update(camera) {
    // Update all LOD objects
    this.objects.forEach((data, mesh) => {
      if (mesh instanceof THREE.LOD) {
        mesh.update(camera);
      }
    });
  }
  
  setMode(mode) {
    this.mode = mode;
    this.budget = this.getBudgetForMode(mode);
    this.setupLODLevels();
    console.log('[LODManager] Mode changed to:', mode, 'budget:', this.budget);
  }
  
  getBudgetForMode(mode) {
    const budgets = {
      vr: 100000,
      ar: 100000,
      '3dof': 50000,
      mobile: 30000,
      desktop: 200000
    };
    return budgets[mode] || 100000;
  }
  
  // Get current total poly count across all registered objects
  getCurrentPolyCount() {
    let total = 0;
    this.objects.forEach((data, mesh) => {
      if (mesh instanceof THREE.LOD) {
        // Count visible level
        mesh.levels.forEach((level, index) => {
          if (level.object.visible) {
            total += this.estimatePolyCount(level.object.geometry);
          }
        });
      } else {
        total += data.basePolyCount;
      }
    });
    return total;
  }
}
