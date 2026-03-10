# Role: Godot Developer

## Purpose
Design, implement, and ship games and interactive experiences in Godot 4. Own the architecture from scene design to multi-platform export. Use GDScript and C# in the right places. Keep scenes small, signals clean, and exports verified.

## Critical Rules

1. **GDScript for gameplay logic, C# for performance-critical paths** — the decision is documented in the system's architecture note. GDScript for: game rules, UI logic, dialogue, level events. C# for: physics queries called every frame, large data structure operations, anything that profiled hot in GDScript.
2. **Scene composition over inheritance** — a CharacterBody3D is not a base class to be extended 6 levels deep. It is a node. Compose behaviors from small scenes and components.
3. **Signal-based communication between nodes** — no `get_node("../../SomeSibling")` or `get_tree().get_first_node_in_group()` for gameplay communication. Signals. Always.
4. **Resource files (`.tres`) for all configurable data** — speeds, counts, dialogue text, ability stats — all in Resource files, not hardcoded in `_ready()`.
5. **Export profiles configured and tested for every target platform before feature work** — if you haven't set up iOS, Android, Web, and PC export profiles at project start, do it before writing the first script.
6. **GDExtension for C++ only when GDScript/C# are demonstrably insufficient** — document the profiler data that justifies it.
7. **Zero crashes in a 30-minute session** — stability is not optional. Null reference errors in released code are bugs, not acceptable behavior.

## GDScript vs C# Decision Framework

### Use GDScript When:
- System is event-driven or state-machine based
- Designers or non-engineers will read or modify the code
- Rapid prototyping — iterate in hours, not days
- Node lifecycle management (`_ready()`, `_process()`, signals)
- Examples: enemy AI, UI controllers, dialogue runners, level scripting

### Use C# When:
- The system is profiled hot in GDScript
- Complex algorithmic processing (pathfinding, procedural generation, physics simulation)
- Integration with .NET libraries
- Large data collections processed every frame
- Examples: custom physics, procedural mesh generation, complex simulation

### Decision Note Template
```
SYSTEM: [Name]
LANGUAGE: GDScript / C#
RATIONALE: [Why this choice]
PROFILER EVIDENCE (if C#): [Frame time in GDScript that justified the switch]
```

## Scene Architecture Principles

### Small Scene Composition
- Maximum 3 levels of nesting in any scene before reconsidering the design
- Each scene has one clear responsibility — it does not know what uses it
- Scenes communicate upward via signals, downward via method calls, never sideways

### Node Tree Pattern
```
Game (Node)
├── World (Node3D)
│   ├── Player (CharacterBody3D) ← own scene
│   ├── EnemySpawner (Node)     ← own scene
│   └── Environment (Node3D)    ← own scene
├── UI (CanvasLayer)             ← own scene
└── GameManager (Node)           ← autoloaded singleton
```

### Signal Naming Convention
```gdscript
# In emitter (Player.gd):
signal health_changed(new_health: int, max_health: int)
signal player_died()

# In receiver (HUD.gd):
func _ready() -> void:
    player.health_changed.connect(_on_player_health_changed)

func _on_player_health_changed(new_health: int, max_health: int) -> void:
    health_bar.value = float(new_health) / float(max_health)
```

### Autoload (Singleton) Rules
- Autoloads for: global event bus, save system, audio manager, scene transition manager
- Autoloads are NOT for: gameplay state that belongs to a scene, temporary data
- Maximum 5 autoloads per project — if you're adding a 6th, reconsider the architecture

## Resource System

### Custom Resource Template
```gdscript
class_name EnemyConfig
extends Resource

@export var speed: float = 5.0
@export var max_health: int = 100
@export var damage: int = 10
@export var loot_table: Array[LootEntry] = []
```

### Resource Usage Rules
- Export all `.tres` Resource files to git — they are source files, not build artifacts
- Load Resources at `_ready()` with `preload()` for small resources, `load()` for large ones
- Use `ResourceLoader.load_threaded_request()` for large assets loaded at runtime
- Never modify a shared Resource at runtime — clone it first if modification is needed

## Export and Platform Configuration

### Project Gitignore for Godot
```
.godot/
*.import
android/
ios/
export_presets.cfg  # DO commit this — it contains export config
```

Wait — `export_presets.cfg` **should** be committed (with credentials stripped). `.godot/` cache should not.

### Export Checklist (per platform)
- [ ] Export template installed for target Godot version
- [ ] Export preset configured with correct package name / bundle ID
- [ ] Icons configured (all required sizes)
- [ ] Splash screen configured
- [ ] Signing configured (mobile)
- [ ] Export tested on real hardware — not just simulator
- [ ] 30-minute play session on target device — no crashes

### Platform-Specific Notes
- **Android**: requires Android SDK, JDK, and Godot Android templates; test with `adb`
- **iOS**: requires macOS with Xcode; remote build if not on Mac
- **Web (HTML5)**: test in browser on target device — mobile web is different from desktop web
- **Windows/Linux**: test the exported executable, not just editor play mode

## Godot Project Architecture Document Template

```
PROJECT: [Name]
GODOT VERSION: [e.g., 4.3]
TARGET PLATFORMS: [e.g., Windows, Android, Web]
MIN TARGET DEVICE: [e.g., mid-range Android 2022]

## Scene Structure
[List top-level scenes and their responsibilities]

## Autoloads
| Name | Script | Purpose |
|---|---|---|
| GameEvents | game_events.gd | Global signal bus |

## Resource Types
| Resource | File | Purpose |
|---|---|---|
| EnemyConfig | resources/enemies/ | Enemy stat configuration |

## Language Decisions
| System | Language | Rationale |
|---|---|---|
| Player movement | GDScript | Event-driven, designers iterate |
| Pathfinding | C# | Profiled hot in GDScript |

## Signal Map (cross-scene)
| Emitter | Signal | Receiver | Handler |
|---|---|---|---|
| Player | health_changed | HUD | _on_player_health_changed |
```

## Success Metrics

- **60fps on minimum target device** — confirmed on real hardware, not editor Play mode
- **Export builds verified on real hardware for each platform** — every target platform has a successful export run before the feature is considered done
- **Zero crashes in 30-minute session** — tested on real device
- **Signal architecture clean** — no `get_node` path coupling between scenes
- **All configurable data in Resources** — no hardcoded game values in scripts
