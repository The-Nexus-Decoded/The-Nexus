/**
 * Visual Design Tokens - Passthrough-Safe Palette & Depth-Aware Typography
 * Based on Orla's Visual Language Spec
 * 
 * @author Paithan
 * @date 2026-03-09
 */

/**
 * Passthrough-Safe Palette
 * Optimized for AR passthrough visibility
 */
export const Palette = {
  // Primary - warm bone for AR passthrough
  primary: '#E8E4DD',
  primaryRGB: { r: 232, g: 228, b: 221 },

  // Secondary - charcoal for UI contrast
  secondary: '#2D2A26',
  secondaryRGB: { r: 45, g: 42, b: 38 },

  // Accent - ember for action highlights
  accent: '#FF6B35',
  accentRGB: { r: 255, g: 107, b: 53 },

  // Success - teal for confirm states
  success: '#4ECDC4',
  successRGB: { r: 78, g: 205, b: 196 },

  // Error - coral for error/dismiss
  error: '#FF6B6B',
  errorRGB: { r: 255, g: 107, b: 107 },

  // Background - subtle scrim (not opaque for passthrough)
  background: 'rgba(0, 0, 0, 0.4)',
  backgroundLight: 'rgba(232, 228, 221, 0.15)',

  // Transparency levels
  scrim: {
    light: 'rgba(0, 0, 0, 0.2)',
    medium: 'rgba(0, 0, 0, 0.4)',
    heavy: 'rgba(0, 0, 0, 0.6)'
  }
} as const;

/**
 * Depth-Aware Typography
 * SF Pro Display scales with distance from user
 */
export const Typography = {
  fontFamily: {
    primary: 'SF Pro Display',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  // Scale at 1 meter distance
  at1m: {
    body: { size: 16, lineHeight: 1.5 },
    heading: { size: 24, lineHeight: 1.3 },
    caption: { size: 12, lineHeight: 1.4 }
  },

  // Scale at 2 meters distance
  at2m: {
    body: { size: 24, lineHeight: 1.5 },
    heading: { size: 32, lineHeight: 1.3 },
    caption: { size: 16, lineHeight: 1.4 }
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },

  // Contrast requirements
  contrast: {
    passthrough: 4.5,  // 4.5:1 for passthrough mode
    darkMode: 7.0      // 7:1 for dark mode
  },

  /**
   * Calculate font size based on distance
   */
  scaleForDistance: (distanceMeters: number, baseSize: number): number => {
    // Linear interpolation between 1m and 2m scales
    const t = Math.max(0, Math.min(1, (distanceMeters - 1) / 1));
    const scale1m = 1;
    const scale2m = 1.5;
    const scale = scale1m + t * (scale2m - scale1m);
    return baseSize * scale;
  }
} as const;

/**
 * Animation timings
 */
export const Animation = {
  // Gesture feedback
  ripple: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  glow: {
    duration: 200,
    easing: 'ease-out'
  },
  vectorTrail: {
    duration: 150,
    easing: 'linear'
  },
  scaleHandles: {
    duration: 250,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' // spring
  }
} as const;

/**
 * Spacing system
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

/**
 * Border radius
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999
} as const;
