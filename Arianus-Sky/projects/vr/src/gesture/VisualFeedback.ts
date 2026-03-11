/**
 * Visual Feedback System
 * Implements V1 animations: cyan glow, scale pulse, red shake
 * Timings: Fade 200ms, Pulse 300ms, Scale 150ms, Transition 400ms
 */

import { AnimationTimings, ANIMATION_TIMINGS, GestureType } from './types';

export type FeedbackType = 'success' | 'error' | 'active';

interface VisualElement {
  mesh?: any;
  material?: any;
  el?: HTMLElement;
}

export class VisualFeedback {
  private target: VisualElement | null = null;
  private timings: AnimationTimings;

  // Visual state matrix (per Orla spec)
  // Opacity: 40%, fade-in: 200ms, hover glow: #00D9FF, commit: 300ms
  private readonly HOVER_COLOR = 0x00D9FF;
  private readonly HOVER_OPACITY = 0.4;
  private readonly FADE_IN_MS = 200;
  private readonly COMMIT_MS = 300;

  constructor(timings: Partial<AnimationTimings> = {}) {
    this.timings = { ...ANIMATION_TIMINGS, ...timings };
  }

  /**
   * Set target element for feedback
   */
  setTarget(element: VisualElement): void {
    this.target = element;
  }

  /**
   * Show success feedback (cyan glow + scale pulse)
   */
  success(): void {
    if (!this.target) return;

    this.pulse();
    this.glow('cyan');
  }

  /**
   * Show error feedback (red shake)
   */
  error(): void {
    if (!this.target) return;

    this.shake();
    this.glow('red');
  }

  /**
   * Show active feedback
   */
  active(): void {
    if (!this.target) return;

    this.glow('cyan', 0.5);
  }

  /**
   * Hover state - #00D9FF glow, 40% opacity, 200ms fade-in
   */
  hover(): void {
    if (!this.target) return;

    if (this.target?.material?.emissive) {
      this.target.material.emissive.setHex(this.HOVER_COLOR);
      this.target.material.emissiveIntensity = 0.6;
      this.target.material.opacity = this.HOVER_OPACITY;
      this.target.material.transparent = true;
    } else if (this.target?.el) {
      this.target.el.style.opacity = String(this.HOVER_OPACITY);
      this.target.el.style.boxShadow = `0 0 15px #00D9FF`;
    }
  }

  /**
   * Clear hover state
   */
  clearHover(): void {
    if (!this.target) return;

    if (this.target?.material) {
      this.target.material.emissiveIntensity = 0;
      this.target.material.opacity = 1;
    } else if (this.target?.el) {
      this.target.el.style.opacity = '1';
      this.target.el.style.boxShadow = 'none';
    }
  }

  /**
   * Commit state - 300ms animation
   */
  commit(): void {
    if (!this.target) return;

    // Brief flash then confirm
    this.glow('cyan', 0.8);
    
    setTimeout(() => {
      this.clearHover();
    }, this.COMMIT_MS);
  }

  /**
   * Cyan glow effect
   */
  private glow(color: 'cyan' | 'red', intensity: number = 1): void {
    const colorValue = color === 'cyan' ? 0x00ffff : 0xff0000;
    
    if (this.target?.material?.emissive) {
      // Three.js material
      this.target.material.emissive.setHex(colorValue);
      this.target.material.emissiveIntensity = intensity;
      
      // Fade out
      setTimeout(() => {
        if (this.target?.material) {
          this.target.material.emissiveIntensity = 0;
        }
      }, this.timings.fade);
    } else if (this.target?.el) {
      // DOM element
      this.target.el.style.boxShadow = `0 0 20px ${color === 'cyan' ? '#00ffff' : '#ff0000'}`;
      
      setTimeout(() => {
        if (this.target?.el) {
          this.target.el.style.boxShadow = 'none';
        }
      }, this.timings.fade);
    }
  }

  /**
   * Scale pulse effect (150ms)
   */
  private pulse(): void {
    if (!this.target?.mesh?.scale) return;

    const originalScale = { 
      x: this.target.mesh.scale.x, 
      y: this.target.mesh.scale.y, 
      z: this.target.mesh.scale.z 
    };

    // Scale up
    this.target.mesh.scale.set(
      originalScale.x * 1.1,
      originalScale.y * 1.1,
      originalScale.z * 1.1
    );

    // Scale back
    setTimeout(() => {
      if (this.target?.mesh) {
        this.target.mesh.scale.set(
          originalScale.x,
          originalScale.y,
          originalScale.z
        );
      }
    }, this.timings.scale);
  }

  /**
   * Red shake effect on error
   */
  private shake(): void {
    if (!this.target?.mesh?.position) return;

    const originalPosition = { 
      x: this.target.mesh.position.x, 
      y: this.target.mesh.position.y, 
      z: this.target.mesh.position.z 
    };

    const shakeIntensity = 0.05;
    const shakeCount = 5;
    let count = 0;

    const shakeInterval = setInterval(() => {
      if (!this.target?.mesh || count >= shakeCount) {
        clearInterval(shakeInterval);
        if (this.target?.mesh) {
          this.target.mesh.position.set(
            originalPosition.x,
            originalPosition.y,
            originalPosition.z
          );
        }
        return;
      }

      this.target.mesh.position.set(
        originalPosition.x + (Math.random() - 0.5) * shakeIntensity,
        originalPosition.y + (Math.random() - 0.5) * shakeIntensity,
        originalPosition.z
      );

      count++;
    }, 50);
  }

  /**
   * Transition animation (400ms)
   */
  transition(callback: () => void): void {
    setTimeout(callback, this.timings.transition);
  }
}

export default VisualFeedback;
