import type { GameMap, Unit, Vec2, AbilityDef } from './types';
import { TERRAIN_DEFS } from '../data/classes';

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function chebyshev(a: Vec2, b: Vec2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function inBounds(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height;
}

export function terrainAt(map: GameMap, x: number, y: number) {
  if (!inBounds(map, x, y)) return null;
  const tile = map.tiles[y]?.[x];
  if (!tile) return null;
  return TERRAIN_DEFS[tile.terrain] || null;
}

export function occupiedKeys(units: Unit[], exceptId?: string): Set<string> {
  const set = new Set<string>();
  for (const u of units) {
    if (u.hp > 0 && u.id !== exceptId) set.add(tileKey(u.position.x, u.position.y));
  }
  return set;
}

export function isWalkable(map: GameMap, x: number, y: number, occupied: Set<string>): boolean {
  const def = terrainAt(map, x, y);
  if (!def || !def.walkable) return false;
  if (occupied.has(tileKey(x, y))) return false;
  return true;
}

const NEIGHBORS: Vec2[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

/** BFS reachable tiles within `range` steps (4-directional). */
export function bfsRange(map: GameMap, start: Vec2, range: number, occupied: Set<string>): Vec2[] {
  if (range <= 0) return [];
  const visited = new Map<string, number>();
  visited.set(tileKey(start.x, start.y), 0);
  const queue: Vec2[] = [start];
  const result: Vec2[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const dist = visited.get(tileKey(cur.x, cur.y))!;
    if (dist >= range) continue;
    for (const d of NEIGHBORS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const key = tileKey(nx, ny);
      if (visited.has(key)) continue;
      if (!isWalkable(map, nx, ny, occupied)) continue;
      visited.set(key, dist + 1);
      result.push({ x: nx, y: ny });
      queue.push({ x: nx, y: ny });
    }
  }
  return result;
}

/** BFS shortest path from start to goal (4-directional). Returns path excluding start, including goal. */
export function bfsPath(map: GameMap, start: Vec2, goal: Vec2, occupied: Set<string>): Vec2[] {
  if (start.x === goal.x && start.y === goal.y) return [];
  const cameFrom = new Map<string, string | null>();
  const posMap = new Map<string, Vec2>();
  const startKey = tileKey(start.x, start.y);
  const goalKey = tileKey(goal.x, goal.y);
  cameFrom.set(startKey, null);
  posMap.set(startKey, start);
  const queue: Vec2[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curKey = tileKey(cur.x, cur.y);
    if (curKey === goalKey) break;
    for (const d of NEIGHBORS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const key = tileKey(nx, ny);
      if (cameFrom.has(key)) continue;
      // Goal tile may be occupied (we path adjacent); others must be walkable
      if (key !== goalKey && !isWalkable(map, nx, ny, occupied)) continue;
      if (!inBounds(map, nx, ny)) continue;
      cameFrom.set(key, curKey);
      posMap.set(key, { x: nx, y: ny });
      queue.push({ x: nx, y: ny });
    }
  }
  if (!cameFrom.has(goalKey)) return [];
  const path: Vec2[] = [];
  let key: string | null = goalKey;
  while (key && key !== startKey) {
    path.unshift(posMap.get(key)!);
    key = cameFrom.get(key) ?? null;
  }
  return path;
}

/** Tiles affected by an ability aimed from `from` at `target`. */
export function shapeTiles(ability: AbilityDef, from: Vec2, target: Vec2, map: GameMap): Vec2[] {
  const tiles: Vec2[] = [];
  const push = (x: number, y: number) => {
    if (inBounds(map, x, y) && !tiles.some(t => t.x === x && t.y === y)) tiles.push({ x, y });
  };

  switch (ability.shape) {
    case 'self':
      push(from.x, from.y);
      break;
    case 'single':
    case 'tile':
      push(target.x, target.y);
      break;
    case 'radius':
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          push(target.x + dx, target.y + dy);
        }
      }
      break;
    case 'arc': {
      // 3-tile arc facing the target direction
      const dx = Math.sign(target.x - from.x);
      const dy = Math.sign(target.y - from.y);
      if (Math.abs(target.x - from.x) >= Math.abs(target.y - from.y)) {
        push(from.x + dx, from.y - 1);
        push(from.x + dx, from.y);
        push(from.x + dx, from.y + 1);
      } else {
        push(from.x - 1, from.y + dy);
        push(from.x, from.y + dy);
        push(from.x + 1, from.y + dy);
      }
      break;
    }
    case 'line': {
      const dx = Math.sign(target.x - from.x);
      const dy = Math.sign(target.y - from.y);
      const range = Math.max(1, ability.range);
      // Normalize to cardinal/diagonal direction
      for (let i = 1; i <= range; i++) {
        push(from.x + dx * i, from.y + dy * i);
      }
      break;
    }
    case 'cone': {
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const range = Math.max(1, ability.range);
      const horiz = Math.abs(dx) >= Math.abs(dy);
      for (let step = 1; step <= range; step++) {
        const spread = Math.floor(step / 2);
        for (let s = -spread; s <= spread; s++) {
          if (horiz) push(from.x + Math.sign(dx) * step, from.y + s);
          else push(from.x + s, from.y + Math.sign(dy) * step);
        }
      }
      break;
    }
  }
  return tiles;
}

/** Valid target tiles for an ability (within range, walkable-or-occupied, in bounds). */
export function validTargets(ability: AbilityDef, from: Vec2, map: GameMap): Vec2[] {
  if (ability.shape === 'self') return [];
  const result: Vec2[] = [];
  const range = Math.max(1, ability.range);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const dist = chebyshev(from, { x, y });
      if (dist >= 1 && dist <= range) {
        const def = terrainAt(map, x, y);
        if (def) result.push({ x, y });
      }
    }
  }
  return result;
}

export interface DamageResult {
  amount: number;
  notes: string[];
}

/** Compute damage of an ability from attacker to defender, applying condition modifiers. */
export function computeDamage(attacker: Unit, defender: Unit, ability: AbilityDef): DamageResult {
  const base = (ability.damage ?? 0) + attacker.attack;
  let amount = Math.max(1, base - defender.defense);
  const notes: string[] = [];

  if (defender.conditions.includes('staggered')) {
    amount = Math.round(amount * 1.5);
    notes.push('Staggered! +50%');
  }
  if (defender.conditions.includes('marked')) {
    amount = Math.round(amount * 1.25);
    notes.push('Marked! +25%');
  }
  if (defender.conditions.includes('defending')) {
    amount = Math.max(1, Math.round(amount / 2));
    notes.push('Defended — halved');
  }
  return { amount, notes };
}

/** Conditions that expire at the start of the unit's own turn. */
export function tickTurnStart(unit: Unit): { unit: Unit; logs: string[]; floaterDmg: number } {
  const logs: string[] = [];
  let floaterDmg = 0;
  let hp = unit.hp;
  const conditions = unit.conditions.filter(c => {
    if (c === 'defending') return false; // brace expires at own turn start
    return true;
  });
  if (unit.conditions.includes('burning')) {
    hp = Math.max(0, hp - 5);
    floaterDmg = 5;
    logs.push(`${unit.name} suffers 5 burning damage.`);
  }
  // Single-round conditions clear after applying
  const cleared = conditions.filter(c => !['staggered', 'marked', 'rooted', 'stunned'].includes(c) || true);
  return { unit: { ...unit, hp, conditions: cleared }, logs, floaterDmg };
}

/** Remove one-shot conditions after the unit takes a hit. */
export function conditionsAfterHit(unit: Unit): string[] {
  return unit.conditions.filter(c => c !== 'staggered' && c !== 'marked' && c !== 'defending');
}

/** Clear conditions that only last one round (called at end of unit's turn). */
export function conditionsAfterTurn(unit: Unit): string[] {
  return unit.conditions.filter(c => c !== 'stunned' && c !== 'rooted');
}

// ==================== ENEMY AI ====================

export interface AiIntent {
  moveTo: Vec2 | null;
  abilityId: string | null;
  targetTile: Vec2 | null;
  targetUnitId: string | null;
}

/** Decide an enemy unit's turn: move toward nearest player, attack if possible. */
export function planEnemyTurn(
  enemy: Unit,
  players: Unit[],
  allUnits: Unit[],
  map: GameMap,
  abilities: Record<string, AbilityDef>,
): AiIntent {
  const intent: AiIntent = { moveTo: null, abilityId: null, targetTile: null, targetUnitId: null };
  const alive = players.filter(p => p.hp > 0);
  if (alive.length === 0 || enemy.hp <= 0) return intent;

  // Nearest player by path-ish distance (chebyshev fallback)
  let target = alive[0];
  let bestDist = chebyshev(enemy.position, target.position);
  for (const p of alive) {
    const d = chebyshev(enemy.position, p.position);
    if (d < bestDist) { bestDist = d; target = p; }
  }

  const occupied = occupiedKeys(allUnits, enemy.id);

  const tryAttack = (fromPos: Vec2): boolean => {
    // Prefer non-basic abilities, then basic attack
    const usable = enemy.abilities
      .map(id => abilities[id])
      .filter((a): a is AbilityDef => !!a && (a.damage ?? 0) > 0);
    // Sort: highest damage first
    usable.sort((a, b) => (b.damage ?? 0) - (a.damage ?? 0));
    for (const ab of usable) {
      const dist = ab.shape === 'radius' && ab.range <= 1
        ? chebyshev(fromPos, target.position)
        : chebyshev(fromPos, target.position);
      if (dist >= 1 && dist <= Math.max(1, ab.range)) {
        intent.abilityId = ab.id;
        intent.targetTile = { ...target.position };
        intent.targetUnitId = target.id;
        return true;
      }
    }
    return false;
  };

  // Attack from current position if possible
  if (tryAttack(enemy.position)) return intent;

  // Otherwise move toward target
  if (enemy.movement > 0 && !enemy.conditions.includes('rooted')) {
    // Path to a tile adjacent to the target
    const adjacents: Vec2[] = [
      { x: target.position.x + 1, y: target.position.y },
      { x: target.position.x - 1, y: target.position.y },
      { x: target.position.x, y: target.position.y + 1 },
      { x: target.position.x, y: target.position.y - 1 },
    ].filter(p => {
      const def = terrainAt(map, p.x, p.y);
      return def?.walkable;
    });

    let bestPath: Vec2[] = [];
    for (const adj of adjacents) {
      const occ2 = new Set(occupied);
      occ2.delete(tileKey(adj.x, adj.y)); // allow goal even if occupied (shouldn't be)
      const path = bfsPath(map, enemy.position, adj, occupied);
      if (path.length > 0 && (bestPath.length === 0 || path.length < bestPath.length)) {
        bestPath = path;
      }
    }

    // Fallback: path directly toward the target tile
    if (bestPath.length === 0) {
      const path = bfsPath(map, enemy.position, target.position, occupied);
      if (path.length > 0) bestPath = path;
    }

    if (bestPath.length > 0) {
      const steps = Math.min(enemy.movement, bestPath.length);
      // Don't step onto the target's own tile
      let dest = bestPath[steps - 1];
      let idx = steps - 1;
      while (idx >= 0 && occupied.has(tileKey(dest.x, dest.y))) {
        idx--;
        if (idx >= 0) dest = bestPath[idx];
      }
      if (idx >= 0) {
        intent.moveTo = dest;
        // After moving, attack if now in range
        tryAttack(dest);
      }
    }
  }

  return intent;
}
