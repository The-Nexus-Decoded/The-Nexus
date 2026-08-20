# First Breach Independent 3D Rebuild Handoff

Status: **reference package; current level design rejected**
Issue: [The-Nexus #450](https://github.com/The-Nexus-Decoded/The-Nexus/issues/450)
Reference branch: `codex/450-houdini-apprentice-first-breach`
Reference worktree: `H:\CodexData\.codex\worktrees\0794\The-Nexus-fleet-normalization`
Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
Pre-handoff source HEAD: `14705ab9`
Owner-review seed: `4182`
Houdini: `22.0.368`, Apprentice / non-commercial

## 1. Purpose and creative freedom

This is a neutral handoff for a new agent to create an **independent** First Breach environment design. The current Houdini composition, its placement choices, its room dressing, and the earlier visual-correction proposal are not design references.

The new agent should inherit only:

- canonical story and gameplay rules;
- the real asset files and their provenance;
- the deterministic dungeon generator and integration points;
- technical, licensing, credit, and web-performance constraints;
- factual records of what failed.

The new agent is free to choose its own architecture, composition, lighting language, material treatment, room dressing, and Houdini construction strategy. It should not copy the rejected scene or try to polish the existing scatter.

The overall environment concept image and the previous visual-acceptance document are retained only as historical artifacts. They are deliberately excluded from the required design inputs.

## 2. Branch and ticket handoff

1. Create a new GitHub ticket for the independent redesign.
2. Create a dedicated worktree and ticket branch from the final pushed commit of `codex/450-houdini-apprentice-first-breach`. The owner explicitly requested that this reference branch supply the assets and rules.
3. Do not continue level-design work directly on the reference branch.
4. Record the new issue number, branch, worktree, and starting commit before editing.
5. Do not deploy, merge, or release the new design before owner review.

Example after the new ticket number is known:

```powershell
git fetch origin
git worktree add <NEW-WORKTREE-PATH> -b codex/<TICKET>-first-breach-independent-redesign origin/codex/450-houdini-apprentice-first-breach
```

## 3. Direct answer: 3D isometric versus tile-based

The current Houdini and Three.js implementations use real 3D geometry, PBR materials, lights, depth, and an orthographic three-quarter camera. They are technically 3D, not sprites.

They looked tile-based because the visible floor and wall construction exposed the logical gameplay grid. That was a failure of the art layer, not a requirement.

The independent rebuild must use:

- real 3D geometry;
- an isometric/orthographic or near-orthographic three-quarter gameplay camera;
- a hidden logical grid for navigation, targeting, encounters, and deterministic generation;
- a visually continuous environment that does not expose repeated square cells, checkerboards, or obvious module seams at gameplay distance.

“Seamless” does not require one giant mesh. It means the visible environment does not advertise its underlying gameplay cells.

## 4. Canonical level and story rules

Authoritative sources:

1. `docs/LEVEL_01.md` — current First Breach contract.
2. `docs/GAME_BIBLE.md`, section **Tutorial and Zone 1 Adaptation** — wider canon and outdoor-world hook.
3. `src/game/dungeon.ts` — authoritative seeded dungeon generator.

Player progression:

1. The player awakens from the Soul Well in the Realm-Lock Vestibule.
2. The player learns movement and interaction.
3. Wellkeeper Ilyra presents the Chronicle of Returning and the SoulDrifter mission.
4. The player uses the Memory Loom to allocate exactly three final stat points, one ancestry boon, and one base-calling discipline.
5. The player inspects starter equipment, opens the Wayfarer's Coffer, and rehearses level-one actions with the true training effigy.
6. The player compares and selects Wayfarer or Oathbreaker.
7. Breach Scout Orren and Arena Warden Brannoc occupy a safe guide passage before the hostile threshold.
8. The player clears a randomized three-to-five-chamber Fractured Galleries crawl.
9. The player defeats the Cinderbound Warden in the Ashen Lock.
10. The player recovers the First Memory and opens the route toward the outdoor starting realm.

Locked topology:

```text
Realm-Lock Vestibule
  -> paired Wayfarer/Oathbreaker choice
  -> shared safe guide passage
  -> randomized 3-5 chamber Fractured Galleries crawl
  -> shared Ashen Lock miniboss room
  -> First Memory / outdoor-world hook
```

Wayfarer and Oathbreaker are difficulty presets, not separate maps. They converge on the same seeded crawl and miniboss room while changing enemies, Realm Pressure, rewards, and bonus-skill chance.

## 5. Functional level requirements

These rules constrain function, not visual design.

### Realm-Lock Vestibule

- Must support the full Ilyra, Memory Loom, starter-equipment, coffer, training, and route-choice tutorial sequence.
- Must contain the true Memory Loom and true training effigy; an altar or decorative statue is not a valid substitute.
- Must contain two separate physical exits for Wayfarer and Oathbreaker.
- Must contain a circular Soul Well that reads as a small pool with visible glowing/shimmering water and a credible player-emergence point.
- Must preserve clear navigation among the player start, Ilyra, Memory Loom, coffer, training interaction, and both gates.

### Guide passage and Fractured Galleries

- Orren and Brannoc remain in a safe area before the combat threshold.
- Each run contains exactly three to five connected gallery chambers.
- Chambers, bends, blockers, encounters, and dressing may vary by seed while all required locations remain reachable.
- Combat areas require clear movement, enemy approach, targeting, and interaction space.

### Ashen Lock

- Both difficulty choices converge on the same miniboss room.
- The Cinderbound Warden's difficulty and reward follow the selected trial preset.
- The First Memory and post-boss route must be reachable and awarded once.

### Gameplay systems that must survive the rebuild

- navigation and pathfinding;
- collision and occupancy;
- WASD/arrow and mouse-floor movement;
- tactical and real-time modes using one simulation;
- enemy spawns and thresholds;
- NPC and object interactions;
- door unlock/choice sequence;
- destructible-prop categories and cleared collision where applicable;
- camera zoom and Q/E three-quarter rotation;
- deterministic seeds and unique object IDs;
- persisted player, inventory, encounter, and reward state.

## 6. Procedural generation rules

The layout must remain somewhat randomized. The new design may replace the existing visual placement algorithm, but must keep deterministic, reachable gameplay.

- A layout seed controls topology, chamber count, corridors, blockers, and encounter placement.
- A dressing seed may control environment variation.
- Mandatory story objects and interactions remain semantically fixed even when their exact approved presentation varies.
- Different seeds must not block doors, NPCs, spawns, combat space, quest objects, or the route to the boss/reward.
- Reusing a seed must reproduce the same result.
- `roomId` is not sufficient to determine exact membership because passage cells can inherit an adjacent room ID. Use exact zone/polygon membership.
- Randomization should select legal room configurations or placement sockets. It must not scatter arbitrary large objects into open cells.
- Validate at least sparse, median, and dense representative seeds. Keep seed `4182` as the direct comparison seed.

Minimum placement metadata:

```text
zoneId
roomId
placement type
facing/surface normal
footprint and height
clearance
blocking/nonblocking
allowed/forbidden tags
distance from doors, paths, spawns, interactions, and combat centers
```

The next agent may define a completely different socket, cluster, grammar, or procedural system as long as these safety properties hold.

## 7. Complete environment asset locations

All paths below are relative to the game root unless shown as absolute.

| Asset set | Location | Verified contents |
| --- | --- | --- |
| Environment reference sheets | `docs/3d-ai-studio/reference-sheets/environment/` | 37 committed PNGs, 74.28 MiB |
| Untouched/source environment models | `docs/3d-ai-studio/source-models/environment/` | 37 committed GLBs, 42.48 MiB |
| Optimized web/runtime models | `public/assets/3d/environment/dungeon-kit/` | 37 committed GLBs, 3.59 MiB |
| First Breach floor/wall PBR maps | `public/assets/textures/environment/first-breach/` | 8 JPG maps, 6.96 MiB |
| Houdini source scene | `source-assets/houdini/first-breach-apprentice.hipnc` | 1 rejected historical scene, 8.25 MiB at `14705ab9` |
| Completion asset manifest | `docs/3d-ai-studio/dungeon-completion-kit-register.json` | 16 completion assets with task IDs, hashes, sizes, and credit record |
| Runtime asset catalog | `src/game/environment/DungeonPropCatalog.ts` | 38 logical asset IDs with URLs, scale, footprint, and placement metadata |
| Runtime asset loader | `src/game/environment/DungeonPropKit.ts` | Three.js loading, model preparation, and fixture hooks |

The environment reference directory has 37 images while the runtime registry has 38 logical IDs because the logical `hanging-brazier` currently reuses the physical `floor-brazier.glb`. There are 37 physical source models and 37 optimized runtime models.

Logical environment asset IDs:

```text
archive-bookshelf
archive-cupboard
storage-chest
reinforced-crate
storage-barrel
trestle-table
heavy-bench
high-backed-chair
empty-weapon-rack
wall-torch-sconce
floor-brazier
hanging-brazier
cave-in-rubble
masonry-barricade
bone-pile
chain-shackle
ruined-altar
heavy-door
false-wall-panel
supply-pile
corruption-growth
guardian-statue
ruined-stone-archway
reliquary-wall-alcove
broken-stone-stair-dais
wooden-support-brace
rusted-portcullis
iron-floor-grate
collapsed-timber-masonry-pile
hanging-iron-cage
candelabra-cluster
bottles-jugs-crockery-cluster
weapon-armor-heap
broken-handcart
monster-egg-nest
cocooned-remains-web-mass
shed-chitin-pile
burrowed-wall-breach-plug
```

Known inventory gaps:

- `hanging-brazier` has no independent source model; it reuses `floor-brazier.glb`.
- `archive-bookshelf.glb` exists in source and runtime directories but has no dedicated committed neutral reference sheet.
- `sack-bundle-cluster`, `rope-coil-and-hook`, and `loose-books-and-scrolls-pile` were deferred and do not exist in the branch.
- No dedicated painting/banner/relief asset family exists.
- The true Memory Loom, training effigy, Soul Well water, and First Memory are custom gameplay landmarks, not items from the 38-prop environment kit.

The old broad environment concept is stored at `public/assets/generated/first-breach-environment-v1.png`, but it is **not an input or visual target for the independent redesign**.

## 8. Model and texture fidelity rules

- The untouched committed source GLB is the model/material authority.
- Preserve base color, normal, metallic, roughness, occlusion, emissive, opacity, double-sided state, UVs, samplers, and material factors actually present in the source.
- In standard glTF combined metallic/roughness maps, green is roughness and blue is metallic.
- Do not guess a color, apply a generic material, weaken metallic response, tint an import, or replace an approved model with a primitive to make it fit the scene.
- Intentional recolors must be separately named, versioned material variants and require owner approval. The original material remains preserved.
- Compare source GLB, Houdini import, and Three.js runtime from matching neutral angles before accepting an import.
- Scene lighting may change mood but must not erase the authored asset identity.

Houdini 22 cannot directly use embedded GLB images through its GLTF SOP. The current builder extracts a reproducible ignored cache to:

```text
source-assets/houdini/.cache/dungeon-kit-textures/
```

The cache is not tracked and is never the source of truth.

## 9. Credits, licensing, and provider state

- The completion register records 16 Prism 3.1 image-to-3D assets at 35 credits each, 560 credits total.
- The same register records a final balance of 819 and a hard minimum balance of 800.
- A separate shared-account task consumed 45 credits during that batch.
- Do not submit any paid generation, texture, rig, animation, remesh, purchase, or retry operation without a new exact-cost owner approval.
- Do not regenerate the existing assets merely to change the level design.
- Houdini Apprentice is non-commercial. Its `.hipnc` and Apprentice exports are for prototyping/review.
- The browser cannot run a `.hipnc`. Approved environment data must be exported into web-friendly meshes/materials/textures/effects and rendered by Three.js.

## 10. Source and integration map

| Responsibility | File |
| --- | --- |
| Canonical level contract | `docs/LEVEL_01.md` |
| Broader story/open-world context | `docs/GAME_BIBLE.md` |
| Houdini pipeline and Apprentice limitations | `docs/HOUDINI_FIRST_BREACH_PIPELINE.md` |
| Asset visual-parity contract | `docs/3d-ai-studio/README.md` |
| Character/NPC/monster scope | `docs/3d-ai-studio/FIRST_BREACH_MODEL_PROGRAM.md` |
| Completion asset provenance | `docs/3d-ai-studio/dungeon-completion-kit-register.json` |
| Authoritative dungeon generator | `src/game/dungeon.ts` |
| Environment asset registry | `src/game/environment/DungeonPropCatalog.ts` |
| Environment model loader | `src/game/environment/DungeonPropKit.ts` |
| Rejected runtime composition mirror | `src/game/environment/HoudiniFirstBreachComposition.ts` |
| Soul Well runtime implementation | `src/game/environment/rooms/SoulwellChamber.ts` |
| Main Three.js world assembly | `src/game/World3D.ts` |
| Layout exporter | `scripts/houdini/export-first-breach-layout.mjs` |
| Houdini scene builder | `scripts/houdini/build-first-breach-apprentice.py` |
| Runtime GLB optimizer | `scripts/optimize-dungeon-kit.py` |
| Rejected Houdini scene | `source-assets/houdini/first-breach-apprentice.hipnc` |

Issue #448 and draft PR #449 cover production characters, matching Ilyra/Orren/Brannoc faces, First Breach monsters, and rig validation. Those are separate from the environment assets and should not be regenerated under the redesign ticket.

## 11. Reproduction commands

From the game root:

```powershell
$layout = Join-Path $env:TEMP 'souldrifter-first-breach-layout.json'
$obj = Join-Path $env:TEMP 'souldrifter-first-breach-environment.obj'
node --experimental-strip-types scripts/houdini/export-first-breach-layout.mjs 4182 $layout
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/build-first-breach-apprentice.py $layout source-assets/houdini/first-breach-apprentice.hipnc $obj .
```

Open Houdini:

```powershell
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hmaster.exe' source-assets/houdini/first-breach-apprentice.hipnc
```

On this machine, Houdini 22 headless OpenGL/Vulkan rendering and some launches crashed in the NVIDIA/OpenCL/Vulkan stack. The stable GUI fallback used:

```powershell
$env:HOUDINI_VULKAN_VIEWER_MULTITHREADING = '0'
$env:HOUDINI_OCL_DEVICETYPE = 'CPU'
$env:HOUDINI_OCL_OGL_INTEROP = '0'
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hmaster.exe' source-assets/houdini/first-breach-apprentice.hipnc
```

Run the local Three.js game:

```powershell
yarn dev
```

Current rejected comparison mode:

```text
http://127.0.0.1:5173/?debugSeed=4182&environment=houdini
```

This URL is useful for integration diagnostics only; it is not a design reference.

## 12. Factual iteration and failure history

| Commit | Work performed | Result relevant to the new agent |
| --- | --- | --- |
| `155aa263` | Added the reproducible Houdini Apprentice pilot | Established the toolchain; visible construction remained basic/repetitive. |
| `6ed8f7ea` | Reused existing floor/wall PBR assets | Preserved useful material sources. |
| `f8c0ac59` | Expanded architecture, materials, and atmosphere | No owner-approved checkpoint was preserved. |
| `cc9d52a1` | Added initial prop references | Reference/source foundation for the first kit. |
| `8b55f092` | Added initial source/runtime kit and interactions | Added 21 physical model families and loader/runtime scaffolding. |
| `a8383c8b` | Added the 16-asset completion kit | Reached 37 physical GLBs / 38 logical variants. |
| `01b8edf4` | Anchored runtime props and restored Soul Well water | Soul Well behavior is reusable; level composition was not solved. |
| `eac7b248` | Imported the kit into Houdini | Asset presence did not prove good placement or design. |
| `0b3ed848` | Restored embedded PBR maps in Houdini | Material extraction is reusable; visual parity still needs proof. |
| `f51fca4a` | Attempted complete kit placement | Opened separately during recovery and rejected by the owner. |
| `66b9cbcb` | Replaced legacy placeholder dressing | Automated placement remained sparse/implausible and introduced regressions. |
| `ce8ebc3e` | Added imported-fixture lighting | Did not produce an accepted scene. |
| `647314f8` | Added a local Three.js comparison mode | Technically loaded; exposed very dark skirmish/boss views and placement defects. |
| `e0ec68c4` | Paused deployment for visual audit | Correctly blocked release. |
| `14705ab9` | Recorded the rejected visual audit | Historical failure record, not new-agent design direction. |

Known technical/design failures to avoid:

- visible repeated floor/wall cells made the environment read as a tile map;
- generic boundary-cell placement put large objects in implausible locations;
- `roomId` leakage placed room props in passages;
- the Memory Loom and training effigy were incorrectly substituted with unrelated assets;
- gates were not convincingly fitted/readable;
- assets could be present but hidden, off-camera, too dark, incorrectly scaled, or materially wrong;
- the skirmish and boss runtime views could collapse into black;
- randomization acted like scatter instead of legal deterministic configurations;
- viewport, Houdini review render, and Three.js presentation did not match reliably;
- the rejected runtime proof reported 2,211 draw calls and 3.78 million triangles;
- full scripted iterations were attempted before the owner approved a visual direction.

No historical commit is designated as the recovered “good original.” The new agent should create a fresh design using the assets and rules, not select an old scene by assumption.

## 13. Technical acceptance rules for the independent design

The new agent chooses the visual design. Before handoff to QA, the implementation must still prove:

- real 3D isometric presentation with no obvious visible gameplay-cell repetition;
- all canonical interactions, encounters, routes, rewards, and story progression work;
- exactly three to five reachable gallery chambers across tested seeds;
- zero door, gate, NPC, spawn, combat-center, interaction, and route-clearance violations;
- the Soul Well reads and functions as a small glowing-water pool;
- both route choices are physically distinct and function correctly;
- source/Houdini/Three.js material identity is preserved for every used model;
- darkness never prevents the player from navigating, seeing enemies, or identifying required interactions;
- interactive light/destruction states remain synchronized with visuals and collision;
- no unexpected console errors, failed asset requests, or missing textures;
- documented renderer statistics and production build size;
- `yarn test`, `yarn typecheck`, `yarn build`, `yarn verify:release`, and `git diff --check` pass;
- owner approves local visual evidence before any QA deployment.

The production 150 MiB release cap remains enforced. QA/review code may report rather than fail the cap, but that is not permission to ship an oversized production build.

## 14. Required reading for the next agent

1. `docs/FIRST_BREACH_REBUILD_RUNBOOK.md` — neutral handoff and file map.
2. `docs/LEVEL_01.md` — canonical level rules.
3. `docs/GAME_BIBLE.md`, section **Tutorial and Zone 1 Adaptation** — story/open-world context.
4. `docs/3d-ai-studio/README.md`, section **Non-negotiable visual-parity gate** — asset fidelity.
5. `src/game/dungeon.ts` — authoritative random generator.
6. `src/game/environment/DungeonPropCatalog.ts` — complete environment asset registry.
7. `docs/HOUDINI_FIRST_BREACH_PIPELINE.md` — current build commands and license limits; treat its composition discussion as historical.
8. `.planning/.continue-here.md` and `.planning/HANDOFF.json` — exact handoff state.

Optional historical diagnostics, **not visual direction**:

- `docs/FIRST_BREACH_VISUAL_ACCEPTANCE_SPEC.md`
- `scripts/houdini/export-first-breach-layout.mjs`
- `scripts/houdini/build-first-breach-apprentice.py`
- `src/game/environment/HoudiniFirstBreachComposition.ts`
- `source-assets/houdini/first-breach-apprentice.hipnc`

## 15. Related work

- #450 — current environment branch and rejected implementation; open, `owner-qa:pending`.
- #448 — characters, NPC faces, monsters, and rig validation; separate workstream.
- PR #449 — draft model-program PR targeting `qa`.
- #435 — general 3D AI Studio modular intake contract.
- #437 — dual-release and build-size behavior.

At the start of this handoff, local HEAD was `14705ab9` while the remote reference branch was still at `ce8ebc3e`. The completed handoff commit must be pushed before the next agent creates its branch.
