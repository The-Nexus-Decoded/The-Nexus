I created a completely separate, genre-agnostic game-production pipeline so the SoulDrifter playbook can remain detailed and project-specific without limiting future games.

## Architecture

**Universal Core + Genre/Platform Modules + Project Overlay + Ticket State + Independent Verification**

The universal core contains reusable production process: onboarding, workspace/worktree discovery, M3/Claude/ChatGPT coordination, requirements compilation, agent roles, asset/action contracts, QA, performance, saves, networking, deployment, and release gates.

Each game then adds a small `project-profile.json` and a project-specific overlay. A shooter, flight simulator, strategy game, mobile puzzle game, multiplayer title, 2D game, VR game, or nested mini-game loads only the modules it needs.

SoulDrifter stays separate and keeps all of its detailed classes, combat systems, Tripo pipeline, asset matrices, GitHub branches, and owner decisions. The universal harness does not replace or weaken it.

## Included modules

- Action / Adventure / RPG
- FPS / TPS Shooter
- Flight / Vehicle Simulation
- Racing
- Strategy / Tactics
- Builder / Management / Sandbox
- Survival / Crafting
- Platformer / Puzzle
- Fighting / Sports
- Card / Board / Turn-Based
- Multiplayer / Social
- Narrative / Adventure
- Nested mini-games / games within games
- 2D, 3D, Mobile/Web, Desktop/Console-oriented, and VR/XR platform modules

## Recommended use

1. Reference/copy the universal harness.
2. Create `project-profile.json`.
3. Select genre and platform modules.
4. Create a project overlay/canon index.
5. Run onboarding and the global audit.
6. Define and prove one vertical slice.
7. Pilot AI/provider pipelines before batching assets.
8. Fan work out to parallel-safe agents.
9. Require independent verification before owner-ready or release-ready status.

The local portable archive also includes the full Word playbook, complete reusable agent/skills package, and standalone START_HERE instructions.
