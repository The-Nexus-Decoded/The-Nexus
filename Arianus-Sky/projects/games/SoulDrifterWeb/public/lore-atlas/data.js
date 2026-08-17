/* ============================================================
   SOULDRIFTER — LORE ATLAS DATA (v1.0)
   In-game lore/maps tab. No dev tags — approved content only.
   Canon basis: CANON_REGISTER.md D-1..D-7, DIR-1..DIR-4.
   Realm lore for the four engineered worlds is book-accurate
   (SOURCES_REALM_DIGEST.md). Thalenyr is the free-design realm.
   POI x/y are PERCENT coordinates on each painted plate.
   ============================================================ */

const ATLAS_DATA = {

  /* ---------- REALMS ---------- */
  realms: [
    {
      id: "thalenyr",
      name: "Thalenyr",
      subtitle: "The Verdant Echo",
      kind: "start",
      map: "assets/M-003_painted_atlas.png",
      banner: "assets/M-003_painted_atlas.png",
      defaultLocked: false,
      progressive: true,
      lawName: "The Law of the Echo",
      lawText: "The land remembers. Recovered memories have weight here — the realm answers what is recalled of other worlds.",
      blurb: "The young realm. Temperate, green, and blended — the home the sealing's victims never reached, grown from a Soul Well that bloomed.",
      lore: [
        "Thalenyr was not made. It answered. When the sealing foreclosed uncounted lives, everything those lives would have been — fields never planted, harbors never built, homes never returned to — pressed back against the balance as a standing echo. One Soul Well, a lock built to hold souls in their course, gathered that echo until the inscription did not shatter. It bloomed.",
        "The realm that unfolded is temperate because home, remembered, usually is. River valleys, harvest plains, soft coasts, kind forests — the most probable shape a chorus of ten thousand home-memories could take. Every mortal people here descends from souls that arrived through the Well, and from the generations born after. Every people remembers a homeland it may never truly have seen.",
        "Thalenyr is unclaimed by any engineered order — no Citadel, no machine, no system role. It is the only realm whose existence is the Wave's answer rather than someone's working, and the only realm that houses all the mortal races at once."
      ],
      pois: [
        { id: "soulwell",   name: "The Soul Well & First Breach", type: "well",    x: 46.0, y: 38.5, region: "Heartvale",       desc: "The lock that bloomed. Souls still course to it, and Soul Drifters awaken beside it carrying memories that belonged to more than one world." },
        { id: "vaeldor",    name: "Vaeldor",                      type: "capital", x: 49.5, y: 47.5, region: "Heartvale",       desc: "Capital of the Verdant Echo, raised at the meeting of the rivers by the first waking generations. All roads in Thalenyr are measured from its well-stone." },
        { id: "anwel",      name: "Anwel",                        type: "city",    x: 46.0, y: 35.5, region: "Heartvale",       desc: "River-town above the Well, first roof most newly woken souls ever see." },
        { id: "thalensheir",name: "Thalen's Heir",                type: "city",    x: 46.5, y: 51.5, region: "Heartvale",       desc: "Said to stand where the first shepherd's weir once ran. The folk etymology survives here in song, whatever the academies say." },
        { id: "erboug",     name: "The Erboug Stones",            type: "poi",     x: 55.5, y: 41.0, region: "Heartvale",       desc: "Standing stones that predate every settlement record. Drakkin will not camp inside the ring." },
        { id: "lockroot",   name: "Lockroot Vaults",              type: "dungeon", x: 48.5, y: 31.0, region: "Heartvale",       desc: "Root-choked vaults grown around a fragment of the original lock-inscription. The deeper halls still hum." },
        { id: "lockfrag",   name: "Lock-Inscription Fragment",    type: "poi",     x: 43.5, y: 23.0, region: "Kalthorn Spine",  desc: "A shard of the sealing-era inscription, exposed by a rockfall. Scholars translate it as 'that which was not chosen.'" },
        { id: "kalthorn",   name: "Kalthorn Deep",                type: "dungeon", x: 37.0, y: 15.0, region: "Kalthorn Spine",  desc: "Ice-cut galleries under the spine where floating crags of sky-stone drift loose from the peaks — an echo of the air realm." },
        { id: "star",       name: "The Answering Star",           type: "poi",     x: 76.0, y: 8.0,  region: "Korvel Reaches",  desc: "A light that rises when spoken to. The Korvel hill- clans navigate by it and ask it nothing else." },
        { id: "korvel",     name: "Korvel",                       type: "city",    x: 66.5, y: 20.5, region: "Korvel Reaches",  desc: "Pine-hill trading town, last solid roof before the northern passes." },
        { id: "gullscar",   name: "Gullscar",                     type: "city",    x: 12.5, y: 33.5, region: "Gullscar Coast",  desc: "Cliff-harbor of the west coast, built into the sea-cut scar that gives the town its name." },
        { id: "seacaves",   name: "Gullscar Sea Caves",           type: "dungeon", x: 5.0,  y: 39.0, region: "Gullscar Coast",  desc: "Tide caves under the cliffs. At low water the walls show tool-marks no living mason made." },
        { id: "holtfest",   name: "Holtfest",                     type: "city",    x: 23.5, y: 47.5, region: "The Thalholt",    desc: "Deepwood holdfast of the forest demesne, grown — not built — around a living grandfather oak." },
        { id: "heartroot",  name: "Heartroot Hollow",             type: "dungeon", x: 28.0, y: 58.5, region: "The Thalholt",    desc: "A hollow beneath the deepwood where the trees remember being a jungle with four suns. The heat rises at night." },
        { id: "greshgarth", name: "Greshgarth",                   type: "city",    x: 66.5, y: 46.5, region: "Greshfar Plains", desc: "Granary city of the plains; the disputed corridor's grain all passes through its gates." },
        { id: "farwatch",   name: "Farwatch Ruin",                type: "dungeon", x: 69.5, y: 54.0, region: "Greshfar Plains", desc: "A First Demesne watch-fort, fallen in the consolidation wars. Its beacon still lights itself on the old muster-days." },
        { id: "fenwel",     name: "Fenwel",                       type: "city",    x: 43.0, y: 77.0, region: "Fenward Mires",   desc: "Stilt-town of the delta, where the rivers give up and become the mires." },
        { id: "sepulcher",  name: "Mirelight Sepulcher",          type: "dungeon", x: 34.5, y: 87.5, region: "Fenward Mires",   desc: "A drowned barrow lit by corpse-lanterns. The dead here were not buried — they were kept." },
        { id: "morvane",    name: "Morvane",                      type: "city",    x: 20.5, y: 78.5, region: "Morvane Highlands", desc: "Moor-town of peat-cutters and weather-witches, last hearth before the high heath." },
        { id: "archive",    name: "The Sunken Archive",           type: "dungeon", x: 45.5, y: 87.5, region: "Solmir Coast",    desc: "A library of the first waking, sunk when the coast settled. Its scrolls are read by divers, one breath at a time." },
        { id: "miressa",    name: "Miressa",                      type: "city",    x: 65.5, y: 84.5, region: "Solmir Coast",    desc: "Warm-water port of the south coast; sails for the isles and the sea lanes both." },
        { id: "bonebeach",  name: "Durnai Bone-Beach",            type: "poi",     x: 74.0, y: 80.5, region: "Solmir Coast",    desc: "A strand of colossal bleached bones — the skeleton of a habitat-beast no Thalenyr sea could ever have carried. An echo of the water realm." },
        { id: "chailmrest", name: "Chailmrest",                   type: "city",    x: 86.5, y: 45.5, region: "Mirchain Isles",  desc: "Isle-port of the archipelago, where the chain-currents meet." },
        { id: "grotto",     name: "Shaldeep Grotto",              type: "dungeon", x: 90.0, y: 59.5, region: "Mirchain Isles",  desc: "A blue-lit grotto where the water will not hold a written rune — an echo of the null-fluid sea." },
        { id: "sealsun",    name: "The Sealsun Shard",            type: "poi",     x: 85.5, y: 69.5, region: "Mirchain Isles",  desc: "A warm stone that glows beneath the waves. Islanders say it is a splinter of another world's sun." }
      ]
    },

    {
      id: "arianus",
      name: "Arianus-Sky",
      subtitle: "The World of Air",
      kind: "canon",
      map: "assets/maps/arianus_painted.png",
      banner: "assets/maps/arianus_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of Gravity & Flight",
      lawText: "Wind lanes, lift tiles, void edges, and gravity wells rule movement. The sky is a road — and a cliff.",
      blurb: "Floating continents above an endless Maelstrom. Water is scarce, precious, and monopolized; the isles drift, and below, the storm turns.",
      landmasses: [
        { id: "is-lirawen",    name: "Lirawen, the Crown Isle",     x: 50, y: 13, r: 9  },
        { id: "is-brulithel",  name: "Bruli-Thel Skyport",          x: 23, y: 20, r: 8  },
        { id: "is-aelorin",    name: "Aelorin, Spire of Winds",     x: 76, y: 18, r: 7  },
        { id: "is-valeros",    name: "Valeros Sanctuary",           x: 76, y: 30, r: 7  },
        { id: "is-glimmerhold",name: "Glimmerhold",                 x: 26, y: 41, r: 8  },
        { id: "is-engine",     name: "The Great Engine Isle",       x: 53, y: 43, r: 9  },
        { id: "is-skyreach",   name: "Skyreach",                    x: 74, y: 46, r: 7  },
        { id: "is-granble",    name: "Granblectarf Barrens",        x: 34, y: 65, r: 8  },
        { id: "is-kraggs",     name: "Kragg's Hold",                x: 16, y: 72, r: 7  },
        { id: "is-underhung",  name: "The Underhung",               x: 82, y: 72, r: 7  },
        { id: "is-maelstrom",  name: "The Maelstrom",               x: 52, y: 85, r: 10 }
      ],
      lore: [
        "Arianus was engineered as the industrial world: continents of stone adrift in an endless sky, meant to be aligned and fed by a great machine. The machine never truly woke. The dwarves who serve it still tend its gears in faith, waiting for the day it turns.",
        "Water is the realm's currency of power. Those who control the reservoir-lakes rule the mid-realm, and the wars over water have never ended. Above, the high isles gleam; below, the Geg warrens cling to the undersides of the world.",
        "Beneath all the isles turns the Maelstrom — storm eternal, depths unknown. What falls from Arianus does not return."
      ],
      pois: [
        { id: "lirawen",    name: "Lirawen",                  type: "capital", x: 48.0, y: 6.5,  region: "High Realm", desc: "Crown of the high isles. The water-monopoly's seat, where reservoir-lakes gleam behind guarded walls." },
        { id: "reservoir",  name: "Reservoir Ward",           type: "poi",     x: 50.2, y: 17.2, region: "High Realm", desc: "The guarded water-lakes of Lirawen. Every drop is measured, taxed, and fought over." },
        { id: "gegshrine",  name: "The Geg Shrine",               type: "poi",     x: 49.2, y: 44.1, region: "Mid Realm", desc: "Where the dwarves of the Engine pray to the Mangers — their remembered gods — for the machine to wake." },
        { id: "brulithel",  name: "Bruli-Thel Skyport",       type: "city",    x: 23.5, y: 13.5, region: "High Realm", desc: "Enclave of sky-docks; dragonships and cargo-rafts moor three deep at peak season." },
        { id: "aelorin",    name: "Aelorin, Spire of Winds",  type: "poi",     x: 74.0, y: 16.0, region: "High Realm", desc: "A needle-isle where the wind lanes are charted. Every pilot's license is inked here." },
        { id: "valeros",    name: "Valeros Sanctuary",        type: "city",    x: 73.0, y: 27.0, region: "High Realm", desc: "Windrest sanctuary — neutral ground where even water-war enemies may dock unarmed." },
        { id: "glimmerhold",name: "Glimmerhold",              type: "city",    x: 27.0, y: 39.5, region: "Mid Realm", desc: "Market of mists, the mid-realm's trading isle, forever half-hidden in its own spray." },
        { id: "greatengine",name: "The Great Engine",         type: "poi",     x: 52.0, y: 41.5, region: "Mid Realm", desc: "The colossal machine meant to align the drifting continents and bring water and goods to all. It has never run true. The Gegs keep it polished." },
        { id: "skyreach",   name: "Skyreach",                 type: "city",    x: 71.0, y: 46.0, region: "Mid Realm", desc: "High road port where the sky currents cross; every caravan of the air passes through." },
        { id: "granble",    name: "Granblectarf",             type: "city",    x: 33.0, y: 64.5, region: "Low Realm", desc: "Geg barrens — dwarf warrens scratched into a barren isle, close to the Engine they worship." },
        { id: "kraggs",     name: "Kragg's Hold",             type: "city",    x: 19.0, y: 71.0, region: "Low Realm", desc: "The strongest Geg stronghold of the low realm, dug deep against the wind." },
        { id: "underhung",  name: "The Underhung",            type: "dungeon", x: 79.0, y: 74.0, region: "Low Realm", desc: "Sky warrens hung beneath a drifting isle — rope-cities and cave mouths over open air." },
        { id: "windvault",  name: "The Windvault",              type: "dungeon", x: 15.0, y: 48.0, region: "Mid Realm", desc: "A hollow isle-cave where the sky-currents are harvested and stored in crystal lungs. The winds inside remember every storm." },
        { id: "mistward",   name: "Mistward Buoys",             type: "poi",     x: 36.0, y: 52.0, region: "Mid Realm", desc: "A chain of anchored marker-buoys swaying in open sky. Pilots race the chain; smugglers hide behind it." },
        { id: "roost",      name: "The Vermilion Roost",        type: "dungeon", x: 60.0, y: 28.0, region: "High Realm", desc: "A red-sailed pirate roost clinging to a splinter-isle. The crews know wind-lanes the charts don't." },
        { id: "halcyon",    name: "Halcyon Tier",               type: "city",    x: 85.0, y: 33.0, region: "High Realm", desc: "A quiet terraced isle of wind-chime makers, far from the water wars. Its bells tune the lanes." },
        { id: "gegrising",  name: "The Geg Rising",             type: "dungeon", x: 48.0, y: 64.0, region: "Low Realm", desc: "A warren where the Gegs dig toward a falling isle, convinced the Engine dropped something holy." },
        { id: "sunkenspire",name: "The Sunken Spire",           type: "dungeon", x: 58.0, y: 76.0, region: "The Deep",  desc: "A tower that fell from the high realm generations ago and never landed. It descends a floor a year. Something climbs it." },
        { id: "cloudmere",  name: "Cloudmere Anchorage",        type: "city",    x: 61.0, y: 55.0, region: "Mid Realm", desc: "A raft-city lashed together from a hundred hulls, drifting the mid-lane currents. Everything is for sale, including the harbor." },
        { id: "maelstrom",  name: "The Maelstrom",            type: "dungeon", x: 49.5, y: 87.0, region: "The Deep",  desc: "Storm eternal, depths unknown. The realm's floor that is not a floor. Expeditions go down; maps come back wrong." }
      ]
    },

    {
      id: "pryan",
      name: "Pryan-Fire",
      subtitle: "The World of Fire",
      kind: "canon",
      map: "assets/maps/pryan_painted.png",
      banner: "assets/maps/pryan_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of Density & Heat",
      lawText: "Four suns, no night. Growth is extreme; canopy is country. Fire here is solar — the light itself is the forge.",
      blurb: "An inverted globe with four small suns at its heart and miles of jungle for skin. Citadels beam solar power outward; giants walk where they will.",
      lore: [
        "Pryan was built to be the power plant of all worlds: an inverted sphere of endless jungle wrapped around four small suns. Its Citadels drank the light and beamed it through conduits to the other realms — warmth for the stone world, motion for the sky world's engine, brightness for the sea.",
        "The plan outgrew the gardeners. The jungle is miles deep; only the delvers have ever seen the fabled Ground. In the high canopy, tree-cities of the mensch nations trade and war among the leaves, and the Citadels still blaze — beacons of a system whose keepers are gone.",
        "And the giants walk. Immense, blind, unstoppable — the old system-keepers, banished, forever seeking the Citadels they were made to tend. Their footstep-trails are roads no one dares to pave."
      ],
      pois: [
        { id: "foursuns",   name: "The Four Suns",            type: "poi",     x: 49.0, y: 9.0,  region: "The Sky",   desc: "Ever bright, ever overhead. There is no night in Pryan — only angles of day." },
        { id: "firstlight", name: "First-Light Citadel",      type: "poi",     x: 30.5, y: 18.5, region: "High Canopy", desc: "The dawnward Citadel, first to catch the suns' turning. Its beam has not dimmed in living memory." },
        { id: "sunspire",   name: "Sunspire Citadel",         type: "poi",     x: 61.0, y: 18.5, region: "High Canopy", desc: "Tallest of the Citadels; its conduit-line feeds the sea world's sun-shard." },
        { id: "dawnreach",  name: "Dawnreach Citadel",        type: "poi",     x: 92.5, y: 40.5, region: "Rim Jungle", desc: "A rim Citadel at the jungle's edge, half-swallowed by the growth it powers." },
        { id: "sunwell",    name: "Sunwell Citadel",          type: "poi",     x: 47.5, y: 75.0, region: "Deep Canopy", desc: "Guardian of the south. Its beam-well descends farther than any survey has followed." },
        { id: "heartfire",  name: "Heartfire Citadel",        type: "poi",     x: 45.0, y: 36.5, region: "High Canopy", desc: "The central flame — hub of the conduit web, and the prize every giant trail bends toward." },
        { id: "eleniel",    name: "Eleniel",                  type: "city",    x: 25.0, y: 42.0, region: "High Canopy", desc: "Tree-city of the canopy aristocrats, grown across nine giant trunks." },
        { id: "whisper",    name: "Whisperbranch",            type: "city",    x: 41.0, y: 55.5, region: "Mid Canopy", desc: "City of leaves — a market strung along a single impossible bough." },
        { id: "velorn",     name: "Velorn",                   type: "city",    x: 67.0, y: 55.0, region: "Mid Canopy", desc: "Emerald enclave; its leaf-glass panes catch the fourfold light." },
        { id: "deepdelve",  name: "Deepdelve Holds",          type: "city",    x: 42.0, y: 67.0, region: "The Underside", desc: "Dwarven kingdom below the root-line, closest of all peoples to the fabled Ground." },
        { id: "solarwaste", name: "The Solar Waste",          type: "dungeon", x: 74.0, y: 18.0, region: "High Canopy", desc: "Where giants walk. A trampled burn-belt where the jungle has not dared grow back." },
        { id: "titantrail", name: "The Titan's Trail",        type: "dungeon", x: 28.0, y: 71.5, region: "Deep Canopy", desc: "Giant's footsteps — a track of crater-prints, each old enough to hold a lake." },
        { id: "descent",    name: "The Endless Descent",      type: "dungeon", x: 33.0, y: 89.0, region: "The Underside", desc: "The path that seeks the Ground. No expedition has returned from the lower markers." },
        { id: "rootward",   name: "The Rootward Gate",           type: "dungeon", x: 20.0, y: 60.0, region: "Deep Canopy", desc: "A natural arch of fused roots as wide as a city gate. Expeditions pass through; deserters are found growing into it." },
        { id: "canopymarket",name: "Canopy Market",             type: "city",    x: 54.0, y: 47.0, region: "Mid Canopy", desc: "A trading canopy where a hundred rope-bridges knot together. At midday the suns shine straight through and the whole market glows." },
        { id: "emberglass", name: "The Emberglass Flats",       type: "poi",     x: 60.0, y: 60.0, region: "Deep Canopy", desc: "A clearing fused to amber glass by some ancient beam misfire. Tools left here at noon are melted by dusk." },
        { id: "tyrantsroost",name: "Tyrant's Roost",            type: "poi",     x: 68.0, y: 30.0, region: "High Canopy", desc: "A nesting crown of enormous woven branches, empty for years. Whatever built it was larger than any bird should be." },
        { id: "sunkenconduit",name: "The Sunken Conduit",       type: "dungeon", x: 80.0, y: 58.0, region: "Rim Jungle", desc: "A fallen beam-pipe from the old power web, half-buried in root and vine. It still hums on cloudless days." },
        { id: "quietground",name: "The Quiet Ground",           type: "poi",     x: 48.0, y: 88.0, region: "The Underside", desc: "A patch of jungle where nothing grows, sings, or crawls. The delvers rope off a wide berth and call it holy." },
        { id: "rivergate",  name: "Rivergate of Leaves",      type: "city",    x: 65.0, y: 77.5, region: "Deep Canopy", desc: "Sacred passage where the rivers of clear mirrors thread the deep jungle." }
      ]
    },

    {
      id: "abarrach",
      name: "Abarrach-Stone",
      subtitle: "The World of Stone — the Fire Realm",
      kind: "canon",
      map: "assets/maps/abarrach_painted.png",
      banner: "assets/maps/abarrach_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of Sound & Death",
      lawText: "Lava is the water here; the Colossi are the sky. Every soul held back from passing is paid for with another life.",
      blurb: "A volcanic cavern-world of lava seas and poisoned air, lit by failing Colossi. Birthplace of necromancy — and its warning.",
      lore: [
        "Abarrach is stone, fire, and fumes: a honeycombed cavern-world where the rivers and seas run molten. Mensch were meant to mine its depths and feed the sky world's engine, but the air itself kills, and the little peoples died back to the deepest tunnels.",
        "The Colossi — rune-inscribed pillars the size of mountains — breathe warmth and livable air into the caverns. They were fed by power beamed from the sun-jungle, and they have been failing for years. Where a Colossus dims, the dark takes a province.",
        "Here the desperate raised the dead to work, and here the price was learned: for every soul prevented from passing, another life ends untimely. The dead escaped their keepers. The lazar — the unquiet, thinking dead — walk the basalt labyrinths, and the realm's whole history is the proof that soul-economics always collects."
      ],
      pois: [
        { id: "necropolis", name: "Necropolis",               type: "capital", x: 11.5, y: 55.5, region: "The West",   desc: "The city of the dead and the nearly-living. The Silent Procession leaves its gates and never comes back the same." },
        { id: "kairnnecros",name: "Kairn Necros",             type: "city",    x: 49.0, y: 38.5, region: "The Heart", desc: "Greatest of the cavern-cities, ringed by the Smoldering Sea's molten tide." },
        { id: "kairntelest",name: "Kairn Telest",             type: "city",    x: 66.5, y: 69.5, region: "The East",  desc: "Sister city of the south flows, where the lava runs black and slow." },
        { id: "chamber",    name: "Chamber of the Damned",    type: "dungeon", x: 89.5, y: 30.0, region: "The East",  desc: "Sealed beyond seven doors. The doors resist violence; what is behind them resists everything else." },
        { id: "gruthka",    name: "Colossus of Gruth-Ka",     type: "poi",     x: 41.0, y: 20.5, region: "The North", desc: "A mountain-sized rune-pillar, still breathing warmth into the northern caverns. For now." },
        { id: "khazruul",   name: "Colossus of Khaz-Ruul",    type: "poi",     x: 69.5, y: 38.5, region: "The East",  desc: "This Colossus gutters. Its rune-light fades a finger's width each year, and the shadow provinces grow." },
        { id: "xorkaal",    name: "Colossus of Xor-Kaal",     type: "poi",     x: 62.5, y: 52.5, region: "The Heart", desc: "Central pillar of the heartland; its carvings record the working that made the worlds." },
        { id: "maldur",     name: "Colossus of Maldur",       type: "poi",     x: 44.0, y: 67.0, region: "The South", desc: "Dead pillar. The tunnels around it belong to the cold and the lazar now." },
        { id: "smoldering", name: "The Smoldering Sea",       type: "poi",     x: 38.0, y: 46.0, region: "The Heart", desc: "The fire sea — lava where water should be, crossed by basalt bridges older than any city." },
        { id: "searing",    name: "The Searing Wastes",       type: "dungeon", x: 49.5, y: 12.5, region: "The North", desc: "Open fumarole country; the air itself burns. Maps here are measured in breaths held." },
        { id: "basaltlab",  name: "Basalt Labyrinths",        type: "dungeon", x: 19.0, y: 31.0, region: "The West",  desc: "Collapsed mine-warrens near the dead mines. Things walk there that remember being miners." },
        { id: "cinderstair",name: "The Cinder Stair",            type: "dungeon", x: 58.0, y: 15.0, region: "The North", desc: "A switchback stair of slag descending into cold dark. Every hundred steps, a door. No two survivors agree on the count." },
        { id: "ashmarket",  name: "Ashmarket",                  type: "city",    x: 33.0, y: 42.0, region: "The Heart", desc: "A shanty-bazaar on a lava-side ledge, trading filtered air, salt, and silence. Everything is priced in breath." },
        { id: "kilnfields", name: "The Kiln Fields",            type: "poi",     x: 76.0, y: 48.0, region: "The East",  desc: "Acres of clay funerary jars set into the warm stone. The oldest jars predate the cities. Some are warm from inside." },
        { id: "gateechoes", name: "The Gate of Echoes",         type: "dungeon", x: 22.0, y: 78.0, region: "The South", desc: "A sealed tunnel-mouth that returns any shout a beat too late and a note too low. Miners broke through once. They resealed it in a day." },
        { id: "procession", name: "The Petrified Procession",   type: "poi",     x: 50.0, y: 56.0, region: "The Heart", desc: "A line of stone figures mid-march across a basalt flat, flash-fossilized where they walked. Their faces are calm." },
        { id: "fumehold",   name: "Fumehold",                   type: "city",    x: 85.0, y: 62.0, region: "The East",  desc: "A vent-town built over a breathing fissure, half its industry running on captured fumes. The air shimmers; so do the deals." },
        { id: "forge",      name: "Zhirgrim's Forge",         type: "poi",     x: 81.0, y: 20.0, region: "The East",  desc: "A master forge of the deep delvings, still fed by its own lava vent. Its last smith left no heir." }
      ]
    },

    {
      id: "chelestra",
      name: "Chelestra-Sea",
      subtitle: "The World of Water",
      kind: "canon",
      map: "assets/maps/chelestra_painted.png",
      banner: "assets/maps/chelestra_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of Light & the Null",
      lawText: "The emulsion is breathable — and it unmakes rune-craft. Here, high magic drowns and only the deep powers swim.",
      blurb: "An ocean with no surface and no floor — a breathable emulsion lit by its own Seasun, where cities ride on living habitat-beasts.",
      landmasses: [
        { id: "lm-nerithis",  name: "Nerithis (eldest durnai)",   x: 25, y: 19, r: 12 },
        { id: "lm-elendor",   name: "Elendor",                    x: 70, y: 20, r: 12 },
        { id: "lm-velshire",  name: "Velshire",                   x: 15, y: 52, r: 12 },
        { id: "lm-thalassir", name: "Thalassir",                  x: 80, y: 57, r: 11 },
        { id: "lm-oythera",   name: "Oythera",                    x: 44, y: 80, r: 12 },
        { id: "lm-seasun",    name: "The Seasun",                 x: 50, y: 49, r: 9  },
        { id: "lm-gossamer",  name: "The Gossamer Shoals",        x: 53, y: 17, r: 5  },
        { id: "lm-luminara",  name: "Luminara Drift-globe",       x: 83, y: 39, r: 5  },
        { id: "lm-glasswreck",name: "The Glass Wreck",            x: 14, y: 34, r: 5  },
        { id: "lm-murk",      name: "Murk Harbor flotilla",       x: 64, y: 64, r: 5  },
        { id: "lm-spawn",     name: "The Spawnling Drifts",       x: 72, y: 82, r: 5  }
      ],
      lore: [
        "Chelestra is a single world-spanning sea of fluid that is not water — breathable through lungs and gills alike, lit from within by the radiant Seasun at its heart. There is no surface. There is no floor. There is only flow.",
        "The great cities ride upon durnai — colossal habitat-beasts, cities on their backs, drifting the currents and recycling the detritus of all the worlds. Between them sail ships that swim rather than float, and drift-globes of glass mark the trade and pilgrims' routes.",
        "And the fluid itself nullifies rune-craft: in Chelestra, the highest magic simply does not work. It was here that the serpents appeared — powers no one made — and here that the all-gate was first sealed in fear of their spread. Ancient serpents coil in the distant depths. The map marks their territories with a wide berth."
      ],
      pois: [
        { id: "seasun",     name: "The Seasun",               type: "poi",     x: 49.5, y: 44.5, region: "The Heart", desc: "The realm's heart of light. Warmth, day, and beacon in one — all routes are charted by its glow." },
        { id: "nerithis",   name: "Nerithis",                 type: "capital", x: 26.5, y: 11.5, region: "The North", desc: "High durnai-city of the northern currents; its beast is said to be the eldest still swimming." },
        { id: "elendor",    name: "Elendor",                  type: "city",    x: 77.5, y: 24.0, region: "The East",  desc: "High durnai-city of the east, bright with shell-glass spires." },
        { id: "velshire",   name: "Velshire",                 type: "city",    x: 20.0, y: 35.5, region: "The West",  desc: "Western durnai-city on the Gilded Current; its markets set the realm's prices." },
        { id: "thalassir",  name: "Thalassir",                type: "city",    x: 72.0, y: 59.5, region: "The South", desc: "Southern durnai-city, deep-diving; its beast feeds along the silt currents." },
        { id: "oythera",    name: "Oythera",                  type: "city",    x: 42.0, y: 76.0, region: "The West",  desc: "Far-western city-beast, slow and old, trailing a wake of drifting gardens." },
        { id: "gossamer",   name: "The Gossamer Shoals",      type: "poi",     x: 47.5, y: 9.5,  region: "The North", desc: "A drift-globe cluster — glass habitats knotted together in the gentlest current of the realm." },
        { id: "luminara",   name: "Luminara Drift-globe",     type: "poi",     x: 72.0, y: 16.5, region: "The East",  desc: "A lone drift-globe that glows from within; no one has docked it in a generation." },
        { id: "gilded",     name: "The Gilded Current",       type: "poi",     x: 34.0, y: 38.0, region: "The West",  desc: "The great trade route — a warm golden stream that carries ships between the western cities." },
        { id: "luminous",   name: "The Luminous Way",         type: "poi",     x: 61.0, y: 43.0, region: "The Heart", desc: "The pilgrims' route, spiraling inward to the Seasun. Ships sail it silent." },
        { id: "whisperdeep",name: "The Whispering Deep",      type: "dungeon", x: 53.0, y: 73.0, region: "The Deep",  desc: "Ancient serpent territories. The current here carries voices, and the charts end." },
        { id: "siltgardens",name: "The Silt Gardens",           type: "poi",     x: 30.0, y: 55.0, region: "The West",  desc: "Terraced filter-gardens trailing behind a slow current, tended by divers. Half the realm's spices grow here." },
        { id: "glasswreck", name: "The Glass Wreck",            type: "dungeon", x: 26.0, y: 48.0, region: "The West",  desc: "A shattered drift-globe snagged on a ridge of coral-stone. Its panes still show reflections of somewhere else." },
        { id: "pearlward",  name: "Pearlward Shelf",            type: "poi",     x: 68.0, y: 38.0, region: "The East",  desc: "A bright shelf where beacon-pearls are farmed for ship-lights. Divers work in pairs; the shelf remembers the ones who didn't." },
        { id: "deephymn",   name: "The Deep Hymn",              type: "dungeon", x: 45.0, y: 60.0, region: "The Deep",  desc: "A trench that sings on the turn of the current — a chord so old the durnai alter course around it." },
        { id: "murkharbor", name: "Murk Harbor",                type: "city",    x: 60.0, y: 68.0, region: "The South", desc: "A free-port raft-town anchored off the pilgrims' route, where salvagers sell whatever the deep gives up." },
        { id: "spawndrifts",name: "The Spawnling Drifts",       type: "poi",     x: 85.0, y: 68.0, region: "The Deep",  desc: "Warm cloudy currents thick with hatchling durnai no longer than a skiff. The cities keep their distance, and their silence." },
        { id: "dimming",    name: "The Dimming Reaches",      type: "dungeon", x: 75.5, y: 76.0, region: "The Deep",  desc: "Cold reaches far from the Seasun's glow, where the light thins to nothing." }
      ]
    },

    {
      id: "labyrinth",
      name: "The Labyrinth",
      subtitle: "The Sentient Prison-Maze",
      kind: "prison",
      map: "assets/maps/labyrinth_painted.png",
      banner: "assets/maps/labyrinth_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of the Maze",
      lawText: "It has no beginning. It has no end. It changes when you do. It feeds on hope. The map lies — always.",
      blurb: "Not a maze — a chain of gated worlds, each crueler than the last, from the Vortex to the Final Gate. It thinks. It remembers. It hunts.",
      lore: [
        "The Labyrinth was built as a house of correction — a place to cure a proud people of the desire to rule. Left without its keepers, it grew into something its makers never intended: a sadistic, living prison that dangles hope precisely far enough to make the next gate worth dying for.",
        "It is not one maze but many — lands chained gate to gate, from the Vortex at its rim to the Final Gate that opens on the paradise city at its heart. Each gate is a threshold the Labyrinth makes you earn. Generations are born, fight, and die on the road between them; escape is climbed out on the bones of those who came before.",
        "Somewhere in its depths the two ancient powers were sealed when the old war finally ended — the shapers and the rune-marked, locked away together. The higher powers of the world are here, behind gates that have never opened from the outside. The Labyrinth remembers why. So should you."
      ],
      pois: [
        { id: "vortex",     name: "The Vortex",               type: "gate",    x: 49.5, y: 92.0, region: "The Rim",   desc: "The Sixth Gate — the entry where the mortal peoples once waited out the Sundering. All paths begin here, and none return." },
        { id: "howling",    name: "The Howling",              type: "poi",     x: 8.0,  y: 38.5, region: "Outer Rings", desc: "Wind of lost voices. Caravan-masters gag their scouts here; the wind learns names." },
        { id: "turning",    name: "The Turning",              type: "poi",     x: 28.5, y: 14.5, region: "Outer Rings", desc: "Paths that change. The way you came is never the way back." },
        { id: "walls",      name: "The Whispering Walls",     type: "poi",     x: 75.0, y: 16.0, region: "Outer Rings", desc: "They listen. Speak your plan aloud and the maze will be waiting for it." },
        { id: "trickgate",  name: "Trick Gate",               type: "gate",    x: 10.5, y: 57.0, region: "Middle Rings", desc: "Nothing is as it seems. The gate shows you the one thing you want, then tests whether you'll walk past it." },
        { id: "gallery",    name: "Gallery of Forgotten Failures", type: "poi", x: 23.0, y: 50.0, region: "Middle Rings", desc: "Their bones remember. Every camp here was someone's last — the gear is good, and it is warned against." },
        { id: "falsehaven", name: "False Haven",              type: "dungeon", x: 67.0, y: 32.0, region: "Middle Rings", desc: "Hope's trap. Water, shelter, safety — everything a caravan prays for, arranged with terrible patience." },
        { id: "mazeremembers", name: "The Maze Remembers",    type: "poi",     x: 73.5, y: 42.0, region: "Middle Rings", desc: "And adjusts. Routes that killed one caravan are rebuilt for the next." },
        { id: "bleeding",   name: "The Bleeding Fork",        type: "poi",     x: 74.0, y: 52.5, region: "Inner Rings", desc: "Every choice hurts. Both paths are true; both paths are watched." },
        { id: "longdescent",name: "The Long Descent",         type: "dungeon", x: 51.5, y: 58.0, region: "Inner Rings", desc: "Downward, always downward. The air thickens with old rune-work the closer the path comes to the heart." },
        { id: "looping",    name: "The Looping Pass",         type: "poi",     x: 25.5, y: 69.0, region: "Inner Rings", desc: "You will return. Everyone does. The wise leave markers for their future selves." },
        { id: "collapsed",  name: "The Collapsed",            type: "poi",     x: 72.5, y: 73.5, region: "Inner Rings", desc: "Where walls swallow all. The maze burying its own dead ends." },
        { id: "echoing",    name: "The Echoing Deep",         type: "dungeon", x: 53.0, y: 79.5, region: "The Depths", desc: "No voice returns. Sound goes down and stays. Below this, the gates are counted in whispers." },
        { id: "bonefields", name: "Bone Fields",              type: "poi",     x: 13.0, y: 85.0, region: "The Depths", desc: "Generations of the lost. The road here is paved with the people who paved the road." },
        { id: "reasonedge", name: "Edge of Reason",           type: "poi",     x: 30.5, y: 90.0, region: "The Depths", desc: "Many enter, none leave. The last marker before the Final Gate's approach." },
        { id: "saltcourts", name: "The Salt Courts",            type: "dungeon", x: 40.0, y: 40.0, region: "Middle Rings", desc: "Galleries crusted white where generations wept and the maze kept the salt. The statues in the courts were not carved." },
        { id: "ninthcamp",  name: "The Ninth Camp",             type: "poi",     x: 20.0, y: 60.0, region: "Middle Rings", desc: "Nine camps have stood on this flat; nine times it was found empty but intact. The tenth is always being pitched." },
        { id: "hopesend",   name: "Hope's End",                 type: "poi",     x: 62.0, y: 62.0, region: "Inner Rings", desc: "A overlook where the heart's light first becomes visible. The maze lets you see it from here. That's the point." },
        { id: "cartomb",    name: "The Cartographer's Tomb",    type: "poi",     x: 38.0, y: 70.0, region: "The Depths", desc: "A walled-up alcove holding the only honest map of the maze ever drawn. It is accurate for one hour after reading." },
        { id: "screamgallery",name: "The Screaming Gallery",    type: "dungeon", x: 60.0, y: 25.0, region: "Outer Rings", desc: "A long arcade that amplifies sound a hundredfold. Caravans cross it in absolute silence, one foot at a time." },
        { id: "heart",      name: "The Heart — The Going Path", type: "gate",  x: 49.5, y: 18.5, region: "The Center", desc: "The Final Gate. Beyond it lies the paradise city. It opens for those the Labyrinth cannot break — and so far, the Labyrinth keeps count." }
      ]
    },

    {
      id: "nexus",
      name: "The Nexus",
      subtitle: "The Paradise City — the Fifth Gate",
      kind: "hub",
      map: "assets/maps/nexus_painted.png",
      banner: "assets/maps/nexus_painted.png",
      defaultLocked: true,
      progressive: false,
      lawName: "The Law of the Hub",
      lawText: "All gates converge here. Knowledge is the only currency the city has ever minted.",
      blurb: "The sanctuary at the Labyrinth's heart — a paradise city where the gates of the four worlds converge, and its Library keeps the record of the world before the Sundering.",
      lore: [
        "The Nexus was built as the reward at the end of correction: a paradise city at the Labyrinth's heart, meant for those the maze had finished with. It became instead the seat of the freed — the city from which the reconquest of the worlds was planned.",
        "Four great gates stand in its walls — Air, Fire, Stone, and Water — each opening on its engineered world. The Vortex, heart of the Labyrinth and source of all paths, waits below. All roads in the broken cosmos pass through these plazas sooner or later.",
        "Within its halls the Great Library keeps the pre-Sundering record — the true history of the world before it was divided. Most of what mortals believe about the sealing is wrong. The Library knows. The Library does not lend."
      ],
      pois: [
        { id: "library",    name: "The Great Library",        type: "capital", x: 49.5, y: 41.0, region: "The Center", desc: "Keeper of the pre-Sundering record. Its stacks hold the world as it was — and the sealing as it truly happened." },
        { id: "gateair",    name: "Gate of Air",              type: "gate",    x: 46.0, y: 7.5,  region: "North Wall", desc: "To Arianus-Sky. The gate breathes a thin cold wind even when closed." },
        { id: "gatefire",   name: "Gate of Fire",             type: "gate",    x: 10.5, y: 41.5, region: "West Wall",  desc: "To Pryan-Fire. Heat shimmers above its threshold in four colors." },
        { id: "gatestone",  name: "Gate of Stone",            type: "gate",    x: 84.0, y: 41.5, region: "East Wall",  desc: "To Abarrach-Stone. The stones of its arch are warm, and occasionally whisper." },
        { id: "gatewater",  name: "Gate of Water",            type: "gate",    x: 33.0, y: 85.0, region: "South Wall", desc: "To Chelestra-Sea. Its threshold is wet though nothing ever passes through." },
        { id: "vortex",     name: "The Vortex",               type: "gate",    x: 11.0, y: 84.0, region: "Below",      desc: "Heart of the Labyrinth, source of all paths. The maze's rim and the maze's mouth at once." },
        { id: "sunkenplaza", name: "The Sunken Plaza",          type: "poi",     x: 58.0, y: 60.0, region: "The Rings",  desc: "A plaza one terrace below the rest, flooded ankle-deep with rain the city never drains. Reflections there lag a moment behind." },
        { id: "annex",      name: "The Archive Annex",          type: "poi",     x: 42.0, y: 52.0, region: "The Center", desc: "The Library's overflow stacks, open to citizens by petition. The waiting list is measured in generations." },
        { id: "steps",      name: "The Petitioner's Steps",     type: "poi",     x: 54.0, y: 28.0, region: "North Quarter", desc: "A thousand worn steps up to the northern terrace, climbed by everyone who ever asked the city for something." },
        { id: "barracks",   name: "Gateward Barracks",          type: "poi",     x: 30.0, y: 60.0, region: "West Quarter", desc: "The mustering halls of the gate-guard, built to watch four doors at once. The bunks are still made." },
        { id: "labyrinthwall", name: "The Labyrinth",         type: "poi",     x: 80.5, y: 12.5, region: "Beyond the Walls", desc: "Endless paths, timeless secrets. The city is a garden; everything outside its walls is the maze." }
      ]
    }
  ],

  /* ---------- COSMOLOGY WHEEL NODES ----------
     wheel coordinates are 0-100 on the diagram canvas. */
  wheel: {
    center: { id: "nexus", x: 50, y: 50, r: 13 },
    ring: [
      { id: "arianus",   x: 50, y: 13, r: 11 },
      { id: "pryan",     x: 82, y: 33, r: 11 },
      { id: "abarrach",  x: 74, y: 79, r: 11 },
      { id: "chelestra", x: 18, y: 70, r: 11 },
      { id: "thalenyr",  x: 20, y: 26, r: 10 }
    ],
    labyrinthRing: { x: 50, y: 50, r: 26 },   // dark band around the Nexus
    deathsGate: { x: 88, y: 88, r: 6 }        // corrupted, endgame door
  },

  /* ---------- RACES (The Peoples of Thalenyr) ---------- */
  races: [
    {
      id: "humans",
      name: "Humans",
      tagline: "The manifold memory",
      text: "Humans came through the Well in the greatest numbers, and their homeland memories are the most varied — sea-ports of the water world, war-cities of the sky, delvings of the stone. No two human lineages remember the same home, which is why human culture in Thalenyr is a hundred grafted customs looking for a common root. They adapt faster than any other people, as if the Well meant them to."
    },
    {
      id: "elves",
      name: "Elves",
      tagline: "The long echo",
      text: "Elven souls arrived carrying the deepest craft-memories — and the deepest grievances. Some lineages still hoard water with a sky-worlder's instinct; others practice spirit-speaking arts that predate every academy. Elves were the first to name the land: the valley-tongue word 'Thalenyr' — the Verdant Echo — is theirs."
    },
    {
      id: "dwarves",
      name: "Dwarves",
      tagline: "The builders who remember blueprints",
      text: "Dwarven souls came through with machines in their memory they will never rebuild — the Great Engine's gears, the Citadels' beams, the Colossi's rune-work. It makes them the realm's finest masons and its most melancholy drinkers. Dwarven clans keep 'remembrance-plans': blueprints of wonders no one here has the means to raise, copied out each generation so the memory survives."
    },
    {
      id: "halflings",
      name: "Halflings",
      tagline: "The small folk who remember comfort",
      text: "Halfling souls came through the Well carrying the gentlest memories of all — harvest valleys, riverside mills, warm kitchens, roads that went somewhere friendly. No engine, no machine, no war-craft clings to their recollection, which is why the other races half-believe the Well chose them as its apology. They settle fast, trade fairly, and map everything: most of Thalenyr's road-markers and inn-signs are halfling work. Small of stature, long of memory, and impossible to keep out of anywhere."
    },
    {
      id: "drakkin",
      name: "Drakkin",
      tagline: "The Steeped — the people the Well made",
      text: "When the old routes failed and Death's Gate was corrupted, the Well kept drinking souls — but some never surfaced. They spent ages inside the lock-inscription itself, steeped in concentrated soul-stuff, until the bloom forced them out, changed. Their scales are inscription-scars: the Well's own writing etched into flesh. Drakkin hold no homeland memory because they have no homeland but this one — their claim on Thalenyr is older than any other people's, and their inborn gift reads to scholars as rune-adjacent, though no Drakkin has ever written a rune. The other races revere them, distrust them, and quietly wonder: what did the Well want with them?"
    }
  ],

  /* ---------- THE GATES & THE WELLS (lore-book entry) ---------- */
  gatesLore: [
    {
      id: "gates",
      title: "The Gates and the Wells",
      paragraphs: [
        "The old cosmos was bound by gates: the ring of four that linked the engineered worlds, the Fifth Gate at the paradise city, the Sixth at the maze's rim — and Death's Gate, the all-gate, through which everything passed and everything was watched.",
        "Death's Gate is not destroyed. It is corrupted. It has been shut before — sealed in fear of the serpents — and what it let through in the last age left it poisoned and observed. To travel it now is to be seen by whatever coils on the far side. It waits at the edge of the maps, an endgame door no one is ready to open.",
        "So the living found another way: the Soul Wells. They were always soul-locks, touching every realm's dead — the one network that already spanned all worlds. When the gates failed, the Wells inherited the work. And now the locks are reversing: what was built to hold souls in their course has begun, at last, to pass the living.",
        "That is why a Soul Drifter's road runs from Well to Well — and why every unlocked realm on your map is a lock that chose to open."
      ]
    }
  ],

  /* ---------- DEFAULT GAME STATE (demo / integration seed) ----------
     The game writes this shape; the atlas reads it. See app.js API. */
  defaultState: {
    realms: {
      thalenyr:  { unlocked: true },
      arianus:   { unlocked: false },
      pryan:     { unlocked: false },
      abarrach:  { unlocked: false },
      chelestra: { unlocked: false },
      labyrinth: { unlocked: false },
      nexus:     { unlocked: false }
    },
    // poi status: "unknown" | "rumored" | "explored" | "completed"
    pois: {
      "thalenyr.soulwell":   "completed",
      "thalenyr.anwel":      "completed",
      "thalenyr.vaeldor":    "explored",
      "thalenyr.thalensheir":"explored",
      "thalenyr.lockroot":   "rumored",
      "thalenyr.holtfest":   "rumored",
      "thalenyr.greshgarth": "rumored"
    }
  }
};
