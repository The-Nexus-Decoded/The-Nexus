/**
 * IntentPipe Service
 * 
 * Bridge between mobile touch events and XR consumption layer.
 * Publishes touch gestures to be consumed by Samah's XR module.
 */

export interface TouchIntent {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'gesture';
  timestamp: number;
  position: { x: number; y: number };
  gesture?: 'tap' | 'swipe' | 'pinch' | 'drag' | 'none';
  payload?: Record<string, unknown>;
}

export type IntentListener = (intent: TouchIntent) => void;

class IntentPipeService {
  private listeners: Set<IntentListener> = new Set();

  /**
   * Subscribe to touch intents
   */
  subscribe(listener: IntentListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Publish a touch intent to all subscribers
   */
  publish(intent: TouchIntent): void {
    this.listeners.forEach(listener => listener(intent));
  }

  /**
   * Emit touch start event
   */
  emitTouchStart(x: number, y: number): void {
    this.publish({
      type: 'touchstart',
      timestamp: Date.now(),
      position: { x, y },
      gesture: 'none'
    });
  }

  /**
   * Emit touch move event
   */
  emitTouchMove(x: number, y: number): void {
    this.publish({
      type: 'touchmove',
      timestamp: Date.now(),
      position: { x, y },
      gesture: 'none'
    });
  }

  /**
   * Emit touch end event
   */
  emitTouchEnd(x: number, y: number): void {
    this.publish({
      type: 'touchend',
      timestamp: Date.now(),
      position: { x, y },
      gesture: 'none'
    });
  }

  /**
   * Emit a classified gesture
   */
  emitGesture(
    gesture: TouchIntent['gesture'],
    position: { x: number; y: number },
    payload?: Record<string, unknown>
  ): void {
    this.publish({
      type: 'gesture',
      timestamp: Date.now(),
      position,
      gesture,
      payload
    });
  }
}

export const IntentPipe = new IntentPipeService();
