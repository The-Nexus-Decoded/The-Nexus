# Level 01 — The First Breach

Status: current implementation contract

## Player-facing goal

Awaken inside a damaged trans-realm lock, learn who this new body is, seal a level-one Soul Imprint, recover battered starter gear, choose the severity of a shared dungeon trial, defeat its Cinderbound Warden, and recover the First Memory.

## Locked level topology

The trial doors do **not** create two maps.

`Realm-Lock Vestibule -> shared guide passage -> randomized 3-5 chamber Fractured Galleries crawl -> shared Ashen Lock miniboss room`

The Wayfarer and Oathbreaker doors change encounter data, Realm Pressure, rewards, and the possible bonus-skill result. They converge on the same seeded crawl layout and the same miniboss chamber. Each new Soulwell run generates three, four, or five connected gallery chambers with bends, corridors, blockers, dressing, and different encounter placement.

## Room 1: The Realm-Lock Vestibule

This is a large character-and-combat tutorial hub, not a disposable spawn box. It must read as a damaged machine-temple that once connected entire realms.

Required visual language:

- cracked PBR flagstones and masonry walls
- broken bronze conduits visibly linking the Memory Loom, Soul Well, and paired doors
- a functioning Soul Well with moving water, suspended shard, light, and ripples
- damaged pillars, rubble, cobwebs, ash, motes, braziers, empty coffers, shelves, work tables, and realm-memory reliefs
- a battered practice effigy and illustrated action bar
- two physically distinct eastern thresholds: soul-cyan Wayfarer and ember-red Oathbreaker

Required interactions:

1. Move on the real navigation floor.
2. Speak with Wellkeeper Ilyra for ancestry- and calling-specific origin lore.
3. Use the Memory Loom to distribute exactly three final stat points.
4. Choose one matching ancestry boon and one matching base-calling discipline.
5. Open the Wayfarer's Coffer for the shared worn tunic/pants/boots outfit, one mundane class-readable starter weapon, a faded binding charm, and two recovery bands.
6. Rehearse the signature, defense, and recovery actions on the effigy or in open space.
7. Choose a trial door.

The doors remain locked until the player has answered Ilyra, sealed the starter imprint, and opened the starter coffer. Touching either door then opens a voiced comparison containing both difficulty choices; touching a door never silently commits the player.

The character's ancestry and base calling were already selected in the Weaving. Ilyra refines the starter body; she does not replace those choices inside the room.

## Low-level magic boundary

The First Breach uses mortal techniques: weapon disciplines, human wizardry, practical necromancy, wards, color formulas, lesser summon bindings, life drain, and Gravefire.

Level-one characters do not yet use Sartan probability song, Patryn body/equipment runes, or mature Void/Death combinations. Those higher systems enter through specialization around levels 20–30. A class may later specialize toward Sartan, Patryn, Void, Dark, Death, or supported combinations, but no build combines Sartan-specific and Patryn-specific skills.

## Shared trial presets

| Property | Wayfarer Door | Oathbreaker Door |
| --- | --- | --- |
| Purpose | teaching route | high-risk tutorial challenge |
| Shared room | Fractured Galleries | Fractured Galleries |
| Light enemies | 3 Breachlings | 5 Oathbound/Ravager variants |
| Enemy health | 1.00× | 1.55× |
| Enemy damage | 1.00× | 1.22× |
| Gallery pressure | 34 + seed variance | 58 + seed variance |
| Boss pressure | 64 + seed variance | 84 + seed variance |
| Gear reward | tempered training gear | Grave-Iron class implement |
| Bonus skill | none | deterministic 68% class-skill awakening; otherwise a valuable pressure shard |

The hard reward roll is seeded and recorded so reopening a reward cannot reroll it.

## Area 2: The Fractured Galleries Crawl

This is the first live combat crawl for both paths, not one arena. A seeded run contains three to five distinct chambers joined by narrow and bent corridors. Chamber dimensions, vertical offsets, blockers, enemies, dressing, and route silhouette vary while the tutorial purpose stays fixed.

- Breach Scout Orren and Arena Warden Brannoc stand in a safe guide passage before the encounter threshold.
- Entering the passage reveals the first crawl section and Realm Pressure but does not start combat.
- Crossing the first hostile threshold starts the selected encounter; fog continues to conceal the sealed depth until reached.
- Textured masonry, broken pillars, rubble, braziers, floor scars, realm-lock circuits, floating fragments, fog, and unstable light carry the visual language forward.
- The player enters with Real-Time Action Bar by default or preselects Tactical Turns; both modes use the same character, enemies, stats, resources, and rewards.
- Real-time enemies pursue, auto-face, and attack without waiting for a player turn. Tactical enemies resolve only after a committed player action.
- Teal world markers identify talk/inspect interactions; bronze markers identify breakable props. Nonquest rubble, braziers, and cracked pillars have integrity, hit feedback, destruction animation, and walkable cleared tiles.

## Room 3: The Ashen Lock

Both paths fight the Cinderbound Warden in the same miniboss room. The chosen trial changes its health, damage, Realm Pressure, and final reward.

The Warden uses a seeded pattern—Cinder Sweep, Ash Call, or Soul Tax—with a readable heavy-attack telegraph. Health, Stability, Gravefire/class resource, and recovery charges carry forward from the gallery.

## Nine-step tutorial

1. Awaken and move.
2. Ask Ilyra why this ancestry/calling returned.
3. Seal three stat points, an ancestry boon, and a base discipline.
4. Recover gear and rehearse level-one actions.
5. Choose Wayfarer or Oathbreaker.
6. Clear the selected encounter in the shared gallery.
7. Recover and prepare without free resource resets.
8. Defeat the Cinderbound Warden.
9. Claim the First Memory and the trial reward.

## Acceptance criteria

- The page loads without downloaded Ultima data; every included asset is original or explicitly licensed.
- The starter chamber renders as a populated 3D environment, not flat art or a blank tile box.
- Mouse floor clicks and WASD/arrow movement both traverse the real navigation grid; a successful move produces visible locomotion and immediate status feedback.
- Every calling begins in the same humble clothing family with one mundane default implement. Any calling may later equip any weapon; proficiency and conditional item channels determine effectiveness instead of hard equip locks.
- The authored Elf Shadowknight is grounded, readable, animated, and wearing starter-tier—not heroic—equipment.
- Ilyra's dialogue opens the functional starter-imprint panel.
- Exactly three final stat points, one matching ancestry boon, and one matching calling discipline can be sealed only once.
- Both physical doors converge on the same next room and miniboss room.
- Every run contains exactly three to five reachable gallery chambers with unique generated object IDs.
- Wayfarer activates exactly three light enemies; Oathbreaker activates all five and scales health, damage, pressure, and rewards.
- The guide passage remains safe until the actual combat-room threshold.
- Skills can animate without a valid target; invalid dry activations cause no damage and spend no resource.
- Weapon Strike is always available as the universal zero-resource basic attack.
- Valid melee attacks automatically face a nearby target before the animation resolves.
- In real time, enemies visibly pursue and damage the player; the scheduler prevents an entire adjacent pack from attacking during one animation lock.
- Out-of-combat buffs, Stability costs, Gravefire generation/spending, recovery charges, cooldowns, and Realm Pressure are explained by hover help.
- Tactical and real-time modes share one simulation and one reward state.
- Camera zoom supports close character inspection, and Q/E plus corner controls rotate the three-quarter view.
- Defeating the Warden reveals the First Memory and grants the selected trial reward exactly once.
