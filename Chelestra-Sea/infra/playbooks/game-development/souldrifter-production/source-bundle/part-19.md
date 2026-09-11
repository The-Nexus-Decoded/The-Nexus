9e8b3fbe46ee17b7238ae14b02f1b8bd6b718a908d7426b0611e879`

```json
{
  "build_id": "build_0042",
  "status": "failed",
  "blocking_errors": 1,
  "failures": [
    {
      "failure_id": "VAL-2041",
      "severity": "BLOCKER",
      "region_id": "deep_mine",
      "entity_ids": [
        "room_08",
        "corridor_08_09",
        "room_09"
      ],
      "invariant": "required_graph_edge_is_traversable",
      "evidence": {
        "nav_probe": "failed",
        "ground_render": "renders/deep_mine_08_09.png"
      },
      "allowed_scope": [
        "corridor_08_09",
        "door_socket_room_08",
        "door_socket_room_09"
      ],
      "required_retests": [
        "graph",
        "collision",
        "navigation",
        "ground_render"
      ]
    }
  ]
}
```

---

## `legacy-source/world_spec.example.json`

SHA-256: `08e2401c041276d8174a170e2b80ebbbfc422970b247c6b02040d62c3c064f1b`

```json
{
  "world_id": "ashen_valley",
  "version": 1,
  "seed": 904217,
  "creative_brief": "Ruined dark-fantasy mining village and connected underground dungeon.",
  "regions": [
    {
      "id": "village_market",
      "type": "district",
      "status": "planned",
      "preserve": false,
      "landmarks": [
        "forge",
        "market_tower",
        "mine_gate"
      ]
    },
    {
      "id": "deep_mine",
      "type": "dungeon",
      "status": "planned",
      "preserve": false,
      "landmarks": [
        "shaft_lift",
        "ritual_chamber",
        "boss_arena"
      ]
    }
  ],
  "required_connections": [
    {
      "from": "spawn",
      "to": "village_market",
      "mode": "walk"
    },
    {
      "from": "village_market",
      "to": "mine_gate",
      "mode": "walk"
    },
    {
      "from": "mine_gate",
      "to": "deep_mine",
      "mode": "transition"
    },
    {
      "from": "deep_mine",
      "to": "boss_arena",
      "mode": "walk"
    }
  ],
  "validation": {
    "blocking_errors": [],
    "status": "not_run"
  }
}
```
