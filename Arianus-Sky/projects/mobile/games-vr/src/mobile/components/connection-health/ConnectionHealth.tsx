import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from './styles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ConnectionHealthProps {
  latencyMs?: number;        // Current latency (0 = no connection)
  committedLatencyMs?: number; // Committed/gold latency threshold
  size?: number;
  strokeWidth?: number;
}

export const ConnectionHealth: React.FC<ConnectionHealthProps> = ({
  latencyMs = 0,
  committedLatencyMs,
  size = 48,
  strokeWidth = 4,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Determine state based on latency
  const hasError = latencyMs < 0 || latencyMs === null;
  const isConnected = latencyMs > 0;
  const isCommitted = committedLatencyMs !== undefined && latencyMs <= committedLatencyMs;
  
  // Calculate fill percentage (max 200ms = 100%)
  const maxLatency = 200;
  const fillPercent = isConnected 
    ? Math.min((latencyMs / maxLatency) * 100, 100) 
    : 0;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animate the ring with ease-out curve
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: fillPercent,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fillPercent]);
  
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  
  // Color selection
  const ringColor = hasError 
    ? colors.error 
    : isCommitted 
      ? colors.committed 
      : colors.primary;
  
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.ring}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.muted}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />
        {/* Animated fill ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Latency label */}
      {isConnected && (
        <Text style={styles.latencyLabel}>
          {latencyMs}
        </Text>
      )}
      
      {/* Error indicator */}
      {hasError && (
        <Text style={styles.errorLabel}>ERR</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  latencyLabel: {
    fontFamily: 'SF Pro Mono',
    fontSize: 12,
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  errorLabel: {
    fontFamily: 'SF Pro Mono',
    fontSize: 10,
    color: colors.error,
    marginTop: 8,
    textAlign: 'center',
  },
});
