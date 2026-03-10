import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tile as TileType } from '../types/game';
import { ELEMENTS } from '../constants/elements';

interface TileProps {
  tile: TileType;
  size: number;
  isSelected?: boolean;
  isDragging?: boolean;
}

export function Tile({ tile, size, isSelected, isDragging }: TileProps) {
  const element = ELEMENTS[tile.type];
  
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: element.color,
          borderColor: isSelected ? '#FFFFFF' : 'transparent',
          borderWidth: isSelected ? 3 : 0,
          transform: isDragging ? [{ scale: 1.1 }] : [],
        },
      ]}
    >
      {/* Element indicator */}
      <View style={styles.elementIndicator}>
        <Text style={styles.elementSymbol}>{getElementSymbol(tile.type)}</Text>
      </View>
      
      {/* Special tile indicator */}
      {tile.isSpecial && (
        <View style={styles.specialBadge}>
          <Text style={styles.specialText}>{getSpecialSymbol(tile.isSpecial)}</Text>
        </View>
      )}
    </View>
  );
}

function getElementSymbol(type: string): string {
  const symbols: Record<string, string> = {
    ARIANUS: '🔥',
    PRYAN: '💧',
    CHELESTRA: '🌿',
    ABARRACH: '🕳️',
  };
  return symbols[type] || '?';
}

function getSpecialSymbol(special: string): string {
  const symbols: Record<string, string> = {
    line_clear: '⚡',
    explosion: '💥',
    bomb: '💣',
  };
  return symbols[special] || '';
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  elementIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  elementSymbol: {
    fontSize: 24,
  },
  specialBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialText: {
    fontSize: 12,
  },
});
