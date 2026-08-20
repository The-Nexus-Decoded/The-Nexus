"""BREACH-V2 starting-zone design data — single source of truth.

Every dimension is in TRUE METERS (world-frame discipline: same meters as the
Thalenyr/Heartvale world frame; engine nav cell = 1.75 m, hidden at runtime).

Coordinate convention for the fixed spine: +x east, +y south (screen/plan
convention, matching the engine's tile y). The Vestibule west wall is x=0.

This module is imported by make_breach_v2_flatmap.py (deliverable 1) and is
the measured source for breach-v2-registry.mjs (deliverable 2).
"""

# ---------------------------------------------------------------------------
# Fixed spine rooms: id, name, x, y, w, h (meters), kind, notes
# ---------------------------------------------------------------------------
FIXED_ROOMS = [
    dict(
        id="vestibule", name="Realm-Lock Vestibule", kind="start",
        x=0.0, y=0.0, w=30.0, h=22.0,
        notes="Fixed start. Damaged trans-realm machine-temple; cleanest room (corruption 0.05).",
    ),
    dict(
        id="plaza-link", name="Vestibule Gallery Link", kind="corridor",
        x=30.0, y=8.0, w=6.0, h=6.0,
        notes="Short fixed link; bronze conduits run east toward the paired doors.",
    ),
    dict(
        id="threshold-plaza", name="Threshold Plaza", kind="plaza",
        x=36.0, y=4.0, w=16.0, h=12.0,
        notes="Safe. Orren (north) + Brannoc (south) guide beat before the choice. Two doors on the east wall.",
    ),
    dict(
        id="convergence", name="Convergence Gallery", kind="convergence",
        x=176.0, y=5.0, w=12.0, h=10.0,
        notes="Both paths rejoin here (two west sockets, one east socket). Corruption rises (0.7).",
    ),
    dict(
        id="ashen-threshold", name="The Ashen Threshold (ante-room)", kind="ante",
        x=192.0, y=5.5, w=12.0, h=9.0,
        notes="Boss-suite ante-room. One-way portcullis seals behind the player.",
    ),
    dict(
        id="ashen-lock", name="The Ashen Lock (boss)", kind="boss",
        x=208.0, y=1.0, w=24.0, h=18.0,
        notes="Cinderbound Warden arena. Corruption densest (1.0). 3 boss-anchor sockets; V2 ships exactly 1 boss.",
    ),
    dict(
        id="memory-vault", name="First Memory Vault", kind="vault",
        x=236.0, y=3.0, w=10.0, h=8.0,
        notes="Sealed until the Warden falls. First Memory on the dais; awarded exactly once.",
    ),
    dict(
        id="exit-connector", name="The Way Upward (exit Connector)", kind="exit",
        x=236.0, y=12.0, w=16.0, h=6.0,
        notes="Ascending passage out of the Breach -> Heartvale hv-1 (Soul Well Basin), world anchor (5437.5, 2648.4).",
    ),
]

# Vestibule landmarks (local meters from room origin; room origin 0,0 NW corner)
VESTIBULE_LANDMARKS = [
    dict(id="soul-well", label="Soul Well (V14): silvery glowing pool", x=8.75, y=11.0,
         r=1.8, apron=2.65, note="pool Ø 3.6 m, rim apron Ø 5.3 m"),
    dict(id="player-emergence", label="Player emergence point", x=8.75, y=14.2, r=0.5),
    dict(id="ilyra", label="Wellkeeper Ilyra (Chronicle of Returning)", x=11.5, y=12.8, r=0.45),
    dict(id="memory-loom", label="Memory Loom (TRUE loom) — 3 stat pts · 1 ancestry boon · 1 discipline", x=3.6, y=8.2, r=1.3),
    dict(id="coffer", label="Wayfarer's Coffer (starter gear inspection)", x=24.4, y=14.6, r=0.9),
    dict(id="effigy", label="True training effigy (level-one rehearsal)", x=21.8, y=6.4, r=0.9),
]

# Threshold plaza landmarks
PLAZA_LANDMARKS = [
    dict(id="orren", label="Breach Scout Orren (guide beat)", x=44.0, y=7.0, r=0.45),
    dict(id="brannoc", label="Arena Warden Brannoc (guide beat)", x=44.0, y=13.0, r=0.45),
    dict(id="door-wayfarer", label="WAYFARER DOOR — easy path (soul-cyan)", x=52.0, y=6.5, w=3.0),
    dict(id="door-oathbreaker", label="OATHBREAKER DOOR — hard path (ember-red)", x=52.0, y=13.5, w=3.0),
]

# ---------------------------------------------------------------------------
# Randomized middle: seeded chamber slots per path (positions on the plan).
# Each run picks 3-5 rooms from the path pool and chains them west -> east
# through bent corridors. Slot count drawn here = maximum (5); a run uses the
# first N slots (N = 3..5 by seed).
# ---------------------------------------------------------------------------
PATH_SLOTS = {
    "wayfarer": [  # north arc
        dict(slot=1, x=64.0, y=-1.0),
        dict(slot=2, x=88.0, y=-7.0),
        dict(slot=3, x=112.0, y=-9.0),
        dict(slot=4, x=136.0, y=-7.0),
        dict(slot=5, x=160.0, y=-1.0),
    ],
    "oathbreaker": [  # south arc
        dict(slot=1, x=64.0, y=19.0),
        dict(slot=2, x=88.0, y=25.0),
        dict(slot=3, x=112.0, y=27.0),
        dict(slot=4, x=136.0, y=25.0),
        dict(slot=5, x=160.0, y=19.0),
    ],
}
SLOT_BOX = dict(w=15.0, h=13.0)  # indicative placeholder box on the plan
CORRIDOR_WIDTH = {"wayfarer": 3.5, "oathbreaker": 3.0}  # meters

# ---------------------------------------------------------------------------
# Room pools. Every room drawn at true size. Sockets are door/wall anchors.
# spawns = enemy sockets; props = prop sockets; loot = loot cache sockets.
# ---------------------------------------------------------------------------
EASY_POOL = [
    dict(id="E-01", name="Split Antechamber", w=16.0, h=13.0, sockets=["W", "E", "N"],
         spawns=2, props=5, loot=1, flavor="pillared entry; broken bronze conduit stubs"),
    dict(id="E-02", name="Broken Crossing", w=19.0, h=14.0, sockets=["W", "E", "N", "S"],
         spawns=2, props=6, loot=1, flavor="crossroads; collapsed center pillar"),
    dict(id="E-03", name="Crooked Reliquary", w=14.0, h=12.0, sockets=["W", "E"],
         spawns=1, props=5, loot=2, flavor="reliquary alcoves; loot niche"),
    dict(id="E-04", name="Hollow Junction", w=17.0, h=15.0, sockets=["W", "E", "S"],
         spawns=2, props=6, loot=1, flavor="bend hub; floor grates, floating fragments"),
    dict(id="E-05", name="Breach Overlook", w=15.0, h=12.0, sockets=["W", "E", "N"],
         spawns=2, props=4, loot=1, flavor="raised ledge; view into the breach void"),
    dict(id="E-06", name="Cinder Arcade", w=20.0, h=12.0, sockets=["W", "E"],
         spawns=2, props=6, loot=1, flavor="long gallery; brazier colonnade"),
    dict(id="E-07", name="Fallen Archive", w=16.0, h=14.0, sockets=["W", "E", "S"],
         spawns=1, props=7, loot=2, flavor="toppled shelves; supply cache"),
]

HARD_POOL = [
    dict(id="H-01", name="Squeeze Vault", w=12.0, h=10.0, sockets=["W", "E"],
         spawns=3, props=4, loot=1, flavor="tight vault; barricaded corners"),
    dict(id="H-02", name="Ravager Den", w=13.0, h=11.0, sockets=["W", "E", "S"],
         spawns=3, props=5, loot=1, flavor="egg nests; shed chitin"),
    dict(id="H-03", name="Oath Scar Gallery", w=12.0, h=12.0, sockets=["W", "E", "N"],
         spawns=3, props=5, loot=1, flavor="shackles and hanging cages"),
    dict(id="H-04", name="The Narrow March", w=14.0, h=9.0, sockets=["W", "E"],
         spawns=3, props=4, loot=1, flavor="corridor-fight; masonry barricades"),
    dict(id="H-05", name="Cinder Gauntlet", w=13.0, h=10.0, sockets=["W", "E", "S"],
         spawns=4, props=5, loot=1, flavor="kill lane; corruption growth"),
    dict(id="H-06", name="Breachling Warren", w=12.0, h=11.0, sockets=["W", "E", "N"],
         spawns=4, props=5, loot=1, flavor="burrowed wall breaches"),
    dict(id="H-07", name="The Toll Gate", w=14.0, h=10.0, sockets=["W", "E"],
         spawns=3, props=5, loot=2, flavor="portcullis pair; toll cache"),
]

# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
SPAWN_TABLE = {
    "wayfarer": dict(
        enemies="3 Breachlings per run (light)", distribution="seeded across chambers (1-2 per chamber)",
        health="1.00x", damage="1.00x", galleryPressure="34 + seed variance", bossPressure="64 + seed variance",
    ),
    "oathbreaker": dict(
        enemies="5 Oathbound/Ravager variants per run", distribution="seeded across chambers (denser: up to socket count)",
        health="1.55x", damage="1.22x", galleryPressure="58 + seed variance", bossPressure="84 + seed variance",
    ),
}

LOOT_TABLE = {
    "wayfarer": dict(
        pathReward="Tempered training gear",
        caches="minor recovery caches at loot sockets; breakable props pay out per destructible table",
        bonus="none",
    ),
    "oathbreaker": dict(
        pathReward="Grave-Iron class implement",
        caches="better caches at loot sockets (hard table); breakable props pay out per destructible table",
        bonus="deterministic 68% class-skill awakening, else valuable pressure shard (seeded, recorded)",
    ),
}

PROP_TABLE = {
    "easy": ["trestle-table", "heavy-bench", "high-backed-chair", "storage-barrel", "reinforced-crate",
             "archive-bookshelf", "archive-cupboard", "empty-weapon-rack", "supply-pile", "broken-handcart",
             "floor-brazier", "wall-torch-sconce", "cave-in-rubble", "bone-pile", "iron-floor-grate",
             "wooden-support-brace", "candelabra-cluster", "bottles-jugs-crockery-cluster"],
    "hard": ["corruption-growth", "monster-egg-nest", "cocooned-remains-web-mass", "shed-chitin-pile",
             "burrowed-wall-breach-plug", "chain-shackle", "hanging-iron-cage", "masonry-barricade",
             "bone-pile", "weapon-armor-heap", "rusted-portcullis", "floor-brazier", "wall-torch-sconce",
             "cave-in-rubble", "collapsed-timber-masonry-pile", "supply-pile", "storage-chest"],
    "boss-suite": ["corruption-growth", "guardian-statue", "ruined-stone-archway", "rusted-portcullis",
                   "floor-brazier", "chain-shackle", "bone-pile", "broken-stone-stair-dais"],
    "vestibule": ["floor-brazier", "wall-torch-sconce", "archive-bookshelf", "trestle-table",
                  "heavy-bench", "storage-chest (coffer)", "cave-in-rubble", "wooden-support-brace",
                  "candelabra-cluster"],
}

BOSS_SET = dict(
    bosses=[dict(id="cinderbound-warden", name="Cinderbound Warden", weight=1,
                 patterns=["cinder-sweep", "ash-call", "soul-tax"])],
    perRun=1,
    note="V2 ships exactly one boss; 3 anchor sockets + set architecture keep 3-of-6 boss sets possible later.",
)

SEED_POLICY = dict(
    layoutSeed="topology, chamber pick+order from path pool, corridor bends, encounter placement, boss pattern",
    dressingSeed="environment detail within legal placement sockets (never blocks doors/NPCs/spawns/quest/boss route)",
    rng="mulberry32 lineage (same as src/game/dungeon.ts); seed recorded per run; same seed -> same result",
    comparisonSeed=4182,
    validation="sparse / median / dense representative seeds + full invariant sweep incl. 4182",
)

CORRUPTION_GRADIENT = [
    ("Vestibule", 0.05), ("Threshold Plaza", 0.10), ("Wayfarer path", 0.25),
    ("Oathbreaker path", 0.45), ("Convergence", 0.70), ("Ashen Lock", 1.00),
    ("Memory Vault", 0.60), ("Way Upward (exit)", 0.30),
]

WORLD_ANCHOR = dict(zone="Heartvale hv-1 (Soul Well Basin)", x=5437.5, y=2648.4)


# ---------------------------------------------------------------------------
# Dressing — authored placement of the 3D AI Studio dungeon kit (38 IDs).
# Coordinates are LOCAL room meters (origin = room NW corner, +x east, +y south).
# Placement respects the kit catalog (floor/wall/ceiling) and never blocks
# doors, the W->E navigation spine, spawn sockets, or interactions.
# Every combat chamber carries a storage-chest at a loot socket (loot cache).
# ---------------------------------------------------------------------------

# asset -> (group, placement); placement mirrors DungeonPropCatalog.ts
ASSET_META = {
    "floor-brazier": ("fire", "floor"), "hanging-brazier": ("fire", "ceiling"),
    "wall-torch-sconce": ("fire", "wall"), "candelabra-cluster": ("fire", "floor"),
    "storage-chest": ("loot", "floor"), "supply-pile": ("loot", "floor"),
    "weapon-armor-heap": ("loot", "floor"), "bottles-jugs-crockery-cluster": ("goods", "floor"),
    "corruption-growth": ("corruption", "floor"), "monster-egg-nest": ("corruption", "floor"),
    "cocooned-remains-web-mass": ("corruption", "wall"), "shed-chitin-pile": ("corruption", "floor"),
    "burrowed-wall-breach-plug": ("corruption", "wall"),
    "chain-shackle": ("macabre", "wall"), "hanging-iron-cage": ("macabre", "ceiling"),
    "bone-pile": ("macabre", "floor"),
    "trestle-table": ("furniture", "floor"), "heavy-bench": ("furniture", "floor"),
    "high-backed-chair": ("furniture", "floor"), "archive-bookshelf": ("furniture", "wall"),
    "archive-cupboard": ("furniture", "wall"), "empty-weapon-rack": ("furniture", "wall"),
    "storage-barrel": ("goods", "floor"), "reinforced-crate": ("goods", "floor"),
    "broken-handcart": ("goods", "floor"),
    "cave-in-rubble": ("rubble", "floor"), "collapsed-timber-masonry-pile": ("rubble", "floor"),
    "masonry-barricade": ("structure", "floor"), "iron-floor-grate": ("structure", "floor"),
    "wooden-support-brace": ("structure", "wall"), "rusted-portcullis": ("structure", "wall"),
    "guardian-statue": ("structure", "floor"), "reliquary-wall-alcove": ("structure", "wall"),
    "broken-stone-stair-dais": ("structure", "floor"), "ruined-stone-archway": ("structure", "wall"),
    "ruined-altar": ("structure", "floor"), "false-wall-panel": ("structure", "wall"),
    "heavy-door": ("structure", "wall"),
}

# (asset, x, y) in local room meters
DRESSING = {
    # ---- EASY pool ----
    "E-01": [("floor-brazier", 2.0, 2.0), ("floor-brazier", 2.0, 11.0),
             ("wall-torch-sconce", 8.0, 0.3), ("heavy-bench", 6.5, 11.6),
             ("trestle-table", 11.0, 3.2), ("storage-barrel", 14.2, 11.5),
             ("reinforced-crate", 13.0, 11.0), ("iron-floor-grate", 8.0, 6.5),
             ("storage-chest", 14.0, 2.0)],
    "E-02": [("cave-in-rubble", 9.5, 4.2), ("broken-handcart", 3.8, 10.5),
             ("storage-barrel", 2.0, 2.0), ("wooden-support-brace", 0.4, 3.0),
             ("wall-torch-sconce", 9.5, 0.3), ("floor-brazier", 16.5, 3.5),
             ("storage-chest", 16.5, 11.8), ("bone-pile", 12.0, 9.0)],
    "E-03": [("reliquary-wall-alcove", 4.0, 0.4), ("reliquary-wall-alcove", 10.0, 0.4),
             ("ruined-altar", 7.0, 3.2), ("candelabra-cluster", 3.0, 9.0),
             ("archive-cupboard", 13.6, 9.5), ("floor-brazier", 2.2, 2.5),
             ("storage-chest", 12.5, 2.2), ("bone-pile", 8.5, 9.5)],
    "E-04": [("iron-floor-grate", 5.5, 7.5), ("iron-floor-grate", 11.5, 7.5),
             ("wooden-support-brace", 0.4, 3.0), ("wooden-support-brace", 16.6, 11.0),
             ("floor-brazier", 8.5, 2.5), ("heavy-bench", 4.0, 13.2),
             ("storage-barrel", 14.8, 12.5), ("storage-barrel", 13.5, 13.0),
             ("supply-pile", 2.5, 12.5), ("storage-chest", 15.0, 2.2)],
    "E-05": [("broken-stone-stair-dais", 11.5, 3.0), ("cave-in-rubble", 3.0, 9.0),
             ("floor-brazier", 4.5, 2.0), ("wall-torch-sconce", 11.0, 0.3),
             ("wall-torch-sconce", 3.0, 0.3), ("archive-bookshelf", 7.5, 11.4),
             ("storage-chest", 12.8, 8.8)],
    "E-06": [("floor-brazier", 5.0, 2.5), ("floor-brazier", 10.0, 2.5),
             ("floor-brazier", 15.0, 2.5), ("floor-brazier", 10.0, 9.5),
             ("heavy-bench", 7.0, 9.8), ("empty-weapon-rack", 18.6, 9.0),
             ("bottles-jugs-crockery-cluster", 13.0, 9.6), ("storage-chest", 2.2, 9.8)],
    "E-07": [("archive-bookshelf", 3.5, 0.5), ("archive-bookshelf", 7.5, 0.5),
             ("archive-bookshelf", 11.5, 0.5), ("archive-cupboard", 15.5, 2.5),
             ("trestle-table", 8.0, 9.5), ("high-backed-chair", 9.6, 10.3),
             ("bottles-jugs-crockery-cluster", 4.0, 11.0), ("supply-pile", 13.0, 11.5),
             ("floor-brazier", 2.0, 4.0), ("storage-chest", 2.2, 12.0)],
    # ---- HARD pool ----
    "H-01": [("masonry-barricade", 6.0, 3.2), ("cave-in-rubble", 9.5, 8.0),
             ("chain-shackle", 3.0, 0.4), ("floor-brazier", 2.0, 8.3),
             ("storage-chest", 10.5, 2.0)],
    "H-02": [("monster-egg-nest", 10.5, 8.5), ("shed-chitin-pile", 6.0, 7.0),
             ("cocooned-remains-web-mass", 11.5, 0.5), ("bone-pile", 3.0, 8.0),
             ("storage-chest", 2.0, 2.0)],
    "H-03": [("chain-shackle", 3.0, 0.4), ("chain-shackle", 9.0, 0.4),
             ("hanging-iron-cage", 6.0, 4.0), ("weapon-armor-heap", 9.0, 9.0),
             ("floor-brazier", 2.2, 10.0), ("storage-chest", 10.3, 10.3),
             ("false-wall-panel", 11.7, 9.0)],  # false wall conceals the loot approach
    "H-04": [("masonry-barricade", 5.0, 3.2), ("masonry-barricade", 9.0, 5.8),
             ("collapsed-timber-masonry-pile", 12.0, 7.5), ("wall-torch-sconce", 7.0, 0.3),
             ("storage-chest", 12.5, 1.8)],
    "H-05": [("corruption-growth", 10.5, 7.5), ("corruption-growth", 3.0, 2.5),
             ("floor-brazier", 4.0, 5.0), ("floor-brazier", 9.0, 5.0),
             ("bone-pile", 6.5, 8.2), ("storage-chest", 11.5, 2.0)],
    "H-06": [("burrowed-wall-breach-plug", 3.5, 0.5), ("burrowed-wall-breach-plug", 8.5, 0.5),
             ("monster-egg-nest", 9.5, 8.5), ("shed-chitin-pile", 3.5, 7.5),
             ("cocooned-remains-web-mass", 11.5, 8.5), ("storage-chest", 2.2, 9.5)],
    "H-07": [("rusted-portcullis", 7.0, 5.0), ("weapon-armor-heap", 11.5, 7.5),
             ("floor-brazier", 7.0, 8.5), ("supply-pile", 2.5, 8.0),
             ("storage-chest", 12.5, 2.2), ("storage-chest", 2.2, 2.0)],
}

# Fixed-room dressing, local room meters
FIXED_DRESSING = {
    "vestibule": [("wall-torch-sconce", 5.0, 0.3), ("wall-torch-sconce", 12.0, 0.3),
                  ("wall-torch-sconce", 18.0, 0.3), ("wall-torch-sconce", 25.0, 0.3),
                  ("floor-brazier", 5.8, 13.8), ("floor-brazier", 11.7, 13.8),
                  ("archive-bookshelf", 0.5, 3.5), ("trestle-table", 14.5, 3.6),
                  ("heavy-bench", 14.5, 5.4), ("empty-weapon-rack", 19.5, 0.4),
                  ("cave-in-rubble", 27.5, 19.0), ("collapsed-timber-masonry-pile", 2.0, 18.5),
                  ("candelabra-cluster", 22.8, 12.8), ("supply-pile", 26.8, 17.2),
                  ("guardian-statue", 28.6, 7.2), ("guardian-statue", 28.6, 14.8),
                  ("iron-floor-grate", 15.0, 13.0), ("wooden-support-brace", 0.4, 11.0),
                  ("wooden-support-brace", 0.4, 16.5)],
    "plaza-link": [("wall-torch-sconce", 1.5, 0.3), ("wall-torch-sconce", 4.5, 0.3)],
    "threshold-plaza": [("floor-brazier", 1.5, 2.5), ("floor-brazier", 1.5, 9.5),
                        ("empty-weapon-rack", 8.0, 0.4), ("heavy-bench", 8.0, 11.4),
                        ("iron-floor-grate", 8.0, 6.0), ("candelabra-cluster", 15.0, 6.0),
                        ("heavy-door", 15.8, 2.5), ("heavy-door", 15.8, 9.5)],  # the two trial door leaves
    "convergence": [("corruption-growth", 1.5, 2.0), ("corruption-growth", 1.5, 8.0),
                    ("floor-brazier", 10.5, 2.5), ("floor-brazier", 10.5, 7.5),
                    ("bone-pile", 6.0, 8.5), ("hanging-brazier", 6.0, 5.0)],
    "ashen-threshold": [("ruined-stone-archway", 0.3, 4.5), ("chain-shackle", 2.0, 0.4),
                        ("chain-shackle", 6.0, 0.4),
                        ("masonry-barricade", 10.5, 7.0), ("weapon-armor-heap", 3.0, 7.0),
                        ("floor-brazier", 6.0, 4.5)],  # archway frames the portcullis door
    "ashen-lock": [("broken-stone-stair-dais", 14.0, 9.0), ("guardian-statue", 3.5, 3.0),
                   ("guardian-statue", 3.5, 15.0), ("corruption-growth", 20.0, 3.0),
                   ("corruption-growth", 20.0, 14.0), ("corruption-growth", 10.0, 15.5),
                   ("chain-shackle", 8.0, 0.4), ("chain-shackle", 16.0, 0.4),
                   ("floor-brazier", 6.0, 9.0), ("floor-brazier", 18.0, 9.0),
                   ("bone-pile", 12.0, 13.0), ("cave-in-rubble", 2.5, 12.0),
                   ("hanging-brazier", 14.0, 5.0)],  # over the dais approach
    "memory-vault": [("reliquary-wall-alcove", 2.5, 0.4), ("reliquary-wall-alcove", 7.5, 0.4),
                     ("candelabra-cluster", 2.0, 6.5), ("candelabra-cluster", 8.0, 6.5),
                     ("storage-chest", 8.0, 2.2)],  # Warden's cache beside the First Memory dais
    "exit-connector": [("wooden-support-brace", 2.0, 0.3), ("wooden-support-brace", 8.0, 0.3),
                       ("wooden-support-brace", 14.0, 0.3), ("cave-in-rubble", 1.5, 4.5),
                       ("wall-torch-sconce", 5.0, 0.3),
                       ("ruined-stone-archway", 15.7, 3.0)],  # the breach exit arch into daylight
}
