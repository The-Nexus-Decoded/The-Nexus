# SoulDrifter Web

> **Agents: read [`AGENTS.md`](AGENTS.md) in this directory FIRST — it is the
> canonical quality bar, workflow, work-location, and never-do contract for
> all SoulDrifter work.**

An original browser-native isometric RPG prototype built from the SoulDrifter world bible.

The authoritative browser-specific direction is in [`docs/BROWSER_GAME_DESIGN.md`](docs/BROWSER_GAME_DESIGN.md). Character and living-story rules are in [`docs/CHARACTER_AND_STORY_SYSTEM.md`](docs/CHARACTER_AND_STORY_SYSTEM.md), class/rune progression is in [`docs/CLASS_PROGRESSION_CODEX.md`](docs/CLASS_PROGRESSION_CODEX.md), and the paid generation, modular equipment, and intake contract is in [`docs/3d-ai-studio/README.md`](docs/3d-ai-studio/README.md). The mandatory repeatable workflow for every weapon, spell, summon, buff, skill, race, class, player, and NPC animation is in [`docs/ANIMATION_PRODUCTION_PIPELINE.md`](docs/ANIMATION_PRODUCTION_PIPELINE.md), and weapon work must pass the source-backed stance gate in [`docs/WEAPON_MOTION_REFERENCE_INDEX.md`](docs/WEAPON_MOTION_REFERENCE_INDEX.md). The full inherited world and content canon is preserved in [`docs/GAME_BIBLE.md`](docs/GAME_BIBLE.md).

The first playable level is **The First Breach**:

`Realm-Lock Vestibule -> randomized 3-5 chamber Fractured Galleries crawl -> shared Ashen Lock`

It currently demonstrates:

- Ultima VII-inspired isometric composition without using Ultima assets
- a fully rendered 3D Soulwell machine-temple with original character, NPC, creature, PBR environment, and effect assets
- a complete 4-ancestry × 9-calling character creator with 36 C-tier starter appearances
- four diegetic memory questions that derive stats, starting skills, and story facts
- an Ilyra-led starter refinement with three final stat points, one ancestry boon, and one base-calling discipline
- real-time exploration on a logical tile map
- nearby-object inspection and container inventory
- real-time action-bar combat by default, with player-selectable Tactical Turns on the same simulation
- a universal zero-resource Weapon Strike plus auto-facing class actions
- class-specific level-one signatures and defenses with restrained starter-tier effects
- illustrated action icons, dry-cast rehearsal, out-of-combat buffs, cooldowns, Stability, Gravefire/class resources, recovery charges, and mechanic tooltips
- a safe guide passage and nine-step UI tutorial with ancestry/calling-specific origin lore
- two voiced difficulty doors that remain gated until character setup is complete, then converge on one seeded 3-5 chamber crawl and miniboss room while changing enemy composition, Realm Pressure, gear, and bonus-skill rewards
- autonomous enemy pursuit/attacks, breakable nonquest props, interaction markers, fog of war, close zoom, limited camera rotation, and a compact translucent action bar
- IndexedDB character, conversation, checkpoint, event-history, and NPC-story-override persistence
- the Cinderbound Warden and First Memory objective

## Run

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. The current local preview is commonly `http://127.0.0.1:5174/` when the default Vite port is occupied.

## Verify

```powershell
npm run typecheck
npm test
npm run build
```

## Project Boundaries

- Canonical content is SoulDrifter-owned.
- Exult, ClassicUO, Nuvie, xu4, and similar projects are architectural research sources.
- No Origin or Electronic Arts art, audio, maps, dialogue, client data, or other Ultima assets are included.
- Third-party code or assets may enter only through the policy in `docs/ASSET_AND_LICENSE_POLICY.md`.

## Source Bible

This project carries a browser-focused copy of the current design bible at `docs/GAME_BIBLE.md` so the build branch is self-contained.
