/**
 * Mobile Input Handler
 * Touch gesture system for non-VR mobile devices
 * Maps to IntentPipe gesture API
 * 
 * Gestures:
 * - TAP: Select / confirm
 * - HOLD: Context menu / long-press action
 * - SWIPE: Navigate realms (swipe left/right)
 * - PINCH: Scale intent volume
 * - TWO-FINGER ROTATE: Rotate view
 */

import { IntentPipe } from './intent-pipe.js';

export class MobileInput {
  constructor(canvas, intentPipe) {
    this.canvas = canvas;
    this.intentPipe = intentPipe;
    this.enabled = true;
    
    // Touch state
    this.touches = new Map();
    this.lastTapTime = 0;
    this.tapThreshold = 10; // px movement threshold
    this.holdThreshold = 500; // ms to register hold
    this.holdTimer = null;
    this.startPosition = { x: 0, y: 0 };
    
    // Pinch state
    this.pinchStartDistance = 0;
    this.currentScale = 1.0;
    
    // Rotate state
    this.rotateStartAngle = 0;
    this.currentAngle = 0;
    
    // Swipe state
    this.swipeThreshold = 50;
    this.swipeDirection = null;
    
    this.bindEvents();
    console.log('[MobileInput] Initialized');
  }
  
  bindEvents() {
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
    
    // Mouse fallback for testing
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }
  
  // Convert screen coords to 3D position (project onto gaze plane)
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    // Project onto a plane 1m in front of user at eye height
    return {
      x: x * 0.5,  // ±0.5m horizontal
      y: 1.6 + y * 0.3,  // ~1.3-1.9m height
      z: -1.0  // 1m in front
    };
  }
  
  onTouchStart(e) {
    e.preventDefault();
    if (!this.enabled) return;
    
    for (const touch of e.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      });
    }
    
    const touchCount = this.touches.size;
    
    if (touchCount === 1) {
      // Start hold timer
      const touch = this.touches.values().next().value;
      this.startPosition = { x: touch.startX, y: touch.startY };
      this.holdTimer = setTimeout(() => this.emitGesture('HOLD', touch), this.holdThreshold);
    }
    else if (touchCount === 2) {
      // Cancel hold, start pinch/rotate
      this.cancelHold();
      const touches = Array.from(this.touches.values());
      this.pinchStartDistance = this.getDistance(touches[0], touches[1]);
      this.rotateStartAngle = this.getAngle(touches[0], touches[1]);
    }
  }
  
  onTouchMove(e) {
    e.preventDefault();
    if (!this.enabled) return;
    
    for (const touch of e.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const state = this.touches.get(touch.identifier);
        state.x = touch.clientX;
        state.y = touch.clientY;
      }
    }
    
    const touchCount = this.touches.size;
    
    if (touchCount === 2) {
      const touches = Array.from(this.touches.values());
      
      // Pinch gesture
      const currentDistance = this.getDistance(touches[0], touches[1]);
      const scale = currentDistance / this.pinchStartDistance;
      this.currentScale = scale;
      this.emitGesture('PINCH_SCALE', { scale });
      
      // Rotate gesture
      const currentAngle = this.getAngle(touches[0], touches[1]);
      const angleDelta = currentAngle - this.rotateStartAngle;
      this.currentAngle = angleDelta;
      this.emitGesture('ROTATE', { angle: angleDelta });
    }
    else if (touchCount === 1) {
      // Check for swipe while holding
      const touch = this.touches.values().next().value;
      const dx = touch.x - touch.startX;
      const dy = touch.y - touch.startY;
      
      if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
        this.cancelHold();
        this.swipeDirection = Math.abs(dx) > Math.abs(dy) 
          ? (dx > 0 ? 'RIGHT' : 'LEFT')
          : (dy > 0 ? 'DOWN' : 'UP');
        this.emitGesture('SWIPE', { direction: this.swipeDirection });
      }
    }
  }
  
  onTouchEnd(e) {
    e.preventDefault();
    if (!this.enabled) return;
    
    for (const touch of e.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const state = this.touches.get(touch.identifier);
        const duration = Date.now() - state.startTime;
        const dx = state.x - state.startX;
        const dy = state.y - state.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Cancel hold if it was a tap
        if (duration < this.holdThreshold && distance < this.tapThreshold) {
          this.cancelHold();
          this.emitGesture('TAP', state);
        }
        
        this.touches.delete(touch.identifier);
      }
    }
    
    // Reset pinch/rotate
    if (this.touches.size < 2) {
      this.pinchStartDistance = 0;
      this.rotateStartAngle = 0;
    }
  }
  
  cancelHold() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
  
  getDistance(t1, t2) {
    const dx = t2.x - t1.x;
    const dy = t2.y - t1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getAngle(t1, t2) {
    return Math.atan2(t2.y - t1.y, t2.x - t1.x);
  }
  
  emitGesture(type, data) {
    if (!this.intentPipe) return;
    
    const worldPos = this.screenToWorld(
      data.x || this.startPosition.x,
      data.y || this.startPosition.y
    );
    
    const gesture = {
      type,
      hand: 'touch',
      active: true,
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      ...data
    };
    
    console.log(`[MobileInput] Gesture: ${type}`, gesture);
    this.intentPipe.onGesture(gesture);
    
    // Also emit to window for other listeners
    window.dispatchEvent(new CustomEvent('xr-gesture', { detail: gesture }));
  }
  
  // Mouse fallback for desktop testing
  onMouseDown(e) {
    this.startPosition = { x: e.clientX, y: e.clientY };
    this.mouseDown = true;
    this.mouseStartTime = Date.now();
    
    this.holdTimer = setTimeout(() => {
      if (this.mouseDown) {
        this.emitGesture('HOLD', { x: e.clientX, y: e.clientY });
      }
    }, this.holdThreshold);
  }
  
  onMouseMove(e) {
    if (!this.mouseDown) return;
    
    const dx = e.clientX - this.startPosition.x;
    const dy = e.clientY - this.startPosition.y;
    
    // Right-click + drag = rotate
    if (e.buttons === 2) {
      this.currentAngle += dx * 0.01;
      this.emitGesture('ROTATE', { angle: this.currentAngle });
    }
  }
  
  onMouseUp(e) {
    this.cancelHold();
    this.mouseDown = false;
    
    const duration = Date.now() - this.mouseStartTime;
    const dx = e.clientX - this.startPosition.x;
    const dy = e.clientY - this.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (duration < 300 && distance < this.tapThreshold) {
      this.emitGesture('TAP', { x: e.clientX, y: e.clientY });
    }
  }
  
  onWheel(e) {
    e.preventDefault();
    this.currentScale += e.deltaY * -0.001;
    this.currentScale = Math.max(0.5, Math.min(2.0, this.currentScale));
    this.emitGesture('PINCH_SCALE', { scale: this.currentScale });
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelHold();
      this.touches.clear();
    }
  }
}
