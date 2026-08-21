#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API = "https://www.mixamo.com/api/v1/products";
const PAGE_SIZE = 96;
const DEFAULT_LEDGER = new URL(
  "../docs/animation/mixamo-character-placeholder-ledger.json",
  import.meta.url,
);

function parseArgs(argv) {
  const args = {
    ledger: DEFAULT_LEDGER,
    outputDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--ledger") {
      args.ledger = new URL(`file:///${path.resolve(argv[index + 1]).replaceAll("\\", "/")}`);
      index += 1;
    } else if (argv[index] === "--output-dir") {
      args.outputDir = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  if (!args.outputDir) throw new Error("--output-dir is required");
  return args;
}

async function fetchJson(url, attempts = 4) {
  let finalError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "X-Api-Key": "mixamo2" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await response.json();
    } catch (error) {
      finalError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw finalError;
}

function catalogUrl(page) {
  const query = new URLSearchParams({
    type: "Character",
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  return `${API}?${query.toString()}`;
}

async function fetchCatalog() {
  const first = await fetchJson(catalogUrl(1));
  const pages = [first];
  for (let page = 2; page <= first.pagination.num_pages; page += 1) {
    pages.push(await fetchJson(catalogUrl(page)));
  }
  return pages.flatMap((entry) => entry.results);
}

function allSelections(ledger) {
  return ledger.backgroundNpcRoster.map((entry) => ({ ...entry, lane: "background" }));
}

function validateLedger(ledger, catalog) {
  const errors = [];
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
  const selections = allSelections(ledger);
  const runtimeIds = new Set();
  const mixamoIds = new Set();

  for (const selection of selections) {
    const source = catalogById.get(selection.mixamoCharacterId);
    if (!source) {
      errors.push(`${selection.runtimeAssetId}: Mixamo ID missing from live catalog`);
      continue;
    }
    if (source.name !== selection.mixamoCharacterName) {
      errors.push(
        `${selection.runtimeAssetId}: source name drifted from ${selection.mixamoCharacterName} to ${source.name}`,
      );
    }
    if (runtimeIds.has(selection.runtimeAssetId)) {
      errors.push(`${selection.runtimeAssetId}: duplicate runtime asset ID`);
    }
    runtimeIds.add(selection.runtimeAssetId);
    if (mixamoIds.has(selection.mixamoCharacterId)) {
      errors.push(`${selection.mixamoCharacterId}: duplicate Mixamo character selection`);
    }
    mixamoIds.add(selection.mixamoCharacterId);
  }

  if (ledger.policy.mixamoNamedNpcUseAllowed !== false) {
    errors.push("Mixamo character bodies must remain background-only");
  }
  if (ledger.namedNpcAssemblies.length !== 3) {
    errors.push("canonical named NPC assembly matrix must contain Ilyra, Orren, and Brannoc");
  }
  if (ledger.namedNpcAssemblies.some((entry) => "mixamoCharacterId" in entry)) {
    errors.push("named NPC assemblies must not reference Mixamo character IDs");
  }
  if (ledger.policy.productionAcceptanceAllowed !== false) {
    errors.push("temporary Mixamo NPCs must not satisfy final custom-NPC acceptance");
  }
  return { errors, selections, catalogById };
}

async function main() {
  const { ledger: ledgerUrl, outputDir } = parseArgs(process.argv.slice(2));
  const ledger = JSON.parse(await readFile(ledgerUrl, "utf8"));
  const catalog = await fetchCatalog();
  const { errors, selections, catalogById } = validateLedger(ledger, catalog);
  const capturedAt = new Date().toISOString();
  const audit = {
    schemaVersion: 1,
    issue: 448,
    capturedAt,
    catalogEndpoint: `${API}?type=Character`,
    catalogCount: catalog.length,
    selectedCount: selections.length,
    pass: errors.length === 0,
    errors,
    selections: selections.map((selection) => {
      const source = catalogById.get(selection.mixamoCharacterId);
      return {
        runtimeAssetId: selection.runtimeAssetId,
        lane: selection.lane,
        mixamoCharacterId: selection.mixamoCharacterId,
        mixamoCharacterName: selection.mixamoCharacterName,
        catalogMatch: Boolean(source),
        thumbnail: source?.thumbnail ?? null,
        sourceType: source?.type ?? null,
        characterType: source?.character_type ?? null,
        downloadState: selection.state,
      };
    }),
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "mixamo-character-placeholder-audit.json"),
    `${JSON.stringify(audit, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, "mixamo-character-catalog.json"),
    `${JSON.stringify({ capturedAt, catalogCount: catalog.length, characters: catalog }, null, 2)}\n`,
  );
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.pass) process.exitCode = 1;
}

await main();
