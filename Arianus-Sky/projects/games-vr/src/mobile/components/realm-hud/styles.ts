import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Font loading would be handled by expo-font in production
// For now, using system fonts that approximate the spec

export const colors = {
  background: 'rgba(10, 10, 15, 0.85)',
  primary: '#00D9FF',
  secondary: '#FF3366',
  text: '#E8E8F0',
  muted: '#8892A0',
};

export const spacing = {
  padding: 16,
  radius: 12,
  element: 8,
};

export const feedbackRing = {
  idle: { opacity: 0.3, strokeWidth: 2 },
  hover: { opacity: 0.6 },
  active: { scale: 1.2, duration: 150 },
};

export const typography = {
  realmName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  positionCoords: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#CCCCDD',
  },
};

export const containerStyle = {
  backgroundColor: colors.background,
  padding: spacing.padding,
  borderRadius: spacing.radius,
  gap: spacing.element,
};
