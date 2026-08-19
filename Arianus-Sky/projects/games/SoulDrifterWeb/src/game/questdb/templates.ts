/**
 * Dynamic quest templates — seeded instantiation so players see rotating,
 * non-generic quests instead of a fixed list.
 *
 * Instance seeds combine the template id with a date string, so every player
 * sees the SAME daily instance (shared world), while a GM or AI agent can
 * inject one-off instances with any seed for live events. Flavor comes from
 * lore pools authored in the zone content, not random word salad.
 */

import type { QuestTemplate, StoredQuest } from "./schema.ts";

export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TemplateContext {
  /** Display names for monsters, so generated text reads properly. */
  monsterName: (monsterId: string) => string;
  /** NPC that offers rotating contracts. */
  giverNpcId: string;
  turnInNpcId: string;
  /** ISO date used for rotation/expiry, e.g. 2026-08-18. */
  date: string;
}

function fill(pattern: string, values: Record<string, string | number>): string {
  return pattern.replaceAll(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** Deterministically instantiate a template for a given date (or GM seed). */
export function instantiateTemplate(
  template: QuestTemplate,
  context: TemplateContext,
  seedOverride?: number,
): StoredQuest {
  const seed = seedOverride ?? hashSeed(`${template.id}:${context.date}`);
  const rng = mulberry32(seed);
  const pick = <T>(values: readonly T[]): T => values[Math.floor(rng() * values.length)]!;
  const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

  const monsterId = pick(template.slots.monsterPool);
  const place = pick(template.slots.placePool);
  const flavor = pick(template.slots.flavorPool);
  const count = int(template.countRange[0], template.countRange[1]);
  const level = int(template.levelRange[0], template.levelRange[1]);
  const monster = context.monsterName(monsterId);

  const xp = template.xpPerUnit * count * (1 + (level - 1) * 0.35);
  const coin = template.coinPerUnit * count * (1 + (level - 1) * 0.3);
  const values = { monster, place: place.name, count, flavor };

  const expiry = new Date(`${context.date}T00:00:00Z`);
  expiry.setUTCDate(expiry.getUTCDate() + 1);

  return {
    id: `dyn-${template.id}-${context.date}-${seed.toString(36)}`,
    name: fill(template.namePattern, values),
    giverNpcId: context.giverNpcId,
    turnInNpcId: context.turnInNpcId,
    level,
    summary: fill(template.summaryPattern, values),
    objectives: [{
      id: "contract",
      kind: template.kind,
      targetId: monsterId,
      count,
      label: fill("{monster} — {count}", values),
    }],
    rewards: { xp: Math.round(xp), coin: Math.round(coin), itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: level, soloLevel: level, difficulty: "solo" },
    requires: [],
    teaches: "Rotating contract: the vale's needs change daily.",
    expiresAt: expiry.toISOString(),
    rotation: template.rotation,
    origin: "template",
  };
}

/** All daily instances for a date — what the notice board offers today. */
export function dailyInstances(
  templates: readonly QuestTemplate[],
  context: TemplateContext,
): StoredQuest[] {
  return templates.map((template) => instantiateTemplate(template, context));
}

/** True when a stored quest has passed its expiry and should retire. */
export function isExpired(quest: StoredQuest, now: Date): boolean {
  if (!quest.expiresAt) return false;
  return now.getTime() > Date.parse(quest.expiresAt);
}
