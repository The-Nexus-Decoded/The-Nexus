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
        x=208.0, y=-1.0, w=30.0, h=22.0,
        notes="Cinderbound Warden arena. Corruption densest (1.0). 3 boss-anchor sockets with a glowing rune circle at the active anchor; V2 ships exactly 1 boss.",
    ),
    dict(
        id="memory-vault", name="First Memory Vault", kind="vault",
        x=242.0, y=3.0, w=10.0, h=8.0,
        notes="Sealed until the Warden falls. First Memory on the dais; awarded exactly once.",
    ),
    dict(
        id="exit-connector", name="The Way Upward (exit Connector)", kind="exit",
        x=242.0, y=12.0, w=16.0, h=6.0,
        notes="Ascending passage out of the Breach -> Heartvale hv-1 (Soul Well Basin), world anchor (5437.5, 2648.4).",
    ),
]

# Vestibule landmarks (local meters from room origin; room origin 0,0 NW corner)
VESTIBULE_LANDMARKS = [
    dict(id="soul-well", label="Soul Well (V14): silvery glowing pool", x=8.75, y=11.0,
         r=1.8, apron=2.65, note="pool Ø 3.6 m, rim apron Ø 5.3 m"),
    dict(id="player-emergence", label="Player emergence point", x=8.75, y=14.2, r=0.5),
    dict(id="ilyra", label="Wellkeeper Ilyra (Chronicle of Returning)", x=12.6, y=13.6, r=0.45),
    dict(id="memory-loom", label="Memory Loom (TRUE loom) — 3 stat pts · 1 ancestry boon · 1 discipline", x=3.6, y=8.2, r=1.3),
    dict(id="coffer", label="Wayfarer's Coffer (starter gear inspection)", x=24.4, y=14.6, r=0.9),
    dict(id="effigy", label="True training effigy (level-one rehearsal)", x=21.8, y=6.4, r=0.9),
]

# Threshold plaza landmarks — ROOM-LOCAL meters (plaza origin 36,4 on the plan)
PLAZA_LANDMARKS = [
    dict(id="orren", label="Breach Scout Orren (guide beat)", x=8.0, y=3.0, r=0.45),
    dict(id="brannoc", label="Arena Warden Brannoc (guide beat)", x=8.0, y=9.0, r=0.45),
    dict(id="door-wayfarer", label="WAYFARER DOOR — easy path (soul-cyan)", x=16.0, y=2.5, w=3.0),
    dict(id="door-oathbreaker", label="OATHBREAKER DOOR — hard path (ember-red)", x=16.0, y=9.5, w=3.0),
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
        enemyCount=3, enemyKinds=["breachling"], healthMult=1.00, damageMult=1.00,
        galleryPressureBase=34, bossPressureBase=64,
        enemies="3 Breachlings per run (light)", distribution="seeded across chambers (1-2 per chamber)",
        health="1.00x", damage="1.00x", galleryPressure="34 + seed variance", bossPressure="64 + seed variance",
    ),
    "oathbreaker": dict(
        enemyCount=5, enemyKinds=["oathbound", "ravager"], healthMult=1.55, damageMult=1.22,
        galleryPressureBase=58, bossPressureBase=84,
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
             "cave-in-rubble", "collapsed-timber-masonry-pile", "supply-pile", "storage-chest",
             "storage-barrel", "reinforced-crate"],
    "boss-suite": ["corruption-growth", "guardian-statue", "ruined-stone-archway", "rusted-portcullis",
                   "floor-brazier", "chain-shackle", "bone-pile", "broken-stone-stair-dais",
                   "cocooned-remains-web-mass", "weapon-armor-heap", "storage-barrel",
                   "reinforced-crate", "broken-handcart"],
    "vestibule": ["floor-brazier", "wall-torch-sconce", "archive-bookshelf", "trestle-table",
                  "heavy-bench", "storage-chest (coffer)", "cave-in-rubble", "wooden-support-brace",
                  "candelabra-cluster"],
}

BOSS_SET = dict(
    bosses=[dict(id="cinderbound-warden", name="Cinderbound Warden", weight=1,
                 patterns=["cinder-sweep", "ash-call", "soul-tax"])],
    perRun=1,
    activeAnchor=[223.0, 10.0],
    note="V2 ships exactly one boss at the central activation sigil; reserve sockets keep future encounter variants possible.",
)
# boss anchor sockets (world meters); the seeded active anchor gets the glowing rune circle
BOSS_ANCHOR_SOCKETS = [(223.0, 10.0), (217.5, 4.5), (228.5, 4.5)]
BOSS_RUNE_CIRCLE = dict(radius=3.35, note="central realm-lock sigil with radial cinder hazard lanes")

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
             ("storage-barrel", 2.0, 2.0), ("reinforced-crate", 3.6, 2.0),
             ("wooden-support-brace", 0.4, 3.0),
             ("wall-torch-sconce", 9.5, 0.3), ("floor-brazier", 16.5, 3.5),
             ("storage-chest", 16.5, 11.8), ("bone-pile", 12.0, 9.0)],
    "E-03": [("reliquary-wall-alcove", 4.0, 0.4), ("reliquary-wall-alcove", 10.0, 0.4),
             ("ruined-altar", 7.0, 3.2), ("candelabra-cluster", 3.0, 9.0),
             ("archive-cupboard", 13.6, 9.5), ("floor-brazier", 2.2, 2.5),
             ("storage-chest", 12.5, 2.2), ("bone-pile", 8.5, 9.5),
             ("storage-barrel", 11.8, 10.2), ("reinforced-crate", 10.2, 10.2)],
    "E-04": [("iron-floor-grate", 5.5, 7.5), ("iron-floor-grate", 11.5, 7.5),
             ("wooden-support-brace", 0.4, 3.0), ("wooden-support-brace", 16.6, 11.0),
             ("floor-brazier", 8.5, 2.5), ("heavy-bench", 4.0, 13.2),
             ("storage-barrel", 14.8, 12.5), ("storage-barrel", 13.5, 13.0),
             ("reinforced-crate", 12.0, 12.5),
             ("supply-pile", 2.5, 12.5), ("storage-chest", 15.0, 2.2)],
    "E-05": [("broken-stone-stair-dais", 11.5, 3.0), ("cave-in-rubble", 3.0, 9.0),
             ("floor-brazier", 4.5, 2.0), ("wall-torch-sconce", 11.0, 0.3),
             ("wall-torch-sconce", 3.0, 0.3), ("archive-bookshelf", 7.5, 11.4),
             ("storage-chest", 12.8, 8.8), ("storage-barrel", 2.2, 2.0),
             ("reinforced-crate", 3.7, 2.0)],
    "E-06": [("floor-brazier", 5.0, 2.5), ("floor-brazier", 10.0, 2.5),
             ("floor-brazier", 15.0, 2.5), ("floor-brazier", 10.0, 9.5),
             ("heavy-bench", 7.0, 9.8), ("empty-weapon-rack", 18.6, 9.0),
             ("bottles-jugs-crockery-cluster", 13.0, 9.6), ("storage-chest", 17.5, 2.0),
             ("storage-barrel", 17.5, 9.6), ("reinforced-crate", 16.0, 9.5)],
    "E-07": [("archive-bookshelf", 3.5, 0.5), ("archive-bookshelf", 7.5, 0.5),
             ("archive-bookshelf", 11.5, 0.5), ("archive-cupboard", 15.5, 2.5),
             ("trestle-table", 8.0, 9.5), ("high-backed-chair", 9.6, 10.3),
             ("bottles-jugs-crockery-cluster", 4.0, 11.0), ("supply-pile", 13.0, 11.5),
             ("floor-brazier", 2.0, 4.0), ("storage-chest", 13.5, 3.7),
             ("storage-barrel", 12.8, 11.2), ("reinforced-crate", 11.2, 11.0)],
    # ---- HARD pool ----
    "H-01": [("masonry-barricade", 6.0, 2.1), ("cave-in-rubble", 9.5, 8.0),
             ("chain-shackle", 3.0, 0.4), ("floor-brazier", 2.0, 8.3),
             ("storage-chest", 10.5, 2.0), ("storage-barrel", 2.0, 2.0),
             ("reinforced-crate", 3.5, 2.0)],
    "H-02": [("monster-egg-nest", 10.5, 8.5), ("shed-chitin-pile", 6.0, 7.0),
             ("cocooned-remains-web-mass", 11.5, 0.5), ("bone-pile", 3.0, 8.0),
             ("floor-brazier", 6.5, 9.2),
             ("storage-chest", 10.5, 2.5), ("storage-barrel", 10.5, 9.0),
             ("reinforced-crate", 9.0, 2.0)],
    "H-03": [("chain-shackle", 3.0, 0.4), ("chain-shackle", 9.0, 0.4),
             ("hanging-iron-cage", 6.0, 4.0), ("weapon-armor-heap", 9.0, 9.0),
             ("floor-brazier", 2.2, 10.0), ("storage-chest", 10.3, 10.3),
             ("false-wall-panel", 11.7, 9.0), ("storage-barrel", 2.0, 2.0),
             ("reinforced-crate", 3.5, 2.0)],  # false wall conceals the loot approach
    "H-04": [("masonry-barricade", 5.0, 3.2), ("masonry-barricade", 9.0, 5.8),
             ("collapsed-timber-masonry-pile", 12.0, 7.5), ("wall-torch-sconce", 7.0, 0.3),
             ("floor-brazier", 2.0, 7.2),
             ("storage-chest", 12.5, 1.8), ("storage-barrel", 2.0, 1.8),
             ("reinforced-crate", 3.5, 1.8)],
    "H-05": [("corruption-growth", 10.5, 7.5), ("corruption-growth", 3.0, 2.5),
             ("floor-brazier", 4.0, 5.0), ("floor-brazier", 9.0, 5.0),
             ("bone-pile", 6.5, 8.2), ("storage-chest", 11.5, 2.0),
             ("storage-barrel", 2.0, 8.2), ("reinforced-crate", 3.5, 8.2)],
    "H-06": [("burrowed-wall-breach-plug", 3.5, 0.5), ("burrowed-wall-breach-plug", 8.5, 0.5),
             ("monster-egg-nest", 9.5, 8.5), ("shed-chitin-pile", 3.5, 7.5),
             ("floor-brazier", 2.0, 2.0),
             ("cocooned-remains-web-mass", 11.5, 8.5), ("storage-chest", 10.0, 2.0),
             ("storage-barrel", 10.0, 9.0), ("reinforced-crate", 8.5, 9.0)],
    "H-07": [("rusted-portcullis", 7.0, 6.4), ("weapon-armor-heap", 11.5, 7.5),
             ("floor-brazier", 7.0, 8.5), ("supply-pile", 2.5, 8.0),
             ("storage-chest", 12.5, 2.2), ("storage-chest", 2.2, 2.0),
             ("storage-barrel", 2.5, 7.5), ("reinforced-crate", 4.0, 7.5)],
}

# Fixed-room dressing, local room meters
FIXED_DRESSING = {
    "vestibule": [("wall-torch-sconce", 5.0, 0.3), ("wall-torch-sconce", 12.0, 0.3),
                  ("wall-torch-sconce", 18.0, 0.3), ("wall-torch-sconce", 25.0, 0.3),
                  ("floor-brazier", 5.8, 13.8), ("floor-brazier", 11.7, 13.8),
                  ("archive-bookshelf", 0.5, 3.5), ("archive-bookshelf", 0.5, 6.4),
                  ("archive-bookshelf", 16.0, 0.5),
                  ("archive-bookshelf", 17.8, 21.5), ("archive-bookshelf", 21.2, 21.5),
                  ("archive-cupboard", 25.4, 21.5), ("trestle-table", 14.5, 3.6),
                  ("heavy-bench", 14.5, 5.4), ("empty-weapon-rack", 19.5, 0.4),
                  ("empty-weapon-rack", 23.0, 0.4), ("weapon-armor-heap", 26.0, 4.0),
                  ("floor-brazier", 20.8, 3.5), ("storage-chest", 27.8, 2.0),
                  ("reinforced-crate", 28.2, 10.2), ("storage-barrel", 28.2, 12.0),
                  ("cave-in-rubble", 27.5, 19.0), ("collapsed-timber-masonry-pile", 2.0, 18.5),
                  ("candelabra-cluster", 22.8, 12.8), ("supply-pile", 26.8, 17.2),
                  ("guardian-statue", 28.6, 7.2), ("guardian-statue", 28.6, 14.8),
                  ("iron-floor-grate", 15.0, 13.0), ("wooden-support-brace", 0.4, 11.0),
                  ("wooden-support-brace", 0.4, 16.5)],
    "plaza-link": [("wall-torch-sconce", 1.5, 0.3), ("wall-torch-sconce", 4.5, 0.3)],
    "threshold-plaza": [("floor-brazier", 1.5, 2.5), ("floor-brazier", 1.5, 9.5),
                        ("empty-weapon-rack", 8.0, 0.4), ("heavy-bench", 8.0, 11.4),
                        ("iron-floor-grate", 8.0, 6.0), ("candelabra-cluster", 15.0, 6.0),
                        ("storage-barrel", 2.2, 10.2), ("reinforced-crate", 3.7, 10.2),
                        ("storage-chest", 3.8, 5.5)],  # route portcullises are runtime-owned
    "convergence": [("corruption-growth", 1.5, 2.0), ("corruption-growth", 1.5, 8.0),
                    ("floor-brazier", 10.5, 2.5), ("floor-brazier", 10.5, 7.5),
                    ("bone-pile", 6.0, 8.5), ("hanging-brazier", 6.0, 5.0),
                    ("storage-barrel", 9.8, 8.5), ("reinforced-crate", 8.3, 8.5),
                    ("storage-chest", 9.8, 1.5)],
    "ashen-threshold": [("chain-shackle", 2.0, 0.4),
                        ("chain-shackle", 6.0, 0.4),
                        ("masonry-barricade", 10.5, 7.0), ("weapon-armor-heap", 3.0, 7.0),
                        ("floor-brazier", 6.0, 4.5), ("storage-barrel", 8.5, 7.2),
                        ("reinforced-crate", 7.0, 7.2)],
    "ashen-lock": [("broken-stone-stair-dais", 20.0, 11.0), ("guardian-statue", 3.5, 3.5),
                   ("guardian-statue", 3.5, 18.5), ("corruption-growth", 25.0, 4.0),
                   ("corruption-growth", 25.0, 17.0), ("corruption-growth", 12.0, 18.5),
                   ("chain-shackle", 9.0, 0.4), ("chain-shackle", 20.0, 0.4),
                   ("floor-brazier", 7.0, 11.0), ("floor-brazier", 23.0, 11.0),
                   ("bone-pile", 14.0, 14.5), ("bone-pile", 18.5, 5.0),
                   ("weapon-armor-heap", 22.0, 18.5),
                   ("cocooned-remains-web-mass", 8.0, 0.5),
                   ("cocooned-remains-web-mass", 24.0, 21.5),
                   ("reinforced-crate", 6.0, 18.8), ("reinforced-crate", 23.0, 3.5),
                   ("storage-barrel", 4.5, 18.8), ("broken-handcart", 18.5, 19.0),
                   ("cave-in-rubble", 2.5, 14.0),
                   ("hanging-brazier", 15.0, 7.0),
                   ("heavy-door", 29.6, 11.0)],  # sealed boss-to-vault reward door
    "memory-vault": [("reliquary-wall-alcove", 2.5, 0.4), ("reliquary-wall-alcove", 7.5, 0.4),
                     ("ruined-altar", 5.0, 4.0),
                     ("candelabra-cluster", 2.0, 6.5), ("candelabra-cluster", 8.0, 6.5),
                     ("storage-chest", 8.0, 2.2)],  # Warden's cache beside the First Memory dais
    "exit-connector": [("cave-in-rubble", 1.5, 4.5), ("ruined-stone-archway", 15.6, 3.0),
                       ("storage-barrel", 13.5, 4.5),
                       ("reinforced-crate", 12.0, 4.5), ("storage-chest", 13.8, 1.5),
                       ("wall-torch-sconce", 5.0, 0.3)],  # clean single route into the framed daylight gate
}

# Every authored room carries visible wall-mounted fire on BOTH the north and
# south walls. The opposite wall is deliberately staggered so rooms read as
# inhabited spaces rather than mirrored procedural sets. The runtime derives
# each point light from the sconce's real flame anchor, so illumination cannot
# drift away from the fixture during layout/export changes.
SCONCE_PAIR_X = {
    "vestibule": [4.0, 17.5, 28.0], "plaza-link": [1.5, 4.5],
    "threshold-plaza": [6.0, 12.0], "convergence": [3.0, 9.0],
    "ashen-threshold": [4.0, 8.0], "ashen-lock": [5.0, 15.0, 25.0],
    "memory-vault": [1.0, 9.0], "exit-connector": [5.0, 11.0],
    "E-01": [4.0, 10.0], "E-02": [6.0, 11.0], "E-03": [2.0, 12.0],
    "E-04": [8.0], "E-05": [3.0, 11.0], "E-06": [5.0, 17.0],
    "E-07": [1.5, 14.5], "H-01": [3.0, 9.0], "H-02": [2.0, 7.0],
    "H-03": [2.5], "H-04": [3.0, 9.0], "H-05": [3.0, 10.0],
    "H-06": [6.0], "H-07": [9.0],
}

_ROOM_DIMS = {
    room["id"]: (room["w"], room["h"])
    for room in [*FIXED_ROOMS, *EASY_POOL, *HARD_POOL]
}
for _room_id, _north_xs in SCONCE_PAIR_X.items():
    _target = FIXED_DRESSING.get(_room_id, DRESSING.get(_room_id))
    _room_w, _room_h = _ROOM_DIMS[_room_id]
    _target[:] = [entry for entry in _target if entry[0] != "wall-torch-sconce"]
    for _index, _x in enumerate(_north_xs):
        assert 0.5 <= _x <= _room_w - 0.5
        _south_x = _x + (1.15 if _index % 2 == 0 else -1.15)
        _south_x = max(0.5, min(_room_w - 0.5, _south_x))
        _target.extend([
            ("wall-torch-sconce", _x, 0.3),
            ("wall-torch-sconce", round(_south_x, 2), _room_h - 0.3),
        ])


# ---------------------------------------------------------------------------
# Owner Add-on A (2026-08-20): readable wall art + book/scroll props.
# WALL_ART: (art-id, x, y, width_m) — framed PBR planes on walls, zoom-readable
# (runbook §5A). Cartographic pieces reuse the approved lore map masters:
#   art-thalenyr-atlas     <- lore-atlas M-003 painted master (world map)
#   art-heartvale-section  <- heartvale_section_cut_v2 master (zone map)
#   art-breach-v2-flatmap  <- THIS flat map (the zone's own map)
# All other pieces are original lore-derived narrative paintings, tapestries,
# and reliefs with no labels, UI, code, or technical diagrams. Books/scrolls
# remain texture-based props on reused kit geometry.
# ---------------------------------------------------------------------------

ASSET_META.update({
    "books-pile": ("books", "floor"), "scrolls-pile": ("books", "floor"),
})

WALL_ART = {
    # fixed rooms (local meters)
    "vestibule": [("art-thalenyr-atlas", 8.75, 0.35, 2.6),      # world map — new players study it here
                  ("art-painting-reliquary", 14.5, 0.35, 2.2), # original lore reliquary painting
                  ("art-relief-lock-inscription", 8.75, 21.65, 2.0),  # realm-memory relief, S wall
                  ("art-painting-winged-skyship", 13.3, 21.65, 3.4),  # original Arianus memory painting
                  ("art-relief-first-memory", 23.8, 21.65, 1.8)],  # tutorial promise on opposite wall
    "threshold-plaza": [("art-map-thalenyr-scroll", 3.5, 0.35, 1.8),  # lore cartography, never a dev map
                        ("art-banner-wayfarer", 9.0, 0.35, 1.4),       # north wall beside the Wayfarer door
                        ("art-banner-oathbreaker", 12.5, 11.65, 1.4)], # south wall beside the Oathbreaker door
    "convergence": [("art-banner-ashen", 0.3, 5.0, 1.4)],              # warning banner between entries
    "ashen-threshold": [("art-relief-warden", 10.5, 0.35, 1.8)],       # the Warden's warning relief
    "ashen-lock": [("art-banner-cinderbound", 12.0, 0.35, 1.6),
                   ("art-banner-cinderbound", 22.5, 0.35, 1.6)],
    "memory-vault": [("art-relief-first-memory", 5.0, 0.35, 1.8)],     # above the dais
    # pool rooms
    "E-03": [("art-painting-reliquary", 7.0, 0.35, 1.6)],
    "E-07": [("art-map-thalenyr-scroll", 5.5, 0.4, 1.4)],
    "H-03": [("art-banner-oathscar", 6.0, 11.65, 1.6)],
    "H-07": [("art-relief-toll", 5.0, 0.35, 1.6)],
}

BOOK_PROPS = {
    # (asset, x, y, elevation) — elevation > 0 means "on a surface" (e.g. the table)
    "vestibule": [("books-pile", 15.2, 4.0, 0.92), ("books-pile", 16.2, 4.15, 0.92),
                  ("scrolls-pile", 5.4, 8.8, 0.0), ("scrolls-pile", 18.4, 20.5, 0.0),
                  ("books-pile", 21.6, 20.4, 0.0), ("books-pile", 25.2, 20.5, 0.0)],
    "E-07": [("books-pile", 5.5, 6.5, 0.0), ("books-pile", 10.5, 6.0, 0.0), ("scrolls-pile", 7.0, 12.3, 0.0)],
    "E-03": [("scrolls-pile", 5.5, 9.5, 0.0)],
}


# ---------------------------------------------------------------------------
# Kit dimensions — mirrors src/game/environment/DungeonPropCatalog.ts
# (targetHeight, maxFootprint in meters). The registry test asserts these
# match the catalog 1:1; the catalog stays the runtime asset authority.
# ---------------------------------------------------------------------------
KIT_DIMS = {
    "archive-bookshelf": (2.75, 2.6), "archive-cupboard": (2.35, 2.35),
    "storage-chest": (1.05, 1.65), "reinforced-crate": (1.08, 1.55),
    "storage-barrel": (1.22, 1.4), "trestle-table": (0.92, 2.8),
    "heavy-bench": (0.9, 2.35), "high-backed-chair": (1.7, 1.35),
    "empty-weapon-rack": (2.05, 2.25), "wall-torch-sconce": (1.5, 0.95),
    "floor-brazier": (1.38, 1.5), "hanging-brazier": (1.35, 1.45),
    "cave-in-rubble": (1.05, 2.55), "masonry-barricade": (1.55, 2.9),
    "bone-pile": (0.72, 2.15), "chain-shackle": (1.65, 1.6),
    "ruined-altar": (1.45, 2.25), "heavy-door": (3.0, 2.45),
    "false-wall-panel": (2.9, 2.75), "supply-pile": (1.35, 2.2),
    "corruption-growth": (1.45, 2.3), "guardian-statue": (3.15, 1.75),
    "ruined-stone-archway": (3.45, 3.5), "reliquary-wall-alcove": (2.75, 2.15),
    "broken-stone-stair-dais": (0.92, 3.25), "wooden-support-brace": (3.25, 3.1),
    "rusted-portcullis": (3.05, 2.75), "iron-floor-grate": (0.22, 2.3),
    "collapsed-timber-masonry-pile": (1.55, 3.35), "hanging-iron-cage": (2.15, 1.55),
    "candelabra-cluster": (1.65, 1.9), "bottles-jugs-crockery-cluster": (0.88, 1.65),
    "weapon-armor-heap": (1.05, 2.45), "broken-handcart": (1.42, 3.35),
    "monster-egg-nest": (1.05, 2.5), "cocooned-remains-web-mass": (2.65, 1.75),
    "shed-chitin-pile": (0.78, 2.35), "burrowed-wall-breach-plug": (2.8, 2.9),
    # texture-based custom props (Add-on A) — kit geometry reused
    "books-pile": (0.35, 0.9), "scrolls-pile": (0.3, 0.9),
}
