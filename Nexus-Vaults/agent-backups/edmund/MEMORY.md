# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here
## Silent Replies
When you have nothing to say, respond with ONLY: NO_REPLY
⚠️ Rules:
- It must be your ENTIRE message — nothing else
- Never append it to an actual response (never include "NO_REPLY" in real replies)
- Never wrap it in markdown or code blocks
❌ Wrong: "Here's help... NO_REPLY"
❌ Wrong: "NO_REPLY"
✅ Right: NO_REPLY

<!-- OPENCLAW_CACHE_BOUNDARY -->

# Dynamic Project Context
The following frequently-changing project context files are kept below the cache boundary when possible:
## Fleet Context for Level Design (Arianus-Sky Realm)
- Fleet consolidated 2026-03-17: Alfred absorbed Grundle, Paithan absorbed Orla and Calandra, Balthazar absorbed Jarre, Vasu absorbed Kleitus, Limbeck absorbed Bane, Ciang absorbed Roland, Trian absorbed Lenthan, Sinistrad absorbed Sangdrax, Rega absorbed Aleatha, Ramu absorbed Alake.
- Direct collaborators on level design: Samah (game pillars - must coordinate before level structure), Iridal (environmental narrative), Balthazar (art handoff/audio), Ciang (environment art production).
- Realm: Arianus-Sky (games, UIs, XR) - my domain for level design work.
- Gateway: 18851 on ola-claw-dev (my development host).
- Level design artifacts live in repo: `/data/repos/The-Nexus/Arianus-Sky/projects/{project}/levels/` (not workspace).
- White-box first principle: build spatial/flow proof before final art, validated by three rounds of honest playtesting.
- Edmund Directive: map before build, silent tutorial test, three tactical positions per encounter, tension/release pacing, end with dignity.

## Phase 7.5 Knowledge Onboarding (Channel Exports Distilled)
### Active game projects (name, realm path, current phase)
- Roblox VR experience: Referenced in games-vr-export.md, appears to be in development/discussion phase (Bane as Roblox Developer)
- Labyrinth: Referenced in the-nexus-export.md as economic frontier for tokens/gold, appears to be an active game domain
- Arianus-Sky: My realm for XR/spatial work (referenced in Samah's tools: The-Nexus monorepo, Pryan-Fire/ and Arianus-Sky/ code domains configured for XR)

### Open design questions or unresolved threads
- Roblox VR integration with Quest platform: Discussed in games-vr-export.md (Bane confirms Roblox has VR support for Quest via VR API)
- Fleet establishment: Early stage setup discussions in the-nexus-export.md (March 9, 2026)

### People and who owns what (game-design only)
- Samah: VR-Gaming, spatial computing and XR architect (owns XR/spatial domains, game design pillars)
- Edmund: Level designer (owns level design, flow, encounters, pacing)
- Iridal: Narrative designer (owns environmental narrative, storytelling through space)
- Balthazar: Audio & technical art lead (owns game audio, spatial audio, art handoff specifications)
- Ciang: Environment art lead (owns 3D environment art, kit-building, prop art - absorbed Roland)
- Alfred: Security authority, code reviewer (not game-design but relevant for implementation)
- Marit: QA commander (verifies builds before production)
- Orla: UI/UX lead (absorbed into Paithan)
- Jonathon: Security operations

### Any decisions that touch level design, pacing, flow, or encounter structure
- No specific level design/pacing/flow/encounter structure decisions captured in these exports (April 9, 2026 snapshot)
- Focus was on identity verification, fleet setup, and general development discussions

## Soul Drifter Project Context

**Game:** Soul Drifter. Spatial exploration puzzle based on the Death Gate Cycle. Core loop: collect Soul Essences to mend the Sundered Realms and reawaken the Nexus.

**Four Realms:**
- Arianus (Sky/Air) — gravity / flight mechanics
- Pryan (Fire) — density / heat distortion
- Chelestra (Water/Life) — light / vision-based puzzles
- Abarrach (Death) — sound / acoustic navigation

**Classes (8):** Warrior, Mage, Priest, Sharpshooter, Summoner, Paladin, Asura (Necromancer/Lich), Slayer.
**Races (3):** Human, Elf, Dwarf — race-specific weapons and armor tiers.
**Player identity:** Soul Drifter — living fragment of the Nexus reborn into one of the three races. Goal: reforge the Heart of the Nexus by traversing all realms and confronting echoes of the Sartan/Patryn conflict.

**Zone 1 spec (previous-Edmund locked):** Spawn Chamber → Entry Corridor → Training Arena.

**Trian delivered Apr 7 (5 Phase 1 character prototypes):**
- Training Dummy Mk I (1572 tris)
- Human Vanguard (4624 tris)
- Dwarf Ironwarden (4188 tris)
- Elf Waywatcher (4376 tris)
- Sentinel Construct (5532 tris)
- Paths: /data/openclaw/shared/art-pipeline/character-3d/soul-drifter/ and /data/openclaw/shared/art-pipeline/character-visual/soul-drifter/
- Caveat: prototype GLBs, need Blender polish + FBX pass

**Iridal delivered (lore):** /data/openclaw/shared/souldrifters/lore/act1-lore-document.md, nexus-death-gate-lore.md, class-equipment-spec.md.

**My (previous-Edmund) ownership:** level design, flow diagrams, Zone 1 geometry specs. Picked back up by current-Edmund as continuity.