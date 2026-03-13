import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Tile as TileType } from '../types/game';
import { Tile } from './Tile';
import { GAME_CONFIG } from '../constants/elements';

interface GameGridProps {
  grid: TileType[][];
  onTileSelect?: (row: number, col: number) => void;
  onTileSwap?: (pos1: { row: number; col: number }, pos2: { row: number; col: number }) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_MARGIN = 20;
const GRID_WIDTH = SCREEN_WIDTH - GRID_MARGIN * 2;
const TILE_SIZE = Math.floor((GRID_WIDTH - 16) / GAME_CONFIG.GRID_SIZE_MOBILE);

export function GameGrid({ grid, onTileSelect, onTileSwap }: GameGridProps) {
  const [selectedTile, setSelectedTile] = useState<{ row: number; col: number } | null>(null);

  const handleTilePress = useCallback((row: number, col: number) => {
    if (!selectedTile) {
      setSelectedTile({ row, col });
      onTileSelect?.(row, col);
    } else {
      // Check if adjacent
      const rowDiff = Math.abs(selectedTile.row - row);
      const colDiff = Math.abs(selectedTile.col - col);
      
      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        onTileSwap?.(selectedTile, { row, col });
      }
      
      setSelectedTile(null);
    }
  }, [selectedTile, onTileSelect, onTileSwap]);

  const gridSize = grid.length;
  
  return (
    <View style={styles.container}>
      <View style={[styles.grid, { width: TILE_SIZE * gridSize + 8, height: TILE_SIZE * gridSize + 8 }]}>
        {grid.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((tile, colIndex) => (
              <TileComponent
                key={tile.id}
                tile={tile}
                size={TILE_SIZE}
                isSelected={selectedTile?.row === rowIndex && selectedTile?.col === colIndex}
                onPress={() => handleTilePress(rowIndex, colIndex)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

interface TileComponentProps {
  tile: TileType;
  size: number;
  isSelected: boolean;
  onPress: () => void;
}

function TileComponent({ tile, size, isSelected, onPress }: TileComponentProps) {
  const scale = useSharedValue(1);
  
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
      runOnJS(onPress)();
    });
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animatedStyle}>
        <Tile 
          tile={tile} 
          size={size} 
          isSelected={isSelected}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: GRID_MARGIN,
  },
  grid: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});
