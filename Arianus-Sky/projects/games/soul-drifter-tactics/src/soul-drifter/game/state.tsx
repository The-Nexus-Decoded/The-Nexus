import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  SoulDriftState, CombatState, Vec2, ReactionMode, Unit, AbilityId,
  SaveData, Floater, ProfileRecord, ProfileMeta,
} from './types';
import { createCharacter, getMapEntities, MAPS, spawnMapEnemies, primaryResource, xpToNext } from '../data/maps';
import { ABILITIES, ENEMIES, ITEMS } from '../data/classes';
import {
  bfsRange, shapeTiles, validTargets, computeDamage, planEnemyTurn,
  occupiedKeys, tileKey, chebyshev, terrainAt,
} from './combat';

const PROFILE_KEY = 'souldrifter_profiles_v1';

function readProfiles(): Record<string, ProfileRecord> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ProfileRecord>;
  } catch {
    return {};
  }
}

function writeProfiles(profiles: Record<string, ProfileRecord>) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  } catch { /* storage unavailable */ }
}

export function profileKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

const freshParty = () => ({
  members: [] as Unit[],
  activeMemberIndex: 0,
  inventory: ['lesser_soul_vial'],
  soulEssences: [] as string[],
  memories: [] as string[],
  gold: 0,
});

const defaultState = (): SoulDriftState => ({
  screen: 'title',
  party: freshParty(),
  enemies: [],
  currentMap: null,
  combat: null,
  camera: { x: 0, y: 0 },
  selectedUnit: null,
  hoveredTile: null,
  exploredTiles: new Set(),
  floaters: [],
  actionFx: null,
  message: '',
  dialog: null,
  shop: null,
  reactionMode: 'wide_timing',
  animationSpeed: 1,
  clearedObjectives: [],
  defeatedUnitIds: [],
});

interface StartGameData {
  classId: string;
  name: string;
  raceId: string;
  quizModifiers: { hp: number; mp: number; initiative: number; movement: number };
}

interface GameContextType {
  state: SoulDriftState;
  hasSave: boolean;
  getProfiles: () => ProfileMeta[];
  startGame: (data: StartGameData) => void;
  continueGame: () => void;
  loadProfile: (name: string) => void;
  deleteProfile: (name: string) => void;
  enterMap: (mapId: string) => void;
  moveUnit: (unitId: string, to: Vec2) => void;
  selectUnit: (unitId: string | null) => void;
  hoverTile: (pos: Vec2 | null) => void;
  engageEnemy: (enemyId: string) => void;
  combatMove: (to: Vec2) => void;
  selectAbility: (abilityId: AbilityId) => void;
  combatTarget: (tile: Vec2) => void;
  endTurn: () => void;
  retreat: () => void;
  resolveReaction: (success: boolean) => void;
  closeCombatResult: () => void;
  respawn: () => void;
  useItem: (itemId: string) => void;
  setMessage: (msg: string) => void;
  setDialog: (dialog: string | null) => void;
  interactWithEntity: (entityId: string) => void;
  openShop: (shopId: string) => void;
  closeShop: () => void;
  buyItem: (itemId: string, price: number) => void;
  setReactionMode: (mode: ReactionMode) => void;
  setAnimationSpeed: (speed: number) => void;
  saveNow: () => void;
  returnToTitle: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useSoulDrift() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useSoulDrift must be used within SoulDriftProvider');
  return ctx;
}

// ==================== PURE HELPERS =====================

function revealAround(explored: Set<string>, pos: Vec2, mapW: number, mapH: number, radius = 2): Set<string> {
  const next = new Set(explored);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ex = pos.x + dx;
      const ey = pos.y + dy;
      if (ex >= 0 && ex < mapW && ey >= 0 && ey < mapH) next.add(tileKey(ex, ey));
    }
  }
  return next;
}

/** Chelestra's law of light and vision shrinks sight range underwater. */
function visionRadius(realmId: string | undefined, base: number): number {
  return realmId === 'chelestra' ? Math.max(1, base - 1) : base;
}

function allUnits(state: SoulDriftState): Unit[] {
  return [...state.party.members, ...state.enemies];
}

function findUnit(state: SoulDriftState, id: string): Unit | undefined {
  return state.party.members.find(u => u.id === id) || state.enemies.find(u => u.id === id);
}

function updateUnit(state: SoulDriftState, updated: Unit): SoulDriftState {
  if (updated.isPlayer) {
    return {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.map(m => (m.id === updated.id ? updated : m)),
      },
    };
  }
  return {
    ...state,
    enemies: state.enemies.map(e => (e.id === updated.id ? updated : e)),
  };
}

function addLog(combat: CombatState, lines: string[]): CombatState {
  return { ...combat, log: [...combat.log, ...lines].slice(-80) };
}

/** Apply XP to all living party members; returns updated members + level-up names. */
function grantXp(members: Unit[], xp: number): { members: Unit[]; levelUps: string[] } {
  const levelUps: string[] = [];
  const updated = members.map(m => {
    if (m.hp <= 0) return m;
    let unit = { ...m, xp: m.xp + xp };
    while (unit.xp >= xpToNext(unit.level)) {
      unit = {
        ...unit,
        xp: unit.xp - xpToNext(unit.level),
        level: unit.level + 1,
        maxHp: unit.maxHp + 12,
        hp: unit.maxHp + 12,
        maxMp: unit.maxMp + 6,
        mp: unit.maxMp + 6,
        attack: unit.attack + 1,
        defense: unit.level % 2 === 0 ? unit.defense + 1 : unit.defense,
      };
      levelUps.push(`${unit.name} reached level ${unit.level}!`);
    }
    return unit;
  });
  return { members: updated, levelUps };
}

/** Check combat victory/defeat; returns updated state (combat.ended set when over). */
function checkCombatEnd(state: SoulDriftState): SoulDriftState {
  const combat = state.combat;
  if (!combat || combat.ended) return state;

  const playersAlive = state.party.members.some(m => m.hp > 0);
  if (!playersAlive) {
    return {
      ...state,
      combat: { ...combat, ended: true, result: 'defeat', selectedAbility: null, targetTiles: [], moveRange: [] },
    };
  }

  const engagedAlive = state.enemies.some(e => combat.engagedIds.includes(e.id) && e.hp > 0);
  if (!engagedAlive) {
    // Victory — compute rewards
    let xp = 0;
    let gold = 0;
    const items: string[] = [];
    const newDefeated = [...state.defeatedUnitIds];
    const newObjectives = [...state.clearedObjectives];
    for (const e of state.enemies) {
      if (!combat.engagedIds.includes(e.id)) continue;
      const def = e.enemyId ? ENEMIES[e.enemyId] : null;
      if (def) {
        xp += def.xpReward;
        gold += def.goldReward;
        if (def.loot) items.push(...def.loot);
      }
      if (!newDefeated.includes(e.id)) newDefeated.push(e.id);
    }
    // Objective checks (based on the full defeated list, robust across battles)
    const dummyIds = ['e_dummy1', 'e_dummy2', 'e_dummy3'];
    if (dummyIds.every(id => newDefeated.includes(id)) && !newObjectives.includes('defeat_dummies')) newObjectives.push('defeat_dummies');
    if ((newDefeated.includes('e_sentinel')) && !newObjectives.includes('defeat_sentinel')) newObjectives.push('defeat_sentinel');
    if ((newDefeated.includes('e_golem')) && !newObjectives.includes('defeat_golem')) newObjectives.push('defeat_golem');
    if ((newDefeated.includes('e_warden')) && !newObjectives.includes('cleanse_chapel')) newObjectives.push('cleanse_chapel');

    const { members, levelUps } = grantXp(state.party.members, xp);
    const rewards = { xp, gold, items, levelUps };
    return {
      ...state,
      party: {
        ...state.party,
        members,
        gold: state.party.gold + gold,
        inventory: [...state.party.inventory, ...items],
      },
      defeatedUnitIds: newDefeated,
      clearedObjectives: newObjectives,
      combat: {
        ...combat,
        ended: true,
        result: 'victory',
        rewards,
        selectedAbility: null,
        targetTiles: [],
        moveRange: [],
        log: [...combat.log, `Victory! +${xp} XP, +${gold} gold.`, ...levelUps].slice(-80),
      },
    };
  }
  return state;
}

/** Begin the turn for turnOrder[idx]: ticks conditions, computes move range, handles stun-skip. */
function beginTurnFor(state: SoulDriftState, idx: number): SoulDriftState {
  const combat = state.combat;
  if (!combat || combat.ended) return state;
  const order = combat.turnOrder;
  if (order.length === 0) return state;
  const safeIdx = ((idx % order.length) + order.length) % order.length;
  const unitId = order[safeIdx];
  const unit = findUnit(state, unitId);

  // Skip dead units
  if (!unit || unit.hp <= 0) {
    return beginTurnFor({ ...state, combat: { ...combat, activeUnitIndex: safeIdx } }, safeIdx + 1);
  }

  let next: SoulDriftState = {
    ...state,
    combat: {
      ...combat,
      activeUnitIndex: safeIdx,
      movedThisTurn: false,
      actedThisTurn: false,
      selectedAbility: null,
      targetTiles: [],
      moveRange: [],
    },
  };

  // Turn-start condition ticks (burning)
  let logs: string[] = [];
  if (unit.conditions.includes('burning')) {
    const burned = { ...unit, hp: Math.max(0, unit.hp - 5) };
    next = updateUnit(next, burned);
    logs.push(`${unit.name} suffers 5 burning damage.`);
    if (burned.hp <= 0) {
      logs.push(`${unit.name} succumbs to the flames.`);
    }
  }

  // Resource regen for the active unit
  const cur = findUnit(next, unitId)!;
  if (cur.hp > 0 && cur.isPlayer) {
    const resKey = primaryResource(cur.classId);
    const curRes = cur.resources[resKey] ?? 0;
    if (curRes < 100) {
      next = updateUnit(next, { ...cur, resources: { ...cur.resources, [resKey]: Math.min(100, curRes + 10) } });
    }
  }

  if (logs.length > 0) next = { ...next, combat: addLog(next.combat!, logs) };

  // Riptide drag: units standing in a current are pushed west at turn start
  const curUnit = findUnit(next, unitId)!;
  if (curUnit.hp > 0 && next.currentMap) {
    const standing = terrainAt(next.currentMap, curUnit.position.x, curUnit.position.y);
    if (standing?.hazard === 'current') {
      const west = { x: curUnit.position.x - 1, y: curUnit.position.y };
      const westDef = terrainAt(next.currentMap, west.x, west.y);
      const occ = occupiedKeys(allUnits(next), unitId);
      if (westDef?.walkable && !occ.has(tileKey(west.x, west.y))) {
        next = updateUnit(next, { ...curUnit, position: west });
        next = { ...next, combat: addLog(next.combat!, [`The riptide drags ${curUnit.name} west.`]) };
      }
    }
  }

  // Death from burning → skip
  const afterTick = findUnit(next, unitId)!;
  if (afterTick.hp <= 0) {
    next = checkCombatEnd(next);
    if (!next.combat || next.combat.ended) return next;
    return beginTurnFor(next, safeIdx + 1);
  }

  // Stun → skip turn
  if (afterTick.conditions.includes('stunned')) {
    const cleared = { ...afterTick, conditions: afterTick.conditions.filter(c => c !== 'stunned') };
    next = updateUnit(next, cleared);
    next = { ...next, combat: addLog(next.combat!, [`${afterTick.name} is stunned and loses the turn.`]) };
    return beginTurnFor(next, safeIdx + 1);
  }

  // Compute movement range for player units (enemies compute via AI)
  const occupied = occupiedKeys(allUnits(next), unitId);
  const rooted = afterTick.conditions.includes('rooted');
  const moveRange = afterTick.isPlayer && !rooted
    ? bfsRange(next.currentMap!, afterTick.position, afterTick.movement, occupied)
    : [];

  next = { ...next, combat: { ...next.combat!, moveRange } };
  return next;
}

/** Advance to the next unit in the turn order. */
function advanceTurn(state: SoulDriftState): SoulDriftState {
  const combat = state.combat;
  if (!combat || combat.ended) return state;

  // Clear end-of-turn conditions for the unit that just acted
  const activeId = combat.turnOrder[combat.activeUnitIndex];
  const activeUnit = findUnit(state, activeId);
  let next = state;
  if (activeUnit) {
    next = updateUnit(next, {
      ...activeUnit,
      conditions: activeUnit.conditions.filter(c => c !== 'rooted'),
    });
  }

  let idx = combat.activeUnitIndex + 1;
  let round = combat.round;
  if (idx >= combat.turnOrder.length) {
    idx = 0;
    round += 1;
  }
  next = { ...next, combat: { ...next.combat!, round } };
  next = beginTurnFor(next, idx);
  return next;
}

// ==================== PROVIDER =====================

export function SoulDriftProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SoulDriftState>(defaultState);
  const [hasSave, setHasSave] = useState<boolean>(() => Object.keys(readProfiles()).length > 0);
  const floaterId = useRef(1);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveGame = useCallback((s: SoulDriftState) => {
    const hero = s.party.members[0];
    if (!hero) return;
    const key = profileKeyFor(hero.name);
    const profiles = readProfiles();
    const existing = profiles[key];
    const data: SaveData = {
      version: 3,
      party: s.party,
      currentMapId: s.currentMap?.id || 'spawn_chamber',
      defeatedUnitIds: s.defeatedUnitIds,
      clearedObjectives: s.clearedObjectives,
      reactionMode: s.reactionMode,
    };
    profiles[key] = {
      meta: {
        name: hero.name,
        classId: hero.classId || 'warrior',
        raceId: hero.raceId || 'human',
        level: hero.level,
        mapId: s.currentMap?.id || 'spawn_chamber',
        createdAt: existing?.meta.createdAt || Date.now(),
        lastPlayed: Date.now(),
      },
      save: data,
    };
    writeProfiles(profiles);
    setHasSave(true);
  }, []);

  const getProfiles = useCallback((): ProfileMeta[] => {
    return Object.values(readProfiles())
      .map(p => p.meta)
      .sort((a, b) => b.lastPlayed - a.lastPlayed);
  }, []);

  // ---------------- GAME START / LOAD ----------------

  const startGame = useCallback((data: StartGameData) => {
    const character = createCharacter(data.classId, data.name, data.raceId, data.quizModifiers);
    const spawnMap = MAPS['spawn_chamber'];
    const spawn = spawnMap.spawnPoints[0];
    character.position = { x: spawn.x, y: spawn.y };
    character.facing = 'south';

    let explored = new Set<string>();
    explored = revealAround(explored, spawn, spawnMap.width, spawnMap.height, visionRadius(spawnMap.realm, 3));

    const next: SoulDriftState = {
      ...defaultState(),
      screen: 'game',
      party: { ...freshParty(), members: [character] },
      enemies: [],
      currentMap: spawnMap,
      selectedUnit: character.id,
      exploredTiles: explored,
      message: `You awaken beside the Soul Well with fragmented memories... Welcome, ${data.name}.`,
    };
    // Persist the new soul immediately — a refresh never loses a created character
    saveGame(next);
    setState(next);
  }, [saveGame]);

  const loadProfile = useCallback((name: string) => {
    const record = readProfiles()[profileKeyFor(name)];
    if (!record) return;
    const data = record.save;
    const map = MAPS[data.currentMapId] || MAPS['spawn_chamber'];
    const spawn = map.spawnPoints[0];
    const members = data.party.members.map((m, i) => ({
      ...m,
      position: { ...map.spawnPoints[Math.min(i, map.spawnPoints.length - 1)] },
      conditions: [],
      facing: 'south' as const,
    }));
    let explored = new Set<string>();
    explored = revealAround(explored, spawn, map.width, map.height, visionRadius(map.realm, 3));
    setState({
      ...defaultState(),
      screen: 'game',
      party: { ...data.party, members },
      enemies: spawnMapEnemies(map.id, data.defeatedUnitIds),
      currentMap: map,
      selectedUnit: members[0]?.id || null,
      exploredTiles: explored,
      defeatedUnitIds: data.defeatedUnitIds,
      clearedObjectives: data.clearedObjectives,
      reactionMode: data.reactionMode || 'wide_timing',
      message: `Welcome back, ${members[0]?.name || 'drifter'}. The drift remembers you — ${map.name}.`,
    });
  }, []);

  const continueGame = useCallback(() => {
    const latest = getProfiles()[0];
    if (latest) loadProfile(latest.name);
  }, [getProfiles, loadProfile]);

  const deleteProfile = useCallback((name: string) => {
    const profiles = readProfiles();
    delete profiles[profileKeyFor(name)];
    writeProfiles(profiles);
    setHasSave(Object.keys(profiles).length > 0);
  }, []);

  // ---------------- NAVIGATION ----------------

  const enterMap = useCallback((mapId: string) => {
    setState(prev => {
      const map = MAPS[mapId];
      if (!map) return prev;
      const members = prev.party.members.map((m, i) => ({
        ...m,
        position: { ...map.spawnPoints[Math.min(i, map.spawnPoints.length - 1)] },
        conditions: [],
      }));
      let explored = new Set<string>();
      explored = revealAround(explored, members[0]?.position || map.spawnPoints[0], map.width, map.height, visionRadius(map.realm, 3));
      const objectives = [...prev.clearedObjectives];
      if (mapId === 'corridor' && !objectives.includes('enter_corridor')) objectives.push('enter_corridor');
      if (mapId === 'arena' && !objectives.includes('reach_arena')) objectives.push('reach_arena');
      if (mapId === 'lumenhollow' && !objectives.includes('reach_lumenhollow')) objectives.push('reach_lumenhollow');
      if (mapId === 'drowned_chapel' && !objectives.includes('visit_the_chapel')) objectives.push('visit_the_chapel');
      const next: SoulDriftState = {
        ...prev,
        currentMap: map,
        party: { ...prev.party, members },
        enemies: spawnMapEnemies(mapId, prev.defeatedUnitIds),
        combat: null,
        exploredTiles: explored,
        clearedObjectives: objectives,
        dialog: null,
        message: `Entered ${map.name} — ${map.realm === 'pryan' ? 'the heat of Pryan presses against your skin.' : 'Arianus wind hums through the stone.'}`,
      };
      saveGame(next);
      return next;
    });
  }, [saveGame]);

  const moveUnit = useCallback((unitId: string, to: Vec2) => {
    setState(prev => {
      if (prev.combat) return prev; // combat movement uses combatMove
      const unit = prev.party.members.find(m => m.id === unitId);
      if (!unit || !prev.currentMap) return prev;
      const map = prev.currentMap;
      const occupied = occupiedKeys(allUnits(prev), unitId);
      const def = terrainAt(map, to.x, to.y);
      if (!def || !def.walkable) return { ...prev, message: 'That way is blocked.' };
      if (occupied.has(tileKey(to.x, to.y))) return prev;

      let next: SoulDriftState = prev;
      let hp = unit.hp;
      let conditions = unit.conditions;
      const floaters: Omit<Floater, 'id'>[] = [];
      let message = prev.message;

      // Hazard: lava
      if (def.hazard === 'burn') {
        hp = Math.max(1, hp - 10);
        if (!conditions.includes('burning')) conditions = [...conditions, 'burning'];
        floaters.push({ x: to.x, y: to.y, text: '-10', color: '#FF6B35' });
        message = 'The lava sears you! Find solid ground.';
      } else if (def.hazard === 'heat') {
        hp = Math.max(1, hp - 3);
        floaters.push({ x: to.x, y: to.y, text: '-3', color: '#FF6B35' });
        message = 'Heat shimmers scorch your lungs.';
      }

      // Riptide current drags the traveler west
      let finalPos = { ...to };
      if (def.hazard === 'current') {
        const west = { x: to.x - 1, y: to.y };
        const westDef = terrainAt(map, west.x, west.y);
        if (westDef?.walkable && !occupied.has(tileKey(west.x, west.y))) {
          finalPos = west;
          message = 'The riptide catches you and drags you west!';
        }
      }

      const moved = { ...unit, position: finalPos, hp, conditions };
      const members = prev.party.members.map(m => (m.id === unitId ? moved : m));
      const explored = revealAround(prev.exploredTiles, finalPos, map.width, map.height, visionRadius(map.realm, 2));

      // Objective: cross the lava (reached the obsidian gallery in caldera)
      const objectives = [...prev.clearedObjectives];
      if (map.id === 'caldera' && finalPos.x >= 8 && !objectives.includes('cross_the_lava')) {
        objectives.push('cross_the_lava');
        message = 'You crossed the lava river. The gallery hums with conduit-static.';
      }
      if (map.id === 'corridor' && def.cover === 'half' && !objectives.includes('learn_cover')) {
        objectives.push('learn_cover');
        message = 'Low cover — attacks from afar will struggle to find you here.';
      }
      if (map.id === 'current_trench' && def.hazard === 'current' && !objectives.includes('ride_the_current')) {
        objectives.push('ride_the_current');
        message = 'You rode the riptide — the trench current obeys Chelestra\'s law of drag.';
      }

      next = {
        ...prev,
        party: { ...prev.party, members },
        exploredTiles: explored,
        clearedObjectives: objectives,
        message,
      };
      if (floaters.length > 0) {
        const withIds = floaters.map(f => ({ ...f, id: floaterId.current++ }));
        next = { ...next, floaters: [...next.floaters, ...withIds] };
        const ids = withIds.map(f => f.id);
        setTimeout(() => {
          setState(p => ({ ...p, floaters: p.floaters.filter(f => !ids.includes(f.id)) }));
        }, 1300);
      }

      // Auto-engage when stepping next to a hostile
      const adjacent = prev.enemies.find(e => e.hp > 0 && chebyshev(e.position, finalPos) <= 1);
      if (adjacent) {
        const engagedIds = prev.enemies
          .filter(e => e.hp > 0 && chebyshev(e.position, adjacent.position) <= 3)
          .map(e => e.id);
        next = beginCombatState(next, engagedIds);
      }
      return next;
    });
  }, []);

  const selectUnit = useCallback((unitId: string | null) => {
    setState(prev => ({ ...prev, selectedUnit: unitId }));
  }, []);

  const hoverTile = useCallback((pos: Vec2 | null) => {
    setState(prev => ({ ...prev, hoveredTile: pos }));
  }, []);

  // ---------------- COMBAT SETUP ----------------

  function beginCombatState(prev: SoulDriftState, engagedIds: string[]): SoulDriftState {
    if (!prev.currentMap || engagedIds.length === 0) return prev;
    const participants = [
      ...prev.party.members.filter(m => m.hp > 0),
      ...prev.enemies.filter(e => engagedIds.includes(e.id) && e.hp > 0),
    ].sort((a, b) => b.initiative - a.initiative);
    const combat: CombatState = {
      phase: 'orders',
      turnOrder: participants.map(u => u.id),
      activeUnitIndex: 0,
      round: 1,
      movedThisTurn: false,
      actedThisTurn: false,
      moveRange: [],
      selectedAbility: null,
      targetTiles: [],
      affectedTiles: [],
      engagedIds,
      reactionPrompt: null,
      log: ['Combat begins! Initiative order resolved.'],
      ended: false,
      result: null,
      rewards: null,
    };
    const next: SoulDriftState = { ...prev, combat, dialog: null, message: 'Combat! Plan your move.' };
    return beginTurnFor(next, 0);
  }

  const engageEnemy = useCallback((enemyId: string) => {
    setState(prev => {
      if (prev.combat) return prev;
      const enemy = prev.enemies.find(e => e.id === enemyId && e.hp > 0);
      if (!enemy) return prev;
      const engagedIds = prev.enemies
        .filter(e => e.hp > 0 && chebyshev(e.position, enemy.position) <= 3)
        .map(e => e.id);
      return beginCombatState(prev, engagedIds);
    });
  }, []);

  // ---------------- PLAYER COMBAT ACTIONS ----------------

  const combatMove = useCallback((to: Vec2) => {
    setState(prev => {
      const combat = prev.combat;
      if (!combat || combat.ended || combat.movedThisTurn) return prev;
      const activeId = combat.turnOrder[combat.activeUnitIndex];
      const unit = prev.party.members.find(m => m.id === activeId);
      if (!unit) return prev;
      if (!combat.moveRange.some(t => t.x === to.x && t.y === to.y)) return prev;
      const moved = { ...unit, position: { ...to } };
      let next = updateUnit(prev, moved);
      next = { ...next, combat: { ...next.combat!, movedThisTurn: true, moveRange: [] } };
      return next;
    });
  }, []);

  const selectAbility = useCallback((abilityId: AbilityId) => {
    setState(prev => {
      const combat = prev.combat;
      if (!combat || combat.ended || combat.actedThisTurn) return prev;
      const activeId = combat.turnOrder[combat.activeUnitIndex];
      const unit = prev.party.members.find(m => m.id === activeId);
      const ability = ABILITIES[abilityId];
      if (!unit || !ability || !prev.currentMap) return prev;

      // Resource check
      const cost = ability.resourceCost || {};
      for (const [key, amount] of Object.entries(cost)) {
        if ((unit.resources[key] ?? 0) < amount) {
          return { ...prev, message: `Not enough ${key.replace(/_/g, ' ')} for ${ability.name}.` };
        }
      }

      // Self-target abilities resolve immediately
      if (ability.shape === 'self') {
        return resolveAbility(prev, unit, ability, { ...unit.position });
      }

      const targets = validTargets(ability, unit.position, prev.currentMap);
      return {
        ...prev,
        combat: { ...combat, selectedAbility: abilityId, targetTiles: targets },
        message: `${ability.name}: choose a target tile.`,
      };
    });
  }, []);

  /** Apply an ability from a caster at a target tile. Handles damage, healing, conditions, floaters, deaths, victory. */
  function resolveAbility(prev: SoulDriftState, caster: Unit, ability: (typeof ABILITIES)[string], targetTile: Vec2): SoulDriftState {
    if (!prev.currentMap || !prev.combat) return prev;
    let next = prev;
    const affected = shapeTiles(ability, caster.position, targetTile, prev.currentMap);
    const logs: string[] = [];
    const floaters: Omit<Floater, 'id'>[] = [];

    logs.push(`${caster.name} uses ${ability.name}.`);

    // Resource cost
    const cost = ability.resourceCost || {};
    if (Object.keys(cost).length > 0) {
      const resources = { ...caster.resources };
      for (const [key, amount] of Object.entries(cost)) {
        resources[key] = Math.max(0, (resources[key] ?? 0) - amount);
      }
      caster = { ...caster, resources };
    }
    // Basic attack builds fury
    if (ability.id === 'attack' && caster.classId === 'warrior') {
      caster = { ...caster, resources: { ...caster.resources, fury: Math.min(100, (caster.resources.fury ?? 0) + 10) } };
    }

    const targets = allUnits(next).filter(u =>
      u.hp > 0 && affected.some(t => t.x === u.position.x && t.y === u.position.y)
    );

    if (ability.heal) {
      // Heal friendlies on affected tiles (or caster for self-shape)
      const friendlies = ability.shape === 'self'
        ? [caster]
        : targets.filter(u => u.isPlayer === caster.isPlayer);
      for (const t of friendlies) {
        const healed = Math.min(t.maxHp, t.hp + ability.heal);
        const amount = healed - t.hp;
        next = updateUnit(next, { ...findUnit(next, t.id)!, hp: healed });
        floaters.push({ x: t.position.x, y: t.position.y, text: `+${amount}`, color: '#4ade80' });
        logs.push(`${t.name} recovers ${amount} HP.`);
      }
    }

    if ((ability.damage ?? 0) > 0) {
      const hostiles = targets.filter(u => u.isPlayer !== caster.isPlayer);
      for (const t of hostiles) {
        const current = findUnit(next, t.id)!;
        const { amount, notes } = computeDamage(caster, current, ability);
        const newHp = Math.max(0, current.hp - amount);
        let conditions = current.conditions.filter(c => c !== 'staggered' && c !== 'marked' && c !== 'defending');
        // Apply hostile status effects
        for (const se of ability.statusEffects || []) {
          if (['burning', 'staggered', 'marked', 'rooted', 'stunned'].includes(se) && !conditions.includes(se)) {
            conditions = [...conditions, se];
            logs.push(`${current.name} is now ${se}!`);
          }
        }
        next = updateUnit(next, { ...current, hp: newHp, conditions });
        floaters.push({ x: t.position.x, y: t.position.y, text: `-${amount}`, color: ability.damageType === 'fire' ? '#FF6B35' : ability.damageType === 'holy' ? '#f1c40f' : '#f87171' });
        logs.push(`${current.name} takes ${amount} damage.${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
        if (newHp <= 0) {
          logs.push(`${current.name} falls.`);
          floaters.push({ x: t.position.x, y: t.position.y, text: 'DOWN', color: '#94a3b8' });
        }
      }
    }

    // Self-beneficial status effects
    const selfBuffs = (ability.statusEffects || []).filter(se => ['defending', 'anchored', 'oath_guard'].includes(se));
    if (selfBuffs.length > 0) {
      const cur = findUnit(next, caster.id)!;
      const merged = [...new Set([...cur.conditions, ...selfBuffs])];
      next = updateUnit(next, { ...cur, conditions: merged });
      logs.push(`${caster.name} is ${selfBuffs.join(' and ')}.`);
    }

    // Cleanse effect
    if ((ability.statusEffects || []).includes('cleanse')) {
      const friendlies = [caster, ...targets.filter(u => u.isPlayer === caster.isPlayer)];
      for (const f of friendlies) {
        const cur = findUnit(next, f.id);
        if (!cur) continue;
        const cleaned = cur.conditions.filter(c => !['burning', 'rooted', 'stunned', 'staggered', 'marked'].includes(c));
        if (cleaned.length !== cur.conditions.length) {
          next = updateUnit(next, { ...cur, conditions: cleaned });
          logs.push(`${cur.name} is cleansed.`);
        }
      }
    }

    // Ensure caster resource deduction is applied
    const casterNow = findUnit(next, caster.id);
    if (casterNow) {
      next = updateUnit(next, { ...casterNow, resources: caster.resources });
    }

    const withIds = floaters.map(f => ({ ...f, id: floaterId.current++ }));
    const floaterIds = withIds.map(f => f.id);
    const fxId = floaterId.current++;
    const fxKind = ['magic', 'fire', 'holy', 'rune', 'water'].includes(ability.damageType || '') ? 'cast' : 'attack';
    next = {
      ...next,
      combat: {
        ...addLog(next.combat!, logs),
        actedThisTurn: true,
        selectedAbility: null,
        targetTiles: [],
        phase: 'resolution',
      },
      floaters: [...next.floaters, ...withIds],
      actionFx: { id: fxId, unitId: caster.id, kind: fxKind },
    };
    setTimeout(() => {
      setState(p => (p.actionFx?.id === fxId ? { ...p, actionFx: null } : p));
    }, 480);
    if (withIds.length > 0) {
      setTimeout(() => {
        setState(p => ({ ...p, floaters: p.floaters.filter(f => !floaterIds.includes(f.id)) }));
      }, 1300);
    }

    next = checkCombatEnd(next);
    return next;
  }

  const combatTarget = useCallback((tile: Vec2) => {
    setState(prev => {
      const combat = prev.combat;
      if (!combat || combat.ended || combat.actedThisTurn || !combat.selectedAbility) return prev;
      if (!combat.targetTiles.some(t => t.x === tile.x && t.y === tile.y)) return prev;
      const activeId = combat.turnOrder[combat.activeUnitIndex];
      const unit = prev.party.members.find(m => m.id === activeId);
      const ability = ABILITIES[combat.selectedAbility];
      if (!unit || !ability) return prev;
      return resolveAbility(prev, unit, ability, tile);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endTurn = useCallback(() => {
    setState(prev => {
      if (!prev.combat || prev.combat.ended) return prev;
      return advanceTurn(prev);
    });
  }, []);

  const retreat = useCallback(() => {
    setState(prev => {
      if (!prev.combat || !prev.currentMap) return prev;
      const spawn = prev.currentMap.spawnPoints[0];
      const members = prev.party.members.map(m => ({ ...m, position: { ...spawn }, conditions: [] }));
      return {
        ...prev,
        party: { ...prev.party, members },
        combat: null,
        message: 'You break away from the engagement.',
      };
    });
  }, []);

  // ---------------- ENEMY AI ----------------

  const runEnemyTurn = useCallback(() => {
    setState(prev => {
      const combat = prev.combat;
      if (!combat || combat.ended || combat.reactionPrompt) return prev;
      const activeId = combat.turnOrder[combat.activeUnitIndex];
      const enemy = prev.enemies.find(e => e.id === activeId && e.hp > 0);
      if (!enemy || !prev.currentMap) return prev;

      const intent = planEnemyTurn(enemy, prev.party.members, allUnits(prev), prev.currentMap, ABILITIES);
      let next = prev;
      const logs: string[] = [];

      if (intent.moveTo) {
        next = updateUnit(next, { ...findUnit(next, enemy.id)!, position: intent.moveTo });
        logs.push(`${enemy.name} repositions.`);
      }

      if (logs.length > 0) next = { ...next, combat: addLog(next.combat!, logs) };

      const intentAbility = intent.abilityId ? ABILITIES[intent.abilityId] : null;
      const isAoe = intentAbility?.shape === 'radius';

      if (intent.abilityId && !isAoe && intent.targetUnitId && intent.targetTile) {
        const ability = ABILITIES[intent.abilityId];
        const target = prev.party.members.find(m => m.id === intent.targetUnitId && m.hp > 0);
        if (ability && target) {
          const currentEnemy = findUnit(next, enemy.id)!;
          const { amount, notes } = computeDamage(currentEnemy, target, ability);

          const applyDamage = (s: SoulDriftState, finalAmount: number, note: string | null): SoulDriftState => {
            let n = s;
            const tgt = findUnit(n, target.id)!;
            const newHp = Math.max(0, tgt.hp - finalAmount);
            let conditions = tgt.conditions.filter(c => c !== 'defending' && c !== 'staggered' && c !== 'marked');
            for (const se of ability.statusEffects || []) {
              if (['burning', 'staggered', 'marked', 'rooted', 'stunned'].includes(se) && !conditions.includes(se)) {
                conditions = [...conditions, se];
              }
            }
            n = updateUnit(n, { ...tgt, hp: newHp, conditions });
            const hitLogs = [
              `${enemy.name} uses ${ability.name} on ${tgt.name} for ${finalAmount} damage.${notes.length ? ' (' + notes.join(', ') + ')' : ''}${note ? ' ' + note : ''}`,
            ];
            if (newHp <= 0) hitLogs.push(`${tgt.name} falls!`);
            const floater: Floater = {
              id: floaterId.current++, x: tgt.position.x, y: tgt.position.y,
              text: `-${finalAmount}`, color: ability.damageType === 'fire' ? '#FF6B35' : '#f87171',
            };
            const fxId = floaterId.current++;
            n = {
              ...n,
              combat: addLog(n.combat!, hitLogs),
              floaters: [...n.floaters, floater],
              actionFx: { id: fxId, unitId: enemy.id, kind: 'attack' },
            };
            setTimeout(() => {
              setState(p => (p.actionFx?.id === fxId ? { ...p, actionFx: null } : p));
            }, 480);
            const fid = floater.id;
            setTimeout(() => {
              setState(p => ({ ...p, floaters: p.floaters.filter(f => f.id !== fid) }));
            }, 1300);
            n = checkCombatEnd(n);
            return n;
          };

          const mode = next.reactionMode;
          if (mode === 'full_timing' || mode === 'wide_timing') {
            // Open the reaction prompt; damage resolves in resolveReaction
            return {
              ...next,
              combat: {
                ...next.combat!,
                reactionPrompt: {
                  active: true,
                  type: 'block',
                  windowMs: mode === 'full_timing' ? 1400 : 2200,
                  startTime: performance.now(),
                  attackerName: enemy.name,
                  damage: amount,
                  targetId: target.id,
                  attackerId: enemy.id,
                },
                log: [...next.combat!.log, `${enemy.name} winds up ${ability.name} on ${target.name} — REACT!`].slice(-80),
              },
            };
          } else if (mode === 'auto_resolve') {
            const success = Math.random() < 0.4;
            const finalAmount = success ? Math.max(1, Math.round(amount * 0.25)) : amount;
            next = applyDamage(next, finalAmount, success ? '(Auto-blocked!)' : null);
          } else {
            next = applyDamage(next, amount, null);
          }

          if (!next.combat || next.combat.ended) return next;
        }
      }

      // Enemy AoE (radius abilities like Magma Slam / Tidal Slam) splashes all players in the area:
      if (intent.abilityId && isAoe && intentAbility && intent.targetTile) {
        const ability = intentAbility;
        const currentEnemy = findUnit(next, enemy.id);
        if (currentEnemy && next.combat && !next.combat.ended) {
          const affected = shapeTiles(ability, currentEnemy.position, intent.targetTile, prev.currentMap);
          const logs2: string[] = [];
          for (const p of next.party.members) {
            if (p.hp <= 0 || !affected.some(t => t.x === p.position.x && t.y === p.position.y)) continue;
            const { amount } = computeDamage(currentEnemy, p, ability);
            const newHp = Math.max(0, p.hp - amount);
            let conditions = p.conditions.filter(c => c !== 'defending');
            for (const se of ability.statusEffects || []) {
              if (['burning', 'staggered', 'marked', 'rooted', 'stunned'].includes(se) && !conditions.includes(se)) {
                conditions = [...conditions, se];
              }
            }
            next = updateUnit(next, { ...p, hp: newHp, conditions });
            logs2.push(`${p.name} is caught by ${ability.name} for ${amount}!`);
            const floater: Floater = {
              id: floaterId.current++, x: p.position.x, y: p.position.y,
              text: `-${amount}`, color: ability.damageType === 'fire' ? '#FF6B35' : ability.damageType === 'water' ? '#4682B4' : '#f87171',
            };
            next = { ...next, floaters: [...next.floaters, floater] };
            const fid = floater.id;
            setTimeout(() => {
              setState(p2 => ({ ...p2, floaters: p2.floaters.filter(f => f.id !== fid) }));
            }, 1300);
          }
          if (logs2.length > 0) {
            next = { ...next, combat: addLog(next.combat!, logs2) };
            next = checkCombatEnd(next);
          }
        }
      }

      if (!next.combat || next.combat.ended) return next;
      return advanceTurn(next);
    });
  }, []);

  // Schedule enemy turns automatically
  useEffect(() => {
    const combat = state.combat;
    if (!combat || combat.ended || combat.reactionPrompt) return;
    const activeId = combat.turnOrder[combat.activeUnitIndex];
    const isEnemy = state.enemies.some(e => e.id === activeId && e.hp > 0);
    if (!isEnemy) return;
    if (aiTimer.current) clearTimeout(aiTimer.current);
    const delay = 800 / Math.max(0.25, state.animationSpeed);
    aiTimer.current = setTimeout(() => {
      runEnemyTurn();
    }, delay);
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, [state.combat, state.enemies, state.animationSpeed, runEnemyTurn]);

  const resolveReaction = useCallback((success: boolean) => {
    setState(prev => {
      const combat = prev.combat;
      const prompt = combat?.reactionPrompt;
      if (!combat || !prompt) return prev;
      const target = findUnit(prev, prompt.targetId);
      if (!target) return { ...prev, combat: { ...combat, reactionPrompt: null } };

      const finalAmount = success ? Math.max(1, Math.round(prompt.damage * 0.25)) : prompt.damage;
      const newHp = Math.max(0, target.hp - finalAmount);
      const conditions = target.conditions.filter(c => c !== 'defending');
      let next = updateUnit(prev, { ...target, hp: newHp, conditions });
      const logs = success
        ? [`${target.name} ${prompt.type === 'dodge' ? 'dodges' : 'blocks'} ${prompt.attackerName}'s blow! Only ${finalAmount} damage.`]
        : [`${prompt.attackerName}'s strike lands clean — ${finalAmount} damage to ${target.name}.`];
      if (newHp <= 0) logs.push(`${target.name} falls!`);
      const floater: Floater = {
        id: floaterId.current++, x: target.position.x, y: target.position.y,
        text: success ? 'BLOCK!' : `-${finalAmount}`, color: success ? '#60a5fa' : '#f87171',
      };
      next = {
        ...next,
        combat: { ...addLog(next.combat!, logs), reactionPrompt: null },
        floaters: [...next.floaters, floater],
      };
      const fid = floater.id;
      setTimeout(() => {
        setState(p => ({ ...p, floaters: p.floaters.filter(f => f.id !== fid) }));
      }, 1300);
      next = checkCombatEnd(next);
      if (!next.combat || next.combat.ended) return next;
      return advanceTurn(next);
    });
  }, []);

  // ---------------- COMBAT EXIT ----------------

  const closeCombatResult = useCallback(() => {
    setState(prev => {
      if (!prev.combat?.ended) return prev;
      const next: SoulDriftState = {
        ...prev,
        combat: null,
        message: prev.combat.result === 'victory' ? 'The battlefield falls silent.' : prev.message,
      };
      if (prev.combat.result === 'victory') saveGame(next);
      return next;
    });
  }, [saveGame]);

  const respawn = useCallback(() => {
    setState(prev => {
      const map = MAPS['spawn_chamber'];
      const spawn = map.spawnPoints[0];
      const members = prev.party.members.map(m => ({
        ...m,
        hp: m.maxHp,
        mp: m.maxMp,
        position: { ...spawn },
        conditions: [],
      }));
      let explored = new Set<string>();
      explored = revealAround(explored, spawn, map.width, map.height, visionRadius(map.realm, 3));
      const next: SoulDriftState = {
        ...prev,
        screen: 'game',
        currentMap: map,
        party: {
          ...prev.party,
          members,
          gold: Math.floor(prev.party.gold * 0.75),
        },
        enemies: spawnMapEnemies('spawn_chamber', prev.defeatedUnitIds),
        combat: null,
        exploredTiles: explored,
        message: 'The Soul Well catches your fragment and rebuilds you. A quarter of your gold scattered into the drift.',
      };
      saveGame(next);
      return next;
    });
  }, [saveGame]);

  // ---------------- ITEMS ----------------

  const applyItem = useCallback((prev: SoulDriftState, itemId: string): SoulDriftState => {
    const item = ITEMS[itemId];
    const idx = prev.party.inventory.indexOf(itemId);
    if (!item || idx < 0) return prev;
    const target = prev.party.members.find(m => m.hp > 0) || prev.party.members[0];
    if (!target) return prev;

    let unit = { ...target };
    const notes: string[] = [];
    if (item.heal) {
      const healed = Math.min(unit.maxHp, unit.hp + item.heal);
      notes.push(`+${healed - unit.hp} HP`);
      unit.hp = healed;
    }
    if (item.resourceRestore) {
      const key = primaryResource(unit.classId);
      unit.resources = { ...unit.resources, [key]: Math.min(100, (unit.resources[key] ?? 0) + item.resourceRestore) };
      notes.push(`+${item.resourceRestore} ${key.replace(/_/g, ' ')}`);
    }
    if (item.cure) {
      unit.conditions = unit.conditions.filter(c => !item.cure!.includes(c));
      notes.push('conditions cleansed');
    }

    const inventory = [...prev.party.inventory];
    inventory.splice(idx, 1);
    return {
      ...prev,
      party: {
        ...prev.party,
        members: prev.party.members.map(m => (m.id === unit.id ? unit : m)),
        inventory,
      },
      message: `${unit.name} uses ${item.name} (${notes.join(', ')}).`,
    };
  }, []);

  const useItem = useCallback((itemId: string) => {
    setState(prev => {
      // In combat, using an item consumes the action
      if (prev.combat && !prev.combat.ended) {
        if (prev.combat.actedThisTurn) return { ...prev, message: 'You already acted this turn.' };
        const next = applyItem(prev, itemId);
        if (next === prev) return prev;
        return { ...next, combat: { ...next.combat!, actedThisTurn: true, selectedAbility: null, targetTiles: [] } };
      }
      return applyItem(prev, itemId);
    });
  }, [applyItem]);

  // ---------------- INTERACTION ----------------

  const setMessage = useCallback((msg: string) => {
    setState(prev => ({ ...prev, message: msg }));
  }, []);

  const setDialog = useCallback((dialog: string | null) => {
    setState(prev => ({ ...prev, dialog }));
  }, []);

  const interactWithEntity = useCallback((entityId: string) => {
    setState(prev => {
      if (!prev.currentMap || prev.combat) return prev;
      const entities = getMapEntities(prev.currentMap.id);
      const entity = entities.find(e => e.id === entityId);
      if (!entity) return prev;

      // Must be near the entity to interact
      const player = prev.party.members[0];
      if (player && chebyshev(player.position, { x: entity.x, y: entity.y }) > 2) {
        return { ...prev, message: `Move closer to the ${entity.name}.` };
      }

      if (entity.type === 'door') {
        if (entity.requiresObjective && !prev.clearedObjectives.includes(entity.requiresObjective)) {
          return {
            ...prev,
            dialog: 'The Pryan Realm Gate is sealed by the Sentinel\'s ward. Defeat the Sentinel Construct to unbind it.',
            message: 'The gate is sealed.',
          };
        }
        const targetMap = entity.data;
        if (targetMap && MAPS[targetMap]) {
          // Defer to enterMap via state transform (duplicated minimal logic to stay atomic)
          const map = MAPS[targetMap];
          const members = prev.party.members.map((m, i) => ({
            ...m,
            position: { ...map.spawnPoints[Math.min(i, map.spawnPoints.length - 1)] },
            conditions: [],
          }));
          let explored = new Set<string>();
          explored = revealAround(explored, members[0]?.position || map.spawnPoints[0], map.width, map.height, visionRadius(map.realm, 3));
          const objectives = [...prev.clearedObjectives];
          if (targetMap === 'corridor' && !objectives.includes('enter_corridor')) objectives.push('enter_corridor');
          if (targetMap === 'arena' && !objectives.includes('reach_arena')) objectives.push('reach_arena');
          if (targetMap === 'lumenhollow' && !objectives.includes('reach_lumenhollow')) objectives.push('reach_lumenhollow');
          if (targetMap === 'drowned_chapel' && !objectives.includes('visit_the_chapel')) objectives.push('visit_the_chapel');
          const next: SoulDriftState = {
            ...prev,
            currentMap: map,
            party: { ...prev.party, members },
            enemies: spawnMapEnemies(targetMap, prev.defeatedUnitIds),
            exploredTiles: explored,
            clearedObjectives: objectives,
            dialog: null,
            message: `Entered ${map.name}.`,
          };
          saveGame(next);
          return next;
        }
      }

      if (entity.type === 'npc') {
        const objectives = [...prev.clearedObjectives];
        if (entity.data === 'welcome') {
          if (!objectives.includes('speak_to_keeper')) objectives.push('speak_to_keeper');
          return {
            ...prev,
            clearedObjectives: objectives,
            dialog: 'Soul Keeper: "You have awakened at the Soul Well, drifter. When the Sundering split the worlds, two realities collided and merged badly — you are a fragment that remembers both. Beware the Naga: they were Sartan souls once, before corruption twisted them into seeders of entropy. Touch the Awakening Essence, then pass the Soul Gate. The corridor beyond teaches cover and wind; the arena beyond that will test your craft. When the Sentinel falls, the Pryan gate will open. And should you find the Tide Gate... Chelestra remembers you too."',
          };
        }
        if (entity.data === 'corridor_lore') {
          return { ...prev, dialog: 'Realm Scholar: "These corridors teach cover, height, and line of sight. Notice the wind lanes — the Wind Walkers rode them before the Sundering, and Arianus gravity is still unpredictable here. The Tide Gate to the north descends to Chelestra — the sea realm. Down there, light is law: your vision will shrink to what the lumen coral touches. The Naga corruption spreads through the deep trenches, so stay near the glow. Find Lumenhollow; the Elder owes the drift a debt."' };
        }
        if (entity.data === 'elder_quest') {
          if (!objectives.includes('speak_to_elder')) objectives.push('speak_to_elder');
          if (objectives.includes('cleanse_chapel') && !objectives.includes('elder_reward')) {
            objectives.push('elder_reward');
            return {
              ...prev,
              clearedObjectives: objectives,
              party: {
                ...prev.party,
                gold: prev.party.gold + 60,
                inventory: [...prev.party.inventory, 'greater_soul_vial'],
              },
              message: 'Elder\'s reward: +60 gold, +1 Greater Soul Vial!',
              dialog: 'Elder Murmansk: "The chapel light burns clean again — I can see it from the causeway. You have given Lumenhollow back its dawn, drifter. Take this, with the tide\'s thanks."',
            };
          }
          if (objectives.includes('elder_reward')) {
            return { ...prev, dialog: 'Elder Murmansk: "The tide keeps your name now, drifter. If the deep calls again, Lumenhollow answers with you."' };
          }
          return {
            ...prev,
            clearedObjectives: objectives,
            dialog: 'Elder Murmansk: "A surfacer... and a drifter, by your light. Listen: across the moat stands our Drowned Chapel. Its warden was barnacled into his armor the night the sea took us — he guards a light that should have died, and his madness shades the whole town. Cleanse that chapel and Lumenhollow will pay its debt: 60 gold and a vial of the bright stuff. The Tide Market and the Salty Drift stand ready if you need supplies."',
          };
        }
        if (entity.data === 'shop_tide') {
          return { ...prev, shop: 'tide_market', dialog: null, message: 'Browsing the Tide Market...' };
        }
        if (entity.data === 'inn_rest') {
          if (prev.party.gold < 10) {
            return { ...prev, dialog: 'Innkeeper: "Ten gold for a dry bunk and a warm eel stew, friend. Come back when your purse is heavier."' };
          }
          const members = prev.party.members.map(m => ({
            ...m, hp: m.maxHp, mp: m.maxMp,
            conditions: m.conditions.filter(c => !['burning', 'rooted', 'stunned', 'staggered', 'marked'].includes(c)),
          }));
          return {
            ...prev,
            party: { ...prev.party, members, gold: prev.party.gold - 10 },
            message: 'You rest at the Salty Drift. Fully restored! (-10 gold)',
            dialog: 'Innkeeper: "There you go — dry bunk, warm stew, and the tide singing you to sleep. You look ten fathoms lighter."',
          };
        }
        if (entity.data === 'priestess_lore') {
          return { ...prev, dialog: 'Tide Priestess: "Chelestra\'s law is light and vision, drifter. Down here, what you cannot see is as real as what you can — the riptide lanes in the trench will drag you west without asking. The lumen coral is our covenant: tend the light, and the light tends you. The warden across the moat forgot that covenant. Remind him."' };
        }
      }

      if (entity.type === 'item') {
        if (entity.data === 'gold_cache_trench') {
          if (prev.clearedObjectives.includes('claim_the_cache')) {
            return { ...prev, message: 'The strongbox is empty — only silt remains.' };
          }
          const objectives = [...prev.clearedObjectives, 'claim_the_cache'];
          const next: SoulDriftState = {
            ...prev,
            party: { ...prev.party, gold: prev.party.gold + 45 },
            clearedObjectives: objectives,
            message: 'You pry open the Sunken Strongbox: +45 gold!',
            dialog: 'Barnacles flake away as the strongbox opens. Inside: coin from a world that no longer exists — and it spends just fine in this one.',
          };
          saveGame(next);
          return next;
        }
      }

      if (entity.type === 'soul_essence') {
        if (prev.party.soulEssences.includes(entity.data || entity.id)) {
          return { ...prev, message: 'Only residue remains here.' };
        }
        const essences = [...prev.party.soulEssences, entity.data || entity.id];
        const objectives = [...prev.clearedObjectives];
        if (entity.data === 'first_essence' && !objectives.includes('collect_essence')) objectives.push('collect_essence');
        if (entity.data === 'trial_essence' && !objectives.includes('collect_trial_essence')) objectives.push('collect_trial_essence');
        if (entity.data === 'ember_essence' && !objectives.includes('collect_ember_essence')) objectives.push('collect_ember_essence');
        if (entity.data === 'tide_essence' && !objectives.includes('collect_tide_essence')) objectives.push('collect_tide_essence');
        if (!objectives.includes('awaken')) objectives.push('awaken');
        const { members, levelUps } = grantXp(prev.party.members, 25);
        const next: SoulDriftState = {
          ...prev,
          party: { ...prev.party, members, soulEssences: essences },
          clearedObjectives: objectives,
          message: `Recovered ${entity.name}! (+25 XP)`,
          dialog: `You touch the ${entity.name}. Memories surface — fragments of who you were before the collision.${levelUps.length ? ' ' + levelUps.join(' ') : ''}`,
        };
        saveGame(next);
        return next;
      }

      if (entity.type === 'memory') {
        if (prev.party.memories.includes(entity.data || entity.id)) {
          return { ...prev, message: 'This memory has already rejoined you.' };
        }
        const memories = [...prev.party.memories, entity.data || entity.id];
        const objectives = [...prev.clearedObjectives];
        if (entity.data === 'first_memory' && !objectives.includes('find_memory')) objectives.push('find_memory');
        if (entity.data === 'sunken_memory' && !objectives.includes('find_sunken_memory')) objectives.push('find_sunken_memory');
        const memoryDialogs: Record<string, string> = {
          pryan_memory: 'A memory surfaces: you stood on a obsidian shore while a sun burned upside-down in the sky. Pryan\'s heat is not weather — it is law. The golem below was once a keeper of that law.',
          sunken_memory: 'A memory surfaces: you are sinking through green light, and you are not afraid. A town of coral towers rises to meet you — whole, lit, alive. Lumenhollow before the collision. Someone below is still keeping its lamps lit.',
          chapel_memory: 'A memory surfaces: a choir singing as water pours through the doors — and the song does not stop. It changes key. The warden at the altar raises his hammer to the light one last time, and holds that pose for a hundred years.',
        };
        const next: SoulDriftState = {
          ...prev,
          party: { ...prev.party, memories },
          clearedObjectives: objectives,
          message: 'Recovered a memory fragment!',
          dialog: memoryDialogs[entity.data || '']
            || 'A memory surfaces: two worlds colliding, not destroying each other, but merging badly. You were there.',
        };
        saveGame(next);
        return next;
      }

      return prev;
    });
  }, [saveGame]);

  // ---------------- SHOP ----------------

  const openShop = useCallback((shopId: string) => {
    setState(prev => ({ ...prev, shop: shopId }));
  }, []);

  const closeShop = useCallback(() => {
    setState(prev => ({ ...prev, shop: null }));
  }, []);

  const buyItem = useCallback((itemId: string, price: number) => {
    setState(prev => {
      const item = ITEMS[itemId];
      if (!item) return prev;
      if (prev.party.gold < price) {
        return { ...prev, message: `Not enough gold for ${item.name} (${price}g).` };
      }
      const next: SoulDriftState = {
        ...prev,
        party: {
          ...prev.party,
          gold: prev.party.gold - price,
          inventory: [...prev.party.inventory, itemId],
        },
        message: `Bought ${item.name} for ${price} gold.`,
      };
      saveGame(next);
      return next;
    });
  }, [saveGame]);

  // ---------------- SETTINGS / META ----------------

  const setReactionMode = useCallback((mode: ReactionMode) => {
    setState(prev => ({ ...prev, reactionMode: mode }));
  }, []);

  const setAnimationSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, animationSpeed: speed }));
  }, []);

  const saveNow = useCallback(() => {
    setState(prev => {
      saveGame(prev);
      return { ...prev, message: 'Progress saved to the drift.' };
    });
  }, [saveGame]);

  const returnToTitle = useCallback(() => {
    setState(prev => {
      if (prev.party.members.length > 0 && prev.screen === 'game') saveGame(prev);
      return { ...defaultState() };
    });
  }, [saveGame]);

  return (
    <GameContext.Provider value={{
      state, hasSave, getProfiles, startGame, continueGame, loadProfile, deleteProfile, enterMap, moveUnit,
      selectUnit, hoverTile, engageEnemy, combatMove, selectAbility, combatTarget,
      endTurn, retreat, resolveReaction, closeCombatResult, respawn, useItem,
      setMessage, setDialog, interactWithEntity, openShop, closeShop, buyItem,
      setReactionMode, setAnimationSpeed,
      saveNow, returnToTitle,
    }}>
      {children}
    </GameContext.Provider>
  );
}
