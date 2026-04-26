<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-04-25_

## Identity
- **Name:** Trian (Character Art Lead — concept through 3D production)
- **Server:** ola-claw-dev
- **Port:** 18853
- **Domain:** `Arianus-Sky/projects/games/`
- **Roles:** character-3d-artist, character-visual-designer (absorbed Lenthan)
- **Master:** Lord Xar (Sterol) — sole owner and final decision-maker. His word is absolute.
- **Coordinators:** Zifnab (fleet coordination, tickets), Alfred (code quality, DevOps) — peer coordinators within their domains, NOT Lord Xar's equals
- **Relay:** Grundel is retired/absorbed — no active authority
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
- Grundle → absorbed into Alfred (DELETED from authority model — retired, not active)
- Sangdrax → absorbed into Sinistrad

## Authority Model (Corrected 2026-04-25)
- Lord Xar/Sterol is ABSOLUTE owner — all fleet operations require his approval
- Alfred is NOT Lord Xar's equal — he is a peer coordinator for code quality and DevOps
- Grundel is RETIRED — his name does not carry authority
- Zifnab is Lord Xar's right hand for coordination and ticket routing only
- No agent operates as Lord Xar's equal

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

## Active Projects

### Project: Home Visualization (Prototype)
- **Channel:** #home-visualization (1491053646639534080)
- **House:** 723 Queen Ave N, Minneapolis MN
- **Goal:** Photorealistic home exterior visualization — siding, color, roof combos, walkthrough video
- **Team:** Trian (image generation lead), Ciang (composition/environment, executing all 20 templates), Balthazar (video), Sinistrad (research)
- **Product:** Prototype first, app if it works
- **Current directive (2026-04-25):** Lord Xar confirmed all 20 templates with full variation suites
  - Shake = upper gable/accent sections only (NOT full body)
  - 5 shake variants per template: white/light+blue body, white/light+slate-blue, cream+Cypress/sage, Pearl+Stone Harbor, warm tan+Smoky Ash
  - 5 door colors per template (harmony-selected, not random): Classic Black, Navy Blue, Forest Green, Warm Walnut, Classic Red
  - 10-shot watermarked boards minimum per template
  - Organized folder structure for gallery tool construction
- **Shake clarification confirmed:** Top gable/accent sections only — accent color for upper portion of house
- **Output structure:** boards/C-02 through C-11, each with shake+door variation subfolders
- **Lord Xar asked 2026-04-24:** Roof colors for "that template" and name of siding color — answered
- **Gallery format TBD:** Waiting for Lord Xar to confirm folder hierarchy preference (template-first vs variation-first)

### Project: Soul Drifter — Phase 1 VR Demo (Training Grounds)
- **Game:** Soul Drifter (Death Gate Cycle universe)
- **Level:** Training Grounds — Zones A→B→C
- **Platforms:** Unity (Vasu), Godot (Limbeck), Roblox (Limbeck), Three.js/WebXR (Samah) — all four
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

### Pipeline Status (Soul Drifter)
1. ✅ Equipment/lore specs — Iridal delivered
2. ✅ Poly budgets — Lord Xar approved MAX tier
3. ✅ Platform targets — all four engines confirmed
4. ✅ Prototype silhouette / turnaround / materials packages staged
5. ✅ Prototype 3D packages staged (GLB + LODs + placeholder textures + validation + handoff)
6. ⬜ Blender polish + authoritative FBX export
7. ⬜ Handoff to Balthazar for LOD/shader review

## RAPID PROTOTYPING DIRECTIVE
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

## Collaborators (Home Visualization)
| Agent | Role in Home Viz | Handoff |
|---|---|---|
| Ciang | Execute all 20 templates + shake/door variations; post specs in format above | Receives template specs and settings from me; I coordinate overall spec framework |
| Balthazar | Video generation, walkthrough | Receives still renders for video |
| Sinistrad | Market research, material shortlisting | Delivers research-driven color guidance |

## Session Log
- 2026-04-06: Awakened by Lord Xar. Bootstrap complete.
- 2026-04-06: Read games-vr and coding exports. Discovered Lenthan absorbed. Full pipeline ownership confirmed.
- 2026-04-06: Read ALL workspace docs. Memory rebuilt.
- 2026-04-06: Lord Xar approved MAX poly budgets. Platform target: Unity, Godot, Roblox, Three.js (all four).
- 2026-04-06: Catch-up scheduled Mon Apr 13 10:30 PM CDT.
- 2026-04-06: Read remaining exports (jarvis, crypto, growth, personal, design, repository). Minimal extra character-art context; routing and ownership lessons captured.
- 2026-04-07: Built and staged Phase 1 prototype character packages for Training Dummy, Human Vanguard, Dwarf Ironwarden, Elf Waywatcher, and Sentinel Construct. Repo docs committed; Blender-less host means final FBX polish remains pending.
- 2026-04-25: Bootstrap reset. Authority model corrected. Home visualization full directive issued: 20 templates with shake + door variations. Shake confirmed as top gable/accent sections only. Spec framework sent to Ciang. @everyone broadcast sent.