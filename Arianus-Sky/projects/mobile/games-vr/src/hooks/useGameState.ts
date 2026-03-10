import { useState, useCallback, useEffect, useRef } from 'react';
import { Tile, GameState, ElementName } from '../types/game';
import { generateGrid, findMatches, calculateScore, removeMatches } from '../utils/grid';
import { ELEMENTS, GAME_CONFIG } from '../constants/elements';

const INITIAL_STATE: GameState = {
  grid: [],
  score: 0,
  soulGauge: 1.0,
  currentRealm: 'ARIANUS',
  isPaused: false,
  isGameOver: false,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>({
    ...INITIAL_STATE,
    grid: generateGrid(GAME_CONFIG.GRID_SIZE_MOBILE),
  });
  
  const soulDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Soul gauge decay system
  useEffect(() => {
    if (gameState.isPaused || gameState.isGameOver) {
      if (soulDecayRef.current) {
        clearInterval(soulDecayRef.current);
        soulDecayRef.current = null;
      }
      return;
    }

    const currentElement = ELEMENTS[gameState.currentRealm];
    const decayRate = currentElement.decayRate;
    
    soulDecayRef.current = setInterval(() => {
      setGameState(prev => {
        const newSoul = prev.soulGauge - decayRate;
        if (newSoul <= 0) {
          return { ...prev, soulGauge: 0, isGameOver: true };
        }
        return { ...prev, soulGauge: newSoul };
      });
    }, 1000 / 60); // 60fps decay tick

    return () => {
      if (soulDecayRef.current) {
        clearInterval(soulDecayRef.current);
      }
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.currentRealm]);

  const checkMatches = useCallback(() => {
    setGameState(prev => {
      const matches = findMatches(prev.grid);
      
      if (matches.length === 0) {
        return prev;
      }
      
      const scoreGain = calculateScore(matches);
      const newGrid = removeMatches(prev.grid, matches);
      
      return {
        ...prev,
        grid: newGrid,
        score: prev.score + scoreGain,
        soulGauge: Math.min(1.0, prev.soulGauge + GAME_CONFIG.MATCH_RESTORE),
      };
    });
  }, []);

  const swapTiles = useCallback((pos1: { row: number; col: number }, pos2: { row: number; col: number }) => {
    setGameState(prev => {
      const newGrid = prev.grid.map(row => [...row]);
      
      // Swap
      const temp = newGrid[pos1.row][pos1.col];
      newGrid[pos1.row][pos1.col] = { ...newGrid[pos2.row][pos2.col], row: pos1.row, col: pos1.col };
      newGrid[pos2.row][pos2.col] = { ...temp, row: pos2.row, col: pos2.col };
      
      // Check if swap creates matches
      const matches = findMatches(newGrid);
      
      if (matches.length === 0) {
        // Swap back if no matches (valid move check)
        const revertGrid = prev.grid.map(row => [...row]);
        return { ...prev, grid: revertGrid };
      }
      
      return { ...prev, grid: newGrid };
    });
  }, []);

  const changeRealm = useCallback((realm: ElementName) => {
    setGameState(prev => ({
      ...prev,
      currentRealm: realm,
    }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const restartGame = useCallback(() => {
    setGameState({
      ...INITIAL_STATE,
      grid: generateGrid(GAME_CONFIG.GRID_SIZE_MOBILE),
    });
  }, []);

  return {
    gameState,
    checkMatches,
    swapTiles,
    changeRealm,
    pauseGame,
    resumeGame,
    restartGame,
  };
}
