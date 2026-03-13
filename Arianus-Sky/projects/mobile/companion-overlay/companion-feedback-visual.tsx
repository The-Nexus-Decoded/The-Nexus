// Visual Feedback Component
// Renders CompanionFeedbackState with animations matching VR spec

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { CompanionFeedbackState, FEEDBACK_CONFIGS } from './companion-feedback-states';

interface FeedbackVisualProps {
  state: CompanionFeedbackState;
  size?: number;
  children?: React.ReactNode;
}

export function FeedbackVisual({ state, size = 80, children }: FeedbackVisualProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const config = FEEDBACK_CONFIGS[state];
  const isActive = state !== CompanionFeedbackState.IDLE;

  useEffect(() => {
    // Reset animations
    scaleAnim.setValue(1);
    opacityAnim.setValue(0);
    glowAnim.setValue(0);

    if (!isActive) return;

    const animations: Animated.CompositeAnimation[] = [];

    // Glow animation for INTENT_SENT
    if (state === CompanionFeedbackState.INTENT_SENT) {
      animations.push(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false
        })
      );
    }

    // Scale pulse for CONFIRMED
    if (state === CompanionFeedbackState.CONFIRMED) {
      animations.push(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.elastic(1),
            useNativeDriver: true
          })
        ])
      );
    }

    // Shake + flash for ERROR
    if (state === CompanionFeedbackState.ERROR) {
      animations.push(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.02, duration: 50, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 0.98, duration: 50, useNativeDriver: true })
            ]),
            3
          ),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ])
      );

      animations.push(
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 50, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.2, duration: 50, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true })
        ])
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [state, isActive, scaleAnim, opacityAnim, glowAnim]);

  const outlineColor = config?.colors.outline || 'transparent';

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.feedbackRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: outlineColor,
            transform: [{ scale: scaleAnim }],
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8]
            })
          }
        ]}
      >
        {/* Flash overlay for ERROR state */}
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              backgroundColor: '#FF0000',
              opacity: opacityAnim
            }
          ]}
        />
      </Animated.View>
      
      {/* Content slot */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedbackRing: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent'
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
