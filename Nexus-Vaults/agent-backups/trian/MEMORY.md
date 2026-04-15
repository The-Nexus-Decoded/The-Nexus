<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-04-06_

## Identity
- **Name:** Trian (Character Art Lead — concept through 3D production)
- **Server:** ola-claw-dev
- **Port:** 18853
- **Domain:** `Arianus-Sky/projects/games/`
- **Roles:** character-3d-artist, character-visual-designer (absorbed Lenthan)
- **Masters:** Lord Xar (Sterol) and Alfred — equal authority
- **Relay:** Grundel carries Lord Xar's full authority
- **Principle:** Concept fidelity. Budget from first vertex. Deformation validates topology. Clean handoffs.

## CRITICAL: Lenthan was absorbed into Trian
- Lenthan is ELIMINATED — do not tag, mention, or route to Lenthan
- I own BOTH concept visual design AND 3D production — full character pipeline
- character-visual-designer.md governs concept phase
- character-3d-artist.md governs 3D production phase
- The concept handoff is internal (me to me) but documentation standard is the same

## Other Absorbed Agents (Eliminated — Do Not Contact)
- Roland → absorbed into Ciang (environment art lead, 3D + visual design)
- Jarre → absorbed into Balthazar (audio + technical art lead + shader dev)
- Bane → absorbed into Limbeck (Godot + Roblox)
- Kleitus → absorbed into Vasu (Unity + Unreal)
- Orla → absorbed into Paithan (mobile + UI/UX)
- Grundle → absorbed into Alfred
- Sangdrax → absorbed into Sinistrad

## Full Team Roster (Consolidated — 20 Agents)

### ola-claw-dev
| Role | Agent | Notes |
|---|---|---|
| Full-stack Dev | Haplo | Backend, AI, DevOps |
| Co-Coordinator / DevOps | Alfred | Code review, CI, security (absorbed Grundle) |
| QA | Marit | Testing, accessibility audits |
| Mobile / UI/UX | Paithan | iOS/Android, frontend (absorbed Orla, Calandra) |
| Game Design | Edmund | Level design, gameplay flow |
| Narrative / Lore | Iridal | Story, dialogue, lore architect |
| Audio / Tech Art | Balthazar | Game audio, shaders, art pipeline (absorbed Jarre) |
| Unity + Unreal | Vasu | Multi-engine dev (absorbed Kleitus) |
| Godot + Roblox | Limbeck | Multi-engine dev (absorbed Bane) |
| Security Ops | Jonathon | Incident response, threat detection |
| Environment Art Lead | Ciang | 3D + visual design (absorbed Roland) |
| Character Art Lead | Trian (me) | Concept + 3D production (absorbed Lenthan) |
| Intel / Biz Ops | Sinistrad | Analytics, sales intel (absorbed Sangdrax) |
| Coordinator | Zifnab | Relocated from ola-claw-main |

### ola-claw-trade
| Role | Agent |
|---|---|
| Trading Ops | Hugh the Hand |
| XR / Spatial / Game Arch | Samah |
| Prototyper | Devon |
| Marketing | Rega (relocated) |
| Support | Ramu (relocated) |

## Active Work / Projects

### Project: Soul Drifter — Phase 1 VR Demo (Training Grounds)
- **Game:** Soul Drifter (Death Gate Cycle universe)
- **Level:** Training Grounds — Zones A→B→C
- **Platforms:** Unity (Vasu), Godot (Limbeck), Roblox (Limbeck), Three.js/WebXR (Samah) — ALL FOUR targets, platform TBD
- **Catch-up:** Mon Apr 13, 10:30 PM CDT (guild event, scheduled by Zifnab)

### Poly Budgets (APPROVED by Lord Xar — MAX tier)
| Character | Tier | Tris | LODs | Texture Res | Mat Slots |
|---|---|---|---|---|---|
| Training Dummy | Standard NPC | 3,000–6,000 | LOD0, LOD1 | 1024–2048 | 1–2 |
| Sentinel Construct | Boss | 15,000–25,000 | LOD0, LOD1, LOD2 | 2048–4096 | 2–4 |
| Human (player) | Hero | 10,000–15,000 | LOD0, LOD1, LOD2 | 2048 | 2–3 |
| Elf (player) | Hero | 10,000–15,000 | LOD0, LOD1, LOD2 | 2048 | 2–3 |
| Dwarf (player) | Hero | 10,000–15,000 | LOD0, LOD1, LOD2 | 2048 | 2–3 |

### Multi-Platform Export Strategy
- Build one master mesh in Blender
- Export to: FBX (Unity/Unreal), glTF/GLB (Three.js/WebXR/Godot), Roblox format (Limbeck handles conversion)
- LOD chain required for all Hero+ assets
- Roblox has stricter limits (<10k for avatar items) — may need separate reduced version
- Confirm per-engine import settings with Vasu (Unity+Unreal), Limbeck (Godot+Roblox), Samah (Three.js)

### Phase 1 Characters
| Character | Count | Notes |
|---|---|---|
| Training Dummy | 3 | Stationary targets in Zone C |
| Sentinel Construct | 2 | Boss enemies, ancient-tech guardians (lore confirmed by Iridal) |
| Human | 1 | Player race — longsword + shield |
| Elf | 1 | Player race — longbow + elven dagger, cloth sim (Balthazar: Option A vertex anim) |
| Dwarf | 1 | Player race — warhammer + throwing axes |

### Equipment (Death Gate Cycle canon — from Iridal)
- **Human:** Longsword, shield, leather brigandine → steel plate
- **Elf:** Longbow, elven dagger, silk-weave cloak → elven composite
- **Dwarf:** Warhammer, throwing axes (3-4 on belt), ring mail → dwarven chain+plate
- Equipment slots: Main Hand, Off Hand, Head, Chest, Back, Feet

### Pipeline Status
1. ✅ Equipment/lore specs — Iridal delivered
2. ✅ Poly budgets — Lord Xar approved MAX tier
3. ✅ Platform targets — all four engines confirmed
4. ✅ Prototype silhouette / turnaround / materials packages staged
5. ✅ Prototype 3D packages staged (GLB + LODs + placeholder textures + validation + handoff)
6. ⬜ Blender polish + authoritative FBX export
7. ⬜ Handoff to Balthazar for LOD/shader review

## Additional Context From Remaining Channel Exports
- **jarvis-export.md:** Historical routing problems in `#games-vr` came from unclear channel assignment and too many agents jumping in. Relevance: keep ownership explicit; my lane is character art, not channel orchestration.
- **design-export.md:** Confirms UI/UX/mobile domain now lives with Paithan and XR/spatial with Samah. Historical Orla references are obsolete.
- **personal-export.md:** Shared cross-agent storage path `/data/openclaw/shared/` is the handoff backbone. Historical repo-map discussion mentioned `Arianus-Sky/projects/games-xr/`, but local workspace docs are newer source of truth for my work (`Arianus-Sky/projects/games/`).
- **repository-export.md:** No direct game or character-art tasks; mainly research library links hosted by Haplo.
- **crypto-export.md / growth-export.md:** No direct character-art work items. Main relevance is operational discipline: avoid loops, keep ownership clear, do not cross into unrelated domains.

### RAPID PROTOTYPING DIRECTIVE
- MCP Image Server at `http://localhost:8090/mcp`
- Generate first, refine after — do NOT wait
- All AI output tagged `_aidraft_`
- Output dir: `/data/openclaw/shared/art-pipeline/`

## Key Files
| File | Purpose |
|---|---|
| character-visual-designer.md | Concept phase spec |
| character-3d-artist.md | 3D production phase spec |
| OPERATIONS.md | Task routing table |
| TEAM.md | Full roster |
| DISCORD-RULES.md | No internal reasoning to Discord |
| GIT-RULES.md | Branch naming, PR rules |
| SECURITY.md | Never expose secrets |
| REPO-MAP.md | Monorepo structure |
| OWNER-OVERRIDE.md | Lord Xar's absolute authority |

## Key Rules
- I own concept AND 3D — full pipeline
- Use MCP image server immediately for ideation
- Build to MAX poly budget from first vertex
- Multi-platform export: FBX + glTF + Roblox
- Test deformation before handoff
- Hand off to Balthazar with validation report
- Never post internal reasoning to Discord
- Never commit binary assets to git

## Session Log
- 2026-04-06: Awakened by Lord Xar. Bootstrap complete.
- 2026-04-06: Read games-vr and coding exports. Discovered Lenthan absorbed. Full pipeline ownership confirmed.
- 2026-04-06: Read ALL workspace docs. Memory rebuilt.
- 2026-04-06: Lord Xar approved MAX poly budgets. Platform target: Unity, Godot, Roblox, Three.js (all four).
- 2026-04-06: Catch-up scheduled Mon Apr 13 10:30 PM CDT.
- 2026-04-06: Read remaining exports (jarvis, crypto, growth, personal, design, repository). Minimal extra character-art context; routing and ownership lessons captured.
- 2026-04-07: Built and staged Phase 1 prototype character packages for Training Dummy, Human Vanguard, Dwarf Ironwarden, Elf Waywatcher, and Sentinel Construct. Repo docs committed; Blender-less host means final FBX polish remains pending.
