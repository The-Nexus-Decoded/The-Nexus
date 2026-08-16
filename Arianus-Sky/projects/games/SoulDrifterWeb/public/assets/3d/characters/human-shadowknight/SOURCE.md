# SoulDrifter Human Shadowknight — second playable runtime asset

Runtime GLB built from CC0 Quaternius sources with the same 65-bone rig as the
elf-shadowknight, so the shared animation packs and runtime socket code apply
unchanged.

## Composition

- **Rig + starter outfit**: Quaternius *Modular Character Outfits - Fantasy
  (Standard)*, Male Ranger underlayer (tunic, trousers, belts, greaves), cloth
  and leather recolored to flat Soul-Well starter materials.
- **Head**: Quaternius *Universal Base Characters (Standard)*, Superhero_Male
  head/eyes/eyebrows transplanted onto the same rig (Head/neck vertex groups),
  Light skin base texture.
- **Hair**: Quaternius Hairstyles rigged-to-head-bone: `SK_Hair_Long`,
  `SK_Hair_Parted`, `SK_Hair_Buzzed`, plus `SK_HairScalp` (buzzed-shell
  underlay for the scalp-less long style) and `SK_Beard_Full`.
- **Weapon**: `SK_StarterShortsword_*` (Blade/Guard/Grip/Pommel), the elf
  starter blade shortened to 0.68 and bone-parented to `hand_r` with its
  authored local transform.
- **Clips**: 11 base actions (Cast, CinderGuard, Death, Idle, RecieveHit, Run,
  Shoot_OneHanded, SiphonCleave, SwordSlash, Victory, Walk) appended from the
  elf source; locomotion/interaction/baseline clips load from the shared
  `/assets/3d/animations/elf-shadowknight/` packs at runtime.

## Rebuild

```powershell
blender.exe --background --python build_human_shadowknight_v3.py
blender.exe --background --python patch_v4.py   # sword reseat (pose-consistent)
blender.exe --background --python patch_v5.py   # scalp underlay
blender.exe --background --python patch_v5b.py  # underlay scale fix
blender.exe --background --python patch_v6_dedupe.py
```

All scripts and the editable source live in
`C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\custom-human-shadowknight\`
(`human-shadowknight-source-v3.blend`).

## Licenses

Quaternius Standard packs are CC0 1.0 (public-domain dedication). Blender 5.2
LTS is GPL; its license does not apply to artwork created with it. No paid API
key, generative 3D service, or proprietary marketplace asset was used.
