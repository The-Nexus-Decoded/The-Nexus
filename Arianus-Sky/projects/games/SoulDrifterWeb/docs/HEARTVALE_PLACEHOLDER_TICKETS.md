# Heartvale placeholder replacement tickets (Finding 8 / V10)

Every placeholder in the hv-1/hv-2 build, tracked so none silently becomes
"the look". Policy: original or CC0 only, recorded in `third-party-assets.json`.

| Ticket | Placeholder | Current form | Replacement source | Removal condition |
| --- | --- | --- | --- | --- |
| HV-PH-01 | NPC scale figures | Capsule+head primitives with name sprites (`village.ts buildNpcs`) | Reuse the game's real character system (`src/game/character.ts` avatars) with tunic palette from `heartvale-npcs.json` | NPCs walk/idle with real rigs in the zone runtime |
| HV-PH-02 | Garden crops | Green cone tufts (`buildGarden`) | CC0 crop/vegetable minis (Quaternius/Kenney) or original planter rows | Gardens read as planted beds at ground level |
| HV-PH-03 | NPC name labels | Canvas sprites floating overhead | Real nameplate UI bound to the quest engine's NPC registry | Labels render from live NPC data, not scatter JSON |
| HV-PH-04 | Boats | Box-built punts (hull/ends/gunwales) | Original low-poly punt GLB or CC0 rowboat (Poly Pizza/Kenney) | Boats with real hull shading bob at the jetty |
| HV-PH-05 | Shop signs | Flat colored boards | Original painted sign textures (per shop kind) | Signs legible: smithy hammer, apothecary leaf, vendor scale |
| HV-PH-06 | Breach arch stubs | Stone boxes at the terrace | Original breach-arch kit matching the Level 01 interior portal | Arch reads as the same structure seen from inside L01 |
| HV-PH-07 | Soulwell feature | Stone ring + canopy + emissive disc | **Owner ruling V14: silvery machine-liquid POOL** — liquid metal shader, no well furniture | Pool replaces ring entirely; terrace stays |
| HV-PH-08 | Grass blade texture | Procedural canvas blades | Painted alpha card matching M-003 palette (Materialize pass) | Grass cards read painted, not procedural |

Note V7's 137 margin-band trees (16% outside every zone rect): pending decision —
assign to nearest zone or document as the deliberate seam-margin belt.
