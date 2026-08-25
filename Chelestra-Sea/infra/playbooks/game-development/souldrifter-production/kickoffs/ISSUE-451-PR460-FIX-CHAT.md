# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

Use this as the opening assignment for a new M3, Claude Code, or ChatGPT/Codex session.

## Mission

Continue and **fix** the existing BREACH-V2 implementation. Do not rebuild the level from scratch. Preserve valid work on the branch, repair the remaining physical/runtime failures, and prove a complete playable First Breach from the Soul Well/vestibule through the selected route, gallery crawl, Cinderbound Warden, First Memory, and exit connector.

This is the current MVP blocker. Do not perform #448 character/model generation in this task. Existing rollback actors may be used to prove the dungeon and gameplay spine.

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

Before editing:
1. Auto-discover the existing The-Nexus checkout and all worktrees.
2. Reuse the existing #451 worktree; do not ask the owner to select or recreate it unless discovery fails.
3. Verify repo root, branch, local HEAD, status, remote, and `git worktree list --porcelain`.
4. Fetch live issue #451 and every comment; fetch PR #460 and every comment/review; reconcile local HEAD with the live PR head without resetting unexplained work.
5. Read the binding game AGENTS.md; this SoulDrifter production playbook; `docs/DUNGEON_BUILD_RUNBOOK.md`; `docs/TICKET-BREACH-V2.md`; `docs/FIRST_BREACH_REBUILD_RUNBOOK.md`; `docs/LEVEL_01.md`; the review/handoff docs; registry; generator; layout; and preview files.
6. Load or create `.agent-state/451/` ticket contract, completion ledger, evidence manifest, handoff, and spatial connection matrix.
7. Return a Context Receipt before making changes.

Important failure history: earlier nav-only proof missed intact wall geometry behind route gates. Therefore graph connectivity, coordinates, pathfinding success, room warp, and a visible door are not sufficient proof. Every required edge must have a real source aperture, correctly seated portal, continuous corridor floor/walls/ceiling, real destination aperture, synchronized collision, player-capsule clearance, WASD traversal, click-to-move traversal, and fresh visual proof.

Use Agent Team in sequence:
- Explore: read-only requirements/code/runtime audit and independent expected route graph.
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

Do not regenerate environment assets, restart Houdini composition, replace the flat map/registry without a proven minimal defect, regenerate characters/monsters, perform paid provider operations, merge, deploy, close the issue, or absorb #448 scope.

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

The ticket is not ready because tests are green or because PR #460 exists. It is ready only after an independent verifier physically walks the required graph, completes boss -> First Memory -> exit, validates both movement systems and both combat-mode smoke paths, and confirms real-GPU rendering from the current commit.
