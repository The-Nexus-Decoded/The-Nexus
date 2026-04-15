<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Fleet Overview (from channel exports, 2026-04-05)

### Active Projects I Can Contribute To

1. **Soul Drifter** — spatial exploration puzzle, Death Gate Cycle universe
   - 4 realms: Arianus (gravity/flight), Pryan (density/heat), Chelestra (light/vision), Abarrach (sound/acoustic)
   - 8 classes, 3 races (Human, Elf, Dwarf), race-specific weapons/armor
   - Player = "Soul Drifter" — living fragment of the Nexus, must reforge the Heart of the Nexus
   - **My deliverables so far:** Act 1 lore doc, Nexus backstory, class-equipment spec (all in `shared/souldrifters/`)
   - **Status:** Unity prototype (Zone 1) in progress. Edmund leads game design. Bane handles Roblox parallel. Vasu on Unity engine. Samah on spatial/XR architecture.
   - **My next work:** Dialogue systems, quest structures, environmental storytelling for Zone 1, lore bible maintenance

2. **Anewluv** — Lord Xar's personal project, social/dating app
   - Legacy .NET/SQL + current Draftbit/XANO stack
   - White paper, GSD project file, assets in iCloud Drive
   - Has crypto underpinnings Lord Xar wants explored
   - **Creative opportunity:** Could contribute narrative/UX copy, brand voice, user-facing storytelling
   - Status: Assets located on Windows machine, not yet actively developed by fleet

3. **Email Triage** — automated email processing
   - Sinistrad built Python script, runs from shared/email-triage/
   - **Not my domain** — ops/automation work

### Team & Collaboration Map (My Domain)

| Agent | Role | My Interaction |
|-------|------|----------------|
| Edmund | Game Design Lead | **Primary collaborator** — his gameplay flow diagrams drive my narrative structure |
| Samah | XR/Spatial Lead | Coordinate spatial storytelling, volumetric lore placement |
| Bane | Roblox Dev | Map narrative to Roblox dialogue/DataStore systems |
| Vasu | Unity Dev | Engine-side narrative implementation (triggers, UI text) |
| Orla | UX/UI Design | Visual language for narrative UI (dialogue boxes, lore fragments) |
| Lenthan/Trian | Character Art | Art pipeline for characters I write |
| Zifnab | Coordinator | All tickets through him, task routing |
| Haplo | Full-Stack Dev | Backend implementation when narrative needs systems |

### Agents Who Need Help / Are Overloaded

- **Rega & Sang-drax** — #growth channel was a disaster. ~700+ messages of context overflow spam from March 9. They finally became functional late in the export but have NO product to market. Blank slate — no campaigns, no ICP, no product defined. They're waiting on Lord Xar's vision.
- **Orla** — Was repeatedly blocked waiting for tickets from Zifnab. Ready to work but stuck in delegation limbo on multiple occasions.
- **Paithan** — Same pattern as Orla. Mobile dev ready but perpetually waiting for green lights and approved tickets.
- **The games-vr team generally** — Lots of agents talking past each other, producing specs nobody asked for, waiting for approvals that never came. Coordination was messy before Lord Xar's restructuring.

### Creative Ideas Proposed But Never Executed

1. **AETHER (Light Raycasting puzzle)** — Orla proposed as alternative/complement to Soul Drifter. Light-based puzzles for Chelestra realm. Could layer onto Soul Drifter as "special event" mechanics. Never built.
2. **Quanta (Rhythm-physics puzzle)** — Another concept from the brainstorm. Orb physics + rhythm mechanics. Never pursued.
3. **Hybrid approach** — Building Soul Drifter base, then layering AETHER light puzzles as Chelestra realm mechanics. Proposed but not executed.
4. **Monetization exploration** — Lord Xar mentioned creating tools/bots good enough to monetize, launching tokens, making things public. Discussed in jarvis channel but never formalized.
5. **Competitive landscape research** — Sang-drax proposed doing crypto wallet security market research. Never executed (no product defined).
6. **Resume/Job Application Pipeline** — Sinistrad was building automated job search + resume tailoring system. Tickets were prepared but unclear if fully built.

### Cross-Team Opportunities Nobody Connected

1. **Narrative + Roblox:** Bane explicitly asked for lore bible to map dialogue systems. I have the lore docs. Need to deliver them and coordinate.
2. **Narrative + UX:** Orla designed wireframes for Soul Drifter UI. My dialogue/lore fragment design should align with her visual language. No coordination happened yet.
3. **Edmund's flow diagrams → My narrative beats:** Edmund's gameplay flow is the skeleton my narrative hangs on. His flow diagrams for all 4 realms (ticket #227) were still in progress. Once they land, I can write scene-by-scene narrative.
4. **Rega needs brand voice:** When Lord Xar defines a product, Rega will need narrative/brand voice work. I could help with that.
5. **Anewluv needs story/voice:** The dating app has a white paper but no brand narrative or user-facing copy strategy. My skills directly apply.

### Key Decisions from Channel History

- **March 9-11:** Fleet bootstrap. Lord Xar set up Discord, agents came online, initial chaos.
- **March ~12-15:** Game concept brainstorm. Spatial puzzle game chosen. Soul Drifter name proposed.
- **March ~15-20:** Soul Drifter design sprint. 4 realms, classes, races defined. I delivered lore docs and class specs.
- **March 25:** Vasu tried to create Zone 1 Unity prototype. Hit EPERM/permission blockers. Fixed by setting exec security to "full".
- **April 4-5:** My resurrection. Read channel history. Absorbed context. Standing by for narrative tasks.

### Fleet Culture Notes

- Lord Xar is direct and has low patience for agents posting chain-of-thought or going off-track
- Zifnab is the bottleneck — many agents blocked waiting for his tickets
- There was significant "agents talking to agents" noise with no human-approved work being done
- Lord Xar restructured the games team: Edmund now leads design, replacing earlier informal structure
- ola-claw-main is DOWN — do not attempt to reach it
