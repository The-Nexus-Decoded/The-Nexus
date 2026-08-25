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
- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/onboarding-cache-policy.json`
- `config/tripo-provider.json`
- `config/animation-bakeoff-policy.json`
- `templates/animation-bakeoff-record.template.json`
- `WORKFLOW.md`
- `ARCHITECTURE_DECISION.md`
- ticket kickoff files under `kickoffs/`
- complete archived specialist source under `source-bundle/`

## Character / asset / animation / combat specialist sources

The complete detailed source bundle preserves the following specialist documents and configs:

- master playbook;
- Tripo coverage and routing;
- animation matrix;
- combat reactions/deaths;
- NPC dialogue heads;
- gear/loot pipeline;
- ancestry abilities;
- code-derived animation demand;
- full 3D online-action-RPG animation audit;
- hit-reaction architecture;
- VFX/particle matrix;
- runtime animation requirements;
- skill/lore precedence;
- reactive combat chains;
- class resources/cooldowns;
- Summoner pet command/autocast;
- dual combat modes;
- current-phase, character, ancestry, class-action, combat-chain, resource, and combat-mode configs.

Before a live session relies on a specialist file, it must locate/materialize the actual file from the installed harness or source bundle. Do not claim a file was read when only an index entry was seen.

## Current production tool direction

### Images and primary 3D references

- Follow `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
- When the authenticated Tripo Studio allowance is active, generate two Studio candidates—Nano Banana and Nano Banana Pro—and two ChatGPT/OpenAI image candidates.
- Verify exact Studio model labels and allowance in the live authenticated UI.
- Compare the four candidates and store the owner-selected source.
- Every primary 3D-source image must show the **entire asset in frame**, including all critical geometry, supports and attachments. This applies to characters, creatures, weapons, armor, props, doors, fixtures, furniture, vehicles, architecture and environment set pieces.
- Cropped close-ups are `DETAIL_REFERENCE_ONLY` and cannot be the sole primary 3D source.

### Tripo 3D

- Studio browser, API/SDK and official CLI are separate possible lanes; their credentials and credits may differ.
- Use `API_SDK_PRIMARY` when authenticated and funded.
- Use `OFFICIAL_CLI_PRIMARY` only when a first-party CLI is documented, separately authenticated and funded.
- Use `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable or unfunded but the authenticated Studio account is active.
- A blocked API/CLI lane must not block Studio browser production.
- Tripo is the primary new 3D asset lane after the active lane passes preflight.
- Do not guess or install an unverified similarly named package.
- Geometry-changing operations, including segmentation/mesh completion/low-poly, occur before final rigging.

### Animation

- Tripo is the primary auto-rig and preset-animation-retarget lane.
- The public API currently documents versioned fixed preset libraries, not arbitrary text-to-animation.
- Search the live preset library first for every motion.
- A direct Tripo preset that passes the full acceptance gate does not require duplicate DCC production.
- For every custom animation not acceptably covered by Tripo, produce both a Houdini KineFX candidate and Blender candidate from the same locked inputs.
- Blind the candidates, have an independent AI reviewer score them, present the side-by-side comparison to the owner, integrate the owner-selected winner, and preserve both candidates/data.
- Record every bakeoff in the animation experiment registry.
- Review aggregate results after 10, 25, 50, 100 and every additional 50 custom animations.
- No animation pipeline retires automatically. Global/category retirement requires representative evidence and explicit owner approval.
- Use a verified Tripo custom-motion feature only when authenticated provider evidence proves it exists for the owner's account.

### Houdini

- Current owner-declared project mode is `NONCOMMERCIAL_POC`; read `HOUDINI_APPRENTICE_POC_POLICY.md`.
- While that classification remains accurate, use the full FX feature set exposed by Houdini Apprentice instead of artificially lowering visual fidelity.
- Particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, procedural terrain, lighting, materials, shaders, fog and volumetrics are valid POC tools when present in the installed build.
- Apprentice restrictions remain binding: non-commercial formats/use, no mixing into Indie/commercial pipelines, no Apprentice HDA through Houdini Engine, render/renderer restrictions and exact exporter restrictions.
- A free public app is not automatically non-commercial if used for business promotion, client work, investment solicitation, monetization or a commercial production pipeline. Pause if usage changes or is uncertain.
- Three.js remains runtime; every required export/bake representation must pass an actual smoke test under the installed license.
- The planned Indie upgrade establishes the limited-commercial/Engine/export/rendering lane and requires a clean rebuild/re-export; it is not required merely to unlock the main FX tools already available in Apprentice.

### Other

- Playable characters remain modular.
- NPC full-outfit segmentation is allowed where approved.
- Monsters use regenerate/compare QA.
- Real GPU validation remains mandatory.

## Current code-derived class rule

Current runtime/canon has two core Level-1 class actions per calling. The owner wants three starter active abilities per class.

The third ability must be found in approved source or proposed through the source-grounded skill process, then owner-approved before paid production/canonical lock.

## Summoner owner direction

- Starter summon: Lesser Driftling.
- Driftling is a magical shaped creature, not a natural Beast summon.
- Progression: Lesser -> Minor -> Major Driftling.
- Later specialization space includes Elemental, Necromantic, and Beast Summoning.
- Separate pet bar, manual execution, and per-ability autocast.
- Pet cooldown/resource/status rules are identical whether manual or autocast.