import { createContext, useContext } from 'react';
import { useGameState } from './useGameState';

const GameContext = createContext<ReturnType<typeof useGameState> | null>(null);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const gameState = useGameState();
  return (
    <GameContext.Provider value={gameState}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameStateProvider');
  return ctx;
}
