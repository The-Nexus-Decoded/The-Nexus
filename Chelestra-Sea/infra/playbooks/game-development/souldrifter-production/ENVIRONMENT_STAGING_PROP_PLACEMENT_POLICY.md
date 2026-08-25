# SoulDrifter Environment Staging and Prop-Placement Policy

## Purpose

A structurally connected level is not ready for collision verification while it is still an empty shell.

Environmental props, furniture, fixtures, containers, wall art, debris, clues, cover and other staging objects change the real playable space. They therefore must be placed **after topology/shell acceptance but before the real-character collision walkthrough**.

Required order:

```text
accepted topology and connections
-> shared shell / floors / ceilings / thresholds
-> semantic environment staging and prop placement
-> prop-complete walkthrough and collision discovery
-> collision implementation/repair/regression
-> interaction and destruction
-> final integrated environment walkthrough
-> separate zone-population/gameplay ticket
```

Do not collision-test an empty room and then fill it with blocking props afterward.

---

# 1. Environment staging versus gameplay population

These are separate production phases.

## Environment staging belongs in the environment/level ticket

Includes:

- structural and architectural fixtures;
- furniture and functional room equipment;
- chests, cabinets, shelves and containers as placed objects;
- statues, paintings, banners, sconces and wall/ceiling fixtures;
- crates, barrels, pottery, rubble, bones and breakable clutter;
- cover and line-of-sight props;
- environmental storytelling and clues;
- hidden architectural spaces and secret-passage candidates;
- ambient bodies, cages, chains, skeleton fixtures and similar noncombat scenery;
- collision, interaction and destruction classification for every placed object.

## Zone population belongs in a later ticket

Includes:

- live NPC and monster spawns;
- patrols, behaviors and AI encounter composition;
- random encounters and respawn rules;
- quest actors, dialogue and objective entities;
- production loot/drop tables and rarity tuning;
- encounter-specific pickup spawning;
- combat pacing, waves and boss adds;
- population persistence and multiplayer synchronization.

A staged chest may receive a deterministic test item so opening/pickup can be verified. Final production loot tables may be assigned in the later population ticket.

The population ticket depends on an independently verified environment package. It must not use enemies or quest logic to hide unresolved topology, collision or interaction defects.

---

# 2. Stage every place according to what it is

Every spatial node receives a `spacePurposeProfile` and an environmental staging brief before props are placed.

A space should look and function like a believable place rather than a random collection of assets.

## Examples

### Dwelling / house

Expected categories may include:

- bed or sleeping area;
- storage/chests/cabinets;
- hearth, kitchen or food-preparation area;
- table, seating and lighting;
- personal belongings and maintenance objects;
- privacy and circulation appropriate to the inhabitants.

### Shop / market / service space

Expected categories may include:

- counter and service side;
- display shelves/racks/stock;
- secure storage;
- signage and lighting;
- customer circulation and queue space;
- work area and back-room logic.

### Tavern / inn

Expected categories may include:

- tables, seating, bar/service counter;
- food/drink storage;
- hearth and lighting;
- guest circulation;
- bedrooms or service areas when represented.

### Workshop / forge / laboratory

Expected categories may include:

- primary workstations;
- tools and raw materials;
- storage and waste;
- safety/ventilation/fire elements;
- in-progress work and environmental wear.

### Temple / shrine / ritual space

Expected categories may include:

- focal altar or ritual center;
- offerings, seating or processional space;
- iconography, lighting and storage;
- sacred versus service circulation;
- state/quest mechanisms when authorized.

### Dungeon / crypt / ruin

Expected categories may include:

- gates, cages, chains and restraints;
- skeletons, remains and environmental traces;
- rubble, collapsed architecture and repair bracing;
- braziers, sconces, altars and reliquaries;
- containers, discarded gear and broken furniture;
- wall art, warnings, maps and clues;
- hidden ruins, false walls and secret-route candidates;
- breakable clutter and noncritical barricades;
- evidence of the creatures or faction using the space.

### Cavern / underground biome / living-dungeon region

Expected categories may include:

- terrain landmarks and routes;
- vegetation/mineral/organic systems;
- water and hazard volumes;
- nests, dens, ruins or habitation traces;
- local subregions rather than uniform scatter;
- streaming and visibility boundaries where needed.

The profile may intentionally omit categories, but the omission should be a design choice—not forgotten staging.

---

# 3. Semantic placement map

Before placing assets, classify the playable space into semantic zones:

- critical traversal lane;
- alternate traversal lane;
- doorway/threshold clearance;
- stairs/ramp/landing clearance;
- combat center and telegraph lanes;
- cover/line-of-sight sockets;
- functional furniture zones;
- interactable-container sockets;
- destructible-prop sockets;
- wall-fixture sockets;
- ceiling/hanging-fixture sockets;
- environmental-storytelling clusters;
- hidden/secret candidate regions;
- protected structure/mechanism regions;
- camera clearance and visibility regions;
- streaming/LOD/culling cells where applicable.

No prop placement may be accepted without knowing which semantic zone it occupies.

---

# 4. Placement order

Place objects in dependency order:

1. **Structural fixtures and architectural set dressing**  
   Pillars, braces, built-in shelving, permanent machinery, stairs/railings, wall recesses and large fixed fixtures.

2. **Functional furniture and room equipment**  
   Beds, tables, counters, cabinets, workstations, altars, racks and lighting fixtures required by the space profile.

3. **Gameplay-readable containers and cover**  
   Chests, coffers, crates, barrels, barricades, destructible cover and searchable fixtures.

4. **Wall, ceiling and hanging objects**  
   Paintings, banners, sconces, chains, cages, signs and suspended props.

5. **Environmental storytelling clusters**  
   Bones, tools, remains, discarded items, books, food, supplies, ritual objects and faction traces.

6. **Clutter and small dressing**  
   Only after circulation, collision, interaction and performance budgets remain valid.

7. **Hidden or secret candidates**  
   False walls, hidden caches, breakable plugs and concealed passages, without activating quest/population scope prematurely.

Large objects are placed before small clutter so the system does not reserve critical space for decoration and then force functional objects into traversal lanes.

---

# 5. Placement source and determinism

Use authored sockets, semantic volumes, procedural rules and deterministic seeds.

Do not scatter objects without regard to room function or clearance.

Every placement record includes:

- asset ID and source/provenance;
- spatial-node ID and semantic zone;
- transform, footprint and height envelope;
- wall/floor/ceiling/anchor relationship;
- collision class;
- interaction class;
- destruction class;
- protected/quest-critical reason when applicable;
- LOD/culling/performance class;
- deterministic seed/rule or authored-placement ID;
- rollback/removal path.

---

# 6. Placement acceptance gates

Before the first prop-complete walkthrough:

```text
criticalTraversalLaneObstructions == 0
thresholdClearanceViolations == 0
stairsRampLandingObstructions == 0
unintendedPropIntersections == 0
floatingOrUnsupportedProps == 0
wallFixtureAnchorFailures == 0
ceilingFixtureAnchorFailures == 0
cameraClearanceFailures == 0
unclassifiedCollisionObjects == 0
unclassifiedInteractionObjects == 0
unclassifiedDestructionObjects == 0
unexplainedProtectedObjects == 0
semanticProfileCriticalCategoryGaps == 0
performanceBudgetFailures == 0
```

The environment must also pass a visual staging audit:

- each space reads as its intended function;
- it does not look like an empty box;
- it does not look like random asset spam;
- negative space and navigation remain readable;
- repeated assets are varied appropriately;
- important interactions and exits remain visually legible;
- lighting fixtures, wall art and props are physically seated.

---

# 7. Current First Breach application

The current #451 branch already contains extensive staging. Do not restart it merely to follow this policy.

For #451:

1. treat current prop placement as the staging candidate;
2. audit every placed asset against this policy;
3. preserve valid placements;
4. repair only floating, intersecting, unclassified, obstructive or semantically incorrect placements;
5. freeze the accepted staged environment;
6. run the real-character collision walkthrough against that complete staged version;
7. continue to interaction/destruction and final integrated verification.

The later chained-skeleton fixture pilot remains a final atmosphere/pipeline pilot, not a reason to postpone collision and interaction verification of the existing staged environment.

## Done rule

Environmental staging is complete when every space is functionally believable, every object is legally placed and classified, the final intended prop set is present for collision testing, and no unexplained prop obstructs topology, traversal, camera, combat or interactions.