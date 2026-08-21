/**
 * BREACH-V2 dungeon registry — single source of truth for the starting zone
 * (runbook §3, issue #451). DERIVED measured-only from the flat map:
 *   docs/maps/breach-v2/breach-v2-flatmap-1600.webp
 * via scripts/maps/breach_v2_design.py + export_breach_v2_registry.py.
 * Do not hand-edit numbers here; edit the design module and re-export.
 *
 * Layout: fixed Vestibule -> Threshold Plaza (two doors) -> seeded 3-5 chamber
 * path (easy pool for Wayfarer, hard pool for Oathbreaker) -> Convergence ->
 * Ashen Lock (Cinderbound Warden, boss set 1 of 1) -> First Memory Vault ->
 * Way Upward exit Connector into Heartvale hv-1 (Soul Well Basin).
 *
 * Placement records carry the §6 minimum metadata: roomId (via parent room),
 * asset/type, x/y in local room meters, placement + facing normal, blocking,
 * role, footprint + height (mirrors of DungeonPropCatalog.ts, asserted 1:1 by
 * tests/breachV2Registry.test.mjs — the catalog stays the runtime authority),
 * and (for wall art) width.
 */

export const BREACH_V2_REGISTRY = {
  "id": "breach-v2",
  "sourceMap": "docs/maps/breach-v2/breach-v2-flatmap-1600.webp",
  "units": {
    "meters": true,
    "navCellMeters": 1.75,
    "note": "true world-frame meters; nav cell hidden under continuous geometry"
  },
  "worldAnchor": {
    "zone": "Heartvale hv-1 (Soul Well Basin)",
    "x": 5437.5,
    "z": 2648.4,
    "note": "exit Connector emerges at the Soul Well Basin POI (Heartvale hv-1)"
  },
  "fixedRooms": [
    {
      "id": "vestibule",
      "name": "Realm-Lock Vestibule",
      "kind": "start",
      "x": 0.0,
      "y": 0.0,
      "w": 30.0,
      "h": 22.0,
      "notes": "Fixed start. Damaged trans-realm machine-temple; cleanest room (corruption 0.05).",
      "placements": [
        {
          "asset": "floor-brazier",
          "x": 5.8,
          "y": 13.8,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 11.7,
          "y": 13.8,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "archive-bookshelf",
          "x": 0.5,
          "y": 3.5,
          "placement": "wall",
          "group": "furniture",
          "facing": "east",
          "height": 2.75,
          "footprint": 2.6,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "archive-bookshelf",
          "x": 0.5,
          "y": 6.4,
          "placement": "wall",
          "group": "furniture",
          "facing": "east",
          "height": 2.75,
          "footprint": 2.6,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "archive-bookshelf",
          "x": 17.8,
          "y": 21.5,
          "placement": "wall",
          "group": "furniture",
          "facing": "north",
          "height": 2.75,
          "footprint": 2.6,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "archive-bookshelf",
          "x": 21.2,
          "y": 21.5,
          "placement": "wall",
          "group": "furniture",
          "facing": "north",
          "height": 2.75,
          "footprint": 2.6,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "archive-cupboard",
          "x": 25.4,
          "y": 21.5,
          "placement": "wall",
          "group": "furniture",
          "facing": "north",
          "height": 2.35,
          "footprint": 2.35,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "trestle-table",
          "x": 14.5,
          "y": 3.6,
          "placement": "floor",
          "group": "furniture",
          "facing": "up",
          "height": 0.92,
          "footprint": 2.8,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "heavy-bench",
          "x": 14.5,
          "y": 5.4,
          "placement": "floor",
          "group": "furniture",
          "facing": "up",
          "height": 0.9,
          "footprint": 2.35,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "empty-weapon-rack",
          "x": 19.5,
          "y": 0.4,
          "placement": "wall",
          "group": "furniture",
          "facing": "south",
          "height": 2.05,
          "footprint": 2.25,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "empty-weapon-rack",
          "x": 23.0,
          "y": 0.4,
          "placement": "wall",
          "group": "furniture",
          "facing": "south",
          "height": 2.05,
          "footprint": 2.25,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "weapon-armor-heap",
          "x": 26.0,
          "y": 4.0,
          "placement": "floor",
          "group": "loot",
          "facing": "up",
          "height": 1.05,
          "footprint": 2.45,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "cave-in-rubble",
          "x": 27.5,
          "y": 19.0,
          "placement": "floor",
          "group": "rubble",
          "facing": "up",
          "height": 1.05,
          "footprint": 2.55,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "collapsed-timber-masonry-pile",
          "x": 2.0,
          "y": 18.5,
          "placement": "floor",
          "group": "rubble",
          "facing": "up",
          "height": 1.55,
          "footprint": 3.35,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "candelabra-cluster",
          "x": 22.8,
          "y": 12.8,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.65,
          "footprint": 1.9,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "supply-pile",
          "x": 26.8,
          "y": 17.2,
          "placement": "floor",
          "group": "loot",
          "facing": "up",
          "height": 1.35,
          "footprint": 2.2,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "guardian-statue",
          "x": 28.6,
          "y": 7.2,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 3.15,
          "footprint": 1.75,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "guardian-statue",
          "x": 28.6,
          "y": 14.8,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 3.15,
          "footprint": 1.75,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "iron-floor-grate",
          "x": 15.0,
          "y": 13.0,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 0.22,
          "footprint": 2.3,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wooden-support-brace",
          "x": 0.4,
          "y": 11.0,
          "placement": "wall",
          "group": "structure",
          "facing": "east",
          "height": 3.25,
          "footprint": 3.1,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "wooden-support-brace",
          "x": 0.4,
          "y": 16.5,
          "placement": "wall",
          "group": "structure",
          "facing": "east",
          "height": 3.25,
          "footprint": 3.1,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 21.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 28.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 28.0,
          "y": 21.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-thalenyr-atlas",
          "x": 8.75,
          "y": 0.35,
          "width": 2.6,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.82,
          "footprint": 2.6,
          "role": "wall-art"
        },
        {
          "asset": "art-heartvale-section",
          "x": 15.8,
          "y": 0.35,
          "width": 2.2,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.54,
          "footprint": 2.2,
          "role": "wall-art"
        },
        {
          "asset": "art-relief-lock-inscription",
          "x": 8.75,
          "y": 21.65,
          "width": 2.0,
          "placement": "wall",
          "group": "art",
          "facing": "north",
          "blocking": false,
          "height": 1.4,
          "footprint": 2.0,
          "role": "wall-art"
        },
        {
          "asset": "art-painting-winged-skyship",
          "x": 13.3,
          "y": 21.65,
          "width": 3.4,
          "placement": "wall",
          "group": "art",
          "facing": "north",
          "blocking": false,
          "height": 2.38,
          "footprint": 3.4,
          "role": "wall-art"
        },
        {
          "asset": "art-relief-first-memory",
          "x": 23.8,
          "y": 21.65,
          "width": 1.8,
          "placement": "wall",
          "group": "art",
          "facing": "north",
          "blocking": false,
          "height": 1.26,
          "footprint": 1.8,
          "role": "wall-art"
        },
        {
          "asset": "books-pile",
          "x": 15.2,
          "y": 4.0,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.35,
          "footprint": 0.9,
          "elevation": 0.92,
          "blocking": false,
          "role": "readable-props"
        },
        {
          "asset": "books-pile",
          "x": 16.2,
          "y": 4.15,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.35,
          "footprint": 0.9,
          "elevation": 0.92,
          "blocking": false,
          "role": "readable-props"
        },
        {
          "asset": "scrolls-pile",
          "x": 5.4,
          "y": 8.8,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.3,
          "footprint": 0.9,
          "elevation": 0.0,
          "blocking": false,
          "role": "readable-props"
        },
        {
          "asset": "scrolls-pile",
          "x": 18.4,
          "y": 20.5,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.3,
          "footprint": 0.9,
          "elevation": 0.0,
          "blocking": false,
          "role": "readable-props"
        },
        {
          "asset": "books-pile",
          "x": 21.6,
          "y": 20.4,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.35,
          "footprint": 0.9,
          "elevation": 0.0,
          "blocking": false,
          "role": "readable-props"
        },
        {
          "asset": "books-pile",
          "x": 25.2,
          "y": 20.5,
          "placement": "floor",
          "group": "books",
          "facing": "up",
          "height": 0.35,
          "footprint": 0.9,
          "elevation": 0.0,
          "blocking": false,
          "role": "readable-props"
        }
      ]
    },
    {
      "id": "plaza-link",
      "name": "Vestibule Gallery Link",
      "kind": "corridor",
      "x": 30.0,
      "y": 8.0,
      "w": 6.0,
      "h": 6.0,
      "notes": "Short fixed link; bronze conduits run east toward the paired doors.",
      "placements": [
        {
          "asset": "wall-torch-sconce",
          "x": 1.5,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 1.5,
          "y": 5.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 4.5,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 4.5,
          "y": 5.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        }
      ]
    },
    {
      "id": "threshold-plaza",
      "name": "Threshold Plaza",
      "kind": "plaza",
      "x": 36.0,
      "y": 4.0,
      "w": 16.0,
      "h": 12.0,
      "notes": "Safe. Orren (north) + Brannoc (south) guide beat before the choice. Two doors on the east wall.",
      "placements": [
        {
          "asset": "floor-brazier",
          "x": 1.5,
          "y": 2.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 1.5,
          "y": 9.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "empty-weapon-rack",
          "x": 8.0,
          "y": 0.4,
          "placement": "wall",
          "group": "furniture",
          "facing": "south",
          "height": 2.05,
          "footprint": 2.25,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "heavy-bench",
          "x": 8.0,
          "y": 11.4,
          "placement": "floor",
          "group": "furniture",
          "facing": "up",
          "height": 0.9,
          "footprint": 2.35,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "iron-floor-grate",
          "x": 8.0,
          "y": 6.0,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 0.22,
          "footprint": 2.3,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "candelabra-cluster",
          "x": 15.0,
          "y": 6.0,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.65,
          "footprint": 1.9,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "heavy-door",
          "x": 15.7,
          "y": 2.5,
          "placement": "wall",
          "group": "structure",
          "facing": "west",
          "height": 3.0,
          "footprint": 2.45,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "heavy-door",
          "x": 15.7,
          "y": 9.5,
          "placement": "wall",
          "group": "structure",
          "facing": "west",
          "height": 3.0,
          "footprint": 2.45,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 6.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 6.0,
          "y": 11.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 12.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 12.0,
          "y": 11.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-breach-v2-flatmap",
          "x": 3.5,
          "y": 0.35,
          "width": 1.8,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.26,
          "footprint": 1.8,
          "role": "wall-art"
        },
        {
          "asset": "art-banner-wayfarer",
          "x": 15.7,
          "y": 2.5,
          "width": 1.4,
          "placement": "wall",
          "group": "art",
          "facing": "west",
          "blocking": false,
          "height": 0.98,
          "footprint": 1.4,
          "role": "wall-art"
        },
        {
          "asset": "art-banner-oathbreaker",
          "x": 15.7,
          "y": 9.5,
          "width": 1.4,
          "placement": "wall",
          "group": "art",
          "facing": "west",
          "blocking": false,
          "height": 0.98,
          "footprint": 1.4,
          "role": "wall-art"
        }
      ]
    },
    {
      "id": "convergence",
      "name": "Convergence Gallery",
      "kind": "convergence",
      "x": 176.0,
      "y": 5.0,
      "w": 12.0,
      "h": 10.0,
      "notes": "Both paths rejoin here (two west sockets, one east socket). Corruption rises (0.7).",
      "placements": [
        {
          "asset": "corruption-growth",
          "x": 1.5,
          "y": 2.0,
          "placement": "floor",
          "group": "corruption",
          "facing": "up",
          "height": 1.45,
          "footprint": 2.3,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "corruption-growth",
          "x": 1.5,
          "y": 8.0,
          "placement": "floor",
          "group": "corruption",
          "facing": "up",
          "height": 1.45,
          "footprint": 2.3,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 10.5,
          "y": 2.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 10.5,
          "y": 7.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "bone-pile",
          "x": 6.0,
          "y": 8.5,
          "placement": "floor",
          "group": "macabre",
          "facing": "up",
          "height": 0.72,
          "footprint": 2.15,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "hanging-brazier",
          "x": 6.0,
          "y": 5.0,
          "placement": "ceiling",
          "group": "fire",
          "facing": "down",
          "height": 1.35,
          "footprint": 1.45,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 3.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 3.0,
          "y": 9.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 9.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 9.0,
          "y": 9.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-banner-ashen",
          "x": 0.3,
          "y": 5.0,
          "width": 1.4,
          "placement": "wall",
          "group": "art",
          "facing": "east",
          "blocking": false,
          "height": 0.98,
          "footprint": 1.4,
          "role": "wall-art"
        }
      ]
    },
    {
      "id": "ashen-threshold",
      "name": "The Ashen Threshold (ante-room)",
      "kind": "ante",
      "x": 192.0,
      "y": 5.5,
      "w": 12.0,
      "h": 9.0,
      "notes": "Boss-suite ante-room. One-way portcullis seals behind the player.",
      "placements": [
        {
          "asset": "ruined-stone-archway",
          "x": 0.3,
          "y": 4.5,
          "placement": "wall",
          "group": "structure",
          "facing": "east",
          "height": 3.45,
          "footprint": 3.5,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "chain-shackle",
          "x": 2.0,
          "y": 0.4,
          "placement": "wall",
          "group": "macabre",
          "facing": "south",
          "height": 1.65,
          "footprint": 1.6,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "chain-shackle",
          "x": 6.0,
          "y": 0.4,
          "placement": "wall",
          "group": "macabre",
          "facing": "south",
          "height": 1.65,
          "footprint": 1.6,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "masonry-barricade",
          "x": 10.5,
          "y": 7.0,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 1.55,
          "footprint": 2.9,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "weapon-armor-heap",
          "x": 3.0,
          "y": 7.0,
          "placement": "floor",
          "group": "loot",
          "facing": "up",
          "height": 1.05,
          "footprint": 2.45,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 6.0,
          "y": 4.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 4.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 4.0,
          "y": 8.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 8.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 8.0,
          "y": 8.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-relief-warden",
          "x": 9.5,
          "y": 0.35,
          "width": 1.8,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.26,
          "footprint": 1.8,
          "role": "wall-art"
        }
      ]
    },
    {
      "id": "ashen-lock",
      "name": "The Ashen Lock (boss)",
      "kind": "boss",
      "x": 208.0,
      "y": -1.0,
      "w": 30.0,
      "h": 22.0,
      "notes": "Cinderbound Warden arena. Corruption densest (1.0). 3 boss-anchor sockets with a glowing rune circle at the active anchor; V2 ships exactly 1 boss.",
      "placements": [
        {
          "asset": "broken-stone-stair-dais",
          "x": 20.0,
          "y": 11.0,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 0.92,
          "footprint": 3.25,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "guardian-statue",
          "x": 3.5,
          "y": 3.5,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 3.15,
          "footprint": 1.75,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "guardian-statue",
          "x": 3.5,
          "y": 18.5,
          "placement": "floor",
          "group": "structure",
          "facing": "up",
          "height": 3.15,
          "footprint": 1.75,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "corruption-growth",
          "x": 25.0,
          "y": 4.0,
          "placement": "floor",
          "group": "corruption",
          "facing": "up",
          "height": 1.45,
          "footprint": 2.3,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "corruption-growth",
          "x": 25.0,
          "y": 17.0,
          "placement": "floor",
          "group": "corruption",
          "facing": "up",
          "height": 1.45,
          "footprint": 2.3,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "corruption-growth",
          "x": 12.0,
          "y": 18.5,
          "placement": "floor",
          "group": "corruption",
          "facing": "up",
          "height": 1.45,
          "footprint": 2.3,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "chain-shackle",
          "x": 9.0,
          "y": 0.4,
          "placement": "wall",
          "group": "macabre",
          "facing": "south",
          "height": 1.65,
          "footprint": 1.6,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "chain-shackle",
          "x": 20.0,
          "y": 0.4,
          "placement": "wall",
          "group": "macabre",
          "facing": "south",
          "height": 1.65,
          "footprint": 1.6,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 7.0,
          "y": 11.0,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "floor-brazier",
          "x": 23.0,
          "y": 11.0,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.38,
          "footprint": 1.5,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "bone-pile",
          "x": 14.0,
          "y": 14.5,
          "placement": "floor",
          "group": "macabre",
          "facing": "up",
          "height": 0.72,
          "footprint": 2.15,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "cave-in-rubble",
          "x": 2.5,
          "y": 14.0,
          "placement": "floor",
          "group": "rubble",
          "facing": "up",
          "height": 1.05,
          "footprint": 2.55,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "hanging-brazier",
          "x": 15.0,
          "y": 7.0,
          "placement": "ceiling",
          "group": "fire",
          "facing": "down",
          "height": 1.35,
          "footprint": 1.45,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "heavy-door",
          "x": 29.6,
          "y": 11.0,
          "placement": "wall",
          "group": "structure",
          "facing": "west",
          "height": 3.0,
          "footprint": 2.45,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 21.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 15.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 15.0,
          "y": 21.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 25.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 25.0,
          "y": 21.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-banner-cinderbound",
          "x": 13.0,
          "y": 0.35,
          "width": 1.6,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.12,
          "footprint": 1.6,
          "role": "wall-art"
        },
        {
          "asset": "art-banner-cinderbound",
          "x": 23.0,
          "y": 0.35,
          "width": 1.6,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.12,
          "footprint": 1.6,
          "role": "wall-art"
        }
      ]
    },
    {
      "id": "memory-vault",
      "name": "First Memory Vault",
      "kind": "vault",
      "x": 242.0,
      "y": 3.0,
      "w": 10.0,
      "h": 8.0,
      "notes": "Sealed until the Warden falls. First Memory on the dais; awarded exactly once.",
      "placements": [
        {
          "asset": "reliquary-wall-alcove",
          "x": 2.5,
          "y": 0.4,
          "placement": "wall",
          "group": "structure",
          "facing": "south",
          "height": 2.75,
          "footprint": 2.15,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "reliquary-wall-alcove",
          "x": 7.5,
          "y": 0.4,
          "placement": "wall",
          "group": "structure",
          "facing": "south",
          "height": 2.75,
          "footprint": 2.15,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "candelabra-cluster",
          "x": 2.0,
          "y": 6.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.65,
          "footprint": 1.9,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "candelabra-cluster",
          "x": 8.0,
          "y": 6.5,
          "placement": "floor",
          "group": "fire",
          "facing": "up",
          "height": 1.65,
          "footprint": 1.9,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "storage-chest",
          "x": 8.0,
          "y": 2.2,
          "placement": "floor",
          "group": "loot",
          "facing": "up",
          "height": 1.05,
          "footprint": 1.65,
          "blocking": true,
          "role": "loot-cache"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 1.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 1.0,
          "y": 7.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 9.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 9.0,
          "y": 7.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "art-relief-first-memory",
          "x": 5.0,
          "y": 0.35,
          "width": 1.8,
          "placement": "wall",
          "group": "art",
          "facing": "south",
          "blocking": false,
          "height": 1.26,
          "footprint": 1.8,
          "role": "wall-art"
        }
      ]
    },
    {
      "id": "exit-connector",
      "name": "The Way Upward (exit Connector)",
      "kind": "exit",
      "x": 242.0,
      "y": 12.0,
      "w": 16.0,
      "h": 6.0,
      "notes": "Ascending passage out of the Breach -> Heartvale hv-1 (Soul Well Basin), world anchor (5437.5, 2648.4).",
      "placements": [
        {
          "asset": "cave-in-rubble",
          "x": 1.5,
          "y": 4.5,
          "placement": "floor",
          "group": "rubble",
          "facing": "up",
          "height": 1.05,
          "footprint": 2.55,
          "blocking": true,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 5.0,
          "y": 5.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 11.0,
          "y": 0.3,
          "placement": "wall",
          "group": "fire",
          "facing": "south",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        },
        {
          "asset": "wall-torch-sconce",
          "x": 11.0,
          "y": 5.7,
          "placement": "wall",
          "group": "fire",
          "facing": "north",
          "height": 1.5,
          "footprint": 0.95,
          "blocking": false,
          "role": "dressing"
        }
      ]
    }
  ],
  "landmarks": [
    {
      "id": "soul-well",
      "label": "Soul Well (V14): silvery glowing pool",
      "x": 8.75,
      "y": 11.0,
      "r": 1.8,
      "apron": 2.65,
      "note": "pool Ø 3.6 m, rim apron Ø 5.3 m",
      "roomId": "vestibule"
    },
    {
      "id": "player-emergence",
      "label": "Player emergence point",
      "x": 8.75,
      "y": 14.2,
      "r": 0.5,
      "roomId": "vestibule"
    },
    {
      "id": "ilyra",
      "label": "Wellkeeper Ilyra (Chronicle of Returning)",
      "x": 12.6,
      "y": 13.6,
      "r": 0.45,
      "roomId": "vestibule"
    },
    {
      "id": "memory-loom",
      "label": "Memory Loom (TRUE loom) — 3 stat pts · 1 ancestry boon · 1 discipline",
      "x": 3.6,
      "y": 8.2,
      "r": 1.3,
      "roomId": "vestibule"
    },
    {
      "id": "coffer",
      "label": "Wayfarer's Coffer (starter gear inspection)",
      "x": 24.4,
      "y": 14.6,
      "r": 0.9,
      "roomId": "vestibule"
    },
    {
      "id": "effigy",
      "label": "True training effigy (level-one rehearsal)",
      "x": 21.8,
      "y": 6.4,
      "r": 0.9,
      "roomId": "vestibule"
    },
    {
      "id": "orren",
      "label": "Breach Scout Orren (guide beat)",
      "x": 8.0,
      "y": 3.0,
      "r": 0.45,
      "roomId": "threshold-plaza"
    },
    {
      "id": "brannoc",
      "label": "Arena Warden Brannoc (guide beat)",
      "x": 8.0,
      "y": 9.0,
      "r": 0.45,
      "roomId": "threshold-plaza"
    },
    {
      "id": "door-wayfarer",
      "label": "WAYFARER DOOR — easy path (soul-cyan)",
      "x": 16.0,
      "y": 2.5,
      "w": 3.0,
      "roomId": "threshold-plaza"
    },
    {
      "id": "door-oathbreaker",
      "label": "OATHBREAKER DOOR — hard path (ember-red)",
      "x": 16.0,
      "y": 9.5,
      "w": 3.0,
      "roomId": "threshold-plaza"
    }
  ],
  "paths": {
    "wayfarer": {
      "difficulty": "easy",
      "pool": "easy",
      "minChambers": 3,
      "maxChambers": 5,
      "corridorWidthMeters": 3.5,
      "slotCenters": [
        [
          64.0,
          -1.0
        ],
        [
          88.0,
          -7.0
        ],
        [
          112.0,
          -9.0
        ],
        [
          136.0,
          -7.0
        ],
        [
          160.0,
          -1.0
        ]
      ],
      "convergenceSocket": [
        176.0,
        8.0
      ]
    },
    "oathbreaker": {
      "difficulty": "hard",
      "pool": "hard",
      "minChambers": 3,
      "maxChambers": 5,
      "corridorWidthMeters": 3.0,
      "slotCenters": [
        [
          64.0,
          19.0
        ],
        [
          88.0,
          25.0
        ],
        [
          112.0,
          27.0
        ],
        [
          136.0,
          25.0
        ],
        [
          160.0,
          19.0
        ]
      ],
      "convergenceSocket": [
        176.0,
        12.0
      ]
    }
  },
  "pools": {
    "easy": [
      {
        "id": "E-01",
        "name": "Split Antechamber",
        "kind": "gallery",
        "pool": "easy",
        "w": 16.0,
        "h": 13.0,
        "flavor": "pillared entry; broken bronze conduit stubs",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 6.5
          },
          {
            "side": "E",
            "x": 16.0,
            "y": 6.5
          },
          {
            "side": "N",
            "x": 8.0,
            "y": 0.0
          }
        ],
        "spawnSockets": [
          {
            "x": 5.333333333333333,
            "y": 5.46
          },
          {
            "x": 10.666666666666666,
            "y": 5.46
          }
        ],
        "placements": [
          {
            "asset": "floor-brazier",
            "x": 2.0,
            "y": 2.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 2.0,
            "y": 11.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "heavy-bench",
            "x": 6.5,
            "y": 11.6,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 0.9,
            "footprint": 2.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "trestle-table",
            "x": 11.0,
            "y": 3.2,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 0.92,
            "footprint": 2.8,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "storage-barrel",
            "x": 14.2,
            "y": 11.5,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.22,
            "footprint": 1.4,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "reinforced-crate",
            "x": 13.0,
            "y": 11.0,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.08,
            "footprint": 1.55,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "iron-floor-grate",
            "x": 8.0,
            "y": 6.5,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 0.22,
            "footprint": 2.3,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 14.0,
            "y": 2.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 4.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 4.0,
            "y": 12.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 10.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 10.0,
            "y": 12.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "E-02",
        "name": "Broken Crossing",
        "kind": "gallery",
        "pool": "easy",
        "w": 19.0,
        "h": 14.0,
        "flavor": "crossroads; collapsed center pillar",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 7.0
          },
          {
            "side": "E",
            "x": 19.0,
            "y": 7.0
          },
          {
            "side": "N",
            "x": 9.5,
            "y": 0.0
          },
          {
            "side": "S",
            "x": 9.5,
            "y": 14.0
          }
        ],
        "spawnSockets": [
          {
            "x": 6.333333333333333,
            "y": 5.88
          },
          {
            "x": 12.666666666666666,
            "y": 5.88
          }
        ],
        "placements": [
          {
            "asset": "cave-in-rubble",
            "x": 9.5,
            "y": 4.2,
            "placement": "floor",
            "group": "rubble",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.55,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "broken-handcart",
            "x": 3.8,
            "y": 10.5,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.42,
            "footprint": 3.35,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-barrel",
            "x": 2.0,
            "y": 2.0,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.22,
            "footprint": 1.4,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wooden-support-brace",
            "x": 0.4,
            "y": 3.0,
            "placement": "wall",
            "group": "structure",
            "facing": "east",
            "height": 3.25,
            "footprint": 3.1,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 16.5,
            "y": 3.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 16.5,
            "y": 11.8,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "bone-pile",
            "x": 12.0,
            "y": 9.0,
            "placement": "floor",
            "group": "macabre",
            "facing": "up",
            "height": 0.72,
            "footprint": 2.15,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 6.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 6.0,
            "y": 13.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 11.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 11.0,
            "y": 13.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "E-03",
        "name": "Crooked Reliquary",
        "kind": "gallery",
        "pool": "easy",
        "w": 14.0,
        "h": 12.0,
        "flavor": "reliquary alcoves; loot niche",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 6.0
          },
          {
            "side": "E",
            "x": 14.0,
            "y": 6.0
          }
        ],
        "spawnSockets": [
          {
            "x": 7.0,
            "y": 5.04
          }
        ],
        "placements": [
          {
            "asset": "reliquary-wall-alcove",
            "x": 4.0,
            "y": 0.4,
            "placement": "wall",
            "group": "structure",
            "facing": "south",
            "height": 2.75,
            "footprint": 2.15,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "reliquary-wall-alcove",
            "x": 10.0,
            "y": 0.4,
            "placement": "wall",
            "group": "structure",
            "facing": "south",
            "height": 2.75,
            "footprint": 2.15,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "ruined-altar",
            "x": 7.0,
            "y": 3.2,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 1.45,
            "footprint": 2.25,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "candelabra-cluster",
            "x": 3.0,
            "y": 9.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.65,
            "footprint": 1.9,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "archive-cupboard",
            "x": 13.6,
            "y": 9.5,
            "placement": "wall",
            "group": "furniture",
            "facing": "west",
            "height": 2.35,
            "footprint": 2.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 2.2,
            "y": 2.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 12.5,
            "y": 2.2,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "bone-pile",
            "x": 8.5,
            "y": 9.5,
            "placement": "floor",
            "group": "macabre",
            "facing": "up",
            "height": 0.72,
            "footprint": 2.15,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 2.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 2.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 12.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 12.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "art-painting-reliquary",
            "x": 7.0,
            "y": 0.35,
            "width": 1.6,
            "placement": "wall",
            "group": "art",
            "facing": "south",
            "blocking": false,
            "height": 1.12,
            "footprint": 1.6,
            "role": "wall-art"
          },
          {
            "asset": "scrolls-pile",
            "x": 5.5,
            "y": 9.5,
            "placement": "floor",
            "group": "books",
            "facing": "up",
            "height": 0.3,
            "footprint": 0.9,
            "elevation": 0.0,
            "blocking": false,
            "role": "readable-props"
          }
        ]
      },
      {
        "id": "E-04",
        "name": "Hollow Junction",
        "kind": "gallery",
        "pool": "easy",
        "w": 17.0,
        "h": 15.0,
        "flavor": "bend hub; floor grates, floating fragments",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 7.5
          },
          {
            "side": "E",
            "x": 17.0,
            "y": 7.5
          },
          {
            "side": "S",
            "x": 8.5,
            "y": 15.0
          }
        ],
        "spawnSockets": [
          {
            "x": 5.666666666666667,
            "y": 6.3
          },
          {
            "x": 11.333333333333334,
            "y": 6.3
          }
        ],
        "placements": [
          {
            "asset": "iron-floor-grate",
            "x": 5.5,
            "y": 7.5,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 0.22,
            "footprint": 2.3,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "iron-floor-grate",
            "x": 11.5,
            "y": 7.5,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 0.22,
            "footprint": 2.3,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wooden-support-brace",
            "x": 0.4,
            "y": 3.0,
            "placement": "wall",
            "group": "structure",
            "facing": "east",
            "height": 3.25,
            "footprint": 3.1,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "wooden-support-brace",
            "x": 16.6,
            "y": 11.0,
            "placement": "wall",
            "group": "structure",
            "facing": "west",
            "height": 3.25,
            "footprint": 3.1,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 8.5,
            "y": 2.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "heavy-bench",
            "x": 4.0,
            "y": 13.2,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 0.9,
            "footprint": 2.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "storage-barrel",
            "x": 14.8,
            "y": 12.5,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.22,
            "footprint": 1.4,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-barrel",
            "x": 13.5,
            "y": 13.0,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 1.22,
            "footprint": 1.4,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "supply-pile",
            "x": 2.5,
            "y": 12.5,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.35,
            "footprint": 2.2,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 15.0,
            "y": 2.2,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 8.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 8.0,
            "y": 14.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "E-05",
        "name": "Breach Overlook",
        "kind": "gallery",
        "pool": "easy",
        "w": 15.0,
        "h": 12.0,
        "flavor": "raised ledge; view into the breach void",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 6.0
          },
          {
            "side": "E",
            "x": 15.0,
            "y": 6.0
          },
          {
            "side": "N",
            "x": 7.5,
            "y": 0.0
          }
        ],
        "spawnSockets": [
          {
            "x": 5.0,
            "y": 5.04
          },
          {
            "x": 10.0,
            "y": 5.04
          }
        ],
        "placements": [
          {
            "asset": "broken-stone-stair-dais",
            "x": 11.5,
            "y": 3.0,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 0.92,
            "footprint": 3.25,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "cave-in-rubble",
            "x": 3.0,
            "y": 9.0,
            "placement": "floor",
            "group": "rubble",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.55,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 4.5,
            "y": 2.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "archive-bookshelf",
            "x": 7.5,
            "y": 11.4,
            "placement": "wall",
            "group": "furniture",
            "facing": "north",
            "height": 2.75,
            "footprint": 2.6,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 12.8,
            "y": 8.8,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 11.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 11.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "E-06",
        "name": "Cinder Arcade",
        "kind": "gallery",
        "pool": "easy",
        "w": 20.0,
        "h": 12.0,
        "flavor": "long gallery; brazier colonnade",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 6.0
          },
          {
            "side": "E",
            "x": 20.0,
            "y": 6.0
          }
        ],
        "spawnSockets": [
          {
            "x": 6.666666666666667,
            "y": 5.04
          },
          {
            "x": 13.333333333333334,
            "y": 5.04
          }
        ],
        "placements": [
          {
            "asset": "floor-brazier",
            "x": 5.0,
            "y": 2.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 10.0,
            "y": 2.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 15.0,
            "y": 2.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 10.0,
            "y": 9.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "heavy-bench",
            "x": 7.0,
            "y": 9.8,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 0.9,
            "footprint": 2.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "empty-weapon-rack",
            "x": 18.6,
            "y": 9.0,
            "placement": "wall",
            "group": "furniture",
            "facing": "west",
            "height": 2.05,
            "footprint": 2.25,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "bottles-jugs-crockery-cluster",
            "x": 13.0,
            "y": 9.6,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 0.88,
            "footprint": 1.65,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 2.2,
            "y": 9.8,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 5.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 5.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 17.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 17.0,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "E-07",
        "name": "Fallen Archive",
        "kind": "gallery",
        "pool": "easy",
        "w": 16.0,
        "h": 14.0,
        "flavor": "toppled shelves; supply cache",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 7.0
          },
          {
            "side": "E",
            "x": 16.0,
            "y": 7.0
          },
          {
            "side": "S",
            "x": 8.0,
            "y": 14.0
          }
        ],
        "spawnSockets": [
          {
            "x": 8.0,
            "y": 5.88
          }
        ],
        "placements": [
          {
            "asset": "archive-bookshelf",
            "x": 3.5,
            "y": 0.5,
            "placement": "wall",
            "group": "furniture",
            "facing": "south",
            "height": 2.75,
            "footprint": 2.6,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "archive-bookshelf",
            "x": 7.5,
            "y": 0.5,
            "placement": "wall",
            "group": "furniture",
            "facing": "south",
            "height": 2.75,
            "footprint": 2.6,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "archive-bookshelf",
            "x": 11.5,
            "y": 0.5,
            "placement": "wall",
            "group": "furniture",
            "facing": "south",
            "height": 2.75,
            "footprint": 2.6,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "archive-cupboard",
            "x": 15.5,
            "y": 2.5,
            "placement": "wall",
            "group": "furniture",
            "facing": "west",
            "height": 2.35,
            "footprint": 2.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "trestle-table",
            "x": 8.0,
            "y": 9.5,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 0.92,
            "footprint": 2.8,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "high-backed-chair",
            "x": 9.6,
            "y": 10.3,
            "placement": "floor",
            "group": "furniture",
            "facing": "up",
            "height": 1.7,
            "footprint": 1.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "bottles-jugs-crockery-cluster",
            "x": 4.0,
            "y": 11.0,
            "placement": "floor",
            "group": "goods",
            "facing": "up",
            "height": 0.88,
            "footprint": 1.65,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "supply-pile",
            "x": 13.0,
            "y": 11.5,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.35,
            "footprint": 2.2,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 2.0,
            "y": 4.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 2.2,
            "y": 12.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 1.5,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 1.5,
            "y": 13.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 14.5,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 14.5,
            "y": 13.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "art-map-thalenyr-scroll",
            "x": 5.5,
            "y": 0.4,
            "width": 1.4,
            "placement": "wall",
            "group": "art",
            "facing": "south",
            "blocking": false,
            "height": 0.98,
            "footprint": 1.4,
            "role": "wall-art"
          },
          {
            "asset": "books-pile",
            "x": 5.5,
            "y": 6.5,
            "placement": "floor",
            "group": "books",
            "facing": "up",
            "height": 0.35,
            "footprint": 0.9,
            "elevation": 0.0,
            "blocking": false,
            "role": "readable-props"
          },
          {
            "asset": "books-pile",
            "x": 10.5,
            "y": 6.0,
            "placement": "floor",
            "group": "books",
            "facing": "up",
            "height": 0.35,
            "footprint": 0.9,
            "elevation": 0.0,
            "blocking": false,
            "role": "readable-props"
          },
          {
            "asset": "scrolls-pile",
            "x": 7.0,
            "y": 12.3,
            "placement": "floor",
            "group": "books",
            "facing": "up",
            "height": 0.3,
            "footprint": 0.9,
            "elevation": 0.0,
            "blocking": false,
            "role": "readable-props"
          }
        ]
      }
    ],
    "hard": [
      {
        "id": "H-01",
        "name": "Squeeze Vault",
        "kind": "gallery",
        "pool": "hard",
        "w": 12.0,
        "h": 10.0,
        "flavor": "tight vault; barricaded corners",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 5.0
          },
          {
            "side": "E",
            "x": 12.0,
            "y": 5.0
          }
        ],
        "spawnSockets": [
          {
            "x": 3.0,
            "y": 4.2
          },
          {
            "x": 6.0,
            "y": 4.2
          },
          {
            "x": 9.0,
            "y": 4.2
          }
        ],
        "placements": [
          {
            "asset": "masonry-barricade",
            "x": 6.0,
            "y": 2.1,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 1.55,
            "footprint": 2.9,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "cave-in-rubble",
            "x": 9.5,
            "y": 8.0,
            "placement": "floor",
            "group": "rubble",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.55,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "chain-shackle",
            "x": 3.0,
            "y": 0.4,
            "placement": "wall",
            "group": "macabre",
            "facing": "south",
            "height": 1.65,
            "footprint": 1.6,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 2.0,
            "y": 8.3,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 10.5,
            "y": 2.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 9.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 9.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "H-02",
        "name": "Ravager Den",
        "kind": "gallery",
        "pool": "hard",
        "w": 13.0,
        "h": 11.0,
        "flavor": "egg nests; shed chitin",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 5.5
          },
          {
            "side": "E",
            "x": 13.0,
            "y": 5.5
          },
          {
            "side": "S",
            "x": 6.5,
            "y": 11.0
          }
        ],
        "spawnSockets": [
          {
            "x": 3.25,
            "y": 4.62
          },
          {
            "x": 6.5,
            "y": 4.62
          },
          {
            "x": 9.75,
            "y": 4.62
          }
        ],
        "placements": [
          {
            "asset": "monster-egg-nest",
            "x": 10.5,
            "y": 8.5,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.5,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "shed-chitin-pile",
            "x": 6.0,
            "y": 7.0,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 0.78,
            "footprint": 2.35,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "cocooned-remains-web-mass",
            "x": 11.5,
            "y": 0.5,
            "placement": "wall",
            "group": "corruption",
            "facing": "south",
            "height": 2.65,
            "footprint": 1.75,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "bone-pile",
            "x": 3.0,
            "y": 8.0,
            "placement": "floor",
            "group": "macabre",
            "facing": "up",
            "height": 0.72,
            "footprint": 2.15,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 2.0,
            "y": 2.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 2.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 2.0,
            "y": 10.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 7.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 7.0,
            "y": 10.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "H-03",
        "name": "Oath Scar Gallery",
        "kind": "gallery",
        "pool": "hard",
        "w": 12.0,
        "h": 12.0,
        "flavor": "shackles and hanging cages",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 6.0
          },
          {
            "side": "E",
            "x": 12.0,
            "y": 6.0
          },
          {
            "side": "N",
            "x": 6.0,
            "y": 0.0
          }
        ],
        "spawnSockets": [
          {
            "x": 3.0,
            "y": 5.04
          },
          {
            "x": 6.0,
            "y": 5.04
          },
          {
            "x": 9.0,
            "y": 5.04
          }
        ],
        "placements": [
          {
            "asset": "chain-shackle",
            "x": 3.0,
            "y": 0.4,
            "placement": "wall",
            "group": "macabre",
            "facing": "south",
            "height": 1.65,
            "footprint": 1.6,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "chain-shackle",
            "x": 9.0,
            "y": 0.4,
            "placement": "wall",
            "group": "macabre",
            "facing": "south",
            "height": 1.65,
            "footprint": 1.6,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "hanging-iron-cage",
            "x": 6.0,
            "y": 4.0,
            "placement": "ceiling",
            "group": "macabre",
            "facing": "down",
            "height": 2.15,
            "footprint": 1.55,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "weapon-armor-heap",
            "x": 9.0,
            "y": 9.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.45,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 2.2,
            "y": 10.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 10.3,
            "y": 10.3,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "false-wall-panel",
            "x": 11.7,
            "y": 9.0,
            "placement": "wall",
            "group": "structure",
            "facing": "west",
            "height": 2.9,
            "footprint": 2.75,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 4.5,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 4.5,
            "y": 11.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "art-banner-oathscar",
            "x": 6.0,
            "y": 11.65,
            "width": 1.6,
            "placement": "wall",
            "group": "art",
            "facing": "north",
            "blocking": false,
            "height": 1.12,
            "footprint": 1.6,
            "role": "wall-art"
          }
        ]
      },
      {
        "id": "H-04",
        "name": "The Narrow March",
        "kind": "gallery",
        "pool": "hard",
        "w": 14.0,
        "h": 9.0,
        "flavor": "corridor-fight; masonry barricades",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 4.5
          },
          {
            "side": "E",
            "x": 14.0,
            "y": 4.5
          }
        ],
        "spawnSockets": [
          {
            "x": 3.5,
            "y": 3.78
          },
          {
            "x": 7.0,
            "y": 3.78
          },
          {
            "x": 10.5,
            "y": 3.78
          }
        ],
        "placements": [
          {
            "asset": "masonry-barricade",
            "x": 5.0,
            "y": 3.2,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 1.55,
            "footprint": 2.9,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "masonry-barricade",
            "x": 9.0,
            "y": 5.8,
            "placement": "floor",
            "group": "structure",
            "facing": "up",
            "height": 1.55,
            "footprint": 2.9,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "collapsed-timber-masonry-pile",
            "x": 12.0,
            "y": 7.5,
            "placement": "floor",
            "group": "rubble",
            "facing": "up",
            "height": 1.55,
            "footprint": 3.35,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 12.5,
            "y": 1.8,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 8.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 8.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "H-05",
        "name": "Cinder Gauntlet",
        "kind": "gallery",
        "pool": "hard",
        "w": 13.0,
        "h": 10.0,
        "flavor": "kill lane; corruption growth",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 5.0
          },
          {
            "side": "E",
            "x": 13.0,
            "y": 5.0
          },
          {
            "side": "S",
            "x": 6.5,
            "y": 10.0
          }
        ],
        "spawnSockets": [
          {
            "x": 2.6,
            "y": 4.2
          },
          {
            "x": 5.2,
            "y": 4.2
          },
          {
            "x": 7.8,
            "y": 4.2
          },
          {
            "x": 10.4,
            "y": 4.2
          }
        ],
        "placements": [
          {
            "asset": "corruption-growth",
            "x": 10.5,
            "y": 7.5,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 1.45,
            "footprint": 2.3,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "corruption-growth",
            "x": 3.0,
            "y": 2.5,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 1.45,
            "footprint": 2.3,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 4.0,
            "y": 5.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 9.0,
            "y": 5.0,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "bone-pile",
            "x": 6.5,
            "y": 8.2,
            "placement": "floor",
            "group": "macabre",
            "facing": "up",
            "height": 0.72,
            "footprint": 2.15,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 11.5,
            "y": 2.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 3.0,
            "y": 9.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 10.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 10.0,
            "y": 9.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "H-06",
        "name": "Breachling Warren",
        "kind": "gallery",
        "pool": "hard",
        "w": 12.0,
        "h": 11.0,
        "flavor": "burrowed wall breaches",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 5.5
          },
          {
            "side": "E",
            "x": 12.0,
            "y": 5.5
          },
          {
            "side": "N",
            "x": 6.0,
            "y": 0.0
          }
        ],
        "spawnSockets": [
          {
            "x": 2.4,
            "y": 4.62
          },
          {
            "x": 4.8,
            "y": 4.62
          },
          {
            "x": 7.2,
            "y": 4.62
          },
          {
            "x": 9.6,
            "y": 4.62
          }
        ],
        "placements": [
          {
            "asset": "burrowed-wall-breach-plug",
            "x": 3.5,
            "y": 0.5,
            "placement": "wall",
            "group": "corruption",
            "facing": "south",
            "height": 2.8,
            "footprint": 2.9,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "burrowed-wall-breach-plug",
            "x": 8.5,
            "y": 0.5,
            "placement": "wall",
            "group": "corruption",
            "facing": "south",
            "height": 2.8,
            "footprint": 2.9,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "monster-egg-nest",
            "x": 9.5,
            "y": 8.5,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.5,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "shed-chitin-pile",
            "x": 3.5,
            "y": 7.5,
            "placement": "floor",
            "group": "corruption",
            "facing": "up",
            "height": 0.78,
            "footprint": 2.35,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "cocooned-remains-web-mass",
            "x": 11.5,
            "y": 8.5,
            "placement": "wall",
            "group": "corruption",
            "facing": "west",
            "height": 2.65,
            "footprint": 1.75,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 2.2,
            "y": 9.5,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 6.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 6.0,
            "y": 10.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          }
        ]
      },
      {
        "id": "H-07",
        "name": "The Toll Gate",
        "kind": "gallery",
        "pool": "hard",
        "w": 14.0,
        "h": 10.0,
        "flavor": "portcullis pair; toll cache",
        "doors": [
          {
            "side": "W",
            "x": 0.0,
            "y": 5.0
          },
          {
            "side": "E",
            "x": 14.0,
            "y": 5.0
          }
        ],
        "spawnSockets": [
          {
            "x": 3.5,
            "y": 4.2
          },
          {
            "x": 7.0,
            "y": 4.2
          },
          {
            "x": 10.5,
            "y": 4.2
          }
        ],
        "placements": [
          {
            "asset": "rusted-portcullis",
            "x": 7.0,
            "y": 6.4,
            "placement": "wall",
            "group": "structure",
            "facing": "north",
            "height": 3.05,
            "footprint": 2.75,
            "blocking": true,
            "role": "dressing"
          },
          {
            "asset": "weapon-armor-heap",
            "x": 11.5,
            "y": 7.5,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 2.45,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "floor-brazier",
            "x": 7.0,
            "y": 8.5,
            "placement": "floor",
            "group": "fire",
            "facing": "up",
            "height": 1.38,
            "footprint": 1.5,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "supply-pile",
            "x": 2.5,
            "y": 8.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.35,
            "footprint": 2.2,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "storage-chest",
            "x": 12.5,
            "y": 2.2,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "storage-chest",
            "x": 2.2,
            "y": 2.0,
            "placement": "floor",
            "group": "loot",
            "facing": "up",
            "height": 1.05,
            "footprint": 1.65,
            "blocking": true,
            "role": "loot-cache"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 0.3,
            "placement": "wall",
            "group": "fire",
            "facing": "south",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "wall-torch-sconce",
            "x": 9.0,
            "y": 9.7,
            "placement": "wall",
            "group": "fire",
            "facing": "north",
            "height": 1.5,
            "footprint": 0.95,
            "blocking": false,
            "role": "dressing"
          },
          {
            "asset": "art-relief-toll",
            "x": 5.0,
            "y": 0.35,
            "width": 1.6,
            "placement": "wall",
            "group": "art",
            "facing": "south",
            "blocking": false,
            "height": 1.12,
            "footprint": 1.6,
            "role": "wall-art"
          }
        ]
      }
    ]
  },
  "bossSet": {
    "bosses": [
      {
        "id": "cinderbound-warden",
        "name": "Cinderbound Warden",
        "weight": 1,
        "patterns": [
          "cinder-sweep",
          "ash-call",
          "soul-tax"
        ]
      }
    ],
    "perRun": 1,
    "note": "V2 ships exactly one boss; 3 anchor sockets + set architecture keep 3-of-6 boss sets possible later.",
    "anchorSockets": [
      [
        217.5,
        4.5
      ],
      [
        228.5,
        4.5
      ],
      [
        223.0,
        15.5
      ]
    ],
    "runeCircle": {
      "radius": 2.6,
      "note": "glowing rune circle on the floor at the active boss anchor"
    }
  },
  "tables": {
    "spawn": {
      "wayfarer": {
        "enemyCount": 3,
        "enemyKinds": [
          "breachling"
        ],
        "healthMult": 1.0,
        "damageMult": 1.0,
        "galleryPressureBase": 34,
        "bossPressureBase": 64,
        "enemies": "3 Breachlings per run (light)",
        "distribution": "seeded across chambers (1-2 per chamber)",
        "health": "1.00x",
        "damage": "1.00x",
        "galleryPressure": "34 + seed variance",
        "bossPressure": "64 + seed variance"
      },
      "oathbreaker": {
        "enemyCount": 5,
        "enemyKinds": [
          "oathbound",
          "ravager"
        ],
        "healthMult": 1.55,
        "damageMult": 1.22,
        "galleryPressureBase": 58,
        "bossPressureBase": 84,
        "enemies": "5 Oathbound/Ravager variants per run",
        "distribution": "seeded across chambers (denser: up to socket count)",
        "health": "1.55x",
        "damage": "1.22x",
        "galleryPressure": "58 + seed variance",
        "bossPressure": "84 + seed variance"
      }
    },
    "loot": {
      "wayfarer": {
        "pathReward": "Tempered training gear",
        "caches": "minor recovery caches at loot sockets; breakable props pay out per destructible table",
        "bonus": "none"
      },
      "oathbreaker": {
        "pathReward": "Grave-Iron class implement",
        "caches": "better caches at loot sockets (hard table); breakable props pay out per destructible table",
        "bonus": "deterministic 68% class-skill awakening, else valuable pressure shard (seeded, recorded)"
      }
    },
    "props": {
      "easy": [
        "trestle-table",
        "heavy-bench",
        "high-backed-chair",
        "storage-barrel",
        "reinforced-crate",
        "archive-bookshelf",
        "archive-cupboard",
        "empty-weapon-rack",
        "supply-pile",
        "broken-handcart",
        "floor-brazier",
        "wall-torch-sconce",
        "cave-in-rubble",
        "bone-pile",
        "iron-floor-grate",
        "wooden-support-brace",
        "candelabra-cluster",
        "bottles-jugs-crockery-cluster"
      ],
      "hard": [
        "corruption-growth",
        "monster-egg-nest",
        "cocooned-remains-web-mass",
        "shed-chitin-pile",
        "burrowed-wall-breach-plug",
        "chain-shackle",
        "hanging-iron-cage",
        "masonry-barricade",
        "bone-pile",
        "weapon-armor-heap",
        "rusted-portcullis",
        "floor-brazier",
        "wall-torch-sconce",
        "cave-in-rubble",
        "collapsed-timber-masonry-pile",
        "supply-pile",
        "storage-chest"
      ],
      "boss-suite": [
        "corruption-growth",
        "guardian-statue",
        "ruined-stone-archway",
        "rusted-portcullis",
        "floor-brazier",
        "chain-shackle",
        "bone-pile",
        "broken-stone-stair-dais"
      ],
      "vestibule": [
        "floor-brazier",
        "wall-torch-sconce",
        "archive-bookshelf",
        "trestle-table",
        "heavy-bench",
        "storage-chest (coffer)",
        "cave-in-rubble",
        "wooden-support-brace",
        "candelabra-cluster"
      ]
    }
  },
  "corruption": [
    {
      "area": "Vestibule",
      "level": 0.05
    },
    {
      "area": "Threshold Plaza",
      "level": 0.1
    },
    {
      "area": "Wayfarer path",
      "level": 0.25
    },
    {
      "area": "Oathbreaker path",
      "level": 0.45
    },
    {
      "area": "Convergence",
      "level": 0.7
    },
    {
      "area": "Ashen Lock",
      "level": 1.0
    },
    {
      "area": "Memory Vault",
      "level": 0.6
    },
    {
      "area": "Way Upward (exit)",
      "level": 0.3
    }
  ],
  "seedPolicy": {
    "layoutSeed": "topology, chamber pick+order from path pool, corridor bends, encounter placement, boss pattern",
    "dressingSeed": "environment detail within legal placement sockets (never blocks doors/NPCs/spawns/quest/boss route)",
    "rng": "mulberry32 lineage (same as src/game/dungeon.ts); seed recorded per run; same seed -> same result",
    "comparisonSeed": 4182,
    "validation": "sparse / median / dense representative seeds + full invariant sweep incl. 4182"
  },
  "invariants": {
    "chambersPerRun": [
      3,
      5
    ],
    "poolSeparation": "easy rooms never appear on the hard path and vice versa",
    "noDuplicateRooms": "a run never draws the same pool room twice",
    "reachability": "start -> boss -> exit connected on every seed; every objective reachable",
    "socketIntegrity": "every chamber connects through real door sockets; corridor widths fixed",
    "noBlockedCriticals": "dressing never blocks doors, NPCs, spawns, quest objects, boss route",
    "firstMemoryOnce": "the First Memory is awarded exactly once",
    "comparisonSeed": 4182
  }
};
