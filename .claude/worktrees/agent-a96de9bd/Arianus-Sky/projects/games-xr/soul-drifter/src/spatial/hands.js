/**
 * Hand Tracking Module
 * WebXR hand input handling with gesture recognition
 * 
 * Gesture Mapping:
 * - pinch → SELECT
 * - long_press → GRAB  
 * - release → RELEASE
 * - twist → ROTATE (clockwise/counter-clockwise)
 */

import * as THREE from 'three';

export class HandTracker {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.controllers = [];
    this.hands = [];
    this.gestureState = {
      left: { selecting: false, grabbing: false, rotating: false, rotationAngle: 0 },
      right: { selecting: false, grabbing: false, rotating: false, rotationAngle: 0 }
    };
    
    this.setupControllers();
    this.setupHandTracking();
  }
  
  setupControllers() {
    const controllerModelFactory = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -0.05)
    ]);
    
    // Right controller (primary)
    const controller1 = this.renderer.xr.getController(0);
    controller1.addEventListener('selectstart', () => this.onSelectStart('right'));
    controller1.addEventListener('selectend', () => this.onSelectEnd('right'));
    controller1.addEventListener('squeezestart', () => this.onGrabStart('right'));
    controller1.addEventListener('squeezeend', () => this.onGrabEnd('right'));
    this.scene.add(controller1);
    
    const grip1 = this.renderer.xr.getControllerGrip(0);
    grip1.add(controllerModelFactory.clone());
    this.scene.add(grip1);
    
    // Left controller
    const controller2 = this.renderer.xr.getController(1);
    controller2.addEventListener('selectstart', () => this.onSelectStart('left'));
    controller2.addEventListener('selectend', () => this.onSelectEnd('left'));
    controller2.addEventListener('squeezestart', () => this.onGrabStart('left'));
    controller2.addEventListener('squeezeend', () => this.onGrabEnd('left'));
    this.scene.add(controller2);
    
    const grip2 = this.renderer.xr.getControllerGrip(1);
    grip2.add(controllerModelFactory.clone());
    this.scene.add(grip2);
    
    this.controllers.push(controller1, controller2);
  }
  
  setupHandTracking() {
    // Hand tracking support (WebXR Hand Input)
    if ('hand' in navigator.xr) {
      // Hand tracking will be set up when session starts
      console.log('Hand tracking available');
    }
  }
  
  onSelectStart(hand) {
    this.gestureState[hand].selecting = true;
    this.emitGesture('SELECT', hand, true);
  }
  
  onSelectEnd(hand) {
    this.gestureState[hand].selecting = false;
    this.emitGesture('SELECT', hand, false);
  }
  
  onGrabStart(hand) {
    this.gestureState[hand].grabbing = true;
    this.emitGesture('GRAB', hand, true);
  }
  
  onGrabEnd(hand) {
    this.gestureState[hand].grabbing = false;
    this.emitGesture('RELEASE', hand, true);
  }
  
  // Twist detection for ROTATE gestures
  updateTwist(hand, currentAngle) {
    const state = this.gestureState[hand];
    const delta = currentAngle - state.rotationAngle;
    
    if (Math.abs(delta) > 0.1) { // Threshold for twist detection
      const direction = delta > 0 ? 'ROTATE' : 'ROTATE';
      this.emitGesture(direction, hand, true, { angle: delta });
      state.rotationAngle = currentAngle;
    }
  }
  
  emitGesture(gesture, hand, active, data = {}) {
    const event = {
      type: gesture,
      hand: hand,
      active: active,
      timestamp: Date.now(),
      ...data
    };
    
    console.log(`[Gesture] ${gesture} (${hand})`, active ? 'START' : 'END');
    
    // Dispatch for other modules to listen
    window.dispatchEvent(new CustomEvent('xr-gesture', { detail: event }));
  }
  
  update(frame) {
    // Update hand poses if available
    if (frame && frame.hand) {
      // Process hand tracking data
    }
    
    // Could add twist detection here using controller rotation
  }
}
