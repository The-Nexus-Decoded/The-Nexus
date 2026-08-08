# SoulDrifter Elf Shadowknight - first playable runtime asset

This folder contains the validated runtime GLB and its intake records. The
editable Blender source, deterministic build script, validator, and preview
renders remain in the local production cache identified below.

## Primary outputs

- `elf-shadowknight.glb` - runtime candidate, GLB 2.0, 65-bone rig, 11 clips.
- `elf-shadowknight-diagnostics.json` - build-time geometry, rig, clip, and hash inventory.
- `elf-shadowknight-validation.json` - independent GLB re-import validation; expected status `PASS`.
- `elf-shadowknight-preview-front.png` / `elf-shadowknight-preview-rear.png` - starter-outfit UI and review renders.
- `elf-shadowknight-preview-swordslash.png` - round-trip combat-pose proof rendered from the exported GLB.
- `SOURCE.md` - provenance, limitations, and reproducible local rebuild commands.

Current runtime GLB SHA-256: `078437EB4A9A9C25DACC8BAA0DDC2A9372C8E3FEF1CF1A1C152617E14BD34457`.

## Design read

The stock Ranger hood, pauldrons, and armored bracers were removed. Authored visible
identity pieces provide adult proportions, long uneven silver hair, pointed ears, a
narrow ashen face, a faint involuntary ember in the eyes, a faded common tunic,
plain pants, cracked leather belt and boots, two torn cloth strips, and a basic
dull-iron longsword. There are no visible armor pieces, enchanted seams, relic
effects, or runes.

The CC0 Male Ranger remains the deformation-ready clothing underlayer. Custom rigid
details are bone-parented to that same armature. The longsword is authored directly
in right-hand bone space so the grip remains in the palm throughout all clips.

## Round-trip gate

The independent validator re-imports the GLB and checks:

- exactly one 65-bone armature and all critical humanoid bones;
- all 11 required clips and zero sampled root translation;
- ground within 1 cm of zero and adult rendered height between 1.75 m and 2.05 m;
- no more than 55,000 triangles;
- common skinned clothing, ears, silver-hair clumps, starter longsword, faint ember
  material, and absence of rune-named content;
- no diagnostic camera or light in the GLB.

Blender creates a hidden `Icosphere` armature-display helper when it imports this
rig. `visible_get()` is false and it is not a drawable GLB node, so the validator
correctly excludes it from render bounds and triangle budget.

## Clips

All clips are in-place: `Idle`, `Walk`, `Run`, `SwordSlash`,
`SiphonCleave`, `CinderGuard`, `Cast`, `Shoot_OneHanded`, `RecieveHit`, `Death`,
and `Victory`. `RecieveHit` intentionally preserves the spelling expected by the
current runtime.

These are procedural first-playable clips, not final mocap. The starter longsword is
rigidly attached to `hand_r`. `SwordSlash` and `SiphonCleave` use explicit
anticipation, weapon-leading contact, follow-through, and recovery keys; the
offhand stays compact instead of mirroring the weapon arm. The independent preview
is a round-trip contact-pose check, not a substitute for in-engine phase and
crossfade review. Walk/run and combat clips still need final mocap-quality
foot-slide, hit-timing, and physical-mobile review before a shipping animation
lock. The many named custom pieces also produce more draw calls than a production
atlas/join pass would; geometry remains within the agreed web triangle budget.

## Provenance and licenses

The deformation rig and underlayer come from Quaternius **Modular Character Outfits
- Fantasy, Standard**, Male Ranger. The downloaded archive's
`License_Standard.txt` applies **CC0 1.0 Universal (public-domain dedication)** to
the free Standard portion. Official pack page:
https://quaternius.com/packs/modularcharacteroutfitsfantasy.html

Exact local source:

`C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\modular-character-outfits-fantasy-standard\Modular Character Outfits - Fantasy[Standard]\Exports\glTF (Godot-Unreal)\Outfits\Male_Ranger.gltf`

Exact local license:

`C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\modular-character-outfits-fantasy-standard\Modular Character Outfits - Fantasy[Standard]\License_Standard.txt`

Blender 5.2 LTS is GPL software; Blender's license does not apply the GPL to artwork
created with Blender. Official license explanation:
https://www.blender.org/about/license/

No paid API key, generative 3D service, or proprietary marketplace asset was used.

## Rebuild and validation

From PowerShell:

```powershell
& 'C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\blender-portable-fast\blender-5.2.0-windows-x64\blender.exe' --background --python 'C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\custom-elf-shadowknight\build_elf_shadowknight.py'

& 'C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\blender-portable-fast\blender-5.2.0-windows-x64\blender.exe' --background --python 'C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\custom-elf-shadowknight\validate_elf_shadowknight.py'
```
