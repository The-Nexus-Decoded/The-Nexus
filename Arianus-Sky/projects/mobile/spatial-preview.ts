/**
 * Spatial Preview Renderer
 * Web-based preview for mobile gesture → VR spatial intent mapping
 * Renders touch input as VR-style spatial feedback
 */

import { SpatialIntent, GestureAction } from './gesture-capture';
import { AnimationTimings, ANIMATION_TIMINGS } from '../vr/src/gesture/types';

export interface PreviewConfig {
  width: number;
  height: number;
  backgroundColor: string;
  feedbackColor: string;
  gridEnabled: boolean;
}

const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  width: 400,
  height: 600,
  backgroundColor: '#0a0a12',
  feedbackColor: '#00D9FF',
  gridEnabled: true,
};

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startTime: number;
  active: boolean;
}

export class SpatialPreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: PreviewConfig;
  private touchPoints: Map<number, TouchPoint> = new Map();
  private intents: SpatialIntent[] = [];
  private animationFrame: number | null = null;
  private lastCleanup: number = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<PreviewConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_PREVIEW_CONFIG, ...config };
    
    this.resize();
    this.setupMessageListener();
    this.startRenderLoop();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  /**
   * Listen for SpatialIntents from GestureCapture
   */
  private setupMessageListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event: MessageEvent) => {
      if (this.isSpatialIntent(event.data)) {
        this.addIntent(event.data);
      }
    });

    // Also listen for direct touch events on canvas
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd);
    
    // Mouse fallback
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
  }

  private isSpatialIntent(data: any): data is SpatialIntent {
    return (
      data &&
      typeof data.action === 'string' &&
      ['tap', 'hold', 'swipe'].includes(data.action) &&
      data.position &&
      typeof data.position.x === 'number'
    );
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.touchPoints.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX - this.canvas.getBoundingClientRect().left,
        y: touch.clientY - this.canvas.getBoundingClientRect().top,
        startTime: Date.now(),
        active: true,
      });
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const point = this.touchPoints.get(touch.identifier);
      if (point) {
        point.x = touch.clientX - this.canvas.getBoundingClientRect().left;
        point.y = touch.clientY - this.canvas.getBoundingClientRect().top;
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      const point = this.touchPoints.get(touch.identifier);
      if (point) {
        const duration = Date.now() - point.startTime;
        const action: GestureAction = duration < 200 ? 'tap' : 'hold';
        
        this.addIntent({
          action,
          position: { x: point.x, y: point.y, z: 0 },
          target: 'preview-canvas',
          timestamp: point.startTime,
        });
        
        point.active = false;
        setTimeout(() => this.touchPoints.delete(touch.identifier), 1000);
      }
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const id = Date.now();
    this.touchPoints.set(id, {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      startTime: Date.now(),
      active: true,
    });
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    for (const point of this.touchPoints.values()) {
      if (point.active) {
        point.x = e.clientX - rect.left;
        point.y = e.clientY - rect.top;
      }
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    for (const point of this.touchPoints.values()) {
      if (point.active) {
        const duration = Date.now() - point.startTime;
        const action: GestureAction = duration < 200 ? 'tap' : 'hold';
        
        this.addIntent({
          action,
          position: { x: point.x, y: point.y, z: 0 },
          target: 'preview-canvas',
          timestamp: point.startTime,
        });
        
        point.active = false;
        setTimeout(() => {
          this.touchPoints.delete(point.id);
        }, 1000);
      }
    }
  };

  private addIntent(intent: SpatialIntent): void {
    this.intents.push(intent);
    
    // Cleanup old intents
    const now = Date.now();
    if (now - this.lastCleanup > 5000) {
      this.intents = this.intents.filter(i => now - i.timestamp < 3000);
      this.lastCleanup = now;
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const now = Date.now();

    // Clear
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Grid
    if (this.config.gridEnabled) {
      this.drawGrid(width, height);
    }

    // Active touch points (trailing glow)
    for (const point of this.touchPoints.values()) {
      if (point.active) {
        this.drawTouchGlow(point, now);
      }
    }

    // Recent intents (ripple effects)
    for (const intent of this.intents) {
      const age = now - intent.timestamp;
      if (age < 1000) {
        this.drawIntentFeedback(intent, age);
      }
    }

    // Intent log overlay
    this.drawIntentLog(width, now);
  }

  private drawGrid(width: number, height: number): void {
    this.ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
    this.ctx.lineWidth = 1;

    const gridSize = 40;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Center crosshair
    this.ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(width / 2 - 20, height / 2);
    this.ctx.lineTo(width / 2 + 20, height / 2);
    this.ctx.moveTo(width / 2, height / 2 - 20);
    this.ctx.lineTo(width / 2, height / 2 + 20);
    this.ctx.stroke();
  }

  private drawTouchGlow(point: TouchPoint, now: number): void {
    const age = now - point.startTime;
    const maxRadius = 60;
    const radius = Math.min(age / 10, maxRadius);
    const opacity = Math.max(0, 1 - age / 500);

    // Outer glow
    const gradient = this.ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, radius
    );
    gradient.addColorStop(0, `rgba(0, 217, 255, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Core dot
    this.ctx.fillStyle = `rgba(0, 217, 255, ${opacity})`;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawIntentFeedback(intent: SpatialIntent, age: number): void {
    const maxAge = 1000;
    const progress = age / maxAge;
    
    const x = intent.position.x;
    const y = intent.position.y;
    const maxRadius = intent.action === 'swipe' ? 100 : 50;
    const radius = progress * maxRadius;
    const opacity = 1 - progress;

    // Ripple ring
    this.ctx.strokeStyle = `rgba(0, 217, 255, ${opacity})`;
    this.ctx.lineWidth = 3 - progress * 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Action label
    if (progress < 0.3) {
      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress * 3})`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(intent.action.toUpperCase(), x, y - 20);
    }
  }

  private drawIntentLog(width: number, now: number): void {
    const recentIntents = this.intents
      .filter(i => now - i.timestamp < 3000)
      .slice(-5);

    if (recentIntents.length === 0) return;

    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    recentIntents.forEach((intent, index) => {
      const age = now - intent.timestamp;
      const opacity = Math.max(0.3, 1 - age / 3000);
      const y = 20 + index * 18;
      
      const color = intent.action === 'tap' ? '#00D9FF' :
                    intent.action === 'hold' ? '#FFD700' : '#FF6B6B';
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      this.ctx.fillText(
        `${intent.action.toUpperCase()} @ (${Math.round(intent.position.x)}, ${Math.round(intent.position.y)})`,
        10,
        y
      );
    });
  }

  /**
   * Get recent intents for debugging
   */
  getIntents(): SpatialIntent[] {
    return [...this.intents];
  }

  /**
   * Clear intent history
   */
  clearIntents(): void {
    this.intents = [];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.touchPoints.clear();
    this.intents = [];
  }
}

export default SpatialPreviewRenderer;
