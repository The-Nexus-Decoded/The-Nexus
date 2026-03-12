import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ElementName } from '../types/game';
import { ELEMENTS } from '../constants/elements';

interface RealmIndicatorProps {
  realm: ElementName;
}

const REALM_SYMBOLS: Record<ElementName, string> = {
  ARIANUS: '🔥',
  PRYAN: '💧',
  CHELESTRA: '🌿',
  ABARRACH: '🕳️',
};

export function RealmIndicator({ realm }: RealmIndicatorProps) {
  const element = ELEMENTS[realm];
  
  return (
    <View style={[styles.container, { borderColor: element.color }]}>
      <Text style={styles.symbol}>{REALM_SYMBOLS[realm]}</Text>
      <Text style={[styles.name, { color: element.color }]}>{element.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 28,
  },
  name: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
