// Thin Pipe MVP - VR Companion Feedback Controller
// Implements: companion-controller-pipeline.json contract
// Mobile ↔ VR intent/feedback loop

import { NativeModules, NativeEventEmitter, Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

// === Types ===

export interface VRIntent {
  id: string;
  action: 'activate' | 'deactivate' | 'trigger' | 'configure';
  payload?: Record<string, unknown>;
  priority: number;
  timestamp: number;
  source: 'vr';
}

export interface VRFeedback {
  intentId: string;
  status: 'received' | 'processing' | 'completed' | 'failed' | 'timeout';
  latencyMs?: number;
  error?: string;
  timestamp: number;
  target: 'vr';
}

export type PipelineState = 'IDLE' | 'OUTGOING_PUSH' | 'PENDING_ACK' | 'CONFIRMED' | 'FAILED';

// === Haptic Feedback ===

async function triggerHaptic(style: HapticStyle): Promise<void> {
  if (Platform.OS === 'ios') {
    // Use native haptics via expo-haptics or react-native-haptic-feedback
    const { HapticFeedback } = NativeModules;
    if (HapticFeedback) {
      HapticFeedback.trigger(style);
    }
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(HAPTIC_PATTERNS[style] || 10);
  }
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [0, 20, 50, 20],
  warning: [0, 30, 50, 30],
  error: [0, 50, 100, 50]
};

// === Spatial Audio ===

let audioCache: Map<string, Audio.Sound> = new Map();

async function playSpatialSound(soundId: string, position: Position): Promise<void> {
  try {
    let sound = audioCache.get(soundId);
    
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `/assets/audio/${soundId}.mp3` },
        { shouldPlay: true, volume: position.volume }
      );
      sound = newSound;
      audioCache.set(soundId, sound);
    }
    
    // Spatial positioning would be handled by native audio engine
    // This is a placeholder for the thin pipe MVP
    await sound.setPositionAsync(position.x * 1000); // simplistic mapping
  } catch (e) {
    console.warn('Spatial audio failed:', e);
  }
}

interface Position {
  x: number;
  y: number;
  z: number;
  volume: number;
}

// === Visual Feedback Controller ===

export class CompanionFeedbackController {
  private state: PipelineState = 'IDLE';
  private currentIntent: VRIntent | null = null;
  private stateChangeCallbacks: Set<(state: PipelineState) => void> = new Set();
  private feedbackCallbacks: Set<(feedback: VRFeedback) => void> = new Set();
  private stateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupPipeline();
  }

  private setupPipeline(): void {
    // Pipeline initialized - ready for VR connection
    console.log('[CompanionFeedback] Thin pipe MVP ready');
  }

  // === State Machine ===

  private transition(newState: PipelineState, intent?: VRIntent): void {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`[CompanionFeedback] ${oldState} → ${newState}`);
    
    // Clear any existing timer
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }

    // Set timeout for PENDING_ACK state
    if (newState === 'PENDING_ACK') {
      this.stateTimer = setTimeout(() => {
        this.transition('FAILED');
      }, 150);
    }

    // Notify listeners
    this.stateChangeCallbacks.forEach(cb => cb(newState));
  }

  // === Intent Processing ===

  async handleIntent(intent: VRIntent): Promise<VRFeedback> {
    const startTime = Date.now();
    this.currentIntent = intent;
    
    // State: OUTGOING_PUSH
    this.transition('OUTGOING_PUSH', intent);
    
    // Apply visual feedback - INTENT_SENT
    await this.applyFeedback('INTENT_SENT');

    // Send received feedback to VR
    const feedbackReceived: VRFeedback = {
      intentId: intent.id,
      status: 'received',
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
      target: 'vr'
    };
    this.sendFeedback(feedbackReceived);

    // State: PENDING_ACK
    this.transition('PENDING_ACK');

    try {
      // Process the intent
      await this.processIntent(intent);
      
      // State: CONFIRMED
      this.transition('CONFIRMED');
      
      // Apply confirmed feedback
      await this.applyFeedback('CONFIRMED');

      const feedbackCompleted: VRFeedback = {
        intentId: intent.id,
        status: 'completed',
        latencyMs: Date.now() - startTime,
        timestamp: Date.now(),
        target: 'vr'
      };
      this.sendFeedback(feedbackCompleted);

      return feedbackCompleted;
    } catch (error) {
      // State: FAILED
      this.transition('FAILED');
      
      // Apply error feedback
      await this.applyFeedback('ERROR');

      const feedbackFailed: VRFeedback = {
        intentId: intent.id,
        status: 'failed',
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        target: 'vr'
      };
      this.sendFeedback(feedbackFailed);

      return feedbackFailed;
    } finally {
      // Reset to IDLE after brief delay
      setTimeout(() => {
        this.transition('IDLE');
        this.currentIntent = null;
      }, 500);
    }
  }

  private async processIntent(intent: VRIntent): Promise<void> {
    // Process based on action type
    switch (intent.action) {
      case 'activate':
        // Handle activation
        break;
      case 'deactivate':
        // Handle deactivation
        break;
      case 'trigger':
        // Handle trigger
        break;
      case 'configure':
        // Handle configuration
        break;
    }
    
    // Simulate processing time (MVP)
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // === Feedback Application ===

  async applyFeedback(state: CompanionFeedbackState): Promise<void> {
    const config = FEEDBACK_CONFIGS[state];
    if (!config) return;

    // Visual feedback handled by UI component subscribing to state
    // Here we apply haptic + audio

    const hapticMap: Record<CompanionFeedbackState, HapticStyle> = {
      [CompanionFeedbackState.IDLE]: 'light',
      [CompanionFeedbackState.INTENT_SENT]: 'medium',
      [CompanionFeedbackState.CONFIRMED]: 'success',
      [CompanionFeedbackState.ERROR]: 'error'
    };

    await triggerHaptic(hapticMap[state]);
  }

  // === Feedback Dispatch ===

  private sendFeedback(feedback: VRFeedback): void {
    this.feedbackCallbacks.forEach(cb => cb(feedback));
    // TODO: Send to VR via WebSocket or native bridge
    console.log('[CompanionFeedback] → VR:', feedback);
  }

  // === Subscriptions ===

  onStateChange(callback: (state: PipelineState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  onFeedback(callback: (feedback: VRFeedback) => void): () => void {
    this.feedbackCallbacks.add(callback);
    return () => this.feedbackCallbacks.delete(callback);
  }

  getState(): PipelineState {
    return this.state;
  }

  getCurrentIntent(): VRIntent | null {
    return this.currentIntent;
  }
}

// === Intent Transformer ===

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface TransformConfig {
  fallbackDistanceMeters: number;
  usePlaneDetection: boolean;
  planeFallbackThreshold: number;
}

const DEFAULT_TRANSFORM_CONFIG: TransformConfig = {
  fallbackDistanceMeters: 1.0,
  usePlaneDetection: true,
  planeFallbackThreshold: 1.0
};

export class IntentTransformer {
  private config: TransformConfig;

  constructor(config: Partial<TransformConfig> = {}) {
    this.config = { ...DEFAULT_TRANSFORM_CONFIG, ...config };
  }

  async transformToWorld(screenPoint: ScreenPoint, arSession: unknown): Promise<WorldPoint> {
    // AR plane detection primary, 1m fallback
    // Placeholder for actual ARKit/ARCore integration
    return {
      x: screenPoint.x,
      y: screenPoint.y,
      z: -this.config.fallbackDistanceMeters
    };
  }

  transformToScreen(worldPoint: WorldPoint): ScreenPoint {
    return {
      x: worldPoint.x * 100,
      y: worldPoint.y * 100
    };
  }
}

// === Gesture Handlers ===

export enum GestureType {
  PINCH_SCALE = 'pinch_scale',
  ROTATE_GAUGE = 'rotate_gauge',
  DOUBLE_TAP = 'double_tap',
  LONG_PRESS = 'long_press'
}

export interface GestureEvent {
  type: GestureType;
  timestamp: number;
  delta?: number; // for pinch/rotate
  scale?: number; // for pinch
  degrees?: number; // for rotate
  position?: ScreenPoint;
}

export interface GestureConfig {
  doubleTapTimeoutMs: number;
  undoWindowMs: number;
  rotateSensitivity: number; // degrees per unit
  pinchSensitivity: number;
}

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  doubleTapTimeoutMs: 300,
  undoWindowMs: 3000,
  rotateSensitivity: 1.0,
  pinchSensitivity: 0.01
};

export class GestureHandler {
  private config: GestureConfig;
  private lastTapTime = 0;
  private pendingAction: { intent: VRIntent; timestamp: number } | null = null;
  private onUndo: ((intentId: string) => void) | null = null;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
  }

  // Handle pinch-scale gesture
  handlePinchScale(scale: number, position: ScreenPoint): GestureEvent {
    return {
      type: GestureType.PINCH_SCALE,
      timestamp: Date.now(),
      scale,
      position
    };
  }

  // Handle rotate-gauge gesture, returns degrees
  handleRotate(delta: number): GestureEvent {
    const degrees = delta * this.config.rotateSensitivity;
    return {
      type: GestureType.ROTATE_GAUGE,
      timestamp: Date.now(),
      delta,
      degrees
    };
  }

  // Handle double-tap commit
  handleDoubleTap(position: ScreenPoint): GestureEvent | null {
    const now = Date.now();
    const isDoubleTap = now - this.lastTapTime < this.config.doubleTapTimeoutMs;
    this.lastTapTime = now;

    if (isDoubleTap) {
      return {
        type: GestureType.DOUBLE_TAP,
        timestamp: now,
        position
      };
    }
    return null;
  }

  // Queue action for undo (3s window)
  queueForUndo(intent: VRIntent): void {
    this.pendingAction = { intent, timestamp: Date.now() };

    setTimeout(() => {
      if (this.pendingAction?.intent.id === intent.id) {
        this.pendingAction = null; // undo window expired
      }
    }, this.config.undoWindowMs);
  }

  // Attempt undo within window
  undo(): boolean {
    if (this.pendingAction) {
      const elapsed = Date.now() - this.pendingAction.timestamp;
      if (elapsed < this.config.undoWindowMs) {
        if (this.onUndo) {
          this.onUndo(this.pendingAction.intent.id);
        }
        this.pendingAction = null;
        return true;
      }
    }
    return false;
  }

  setOnUndoCallback(cb: (intentId: string) => void): void {
    this.onUndo = cb;
  }

  getPendingAction(): VRIntent | null {
    return this.pendingAction?.intent || null;
  }

  getUndoRemainingMs(): number {
    if (!this.pendingAction) return 0;
    const elapsed = Date.now() - this.pendingAction.timestamp;
    return Math.max(0, this.config.undoWindowMs - elapsed);
  }
}

// === React Hook ===

import { useState, useEffect, useCallback, useRef } from 'react';

export function useCompanionFeedback() {
  const controllerRef = useRef<CompanionFeedbackController | null>(null);
  const [feedbackState, setFeedbackState] = useState<CompanionFeedbackState>(CompanionFeedbackState.IDLE);
  const [pipelineState, setPipelineState] = useState<PipelineState>('IDLE');

  useEffect(() => {
    controllerRef.current = new CompanionFeedbackController();

    const unsubState = controllerRef.current.onStateChange(setPipelineState);
    
    return () => {
      unsubState();
    };
  }, []);

  const sendIntent = useCallback(async (intent: Omit<VRIntent, 'timestamp' | 'source'>) => {
    const fullIntent: VRIntent = {
      ...intent,
      timestamp: Date.now(),
      source: 'vr'
    };

    // Set visual state immediately
    setFeedbackState(CompanionFeedbackState.INTENT_SENT);

    if (controllerRef.current) {
      const result = await controllerRef.current.handleIntent(fullIntent);
      
      // Update visual state based on result
      if (result.status === 'completed') {
        setFeedbackState(CompanionFeedbackState.CONFIRMED);
      } else if (result.status === 'failed') {
        setFeedbackState(CompanionFeedbackState.ERROR);
      }

      // Reset after animation
      setTimeout(() => {
        setFeedbackState(CompanionFeedbackState.IDLE);
      }, 500);
    }
  }, []);

  return {
    feedbackState,
    pipelineState,
    sendIntent
  };
}

// Import the feedback states we defined earlier
import { CompanionFeedbackState, FEEDBACK_CONFIGS } from './companion-feedback-states';
