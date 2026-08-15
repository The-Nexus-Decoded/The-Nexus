# Asset and License Policy

## Goal

SoulDrifter should benefit from open-source ecosystem work without acquiring legal or distribution dependencies on Ultima game files.

## Allowed Intake Lanes

### Direct reuse

Allowed only when the asset or code has an explicit compatible license.

- CC0 / public-domain-equivalent assets
- CC-BY assets with complete attribution
- permissive code such as MIT, BSD, ISC, or Apache-2.0
- GPL code only after compatibility and project-license impact are accepted

### Clean-room recreation

Use when behavior is useful but the source or assets are not reusable.

1. Record observable behavior in neutral terms.
2. Do not copy source code, art, sound, maps, dialogue, or proprietary data formats verbatim.
3. Implement the behavior from the neutral specification in original TypeScript.
4. Create original SoulDrifter names, code, data, visuals, and audio.
5. Keep research references and implementation commits auditable.

## Prohibited

- Ultima VII or Ultima Online client art/data files
- graphics from Ultima VI conversions that depend on Ultima VII graphics
- traced, recolored, upscaled, or lightly modified copyrighted sprites
- ripped sound, music, dialogue, maps, fonts, UI frames, icons, or animations
- code without an explicit license
- assets whose license cannot be verified from the original publisher or repository

## Intake Record

Every imported item must be added to `third-party-assets.json` before it enters production folders.

Required fields:

- stable internal ID
- source project and URL
- original author
- exact license and license URL
- source revision or download date
- files imported
- modifications made
- attribution text
- commercial-use and redistribution status
- reviewer and review date

Unknown items remain in a non-shipping quarantine outside `public/assets`.

## Current Sources

These are research references, not bundled dependencies:

- Exult: GPL engine recreation; original Ultima graphics remain proprietary
- Exult Studio documentation: world editor concepts such as shapes, chunks, schedules, triggers, gumps, and paperdolls
- ClassicUO desktop: permissively licensed open-source client implementation; requires separately obtained copyrighted client data
- ClassicUO browser client: closed source and not a reusable dependency
- ServUO: GPL server-emulator research; still expects Ultima data/content conventions

The preferred approach is a SoulDrifter-native client, protocol, server, data model, and asset set.
