# SoulDrifter #487 — Character Foundation Catch-Up and Kickoff

## Purpose

This is the mandatory repository-backed context pack for every new M3, Claude Code, ChatGPT/Codex, or other agent session working on the combined SoulDrifter character-foundation program:

```text
#443 character matrix and save/runtime contract
-> #435 Tripo modular asset foundation
-> #448 First Breach character/NPC/monster integration
```

Chat memory is not authoritative. Every session reconstructs the current state from the repository and live GitHub issue/PR state before editing, generating images, opening Tripo, or spending credits.

---

# 1. Fast start versus full onboarding

Normal new chats use the cached session fast-start. They do not reinstall or fully revalidate the entire workstation toolchain unless a receipt is missing, stale, or invalidated.

Read first:

- `../SESSION_FAST_START.md`
- `../START_HERE.md`
- `../PROJECT_CANON_INDEX.md`
- `../WORKFLOW.md`
- `../config/onboarding-cache-policy.json`

Run full onboarding only when required:

- `../ONBOARDING.md`
- `../PRODUCTION_TOOLCHAIN_PREFLIGHT.md`

Before any paid provider operation, always refresh the live active-lane balance, current price, expected cost, maximum retry cost, and owner approval. A cached receipt never substitutes for the live spend gate.

---

# 2. Mandatory production policies

Every session must read the current versions of:

- `../IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `../ANIMATION_PROVIDER_ROUTING.md`
- `../CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `../config/tripo-provider.json`
- `../config/animation-bakeoff-policy.json`
- `../templates/animation-bakeoff-record.template.json`
- `../../universal-game-production/IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md`
- `../../universal-game-production/templates/imported-asset-runtime-presentation-record.template.json`

For browser/mobile/runtime acceptance, also read:

- `../BROWSER_RUNTIME_ROADMAP.md`

For current environment integration boundaries, read the accepted/current #451/#460 interface and the applicable zone/environment policies without editing #460 from this program.

---

# 3. Live GitHub state that must be fetched

Read the full live issue and comment histories for:

- #487 — combined orchestration and owner direction;
- #488 — machine-readable character matrix and Tripo pilot ledger;
- #489 — owner review gate for the first two Human pilots;
- #443 — ancestry/calling/build/save/runtime matrix;
- #435 — modular body/head/hair/clothing/weapon pipeline;
- #448 — First Breach actor integration and acceptance;
- #427 — animation acquisition/retargeting/QA;
- #439 — combat animation and targeting presentation;
- #451 — First Breach V2 environment and level contract.

Read the full live PR state, comments, reviews, changed files, and heads for:

- PR #436 — historical modular-pipeline documentation;
- PR #446 — prior Phase 2 character/HUD contract work;
- PR #449 — historical/current #448 model-program branch and asset/test inventory;
- PR #460 — current First Breach environment/runtime integration contract.

Do not rely only on issue titles or old summaries. Read every current owner comment and inspect the actual branch files.

---

# 4. Repository implementation sources to audit

At minimum, inspect:

- repository `AGENTS.md` files governing the selected worktree;
- `Arianus-Sky/projects/games/SoulDrifterWeb/docs/3d-ai-studio/README.md` as historical/current local implementation documentation;
- issue #448 model registers, source audits, asset manifests, rig reports, animation ledgers, and runtime-promotion gates;
- character-creation, save normalization/migration, ancestry/calling, avatar identity, model-resolution, portrait/headshot, inventory/paper-doll, animation, and equipment code/tests;
- current public/shipping asset directories and external intake references recorded by manifests;
- `.agent-state/443/`, `.agent-state/435/`, `.agent-state/487/`, and related ticket state when present.

Classify old artifacts rather than assuming they are accepted:

```text
KEEP_RUNTIME_CODE
KEEP_SCHEMA_OR_TEST
KEEP_REFERENCE_ONLY
KEEP_ROLLBACK
REPAIR
REGENERATE_TRIPO
REJECT
```

No old body, head, hair, rig, NPC, monster, or animation becomes accepted merely because an automated structural test passed.

---

# 5. Owner-locked character foundation

## Initial production ancestries

- Human
- Elf
- Dwarf

Halfling, Drakkin, and any fourth ancestry remain outside this kickoff unless explicitly re-approved through #443. Existing saves and legacy data receive explicit migration/recovery handling; they are not silently deleted or rewritten.

## Presentations

- adult masculine
- adult feminine

## Four body builds

1. `SLIM` — lean, narrow-framed, low bulk, healthy rather than emaciated.
2. `MEDIUM_NATURAL` — average mass and proportions, neither visibly muscular nor heavy.
3. `ATHLETIC_MUSCULAR` — trained and defined, with stronger shoulders/limbs but no exaggerated bodybuilder proportions.
4. `THICK_LARGE_FRAMED` — broad, solid, thick torso and limbs, substantial frame; not obese, no protruding gut, no exaggerated belly, and not a fat-character interpretation.

Build is an appearance option unless a separately approved #443 rule explicitly assigns gameplay consequences.

## Human baseline

```text
2 presentations x 4 builds = 8 Human base bodies
```

First owner-review pilots only:

- Human masculine `ATHLETIC_MUSCULAR`
- Human feminine `ATHLETIC_MUSCULAR`

The other six Human bodies remain blocked until both pilots pass. Elf and Dwarf remain blocked until the complete eight-body Human baseline passes.

---

# 6. Full-asset and no-pedestal gate

Every primary image and 3D source must show one complete asset with generous margin around all geometry.

For a base body:

- complete head-to-feet body;
- hands and fingers visible and separated;
- feet fully visible and flat;
- neutral relaxed A-pose unless the verified rig lane requires an approved alternative;
- bald or neutral close-scalp presentation;
- modest opaque neutral underwear only;
- clean unobstructed background.

Automatic rejection:

- pedestal, plinth, stand, turntable base, platform, throne, rock, scenery, or display object beneath/around the feet;
- cropped head, feet, hands, limbs, or attachments;
- multiple people, background figures, duplicate limbs, mirrored anatomy, or extra body parts;
- fused hair, class clothing, robe, armor, belt, boots, gloves, weapon, shield, sheath, jewelry, tattoo, backpack, permanent accessory, or unrelated prop;
- embedded weapons;
- text, UI chrome, frame, decorative border, or watermark-like element;
- Thick/Large-Framed rendered as obese or belly-heavy.

A failed image never advances to paid 3D conversion.

---

# 7. Modular runtime architecture

These remain separate versioned production assets:

```text
body
head
skin material
hair geometry
hair material
brows/facial hair
scars/tattoos/paint
jewelry/accessories
soft clothing
rigid armor
boots/gloves
weapon/offhand
shield
sheath/quiver/projectile
class effects
animation clips
```

## Head contract

- complete humanoid generation may use a temporary neutral head;
- technicalization creates a stable versioned head seam;
- modular heads share compatible topology, seam, scale, head bone, gaze, jaw, blink, expression, and viseme contracts;
- skin tones are primarily material families, not duplicated complete bodies.

## Hair contract

- hair is separate from head/body;
- hair color is separate from geometry;
- every style passes scalp, ear, shoulder, armor, locomotion, casting, and camera-clipping QA.

## Clothing and armor contract

- soft clothing conforms to the accepted body and canonical skeleton;
- rigid armor uses explicit bone attachments or limited weighting;
- every item declares coverage/hidden-body masks and fit variants as required;
- the canonical body source remains preserved and reversible;
- no clothing/armor is permanently fused to the base body.

## Weapon contract

Every weapon/offhand item is separate and declares applicable:

- primary grip;
- secondary/support grip;
- sheath/quiver socket;
- projectile origin;
- VFX/SFX marker sockets;
- collision/hit region;
- local forward/up axes;
- scale and pivot.

Animation files contain motion only, not permanent actor or equipment geometry.

---

# 8. Tripo lanes and image bakeoff

Treat separately:

- Tripo Studio browser;
- API/SDK;
- official CLI when separately verified.

A functioning Studio session does not prove API credits. A valid API key does not prove Studio allowance. Use the funded, working lane and record the selected lane.

For each important primary source, produce four images when available from the same locked brief:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI image A;
4. ChatGPT/OpenAI image B.

Reject incomplete/no-pedestal failures before aesthetic scoring. Preserve original files, hashes, provider/model/settings when exposed, comparison metrics, selected candidate, and owner verdict.

Before every charged operation, return:

```text
active lane
operation
provider/model/version
expected credits
maximum credits including approved retry envelope
current balance
projected remaining balance
owner approval state
```

No automatic charged retries.

---

# 9. First two Human pilot pipeline

For each pilot:

```text
locked brief
-> four-image full-asset bakeoff
-> owner image selection
-> exact-cost owner approval
-> Tripo full-body generation
-> immediate untouched download
-> task receipt + source hash
-> anomaly/full-body inspection
-> cleanup and part separation
-> retopology/decimation
-> UV/PBR bake and material validation
-> scale/origin/axis/pivot normalization
-> versioned head seam
-> canonical rig/skin
-> deformation QA
-> one modular head proof
-> one modular hair proof
-> one soft garment proof
-> one rigid equipment proof
-> one separate weapon/socket proof
-> browser-ready GLB
-> Three.js character creator/gameplay/paper-doll/headshot proof
-> desktop/mobile/real-GPU/performance proof
-> owner verdict
```

All geometry-changing operations occur before final rigging.

Minimum animation proof:

- idle;
- walk;
- run;
- turn;
- one interaction;
- one basic attack;
- one hit reaction;
- one death/terminal state;
- draw/sheath or equip/unequip where applicable.

Search the live Tripo preset library first. Accepted direct presets do not require duplicate DCC production. Substantial custom motions follow the Houdini KineFX versus Blender blinded bakeoff.

---

# 10. Work split and PR discipline

## #443 PR

Recommended branch:

`codex/443-character-matrix-v2`

Owns:

- canonical ancestry/presentation/build enums and matrix;
- calling eligibility/affinity contract;
- character creator;
- save validation/migration;
- runtime model/headshot/portrait resolution;
- machine-readable matrix;
- tests.

No paid asset generation.

## #435 PR

Recommended branch:

`codex/435-tripo-modular-character-foundation-v2`

Owns:

- provider-lane proof;
- image bakeoff and source ledger;
- Tripo pilot generation after approval;
- technicalization scripts and manifests;
- modular body/head/hair/clothing/armor/weapon contracts;
- rig/deformation/browser QA;
- machine-readable pilot ledger;
- tests.

#435 may perform read-only audit, provider preflight, manifests, prompts, and free image preparation while #443 is open. It may not finalize the batch matrix or submit paid model operations until #443 is owner-approved. Use stacked-PR discipline or rebase #435 after #443 merges.

## #448 relationship

#448 consumes only accepted #435 assets and owns full First Breach actor integration, NPCs, monsters, starter calling kits, complete combat/animation matrix, save/reload, boss, First Memory, and Heartvale exit.

Do not edit PR #460 from this kickoff. Integrate against the accepted post-#460 `qa` state.

---

# 11. Mandatory session receipts

Before editing or generating, return:

```text
SOULDRIFTER #487 SESSION RECEIPT
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|443-worker|435-worker|verifier>
issue: <487|443|435|488|489>
branch: <branch>
worktree: <absolute path>
localHead: <sha>
liveHead: <sha>
repositoryVisibility: <private|public|unknown>
contextVersion: <current START_HERE version>
cachedToolchainReceipt: PASS | REFRESH_REQUIRED | BLOCKED
tripoStudio: PASS | REFRESH_REQUIRED | UNAVAILABLE
tripoApiSdk: PASS | UNFUNDED | UNAVAILABLE
tripoOfficialCli: PASS | UNFUNDED | NOT_EXPOSED | UNAVAILABLE
imageBakeoffPolicyLoaded: yes/no
animationRoutingLoaded: yes/no
importedAssetGateLoaded: yes/no
issueAndPrStateFetched: yes/no
agentStateLoaded: yes/no
paidOperationPlanned: yes/no
blockingIssues: []
```

Then return:

```text
#487 CONTEXT RECEIPT
latestOwnerDirectionChecked: yes/no
issuesRead: []
prsRead: []
repoFilesRead: []
ancestryConflictStatus: RESOLVED | OWNER_DECISION_REQUIRED
firstPilots: [human-masculine-athletic, human-feminine-athletic]
remainingHumanBatch: BLOCKED
elfDwarfBatch: BLOCKED
currentScope: <concise>
nextOwnerGate: <concise>
```

No valid receipts means no implementation or generation.

---

# 12. First response required from every new chat

Before making changes, the new session must return:

1. current #443/#435/#448 implementation and asset audit;
2. live issue/PR/worktree/head state;
3. old-artifact keep/repair/regenerate/reject ledger;
4. Human/Elf/Dwarf versus Halfling/Drakkin conflict report;
5. exact #443 PR scope and migration strategy;
6. exact #435 PR scope and stacking/rebase strategy;
7. live Tripo Studio/API/CLI/allowance/balance status;
8. first two Human Athletic/Muscular pilot briefs;
9. four-image full-asset bakeoff plan;
10. no-pedestal/no-fused-gear rejection checklist;
11. geometry-before-rig pipeline;
12. modular head/hair/clothing/armor/weapon contracts;
13. Tripo preset/custom-animation routing;
14. exact expected and maximum cost for the first charged operation;
15. blockers and explicit owner decisions required.

## Hard stops

- no paid task before exact owner approval;
- no automatic paid retry;
- no other six Human bodies before both pilots pass;
- no Elf or Dwarf bodies before all eight Human bases pass;
- no unsupported fourth ancestry batch;
- no merge or deployment;
- no edit to PR #460;
- no claim that a structural test alone proves visual/runtime acceptance.

---

# 13. Copy/paste opening prompt

```text
Start SoulDrifter issue #487 using the repository-backed kickoff:

Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
kickoffs/ISSUE-487-CHARACTER-FOUNDATION-KICKOFF.md

Read it completely, then follow its mandatory reading list and fetch all live issue/PR state.

Use cached fast-start. Do not reinstall the full toolchain unless receipts require it.

Return the #487 Session Receipt and Context Receipt plus the complete first-response audit before editing, generating images, opening paid provider work, or changing runtime assets.

Use one orchestration program with two implementation PRs:
- #443 character matrix/data/save/runtime contract
- #435 Tripo modular asset foundation

First pilots only:
- Human masculine Athletic/Muscular
- Human feminine Athletic/Muscular

Every source must be full-body, complete, un-cropped, no pedestal/stand/platform, no fused clothing/hair/armor/weapon/accessories, and neutral underwear only.

Do not spend credits, batch-generate, merge, deploy, or modify PR #460 without explicit owner approval.
```
