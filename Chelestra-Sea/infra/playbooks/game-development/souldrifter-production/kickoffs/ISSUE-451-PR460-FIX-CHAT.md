# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

Use this as the opening assignment for a new M3, Claude Code, or ChatGPT/Codex session.

## Mission

Continue and **fix** the existing BREACH-V2 implementation. Do not rebuild the level from scratch. Preserve valid work on the branch, repair the remaining physical/runtime failures, and prove a complete playable First Breach from the Soul Well/vestibule through the selected route, gallery crawl, Cinderbound Warden, First Memory, and exit connector.

This is the current MVP blocker. Do not perform #448 playable-character/NPC/monster production in this task. Existing rollback actors may be used to prove the dungeon and gameplay spine.

## Owner correction — production onboarding is mandatory

Before any code, generation, Houdini build, animation, VFX, or asset integration:

1. read `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`;
2. prove Tripo API/SDK access with a live sanitized authenticated read;
3. inspect/install an exact provider-documented first-party CLI only if the authenticated Tripo console exposes one;
4. do not use the older unverified generic `tripo-cli` command;
5. verify Houdini version/Python/HOM/license/file format/export path;
6. verify Three.js, GLB tooling, real GPU, controlled storage, secrets, and asset registry;
7. return the full Production Toolchain Receipt.

A tool's name appearing in the playbook is not proof that it is installed or connected.

## Owner-directed pipeline pilot

After core toolchain preflight passes, this ticket also contains one controlled end-to-end ambient-fixture pilot:

`ISSUE-451-CHAINED-SKELETON-FIXTURE-PILOT.md`

The pilot creates 2–3 chained skeleton wall fixtures while keeping skeleton, chains/shackles, and wall anchors modular. It proves concept/reference -> Tripo -> segmentation/mesh editing -> rig -> custom struggle loop -> Three.js integration -> audio/VFX -> runtime QA.

No charged Tripo task may run until the exact current expected/max credit cost is shown and approved by the owner.

## Live target

- Issue: `#451`
- Draft PR: `#460`
- Branch: `codex/451-souldrifter-breach-v2`
- Live head at kickoff creation: `8b6b28bf66be9e531df1e5d94013375109e6a2ef`
- Base: `qa`
- Recorded worktree: `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2`
- Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
- Comparison seed: `4182`

The session must re-check the live PR head and discover/reuse the local worktree before editing.

## Copy/paste prompt

```text
You are the Production Orchestrator for SoulDrifter issue #451 and draft PR #460.

Do not rebuild the level. Continue the existing branch/worktree, preserve valid work, find the remaining real defects, and fix the First Breach until it is physically connected and playable through boss defeat, First Memory, and the exit.

STOP BEFORE EDITING OR GENERATING ANYTHING.

First read and execute:
- SoulDrifter `START_HERE.md`
- `ONBOARDING.md`
- `AUTO_DISCOVER_WORKSPACE.md`
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`
- this #451 kickoff
- `ISSUE-451-CHAINED-SKELETON-FIXTURE-PILOT.md`

Before editing:
1. Auto-discover the existing The-Nexus checkout and all worktrees.
2. Reuse the existing #451 worktree; do not ask the owner to select or recreate it unless discovery fails.
3. Verify repo root, branch, local HEAD, status, remote, and `git worktree list --porcelain`.
4. Fetch live issue #451 and every comment; fetch PR #460 and every comment/review; reconcile local HEAD with the live PR head without resetting unexplained work.
5. Read the binding game AGENTS.md; `docs/DUNGEON_BUILD_RUNBOOK.md`; `docs/TICKET-BREACH-V2.md`; `docs/FIRST_BREACH_REBUILD_RUNBOOK.md`; `docs/LEVEL_01.md`; the review/handoff docs; registry; generator; layout; and preview files.
6. Load or create `.agent-state/451/` ticket contract, completion ledger, evidence manifest, handoff, spatial connection matrix, toolchain receipt, and provider receipt.
7. Return all three before making changes:
   - SoulDrifter Onboarding Receipt
   - SoulDrifter Production Toolchain Receipt
   - Context Receipt

TRIPO CONNECTION PROOF
- Do not claim Tripo is connected from a runbook.
- Prefer the official Tripo v3 JS/TS SDK `@vastai/tripo-sdk` or official Python SDK `tripo3d`.
- Verify `TRIPO_API_KEY` exists in secret storage without printing it.
- Make a live read-only authenticated balance call and record a sanitized result.
- If the owner's Tripo console provides a first-party CLI, inspect the exact current provider instructions, publisher/package/version and health/auth commands before installing it.
- Do not install an unverified similarly named `tripo-cli` package.
- MCP is optional and must be separately proven; the official Tripo MCP/Blender lane does not replace API/SDK proof.
- Read current official capabilities and pricing for generation, segmentation, low-poly, rig check, rigging and retargeting.
- No charged call until exact expected/max credits are shown and owner-approved.

HOUDINI PROOF
- Detect Houdini version/build, hmaster/hython paths, `hou` import, current license category and scene format.
- Apprentice currently remains prototype/non-commercial; particles/Pyro/Vellum/KineFX are available, but production export/commercial/Engine rules remain restricted.
- Record the planned clean switch to Houdini Indie next week: `.hiplc`/`.hdalc`, commercial/export/Engine revalidation, and no non-commercial HDA contamination.

Important failure history: earlier nav-only proof missed intact wall geometry behind route gates. Therefore graph connectivity, coordinates, pathfinding success, room warp, and a visible door are not sufficient proof. Every required edge must have a real source aperture, correctly seated portal, continuous corridor floor/walls/ceiling, real destination aperture, synchronized collision, player-capsule clearance, WASD traversal, click-to-move traversal, and fresh visual proof.

Use Agent Team in sequence:
- Explore: read-only requirements/code/runtime/toolchain audit and independent expected route graph.
- Coder/Worker: implementation in the existing #451 worktree.
- Independent Verifier: fresh adversarial review after producer commits.
- Real-GPU verifier where needed.

Do not allow multiple producer agents to edit the same dungeon/runtime files concurrently.

First perform a no-edit baseline audit. Test Wayfarer and Oathbreaker from the vestibule. Build a connection matrix for:
Soul Well/Vestibule -> tutorial interactions -> Threshold Plaza -> selected route gate -> guide passage -> 3–5 connected galleries -> convergence/Ashen Threshold -> Ashen Lock/Warden -> First Memory -> Way Upward/Heartvale exit.

Dungeon Survey Controls warps are inspection tools only; never use them as traversal proof.

Fix in this order:
P0-A physical topology: apertures, gates, corridors, destination openings, continuous shells/ceilings.
P0-B collision/nav/player traversal: open/closed synchronization, capsule clearance, WASD, click-to-move, prop obstructions.
P0-C gameplay spine: route selection, exactly 3–5 chambers, encounters, boss defeat, First Memory once, exit, save/reload.
P1 visual/technical acceptance: sealed rooms, no floating/intersecting props, source orientation, readable lighting, material fidelity, real-GPU rendering, performance, desktop/narrow viewport.
P1-PILOT: only after the core path is stable and the provider spend gate is approved, execute the chained-skeleton fixture pilot end to end.

For the chained-skeleton pilot:
- use a clean skeleton body with no fused chains/wall;
- reuse or separately create chain/shackle and wall-anchor props;
- if a combined segmentation comparison is approved, segment before rigging;
- complete all geometry-changing operations before rigging;
- use Tripo rig check/rig as approved, then author the actual constrained struggle loop in Houdini KineFX or Blender if no suitable preset exists;
- keep chain endpoints attached to wall anchors and wrist/ankle sockets;
- add restrained chain-rattle/bone-creak audio as a separate runtime contract;
- place only 2–3 fixtures in legal wall sockets with no traversal/combat/camera obstruction;
- capture full provenance, cost, hashes, deformation, animation, chain separation, runtime and real-GPU evidence.

Do not restart Houdini composition, replace the flat map/registry without a proven minimal defect, regenerate #448 characters/monsters, merge, deploy, or close the issue.

Required proof:
- Wayfarer and Oathbreaker.
- Seed 4182 plus representative sparse/median/dense seeds and committed fixtures where practical.
- WASD and click-to-move.
- real-time default plus turn-based smoke on the same simulation.
- continuous no-warp route evidence; at least one full run through boss, First Memory, and exit.
- every major threshold from both sides, closed/open states, corridor midpoint, destination doorway, shell/ceiling.
- real GPU through ANGLE/D3D11; fail SwiftShader/llvmpipe/software GL.
- zero shader compile failures; account for the prior 16-texture-unit failure and target materials at or below 12 effective units where shadows/environment consume the balance.
- typecheck, full tests, build, release verification, diff check, and ticket-specific tests.

A producer may mark work only `IMPLEMENTED_UNVERIFIED`. Only an independent verifier may mark requirements `VERIFIED` or the ticket `OWNER_READY`. Do not merge or deploy.
```

## Acceptance summary

The ticket is not ready because tests are green or because PR #460 exists. It is ready only after an independent verifier physically walks the required graph, completes boss -> First Memory -> exit, validates both movement systems and both combat-mode smoke paths, confirms real-GPU rendering, and—if the chained-skeleton pilot is approved and run—verifies the entire provider-to-runtime artifact lineage.