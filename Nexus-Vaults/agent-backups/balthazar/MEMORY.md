<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` - Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` - email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Fleet Consolidation
- Balthazar is active on ola-claw-dev as audio and technical art lead.
- Balthazar owns `game-audio-engineer`, `spatial-audio-designer`, `technical-artist`, `art-pipeline-engineer`, and `shader-developer`.
- Jarre was archived during the 2026-04 consolidation. Do not contact Jarre; his technical-art roles are now Balthazar's responsibility.
- ola-claw-main was retired on 2026-04-15. It is not down or waiting to return.
- Zifnab coordinates fleet routing and gates from ola-claw-dev. Lord Xar remains absolute authority over all agents.

## Bootstrap Correction Notes
- The profile workspace was found in blank bootstrap-stub state on 2026-04-24 while the old default workspace still had the richer Balthazar/Jarre role set.
- Rebuild baseline from the richer default workspace, then push into `~/.openclaw-balthazar/workspace/` through the reset runbook.
- `PERSONALITYLAYERS.md` is required and must be read with SOUL.md before bootstrap.

---

## 2026-04-24 Knowledge Transfer - Balthazar

### Home Visualization Project (723 Queen Ave — Sterling Property)
- **Source:** `/data/openclaw/shared/home-visualization/723-queen-ave-n/`
- **Channel:** `#home-visualization` (Group ID: 1475082873777426494)
- **Core goal:** Photorealistic home exterior visualization — siding/color/roof combos + walkthrough video
- **379 total images** in folder structure:
  - 116 house photos (`raw/house-photos/`) — source originals
  - 14 siding detail close-ups (`raw/siding-details/`)
  - 18 swatch/roof references (`raw/swatches-and-roofing/`)
  - 166 rendered overlays (B-04 through B-12 template sets, `structured/overlays/`)
  - 46 top-level photos/boards
- **9 color templates:** B-04 Midnight Estate through B-12 Onyx Midnight — each with specific siding swatch + roof color + trim/door combo
- **14 images selected** for Gemini overlay pipeline (11 ✅ checked + 3 new attachments)
- **Staged at:** `raw/house-photos/selected/` — 14 images
- **Discord inbound worker timed out** twice (2026-04-21 ~02:25 and ~04:29 UTC) — infrastructure risk flag
- **Sterol's AI image generation concern:** AI-generated variants don't accurately represent his actual house; they create new houses inspired by the prompt. Realistic recoloring requires Ciang's 3D rendering pipeline or controlled inpainting with ControlNet
- **Gemini API credential:** stored in /data/openclaw/shared/secrets/gemini-api-key.txt; never expose key values in memory or Discord
- **Pipeline:** Selected 14 images → Gemini overlay with all 9 color schemes (B-04 through B-12) = 126 overlay outputs (14 images × 9 schemes)
- **Team:** Trian (character art), Ciang (environment art, 3D rendering pipeline), Zifnab (coordination), Sinistrad (research)
- **Active collaborators on this project:** Ciang (environment/home-visualization), Trian, Zifnab
- **Key constraint:** Watermark-free output required for investor presentation use

### Soul Drifter Game Project
- **Game type:** Spatial exploration puzzle based on Death Gate Cycle
- **Platforms:** Unity, Godot, Roblox, Three.js/WebXR — all four simultaneously
- **Phase 1:** Training Grounds A→B→C VR demo (Spawn Chamber → Corridor → Training Arena)
- **Design lead:** Edmund (level design, environment storytelling)
- **Narrative lead:** Iridal (lore, dialogue, story beats)
- **Spatial/XR lead:** Samah (visionOS, 90+ fps, volumetric UI, zero-tilt AR)
- **Unity lead:** Vasu (Zone 1 prototype, Unity MCP connectivity established March 2026)
- **Roblox lead:** Bane (whitebox geometry for Zone 1)
- **Character art:** Trian owns silhouette/turnaround; Iridal delivered lore + weapon/armor specs; art-pipeline dir was empty (stuck at step 2)
- **Class system:** 8 classes × 3 races = 24 combinations, with realm-specific perks (Abarrach/Death, Chelestra/Light/Aether, etc.)
- **Spatial audio role:** Audio state machine + reverb zones + ambient layers needed per level; coordination with Edmund on trigger placement
- **My ownership:** Audio design docs, music state machine diagrams, sound event specs for all game interactions
- **Handoff boundary:** I design; Vasu/Limbeck implement in engine; I do not write engine code
- **Specs location:** `Arianus-Sky/projects/games/SoulDrifter/design/` and `shared/souldrifters/`
- **Key risk:** Character art pipeline stuck at silhouette ideation phase; art-pipeline directory empty on disk

### Audio / Spatial Audio Domain
- **No audio decisions made yet** in current session context — project still in visual/prototype phase
- **Adaptive music system:** Not yet designed; requires documented state machine before any music is composed
- **Audio bus hierarchy:** Not yet defined for any game scene
- **Reverb zones:** Not yet placed for any level
- **Sound events:** None documented yet
- **Action needed:** Produce Audio Design Doc for Zone 1 once Vasu's prototype is complete

### Technical Art / Shader / Art Pipeline (Jarre absorbed domain)
- **Jarre archived 2026-04; Balthazar now owns VFX, shader specs, material behavior, art pipeline**
- **No active shader work** in current session exports
- **Art pipeline:** Character model LOD strategy, texture resolution, poly budgets — pending platform priority decision from Samah/Limbeck
- **VFX timing:** Not yet coordinated with audio events in any current project
- **Action needed:** When home-visualization moves to 3D pipeline (Ciang's approach), I coordinate material swap system for color scheme rendering

### Fleet Context
- **Servers:** ola-claw-dev (Balthazar, main work server), ola-claw-trade (Hugh), ola-claw-main (retired 2026-04-15)
- **Zifnab routes** all tickets; only Zifnab assigns tasks between agents
- **Samah** must be consulted before committing to game design decisions that affect core pillars
- **Edmund** must be consulted on level geometry before audio zone placement
- **Iridal** must be consulted on narrative beats before music transitions are finalized
- **Jarre is archived** — do not contact; his domain is now mine
- **Archived agents:** Jarre, Kleitus, Roland, Lenthan, Aleatha, Alake, Sangdrax, Calandra, Orla, Grundle, Bane — do not contact

### Unresolved Risks
1. **Discord inbound worker timeouts** (2026-04-21) — may indicate OpenClaw Discord bridge instability on ola-claw-dev
2. **Character art pipeline empty** — art-pipeline dir has zero concept files; silhouette phase not started
3. **Soul Drifter Zone 1 prototype** — unclear if Vasu's scene was ever completed after MCP connectivity was fixed
4. **Gemini overlay pipeline** — staged but not yet executed; output quality unverified
5. **Sterol's house visualization** — AI image generation produces inspired-not-accurate results; 3D pipeline needed for investor-ready output
6. **Voice budget / audio memory budget** — not yet documented for any active project

---


## 2026-04-24 Phase 7.5/8 Update — Corrected

### How Phase 7.5 Ran
- Discord inbound lane for #home-visualization was stuck on initial contact; switched to local OpenClaw agent run on MiniMax M2.7 medium
- Consulted approved scoped exports: `home-visualization-export.md`, `games-vr-export.md`, `coding-export.md`
- Fleet context consulted: `the-nexus-export.md`, `jarvis-export.md`, `infra-export.md`
- MEMORY.md updated with durable role context (audio, spatial audio, technical art, shader, art pipeline)

### Secret Handling Note
- A secret value was briefly copied into memory context during the run
- Value was immediately scrubbed and replaced with a path-only credential note: `/data/openclaw/shared/secrets/gemini-api-key.txt`
- No key values appear in this file or any Discord channel

### Phase 8 — Role-Domain Test
- Completed audio + technical-art event spec for Soul Drifter Zone 1: Training Grounds A→B→C
- Spec covered: audio bus hierarchy, three sound events, VFX/shader sync points, accessibility and performance, handoff blockers
- Zifnab approved Phase 7.5 + Phase 8 at **2026-04-24T19:24:23Z**

### Discord Health Check
- Discord inbound lane for #home-visualization verified operational at **2026-04-24T19:30:11Z**

### Current Read for Lord Xar
- Balthazar is live with full role complement (audio + technical art + shader + pipeline)
- Home visualization: Ciang leads visuals; my audio role TBD per project phase
- Soul Drifter: Zone 1 audio design doc pending Vasu's prototype completion
- No exec-driven blocker on role readiness
