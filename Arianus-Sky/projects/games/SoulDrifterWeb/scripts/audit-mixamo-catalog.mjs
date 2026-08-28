#!/usr/bin/env node

/**
 * Snapshot Mixamo's current motion catalog and build a SoulDrifter candidate index.
 *
 * Usage:
 *   node scripts/audit-mixamo-catalog.mjs --output-dir H:/path/to/audit
 *
 * The full catalog is retained so keyword tagging cannot silently erase a motion.
 * Candidate tags are discovery aids; final acceptance still requires visual review
 * on the canonical humanoid rig and a clean "Without Skin" download.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://www.mixamo.com/api/v1/products";
const PAGE_SIZE = 96;
const GAME_RELEVANT_GENRES = ["Combat", "Adventure", "Fantasy", "Superhero"];
const ALL_GENRES = [
  "Combat",
  "Adventure",
  "Sport",
  "Dance",
  "Fantasy",
  "Superhero",
  "Skinning Test",
];

const TAXONOMY = {
  locomotion_idle: [
    /\bidle\b/i,
    /breathing/i,
    /look(ing)? around/i,
    /ready stance/i,
  ],
  locomotion_ground: [
    /\bwalk(ing)?\b/i,
    /\bjog(ging)?\b/i,
    /\brun(ning)?\b/i,
    /\bsprint(ing)?\b/i,
    /strafe/i,
    /backpedal/i,
    /backward/i,
    /turn(ing)?/i,
    /pivot/i,
    /start(ing)? (to )?(walk|run|sprint)/i,
    /stop(ping)? (from )?(walk|run|sprint)/i,
  ],
  locomotion_crouch_stealth: [
    /crouch/i,
    /sneak/i,
    /stealth/i,
    /crawl/i,
    /tiptoe/i,
  ],
  traversal_air: [
    /jump/i,
    /fall(ing)?/i,
    /land(ing)?/i,
    /vault/i,
    /parkour/i,
    /ledge/i,
    /hang(ing)?/i,
    /climb/i,
    /ladder/i,
    /roll/i,
  ],
  traversal_water: [/swim/i, /tread(ing)? water/i, /dive/i],
  dodge_evasion: [/dodge/i, /evade/i, /sidestep/i, /combat roll/i, /backflip/i],
  interaction_door_container: [
    /door/i,
    /chest/i,
    /drawer/i,
    /cabinet/i,
    /container/i,
    /open(ing)?/i,
    /clos(e|ing)/i,
  ],
  interaction_pickup_carry: [
    /pick ?up/i,
    /lift(ing)?/i,
    /put(ting)? down/i,
    /carry(ing)?/i,
    /hold(ing)? (a |an )?(box|object|item)/i,
    /grab(bing)?/i,
    /drop(ping)?/i,
  ],
  interaction_world_controls: [
    /lever/i,
    /button/i,
    /switch/i,
    /push(ing)?/i,
    /pull(ing)?/i,
    /crank/i,
    /wheel/i,
  ],
  interaction_posture_rest: [
    /\bsit(ting)?\b/i,
    /\bstand(ing)? up\b/i,
    /\bkneel(ing)?\b/i,
    /\blie down\b/i,
    /\blaying\b/i,
    /\bsleep(ing)?\b/i,
    /\bwake|waking\b/i,
    /\brest(ing)?\b/i,
  ],
  interaction_work_craft: [
    /craft/i,
    /repair/i,
    /work(ing)?/i,
    /mine|mining/i,
    /chop(ping)?/i,
    /dig(ging)?/i,
    /saw(ing)?/i,
    /hammer(ing)?/i,
    /forge|forging/i,
    /cook(ing)?/i,
    /fish(ing)?/i,
    /harvest/i,
  ],
  interaction_consumable_document: [
    /\bdrink(ing)?\b/i,
    /\beat(ing)?\b/i,
    /\bread(ing)?\b/i,
    /\bwrite|writing\b/i,
    /\binspect(ing)?\b/i,
    /\bsearch(ing)?\b/i,
  ],
  combat_unarmed: [
    /punch/i,
    /kick/i,
    /boxing/i,
    /martial/i,
    /elbow/i,
    /knee strike/i,
    /grapple/i,
    /tackle/i,
    /headbutt/i,
    /unarmed/i,
  ],
  combat_sword_one_hand: [
    /\bsword\b/i,
    /sword strike/i,
    /sword slash/i,
    /sword attack/i,
    /sword thrust/i,
    /rapier/i,
    /fencing/i,
  ],
  combat_sword_shield: [/sword and shield/i, /sword & shield/i, /shield/i],
  combat_greatsword: [/great ?sword/i, /two[- ]hand(ed)? sword/i, /\b2h sword/i],
  combat_dagger_dual: [/dagger/i, /knife/i, /dual wield/i, /dual weapon/i],
  combat_axe: [/\baxe\b/i, /axeman/i],
  combat_mace_hammer: [/\bmace\b/i, /war ?hammer/i, /two[- ]hand(ed)? hammer/i],
  combat_spear_polearm: [
    /\bspear\b/i,
    /\bpolearm\b/i,
    /\bhalberd\b/i,
    /\blance\b/i,
    /\btrident\b/i,
  ],
  combat_staff: [/\bstaff\b/i, /quarterstaff/i, /bo staff/i],
  combat_bow: [/\bbow\b/i, /archer/i, /archery/i, /arrow/i],
  combat_crossbow: [/crossbow/i],
  combat_equipment_transitions: [
    /draw(ing)? (a |the )?(sword|weapon|bow|dagger|axe)/i,
    /sheathe|sheathing/i,
    /equip(ping)?/i,
    /unequip(ping)?/i,
    /holster/i,
  ],
  magic_casting: [
    /\bcast(ing)?\b/i,
    /spell/i,
    /magic/i,
    /mage/i,
    /wizard/i,
    /summon/i,
    /channel(ing)?/i,
    /ritual/i,
    /enchant/i,
    /telekinesis/i,
  ],
  magic_heal_buff_ward: [
    /\bheal(ing)?\b/i,
    /\bbless(ing)?\b/i,
    /\bbuff\b/i,
    /\bward\b/i,
    /\bshield spell\b/i,
  ],
  reaction_hit_block: [
    /hit react/i,
    /impact/i,
    /stagger/i,
    /recoil/i,
    /block(ing)?/i,
    /parry/i,
    /knockback/i,
    /knock down/i,
  ],
  reaction_death_recovery: [
    /death/i,
    /dying/i,
    /die\b/i,
    /get(ting)? up/i,
    /stand(ing)? up/i,
    /revive/i,
    /resurrect/i,
  ],
  social_dialogue_emote: [
    /talk(ing)?/i,
    /conversation/i,
    /argu(e|ing)/i,
    /gesture/i,
    /wave|waving/i,
    /point(ing)?/i,
    /nod(ding)?/i,
    /shake head/i,
    /bowing/i,
    /salute/i,
    /laugh(ing)?/i,
    /cry(ing)?/i,
    /cheer(ing)?/i,
    /taunt(ing)?/i,
    /threaten/i,
    /pray(ing)?/i,
    /applaud|clap(ping)?/i,
  ],
};

function parseArgs(argv) {
  const output = { outputDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output-dir") {
      output.outputDir = argv[index + 1];
      index += 1;
    }
  }
  if (!output.outputDir) {
    throw new Error("--output-dir is required");
  }
  return output;
}

async function fetchJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "X-Api-Key": "mixamo2" } });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

function productUrl({ page = 1, genre = null } = {}) {
  const query = new URLSearchParams({
    type: "Motion,MotionPack",
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (genre) query.set("genres", genre);
  return `${API}?${query.toString()}`;
}

async function fetchAllProducts(genre = null) {
  const first = await fetchJson(productUrl({ page: 1, genre }));
  const pages = [first];
  for (let page = 2; page <= first.pagination.num_pages; page += 1) {
    pages.push(await fetchJson(productUrl({ page, genre })));
  }
  return {
    pagination: first.pagination,
    results: pages.flatMap((page) => page.results),
  };
}

function tagsFor(product) {
  const haystack = `${product.name ?? ""} ${product.description ?? ""}`;
  return Object.entries(TAXONOMY)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(haystack)))
    .map(([tag]) => tag);
}

function markdownSummary(snapshot) {
  const lines = [
    "# Mixamo catalog audit for SoulDrifter",
    "",
    `Captured: ${snapshot.capturedAt}`,
    `Full motion and pack catalog: ${snapshot.catalogCount}`,
    `Game-relevant candidates: ${snapshot.candidateCount}`,
    "",
    "This is a discovery index, not an approval list. Every selected clip still needs visual review on the canonical humanoid, a clean `Without Skin` download, normalization, and runtime QA.",
    "",
    "## Genre counts",
    "",
    "| Genre | Results |",
    "| --- | ---: |",
    ...Object.entries(snapshot.genreCounts).map(([genre, count]) => `| ${genre} | ${count} |`),
    "",
    "## Candidate counts by action family",
    "",
    "| Action family | Candidates |",
    "| --- | ---: |",
    ...Object.entries(snapshot.tagCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([tag, count]) => `| ${tag} | ${count} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const { outputDir } = parseArgs(process.argv.slice(2));
  await mkdir(outputDir, { recursive: true });

  const full = await fetchAllProducts();
  const genreResults = {};
  for (const genre of ALL_GENRES) {
    genreResults[genre] = await fetchAllProducts(genre);
  }

  const genresById = new Map();
  for (const [genre, data] of Object.entries(genreResults)) {
    for (const product of data.results) {
      const genres = genresById.get(product.id) ?? new Set();
      genres.add(genre);
      genresById.set(product.id, genres);
    }
  }

  const catalog = full.results.map((product) => ({
    ...product,
    genres: [...(genresById.get(product.id) ?? [])].sort(),
    soulDrifterTags: tagsFor(product),
  }));
  const relevantGenreSet = new Set(GAME_RELEVANT_GENRES);
  const candidates = catalog.filter(
    (product) =>
      product.soulDrifterTags.length > 0 ||
      product.genres.some((genre) => relevantGenreSet.has(genre)),
  );
  const tagCounts = {};
  for (const product of candidates) {
    for (const tag of product.soulDrifterTags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const capturedAt = new Date().toISOString();
  const date = capturedAt.slice(0, 10);
  const snapshot = {
    schemaVersion: 1,
    issue: 448,
    capturedAt,
    source: API,
    sourceHeaders: { "X-Api-Key": "mixamo2" },
    catalogCount: catalog.length,
    candidateCount: candidates.length,
    genreCounts: Object.fromEntries(
      Object.entries(genreResults).map(([genre, data]) => [genre, data.pagination.num_results]),
    ),
    tagCounts,
  };

  await writeFile(
    path.join(outputDir, `mixamo-catalog-${date}.json`),
    `${JSON.stringify({ ...snapshot, products: catalog }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, `mixamo-souldrifter-candidates-${date}.json`),
    `${JSON.stringify({ ...snapshot, products: candidates }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, `mixamo-souldrifter-candidate-summary-${date}.md`),
    markdownSummary(snapshot),
  );
  console.log(JSON.stringify(snapshot, null, 2));
}

await main();
