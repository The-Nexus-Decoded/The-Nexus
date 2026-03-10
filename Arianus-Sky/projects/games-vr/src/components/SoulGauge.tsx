import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { ELEMENTS } from '../constants/elements';

interface SoulGaugeProps {
  value: number; // 0-1
  realm: keyof typeof ELEMENTS;
}

// UserDefaults wrapper for persistence
const Storage = {
  get: (key: string): boolean => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key) === 'true';
      }
      // React Native - would need @react-native-async-storage/async-storage
      // For now, return default
      return false;
    } catch { return false; }
  },
  set: (key: string, value: boolean): void => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, String(value));
      }
    } catch { }
  },
};

const STORAGE_KEY = 'soulGauge_collapsed';

export function SoulGauge({ value, realm }: SoulGaugeProps) {
  const element = ELEMENTS[realm];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCollapsed, setIsCollapsed] = useState(() => Storage.get(STORAGE_KEY));
  
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    Storage.set(STORAGE_KEY, newState);
  };
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: element.pulseInterval,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: element.pulseInterval,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, [element.pulseInterval, pulseAnim]);
  
  const percentage = Math.round(value * 100);
  const gaugeColor = value > 0.3 ? element.color : '#FF0000';
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={toggleCollapse}
      activeOpacity={0.8}
    >
      {/* Corner anchors */}
      <View style={[styles.cornerAnchor, styles.cornerTopLeft]} />
      <View style={[styles.cornerAnchor, styles.cornerTopRight]} />
      <View style={[styles.cornerAnchor, styles.cornerBottomLeft]} />
      <View style={[styles.cornerAnchor, styles.cornerBottomRight]} />
      
      {/* Cyan glow border */}
      <View style={styles.cyanGlow} />
      
      {/* Screen edge glow effect */}
      <View style={styles.edgeGlowTop} />
      <View style={styles.edgeGlowBottom} />
      
      {isCollapsed ? (
        <View style={styles.collapsedContainer}>
          <Text style={styles.collapsedText}>▼ {Math.round(value * 100)}%</Text>
        </View>
      ) : (
        <>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>SOUL</Text>
            <Text style={[styles.percentage, { color: gaugeColor }]}>{percentage}%</Text>
          </View>
          <View style={styles.gaugeBackground}>
            <Animated.View
              style={[
                styles.gaugeFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: gaugeColor,
                  transform: [{ scaleY: pulseAnim }],
                },
              ]}
            />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 320,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2D2D44',
    position: 'relative',
    minHeight: 60,
  },
  // Corner anchors - 4pt
  cornerAnchor: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#00D4FF',
    zIndex: 10,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopLeftRadius: 2,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopRightRadius: 2,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 2,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 2,
  },
  // Cyan glow
  cyanGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#00D4FF',
    opacity: 0.6,
  },
  // Screen edge glow
  edgeGlowTop: {
    position: 'absolute',
    top: -20,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: '#00D4FF',
    opacity: 0.15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  edgeGlowBottom: {
    position: 'absolute',
    bottom: -20,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: '#00D4FF',
    opacity: 0.15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  // Collapsed state
  collapsedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44, // 44px touch target
  },
  collapsedText: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Normal state
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gaugeBackground: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 6,
  },
});
