export const STAT_KEYS = ["might", "finesse", "insight", "will", "vitality", "resonance"] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;
export type RaceId = "human" | "elf" | "dwarf" | "halfling";
export type CallingId = "warrior" | "mage" | "priest" | "sharpshooter" | "paladin" | "summoner" | "asura" | "slayer" | "shadowknight";
export type RaceCallingEligibilityStatus = "allowed" | "rare" | "forbidden";

export interface RaceCallingEligibility {
  status: RaceCallingEligibilityStatus;
  reason?: string;
}

export const STAT_LABELS: Record<StatKey, string> = {
  might: "Might",
  finesse: "Finesse",
  insight: "Insight",
  will: "Will",
  vitality: "Vitality",
  resonance: "Resonance",
};

export interface RaceDefinition {
  id: string;
  name: string;
  glyph: string;
  identity: string;
  affinity: string;
  talent: string;
  modifiers: Partial<Stats>;
}

export interface CallingDefinition {
  id: CallingId;
  name: string;
  glyph: string;
  identity: string;
  tacticalJob: string;
  resourceName: string;
  signatureSkill: string;
  defensiveSkill: string;
  signatureRange: number;
  signatureDamage: number;
  signatureColor: number;
  startingArmor: number;
  startingHpModifier: number;
  learningCurve: "Forgiving" | "Moderate" | "Demanding" | "Expert";
  lateGameCeiling: "Steady" | "High" | "Extreme";
  modifiers: Partial<Stats>;
}

export interface RaceCallingBonus {
  raceId: string;
  callingId: CallingId;
  name: string;
  description: string;
  modifiers: Partial<Stats>;
}

export interface MemoryAnswer {
  id: string;
  text: string;
  consequence: string;
  skill: string;
  modifiers: Partial<Stats>;
}

export interface MemoryQuestion {
  id: string;
  prompt: string;
  context: string;
  answers: readonly MemoryAnswer[];
}

export interface CharacterDraft {
  name: string;
  raceId: string;
  callingId: string;
  appearance: CharacterAppearance;
  answers: Record<string, string>;
}

export type HairStyleId = "shaved" | "cropped" | "parted" | "silver-sweep";
export type SkinToneId = "light" | "ashen" | "golden" | "olive" | "umber" | "copper" | "deep";
export type FacialHairId = "none" | "full-beard";
export type BodyTypeId = "foundation";
export type FaceTypeId = "foundation";

export interface CharacterAppearance {
  hairStyle: HairStyleId;
  skinTone: SkinToneId;
  facialHair?: FacialHairId;
  bodyType?: BodyTypeId;
  faceType?: FaceTypeId;
}

export const SKIN_TONES: Readonly<Record<SkinToneId, { name: string; color: number }>> = {
  light: { name: "Light", color: 0xd8aa92 },
  ashen: { name: "Fair", color: 0xa88476 },
  golden: { name: "Golden", color: 0xbb8060 },
  olive: { name: "Olive", color: 0x96705c },
  copper: { name: "Copper", color: 0xb87556 },
  umber: { name: "Brown", color: 0x765044 },
  deep: { name: "Deep", color: 0x4a302a },
};

export const BODY_TYPES: ReadonlyArray<{ id: BodyTypeId; name: string; description: string }> = [
  { id: "foundation", name: "Athletic foundation", description: "The accepted Human pilot body and canonical animation rig." },
];

export const FACE_TYPES: ReadonlyArray<{ id: FaceTypeId; name: string; description: string }> = [
  { id: "foundation", name: "Foundation face", description: "The first modular Human head; additional faces remain a later asset pass." },
];

export const HAIR_STYLES: ReadonlyArray<{ id: HairStyleId; name: string; description: string }> = [
  { id: "shaved", name: "Shaved", description: "Clean head silhouette; no helmet-like hair shell." },
  { id: "cropped", name: "Close-cropped", description: "Short silver crown kept clear of collars and weapons." },
  { id: "parted", name: "Swept back", description: "A swept-back silver style for a soul that remembers discipline." },
  { id: "silver-sweep", name: "Silver sweep", description: "Longer Patryn-blooded sweep for an older soul." },
];

export const FACIAL_HAIR_STYLES: ReadonlyArray<{ id: FacialHairId; name: string; description: string }> = [
  { id: "none", name: "Clean-shaven", description: "The Well returned the face bare." },
  { id: "full-beard", name: "Full beard", description: "A full silver beard earned in an earlier life." },
];

export interface CharacterProfile {
  name: string;
  raceId: string;
  raceName: string;
  raceGlyph: string;
  callingId: CallingId;
  callingName: string;
  appearance: CharacterAppearance;
  appearanceNeedsReview?: boolean;
  stats: Stats;
  skills: string[];
  memoryConsequences: string[];
  maxHp: number;
  maxStability: number;
  movement: number;
  ancestryCallingBonus?: Pick<RaceCallingBonus, "name" | "description">;
  starterImprint?: {
    allocations: Partial<Stats>;
    raceBoonId: string;
    callingPerkId: string;
    raceBoonName: string;
    callingPerkName: string;
  };
  chosenTrial?: "wayfarer" | "oathbreaker";
  onboarding?: {
    ilyraAnswered: boolean;
    storybookCompleted?: boolean;
    storybookPage?: number;
  };
}

export const RACES: readonly RaceDefinition[] = [
  {
    id: "human",
    name: "Human",
    glyph: "◇",
    identity: "Adaptable realm cultures carrying many ways of surviving the Drift.",
    affinity: "Flexible training and faster secondary-profession growth.",
    talent: "Adaptive Training",
    modifiers: {},
  },
  {
    id: "elf",
    name: "Elf",
    glyph: "⌁",
    identity: "Long memory, graceful precision, and continuity across broken worlds.",
    affinity: "Perception, formula precision, and long-memory disciplines.",
    talent: "Long Memory",
    modifiers: { finesse: 1, insight: 2 },
  },
  {
    id: "dwarf",
    name: "Dwarf",
    glyph: "⬙",
    identity: "Forge culture, compact strength, and mastery of stone and conduits.",
    affinity: "Wisdom, priestly devotion, protective oaths, and resistance to forced movement.",
    talent: "Stone Anchor",
    modifiers: { will: 2, vitality: 1 },
  },
  {
    id: "halfling",
    name: "Halfling",
    glyph: "◒",
    identity: "Improvisation, field courage, and an instinct for overlooked paths.",
    affinity: "Stealth, rescue, consumables, and route discovery.",
    talent: "Hidden Route",
    modifiers: { finesse: 2, will: 1 },
  },
] as const;

export const CALLINGS: readonly CallingDefinition[] = [
  {
    id: "warrior",
    name: "Warrior",
    glyph: "ᚱ",
    identity: "Use disciplined weapon drills, armor, and battlefield pressure to break a hostile line.",
    tacticalJob: "Frontline · stagger · guard break",
    resourceName: "Fury",
    signatureSkill: "Cleaving Strike",
    defensiveSkill: "Anchor Guard",
    signatureRange: 1,
    signatureDamage: 10,
    signatureColor: 0x62e6db,
    startingArmor: 1,
    startingHpModifier: 6,
    learningCurve: "Forgiving",
    lateGameCeiling: "High",
    modifiers: { might: 3, vitality: 2 },
  },
  {
    id: "mage",
    name: "Mage",
    glyph: "✦",
    identity: "Combine disciplined color channels into formulas that reshape the field.",
    tacticalJob: "Color fields · burst · control",
    resourceName: "Channel",
    signatureSkill: "Cinder Bolt",
    defensiveSkill: "Blue Ward",
    signatureRange: 4,
    signatureDamage: 8,
    signatureColor: 0xd86b4f,
    startingArmor: 0,
    startingHpModifier: -4,
    learningCurve: "Demanding",
    lateGameCeiling: "Extreme",
    modifiers: { insight: 3, resonance: 2 },
  },
  {
    id: "priest",
    name: "Priest",
    glyph: "☼",
    identity: "Keep souls coherent through wards, cleansing light, and remembered devotion.",
    tacticalJob: "Heal · ward · cleanse · anti-dark",
    resourceName: "Devotion",
    signatureSkill: "Consecrated Dart",
    defensiveSkill: "Mending Ward",
    signatureRange: 4,
    signatureDamage: 7,
    signatureColor: 0xf1d486,
    startingArmor: 0,
    startingHpModifier: 0,
    learningCurve: "Moderate",
    lateGameCeiling: "High",
    modifiers: { will: 3, resonance: 2 },
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    glyph: "⌖",
    identity: "Read firing lanes, set marks, and command the battlefield from range.",
    tacticalJob: "Ranged focus · traps · companion commands",
    resourceName: "Focus",
    signatureSkill: "Twin Shot",
    defensiveSkill: "Evasive Mark",
    signatureRange: 5,
    signatureDamage: 8,
    signatureColor: 0x9bd887,
    startingArmor: 0,
    startingHpModifier: -1,
    learningCurve: "Demanding",
    lateGameCeiling: "High",
    modifiers: { finesse: 3, insight: 2 },
  },
  {
    id: "paladin",
    name: "Paladin",
    glyph: "⚒",
    identity: "Bind protective oaths to thunderous force and hold a breach for others.",
    tacticalJob: "Tank · stun · oath protection",
    resourceName: "Oath",
    signatureSkill: "Oath Hammer",
    defensiveSkill: "Hold the Breach",
    signatureRange: 2,
    signatureDamage: 9,
    signatureColor: 0x91bfff,
    startingArmor: 2,
    startingHpModifier: 10,
    learningCurve: "Forgiving",
    lateGameCeiling: "Steady",
    modifiers: { vitality: 3, will: 2 },
  },
  {
    id: "summoner",
    name: "Summoner",
    glyph: "◎",
    identity: "Shape temporary lesser allies and hold them together through focused mortal command.",
    tacticalJob: "Minions · binding · battlefield control",
    resourceName: "Command",
    signatureSkill: "Call Lesser Wisp",
    defensiveSkill: "Binding Circle",
    signatureRange: 4,
    signatureDamage: 7,
    signatureColor: 0x68a7de,
    startingArmor: 0,
    startingHpModifier: -3,
    learningCurve: "Demanding",
    lateGameCeiling: "Extreme",
    modifiers: { resonance: 3, insight: 2 },
  },
  {
    id: "asura",
    name: "Asura",
    glyph: "◈",
    identity: "Risk backlash to press hostile memories, curses, and black threads into a foe.",
    tacticalJob: "Mind pressure · curse · dangerous control",
    resourceName: "Instability",
    signatureSkill: "Mind Prick",
    defensiveSkill: "Black Thread",
    signatureRange: 4,
    signatureDamage: 9,
    signatureColor: 0xa881d4,
    startingArmor: 0,
    startingHpModifier: -2,
    learningCurve: "Expert",
    lateGameCeiling: "Extreme",
    modifiers: { resonance: 3, will: 2 },
  },
  {
    id: "slayer",
    name: "Slayer",
    glyph: "⟐",
    identity: "Exploit flanks, poison openings, and end fights before they become wars.",
    tacticalJob: "Stealth · poison · flank · execution",
    resourceName: "Edge",
    signatureSkill: "Backstab",
    defensiveSkill: "Shadowstep",
    signatureRange: 1,
    signatureDamage: 12,
    signatureColor: 0xdc6d55,
    startingArmor: 0,
    startingHpModifier: 0,
    learningCurve: "Demanding",
    lateGameCeiling: "High",
    modifiers: { finesse: 3, might: 2 },
  },
  {
    id: "shadowknight",
    name: "Shadowknight",
    glyph: "♜",
    identity: "An ash-bound lich knight who steals life to keep a Fire-Realm soul-coal burning.",
    tacticalJob: "Drain tank · curse · gravefire pressure",
    resourceName: "Gravefire",
    signatureSkill: "Siphon Cleave",
    defensiveSkill: "Cinder Guard",
    signatureRange: 1,
    signatureDamage: 11,
    signatureColor: 0xe45832,
    startingArmor: 2,
    startingHpModifier: 8,
    learningCurve: "Moderate",
    lateGameCeiling: "High",
    modifiers: { might: 2, vitality: 2, resonance: 1 },
  },
] as const;

const ALLOWED_CALLING: RaceCallingEligibility = Object.freeze({ status: "allowed" });

/**
 * Canonical exceptions to the normally allowed ancestry/calling matrix.
 * Rare paths remain selectable with cultural context; forbidden paths fail closed.
 */
export const RACE_CALLING_RULES: Readonly<Record<RaceId, Readonly<Partial<Record<CallingId, RaceCallingEligibility>>>>> = {
  human: {},
  elf: {
    paladin: { status: "rare", reason: "Elven oath-armored orders exist, but are uncommon beside long-memory and precision traditions." },
    asura: { status: "rare", reason: "Elven long memory can sustain black-thread practice, but makes its psychological cost unusually dangerous." },
    shadowknight: { status: "rare", reason: "An Elven soul can return ash-bound, but the lich-knight path remains an exceptional rupture." },
  },
  dwarf: {
    mage: { status: "forbidden", reason: "Dwarven traditions channel power through faith, craft, and oath rather than the Mage calling." },
    summoner: { status: "rare", reason: "Dwarven binders can shape crafted vessels, but summoning is not a mainstream hold tradition." },
    asura: { status: "rare", reason: "Ancestor and tomb knowledge makes black-thread practice possible, though culturally dangerous." },
    slayer: { status: "rare", reason: "Dwarven execution specialists exist outside the protective forge-and-hold tradition." },
    shadowknight: { status: "forbidden", reason: "Dwarven souls do not bind to the ash-lich Shadowknight path." },
  },
  halfling: {
    mage: { status: "forbidden", reason: "Halfling traditions favor practical and spiritual magic rather than the Mage calling." },
    paladin: { status: "rare", reason: "Halfling courage supports protection, but formal armored oath orders remain uncommon." },
    summoner: { status: "rare", reason: "Clever command fits Halflings, while formal magical binding remains unusual." },
    asura: { status: "rare", reason: "Hostile-memory practice conflicts with Halfling community traditions, but rare outliers exist." },
    shadowknight: { status: "forbidden", reason: "Halfling souls do not bind to the ash-lich Shadowknight path." },
  },
};

export const RACE_CALLING_BONUSES: readonly RaceCallingBonus[] = [
  { raceId: "elf", callingId: "mage", name: "Formula Memory", description: "Long memory preserves exact color-channel relationships.", modifiers: { insight: 1 } },
  { raceId: "elf", callingId: "sharpshooter", name: "Long Sight", description: "Elven perception reads a firing line before it fully forms.", modifiers: { finesse: 1 } },
  { raceId: "elf", callingId: "summoner", name: "True Naming", description: "Ancient memory gives shaped allies a more stable identity.", modifiers: { resonance: 1 } },
  { raceId: "dwarf", callingId: "warrior", name: "Forge Circuit", description: "Dwarven bodies and tools carry physical pressure as one system.", modifiers: { might: 1 } },
  { raceId: "dwarf", callingId: "priest", name: "Ancestor Litany", description: "Dwarven memory gives devotional wards the weight of an unbroken lineage.", modifiers: { will: 1 } },
  { raceId: "dwarf", callingId: "paladin", name: "Stone Oath", description: "A Dwarven promise anchors allies as firmly as worked stone.", modifiers: { will: 1 } },
  { raceId: "halfling", callingId: "sharpshooter", name: "Low Profile", description: "A smaller silhouette opens firing lanes others cannot use.", modifiers: { finesse: 1 } },
  { raceId: "halfling", callingId: "priest", name: "Hearth Mercy", description: "Halfling rescue traditions make protection immediate and practical.", modifiers: { will: 1 } },
  { raceId: "halfling", callingId: "slayer", name: "Hidden Knife", description: "Overlooked angles become precise execution routes.", modifiers: { finesse: 1 } },
] as const;

export const MEMORY_QUESTIONS: readonly MemoryQuestion[] = [
  {
    id: "breach",
    prompt: "When the first breach opened, what did you do?",
    context: "The Well shows three memories. Only one feels like yours.",
    answers: [
      { id: "held", text: "I held the collapsing gate while others escaped.", consequence: "You remember choosing burden over safety.", skill: "Breach Brace", modifiers: { might: 1, vitality: 2 } },
      { id: "mapped", text: "I studied the fracture and marked a path through it.", consequence: "You remember finding law inside chaos.", skill: "Fracture Lore", modifiers: { insight: 2, resonance: 1 } },
      { id: "ran", text: "I crossed the unstable ground to carry a child out.", consequence: "You remember moving before fear could root you.", skill: "Rescue Step", modifiers: { finesse: 2, will: 1 } },
    ],
  },
  {
    id: "sigil",
    prompt: "A forbidden sigil answers your touch. What do you ask of it?",
    context: "Its shape changes before you can decide whether it is tool or trap.",
    answers: [
      { id: "shield", text: "Become a shield for whoever stands behind me.", consequence: "Protection becomes the first grammar you recover.", skill: "Sigil Ward", modifiers: { will: 2, vitality: 1 } },
      { id: "truth", text: "Reveal what the merged worlds are hiding.", consequence: "You accept that knowledge can wound its keeper.", skill: "Echo Sight", modifiers: { insight: 2, resonance: 1 } },
      { id: "weapon", text: "Become an edge sharp enough to cut fate.", consequence: "You remember power as a promise with a price.", skill: "Sigil Edge", modifiers: { might: 2, finesse: 1 } },
    ],
  },
  {
    id: "stranger",
    prompt: "A wounded stranger refuses your help. What follows?",
    context: "The memory has no face, only blood on pale stone.",
    answers: [
      { id: "stay", text: "I stay nearby without taking away their choice.", consequence: "Your patience survives the loss of your name.", skill: "Field Mercy", modifiers: { will: 2, vitality: 1 } },
      { id: "treat", text: "I explain every step, then offer my hand again.", consequence: "Care and precision return together.", skill: "Field Medicine", modifiers: { insight: 1, vitality: 2 } },
      { id: "track", text: "I hunt the thing that wounded them before it returns.", consequence: "You remember the shape of a trail no one else saw.", skill: "Predator Track", modifiers: { finesse: 2, insight: 1 } },
    ],
  },
  {
    id: "identity",
    prompt: "The Soul Well offers to restore your old name completely. Do you accept?",
    context: "Something beneath the water insists that the old you did not survive intact.",
    answers: [
      { id: "restore", text: "Yes. Memory is a debt I will carry.", consequence: "You bind yourself to continuity, however painful.", skill: "Ancestral Recall", modifiers: { insight: 1, will: 2 } },
      { id: "refuse", text: "No. I will decide who returns from this Well.", consequence: "You make identity an act of will.", skill: "Unbroken Self", modifiers: { will: 2, might: 1 } },
      { id: "merge", text: "I take the memories, but not their command over me.", consequence: "You allow two selves to resonate without surrender.", skill: "Dual Resonance", modifiers: { resonance: 2, finesse: 1 } },
    ],
  },
] as const;

function blankStats(): Stats {
  return { might: 6, finesse: 6, insight: 6, will: 6, vitality: 6, resonance: 6 };
}

function applyModifiers(stats: Stats, modifiers: Partial<Stats>): void {
  for (const key of STAT_KEYS) stats[key] += modifiers[key] ?? 0;
}

export function raceById(id: string): RaceDefinition {
  const race = RACES.find((candidate) => candidate.id === id);
  if (!race) throw new Error(`Unknown race: ${id}`);
  return race;
}

export function callingById(id: string): CallingDefinition {
  const calling = CALLINGS.find((candidate) => candidate.id === id);
  if (!calling) throw new Error(`Unknown calling: ${id}`);
  return calling;
}

export function raceCallingBonus(raceId: string, callingId: string): RaceCallingBonus | undefined {
  return RACE_CALLING_BONUSES.find((bonus) => bonus.raceId === raceId && bonus.callingId === callingId);
}

export function raceCallingEligibility(raceId: string, callingId: string): RaceCallingEligibility {
  const race = raceById(raceId);
  const calling = callingById(callingId);
  return RACE_CALLING_RULES[race.id as RaceId][calling.id] ?? ALLOWED_CALLING;
}

export function assertRaceCallingEligibility(raceId: string, callingId: string): RaceCallingEligibility {
  const eligibility = raceCallingEligibility(raceId, callingId);
  if (eligibility.status === "forbidden") {
    const race = raceById(raceId);
    const calling = callingById(callingId);
    throw new Error(`${race.name} cannot become ${calling.name}. ${eligibility.reason ?? "Choose another calling."}`);
  }
  return eligibility;
}

export function deriveCharacter(draft: CharacterDraft): CharacterProfile {
  const name = draft.name.trim();
  if (name.length < 2 || name.length > 24) throw new Error("Choose a name between 2 and 24 characters.");

  const race = raceById(draft.raceId);
  const calling = callingById(draft.callingId);
  assertRaceCallingEligibility(race.id, calling.id);
  const ancestryCallingBonus = raceCallingBonus(race.id, calling.id);
  const stats = blankStats();
  const skills = [race.talent, calling.signatureSkill, calling.defensiveSkill];
  const memoryConsequences: string[] = [];

  applyModifiers(stats, race.modifiers);
  applyModifiers(stats, calling.modifiers);
  if (ancestryCallingBonus) {
    applyModifiers(stats, ancestryCallingBonus.modifiers);
    skills.push(ancestryCallingBonus.name);
  }

  for (const question of MEMORY_QUESTIONS) {
    const answerId = draft.answers[question.id];
    const answer = question.answers.find((candidate) => candidate.id === answerId);
    if (!answer) throw new Error(`Answer the memory: ${question.prompt}`);
    applyModifiers(stats, answer.modifiers);
    skills.push(answer.skill);
    memoryConsequences.push(answer.consequence);
  }

  return {
    name,
    raceId: race.id,
    raceName: race.name,
    raceGlyph: race.glyph,
    callingId: calling.id,
    callingName: calling.name,
    appearance: {
      ...draft.appearance,
      bodyType: draft.appearance.bodyType ?? "foundation",
      faceType: draft.appearance.faceType ?? "foundation",
    },
    stats,
    skills: [...new Set(skills)],
    memoryConsequences,
    maxHp: 18 + stats.vitality * 2 + calling.startingHpModifier,
    maxStability: Math.min(100, 70 + stats.resonance * 3),
    movement: stats.finesse >= 10 ? 5 : 4,
    ancestryCallingBonus: ancestryCallingBonus
      ? { name: ancestryCallingBonus.name, description: ancestryCallingBonus.description }
      : undefined,
  };
}

/** Upgrades legacy saves by copy, preserving progression and inventory identity. */
export function normalizeLegacyCharacterProfile(profile: CharacterProfile): CharacterProfile {
  const race = raceById(profile.raceId);
  const calling = callingById(profile.callingId);
  assertRaceCallingEligibility(race.id, calling.id);
  const legacyAppearance = profile.appearance as Partial<CharacterAppearance> | undefined;
  const hairStyle = legacyAppearance?.hairStyle && HAIR_STYLES.some((style) => style.id === legacyAppearance.hairStyle)
    ? legacyAppearance.hairStyle
    : "shaved";
  const skinTone = legacyAppearance?.skinTone && legacyAppearance.skinTone in SKIN_TONES
    ? legacyAppearance.skinTone
    : "ashen";
  const facialHair = legacyAppearance?.facialHair && FACIAL_HAIR_STYLES.some((style) => style.id === legacyAppearance.facialHair)
    ? legacyAppearance.facialHair
    : "none";
  const bodyType = legacyAppearance?.bodyType === "foundation" ? legacyAppearance.bodyType : "foundation";
  const faceType = legacyAppearance?.faceType === "foundation" ? legacyAppearance.faceType : "foundation";
  const usedAppearanceDefault = !legacyAppearance?.hairStyle || !legacyAppearance?.skinTone
    || !legacyAppearance?.bodyType || !legacyAppearance?.faceType;
  return {
    ...profile,
    raceName: race.name,
    raceGlyph: race.glyph,
    callingName: calling.name,
    appearance: { hairStyle, skinTone, facialHair, bodyType, faceType },
    appearanceNeedsReview: profile.appearanceNeedsReview ?? usedAppearanceDefault,
  };
}

let activeCharacter: CharacterProfile | null = null;

export function setActiveCharacter(profile: CharacterProfile): void {
  activeCharacter = profile;
}

export function getActiveCharacter(): CharacterProfile {
  if (!activeCharacter) throw new Error("Character creation must finish before the world starts.");
  return activeCharacter;
}
