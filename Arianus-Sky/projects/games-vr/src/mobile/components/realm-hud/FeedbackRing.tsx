import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors, feedbackRing } from './styles';

type RingState = 'idle' | 'hover' | 'active';

interface FeedbackRingProps {
  state?: RingState;
  size?: number;
}

export const FeedbackRing: React.FC<FeedbackRingProps> = ({ 
  state = 'idle',
  size = 48 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(feedbackRing.idle.opacity)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'hover') {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.timing(opacityAnim, {
        toValue: feedbackRing.hover.opacity,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (state === 'active') {
      // Scale up animation (150ms)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: feedbackRing.active.scale,
          duration: feedbackRing.active.duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Idle
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      Animated.timing(opacityAnim, {
        toValue: feedbackRing.idle.opacity,
        duration: 200,
        useNativeDriver: true,
      }).start();
      scaleAnim.setValue(1);
    }
  }, [state, pulseAnim, opacityAnim, scaleAnim]);

  const borderColor = state === 'active' ? colors.secondary : colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor,
            opacity: opacityAnim,
            transform: [
              { scale: pulseAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: feedbackRing.idle.strokeWidth,
  },
});
