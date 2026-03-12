// PreviewRenderer - Mobile preview visualizations
// Implements Spatial UI Contract: ghost_wireframe, rotation_ring, corner_handles
// V1: XY plane only, preview-first, queue management

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

export type PreviewType = 'ghost_wireframe' | 'rotation_ring' | 'corner_handles';

export interface PreviewConfig {
  type: PreviewType;
  action: 'move' | 'rotate' | 'scale';
  axis: 'x' | 'y';
  confidence: number;
  userCanOverride: boolean;
  uniform?: boolean;  // For scale: uniform vs non-uniform
}

// World unit baseline: 1m = 960px at 1m distance (1920px canvas, 90° FOV)
const WORLD_UNITS_PER_PX = 1 / 960;
const REFERENCE_DISTANCE_METERS = 1;

interface PreviewRendererProps {
  config: PreviewConfig;
  position: { x: number; y: number };  // Screen position
  scale?: number;  // Distance-based scale factor
  visible: boolean;
  onOverride?: (correction: { dx: number; dy: number }) => void;
}

// === Ghost Wireframe (MOVE) ===
// Horizontal drag preview - translucent outline showing intended position

interface GhostWireframeProps {
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
}

export function GhostWireframe({ position, size, visible }: GhostWireframeProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 0.4 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      style={[
        styles.ghostWireframe,
        {
          left: position.x - size.width / 2,
          top: position.y - size.height / 2,
          width: size.width,
          height: size.height,
          opacity
        }
      ]}
    />
  );
}

// === Rotation Ring (ROTATE) ===
// Circular threshold preview - ring showing rotation angle

interface RotationRingProps {
  position: { x: number; y: number };
  radius: number;
  angle: number;  // degrees
  visible: boolean;
}

export function RotationRing({ position, radius, angle, visible }: RotationRingProps) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: visible ? 1 : 0.8,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start();
  }, [visible, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.rotationRing,
        {
          left: position.x - radius,
          top: position.y - radius,
          width: radius * 2,
          height: radius * 2,
          opacity,
          transform: [
            { scale },
            { rotate: `${angle}deg` }
          ]
        }
      ]}
    >
      {/* Angle markers every 15° */}
      {Array.from({ length: 24 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.angleMarker,
            { transform: [{ rotate: `${i * 15}deg` }] }
          ]}
        />
      ))}
    </Animated.View>
  );
}

// === Corner Handles (SCALE) ===
// Dual trigger/grip preview - corner handles for uniform scaling

interface CornerHandlesProps {
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  uniform?: boolean;  // True = lock aspect ratio
}

export function CornerHandles({ position, size, visible, uniform = true }: CornerHandlesProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: visible ? 1 : 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true
      })
    ]).start();
  }, [visible, opacity, scale]);

  const handleSize = 24;
  const halfW = size.width / 2;
  const halfH = size.height / 2;

  // Corner positions
  const corners = [
    { x: -halfW, y: -halfH },           // Top-left
    { x: halfW, y: -halfH },            // Top-right
    { x: halfW, y: halfH },             // Bottom-right
    { x: -halfW, y: halfH }             // Bottom-left
  ];

  return (
    <Animated.View
      style={[
        styles.cornerHandlesContainer,
        {
          left: position.x,
          top: position.y,
          opacity,
          transform: [{ scale }]
        }
      ]}
    >
      {/* Bounding box */}
      <View
        style={[
          styles.boundingBox,
          {
            width: size.width,
            height: size.height,
            marginLeft: -halfW,
            marginTop: -halfH
          }
        ]}
      />

      {/* Corner handles */}
      {corners.map((corner, i) => (
        <View
          key={i}
          style={[
            styles.cornerHandle,
            {
              left: corner.x - handleSize / 2,
              top: corner.y - handleSize / 2,
              width: handleSize,
              height: handleSize
            }
          ]}
        />
      ))}
    </Animated.View>
  );
}

// === Preview Queue Manager ===
// 3-deep FIFO, mobile edge: overflow at 100 intents

export class PreviewQueue {
  private queue: PreviewConfig[] = [];
  private readonly MAX_QUEUE = 3;
  private readonly MOBILE_EDGE_OVERFLOW = 100;
  private intentCount = 0;

  enqueue(config: PreviewConfig): void {
    this.intentCount++;

    // FIFO drop on overflow
    if (this.queue.length >= this.MAX_QUEUE) {
      this.queue.shift();  // Drop oldest, keep intent (preview disposable per spec)
    }

    this.queue.push(config);
  }

  dequeue(): PreviewConfig | undefined {
    return this.queue.shift();
  }

  peek(): PreviewConfig | undefined {
    return this.queue[0];
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }

  isFull(): boolean {
    return this.queue.length >= this.MAX_QUEUE;
  }

  // Mobile edge: check for overflow
  isOverflowed(): boolean {
    return this.intentCount > this.MOBILE_EDGE_OVERFLOW;
  }

  getIntentCount(): number {
    return this.intentCount;
  }
}

// Singleton queue instance
export const previewQueue = new PreviewQueue();

// === Main Preview Renderer Component ===

export function PreviewRenderer({ config, position, scale = 1, visible, onOverride }: PreviewRendererProps) {
  if (!visible) return null;

  const defaultSize = { width: 120 * scale, height: 120 * scale };
  const radius = 60 * scale;

  switch (config.type) {
    case 'ghost_wireframe':
      return (
        <GhostWireframe
          position={position}
          size={defaultSize}
          visible={visible}
        />
      );

    case 'rotation_ring':
      return (
        <RotationRing
          position={position}
          radius={radius}
          angle={0}
          visible={visible}
        />
      );

    case 'corner_handles':
      return (
        <CornerHandles
          position={position}
          size={defaultSize}
          visible={visible}
          uniform={config.uniform}
        />
      );

    default:
      return null;
  }
}

// === Styles ===

const styles = StyleSheet.create({
  // Ghost Wireframe
  ghostWireframe: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(74, 144, 217, 0.1)',
    borderRadius: 4
  },

  // Rotation Ring
  rotationRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#6BB3FF',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  angleMarker: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#6BB3FF',
    top: -4,
    transformOrigin: 'center 60px'  // Extend from center to radius
  },

  // Corner Handles
  cornerHandlesContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(107, 179, 255, 0.5)',
    borderStyle: 'solid'
  },
  cornerHandle: {
    position: 'absolute',
    backgroundColor: '#4A90D9',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 4
  }
});
