import { useState, useCallback } from 'react';
import type { Character, CombatState, GameState, MetaProgression } from '../types/game';
import { RUNES, ENEMIES, WORLDS, ITEMS } from '../data/gameData';

const STARTING_RUNES = ['rune_wind', 'rune_flame', 'rune_stone', 'rune_water'];

function createCharacter(meta: MetaProgression): Character {
  const startingRunes = STARTING_RUNES.map(id => RUNES.find(r => r.id === id)!).slice(0, 2 + meta.upgrades.runeSlots);
  return {
    id: 'char_haplo',
    name: 'Haplo',
    title: 'the Patryn',
    description: 'A Patryn rune-mage who has escaped the Labyrinth.',
    maxHp: 80 + meta.upgrades.startingHp,
    hp: 80 + meta.upgrades.startingHp,
    maxMana: 50 + meta.upgrades.startingMana,
    mana: 50 + meta.upgrades.startingMana,
    attack: 8,
    defense: 4,
    speed: 10,
    level: 1,
    xp: 0,
    xpToNext: 100,
    runeSlots: 2 + meta.upgrades.runeSlots,
    runes: startingRunes,
    equippedRunes: [],
    items: [
      { ...ITEMS.find(i => i.id === 'item_potion')! },
      { ...ITEMS.find(i => i.id === 'item_potion')! },
      { ...ITEMS.find(i => i.id === 'item_mana')! },
    ],
    world: 'world_arianus',
    room: 1,
    gold: 20 + meta.upgrades.startingGold,
    sigils: 0,
  };
}

const defaultMeta: MetaProgression = {
  totalRuns: 0,
  totalWins: 0,
  sigils: 0,
  upgrades: {
    startingHp: 0,
    startingMana: 0,
    startingGold: 0,
    xpBonus: 0,
    runeSlots: 0,
  },
};

const initialCombat: CombatState = {
  inCombat: false,
  enemy: null,
  turn: 'player',
  combatLog: [],
  playerShield: 0,
  enemyShield: 0,
  turnCount: 0,
  combatEnded: false,
  result: null,
};

export function useGameState() {
  const [meta, setMeta] = useState<MetaProgression>(() => {
    const saved = localStorage.getItem('deathgate_meta');
    return saved ? JSON.parse(saved) : defaultMeta;
  });

  const [gameState, setGameState] = useState<GameState>({
    screen: 'title',
    character: null,
    worlds: WORLDS.map(w => ({ ...w })),
    combat: { ...initialCombat },
    meta,
    message: '',
  });

  const saveMeta = useCallback((newMeta: MetaProgression) => {
    localStorage.setItem('deathgate_meta', JSON.stringify(newMeta));
    setMeta(newMeta);
  }, []);

  const startGame = useCallback(() => {
    const char = createCharacter(meta);
    const worlds = WORLDS.map(w => ({ ...w, unlocked: w.id === 'world_arianus', completed: false }));
    setGameState({
      screen: 'worldmap',
      character: char,
      worlds,
      combat: { ...initialCombat },
      meta,
      message: 'Welcome to Arianus. Click tiles to explore. Walk into enemies to fight.',
    });
  }, [meta]);

  const enterWorld = useCallback((worldId: string) => {
    setGameState(prev => {
      if (!prev.character) return prev;
      return {
        ...prev,
        screen: 'worldmap',
        character: { ...prev.character, world: worldId, room: 1 },
        combat: { ...initialCombat },
        message: `Arrived in ${WORLDS.find(w => w.id === worldId)?.name}.`,
      };
    });
  }, []);

  const startEnemyCombat = useCallback((enemyId: string) => {
    const template = ENEMIES.find(e => e.id === enemyId);
    if (!template) return;
    const enemy = { ...template, hp: template.maxHp };
    setGameState(prev => ({
      ...prev,
      screen: 'combat',
      combat: {
        inCombat: true,
        enemy,
        turn: 'player',
        combatLog: enemy.isBoss
          ? [`BOSS FIGHT: ${enemy.name} ${enemy.title}!`, enemy.description]
          : [`A ${enemy.name} blocks your path!`],
        playerShield: 0,
        enemyShield: 0,
        turnCount: 0,
        combatEnded: false,
        result: null,
      },
    }));
  }, []);

  const useRune = useCallback((runeId: string) => {
    setGameState(prev => {
      if (!prev.character || !prev.combat.enemy || prev.combat.combatEnded) return prev;
      const rune = prev.character.runes.find(r => r.id === runeId);
      if (!rune || prev.character.mana < rune.manaCost) return prev;

      const char = { ...prev.character, mana: prev.character.mana - rune.manaCost };
      const enemy = { ...prev.combat.enemy };
      let playerShield = prev.combat.playerShield;
      let enemyShield = prev.combat.enemyShield;
      let charHp = char.hp;
      let enemyHp = enemy.hp;
      const logs = [...prev.combat.combatLog];

      switch (rune.effect) {
        case 'damage': {
          let dmg = rune.power + char.attack - enemy.defense;
          if (dmg < 1) dmg = 1;
          if (enemyShield > 0) {
            const shieldDmg = Math.min(enemyShield, dmg);
            enemyShield -= shieldDmg;
            dmg -= shieldDmg;
          }
          enemyHp = Math.max(0, enemyHp - dmg);
          logs.push(`You cast ${rune.name} for ${dmg} damage!`);
          break;
        }
        case 'heal': {
          const heal = rune.power + Math.floor(char.level * 2);
          charHp = Math.min(char.maxHp, charHp + heal);
          logs.push(`You cast ${rune.name} and heal ${heal} HP!`);
          break;
        }
        case 'shield': {
          playerShield += rune.power;
          logs.push(`You cast ${rune.name} and gain ${rune.power} shield!`);
          break;
        }
        case 'buff': {
          char.speed += rune.power;
          logs.push(`You cast ${rune.name} and gain +${rune.power} speed!`);
          break;
        }
        case 'drain': {
          let dmg = rune.power + char.attack - enemy.defense;
          if (dmg < 1) dmg = 1;
          if (enemyShield > 0) {
            const shieldDmg = Math.min(enemyShield, dmg);
            enemyShield -= shieldDmg;
            dmg -= shieldDmg;
          }
          enemyHp = Math.max(0, enemyHp - dmg);
          const drain = Math.floor(dmg * 0.5);
          charHp = Math.min(char.maxHp, charHp + drain);
          logs.push(`You cast ${rune.name} for ${dmg} damage and drain ${drain} HP!`);
          break;
        }
      }

      const newChar = { ...char, hp: charHp };
      const newEnemy = { ...enemy, hp: enemyHp };

      if (enemyHp <= 0) {
        const xpGained = enemy.xpReward + Math.floor(meta.upgrades.xpBonus * enemy.xpReward / 100);
        const goldGained = enemy.goldReward;
        let updatedChar = { ...newChar, xp: newChar.xp + xpGained, gold: newChar.gold + goldGained };
        let levelUpMsg = '';
        while (updatedChar.xp >= updatedChar.xpToNext) {
          updatedChar.xp -= updatedChar.xpToNext;
          updatedChar.level += 1;
          updatedChar.xpToNext = Math.floor(updatedChar.xpToNext * 1.3);
          updatedChar.maxHp += 10;
          updatedChar.hp = updatedChar.maxHp;
          updatedChar.maxMana += 5;
          updatedChar.mana = updatedChar.maxMana;
          updatedChar.attack += 2;
          updatedChar.defense += 1;
          levelUpMsg += ` Level up! You are now level ${updatedChar.level}!`;
        }
        logs.push(`Victory! Gained ${xpGained} XP and ${goldGained} gold.${levelUpMsg}`);

        const foundRune = RUNES[Math.floor(Math.random() * RUNES.length)];
        if (updatedChar.runes.length < updatedChar.runeSlots + 4) {
          updatedChar = { ...updatedChar, runes: [...updatedChar.runes, foundRune] };
          logs.push(`Found a ${foundRune.name}!`);
        }

        return {
          ...prev,
          character: updatedChar,
          combat: {
            ...prev.combat,
            enemy: newEnemy,
            combatLog: logs,
            combatEnded: true,
            result: 'win',
          },
        };
      }

      return {
        ...prev,
        character: newChar,
        combat: {
          ...prev.combat,
          enemy: newEnemy,
          turn: 'enemy',
          combatLog: logs,
          playerShield,
          enemyShield,
        },
      };
    });
  }, [meta]);

  const enemyTurn = useCallback(() => {
    setGameState(prev => {
      if (!prev.character || !prev.combat.enemy || prev.combat.combatEnded) return prev;
      const enemy = prev.combat.enemy;
      const char = prev.character;
      let charHp = char.hp;
      let playerShield = prev.combat.playerShield;
      const logs = [...prev.combat.combatLog];

      const ability = enemy.abilities[Math.floor(Math.random() * enemy.abilities.length)];
      
      if (ability.effect === 'heal') {
        const heal = Math.floor(enemy.maxHp * 0.2);
        const newEnemyHp = Math.min(enemy.maxHp, enemy.hp + heal);
        logs.push(`${enemy.name} uses ${ability.name} and heals ${heal} HP!`);
        return {
          ...prev,
          combat: {
            ...prev.combat,
            enemy: { ...enemy, hp: newEnemyHp },
            turn: 'player',
            combatLog: logs,
            turnCount: prev.combat.turnCount + 1,
          },
        };
      }

      let dmg = (ability.damage || enemy.attack) - char.defense;
      if (dmg < 1) dmg = 1;
      if (playerShield > 0) {
        const shieldDmg = Math.min(playerShield, dmg);
        playerShield -= shieldDmg;
        dmg -= shieldDmg;
      }
      charHp = Math.max(0, charHp - dmg);
      logs.push(`${enemy.name} uses ${ability.name} for ${dmg} damage!`);

      if (charHp <= 0) {
        const newMeta = { ...prev.meta, totalRuns: prev.meta.totalRuns + 1 };
        saveMeta(newMeta);
        return {
          ...prev,
          character: { ...char, hp: 0 },
          combat: {
            ...prev.combat,
            combatLog: [...logs, 'You have fallen...'],
            combatEnded: true,
            result: 'lose',
          },
          meta: newMeta,
        };
      }

      const newMana = Math.min(char.maxMana, char.mana + 3);
      return {
        ...prev,
        character: { ...char, hp: charHp, mana: newMana },
        combat: {
          ...prev.combat,
          turn: 'player',
          combatLog: logs,
          playerShield,
          turnCount: prev.combat.turnCount + 1,
        },
      };
    });
  }, [saveMeta]);

  const returnToWorld = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      screen: 'worldmap',
      combat: { ...initialCombat },
    }));
  }, []);

  const flee = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      screen: 'worldmap',
      combat: { ...initialCombat },
      message: 'You fled.',
    }));
  }, []);

  const useItem = useCallback((itemIndex: number) => {
    setGameState(prev => {
      if (!prev.character || prev.combat.combatEnded) return prev;
      const item = prev.character.items[itemIndex];
      if (!item || !item.consumableEffect) return prev;
      const char = { ...prev.character };
      const logs = [...prev.combat.combatLog];
      
      switch (item.consumableEffect.type) {
        case 'heal':
          char.hp = Math.min(char.maxHp, char.hp + item.consumableEffect.value);
          logs.push(`You use ${item.name} and recover ${item.consumableEffect.value} HP!`);
          break;
        case 'mana':
          char.mana = Math.min(char.maxMana, char.mana + item.consumableEffect.value);
          logs.push(`You use ${item.name} and recover ${item.consumableEffect.value} Mana!`);
          break;
      }

      const newItems = [...char.items];
      newItems.splice(itemIndex, 1);
      char.items = newItems;

      return {
        ...prev,
        character: char,
        combat: { ...prev.combat, combatLog: logs },
      };
    });
  }, []);

  const completeWorld = useCallback((worldId: string) => {
    setGameState(prev => {
      const worlds = prev.worlds.map(w => {
        if (w.id === worldId) return { ...w, completed: true };
        const worldOrder = ['world_arianus', 'world_pryan', 'world_abarrach', 'world_chelestra', 'world_labyrinth'];
        const idx = worldOrder.indexOf(worldId);
        if (idx >= 0 && idx < worldOrder.length - 1 && w.id === worldOrder[idx + 1]) {
          return { ...w, unlocked: true };
        }
        return w;
      });

      const sigilsEarned = worldId === 'world_labyrinth' ? 10 : 5;
      const newMeta = { ...prev.meta, sigils: prev.meta.sigils + sigilsEarned, totalWins: worldId === 'world_labyrinth' ? prev.meta.totalWins + 1 : prev.meta.totalWins };
      saveMeta(newMeta);

      if (worldId === 'world_labyrinth') {
        return { ...prev, screen: 'victory', worlds, meta: newMeta, message: 'Victory!' };
      }
      return { ...prev, screen: 'worldmap', worlds, meta: newMeta, message: 'World conquered!' };
    });
  }, [saveMeta]);

  const gameOver = useCallback(() => {
    setGameState(prev => {
      const newMeta = { ...prev.meta, totalRuns: prev.meta.totalRuns + 1 };
      saveMeta(newMeta);
      return { ...prev, screen: 'gameover', meta: newMeta, message: 'You have fallen.' };
    });
  }, [saveMeta]);

  const upgradeMeta = useCallback((upgrade: keyof MetaProgression['upgrades']) => {
    setMeta(prev => {
      const cost = (prev.upgrades[upgrade] + 1) * 5;
      if (prev.sigils < cost) return prev;
      const newMeta = { ...prev, sigils: prev.sigils - cost, upgrades: { ...prev.upgrades, [upgrade]: prev.upgrades[upgrade] + 1 } };
      localStorage.setItem('deathgate_meta', JSON.stringify(newMeta));
      return newMeta;
    });
  }, []);

  const resetMeta = useCallback(() => {
    saveMeta(defaultMeta);
    setGameState(prev => ({ ...prev, meta: defaultMeta }));
  }, [saveMeta]);

  const setScreen = useCallback((screen: GameState['screen']) => {
    setGameState(prev => ({ ...prev, screen }));
  }, []);

  return {
    gameState,
    meta,
    startGame,
    enterWorld,
    startEnemyCombat,
    useRune,
    enemyTurn,
    returnToWorld,
    flee,
    useItem,
    completeWorld,
    gameOver,
    upgradeMeta,
    resetMeta,
    setScreen,
  };
}
