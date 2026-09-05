#!/usr/bin/env node

/**
 * Game-master / AI-agent CLI for the live quest database.
 *
 * Appends an audited override to public/data/heartvale-quest-overrides.json.
 * The same gm.ts module drives the in-browser GM surface, so semantics and
 * validation are identical in both places.
 *
 * Usage (from SoulDrifterWeb):
 *   node --experimental-strip-types scripts/questdb/questgm.mjs \
 *     --command '{"op":"quest.patch","questId":"q-mudclaw-toll","patch":{"rewards":{"xp":200,"coin":12}}}' \
 *     --author gm-olawal --reason "community event: double mudclaw week"
 *
 *   node --experimental-strip-types scripts/questdb/questgm.mjs --audit
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { applyGmCommand, auditTrail } from "../../src/game/questdb/gm.ts";
import { emptyOverridesDb } from "../../src/game/questdb/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const overridesPath = resolve(here, "..", "..", "public", "data", "heartvale-quest-overrides.json");

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function loadOverrides() {
  try {
    return JSON.parse(await readFile(overridesPath, "utf8"));
  } catch {
    return emptyOverridesDb();
  }
}

const overrides = await loadOverrides();

if (process.argv.includes("--audit")) {
  for (const line of auditTrail(overrides)) console.log(line);
  if (overrides.entries.length === 0) console.log("(no overrides in force)");
  process.exit(0);
}

const commandJson = arg("command");
const author = arg("author") ?? "questgm-cli";
const reason = arg("reason");
if (!commandJson || !reason) {
  console.error("Usage: questgm.mjs --command '<json>' --author <id> --reason '<why>' | --audit");
  process.exit(1);
}

const command = JSON.parse(commandJson);
const result = applyGmCommand(overrides, command, {
  author,
  reason,
  at: new Date().toISOString(),
});

await writeFile(overridesPath, `${JSON.stringify(result.overrides, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ applied: result.entry, overridesPath }));
