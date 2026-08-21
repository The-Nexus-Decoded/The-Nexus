#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FAMILY_POLICY = [
  ["locomotion.idle", "locomotion_idle", 12, 5],
  ["locomotion.ground", "locomotion_ground", 28, 10],
  ["locomotion.crouch-stealth", "locomotion_crouch_stealth", 16, 6],
  ["traversal.air", "traversal_air", 20, 8],
  ["traversal.water", "traversal_water", 9, 4],
  ["dodge.evasion", "dodge_evasion", 18, 8],
  ["interaction.door-container", "interaction_door_container", 16, 6],
  ["interaction.pickup-carry", "interaction_pickup_carry", 18, 8],
  ["interaction.world-controls", "interaction_world_controls", 16, 6],
  ["interaction.posture-rest", "interaction_posture_rest", 20, 8],
  ["interaction.work-craft", "interaction_work_craft", 20, 8],
  ["interaction.consumable-document", "interaction_consumable_document", 12, 6],
  ["combat.unarmed", "combat_unarmed", 24, 10],
  ["combat.sword-one-hand", "combat_sword_one_hand", 28, 12],
  ["combat.sword-shield", "combat_sword_shield", 22, 10],
  ["combat.greatsword", "combat_greatsword", 20, 8],
  ["combat.dagger-dual", "combat_dagger_dual", 5, 5],
  ["combat.axe", "combat_axe", 18, 8],
  ["combat.staff", "combat_staff", 2, 1],
  ["combat.bow", "combat_bow", 22, 10],
  ["combat.equipment-transitions", "combat_equipment_transitions", 20, 8],
  ["magic.casting", "magic_casting", 28, 12],
  ["magic.heal-buff-ward", "magic_heal_buff_ward", 3, 3],
  ["reaction.hit-block", "reaction_hit_block", 28, 12],
  ["reaction.recovery", "reaction_death_recovery", 16, 8],
  ["social.dialogue-emote", "social_dialogue_emote", 28, 12],
];

const RELEVANT_GENRES = new Set(["Combat", "Adventure", "Fantasy"]);
const MODERN_OR_OFF_THEME = /\b(rifle|pistol|shotgun|gun|zombie|baseball|basketball|football|golf|hip hop|samba|breakdance|driving|motorcycle)\b/i;
const DEATH_ONLY = /\b(death|dying|die|dead|killed|electrocuted)\b/i;
const FAMILY_FILTERS = {
  "locomotion.idle": { include: /\bidle\b|breathing|look(ing)? around/i, exclude: /crouch|fight|boxing|weapon|sword|shield|bow|axe|rifle|pistol|gun|cover|2hand|2h/i },
  "locomotion.ground": { include: /walk|jog|run|sprint|strafe|backpedal|turn|pivot/i, exclude: /crouch|crawl|torch|carry|carrying|zombie/i },
  "locomotion.crouch-stealth": { include: /crouch|sneak|stealth|crawl|tiptoe/i, exclude: /hang|cover to stand/i },
  "traversal.air": { include: /jump|fall|land|vault|parkour|ledge|hang|climb|ladder|roll/i, exclude: /dive roll|combat roll/i },
  "traversal.water": { include: /swim|tread(ing)? water|standing dive|run to dive/i, exclude: /dive roll/i },
  "dodge.evasion": { include: /dodge|evad|sidestep|combat roll|backflip/i },
  "interaction.door-container": { include: /door|chest|drawer|cabinet|container|opening|closing|look(ing)? through files/i, exclude: /block|uppercut|fight idle/i },
  "interaction.pickup-carry": { include: /pick ?up|lift|put(ting)? down|carry|carrying|grab|dropping/i, exclude: /ammo|hang|freehang/i },
  "interaction.world-controls": { include: /lever|button|switch|push|pull|crank|wheel/i, exclude: /grenade|capoeira|ginga/i },
  "interaction.posture-rest": { include: /\bsit|sitting|stand(ing)? up|kneel|lie down|laying|sleep|wake|rest/i, exclude: /dodge|grenade|gun|block|assailant/i },
  "interaction.work-craft": { include: /craft|repair|work|mine|mining|chop|dig|saw|hammer|forge|cook|fish|harvest/i, exclude: /squat|curl|exercise|workout/i },
  "interaction.consumable-document": { include: /drink|eat|read|write|inspect|search/i },
  "combat.unarmed": { include: /punch|kick|boxing|martial|elbow|knee strike|grapple|tackle|headbutt|capoeira/i },
  "combat.sword-one-hand": { include: /\bsword\b|rapier|fencing/i, exclude: /great sword|greatsword|two.hand|2h|shield/i },
  "combat.sword-shield": { include: /sword and shield|sword & shield/i },
  "combat.greatsword": { include: /great ?sword|two.hand(ed)? sword|2h sword/i },
  "combat.dagger-dual": { include: /dagger|knife|dual weapon|dual wield/i },
  "combat.axe": { include: /\baxe\b|axeman/i },
  "combat.staff": { include: /\bstaff\b/i, exclude: /rifle/i },
  "combat.bow": { include: /\bbow\b|archer|archery|arrow/i, exclude: /crossbow/i },
  "combat.equipment-transitions": { include: /draw|sheath|equip|unequip|holster/i, exclude: /spit/i },
  "magic.casting": { include: /cast|spell|magic|mage|wizard|summon|channel|ritual|enchant|telekinesis/i, exclude: /rummaging/i },
  "magic.heal-buff-ward": { include: /heal|bless|buff|ward|shield spell/i },
  "reaction.hit-block": { include: /hit react|impact|stagger|recoil|block|parry|knockback|knock down/i, exclude: /idle|crouching/i },
  "reaction.recovery": { include: /get(ting)? up|stand(ing)? up|revive|resurrect/i },
  "social.dialogue-emote": { include: /talk|conversation|argu|gesture|wave|point|nod|shake head|bowing|salute|laugh|cry|cheer|taunt|threaten|pray|applaud|clap|acknowledg/i, exclude: /magic attack/i },
};

function parseArgs(argv) {
  const args = { catalog: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--catalog") {
      args.catalog = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--output") {
      args.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  if (!args.catalog || !args.output) {
    throw new Error("--catalog and --output are required");
  }
  return args;
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function score(product) {
  const relevantGenreCount = (product.genres ?? []).filter((genre) => RELEVANT_GENRES.has(genre)).length;
  const offThemePenalty = MODERN_OR_OFF_THEME.test(`${product.name} ${product.description}`) ? 20 : 0;
  const motionBonus = product.type === "Motion" ? 4 : 0;
  return relevantGenreCount * 10 + motionBonus - offThemePenalty;
}

function stableRank(left, right) {
  return score(right) - score(left)
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id);
}

function familyProducts(catalog, familyId, sourceTag) {
  const filter = FAMILY_FILTERS[familyId];
  return catalog
    .filter((product) => product.soulDrifterTags?.includes(sourceTag))
    .filter((product) => !DEATH_ONLY.test(`${product.name} ${product.description}`))
    .filter((product) => !filter?.include || filter.include.test(`${product.name} ${product.description}`))
    .filter((product) => !filter?.exclude || !filter.exclude.test(`${product.name} ${product.description}`));
}

function selectFamily(catalog, familyId, sourceTag, cap, coreCap) {
  const ranked = familyProducts(catalog, familyId, sourceTag).sort(stableRank);
  const distinctNames = [];
  const repeatedNames = [];
  const seenNames = new Set();
  for (const product of ranked) {
    const normalizedName = product.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) repeatedNames.push(product);
    else {
      seenNames.add(normalizedName);
      distinctNames.push(product);
    }
  }
  return [...distinctNames, ...repeatedNames]
    .slice(0, cap)
    .map((product, index) => ({ product, tier: index < coreCap ? "core" : "extended" }));
}

function buildLedger(catalogSnapshot) {
  const byMotionId = new Map();
  const familyCoverage = [];

  for (const [familyId, sourceTag, cap, coreCap] of FAMILY_POLICY) {
    const available = familyProducts(catalogSnapshot.products, familyId, sourceTag).length;
    const selected = selectFamily(catalogSnapshot.products, familyId, sourceTag, cap, coreCap);
    familyCoverage.push({
      familyId,
      sourceTag,
      available,
      selected: selected.length,
      core: selected.filter((entry) => entry.tier === "core").length,
      extended: selected.filter((entry) => entry.tier === "extended").length,
      cap,
      coverageState: available === 0 ? "local-authoring-required" : selected.length < cap ? "all-available-selected" : "curated-cap-selected",
    });

    for (const { product, tier } of selected) {
      const existing = byMotionId.get(product.id) ?? {
        actionId: `mixamo.${slug(product.name)}-${product.id.slice(0, 8)}`,
        mixamoId: product.id,
        displayName: product.name,
        description: product.description ?? "",
        genres: product.genres ?? [],
        semanticFamilies: [],
        tier: "extended",
        acquisition: {
          state: "cataloged-not-downloaded",
          format: "FBX Binary",
          skin: "Without Skin",
          fps: 30,
          keyframeReduction: "none",
        },
        runtime: {
          state: "candidate-needs-visual-review",
          stableActionId: true,
          canonicalHumanoidRetargetRequired: true,
        },
      };
      if (!existing.semanticFamilies.includes(familyId)) existing.semanticFamilies.push(familyId);
      if (tier === "core") existing.tier = "core";
      byMotionId.set(product.id, existing);
    }
  }

  const motions = [...byMotionId.values()]
    .map((motion) => ({ ...motion, semanticFamilies: motion.semanticFamilies.sort() }))
    .sort((left, right) => left.actionId.localeCompare(right.actionId));
  return {
    schemaVersion: 1,
    issue: 448,
    sourceCatalog: "mixamo-catalog-2026-08-20.json",
    sourceCapturedAt: catalogSnapshot.capturedAt,
    generatedAt: "2026-08-20T23:15:00.000Z",
    selectionPolicy: {
      intent: "broad-first-breach-and-game-foundation-shortlist",
      everyEntryRequiresVisualReview: true,
      everyEntryRequiresCanonicalRigRetargetQa: true,
      deathAnimationsOwnedBy: "docs/animation/mixamo-death-ledger.json",
      coreTierMeaning: "first acquisition and runtime-binding wave",
      extendedTierMeaning: "additional variation retained for later acquisition",
      duplicateMotionAcrossFamiliesStoredOnce: true,
    },
    sparseOrMissingFamilies: [
      {
        familyId: "combat.mace-hammer",
        mixamoTaggedCount: 0,
        resolution: "locally-author-close-blunt-weapon variants from approved one-hand sword and heavy attack sources",
      },
      {
        familyId: "combat.spear-polearm",
        mixamoTaggedCount: 0,
        resolution: "locally-author thrust sweep brace and recovery clips on the canonical humanoid rig",
      },
      {
        familyId: "combat.crossbow",
        mixamoTaggedCount: 0,
        resolution: "locally-author aim fire reload and lower clips from the bow posture family",
      },
      {
        familyId: "combat.staff",
        mixamoTaggedCount: 2,
        resolution: "retain the two catalog sources only as references and locally author a complete staff set",
      },
    ],
    familyCoverage,
    uniqueMotionCount: motions.length,
    coreMotionCount: motions.filter((motion) => motion.tier === "core").length,
    extendedMotionCount: motions.filter((motion) => motion.tier === "extended").length,
    motions,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(args.catalog, "utf8"));
  const ledger = buildLedger(catalog);
  await writeFile(args.output, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(JSON.stringify({
    uniqueMotionCount: ledger.uniqueMotionCount,
    coreMotionCount: ledger.coreMotionCount,
    extendedMotionCount: ledger.extendedMotionCount,
    familyCoverage: ledger.familyCoverage,
  }, null, 2));
}

await main();
