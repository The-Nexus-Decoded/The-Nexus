import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreHUDProps {
  score: number;
}

export function ScoreHUD({ score }: ScoreHUDProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>SCORE</Text>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
  },
  label: {
    color: '#AAAAAA',
    fontSize: 12,
    letterSpacing: 2,
  },
  score: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
