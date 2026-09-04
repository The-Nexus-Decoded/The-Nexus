# SoulDrifter Character and Living-Story System

Status: implemented foundation for the first browser slice  
Scope: character creation, starter presentation, NPC dialogue, tutorials, and story-state persistence

## Character contract

Every playable character is the combination of an ancestry, a calling, and four recovered memories. Ancestry never determines morality. The canonical eligibility contract may forbid a biologically or metaphysically incompatible calling and may mark culturally unusual paths as Rare without hidden penalties.

### Ancestries

| Ancestry | Identity | Starting talent | Attribute direction |
| --- | --- | --- | --- |
| Human | adaptable survivors carrying several realm echoes | Versatile Training | no raw ancestry bonus; visible flexible training benefit |
| Elf | long memory and precision across broken worlds | Long Memory | +2 Insight, +1 Finesse |
| Dwarf | forge culture, ancestors, oaths, and conduits | Stone Anchor | +2 Will, +1 Vitality |
| Halfling | improvisation and hidden-route wayfinding | Hidden Route | +2 Finesse, +1 Will |

### Callings

| Calling | Level-one signature | Level-one defense | Tactical identity |
| --- | --- | --- | --- |
| Warrior | Cleaving Strike | Anchor Guard | frontline, stagger, guard break |
| Mage | Cinder Bolt | Blue Ward | color fields, burst, control |
| Priest | Consecrated Dart | Mending Ward | healing, wards, cleansing |
| Sharpshooter | Twin Shot | Evasive Mark | ranged lines, marks, traps |
| Paladin | Oath Hammer | Hold the Breach | oath protection and stun |
| Summoner | Call Lesser Wisp | Binding Circle | shaped allies and control |
| Asura | Mind Prick | Black Thread | hostile memory and risky curses |
| Slayer | Backstab | Shadowstep | flanks, poison, execution |
| Shadowknight | Siphon Cleave | Cinder Guard | drain tank, curses, Fire-Realm lich survival |

Slayer is the Lifepaper rogue/execution calling. Stalker is reserved beneath it as a later specialization, but its mechanics remain undefined until the coordinated class review; it is not selectable as a separate base calling.

The four memory questions are diegetic stat and skill creation. Their answers modify Might, Finesse, Insight, Will, Vitality, and Resonance; grant four remembered skills; and become story facts that later NPCs and quests can inspect.

The registry contains four ancestries and nine base callings. Thirty-two combinations are selectable: Dwarf and Halfling cannot select Mage or Shadowknight; Dwarf Sharpshooter remains allowed. Rare combinations remain selectable with cultural context and no hidden numerical penalty.

Monk is recorded as a planned tenth calling for a later class-design and asset pass. It is not yet part of the playable registry, the 32 currently selectable combinations, character creation, starter balance, or the production asset count.

Favored ancestry/calling pairings grant a named resonance passive and one additional attribute point. They create meaningful optimization without turning favored paths into requirements. The full progression ladder, mutually exclusive rune traditions, and specialization rules are in `CLASS_PROGRESSION_CODEX.md`.

### Ilyra's starter refinement

The external Weaving chooses the character's name, ancestry, base calling, and four memory answers. The first room does not repeat or replace those decisions.

Before the Memory Loom will answer, Ilyra opens the required **Chronicle of Returning**: seven concise illustrated boards covering Old Earth's Age of Dust, the rise of Sartan and Patryn, the Sundering, Xar and Haplo, the four-realm journey, the Seventh Gate, and the explicit boundary where SoulDrifter's original continuation begins. The final boards explain the Collision with the Book-of-Life reality, the weakening seals, the expected return of the old powers, and why many SoulDrifters have been resurrected to stabilize and prepare the mensch realms. Each board has readable text and temporary browser narration and is composed as a keyframe for a later animated opening. On the first run, all seven boards must be visited in order, but any individual voice segment may be skipped immediately. Closing early pauses and saves the current board without unlocking refinement. Recorded narration files can replace browser speech board-by-board without changing scripts or progression.

Wellkeeper Ilyra introduces a final level-one refinement at the Memory Loom:

- distribute exactly three permanent stat points across Might, Finesse, Insight, Will, Vitality, and Resonance
- choose one of two boons authored for the selected ancestry
- choose one of two mortal disciplines authored for the selected base calling
- recalculate maximum Vitality, maximum Stability, movement, and the visible skill list
- save the sealed result to the active character and refuse a second sealing

This gives the opening NPC dialogue mechanical weight while preserving free ancestry/calling combinations. It is mortal starter craft, not the later Sartan/Patryn specialization choice.

The selectable options and all 36 proposed ancestry/calling resonances are tracked in `STARTER_PERK_VETTING_MATRIX.md`. New combination perks remain proposals until Lord Xar approves them.

Level 1–19 characters do not use either advanced rune tradition. Their visible equipment and effects express mortal class craft; Aether-Scribed or Flesh-Forged layers are added only after the level-20 awakening choice.

### Appearance customization

Appearance is modular and does not change the character skeleton, calling, attributes, or animation library. Character creation exposes an ancestry-compatible set of:

- skin-tone material presets, including deep, dark, brown, olive, tan, light, pale, and ancestry-specific fantasy ranges where the lore supports them;
- hairstyles such as short crop, swept-back, shoulder-length, tied-back, braids, shaved, and bald, with additional ancestry-specific styles;
- hair-color presets, facial-detail variants, and later cosmetic additions such as beards, scars, markings, and jewelry.

Only one hairstyle occupies the hair slot at a time. Helmets either hide it or select an authored tucked-hair variant so hair never clips through armor. Hair, facial pieces, clothing, armor, weapons, sheaths, and harnesses remain separate equipment/presentation layers and never require the motion library to be downloaded again.

A chest/back weapon harness is conditional equipment, not part of the base shirt. It is visible only when a compatible back-carried weapon or sheath is attached. Starter longswords default to a hip sheath; back harnesses are reserved for suitable greatswords, heavy axes, staves, and other large implements.

## Equipment and presentation ladder

The spawn-zone character is C-tier. Every calling uses the same humble clothing family: a faded Soul-Well tunic, plain pants, a cracked belt, and worn boots. Class readability comes from a single mundane starter weapon, stance, and animation—not armor. The player must not awaken in heroic plate, elaborate robes, glowing relics, or endgame silhouettes.

| Calling | Default C-tier implement |
| --- | --- |
| Warrior | plain iron longsword |
| Mage | ashwood practice staff |
| Priest | plain wooden mace |
| Sharpshooter | rough shortbow |
| Paladin | plain iron shortsword and battered wooden shield |
| Summoner | unadorned binding rod |
| Asura | plain ritual knife |
| Slayer | pair of worn daggers |
| Shadowknight | battered iron longsword |

These are defaults, not equipment locks. Every calling can equip every weapon family. Untrained use reduces physical effectiveness, while learned weapon-family skills remain usable by any character that actually knows them. Item modifiers and granted spells declare their own calling activation lists. A Basic Fire Staff still functions as a staff for a Warrior or Shadowknight, but Mage-tagged Power, Fire affinity, and spell channels remain dormant. A Sword of the Heavens can supply base sword damage to anyone, activate Holy Power only for Paladins, and activate a Speed modifier for Paladins, Shadowknights, and Warriors. Tooltips must show active, dormant, and trainable properties separately; they must never falsely say the whole item is unusable.

Equipment remains visible on the character. Production animation will use layered body, clothing, armor, weapon, off-hand, rune/sigil, and effect frames so an item change changes the world sprite and paperdoll.

| Tier | Visual promise | Effect budget |
| --- | --- | --- |
| C — starter | exposed base silhouette, worn practical gear | one brief shape, minimal motes, short-lived impact |
| B — trained | complete kit and clearer class profile | secondary trail or small field response |
| A — awakened | rare materials and stronger rune circuitry | layered class-colored effects and longer reactions |
| S — realm-forged | unmistakable relic silhouette | authored multi-stage effects with environmental response |

Level-one combat must still feel responsive and attractive. It uses clear anticipation, a readable class-colored motion, impact flash, hit reaction, and sound timing; higher tiers gain layers and scale instead of replacing weak fundamentals with particle noise.

## First Breach guide cast

Every tutorial room has a visible guide:

| Room | NPC | Function |
| --- | --- | --- |
| Realm-Lock Vestibule | Wellkeeper Ilyra | explains the Sundering and this ancestry/calling, then opens the starter-refinement flow |
| safe guide passage | Breach Scout Orren | teaches unstable paths and the shared tactical/real-time combat contract |
| combat-room threshold | Arena Warden Brannoc | explains the class signature, defense, telegraphs, and selected shared-room trial |

The lore uses an original fractured-world premise: the Architects separated one world into realms to contain a buried silence; the Soul Wells acted as locks; the locks are now reversing. It seeks the epic puzzle-box feeling of realm-crossing fantasy without copying Death Gate names, factions, characters, machines, or plot beats.

## Data-authored dialogue

Base NPC content lives in `public/data/npcs.json`. Each NPC record contains identity, role, room, sprite, opening lines, optional ancestry branches, optional calling branches, choices, responses, and checkpoint effects. Runtime tokens such as `{name}`, `{race}`, `{calling}`, `{signatureSkill}`, and `{defensiveSkill}` are resolved from the active character.

The dialogue builder merges an optional saved story override over the base record. An override can change the NPC name, role, portrait, scene opening, ancestry lines, calling lines, choices, or responses. Missing override fields inherit the base story, so a live edit does not accidentally erase other character branches.

## Browser story database

The implemented IndexedDB database is named `souldrifter-story` and contains:

| Store | Purpose |
| --- | --- |
| `characters` | active derived character profile and update time |
| `npcStates` | conversation count and last scene/choice per character and NPC |
| `dialogueEvents` | append-only conversation-choice history |
| `checkpoints` | durable story and tutorial milestones |
| `storyOverrides` | replaceable data patches for dynamically altered NPC stories |

The title flow can resume the last saved soul. The first slice records character creation, conversations, choice checkpoints, tutorial milestones, combat start, and level completion locally.

## Multiplayer boundary

IndexedDB proves the schema and offline flow; it is not the final authority for multiplayer. Production moves these records behind an authenticated, server-authoritative event API. Dialogue content is versioned, progress events are append-only, derived NPC state is rebuildable, and clients receive only story variants they are allowed to see. The browser cache remains a resumable projection, not the source of truth.

## Next production work

- directional walk, idle, attack, cast, guard, stagger, downed, and interaction frames
- equipment paperdoll layers for every ancestry/calling body plan
- server-backed character slots, world state, and narrative-event synchronization
- an authenticated NPC/story authoring console with validation, preview, versioning, and rollback
- richer branching scenes keyed by memories, faction standing, inventory, party members, realm state, and prior dialogue
