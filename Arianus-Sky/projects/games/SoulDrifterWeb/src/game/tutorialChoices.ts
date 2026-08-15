import {
  STAT_KEYS,
  callingById,
  type CharacterProfile,
  type StatKey,
  type Stats,
} from "./character";

export type TrialDifficulty = "wayfarer" | "oathbreaker";

export interface ImprintOption {
  id: string;
  name: string;
  description: string;
  skill: string;
  modifiers: Partial<Stats>;
}

export interface StarterImprintSelection {
  allocations: Partial<Stats>;
  raceBoonId: string;
  callingPerkId: string;
}

export interface StarterImprintRecord extends StarterImprintSelection {
  raceBoonName: string;
  callingPerkName: string;
}

export interface TrialDefinition {
  id: TrialDifficulty;
  name: string;
  subtitle: string;
  description: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  skirmishPressure: number;
  bossPressure: number;
  reward: string;
  skillChance: number;
}

export const TRIALS: Record<TrialDifficulty, TrialDefinition> = {
  wayfarer: {
    id: "wayfarer",
    name: "Wayfarer Gate",
    subtitle: "Guided trial · standard rewards",
    description: "A measured route for learning targeting, recovery, action timing, and the miniboss telegraph.",
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    skirmishPressure: 34,
    bossPressure: 64,
    reward: "Tempered Starter Cache",
    skillChance: 0,
  },
  oathbreaker: {
    id: "oathbreaker",
    name: "Oathbreaker Gate",
    subtitle: "Severe trial · improved rewards",
    description: "The same route under violent Realm Pressure: tougher enemies, fewer safe mistakes, improved gear, and a chance to awaken a new class skill.",
    enemyHpMultiplier: 1.55,
    enemyDamageMultiplier: 1.22,
    skirmishPressure: 58,
    bossPressure: 84,
    reward: "Oathbreaker Grave-Iron Cache",
    skillChance: 0.68,
  },
};

const RACE_BOONS: Record<string, readonly ImprintOption[]> = {
  human: [
    { id: "human-versatility", name: "Many Roads", description: "Adapt quickly when the trial changes its rules.", skill: "Many Roads", modifiers: { insight: 1, will: 1 } },
    { id: "human-survivor", name: "Hard-Won Habit", description: "Turn remembered hardship into physical staying power.", skill: "Hard-Won Habit", modifiers: { vitality: 1, finesse: 1 } },
  ],
  elf: [
    { id: "elf-memory", name: "Unbroken Recollection", description: "Recover exact details from a life the Sundering should have erased.", skill: "Unbroken Recollection", modifiers: { insight: 1, will: 1 } },
    { id: "elf-ghoststep", name: "Ghost Step", description: "Move through unstable spaces before their geometry fully settles.", skill: "Ghost Step", modifiers: { finesse: 2 } },
  ],
  dwarf: [
    { id: "dwarf-forgeheart", name: "Forgeheart", description: "Bank hostile heat without surrendering physical control.", skill: "Forgeheart", modifiers: { might: 1, vitality: 1 } },
    { id: "dwarf-anchor", name: "Deep Anchor", description: "Become harder to stagger, displace, or fracture.", skill: "Deep Anchor", modifiers: { vitality: 2 } },
  ],
  halfling: [
    { id: "halfling-hidden", name: "Overlooked Route", description: "Notice safe paths and useful objects larger travelers miss.", skill: "Overlooked Route", modifiers: { finesse: 1, insight: 1 } },
    { id: "halfling-courage", name: "Small Defiance", description: "Hold your identity when fear and Realm Pressure rise together.", skill: "Small Defiance", modifiers: { will: 2 } },
  ],
};

const CALLING_PERKS: Record<string, readonly ImprintOption[]> = {
  warrior: [
    { id: "warrior-vanguard", name: "Vanguard Drill", description: "Open engagements with disciplined pressure.", skill: "Vanguard Drill", modifiers: { might: 1, vitality: 1 } },
    { id: "warrior-counter", name: "Measured Counter", description: "Convert a successful guard into a stronger next strike.", skill: "Measured Counter", modifiers: { finesse: 1, will: 1 } },
  ],
  mage: [
    { id: "mage-formula", name: "Stable Formula", description: "Reduce early mistakes while shaping mortal color magic.", skill: "Stable Formula", modifiers: { insight: 1, resonance: 1 } },
    { id: "mage-overchannel", name: "Risked Channel", description: "Accept fragility in exchange for a higher spell ceiling.", skill: "Risked Channel", modifiers: { resonance: 2 } },
  ],
  priest: [
    { id: "priest-mercy", name: "First Mercy", description: "Strengthen practical healing and recovery.", skill: "First Mercy", modifiers: { will: 1, vitality: 1 } },
    { id: "priest-ward", name: "Consecrated Guard", description: "Favor protective mortal wards before higher mysteries.", skill: "Consecrated Guard", modifiers: { will: 1, resonance: 1 } },
  ],
  sharpshooter: [
    { id: "sharpshooter-line", name: "Clear Line", description: "Read lanes and openings with greater precision.", skill: "Clear Line", modifiers: { finesse: 1, insight: 1 } },
    { id: "sharpshooter-breath", name: "Held Breath", description: "Trade speed for a steadier first shot.", skill: "Held Breath", modifiers: { insight: 2 } },
  ],
  paladin: [
    { id: "paladin-bastion", name: "Mortal Bastion", description: "Begin with practical defense before Sartan ascension.", skill: "Mortal Bastion", modifiers: { vitality: 1, will: 1 } },
    { id: "paladin-judgment", name: "Measured Judgment", description: "Balance force with control and restraint.", skill: "Measured Judgment", modifiers: { might: 1, will: 1 } },
  ],
  summoner: [
    { id: "summoner-binding", name: "Firm Binding", description: "Keep lesser shaped allies coherent for longer.", skill: "Firm Binding", modifiers: { resonance: 1, will: 1 } },
    { id: "summoner-naming", name: "Lesser True Name", description: "Favor precise command over the number of summons.", skill: "Lesser True Name", modifiers: { insight: 1, resonance: 1 } },
  ],
  asura: [
    { id: "asura-thread", name: "Black Thread Control", description: "Handle mortal curses without immediate backlash.", skill: "Black Thread Control", modifiers: { will: 1, resonance: 1 } },
    { id: "asura-pressure", name: "Cruel Insight", description: "Read weakness at the cost of safer instincts.", skill: "Cruel Insight", modifiers: { insight: 2 } },
  ],
  slayer: [
    { id: "slayer-opening", name: "First Opening", description: "Exploit the first exposed flank in an encounter.", skill: "First Opening", modifiers: { finesse: 1, might: 1 } },
    { id: "slayer-escape", name: "Exit Wound", description: "Favor survival after committing to an attack.", skill: "Exit Wound", modifiers: { finesse: 1, will: 1 } },
  ],
  shadowknight: [
    { id: "shadowknight-graveiron", name: "Grave-Iron Discipline", description: "Favor armor, restraint, and a longer-lived Cinder Guard.", skill: "Grave-Iron Discipline", modifiers: { vitality: 1, will: 1 } },
    { id: "shadowknight-hungry-ember", name: "Hungry Ember", description: "Feed the Fire-Realm soul-coal more aggressively through mortal life drain.", skill: "Hungry Ember", modifiers: { might: 1, resonance: 1 } },
  ],
};

export function raceBoonOptions(raceId: string): readonly ImprintOption[] {
  return RACE_BOONS[raceId] ?? RACE_BOONS.human!;
}

export function callingPerkOptions(callingId: string): readonly ImprintOption[] {
  return CALLING_PERKS[callingId] ?? CALLING_PERKS.warrior!;
}

export function applyStarterImprint(profile: CharacterProfile, selection: StarterImprintSelection): StarterImprintRecord {
  if (profile.starterImprint) throw new Error("The starter Soul Imprint has already been sealed.");
  const allocated = STAT_KEYS.reduce((total, key) => total + Math.max(0, Math.floor(selection.allocations[key] ?? 0)), 0);
  if (allocated !== 3) throw new Error("Allocate exactly three Soul Imprint points.");
  const raceBoon = raceBoonOptions(profile.raceId).find((option) => option.id === selection.raceBoonId);
  const callingPerk = callingPerkOptions(profile.callingId).find((option) => option.id === selection.callingPerkId);
  if (!raceBoon || !callingPerk) throw new Error("Choose one ancestry boon and one base-calling perk.");

  const apply = (modifiers: Partial<Stats>): void => {
    for (const key of STAT_KEYS) profile.stats[key] += Math.max(0, Math.floor(modifiers[key] ?? 0));
  };
  apply(selection.allocations);
  apply(raceBoon.modifiers);
  apply(callingPerk.modifiers);
  profile.skills = [...new Set([...profile.skills, raceBoon.skill, callingPerk.skill])];
  const calling = callingById(profile.callingId);
  profile.maxHp = 18 + profile.stats.vitality * 2 + calling.startingHpModifier;
  profile.maxStability = Math.min(100, 70 + profile.stats.resonance * 3);
  profile.movement = profile.stats.finesse >= 10 ? 5 : 4;
  const record: StarterImprintRecord = {
    allocations: Object.fromEntries(STAT_KEYS.map((key) => [key, Math.max(0, Math.floor(selection.allocations[key] ?? 0))])) as Partial<Stats>,
    raceBoonId: raceBoon.id,
    callingPerkId: callingPerk.id,
    raceBoonName: raceBoon.name,
    callingPerkName: callingPerk.name,
  };
  profile.starterImprint = record;
  return record;
}

export function hardTrialSkillName(callingId: string): string {
  const names: Record<string, string> = {
    warrior: "Breach Reversal",
    mage: "Fracture Spark",
    priest: "Last-Light Reprieve",
    sharpshooter: "Realm-Piercing Shot",
    paladin: "Oath of the First Lock",
    summoner: "Echoed Companion",
    asura: "Black Resonance",
    slayer: "Sundering Execution",
    shadowknight: "Gravefire Riposte",
  };
  return names[callingId] ?? "Breach-Hardened Technique";
}

export function deterministicTrialRoll(seed: number): number {
  let value = (seed ^ 0x0a7b3e4d) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

export function statAllocationTotal(allocations: Partial<Record<StatKey, number>>): number {
  return STAT_KEYS.reduce((total, key) => total + (allocations[key] ?? 0), 0);
}

export function starterImprintLockReason(profile: CharacterProfile): string | null {
  if (!profile.onboarding?.storybookCompleted) {
    return "Finish Ilyra's Chronicle of Returning before the Memory Loom can reveal your starter traits and stat threads.";
  }
  if (!profile.onboarding.ilyraAnswered) {
    return "Answer Wellkeeper Ilyra before the Memory Loom can shape this returned body.";
  }
  return null;
}

export function starterTrialLockReason(
  profile: CharacterProfile,
  state: { cofferOpened: boolean; hasUsableWeapon: boolean },
): string | null {
  const imprintLock = starterImprintLockReason(profile);
  if (imprintLock) return imprintLock;
  if (!profile.starterImprint) {
    return "Seal your three stat threads, ancestry boon, and base-calling discipline at the Memory Loom first.";
  }
  if (!state.cofferOpened) {
    return "Open the Wayfarer's Coffer and recover its binding charm and recovery supplies first.";
  }
  if (!state.hasUsableWeapon) {
    return "Equip a usable main-hand weapon in the paper doll before entering the trial.";
  }
  return null;
}
