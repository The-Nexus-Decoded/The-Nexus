#!/usr/bin/env node

/**
 * Export the Heartvale quest definitions DB (JSON) from the authored TS content.
 *
 * The TS content in src/game/zoneHeartvale.ts remains the authoring source
 * (typed, unit-tested); this script is the "migration" that materializes it
 * into the JSON database the quest engine loads at runtime:
 *
 *   public/data/heartvale-questdb.json          — definitions DB (committed)
 *   public/data/heartvale-quest-overrides.json  — GM/AI overrides (seeded empty)
 *
 * Usage: node --experimental-strip-types scripts/questdb/export-heartvale-questdb.mjs
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HEARTVALE_QUESTS, HEARTVALE_QUEST_TEMPLATES } from "../../src/game/zoneHeartvale.ts";
import { validateDefinitionsDb } from "../../src/game/questdb/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const gameRoot = resolve(here, "..", "..");
const dataDir = resolve(gameRoot, "public", "data");

const db = {
  schemaVersion: 1,
  generatedFrom: "src/game/zoneHeartvale.ts#HEARTVALE_QUESTS",
  quests: HEARTVALE_QUESTS.map((quest) => ({ ...quest, origin: "authored" })),
  templates: [...HEARTVALE_QUEST_TEMPLATES],
};

const errors = validateDefinitionsDb(db);
if (errors.length > 0) {
  console.error("Quest DB validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

await mkdir(dataDir, { recursive: true });
const dbPath = resolve(dataDir, "heartvale-questdb.json");
await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");

const overridesPath = resolve(dataDir, "heartvale-quest-overrides.json");
if (!existsSync(overridesPath)) {
  await writeFile(overridesPath, `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`, "utf8");
} else {
  // Sanity: existing overrides must parse.
  JSON.parse(await readFile(overridesPath, "utf8"));
}

console.log(JSON.stringify({
  dbPath,
  quests: db.quests.length,
  templates: db.templates.length,
  overridesPath,
  overridesSeeded: !existsSync(overridesPath) || undefined,
}));
