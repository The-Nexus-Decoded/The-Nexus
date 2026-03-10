/**
 * XR Mode Detector
 * Detects WebXR capabilities and selects appropriate fallback mode
 * 
 * Modes:
 * - vr: Full 6DoF VR headset
 * - ar: AR passthrough (future)
 * - 3dof: Mobile 3DoF (gyroscope only)
 * - mobile: Basic touch controls, no head tracking
 * - desktop: Mouse/keyboard fallback
 */

export class XRModeDetector {
  constructor() {
    this.mode = 'desktop';  // Default
    this.xrSession = null;
    this.xrSupported = false;
    this.arSupported = false;
    this.mobile = this.detectMobile();
    this.features = {};
    
    this.checkXRSupport();
  }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }
  
  async checkXRSupport() {
    if (!navigator.xr) {
      console.log('[XRModeDetector] WebXR not available');
      this.mode = this.mobile ? 'mobile' : 'desktop';
      return;
    }
    
    try {
      // Check VR support
      this.xrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (this.xrSupported) {
        console.log('[XRModeDetector] WebXR VR supported');
        this.features.vr = true;
      }
      
      // Check AR support
      this.arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (this.arSupported) {
        console.log('[XRModeDetector] WebXR AR supported');
        this.features.ar = true;
      }
      
      // Determine mode
      if (this.xrSupported) {
        this.mode = 'vr';
      } else if (this.arSupported) {
        this.mode = 'ar';
      } else if (this.mobile && 'DeviceOrientationEvent' in window) {
        this.mode = '3dof';
      } else if (this.mobile) {
        this.mode = 'mobile';
      } else {
        this.mode = 'desktop';
      }
      
      console.log('[XRModeDetector] Mode selected:', this.mode);
      
    } catch (e) {
      console.warn('[XRModeDetector] XR check failed:', e);
      this.mode = this.mobile ? 'mobile' : 'desktop';
    }
  }
  
  async requestSession(mode = 'immersive-vr', options = {}) {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }
    
    const defaultOptions = {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking']
    };
    
    const sessionOptions = { ...defaultOptions, ...options };
    
    try {
      this.xrSession = await navigator.xr.requestSession(mode, sessionOptions);
      
      // Handle session end
      this.xrSession.addEventListener('end', () => {
        this.xrSession = null;
        console.log('[XRModeDetector] XR session ended');
        window.dispatchEvent(new CustomEvent('xr-session-end'));
      });
      
      console.log('[XRModeDetector] XR session started:', mode);
      window.dispatchEvent(new CustomEvent('xr-session-start', { detail: { mode, session: this.xrSession } }));
      
      return this.xrSession;
      
    } catch (e) {
      console.error('[XRModeDetector] Failed to start XR session:', e);
      throw e;
    }
  }
  
  getMode() {
    return this.mode;
  }
  
  isXR() {
    return this.mode === 'vr' || this.mode === 'ar';
  }
  
  isMobile() {
    return this.mode === 'mobile' || this.mode === '3dof';
  }
  
  getFeatures() {
    return this.features;
  }
  
  // Get renderer settings based on mode
  getRendererSettings() {
    const settings = {
      vr: {
        antialias: true,
        pixelRatio: 1, // Let XR handle this
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      },
      ar: {
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        powerPreference: 'high-performance',
        alpha: true, // Transparent background for AR
        depth: true
      },
      '3dof': {
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        powerPreference: 'default',
        stencil: false,
        depth: true
      },
      mobile: {
        antialias: false, // Disable for performance
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        powerPreference: 'default',
        stencil: false,
        depth: true
      },
      desktop: {
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      }
    };
    
    return settings[this.mode] || settings.desktop;
  }
  
  // Get polygon budget based on mode
  getPolyBudget() {
    const budgets = {
      vr: 100000,    // Quest 2 can handle ~100-200k
      ar: 100000,
      '3dof': 50000, // Mobile 3DoF
      mobile: 30000, // Basic mobile
      desktop: 200000 // Desktop can handle more
    };
    
    return budgets[this.mode] || 100000;
  }
}
