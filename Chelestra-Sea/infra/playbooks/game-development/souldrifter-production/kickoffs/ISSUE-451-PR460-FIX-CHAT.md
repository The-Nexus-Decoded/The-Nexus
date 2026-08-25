# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

Use this as the opening assignment for a new M3, Claude Code, or ChatGPT/Codex session.

## Mission

Continue and **fix** the existing BREACH-V2 implementation. Do not rebuild it from scratch. Preserve valid work, repair the remaining physical/runtime failures, and prove a complete playable First Breach from the Soul Well/vestibule through route choice, gallery crawl, Cinderbound Warden, First Memory, and exit connector.

Issue #451 remains the current MVP blocker. Do not absorb #448 playable-character/NPC/monster production. Existing rollback actors may prove the dungeon/gameplay spine.

## Timing and onboarding

### Toolchain setup happens before production—but only once per workstation

The machine must have a valid cached production-toolchain receipt covering the ticket-required Tripo, Houdini, Blender, Three.js, real-GPU, storage and media lanes.

A new chat does **not** repeat full installation and smoke testing. It follows `SESSION_FAST_START.md`, loads the cached receipt, checks freshness, fetches live ticket state, and returns a short Session Receipt.

Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when the receipt is missing/stale/invalid or a major tool/license/secret changes.

Immediately before any paid Tripo operation, identify the active Tripo lane, refresh its live balance/pricing/allowance and obtain exact owner approval.

### The chained-skeleton pilot is the final ticket phase

Do not generate or animate the chained skeleton during onboarding or early dungeon repair.

```text
Phase -1: cached fast-start or one-time machine bootstrap
Phase 0: read-only baseline audit
Phase 1: fix topology, apertures, corridors, collision and traversal
Phase 2: fix complete gameplay spine through boss, First Memory and exit
Phase 3: visual/material/FX/performance/mobile and real-GPU acceptance
Phase 4: independent verifier passes the core dungeon
FINAL PILOT: after exact Tripo spend approval, run the chained-skeleton fixture pipeline
Phase 6: independent verification of pilot + full regression
```

The skeleton pilot must never delay investigation of a broken room connection and is not part of onboarding.

## Live target

- Issue: `#451`
- Draft PR: `#460`
- Branch: `codex/451-souldrifter-breach-v2`
- Base: `qa`
- Recorded worktree: `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2`
- Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
- Comparison seed: `4182`

The session must re-check live PR head and rediscover/reuse the local worktree before editing.

## Required shared documents

Read from branch `infra/game-production-playbooks`:

- `START_HERE.md`
- `SESSION_FAST_START.md`
- `config/onboarding-cache-policy.json`
- `ONBOARDING.md` only when full bootstrap is required
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when full bootstrap/refresh is required
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `HOUDINI_APPRENTICE_POC_POLICY.md`
- `config/tripo-provider.json`
- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/animation-bakeoff-policy.json`
- `ISSUE-451-CHAINED-SKELETON-FIXTURE-PILOT.md`

## Image/reference policy

For the final fixture pilot and any important new 3D-source reference, use the four-candidate image bakeoff when the live lanes are available:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI image candidate A;
4. ChatGPT/OpenAI image candidate B.

Verify the exact Studio model labels and current free/bonus allowance in the authenticated UI.

Every primary reference must show the **entire asset in frame**—not only characters. Full skeleton, chains, wall anchors, props, weapons, fixtures, furniture and environment objects must be fully visible with no cropped critical geometry. Close-up images are supplemental only.

## Tripo 3D policy

Treat Tripo Studio browser, API/SDK and official CLI as distinct lanes; their credentials/credits may differ.

Select the active lane from live evidence:

- `API_SDK_PRIMARY` when authenticated and funded;
- `OFFICIAL_CLI_PRIMARY` only when a first-party CLI is separately documented, authenticated and funded;
- `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable or unfunded but Studio is active.

A blocked API/CLI lane must not block Studio browser use.

Use Tripo for approved 3D generation, upload/download, segmentation, mesh completion/decimation, rig check, rigging, preset retargeting and any separately verified custom-motion capability.

Do not install the old unverified generic `tripo-cli` package.

## Houdini Apprentice non-commercial POC policy

SoulDrifter is currently owner-declared as a free, non-commercial POC/playground. Read `HOUDINI_APPRENTICE_POC_POLICY.md`.

While that classification remains accurate, **use the full FX tools exposed by Houdini Apprentice**. Do not replace realistic water, lighting, particles, Pyro, Vellum, KineFX, RBD, materials, shaders, fog or volumetrics with crude placeholders merely because the license is free.

Apprentice restrictions remain binding: non-commercial use/formats, no mixing into Indie/commercial pipelines, no Apprentice HDA through Houdini Engine, render/renderer restrictions and exact exporter restrictions.

A free public app is not automatically non-commercial if it promotes a business, supports client work, solicits investment, monetizes related services or feeds a commercial pipeline. Pause if project purpose changes or is uncertain.

Three.js remains runtime. Smoke-test the exact representation required for every effect. If Apprentice supports the full effect but restricts final export, preserve the high-fidelity POC source and schedule a clean Indie export/rebuild rather than lowering the effect before proving the restriction.

The planned Indie upgrade primarily establishes the limited-commercial/Engine/export/rendering lane; it is not needed merely to unlock the main FX tools already available in Apprentice.

## Custom animation

Search the live Tripo preset library first. A direct accepted preset does not require duplicate DCC production.

Every required custom animation not adequately covered by Tripo—plus substantial constrained, interaction, class-specific, weapon-specific, boss, signature-death or acting motion—must produce:

1. Houdini KineFX candidate;
2. Blender candidate;
3. identical locked inputs and acceptance rules;
4. automated gates;
5. blinded independent AI comparison;
6. blinded owner A/B verdict;
7. winner integration;
8. preservation of both source packages and metrics.

## Copy/paste prompt

```text
You are the Production Orchestrator for SoulDrifter issue #451 and draft PR #460.

Do not rebuild BREACH-V2. Continue the existing branch/worktree and preserve valid work.

FIRST: perform the cached session fast start—not a full reinstallation by default.

Read:
- START_HERE.md
- SESSION_FAST_START.md
- config/onboarding-cache-policy.json
- IMAGE_REFERENCE_BAKEOFF_POLICY.md
- HOUDINI_APPRENTICE_POC_POLICY.md
- this #451 kickoff

Auto-discover and reuse the existing #451 worktree. Fetch issue #451, every issue comment, PR #460, every PR comment/review and the live head. Load `.agent-state/451/`.

Load the persistent toolchain receipts from:
H:\CodexData\souldrifter-toolchain\receipts\

If receipts are valid, do not reinstall packages or repeat the full Houdini/Blender/GPU smoke suite. Return the short SoulDrifter Session Receipt and Context Receipt.

If a receipt is missing/stale/invalid, run the one-time full bootstrap from ONBOARDING.md and PRODUCTION_TOOLCHAIN_PREFLIGHT.md. The bootstrap may install/configure tools and perform no-charge checks, but it must not generate ticket assets or submit paid tasks.

Do not edit until the receipts are complete.

For Houdini, record the current owner-declared project usage mode as NONCOMMERCIAL_POC and verify the actual Apprentice license/build. Do not block particles, Pyro, FLIP/procedural water, Vellum, KineFX, lighting, materials, shaders, fog or volumetrics merely because the license is Apprentice. Use every required available FX feature for the POC while respecting Apprentice file/render/renderer/Engine/export restrictions.

Then perform a read-only baseline audit. Test Wayfarer and Oathbreaker from the vestibule and derive the expected graph independently:

Soul Well/Vestibule
-> tutorial interactions
-> Threshold Plaza
-> selected route aperture/gate
-> guide passage
-> 3–5 connected galleries
-> convergence/Ashen Threshold
-> Ashen Lock/Warden
-> First Memory
-> Way Upward/Heartvale exit

Earlier nav-only proof missed intact wall geometry behind route gates. A graph edge, coordinate, warp, visible door or pathfinding result is not sufficient. Every required edge needs:
- source wall aperture;
- correctly seated portal/gate;
- continuous connector floor/walls/ceiling;
- destination aperture;
- synchronized open/closed collision;
- player-capsule clearance;
- WASD traversal;
- click-to-move traversal;
- fresh visual evidence;
- independent verification.

Fix in this order:
1. physical topology and room connections;
2. collision, nav and real-player traversal;
3. route choice and 3–5 chamber crawl;
4. boss defeat, First Memory once, exit and save/reload;
5. full-fidelity shells, ceilings, realistic water/lighting/materials/FX where appropriate, mobile/narrow viewport, performance and real-GPU acceptance;
6. independent core-dungeon verification.

Do not let Apprentice licensing become a generic excuse for lower-quality water, lighting, shading, particles or animation. Only record a blocker after proving the exact feature/export restriction in the installed build.

Only AFTER the independent verifier marks the core dungeon VERIFIED may the final chained-skeleton pilot begin, and only after the owner approves the exact current Tripo expected/max credits.

For that final pilot, read:
- ISSUE-451-CHAINED-SKELETON-FIXTURE-PILOT.md
- ANIMATION_PROVIDER_ROUTING.md
- CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md

The final pilot uses the four-candidate full-asset image bakeoff, Tripo 3D generation/processing/rigging through the active lane, separate skeleton/chains/wall anchors, one Houdini KineFX struggle candidate, one Blender struggle candidate, blind AI review, owner A/B verdict, winner integration and full regression.

Do not merge, deploy, close the issue, reset existing work, regenerate #448 actors or submit unapproved provider operations.

Producer status stops at IMPLEMENTED_UNVERIFIED. Only independent verification may mark VERIFIED/OWNER_READY.
```

## Core acceptance before final pilot

The core #451 dungeon must already pass:

- Wayfarer and Oathbreaker;
- seed 4182 plus representative additional seeds;
- continuous no-warp traversal;
- WASD and click-to-move;
- exactly 3–5 connected gallery chambers;
- Warden defeat;
- First Memory awarded once;
- exit connector;
- save/reload;
- real-time default and turn-based smoke;
- full-fidelity required POC water/lighting/material/FX implementation where in scope;
- real GPU/ANGLE D3D11;
- zero shader/asset/console failures;
- typecheck, tests, build, release verification and diff check;
- independent verifier.

Only then is the chained-skeleton pilot eligible to run.