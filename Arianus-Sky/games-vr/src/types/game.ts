import { ELEMENTS } from '../constants/elements';

export type ElementName = keyof typeof ELEMENTS;

export interface Tile {
  id: string;
  type: ElementName;
  row: number;
  col: number;
  isSpecial?: 'line_clear' | 'explosion' | 'bomb' | null;
}

export interface GameState {
  grid: Tile[][];
  score: number;
  soulGauge: number;
  currentRealm: ElementName;
  isPaused: boolean;
  isGameOver: boolean;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface GestureState {
  isDragging: boolean;
  startPosition: Position;
  currentPosition: Position;
  targetTile: Tile | null;
}

export interface MatchResult {
  tiles: Tile[];
  score: number;
  reaction?: string;
}

export interface RealmConfig {
  name: string;
  color: string;
  particleColor: string;
  direction: 'upward' | 'spiral_down' | 'downward' | 'static';
  speed: 'fast' | 'medium' | 'slow' | 'none';
  effect: string;
  decayRate: number;
  pulseInterval: number;
}
