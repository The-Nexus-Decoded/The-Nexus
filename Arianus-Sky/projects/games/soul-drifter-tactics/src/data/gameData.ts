import type { Rune, Item, Enemy, World } from '../types/game';

export const RUNES: Rune[] = [
  // Air runes (Arianus)
  { id: 'rune_wind', name: 'Wind Rune', symbol: '☁', description: 'A gust of cutting wind', effect: 'damage', power: 12, manaCost: 8, element: 'air', tier: 1 },
  { id: 'rune_storm', name: 'Storm Rune', symbol: '⚡', description: 'Lightning strikes your foe', effect: 'damage', power: 28, manaCost: 18, element: 'air', tier: 2 },
  { id: 'rune_tempest', name: 'Tempest Rune', symbol: '🌪', description: 'A raging tempest', effect: 'damage', power: 50, manaCost: 35, element: 'air', tier: 3 },
  { id: 'rune_gale', name: 'Gale Rune', symbol: '💨', description: 'Swift winds boost your speed', effect: 'buff', power: 5, manaCost: 10, element: 'air', tier: 1 },

  // Fire runes (Pryan)
  { id: 'rune_flame', name: 'Flame Rune', symbol: '🔥', description: 'A burst of fire', effect: 'damage', power: 15, manaCost: 10, element: 'fire', tier: 1 },
  { id: 'rune_inferno', name: 'Inferno Rune', symbol: '🔥', description: 'Consuming flames', effect: 'damage', power: 32, manaCost: 22, element: 'fire', tier: 2 },
  { id: 'rune_phoenix', name: 'Phoenix Rune', symbol: '🐦', description: 'Rebirth in flame - heals and damages', effect: 'heal', power: 20, manaCost: 25, element: 'fire', tier: 2 },
  { id: 'rune_sun', name: 'Sun Rune', symbol: '☀', description: 'The heat of a thousand suns', effect: 'damage', power: 55, manaCost: 40, element: 'fire', tier: 3 },

  // Stone runes (Abarrach)
  { id: 'rune_stone', name: 'Stone Rune', symbol: '🪨', description: 'Hardened earth strikes', effect: 'damage', power: 14, manaCost: 9, element: 'stone', tier: 1 },
  { id: 'rune_crystal', name: 'Crystal Rune', symbol: '💎', description: 'Sharp crystal shards', effect: 'damage', power: 26, manaCost: 17, element: 'stone', tier: 2 },
  { id: 'rune_shield', name: 'Shield Rune', symbol: '🛡', description: 'A wall of stone protects you', effect: 'shield', power: 20, manaCost: 12, element: 'stone', tier: 1 },
  { id: 'rune_diamond', name: 'Diamond Rune', symbol: '💠', description: 'Unbreakable defense', effect: 'shield', power: 45, manaCost: 28, element: 'stone', tier: 3 },

  // Water runes (Chelestra)
  { id: 'rune_water', name: 'Water Rune', symbol: '💧', description: 'A surging torrent', effect: 'damage', power: 11, manaCost: 7, element: 'water', tier: 1 },
  { id: 'rune_tide', name: 'Tide Rune', symbol: '🌊', description: 'Crushing waves', effect: 'damage', power: 24, manaCost: 16, element: 'water', tier: 2 },
  { id: 'rune_heal', name: 'Heal Rune', symbol: '💚', description: 'Soothing waters restore health', effect: 'heal', power: 25, manaCost: 15, element: 'water', tier: 1 },
  { id: 'rune_renew', name: 'Renew Rune', symbol: '✨', description: 'Purifying waters heal greatly', effect: 'heal', power: 50, manaCost: 30, element: 'water', tier: 3 },
  { id: 'rune_drain', name: 'Drain Rune', symbol: '🩸', description: 'Drain life from your enemy', effect: 'drain', power: 18, manaCost: 14, element: 'water', tier: 2 },

  // Labyrinth runes
  { id: 'rune_void', name: 'Void Rune', symbol: '🌑', description: 'The emptiness between worlds', effect: 'damage', power: 20, manaCost: 15, element: 'labyrinth', tier: 2 },
  { id: 'rune_chaos', name: 'Chaos Rune', symbol: '☠', description: 'Unpredictable destructive force', effect: 'damage', power: 40, manaCost: 25, element: 'labyrinth', tier: 3 },
  { id: 'rune_gate', name: 'Gate Rune', symbol: '🌀', description: 'Open a portal to strike', effect: 'damage', power: 35, manaCost: 22, element: 'labyrinth', tier: 2 },
];

export const ITEMS: Item[] = [
  { id: 'item_potion', name: 'Healing Potion', description: 'Restores 30 HP', type: 'consumable', effect: null, consumableEffect: { type: 'heal', value: 30 } },
  { id: 'item_mana', name: 'Mana Vial', description: 'Restores 20 Mana', type: 'consumable', effect: null, consumableEffect: { type: 'mana', value: 20 } },
  { id: 'item_elixir', name: 'Elixir', description: 'Restores 50 HP and 30 Mana', type: 'consumable', effect: null, consumableEffect: { type: 'heal', value: 50 } },
  { id: 'item_dagger', name: 'Bone Dagger', description: '+3 Attack', type: 'weapon', effect: { stat: 'attack', value: 3 } },
  { id: 'item_sword', name: 'Rune Sword', description: '+6 Attack', type: 'weapon', effect: { stat: 'attack', value: 6 } },
  { id: 'item_staff', name: 'World Staff', description: '+4 Attack, +10 Mana', type: 'weapon', effect: { stat: 'attack', value: 4 } },
  { id: 'item_leather', name: 'Leather Armor', description: '+2 Defense', type: 'armor', effect: { stat: 'defense', value: 2 } },
  { id: 'item_chain', name: 'Chain Mail', description: '+5 Defense', type: 'armor', effect: { stat: 'defense', value: 5 } },
  { id: 'item_plate', name: 'Rune Plate', description: '+8 Defense, +10 HP', type: 'armor', effect: { stat: 'defense', value: 8 } },
  { id: 'item_sigil', name: 'Sigil Shard', description: 'A fragment of ancient power', type: 'relic', effect: null },
  { id: 'item_key_air', name: 'Key of Air', description: 'Unlocks the path to Arianus', type: 'key', effect: null },
  { id: 'item_key_fire', name: 'Key of Fire', description: 'Unlocks the path to Pryan', type: 'key', effect: null },
  { id: 'item_key_stone', name: 'Key of Stone', description: 'Unlocks the path to Abarrach', type: 'key', effect: null },
  { id: 'item_key_water', name: 'Key of Water', description: 'Unlocks the path to Chelestra', type: 'key', effect: null },
  { id: 'item_key_labyrinth', name: 'Key of the Labyrinth', description: 'Unlocks the final path', type: 'key', effect: null },
];

export const ENEMIES: Enemy[] = [
  // Arianus enemies
  { id: 'enemy_wisp', name: 'Air Wisp', title: 'the Wandering', hp: 25, maxHp: 25, attack: 6, defense: 2, speed: 8, xpReward: 15, goldReward: 5, element: 'air', isBoss: false, description: 'A fragment of living air', abilities: [{ name: 'Gust', description: 'A weak gust of wind', damage: 6, cooldown: 1 }] },
  { id: 'enemy_harpy', name: 'Harpy', title: 'the Sky Hunter', hp: 40, maxHp: 40, attack: 10, defense: 4, speed: 12, xpReward: 25, goldReward: 10, element: 'air', isBoss: false, description: 'A vicious creature of the skies', abilities: [{ name: 'Claw', description: 'Rending claws', damage: 10, cooldown: 1 }, { name: 'Dive', description: 'A swift aerial strike', damage: 15, cooldown: 2 }] },
  { id: 'enemy_vortex', name: 'Storm Vortex', title: 'the Howling', hp: 55, maxHp: 55, attack: 14, defense: 6, speed: 10, xpReward: 40, goldReward: 15, element: 'air', isBoss: false, description: 'A living storm', abilities: [{ name: 'Lightning', description: 'A bolt of lightning', damage: 14, cooldown: 1 }, { name: 'Thunder', description: 'Deafening thunder', damage: 20, cooldown: 2 }] },
  { id: 'boss_ dragon_snake', name: 'Dragon Snake', title: 'Tian-x of Arianus', hp: 150, maxHp: 150, attack: 20, defense: 10, speed: 14, xpReward: 200, goldReward: 100, element: 'air', isBoss: true, description: 'The massive dragon snake that rules the skies of Arianus', abilities: [{ name: 'Bite', description: 'Vicious bite', damage: 20, cooldown: 1 }, { name: 'Wing Storm', description: 'Wings create a devastating storm', damage: 30, cooldown: 2 }, { name: 'Sky Fury', description: 'The fury of the open sky', damage: 45, cooldown: 3 }] },

  // Pryan enemies
  { id: 'enemy_spark', name: 'Fire Spark', title: 'the Burning', hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 6, xpReward: 18, goldReward: 6, element: 'fire', isBoss: false, description: 'A living ember', abilities: [{ name: 'Burn', description: 'A searing flame', damage: 8, cooldown: 1 }] },
  { id: 'enemy_salamander', name: 'Salamander', title: 'the Flame Walker', hp: 45, maxHp: 45, attack: 12, defense: 5, speed: 7, xpReward: 30, goldReward: 12, element: 'fire', isBoss: false, description: 'A creature of living flame', abilities: [{ name: 'Flame Tongue', description: 'Lashing flame', damage: 12, cooldown: 1 }, { name: 'Heat Wave', description: 'Wave of intense heat', damage: 18, cooldown: 2 }] },
  { id: 'enemy_phoenix', name: 'Ash Phoenix', title: 'the Reborn', hp: 60, maxHp: 60, attack: 15, defense: 7, speed: 9, xpReward: 45, goldReward: 18, element: 'fire', isBoss: false, description: 'A phoenix risen from ash', abilities: [{ name: 'Fire Claw', description: 'Burning claws', damage: 15, cooldown: 1 }, { name: 'Rebirth', description: 'Heals itself', damage: 0, effect: 'heal', cooldown: 3 }] },
  { id: 'boss_fire_dragon', name: 'Fire Dragon', title: 'the Pryan Warden', hp: 180, maxHp: 180, attack: 24, defense: 12, speed: 11, xpReward: 250, goldReward: 120, element: 'fire', isBoss: true, description: 'An ancient dragon of Pryan', abilities: [{ name: 'Fire Breath', description: 'Breath of consuming flame', damage: 24, cooldown: 1 }, { name: 'Inferno', description: 'A raging inferno', damage: 40, cooldown: 2 }, { name: 'Magma Burst', description: 'Explosion of molten rock', damage: 55, cooldown: 3 }] },

  // Abarrach enemies
  { id: 'enemy_earth', name: 'Earth Spirit', title: 'the Grounded', hp: 35, maxHp: 35, attack: 7, defense: 6, speed: 3, xpReward: 20, goldReward: 7, element: 'stone', isBoss: false, description: 'A spirit of the stone', abilities: [{ name: 'Rock Throw', description: 'Hurls a rock', damage: 7, cooldown: 1 }] },
  { id: 'enemy_golem', name: 'Stone Golem', title: 'the Unmoving', hp: 60, maxHp: 60, attack: 14, defense: 12, speed: 2, xpReward: 35, goldReward: 14, element: 'stone', isBoss: false, description: 'A construct of animated stone', abilities: [{ name: 'Smash', description: 'A heavy blow', damage: 14, cooldown: 1 }, { name: 'Quake', description: 'The earth shakes', damage: 20, cooldown: 2 }] },
  { id: 'enemy_lich', name: 'Sartan Lich', title: 'the Undying', hp: 50, maxHp: 50, attack: 16, defense: 8, speed: 5, xpReward: 50, goldReward: 20, element: 'stone', isBoss: false, description: 'A dead Sartan risen by necromancy', abilities: [{ name: 'Death Touch', description: 'Drains life force', damage: 16, cooldown: 1 }, { name: 'Raise Dead', description: 'Summons minions', damage: 0, effect: 'summon', cooldown: 3 }] },
  { id: 'boss_kleitus', name: 'Kleitus', title: 'the Necromancer King', hp: 200, maxHp: 200, attack: 22, defense: 15, speed: 8, xpReward: 300, goldReward: 150, element: 'stone', isBoss: true, description: 'The mad Sartan king of Abarrach', abilities: [{ name: 'Necrotic Bolt', description: 'Bolt of death magic', damage: 22, cooldown: 1 }, { name: 'Army of Dead', description: 'Summons the fallen', damage: 35, cooldown: 2 }, { name: 'Death Wave', description: 'Wave of pure death', damage: 50, cooldown: 3 }] },

  // Chelestra enemies
  { id: 'enemy_merfolk', name: 'Merfolk', title: 'the Deep Dweller', hp: 32, maxHp: 32, attack: 9, defense: 4, speed: 7, xpReward: 22, goldReward: 8, element: 'water', isBoss: false, description: 'An aquatic being', abilities: [{ name: 'Trident', description: 'A thrust with a trident', damage: 9, cooldown: 1 }] },
  { id: 'enemy_leviathan', name: 'Leviathan Spawn', title: 'the Deep Hunger', hp: 70, maxHp: 70, attack: 16, defense: 10, speed: 4, xpReward: 45, goldReward: 20, element: 'water', isBoss: false, description: 'A spawn of the deep leviathan', abilities: [{ name: 'Bite', description: 'Massive jaws close', damage: 16, cooldown: 1 }, { name: 'Tidal Pull', description: 'Drags you under', damage: 25, cooldown: 2 }] },
  { id: 'enemy_sartan', name: 'Sartan Mage', title: 'the Seal Bearer', hp: 45, maxHp: 45, attack: 18, defense: 6, speed: 8, xpReward: 55, goldReward: 25, element: 'water', isBoss: false, description: 'A Sartan guarding the seal', abilities: [{ name: 'Rune Strike', description: 'Rune-powered attack', damage: 18, cooldown: 1 }, { name: 'Water Prison', description: 'Traps you in water', damage: 28, cooldown: 2 }] },
  { id: 'boss_samah', name: 'Samah', title: 'the Head Sartan', hp: 220, maxHp: 220, attack: 26, defense: 14, speed: 10, xpReward: 350, goldReward: 180, element: 'water', isBoss: true, description: 'The leader of the Sartan council', abilities: [{ name: 'Rune Fury', description: 'A flurry of rune strikes', damage: 26, cooldown: 1 }, { name: 'Seal Magic', description: 'Ancient sealing magic', damage: 42, cooldown: 2 }, { name: 'World Gate', description: 'Opens a gate to crush you', damage: 60, cooldown: 3 }] },

  // Labyrinth enemies
  { id: 'enemy_lazar', name: 'Lazar', title: 'the Living Dead', hp: 50, maxHp: 50, attack: 15, defense: 5, speed: 3, xpReward: 30, goldReward: 10, element: 'labyrinth', isBoss: false, description: 'A reanimated corpse, neither living nor dead', abilities: [{ name: 'Grasp', description: 'Cold dead hands grasp', damage: 15, cooldown: 1 }, { name: 'Drain Life', description: 'Drains your vitality', damage: 20, cooldown: 2 }] },
  { id: 'enemy_chaos', name: 'Chaos Beast', title: 'the Formless', hp: 80, maxHp: 80, attack: 20, defense: 8, speed: 12, xpReward: 60, goldReward: 30, element: 'labyrinth', isBoss: false, description: 'A creature of pure chaos', abilities: [{ name: 'Chaos Claw', description: 'Shifting claws strike', damage: 20, cooldown: 1 }, { name: 'Reality Tear', description: 'Tears at reality itself', damage: 35, cooldown: 2 }] },
  { id: 'enemy_patryn', name: 'Mad Patryn', title: 'the Lost', hp: 65, maxHp: 65, attack: 18, defense: 10, speed: 10, xpReward: 50, goldReward: 25, element: 'labyrinth', isBoss: false, description: 'A Patryn driven mad by the Labyrinth', abilities: [{ name: 'Rune Blade', description: 'Rune-etched blade strikes', damage: 18, cooldown: 1 }, { name: 'Despair', description: 'Wave of hopelessness', damage: 28, cooldown: 2 }] },
  { id: 'boss_lord_xar', name: 'Lord Xar', title: 'the Lord of the Nexus', hp: 300, maxHp: 300, attack: 30, defense: 20, speed: 15, xpReward: 500, goldReward: 300, element: 'labyrinth', isBoss: true, description: 'The powerful Patryn lord seeking dominion over all worlds', abilities: [{ name: 'Rune Storm', description: 'A storm of rune magic', damage: 30, cooldown: 1 }, { name: 'Gate Slam', description: 'Slams a death gate on you', damage: 50, cooldown: 2 }, { name: 'World Breaker', description: 'Attempts to shatter your essence', damage: 75, cooldown: 3 }, { name: 'Nexus Power', description: 'Draws power from the Nexus', damage: 40, effect: 'heal', cooldown: 3 }] },
];

export const WORLDS: World[] = [
  {
    id: 'world_arianus',
    name: 'Arianus',
    subtitle: 'World of Air',
    description: 'A world of floating islands and endless skies, where the winged people live on continents suspended in the air. The great machine below pumps the water of life.',
    element: 'air',
    color: '#87CEEB',
    rooms: 5,
    enemies: ['enemy_wisp', 'enemy_harpy', 'enemy_vortex'],
    bossId: 'boss_dragon_snake',
    unlocked: true,
    completed: false,
  },
  {
    id: 'world_pryan',
    subtitle: 'World of Fire',
    name: 'Pryan',
    description: 'A world of perpetual sunlight, a hollow sphere with its sun at the center. The elven people dwell in the lush forests, and great cities fill the interior.',
    element: 'fire',
    color: '#FF6B35',
    rooms: 5,
    enemies: ['enemy_spark', 'enemy_salamander', 'enemy_phoenix'],
    bossId: 'boss_fire_dragon',
    unlocked: false,
    completed: false,
  },
  {
    id: 'world_abarrach',
    subtitle: 'World of Stone',
    name: 'Abarrach',
    description: 'A dying world of volcanic stone and poisonous air. The Sartan here turned to necromancy to survive, raising the dead to serve the living.',
    element: 'stone',
    color: '#8B7355',
    rooms: 5,
    enemies: ['enemy_earth', 'enemy_golem', 'enemy_lich'],
    bossId: 'boss_kleitus',
    unlocked: false,
    completed: false,
  },
  {
    id: 'world_chelestra',
    subtitle: 'World of Water',
    name: 'Chelestra',
    description: 'A world of water where the Sartan placed themselves in suspended animation. The sea is alive, and strange beings dwell in its depths.',
    element: 'water',
    color: '#4682B4',
    rooms: 5,
    enemies: ['enemy_merfolk', 'enemy_leviathan', 'enemy_sartan'],
    bossId: 'boss_samah',
    unlocked: false,
    completed: false,
  },
  {
    id: 'world_labyrinth',
    subtitle: 'The Prison',
    name: 'The Labyrinth',
    description: 'The shifting, deadly prison-world created by the Sartan to contain the Patryn. Only the strongest survive its ever-changing corridors and monstrous guardians.',
    element: 'labyrinth',
    color: '#4B0082',
    rooms: 7,
    enemies: ['enemy_lazar', 'enemy_chaos', 'enemy_patryn'],
    bossId: 'boss_lord_xar',
    unlocked: false,
    completed: false,
  },
];
