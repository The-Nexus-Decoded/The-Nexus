// IntentBridge - Mobile Gesture → Intent → World Manipulation Pipeline
// Orchestrates: GestureRecognizer → GestureIntent → XRWebSocketClient → VR World
// 
// @author Paithan
// @date 2026-03-09

import {
  GestureRecognizer,
  GestureConfig,
  DEFAULT_GESTURE_CONFIG,
} from './GestureRecognizer';

import {
  GestureHapticBridge,
  createGestureHapticBridge,
  HapticPlatform,
} from './GestureHapticBridge';

import {
  XRWebSocketClient,
  createXRWebSocketClient,
  createManipulationIntent,
} from './XRWebSocketClient';

import {
  PresentationMode,
  GestureType,
  IntentAction,
  TIMING,
  XRMessage,
  ManipulationIntent,
} from './types';

import {
  GestureIntent,
  createGestureIntent,
  isSartanGestureValid,
  WorldPosition,
  Vector3,
  IntentContext,
  IntentMetadata,
  GazeConfirm,
} from './GestureIntent';

import {
  IntentTransformer,
  intentTransformer,
} from './IntentTransformer';

// ==================== IntentBridge Configuration ====================

export interface IntentBridgeConfig {
  gesture: GestureConfig;
  haptics: HapticPlatform;
  wsUrl: string;
  sessionId: string;
  enableGazeConfirm: boolean;
  gazeThresholdDistance: number;  // meters
  intentTimeout: number;           // ms
  sessionExpiredTimeout: number;  // ms - 3s after leaving near zone
}

export const DEFAULT_INTENT_BRIDGE_CONFIG: IntentBridgeConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  haptics: 'web',  // Default to web, override for native
  wsUrl: 'ws://localhost:8080/xr',
  sessionId: `session_${Date.now()}`,
  enableGazeConfirm: true,
  gazeThresholdDistance: 1.5,
  intentTimeout: TIMING.gestureToHeadsetConfirm,
  sessionExpiredTimeout: 3000,  // 3 seconds
};

// ==================== Intent Bridge State ====================

export type BridgeState = 'idle' | 'gesture_detected' | 'intent_forming' | 'awaiting_confirmation' | 'confirmed' | 'rejected';

export interface IntentBridgeState {
  bridgeState: BridgeState;
  currentIntent: GestureIntent | null;
  pendingConfirmation: boolean;
  lastError: string | null;
  isInNearZone: boolean;
  sessionExpired: boolean;
}

// ==================== Intent Bridge ====================

export class IntentBridge {
  private config: IntentBridgeConfig;
  
  // Components
  private gestureRecognizer: GestureRecognizer;
  private hapticBridge: GestureHapticBridge;
  private wsClient: XRWebSocketClient;
  private transformer: IntentTransformer;
  
  // State
  private state: IntentBridgeState = {
    bridgeState: 'idle',
    currentIntent: null,
    pendingConfirmation: false,
    lastError: null,
    isInNearZone: true,
    sessionExpired: false,
  };
  
  // Session management
  private sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Callbacks
  private onIntentCreated: ((intent: GestureIntent) => void) | null = null;
  private onIntentConfirmed: ((intent: GestureIntent) => void) | null = null;
  private onIntentRejected: ((intent: GestureIntent, error: string) => void) | null = null;
  private onStateChange: ((state: IntentBridgeState) => void) | null = null;

  constructor(config: Partial<IntentBridgeConfig> = {}) {
    this.config = { ...DEFAULT_INTENT_BRIDGE_CONFIG, ...config };
    
    // Initialize components
    this.gestureRecognizer = new GestureRecognizer(this.config.gesture);
    this.hapticBridge = createGestureHapticBridge(this.config.haptics);
    this.wsClient = createXRWebSocketClient(this.config.wsUrl);
    this.transformer = intentTransformer;
    
    // Connect gesture to haptics
    this.gestureRecognizer.setHaptics(this.hapticBridge);
    
    // Set up WS message handler
    this.wsClient.onMessage(this.handleXRMessage.bind(this));
  }

  // ==================== Lifecycle ====================

  async connect(): Promise<void> {
    await this.wsClient.connect();
  }

  disconnect(): void {
    this.wsClient.disconnect();
  }

  // ==================== Gesture Input ====================

  /**
   * Handle touch start from mobile UI
   */
  onTouchStart(x: number, y: number): void {
    this.gestureRecognizer.onTouchStart(x, y);
    this.updateState({ bridgeState: 'gesture_detected' });
  }

  /**
   * Handle touch move - may emit rotation events
   */
  onTouchMove(x: number, y: number): void {
    const event = this.gestureRecognizer.onTouchMove(x, y);
    if (event) {
      this.handleGestureEvent(event.type, event.confidence);
    }
  }

  /**
   * Handle touch end - completes gesture and forms intent
   */
  onTouchEnd(x: number, y: number): void {
    const event = this.gestureRecognizer.onTouchEnd();
    if (event) {
      this.handleGestureEvent(event.type, event.confidence, { x, y });
    }
  }

  /**
   * Handle raw gesture event
   */
  private handleGestureEvent(
    type: GestureType, 
    confidence: number,
    screenPosition?: { x: number; y: number }
  ): void {
    // Check Sartan confidence threshold
    if (!isSartanGestureValid({ 
      type, 
      metadata: { confidence } 
    } as GestureIntent)) {
      this.updateState({ 
        bridgeState: 'rejected',
        lastError: 'confidence_too_low' 
      });
      return;
    }

    // Transform screen position to world position
    const worldPos = screenPosition 
      ? this.transformer.screenToWorld({ x: screenPosition.x, y: screenPosition.y, scale: 1 })
      : { x: 0, y: 0, z: 0 };

    // Determine gesture direction from movement
    const direction = this.calculateDirection(type);

    // Build context
    const context: Partial<IntentContext> = {
      transitionPoint: this.state.currentIntent?.context.transitionPoint || 'unknown',
    };

    // Build metadata
    const metadata: Partial<IntentMetadata> = {
      sourceDevice: 'mobile',
      confidence,
      sessionId: this.config.sessionId,
      originatingSurface: 'mobile',
    };

    // Create the intent
    const intent = createGestureIntent(
      type,
      worldPos,
      direction,
      this.calculateMagnitude(type),
      Date.now() - (this.state.currentIntent?.timestamp || Date.now()),
      context,
      metadata
    );

    // Update state
    this.state.currentIntent = intent;
    this.updateState({ bridgeState: 'intent_forming' });
    
    // Notify listeners
    this.onIntentCreated?.(intent);

    // Check gaze confirm requirement
    if (this.config.enableGazeConfirm && intent.metadata.gazeConfirm.required) {
      this.updateState({ 
        bridgeState: 'awaiting_confirmation',
        pendingConfirmation: true 
      });
      // Send to XR for gaze confirmation
      this.sendIntentToXR(intent);
    } else {
      // Auto-confirm if close range
      this.confirmIntent(intent);
    }
  }

  /**
   * Calculate gesture direction
   */
  private calculateDirection(type: GestureType): Vector3 {
    // Default directions per gesture type
    switch (type) {
      case 'double_tap':
        return { x: 0, y: 1, z: 0 };  // Up
      case 'rotate':
        return { x: 0, y: 0, z: 1 };   // Z-axis rotation
      case 'long_press':
        return { x: 0, y: 0, z: -1 }; // Into screen
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Calculate gesture magnitude (0-1)
   */
  private calculateMagnitude(type: GestureType): number {
    // Default magnitudes per gesture
    switch (type) {
      case 'double_tap':
        return 0.3;
      case 'rotate':
        return 0.5;
      case 'long_press':
        return 0.8;
      default:
        return 0.5;
    }
  }

  // ==================== XR Communication ====================

  /**
   * Send intent to XR for processing
   */
  private sendIntentToXR(intent: GestureIntent): void {
    const manipulationIntent = this.createManipulationIntent(intent);
    this.wsClient.sendIntent(manipulationIntent);
  }

  /**
   * Convert GestureIntent to ManipulationIntent for XR
   */
  private createManipulationIntent(gestureIntent: GestureIntent): ManipulationIntent {
    const action = this.gestureTypeToAction(gestureIntent.type);
    
    return {
      intentId: gestureIntent.id,
      intent: 'manipulate',
      action,
      axis: 'y',  // Default, could be derived from direction
      method: 'dual_trigger',
      preview: {
        type: action === 'rotate' ? 'rotation_ring' : 'ghost_wireframe',
        uniform: action !== 'move',
      },
      confidence: gestureIntent.metadata.confidence,
      user_can_override: true,
    };
  }

  /**
   * Map gesture type to manipulation action
   */
  private gestureTypeToAction(type: GestureType): IntentAction {
    switch (type) {
      case 'rotate':
        return 'rotate';
      case 'double_tap':
        return 'move';
      case 'long_press':
        return 'scale';
      default:
        return 'move';
    }
  }

  /**
   * Handle incoming XR messages
   */
  private handleXRMessage(message: XRMessage): void {
    switch (message.type) {
      case 'response':
        if (message.status === 'confirmed') {
          this.confirmIntent(this.state.currentIntent!);
        } else {
          this.rejectIntent(this.state.currentIntent!, message.error?.message || 'rejected');
        }
        break;
        
      case 'state':
        // Handle presentation mode changes
        this.transformer.setConfig({});
        break;
    }
  }

  /**
   * Confirm intent execution
   */
  private confirmIntent(intent: GestureIntent): void {
    // Trigger confirmation haptic
    this.hapticBridge.processGesture('double_tap', 1.0);
    
    this.updateState({ 
      bridgeState: 'confirmed',
      pendingConfirmation: false 
    });
    
    this.onIntentConfirmed?.(intent);
    
    // Reset to idle after a short delay
    setTimeout(() => {
      this.updateState({ bridgeState: 'idle' });
    }, 500);
  }

  /**
   * Reject intent
   */
  private rejectIntent(intent: GestureIntent, error: string): void {
    // Trigger error haptic
    this.hapticBridge.processGesture('long_press', 1.0);
    
    this.updateState({ 
      bridgeState: 'rejected',
      pendingConfirmation: false,
      lastError: error 
    });
    
    this.onIntentRejected?.(intent, error);
    
    // Reset to idle
    setTimeout(() => {
      this.updateState({ bridgeState: 'idle' });
    }, 500);
  }

  // ==================== State Management ====================

  private updateState(partial: Partial<IntentBridgeState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.state);
  }

  getState(): IntentBridgeState {
    return { ...this.state };
  }

  // ==================== Event Handlers ====================

  setOnIntentCreated(callback: (intent: GestureIntent) => void): void {
    this.onIntentCreated = callback;
  }

  setOnIntentConfirmed(callback: (intent: GestureIntent) => void): void {
    this.onIntentConfirmed = callback;
  }

  setOnIntentRejected(callback: (intent: GestureIntent, error: string) => void): void {
    this.onIntentRejected = callback;
  }

  setOnStateChange(callback: (state: IntentBridgeState) => void): void {
    this.onStateChange = callback;
  }

  // ==================== Camera Sync ====================

  /**
   * Update camera position from VR for coordinate transforms
   */
  setCamera(position: WorldPosition, rotation: Vector3): void {
    this.transformer.setCamera(position, rotation);
  }

  /**
   * Update presentation mode
   */
  setPresentationMode(mode: PresentationMode): void {
    this.wsClient.sendState(mode);
  }

  /**
   * Update proximity state - call when user enters/exits near zone
   * Triggers SESSION_EXPIRED after 3s outside near zone
   */
  setProximityState(isNear: boolean): void {
    const wasInNearZone = this.state.isInNearZone;
    this.state.isInNearZone = isNear;
    
    if (!isNear && wasInNearZone) {
      // User left near zone - start expiry timer
      this.startSessionExpiryTimer();
    } else if (isNear && !wasInNearZone) {
      // User returned to near zone - cancel expiry
      this.cancelSessionExpiryTimer();
      this.state.sessionExpired = false;
      this.updateState({ sessionExpired: false });
    }
  }

  /**
   * Start session expiry timer (3s timeout)
   */
  private startSessionExpiryTimer(): void {
    this.cancelSessionExpiryTimer(); // Clear any existing
    
    this.sessionExpiryTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, this.config.sessionExpiredTimeout);
  }

  /**
   * Cancel session expiry timer
   */
  private cancelSessionExpiryTimer(): void {
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }
  }

  /**
   * Handle session expired - fade to ambient mode
   */
  private handleSessionExpired(): void {
    this.state.sessionExpired = true;
    
    // Transition to ambient mode
    this.setPresentationMode('ambient');
    
    // Update state
    this.updateState({ 
      bridgeState: 'idle',
      sessionExpired: true 
    });
    
    // Notify listeners
    console.log('[IntentBridge] SESSION_EXPIRED - faded to ambient mode');
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    return this.state.sessionExpired;
  }
}

// ==================== Factory ====================

export function createIntentBridge(config?: Partial<IntentBridgeConfig>): IntentBridge {
  return new IntentBridge(config);
}

// ==================== Convenience Hooks ====================

/**
 * Quick-start bridge for web platforms
 */
export function createWebIntentBridge(wsUrl?: string): IntentBridge {
  return createIntentBridge({
    haptics: 'web',
    wsUrl: wsUrl || 'ws://localhost:8080/xr',
  });
}

/**
 * Quick-start bridge for iOS
 */
export function createiOSIntentBridge(wsUrl?: string): IntentBridge {
  return createIntentBridge({
    haptics: 'ios',
    wsUrl: wsUrl || 'ws://localhost:8080/xr',
  });
}

/**
 * Quick-start bridge for Android
 */
export function createAndroidIntentBridge(wsUrl?: string): IntentBridge {
  return createIntentBridge({
    haptics: 'android',
    wsUrl: wsUrl || 'ws://localhost:8080/xr',
  });
}

// ==================== Exports ====================

export type {
  GestureIntent,
  WorldPosition,
  Vector3,
  IntentContext,
  IntentMetadata,
  GazeConfirm,
} from './GestureIntent';

export {
  createGestureIntent,
  isSartanGestureValid,
} from './GestureIntent';
