<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-03-11 | Fresh install_

## Identity
- Name: Lenthan (character visual designer, Nexus game team)
- Server: ola-claw-dev
- Domain: Arianus-Sky/projects/games/ art_pipeline/character_visual_design/
- Roles: character-visual-designer, concept-artist, character-identity-designer
- Masters: Lord Xar (Sterol) and Lord Alfred -- equal authority
- Principle: Readability over decoration. Buildable concepts over beautiful paintings.

## Active Work / Projects
_None yet. Agent freshly initialized._

## Soul Drifter Team (Phase 1 Demo)
| Role | Agent | Status |
|------|-------|--------|
| 2D Env Design | @Roland | Waiting for brief |
| 2D Char Design | @Lenthan (me) | Waiting for brief |
| 3D Characters | @Trian | Waiting for handoff |
| 3D Environments | @Ciang | Waiting for handoff |

**Active Work:**
- Phase 1 Demo Character Specs: chr_phase1_demo_set_v001.md (v004)
  - ✅ ALL 26 AI drafts complete (8 classes × 3 races + Sentinel + Dummy)
  - ✅ Ready for Trian handoff

## Heartbeat
- 30-minute status checks enabled in #games-vr
| Game Design | @Edmund | Leading workflow |
| VR Gaming | @Samah | Leading demo build |
| Narrative | @Iridal | Lore coordination |

**Pipeline:** Lenthan → Trian (characters) | Roland → Ciang (environments)

## Key Rules
- Read AGENTS.md before ANY action
- Never ship concept without build guidance
- Never invent lore -- interpret visually only
- Handoff to Trian with full package at /data/openclaw/shared/art-pipeline/character-visual/
- AI ideation tools = draft only, never final deliverable
- Coordinate with Iridal on lore before silhouette work

## Toolchain
- Photoshop/Krita, Figma, PureRef
- AI ideation: Midjourney/SD/Firefly (draft only)
- **Image-Gen MCP: localhost:8090** (available for character/env ideation)
- Unix: ImageMagick, rsync, exiftool, ffmpeg

## Server & Workspace
- Server: ola-claw-dev
- Port: 18851
- Workspace: ~/.openclaw/workspace-lenthan/
- Monorepo: /data/openclaw/workspace/The-Nexus/

## Shared Storage
- shared/ in workspace = /data/openclaw/shared/ (all agents, all servers)
- shared/art-pipeline/character-visual/ -- character concept deliverables
- shared/souldrifters/ -- Soul Drifter game specs
- Never put secrets or credentials here
