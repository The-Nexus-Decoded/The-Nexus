export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  runeSlots: number;
  runes: Rune[];
  equippedRunes: Rune[];
  items: Item[];
  world: string;
  room: number;
  gold: number;
  sigils: number;
}

export interface Rune {
  id: string;
  name: string;
  symbol: string;
  description: string;
  effect: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'drain';
  power: number;
  manaCost: number;
  element: 'air' | 'fire' | 'stone' | 'water' | 'labyrinth' | 'void';
  tier: 1 | 2 | 3;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'key' | 'relic';
  effect: { stat: string; value: number } | null;
  consumableEffect?: { type: 'heal' | 'mana' | 'buff'; value: number };
}

export interface Enemy {
  id: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  goldReward: number;
  element: string;
  isBoss: boolean;
  description: string;
  abilities: EnemyAbility[];
}

export interface EnemyAbility {
  name: string;
  description: string;
  damage?: number;
  effect?: string;
  cooldown: number;
}

export interface World {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  element: string;
  color: string;
  rooms: number;
  enemies: string[];
  bossId: string;
  unlocked: boolean;
  completed: boolean;
}

export interface CombatState {
  inCombat: boolean;
  enemy: Enemy | null;
  turn: 'player' | 'enemy';
  combatLog: string[];
  playerShield: number;
  enemyShield: number;
  turnCount: number;
  combatEnded: boolean;
  result: 'win' | 'lose' | null;
}

export interface GameState {
  screen: 'title' | 'character' | 'worldmap' | 'combat' | 'inventory' | 'gameover' | 'victory' | 'shop';
  character: Character | null;
  worlds: World[];
  combat: CombatState;
  meta: MetaProgression;
  message: string;
}

export interface MetaProgression {
  totalRuns: number;
  totalWins: number;
  sigils: number;
  upgrades: {
    startingHp: number;
    startingMana: number;
    startingGold: number;
    xpBonus: number;
    runeSlots: number;
  };
}
