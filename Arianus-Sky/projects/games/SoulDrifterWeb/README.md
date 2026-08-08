# SoulDrifter Web

An original browser-native isometric RPG prototype built from the SoulDrifter world bible.

The authoritative browser-specific direction is in [`docs/BROWSER_GAME_DESIGN.md`](docs/BROWSER_GAME_DESIGN.md). The full inherited world and content canon is preserved in [`docs/GAME_BIBLE.md`](docs/GAME_BIBLE.md).

The first playable level is **The First Breach**:

`Soul Well Spawn Chamber -> Entry Corridor -> Training Arena`

It demonstrates:

- Ultima VII-inspired isometric composition without using Ultima assets
- an object-rich world rendered with original procedural placeholder art
- real-time exploration on a logical tile map
- nearby-object inspection and container inventory
- player-selectable tactical turn-based or real-time action-bar combat
- Warrior `Rune Slash`, `Anchor Guard`, a starter sigil, and a timed block reaction
- the Sentinel Construct and Soul Essence objective

## Run

```powershell
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

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
