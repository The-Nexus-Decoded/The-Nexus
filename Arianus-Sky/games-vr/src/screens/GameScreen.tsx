import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameGrid } from '../components/GameGrid';
import { SoulGauge } from '../components/SoulGauge';
import { ScoreHUD } from '../components/ScoreHUD';
import { RealmIndicator } from '../components/RealmIndicator';
import { useGameState } from '../hooks/useGameState';

export default function GameScreen() {
  const { 
    gameState, 
    checkMatches, 
    swapTiles, 
    pauseGame, 
    resumeGame, 
    restartGame,
    changeRealm,
  } = useGameState();

  // Auto-check matches when grid changes
  useEffect(() => {
    const timer = setTimeout(() => {
      checkMatches();
    }, 500);
    return () => clearTimeout(timer);
  }, [gameState.grid, checkMatches]);

  if (gameState.isGameOver) {
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverText}>GAME OVER</Text>
        <Text style={styles.finalScore}>Score: {gameState.score}</Text>
        <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
          <Text style={styles.restartText}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top HUD */}
      <View style={styles.topHUD}>
        <RealmIndicator realm={gameState.currentRealm} />
        
        {/* Realm selector for testing */}
        <View style={styles.realmSelector}>
          {(['ARIANUS', 'PRYAN', 'CHELESTRA', 'ABARRACH'] as const).map(realm => (
            <TouchableOpacity
              key={realm}
              style={[
                styles.realmButton,
                gameState.currentRealm === realm && styles.realmButtonActive,
              ]}
              onPress={() => changeRealm(realm)}
            >
              <Text style={styles.realmButtonText}>{realm[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <ScoreHUD score={gameState.score} />
      </View>

      {/* Game Grid */}
      <GameGrid
        grid={gameState.grid}
        onTileSwap={swapTiles}
      />

      {/* Bottom HUD */}
      <View style={styles.bottomHUD}>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={gameState.isPaused ? resumeGame : pauseGame}
          >
            <Text style={styles.controlText}>
              {gameState.isPaused ? '▶️' : '⏸️'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <SoulGauge value={gameState.soulGauge} realm={gameState.currentRealm} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 48,
  },
  realmSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  realmButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  realmButtonActive: {
    backgroundColor: '#FFD700',
  },
  realmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomHUD: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  controlText: {
    fontSize: 24,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  gameOverText: {
    fontSize: 48,
    color: '#FF3333',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  finalScore: {
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 16,
  },
  restartButton: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#FFD700',
    borderRadius: 8,
  },
  restartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});
