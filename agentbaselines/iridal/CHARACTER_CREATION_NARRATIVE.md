# Character Creation Narrative — Soul Drifter

## Overview

Character creation establishes player identity before entering the dying sky. This is the narrative foundation — who you are shapes how you experience the falling world.

## Race Selection

| Race | Realm | Narrative Hook | Starting Lore |
|------|-------|----------------|---------------|
| **Aerian** | Arianus (Sky) | Sky-born, remember when the realm was whole | Wind Direction |
| **Sartan** | Pryan (Fire) | Fire shapers, escaped the death trap | Thermal Discovery |
| **Durnai** | Chelestra (Water) | Water realm survivors, adapted to extremes | Soul Binding |
| **Patryn** | Abarrach (Death) | Death walkers, escaped the Labyrinth | Void Walking |

### Lore Details

**Aerian**
> "We were born on the wind. Now we watch it die."

The Aerians are the native people of Arianus. They once ruled the sky with grace, binding wind to their will. Now they watch their world crumble. An Aerian player has inherent knowledge of the sky — wind patterns, thermal currents, the language of the heavens.

**Sartan**
> "We shaped fire. We escaped death. We will not fall."

The Sartan are the fire-shapers of Pryan, the Fire World. They escaped the Death Gate and found new purpose in the dying sky. A Sartan player brings thermal sensitivity — they can read heat signatures, find thermal pockets, and sense the ember-hearts of fallen islands.

**Durnai**
> "Water finds a way. So do we."

The Durnai survived Chelestra, the Water World, by becoming adaptable. They flow around danger. A Durnai player has soul attunement — they can sense fragmented souls, bind them, and draw strength from collected essence.

**Patryn**
> "We walked through death. This is nothing."

The Patryn are the most hardened survivors — they escaped Abarrach, the Death World, by mastering the Labyrinth. A Patryn player has void resistance — they can survive in the spaces between, where entropy is strongest.

---

## Class Selection

| Class | Playstyle | Narrative Identity | Starting Artifact |
|-------|-----------|-------------------|-------------------|
| **Wind Walker** | Mobility, z-drift | Reads wind, moves with the sky | Wind Compass |
| **Thermal Hunter** | Discovery, fragments | Reads heat, finds lost souls | Ember Stone |
| **Soul Binder** | Support, collection | Binds and protects souls | Soul Vessel |
| **Sky Knight** | Combat, direct | Fights to protect what remains | Void Blade |

### Class Details

**Wind Walker**
> "The sky is not my enemy. It is my ally."

Masters of aerial mobility. Wind Walkers read wind patterns and use them to drift, dodge, and navigate. In combat, they use wind to disorient enemies.

- **Ability:** Z-drift (vertical dodge), Wind Push
- **Synergy:** Aerian, Patryn
- **Lore specialty:** Wind Direction

**Thermal Hunter**
> "Heat never lies. It shows me what's been lost."

Specialists in discovery. Thermal Hunters sense thermal signatures and find hidden fragments, lore objects, and secret paths.

- **Ability:** Thermal Sense, Fragment Detection
- **Synergy:** Sartan, Aerian
- **Lore specialty:** Thermal Discovery

**Soul Binder**
> "The dead still speak. I listen."

Support specialists who bind fragmented souls. Soul Binders can collect, protect, and release soul energy for themselves or allies.

- **Ability:** Soul Collect, Soul Shield
- **Synergy:** Durnai, Patryn
- **Lore specialty:** Sundering's Cost

**Sky Knight**
> "This sky has taken enough. I will fight for what remains."

Combat-focused. Sky Knights are warriors who protect survivors and fight the corrupted creatures of the dying sky.

- **Ability:** Void Blade, Sky Strike
- **Synergy:** Patryn, Sartan
- **Lore specialty:** The Up Draft

---

## Gender

Gender is a cosmetic + narrative choice in Soul Drifter. It affects:
- Character model (cosmetic)
- NPC dialogue variants (some NPCs address players differently)
- Nothing mechanical — gameplay is gender-neutral

**Narrative approach:** The Death Gate Cycle lore is not gender-restricted. Both Sartan and Patryn have gender diversity. Players choose freely.

---

## Artifact System

Artifacts are starting items that provide mechanical benefits and narrative hooks.

### Starting Artifacts

| Artifact | Class | Lore | Benefit |
|----------|-------|------|---------|
| **Wind Compass** | Wind Walker | "It always points toward safety in the storm." | +10% drift efficiency, points to nearest thermal |
| **Ember Stone** | Thermal Hunter | "The last spark of Pryan's fire, given to me by a Sartan elder." | Thermal range +5m, detects fragments |
| **Soul Vessel** | Soul Binder | "A container for the unbound. My grandmother's最后一次呼吸." | +1 fragment capacity, auto-collects nearby |
| **Void Blade** | Sky Knight | "Forged in Abarrach's darkness. It hungers for light." | +10% damage, terrifies lower-tier enemies |

### Artifact Acquisition

1. Player selects Race → narrative context established
2. Player selects Class → starting artifact determined
3. Artifact unlocks in-hud, with lore popup
4. Artifact defines starting ability + benefits

---

## Character Selection Flow

```
[Nexus Hub]
    ↓
[Character Selection Screen]
    ↓
[Race Selection] → (Lore popup for each)
    ↓
[Class Selection] → (Lore popup for each)
    ↓
[Gender Selection] → (Cosmetic only)
    ↓
[Artifact Reveal] → (Lore popup + ability unlock)
    ↓
[Enter Arianus-Sky] → Zone 1 Entry
```

---

## Narrative Pacing

- **Nexus Hub:** "Choose who you are before you enter the dying sky."
- **Race Select:** Brief lore flash — 2-3 sentences
- **Class Select:** Brief lore flash — 2-3 sentences
- **Artifact:** Full lore card — who gave it to you, what it means
- **Zone 1 Entry:** "You arrive in [realm]. The sky remembers you."

---

## Implementation Notes

- Race/Class/Gender stored in DataStore
- Artifact ID tracked for ability system
- UI: Lore popups on selection (not skippable for first playthrough)
- Subsequent plays: Skip option

---

## Next Steps

1. ✅ Framework drafted
2. ⬜ Edmund confirms system flow
3. ⬜ Bane/Vasu implement DataStore fields
4. ⬜ UI wireframes from Orla
5. ⬜ Lore text finalized
