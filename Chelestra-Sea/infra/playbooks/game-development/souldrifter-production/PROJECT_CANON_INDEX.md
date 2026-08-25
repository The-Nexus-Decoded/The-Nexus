# Project Canon Index

## Priority order

1. Latest explicit owner direction
2. Binding repository `AGENTS.md`
3. Current runtime/code contracts
4. Locked/current SoulDrifter docs and approved GitHub issue decisions
5. This master harness
6. Recovered Lifepaper/Book-of-Life historical material
7. Death Gate source inspiration within current-phase restrictions
8. New proposals

A lower-priority source never silently overrides a higher-priority source.

## Core harness

- `START_HERE.md`
- `SESSION_FAST_START.md`
- `ONBOARDING.md`
- `AUTO_DISCOVER_WORKSPACE.md`
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `HOUDINI_APPRENTICE_POC_POLICY.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `BROWSER_RUNTIME_ROADMAP.md`
- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/onboarding-cache-policy.json`
- `config/tripo-provider.json`
- `config/dungeon-topology-policy.json`
- `config/animation-bakeoff-policy.json`
- `templates/dungeon-topology-record.template.json`
- `templates/animation-bakeoff-record.template.json`
- `WORKFLOW.md`
- `ARCHITECTURE_DECISION.md`
- ticket kickoff files under `kickoffs/`
- complete archived specialist source under `source-bundle/`

## Production-document authority

Current SEA playbook files are the production workflow authority.

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the implementation target for runtime code, data, assets and tests. Legacy SKY runbooks may remain useful implementation references but do not override the current SEA harness.

## Procedural dungeon topology

- Read `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md` for every randomized/procedural level change.
- The required architecture is:

```text
logical graph
-> constructive edge-by-edge spatial embedding
-> canonical shared boundaries/apertures
-> top-down actual-geometry validation
-> one shared shell
-> collision/navigation
-> 3D dressing/FX
```

- Do not place independently sealed room boxes at slot centers and connect them afterward.
- Place each destination room relative to a validated source socket/connector.
- Resolve and validate the complete edge before accepting the next room.
- Retry alternate sockets/orientations/modules or backtrack when placement fails.
- Shared walls are emitted once; open spans emit no wall from either room.
- A physical corridor requires source aperture, continuous corridor geometry and destination aperture.
- A magical/teleport portal is an explicit nonphysical edge and must not generate a fake corridor.
- Every seed/route produces a top-down diagnostic from actual embedded geometry and passes automated, AI/vision and required owner-design review before shell dressing.
- Graph connectivity, coordinates, pathfinding, visible doors and room warps are never sufficient physical proof.

## Browser runtime and portability

- SoulDrifter remains browser-first and mobile-browser compatible.
- Three.js is the canonical browser runtime for the POC and foreseeable browser releases.
- There is no planned Babylon.js comparison, evaluation ticket, target package or migration roadmap.
- Continue improving Three.js through WebGL/WebGPU capability paths, scalable FX/material quality, mobile performance, streaming/loading, physics/animation integration and real-device profiling.
- Do not delay the First Breach or duplicate the game in another browser engine.
- If a future installed/native edition is genuinely required, evaluate Unreal Engine versus Unity as a separate owner-approved product phase.
- Unreal/Unity are long-term optional portability targets only, not current production clients.
- Preserve Houdini/Blender/provider source, neutral assets/caches/manifests and target-specific packages so future native integration reuses expensive creative/procedural work rather than starting over.
- Read `BROWSER_RUNTIME_ROADMAP.md`.

## Images and primary 3D references

- Follow `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
- When the authenticated Tripo Studio allowance is active, generate two Studio candidates—Nano Banana and Nano Banana Pro—and two ChatGPT/OpenAI image candidates.
- Verify exact Studio model labels and allowance in the live authenticated UI.
- Compare the four candidates and store the owner-selected source.
- Every primary 3D-source image must show the **entire asset in frame**, including all critical geometry, supports and attachments. This applies to characters, creatures, weapons, armor, props, doors, fixtures, furniture, vehicles, architecture and environment set pieces.
- Cropped close-ups are `DETAIL_REFERENCE_ONLY` and cannot be the sole primary 3D source.

## Tripo 3D

- Studio browser, API/SDK and official CLI are separate lanes; credentials and credits may differ.
- Use `API_SDK_PRIMARY` when authenticated and funded.
- Use `OFFICIAL_CLI_PRIMARY` only when a first-party CLI is documented, separately authenticated and funded.
- Use `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable or unfunded but Studio is active.
- A blocked API/CLI lane must not block Studio browser production.
- Tripo is the primary new 3D asset lane after the active lane passes preflight.
- Do not guess or install an unverified similarly named package.
- Geometry-changing operations, including segmentation/mesh completion/low-poly, occur before final rigging.

## Animation

- Tripo is the primary auto-rig and preset-animation-retarget lane.
- Search the live preset library first for every motion.
- A direct Tripo preset that passes the full acceptance gate does not require duplicate DCC production.
- For every custom animation not acceptably covered by Tripo, produce both a Houdini KineFX candidate and Blender candidate from the same locked inputs.
- Blind the candidates, have an independent AI reviewer score them, present the side-by-side comparison to the owner, integrate the owner-selected winner, and preserve both candidates/data.
- Record every bakeoff in the animation experiment registry.
- Review aggregate results after 10, 25, 50, 100 and every additional 50 custom animations.
- No animation pipeline retires automatically. Global/category retirement requires representative evidence and explicit owner approval.
- Use a verified Tripo custom-motion feature only when authenticated provider evidence proves it exists for the owner's account.

## Houdini

- Current owner-declared project mode is `NONCOMMERCIAL_POC`; read `HOUDINI_APPRENTICE_POC_POLICY.md`.
- While that classification remains accurate, use the full FX feature set exposed by Houdini Apprentice instead of artificially lowering visual fidelity.
- Particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, procedural terrain, lighting, materials, shaders, fog and volumetrics are valid POC tools when present in the installed build.
- Apprentice restrictions remain binding: non-commercial formats/use, no mixing into Indie/commercial pipelines, no Apprentice HDA through Houdini Engine, render/renderer restrictions and exact exporter restrictions.
- Three.js remains runtime; every required export/bake representation must pass an actual smoke test under the installed license.
- The planned Indie upgrade establishes the limited-commercial/Engine/export/rendering lane and requires a clean rebuild/re-export; it is not required merely to unlock the main FX tools already available in Apprentice.

## Character / asset / animation / combat specialist sources

The complete detailed source bundle preserves master playbook, Tripo routing, animation matrix, combat reactions/deaths, NPC dialogue heads, gear/loot, ancestry abilities, code-derived animation demand, hit-reaction architecture, VFX/particle matrix, runtime animation requirements, skill/lore precedence, reactive combat, class resources/cooldowns, Summoner pet controls and dual combat modes.

Before relying on a specialist file, locate/materialize the actual file. Do not claim it was read when only an index entry was seen.

## Other current direction

- Playable characters remain modular.
- NPC full-outfit segmentation is allowed where approved.
- Monsters use regenerate/compare QA.
- Real GPU validation remains mandatory.
- Current runtime/canon has two core Level-1 class actions per calling; the owner wants three starter active abilities per class. Third abilities require approved source/research and owner approval.
- Starter Summoner creature is Lesser Driftling; progression is Lesser -> Minor -> Major. Driftling remains magical shaping, not a Beast summon. Summoner retains separate pet controls/manual/autocast rules.
