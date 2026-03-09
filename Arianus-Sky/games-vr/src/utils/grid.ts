import { Tile, ElementName } from '../types/game';
import { ELEMENTS, GAME_CONFIG } from '../constants/elements';

const ELEMENT_KEYS = Object.keys(ELEMENTS) as ElementName[];

export function generateGrid(size: number = GAME_CONFIG.GRID_SIZE_MOBILE): Tile[][] {
  const grid: Tile[][] = [];
  
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = createTile(row, col);
    }
  }
  
  return grid;
}

export function createTile(row: number, col: number): Tile {
  const randomElement = ELEMENT_KEYS[Math.floor(Math.random() * ELEMENT_KEYS.length)];
  return {
    id: `tile-${row}-${col}-${Date.now()}`,
    type: randomElement,
    row,
    col,
    isSpecial: null,
  };
}

export function findMatches(grid: Tile[][]): Tile[] {
  const size = grid.length;
  const matches: Tile[] = [];
  const checked = new Set<string>();

  // Check horizontal matches
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size - 2; col++) {
      const type = grid[row][col].type;
      if (
        grid[row][col + 1].type === type &&
        grid[row][col + 2].type === type
      ) {
        let matchLength = 3;
        while (col + matchLength < size && grid[row][col + matchLength].type === type) {
          matchLength++;
        }
        
        for (let i = 0; i < matchLength; i++) {
          const key = `${row},${col + i}`;
          if (!checked.has(key)) {
            checked.add(key);
            matches.push(grid[row][col + i]);
          }
        }
        
        // Check for special tiles
        if (matchLength >= 4) {
          grid[row][col].isSpecial = 'line_clear';
        }
        if (matchLength >= 5) {
          grid[row][col].isSpecial = 'explosion';
        }
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size - 2; row++) {
      const type = grid[row][col].type;
      if (
        grid[row + 1][col].type === type &&
        grid[row + 2][col].type === type
      ) {
        let matchLength = 3;
        while (row + matchLength < size && grid[row + matchLength][col].type === type) {
          matchLength++;
        }
        
        for (let i = 0; i < matchLength; i++) {
          const key = `${row + i},${col}`;
          if (!checked.has(key)) {
            checked.add(key);
            matches.push(grid[row + i][col]);
          }
        }
        
        if (matchLength >= 4) {
          grid[row][col].isSpecial = 'line_clear';
        }
        if (matchLength >= 5) {
          grid[row][col].isSpecial = 'explosion';
        }
      }
    }
  }

  return matches;
}

export function calculateScore(matches: Tile[]): number {
  let score = matches.length * 100;
  
  // Bonus for special tiles
  const specialCount = matches.filter(t => t.isSpecial).length;
  if (specialCount > 0) {
    score += specialCount * 500;
  }
  
  return score;
}

export function removeMatches(grid: Tile[][], matches: Tile[]): Tile[][] {
  const newGrid = grid.map(row => [...row]);
  
  for (const match of matches) {
    newGrid[match.row][match.col] = createTile(match.row, match.col);
  }
  
  return newGrid;
}

export function swapTiles(
  grid: Tile[][], 
  pos1: { row: number; col: number }, 
  pos2: { row: number; col: number }
): Tile[][] {
  const newGrid = grid.map(row => [...row]);
  const temp = newGrid[pos1.row][pos1.col];
  newGrid[pos1.row][pos1.col] = {
    ...newGrid[pos2.row][pos2.col],
    row: pos1.row,
    col: pos1.col,
  };
  newGrid[pos2.row][pos2.col] = {
    ...temp,
    row: pos2.row,
    col: pos2.col,
  };
  
  return newGrid;
}
