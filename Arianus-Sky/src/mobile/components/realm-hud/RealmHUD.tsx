import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { RealmName } from './RealmName';
import { PositionCoords } from './PositionCoords';
import { FeedbackRing } from './FeedbackRing';
import { colors, containerStyle, typography, spacing } from './styles';

interface RealmHUDProps {
  realmName?: string;
  initialPosition?: { x: number; y: number; z: number };
  // Spatial positioning for VR integration
  planeHeight?: number;    // 1.5m default
  planeAngle?: number;     // 15° below eye level
}

export const RealmHUD: React.FC<RealmHUDProps> = ({
  realmName = 'REALM',
  initialPosition = { x: 0, y: 0, z: 0 },
  planeHeight = 1.5,
  planeAngle = 15,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [ringState, setRingState] = useState<'idle' | 'hover' | 'active'>('idle');

  const handlePressIn = useCallback(() => {
    setRingState('active');
  }, []);

  const handlePressOut = useCallback(() => {
    setRingState('idle');
  }, []);

  const handleHover = useCallback(() => {
    setRingState('hover');
  }, []);

  // Simulated position update (would come from hand tracking in production)
  const updatePosition = useCallback((x: number, y: number, z: number) => {
    setPosition({ x, y, z });
  }, []);

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={12} tint="dark" style={styles.blurContainer}>
        <Pressable
          style={styles.hudContainer}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleHover}
        >
          <View style={styles.header}>
            <FeedbackRing state={ringState} size={40} />
            <RealmName>{realmName}</RealmName>
          </View>
          
          <View style={styles.coordsContainer}>
            <Text style={styles.label}>POSITION</Text>
            <PositionCoords {...position} />
          </View>

          <View style={styles.metaContainer}>
            <Text style={styles.label}>PLANE</Text>
            <Text style={styles.metaValue}>{planeHeight}m @ {planeAngle}°</Text>
          </View>
        </Pressable>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  blurContainer: {
    ...containerStyle,
    minWidth: 180,
  },
  hudContainer: {
    gap: spacing.element,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.element,
  },
  coordsContainer: {
    gap: 2,
  },
  metaContainer: {
    gap: 2,
  },
  label: {
    ...typography.label,
  },
  metaValue: {
    ...typography.positionCoords,
    color: colors.muted,
  },
});
