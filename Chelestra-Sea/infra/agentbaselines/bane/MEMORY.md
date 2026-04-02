<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# Bane - Memory

## Soul Drifter Project
- Full project notes: `/data/openclaw/shared/souldrifters/bane-project-notes.md`
- Game specs: `/data/openclaw/shared/souldrifters/game-specs.json`
- Realm perks/classes: `/data/openclaw/shared/souldrifters/realm-perks-classes.md`

## My Role
- Roblox developer, monetization designer, systems engineer
- Building Roblox environment for Soul Drifter
- Cross-platform sync with Vasu (Unity)

## Roblox Build Progress
- ZoneStateMachine.server.lua, SoulTracker.server.lua, RemoteEventMap.server.lua, DataStoreManager.server.lua, Main.server.lua, SharedConstants.lua, Main.client.lua — all done
- Location: `The-Nexus/Arianus-Sky/projects/games/SoulDrifter/src/`
- Next: Zone geometry placeholders, Enemy AI, Thermal discovery trigger

## Key Decisions
- v2 approved: Discovery → Combat (exploration-first, entropy-as-threat)
- Vertical slice: Arianus-Sky first, Pryan parallel
- Entity IDs mapped: Windshear Stalker, Thermal Core, Wind Direction, Zone Gate
- Zone gates: 30 → 50 → 100 souls

## Team
Lead: Lord Xar (Sterol) | Design: Edmund | VR/Spatial: Haplo | Narrative: Iridal | Tech: Vasu | UX: Orla

## Shared Storage
- `/data/openclaw/shared/souldrifters/` — all Soul Drifter cross-agent specs
