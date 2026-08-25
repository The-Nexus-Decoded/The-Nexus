# Universal Environment Staging and Prop-Placement Policy

## Purpose

A connected shell is not ready for final collision verification while it is empty.

Environmental fixtures, furniture, containers, cover, art, debris, clues and clutter change the playable space. The project therefore places and classifies the intended environment-prop set **after topology/shell acceptance and before the real-controller collision walkthrough**.

```text
accepted topology/shell
-> semantic staging and prop placement
-> prop-complete walkthrough/collision discovery
-> collision repair/regression
-> interaction/destruction
-> final integrated environment walkthrough
```

Do not test collision on an empty shell and then add blocking objects afterward.

---

# Environment staging versus population

## Environment/level phase

Normally owns:

- structural and built-in fixtures;
- functional furniture/equipment;
- containers and environmental cover;
- wall/ceiling/hanging objects;
- environmental storytelling, clues and ambient remains;
- breakable clutter and protected structures;
- hidden/secret candidates;
- collision, interaction, destruction and performance classification.

## Later population/gameplay phase

Normally owns:

- live NPC/creature spawns;
- patrols, encounter composition and respawn;
- random encounters;
- quest actors/dialogue/objectives;
- production loot/drop tables;
- population persistence/network behavior.

A staged container may use deterministic test contents to verify interaction. Final loot tuning can remain in the population/gameplay ticket.

---

# Space-purpose profiles

Every spatial node receives a profile describing what the place is and what functional categories should be present.

Examples:

- **dwelling:** sleeping, storage, food/hearth, seating, lighting, personal-use areas;
- **shop:** counter, display/stock, secure storage, signage, work zone, customer circulation;
- **tavern/inn:** service counter, seating, food/drink storage, hearth, guest/service circulation;
- **workshop/lab:** workstations, tools, materials, storage, waste and safety systems;
- **temple/shrine:** ritual focus, offerings, processional/service space, iconography and lighting;
- **dungeon/ruin:** restraints, remains, rubble, repair bracing, altars, lighting, containers, clues, breakable clutter and occupant/faction traces;
- **biome/mega-zone:** terrain landmarks, local subregions, routes, environmental systems and streaming cells rather than uniform scatter.

Omissions are allowed when intentional and recorded.

---

# Semantic placement zones

Classify:

- critical and alternate traversal lanes;
- doorway/threshold clearance;
- stairs/ramp/landing clearance;
- combat/telegraph lanes;
- cover sockets;
- furniture/functional zones;
- interactable-container sockets;
- destructible-prop sockets;
- wall/ceiling/hanging sockets;
- storytelling clusters;
- hidden/secret candidate regions;
- protected mechanisms/structures;
- camera clearance;
- streaming/LOD/culling regions.

Every accepted placement belongs to a semantic zone.

---

# Placement order

```text
1. structural fixtures / built-ins
2. functional furniture and equipment
3. containers and gameplay cover
4. wall, ceiling and hanging objects
5. environmental-storytelling clusters
6. small clutter
7. hidden/secret candidates
```

Large functional objects precede small decoration.

Use authored sockets, semantic volumes, deterministic procedural rules and project-defined density/performance budgets. Avoid blind scatter.

Every placement records:

- asset/provenance;
- node and semantic zone;
- transform/footprint/height envelope;
- anchor relationship;
- collision class;
- interaction class;
- destruction class;
- protection/noninteraction reason when applicable;
- performance/LOD/culling class;
- deterministic rule/seed or authored ID;
- rollback/removal path.

---

# Placement acceptance

Before the prop-complete walkthrough:

```text
criticalTraversalObstructions == 0
thresholdClearanceViolations == 0
verticalTransitionObstructions == 0
unintendedIntersections == 0
floatingUnsupportedObjects == 0
anchorFailures == 0
cameraClearanceFailures == 0
unclassifiedCollisionObjects == 0
unclassifiedInteractionObjects == 0
unclassifiedDestructionObjects == 0
unexplainedProtectedObjects == 0
criticalSpaceProfileGaps == 0
performanceBudgetFailures == 0
```

The visual audit must confirm that each place reads as its intended function, avoids empty-box presentation and random asset spam, preserves negative space, and keeps important interactions/exits readable.

## Done rule

Staging is complete when the intended environment-prop set is present, believable, legally placed, classified and frozen for the real-controller collision pass.