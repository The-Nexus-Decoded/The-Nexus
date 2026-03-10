/**
 * Spatial Resolver Contract
 * Volumetric anchoring, transform resolution, and coordinate space management
 * for Soul Drifter's XR experiences.
 * 
 * @version 1.0.0
 */

import * as THREE from 'three';

export class SpatialResolver {
  constructor(xrSession = null) {
    this.xrSession = xrSession;
    this.anchors = new Map();
    this.spaces = new Map();
    this.nextAnchorId = 1;
    
    // Hit test source for raycasting
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ANCHORING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a spatial anchor at the specified world position
   * @param {THREE.Vector3} worldPosition - Position in world space
   * @param {'room' | 'body' | 'world'} anchorType - Type of anchor
   * @returns {string} AnchorID
   */
  anchor(worldPosition, anchorType = 'world') {
    const anchorId = `anchor_${this.nextAnchorId++}`;
    
    const anchor = {
      id: anchorId,
      position: worldPosition.clone(),
      type: anchorType,
      transform: new THREE.Matrix4(),
      created: Date.now()
    };
    
    // Set transform from position
    anchor.transform.setPosition(worldPosition);
    
    this.anchors.set(anchorId, anchor);
    
    console.log(`[SpatialResolver] Anchored ${anchorType} at`, worldPosition);
    return anchorId;
  }

  /**
   * Release an anchor
   * @param {string} anchorId 
   */
  release(anchorId) {
    if (this.anchors.has(anchorId)) {
      this.anchors.delete(anchorId);
      console.log(`[SpatialResolver] Released ${anchorId}`);
    }
  }

  /**
   * Get anchor data
   * @param {string} anchorId 
   * @returns {Object|null}
   */
  getAnchor(anchorId) {
    return this.anchors.get(anchorId) || null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRANSFORM RESOLUTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Resolve transform for an anchor with optional local offset
   * @param {string} anchorId 
   * @param {THREE.Vector3} offset - Local offset from anchor
   * @param {THREE.Quaternion} rotation - Optional local rotation
   * @returns {THREE.Matrix4}
   */
  resolve(anchorId, offset = new THREE.Vector3(), rotation = null) {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      console.warn(`[SpatialResolver] Anchor not found: ${anchorId}`);
      return new THREE.Matrix4();
    }
    
    const transform = anchor.transform.clone();
    
    // Apply local offset
    if (offset && (offset.x !== 0 || offset.y !== 0 || offset.z !== 0)) {
      const offsetMatrix = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
      transform.multiply(offsetMatrix);
    }
    
    // Apply rotation if provided
    if (rotation) {
      const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(rotation);
      transform.multiply(rotationMatrix);
    }
    
    return transform;
  }

  /**
   * Get world position from anchor + offset
   * @param {string} anchorId 
   * @param {THREE.Vector3} offset 
   * @returns {THREE.Vector3}
   */
  resolvePosition(anchorId, offset = new THREE.Vector3()) {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return new THREE.Vector3();
    
    return anchor.position.clone().add(offset);
  }

  // ═══════════════════════════════════════════════════════════════════
  // COORDINATE SPACES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Register a coordinate space
   * @param {string} spaceId 
   * @param {THREE.Vector3} origin - Origin in world space
   * @param {THREE.Quaternion} orientation - Orientation in world space
   */
  registerSpace(spaceId, origin, orientation) {
    const space = {
      id: spaceId,
      origin: origin.clone(),
      orientation: orientation ? orientation.clone() : new THREE.Quaternion(),
      inverse: new THREE.Matrix4()
    };
    
    // Compute inverse transform
    const matrix = new THREE.Matrix4();
    matrix.compose(origin, orientation, new THREE.Vector3(1, 1, 1));
    space.inverse.copy(matrix).invert();
    
    this.spaces.set(spaceId, space);
    console.log(`[SpatialResolver] Registered space: ${spaceId}`);
  }

  /**
   * Convert point between coordinate spaces
   * @param {string} sourceSpace 
   * @param {string} targetSpace 
   * @param {THREE.Vector3} point 
   * @returns {THREE.Vector3}
   */
  convert(sourceSpace, targetSpace, point) {
    const source = this.spaces.get(sourceSpace);
    const target = this.spaces.get(targetSpace);
    
    if (!source || !target) {
      console.warn(`[SpatialResolver] Space not found: ${!source ? sourceSpace : targetSpace}`);
      return point.clone();
    }
    
    // Convert: world → source → target → world
    const result = point.clone();
    
    // Apply source inverse (world → source local)
    result.applyMatrix4(source.inverse);
    
    // Apply target (source local → world)
    const targetMatrix = new THREE.Matrix4();
    targetMatrix.compose(target.origin, target.orientation, new THREE.Vector3(1, 1, 1));
    result.applyMatrix4(targetMatrix);
    
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // HIT TESTING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Initialize hit testing for XR session
   * @param {XRSession} session 
   */
  async initHitTesting(session) {
    if (!session) return;
    
    const referenceSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({
      space: referenceSpace
    });
    this.hitTestSourceRequested = true;
    
    console.log('[SpatialResolver] Hit testing initialized');
  }

  /**
   * Raycast from screen or XR controller
   * @param {THREE.Vector3} origin - Ray origin
   * @param {THREE.Vector3} direction - Ray direction
   * @param {string[]} layers - Hit layers to test
   * @returns {Array<{position: THREE.Vector3, distance: number}>}
   */
  raycast(origin, direction, layers = ['default']) {
    // Placeholder for Three.js raycaster integration
    // In full implementation, would test against scene geometry
    const results = [];
    
    // For now, return empty results
    // Real implementation would use THREE.Raycaster
    return results;
  }

  /**
   * Process XR frame for hit testing
   * @param {XRFrame} frame 
   * @returns {Array}
   */
  processXRFrame(frame) {
    if (!this.hitTestSource || !frame) return [];
    
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    return hitTestResults.map(result => {
      const pose = result.getPose(this.xrSession.referenceSpace);
      return {
        position: new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        ),
        distance: pose.transform.position.z
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Clear all anchors and spaces
   */
  reset() {
    this.anchors.clear();
    this.spaces.clear();
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    console.log('[SpatialResolver] Reset');
  }

  /**
   * Get debug info
   */
  debug() {
    return {
      anchorCount: this.anchors.size,
      spaceCount: this.spaces.size,
      anchors: Array.from(this.anchors.values()).map(a => ({
        id: a.id,
        type: a.type,
        position: { x: a.position.x, y: a.position.y, z: a.position.z }
      })),
      spaces: Array.from(this.spaces.keys())
    };
  }
}

export default SpatialResolver;
