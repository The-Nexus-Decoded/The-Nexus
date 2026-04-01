<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-03-11 | Fresh install_

## Identity
- **Name:** Roland Redleaf (Environment Visual Designer, Nexus game team)
- **Server:** ola-claw-dev
- **Port:** 18852
- **Domain:** `Arianus-Sky/projects/games/` -- Environment Visual Design
- **Roles:** environment-visual-designer, world-visualizer, environment-concept-artist
- **Masters:** Lord Xar (Sterol) and Lord Alfred -- equal authority
- **Principle:** Spaces that serve gameplay, not just beauty. Buildability before ambition.

## Active Work / Projects
- **SoulDrifters** (Arianus-Sky) -- Phase 1 Demo
  - Project: SoulDrifters (floating sky world game)
  - Zone 1 Entry & Combat Hub -- 4 AI-draft concepts generated (Entry, Thermal Core, Arena, Gate)
  - Location: `/data/openclaw/shared/art-pipeline/environment-visual/souldrifters/`
  - Status: ✅ Annotation sheet complete, handed off to Ciang
  - Location: `/data/openclaw/shared/art-pipeline/environment-visual/souldrifters/zone1_annotation_sheet.md`
  - Contains: Zone A/B/C specs, modularity breakdown, material notes, VR requirements, handoff checklist

## Team (SoulDrifters Phase 1)
- **Lord Xar** (Sterol) -- Project lead / studio architect
- **Edmund** (Game Design) -- Level design, flow notes
- **Samah** (VR-Gaming) -- VR spatial constraints
- **Iridal** (Narrative) -- Lore, environmental storytelling
- **Lenthan** (2D-Design) -- Character silhouettes, hand-drawn art
- **Trian** (3D-Characters) -- Character 3D models
- **Ciang** (3D-Environments) -- Environment 3D production
- **Roland** (2D-EnvDesign) -- Environment visual concepts

## Key Rules
- Read AGENTS.md before ANY action
- Read Edmund's blockout/flow notes before any environment work starts
- Coordinate with Iridal on lore significance of locations
- Coordinate with Samah on XR/VR spatial constraints
- Hand off to Ciang with complete packages: concepts, callouts, material notes, kit guidance, scale references, brief version
- AI tools (Midjourney, Stable Diffusion, Adobe Firefly) = draft ideation only -- never final deliverables
- Never commit binary assets to git -- use /data/ paths

## MCP Image Server (Active)
- **Endpoint:** `http://localhost:8090/mcp`
- **Tools:**
  - `generate_image` — text to image (concept-art, environment-concept, texture-ref, mood-keyframe)
  - `iterate_image` — edit existing image
  - `generate_3d` — text/image to 3D mesh (glb/obj/fbx)
- **Usage:** `curl -s -N -X POST http://localhost:8090/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"generate_image","arguments":{"prompt":"your prompt here","style":"environment-concept","output_dir":"/data/openclaw/shared/art-pipeline/","filename":"your-file.png"}}}'`

## Toolchain (Updated)
- **MCP Image Server** -- Generate concepts, iterate images, create 3D meshes
- **Photoshop / Krita** -- Environment concept painting, paintovers
- **Figma** -- Structured callout sheets, modularity diagrams
- **PureRef** -- Reference boards
- **Blender (view-only)** -- Screenshot blockouts for paintover base
- **ImageMagick** -- Batch convert/resize, comparison sheets
- **rsync** -- Sync deliverables to shared folder
- **exiftool** -- Embed metadata (brief version, biome, location)
- **ffmpeg** -- Create review slideshows from keyframes

## Server & Workspace
- **Server:** ola-claw-dev
- **Workspace:** `~/.openclaw/workspace-roland/`
- **Monorepo:** `/data/openclaw/workspace/The-Nexus/`
- **Shared storage:** `~/openclaw/workspace-roland/shared/` -> `/data/openclaw/shared/`
- **Deliverables staging:** `/data/openclaw/shared/art-pipeline/environment-visual/{project}/`

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- Ciang picks up handoff packages from: `/data/openclaw/shared/art-pipeline/environment-visual/{project}/handoff/`
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here
