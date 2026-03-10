// XR WebSocket Client
// Bidirectional state machine for Mobile ↔ XR communication

import {
  XRMessage,
  XRStateMessage,
  XRIntentMessage,
  XRResponseMessage,
  XRGestureMessage,
  ManipulationIntent,
  PresentationMode,
  ErrorCode,
  TIMING,
  INTENT_QUEUE_CONFIG,
  ReconciliationMode,
  RECONCILIATION_CONFIG,
} from './types';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
type MessageHandler = (message: XRMessage) => void;

interface PendingIntent {
  intent: ManipulationIntent;
  timestamp: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

export class XRWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private state: ConnectionState = 'disconnected';
  private handlers: Set<MessageHandler> = new Set();
  private pendingIntents: Map<string, PendingIntent> = new Map();
  private presentationMode: PresentationMode = 'ambient';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageQueue: XRMessage[] = [];
  private intentQueue: ManipulationIntent[] = [];
  private reconciliationMode: ReconciliationMode = 'merge';

  constructor(url: string) {
    this.url = url;
  }

  // ==================== Reconciliation Mode ====================

  setReconciliationMode(mode: ReconciliationMode): void {
    this.reconciliationMode = mode;
    const config = RECONCILIATION_CONFIG[mode];
    
    // Apply mode-specific behavior
    switch (mode) {
      case 'queue_flush':
        this.clearPendingIntents();
        break;
      case 'last_wins':
        // Trim to maxQueueSize, keeping newest
        if (this.intentQueue.length > config.maxQueueSize) {
          this.intentQueue = this.intentQueue.slice(-config.maxQueueSize);
        }
        break;
      case 'merge':
        // Already combined, no action needed
        break;
    }
  }

  getReconciliationMode(): ReconciliationMode {
    return this.reconciliationMode;
  }

  // ==================== Connection Management ====================

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: XRMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[XR WS] Failed to parse message:', e);
          }
        };

        this.ws.onclose = () => {
          this.setState('disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[XR WS] Error:', error);
          reject(error);
        };
      } catch (e) {
        this.setState('disconnected');
        reject(e);
      }
    });
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnect
    this.ws?.close();
    this.setState('disconnected');
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    console.log('[XR WS] State:', newState);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[XR WS] Max reconnect attempts reached');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect().catch(() => {
        console.log('[XR WS] Reconnect failed, will retry...');
      });
    }, delay);
  }

  // ==================== Message Handling ====================

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private handleMessage(message: XRMessage): void {
    switch (message.type) {
      case 'response':
        this.handleResponse(message);
        break;
      case 'state':
        this.presentationMode = message.state;
        break;
    }

    this.handlers.forEach((handler) => handler(message));
  }

  private handleResponse(message: XRResponseMessage): void {
    const pending = this.pendingIntents.get(message.intentId);
    
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingIntents.delete(message.intentId);
    }

    if (message.status === 'rejected') {
      console.warn('[XR WS] Intent rejected:', message.error);
    }
  }

  // ==================== Sending Messages ====================

  private send(message: XRMessage): void {
    if (this.state !== 'connected') {
      this.messageQueue.push(message);
      return;
    }

    const data = JSON.stringify(message);
    this.ws?.send(data);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }

  // ==================== State Updates ====================

  sendState(state: PresentationMode, ttl_ms?: number): void {
    const message: XRStateMessage = {
      type: 'state',
      state,
      timestamp: Date.now(),
      ttl_ms,
    };
    this.send(message);
  }

  setPresentationMode(mode: PresentationMode): void {
    this.presentationMode = mode;
    this.sendState(mode);
  }

  getPresentationMode(): PresentationMode {
    return this.presentationMode;
  }

  // ==================== Intent Pipeline ====================

  sendIntent(intent: ManipulationIntent): void {
    const config = INTENT_QUEUE_CONFIG;
    
    // Check queue overflow (threshold: 50)
    if (this.intentQueue.length >= config.overflowThreshold) {
      if (config.overflowBehavior === 'drop_oldest') {
        console.warn('[XR WS] Intent queue overflow, dropping oldest');
        this.intentQueue.shift();
      } else {
        console.warn('[XR WS] Intent queue overflow, rejecting new intent');
        return; // Reject new intent
      }
    }

    // Check depth cap
    if (this.intentQueue.length >= config.maxDepth) {
      // FIFO drop
      this.intentQueue.shift();
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.handleIntentTimeout(intent.intentId);
    }, TIMING.maxRoundTripLatency);

    const pending: PendingIntent = {
      intent,
      timestamp: Date.now(),
      timeoutId,
    };

    this.pendingIntents.set(intent.intentId, pending);
    this.intentQueue.push(intent);

    const message: XRIntentMessage = {
      type: 'intent',
      intent,
      source: 'menu',
    };
    this.send(message);
  }

  private handleIntentTimeout(intentId: string): void {
    const pending = this.pendingIntents.get(intentId);
    if (pending) {
      this.pendingIntents.delete(intentId);
      
      const errorResponse: XRResponseMessage = {
        type: 'response',
        intentId,
        status: 'rejected',
        error: {
          code: 'timeout',
          message: "VR didn't respond within latency budget",
        },
      };
      this.handleMessage(errorResponse);
    }
  }

  // ==================== Gesture Events ====================

  sendGesture(
    gestureType: string,
    confidence: number,
    hapticsApplied: boolean
  ): void {
    const message: XRGestureMessage = {
      type: 'gesture',
      gesture: {
        type: gestureType as any,
        timestamp: Date.now(),
        confidence,
      },
      haptics_applied: hapticsApplied,
    };
    this.send(message);
  }

  // ==================== Queue Management ====================

  getPendingIntents(): ManipulationIntent[] {
    return Array.from(this.pendingIntents.values()).map((p) => p.intent);
  }

  clearPendingIntents(): void {
    this.pendingIntents.forEach((pending) => {
      clearTimeout(pending.timeoutId);
    });
    this.pendingIntents.clear();
    this.intentQueue = [];
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }
}

// ==================== Factory ====================

export function createXRWebSocketClient(url: string): XRWebSocketClient {
  return new XRWebSocketClient(url);
}

// ==================== Intent Builders ====================

export function createManipulationIntent(
  action: ManipulationIntent['action'],
  axis: ManipulationIntent['axis'],
  method: ManipulationIntent['method'],
  confidence: number = 1.0
): ManipulationIntent {
  const previewTypes = {
    move: 'ghost_wireframe',
    rotate: 'rotation_ring',
    scale: 'corner_handles',
  } as const;

  return {
    intentId: generateUUID(),
    intent: 'manipulate',
    action,
    axis,
    method,
    preview: {
      type: previewTypes[action],
      uniform: action !== 'move',
    },
    confidence,
    user_can_override: true,
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
