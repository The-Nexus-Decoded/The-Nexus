// LatencyIndicator - Visual latency indicator for mobile↔spatial bridge
// Shows connection status and round-trip latency to help users "feel" the bridge

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'warning';

export interface LatencyIndicatorProps {
  status: ConnectionStatus;
  latencyMs?: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'floating';
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: '#00FF88',
  connecting: '#FFB800',
  disconnected: '#FF4444',
  warning: '#FF6B00'
};

const LATENCY_THRESHOLDS = {
  good: 50,      // <50ms green
  moderate: 100, // <100ms yellow
  warning: 200   // <200ms orange
};

function getLatencyColor(latencyMs?: number): string {
  if (latencyMs === undefined) return STATUS_COLORS.disconnected;
  
  if (latencyMs < LATENCY_THRESHOLDS.good) return '#00FF88';
  if (latencyMs < LATENCY_THRESHOLDS.moderate) return '#FFB800';
  if (latencyMs < LATENCY_THRESHOLDS.warning) return '#FF6B00';
  return '#FF4444';
}

function getSizeValue(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 8;
    case 'medium': return 12;
    case 'large': return 16;
  }
}

function getLabelSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 10;
    case 'medium': return 12;
    case 'large': return 14;
  }
}

export function LatencyIndicator({
  status,
  latencyMs,
  showLabel = true,
  size = 'medium',
  position = 'top-right'
}: LatencyIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const indicatorSize = getSizeValue(size);
  const labelFontSize = getLabelSize(size);
  const statusColor = STATUS_COLORS[status];
  const latencyColor = getLatencyColor(latencyMs);

  useEffect(() => {
    // Reset
    pulseAnim.setValue(1);
    rotateAnim.setValue(0);
    glowAnim.setValue(0);

    if (status === 'connecting') {
      // Pulsing animation while connecting
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else if (status === 'connected' && latencyMs && latencyMs > LATENCY_THRESHOLDS.warning) {
      // Warning pulse for high latency
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false
          })
        ])
      ).start();
    } else if (status === 'disconnected') {
      // Shake animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 50,
            useNativeDriver: true
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true
          })
        ]),
        3
      ).start();
    }
  }, [status, latencyMs, pulseAnim, rotateAnim, glowAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-3deg', '3deg']
  });

  const positionStyles = getPositionStyles(position);

  return (
    <View style={[styles.container, positionStyles]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: indicatorSize * 2,
            height: indicatorSize * 2,
            borderRadius: indicatorSize,
            backgroundColor: statusColor,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4]
            })
          }
        ]}
      />

      {/* Main indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: indicatorSize,
            height: indicatorSize,
            borderRadius: indicatorSize / 2,
            backgroundColor: statusColor,
            transform: [
              { scale: pulseAnim },
              { rotate: rotation }
            ]
          }
        ]}
      />

      {/* Label */}
      {showLabel && (
        <Animated.Text
          style={[
            styles.label,
            {
              fontSize: labelFontSize,
              color: latencyColor
            }
          ]}
        >
          {latencyMs !== undefined ? `${latencyMs}ms` : status}
        </Animated.Text>
      )}
    </View>
  );
}

function getPositionStyles(position: LatencyIndicatorProps['position']): object {
  switch (position) {
    case 'top-left':
      return { top: 16, left: 16 };
    case 'top-right':
      return { top: 16, right: 16 };
    case 'bottom-left':
      return { bottom: 16, left: 16 };
    case 'bottom-right':
      return { bottom: 16, right: 16 };
    case 'floating':
      return { position: 'absolute', top: '50%', left: '50%', marginTop: -8, marginLeft: -8 };
    default:
      return { top: 16, right: 16 };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20
  },
  glow: {
    position: 'absolute'
  },
  indicator: {
    // Positioned by animation
  },
  label: {
    fontWeight: '600',
    fontVariant: ['tabular-nums']
  }
});
