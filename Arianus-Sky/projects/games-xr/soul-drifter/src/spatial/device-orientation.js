/**
 * Device Orientation Handler
 * 3DoF head tracking via device gyroscope/accelerometer
 * Fallback for devices without WebXR 6DoF
 * 
 * Uses DeviceOrientationEvent API
 * Permissions required on iOS 13+
 */

export class DeviceOrientation {
  constructor(camera) {
    this.camera = camera;
    this.enabled = false;
    this.permissionGranted = false;
    
    // Orientation state (in radians)
    this.alpha = 0;  // Z-axis (compass)
    this.beta = 0;   // X-axis (tilt front/back)
    this.gamma = 0;  // Y-axis (tilt left/right)
    
    // Smoothed values
    this.smoothAlpha = 0;
    this.smoothBeta = 0;
    this.smoothGamma = 0;
    
    // Smoothing factor (higher = smoother, 0-1)
    this.smoothing = 0.1;
    
    // Reference orientation (calibration)
    this.referenceAlpha = null;
    this.calibrated = false;
    
    // Screen orientation
    this.screenOrientation = window.screen.orientation?.angle || 0;
    
    console.log('[DeviceOrientation] Initialized');
  }
  
  async requestPermission() {
    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.permissionGranted = true;
          this.bindEvents();
          console.log('[DeviceOrientation] Permission granted');
          return true;
        } else {
          console.warn('[DeviceOrientation] Permission denied');
          return false;
        }
      } catch (e) {
        console.error('[DeviceOrientation] Permission error:', e);
        return false;
      }
    } else {
      // Non-iOS or older iOS - no permission needed
      this.permissionGranted = true;
      this.bindEvents();
      return true;
    }
  }
  
  bindEvents() {
    window.addEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
    window.addEventListener('orientationchange', this.onOrientationChange.bind(this));
    
    // Also handle screen orientation API
    if (window.screen.orientation) {
      window.screen.orientation.addEventListener('change', () => {
        this.screenOrientation = window.screen.orientation.angle;
      });
    }
  }
  
  onOrientationChange() {
    this.screenOrientation = window.screen.orientation?.angle || window.orientation || 0;
    console.log('[DeviceOrientation] Screen orientation:', this.screenOrientation);
  }
  
  onDeviceOrientation(e) {
    if (!this.permissionGranted) return;
    
    // Apply screen orientation compensation
    let alpha = e.alpha || 0;
    let beta = e.beta || 0;
    let gamma = e.gamma || 0;
    
    // Convert to radians
    alpha = alpha * (Math.PI / 180);
    beta = beta * (Math.PI / 180);
    gamma = gamma * (Math.PI / 180);
    
    // Apply screen rotation compensation
    const so = this.screenOrientation * (Math.PI / 180);
    
    if (so === 0) {
      this.alpha = alpha;
      this.beta = beta;
      this.gamma = gamma;
    } else if (so === Math.PI / 2) {
      this.alpha = alpha - Math.PI / 2;
      this.beta = gamma;
      this.gamma = -beta;
    } else if (so === Math.PI) {
      this.alpha = alpha - Math.PI;
      this.beta = -beta;
      this.gamma = -gamma;
    } else if (so === -Math.PI / 2 || so === 3 * Math.PI / 2) {
      this.alpha = alpha + Math.PI / 2;
      this.beta = -gamma;
      this.gamma = beta;
    }
    
    this.enabled = true;
  }
  
  calibrate() {
    this.referenceAlpha = this.alpha;
    this.calibrated = true;
    console.log('[DeviceOrientation] Calibrated - reference alpha:', this.referenceAlpha);
  }
  
  update(delta) {
    if (!this.enabled || !this.camera) return;
    
    // Smooth the values
    this.smoothAlpha += (this.alpha - this.smoothAlpha) * this.smoothing;
    this.smoothBeta += (this.beta - this.smoothBeta) * this.smoothing;
    this.smoothGamma += (this.gamma - this.smoothGamma) * this.smoothing;
    
    // Apply to camera (convert back to degrees for Three.js)
    // Note: This is a simplified 3DoF mapping
    // Real implementation would depend on the XR reference space
    
    const alphaDeg = this.smoothAlpha * (180 / Math.PI);
    const betaDeg = this.smoothBeta * (180 / Math.PI);
    const gammaDeg = this.smoothGamma * (180 / Math.PI);
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('device-orientation', {
      detail: {
        alpha: alphaDeg,
        beta: betaDeg,
        gamma: gammaDeg,
        alphaRad: this.smoothAlpha,
        betaRad: this.smoothBeta,
        gammaRad: this.smoothGamma,
        calibrated: this.calibrated
      }
    }));
  }
  
  getOrientation() {
    return {
      alpha: this.smoothAlpha,
      beta: this.smoothBeta,
      gamma: this.smoothGamma,
      alphaDeg: this.smoothAlpha * (180 / Math.PI),
      betaDeg: this.smoothBeta * (180 / Math.PI),
      gammaDeg: this.smoothGamma * (180 / Math.PI)
    };
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  
  isAvailable() {
    return 'DeviceOrientationEvent' in window;
  }
}
