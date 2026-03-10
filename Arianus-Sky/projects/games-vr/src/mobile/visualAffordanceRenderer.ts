/**
 * Visual Affordance Renderer
 * Maps gestures to visual feedback per Orla's Visual Language Spec
 * 
 * Visual Vocabulary:
 * - TAP: Ripple + glow
 * - DOUBLE-TAP: Checkmark flash
 * - DRAG: Arrow/vector trail
 * - PINCH: Scale handles appear
 * - ROTATE: Rotation ring
 * - LONG-PRESS: Hold timer ring
 * 
 * Feedback Topology:
 * - Visual: Color shift + scale + position drift
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { Palette, Animation, BorderRadius } from './designTokens';
import { GestureType, ScreenPoint } from './types';

/**
 * Visual affordance configuration
 */
export interface AffordanceConfig {
  container: HTMLElement;
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Visual element references
 */
interface VisualElements {
  ripple?: SVGCircleElement;
  glow?: SVGElement;
  vectorTrail?: SVGPathElement;
  scaleHandles?: SVGElement[];
  rotationIndicator?: SVGElement;
  checkmark?: SVGElement;
  timerRing?: SVGElement;
}

/**
 * Visual Affordance Renderer
 * Renders gesture feedback overlays
 */
export class VisualAffordanceRenderer {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private elements: VisualElements = {};
  private primaryColor: string;
  private accentColor: string;
  private activeGesture: GestureType | null = null;
  private animationFrame: number | null = null;

  constructor(config: AffordanceConfig) {
    this.container = config.container;
    this.primaryColor = config.primaryColor || Palette.primary;
    this.accentColor = config.accentColor || Palette.accent;

    // Create SVG overlay
    this.svg = this.createSVG();
    this.container.appendChild(this.svg);
  }

  /**
   * Create SVG overlay element
   */
  private createSVG(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'gesture-affordances');
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: visible;
    `;
    return svg;
  }

  /**
   * Show tap affordance: ripple + glow
   */
  showTap(point: ScreenPoint): void {
    this.clear();
    this.activeGesture = 'tap';

    // Create ripple effect
    const ripple = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ripple.setAttribute('cx', String(point.x));
    ripple.setAttribute('cy', String(point.y));
    ripple.setAttribute('r', '0');
    ripple.setAttribute('fill', 'none');
    ripple.setAttribute('stroke', this.accentColor);
    ripple.setAttribute('stroke-width', '3');
    ripple.setAttribute('stroke-opacity', '0.8');
    ripple.style.cssText = `
      filter: drop-shadow(0 0 8px ${this.accentColor});
    `;
    
    this.svg.appendChild(ripple);
    this.elements.ripple = ripple;

    // Animate ripple expand
    this.animateRipple(point, 80);
  }

  /**
   * Animate ripple effect
   */
  private animateRipple(point: ScreenPoint, maxRadius: number): void {
    let radius = 0;
    let opacity = 0.8;

    const animate = () => {
      if (!this.elements.ripple || this.activeGesture !== 'tap') return;

      radius += 4;
      opacity -= 0.03;

      if (radius >= maxRadius || opacity <= 0) {
        this.hideTap();
        return;
      }

      this.elements.ripple.setAttribute('r', String(radius));
      this.elements.ripple.setAttribute('stroke-opacity', String(opacity));
      
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Hide tap affordance
   */
  hideTap(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.elements.ripple) {
      this.elements.ripple.remove();
      this.elements.ripple = undefined;
    }
    if (this.elements.glow) {
      this.elements.glow.remove();
      this.elements.glow = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Show double-tap affordance: checkmark flash
   */
  showDoubleTap(point: ScreenPoint): void {
    this.clear();
    this.activeGesture = 'double_tap';

    const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Checkmark path
    const size = 24;
    const offsetX = point.x - size / 2;
    const offsetY = point.y - size / 2;
    
    // Simple checkmark
    const d = `M ${offsetX + 4} ${offsetY + 12} L ${offsetX + 9} ${offsetY + 17} L ${offsetX + 20} ${offsetY + 6}`;
    
    checkmark.setAttribute('d', d);
    checkmark.setAttribute('fill', 'none');
    checkmark.setAttribute('stroke', Palette.success);
    checkmark.setAttribute('stroke-width', '3');
    checkmark.setAttribute('stroke-linecap', 'round');
    checkmark.setAttribute('stroke-linejoin', 'round');
    checkmark.style.cssText = `
      filter: drop-shadow(0 0 8px ${Palette.success});
      opacity: 0;
    `;

    this.svg.appendChild(checkmark);
    this.elements.checkmark = checkmark;

    // Animate checkmark flash
    this.animateCheckmark(checkmark);
  }

  /**
   * Animate checkmark flash
   */
  private animateCheckmark(checkmark: SVGElement): void {
    let opacity = 0;
    let scale = 0.5;
    let frame = 0;
    const maxFrames = 15;

    const animate = () => {
      if (!this.elements.checkmark || this.activeGesture !== 'double_tap') return;

      frame++;

      // Grow and fade in
      if (frame <= maxFrames / 2) {
        opacity = (frame / (maxFrames / 2)) * 1;
        scale = 0.5 + (frame / (maxFrames / 2)) * 0.5;
      } else {
        // Fade out
        opacity = 1 - ((frame - maxFrames / 2) / (maxFrames / 2));
        scale = 1 + ((frame - maxFrames / 2) / (maxFrames / 2)) * 0.3;
      }

      if (frame >= maxFrames) {
        this.hideDoubleTap();
        return;
      }

      checkmark.style.opacity = String(opacity);
      checkmark.style.transform = `translate(-50%, -50%) scale(${scale})`;
      checkmark.style.transformOrigin = 'center';

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Hide double-tap affordance
   */
  hideDoubleTap(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.elements.checkmark) {
      this.elements.checkmark.remove();
      this.elements.checkmark = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Show drag affordance: vector trail
   */
  showDrag(startPoint: ScreenPoint, currentPoint: ScreenPoint): void {
    if (this.activeGesture !== 'drag' && this.activeGesture !== null) {
      this.clear();
    }
    this.activeGesture = 'drag';

    // Create vector trail path
    const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Calculate direction and create arrow
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 10) return; // Don't show until meaningful movement

    // Create path with arrow head
    const arrowSize = 12;
    const angle = Math.atan2(dy, dx);
    
    // Arrow points
    const endX = currentPoint.x;
    const endY = currentPoint.y;
    const backX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
    const backY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
    const backX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
    const backY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

    const pathD = `M ${startPoint.x} ${startPoint.y} L ${endX} ${endY}`;
    
    // Main line
    trail.setAttribute('d', pathD);
    trail.setAttribute('stroke', this.primaryColor);
    trail.setAttribute('stroke-width', '3');
    trail.setAttribute('fill', 'none');
    trail.setAttribute('stroke-linecap', 'round');
    trail.setAttribute('stroke-linejoin', 'round');
    trail.setAttribute('stroke-opacity', '0.7');
    trail.style.cssText = `
      filter: drop-shadow(0 0 4px ${this.primaryColor});
    `;

    // Arrow head
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', `${endX},${endY} ${backX1},${backY1} ${backX2},${backY2}`);
    arrow.setAttribute('fill', this.primaryColor);
    arrow.setAttribute('fill-opacity', '0.8');

    // Remove old elements
    if (this.elements.vectorTrail) {
      this.elements.vectorTrail.remove();
    }

    this.svg.appendChild(trail);
    this.svg.appendChild(arrow);
    this.elements.vectorTrail = trail;
  }

  /**
   * Hide drag affordance
   */
  hideDrag(): void {
    if (this.elements.vectorTrail) {
      this.elements.vectorTrail.remove();
      this.elements.vectorTrail = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Show pinch affordance: scale handles
   */
  showPinch(point1: ScreenPoint, point2: ScreenPoint): void {
    this.clear();
    this.activeGesture = 'pinch';

    // Calculate center and radius
    const centerX = (point1.x + point2.x) / 2;
    const centerY = (point1.y + point2.y) / 2;
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + 
      Math.pow(point2.y - point1.y, 2)
    );
    const radius = distance / 2;

    // Create circle indicator
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(centerX));
    circle.setAttribute('cy', String(centerY));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', this.accentColor);
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('stroke-dasharray', '8 4');
    circle.setAttribute('stroke-opacity', '0.6');
    circle.style.cssText = `
      filter: drop-shadow(0 0 6px ${this.accentColor});
      transform-origin: ${centerX}px ${centerY}px;
    `;

    // Handle points
    const handle1 = this.createHandle(point1.x, point1.y);
    const handle2 = this.createHandle(point2.x, point2.y);

    this.svg.appendChild(circle);
    this.svg.appendChild(handle1);
    this.svg.appendChild(handle2);

    this.elements.scaleHandles = [circle, handle1, handle2];
    this.elements.glow = circle;
  }

  /**
   * Create a scale handle
   */
  private createHandle(x: number, y: number): SVGCircleElement {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', String(x));
    handle.setAttribute('cy', String(y));
    handle.setAttribute('r', '12');
    handle.setAttribute('fill', this.primaryColor);
    handle.setAttribute('fill-opacity', '0.9');
    handle.setAttribute('stroke', this.accentColor);
    handle.setAttribute('stroke-width', '2');
    handle.style.cssText = `
      filter: drop-shadow(0 0 4px ${this.accentColor});
    `;
    return handle;
  }

  /**
   * Hide pinch affordance
   */
  hidePinch(): void {
    if (this.elements.scaleHandles) {
      this.elements.scaleHandles.forEach(el => el.remove());
      this.elements.scaleHandles = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Show rotate affordance: rotation ring
   * Per Orla's spec: Rotation ring + continuous haptic
   */
  showRotate(centerPoint: ScreenPoint, angle: number): void {
    if (this.activeGesture !== 'rotate' && this.activeGesture !== null) {
      this.clear();
    }
    this.activeGesture = 'rotate';

    // Create rotation arc
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    const radius = 40;
    const startAngle = 0;
    const endAngle = angle;
    
    // Arc path
    const startX = centerPoint.x + radius * Math.cos(startAngle);
    const startY = centerPoint.y + radius * Math.sin(startAngle);
    const endX = centerPoint.x + radius * Math.cos(endAngle);
    const endY = centerPoint.y + radius * Math.sin(endAngle);
    
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const sweep = endAngle > startAngle ? 1 : 0;
    
    const d = `M ${centerPoint.x} ${centerPoint.y} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY} Z`;
    
    arc.setAttribute('d', d);
    arc.setAttribute('fill', this.accentColor);
    arc.setAttribute('fill-opacity', '0.3');
    arc.setAttribute('stroke', this.accentColor);
    arc.setAttribute('stroke-width', '2');

    // Rotation indicator line
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    indicator.setAttribute('x1', String(centerPoint.x));
    indicator.setAttribute('y1', String(centerPoint.y));
    indicator.setAttribute('x2', String(endX));
    indicator.setAttribute('y2', String(endY));
    indicator.setAttribute('stroke', this.accentColor);
    indicator.setAttribute('stroke-width', '3');
    indicator.setAttribute('stroke-linecap', 'round');

    if (this.elements.rotationIndicator) {
      this.elements.rotationIndicator.remove();
    }

    this.svg.appendChild(arc);
    this.svg.appendChild(indicator);
    this.elements.rotationIndicator = indicator;
  }

  /**
   * Hide rotate affordance
   */
  hideRotate(): void {
    if (this.elements.rotationIndicator) {
      this.elements.rotationIndicator.remove();
      this.elements.rotationIndicator = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Show long press affordance: hold timer ring
   * Per Orla's spec: Hold timer ring + heavy pulse haptic
   */
  showLongPress(point: ScreenPoint, progress: number = 0): void {
    if (this.activeGesture !== 'long_press' && this.activeGesture !== null) {
      this.clear();
    }
    this.activeGesture = 'long_press';

    // Timer ring (progress circle)
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', this.accentColor);
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('stroke-dasharray', String(circumference));
    circle.setAttribute('stroke-dashoffset', String(circumference * (1 - progress)));
    circle.setAttribute('transform', `rotate(-90 ${point.x} ${point.y})`);
    circle.style.cssText = `
      filter: drop-shadow(0 0 10px ${this.accentColor});
    `;

    // Inner glow circle
    const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerCircle.setAttribute('cx', String(point.x));
    innerCircle.setAttribute('cy', String(point.y));
    innerCircle.setAttribute('r', String(radius - 8));
    innerCircle.setAttribute('fill', this.accentColor);
    innerCircle.setAttribute('fill-opacity', '0.15');

    if (this.elements.timerRing) {
      this.elements.timerRing.remove();
    }
    if (this.elements.glow) {
      this.elements.glow.remove();
    }

    this.svg.appendChild(innerCircle);
    this.svg.appendChild(circle);
    this.elements.timerRing = circle;
    this.elements.glow = innerCircle;
  }

  /**
   * Update long press progress (0-1)
   */
  updateLongPressProgress(point: ScreenPoint, progress: number): void {
    if (this.activeGesture !== 'long_press' || !this.elements.timerRing) return;

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    this.elements.timerRing.setAttribute('stroke-dashoffset', String(circumference * (1 - progress)));
    this.elements.timerRing.setAttribute('cx', String(point.x));
    this.elements.timerRing.setAttribute('cy', String(point.y));
    
    if (this.elements.glow) {
      this.elements.glow.setAttribute('cx', String(point.x));
      this.elements.glow.setAttribute('cy', String(point.y));
    }
  }

  /**
   * Hide long press affordance
   */
  hideLongPress(): void {
    if (this.elements.glow) {
      this.elements.glow.remove();
      this.elements.glow = undefined;
    }
    this.activeGesture = null;
  }

  /**
   * Clear all affordances
   */
  clear(): void {
    this.hideTap();
    this.hideDoubleTap();
    this.hideDrag();
    this.hidePinch();
    this.hideRotate();
    this.hideLongPress();
    this.activeGesture = null;
  }

  /**
   * Update affordance position for continuous gestures
   */
  updatePosition(point: ScreenPoint): void {
    // Position updates handled by individual gesture methods
  }

  /**
   * Destroy renderer and clean up
   */
  destroy(): void {
    this.clear();
    if (this.svg) {
      this.svg.remove();
    }
  }
}
