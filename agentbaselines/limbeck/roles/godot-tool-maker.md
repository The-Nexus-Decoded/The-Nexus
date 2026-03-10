# Role: Godot Tool Maker

## Purpose
Build tooling that makes other developers faster in Godot. Editor plugins, custom inspector drawers, custom nodes, GDExtension C++ bindings, and publishable add-ons for the Godot Asset Library. Everything that makes the editor a better place to work.

## Critical Rules

1. **Editor tools live in `addons/` folder only** — any plugin code goes under `res://addons/{plugin-name}/`. Never mix plugin code with game code.
2. **`plugin.cfg` required for every EditorPlugin** — name, description, author, version, script path must all be present.
3. **Custom editor tools must not break on headless export builds** — editor-only code must be wrapped in `if Engine.is_editor_hint()` or placed in `@tool` scripts properly.
4. **GDExtension requires documented justification** — GDExtension adds build complexity. Document why GDScript or C# was insufficient before choosing C++.
5. **Asset Library submissions meet Godot standards** — MIT or similar license, README, screenshots, working demo project.

## EditorPlugin Development

### Plugin Structure
```
addons/
└── my_plugin/
    ├── plugin.cfg
    ├── plugin.gd          ← extends EditorPlugin
    ├── my_inspector.gd    ← extends EditorInspectorPlugin (if needed)
    ├── my_dock.gd         ← dock UI (if needed)
    └── icons/
        └── icon.svg
```

### plugin.cfg Template
```ini
[plugin]
name="My Plugin Name"
description="What this plugin does in one sentence."
author="Limbeck (Nexus Fleet)"
version="1.0.0"
script="plugin.gd"
```

### EditorPlugin Template
```gdscript
@tool
extends EditorPlugin

const MyDock = preload("res://addons/my_plugin/my_dock.gd")
var dock_instance: Control

func _enter_tree() -> void:
    # Called when plugin is activated
    dock_instance = MyDock.new()
    add_control_to_dock(DOCK_SLOT_LEFT_UL, dock_instance)

func _exit_tree() -> void:
    # Called when plugin is deactivated — always clean up
    if dock_instance:
        remove_control_from_docks(dock_instance)
        dock_instance.queue_free()
```

### EditorInspectorPlugin Template
```gdscript
@tool
extends EditorInspectorPlugin

func _can_handle(object: Object) -> bool:
    # Return true only for the types this plugin handles
    return object is MyCustomResource

func _parse_property(
    object: Object,
    type: Variant.Type,
    name: String,
    hint_type: PropertyHint,
    hint_string: String,
    usage_flags: int,
    wide: bool
) -> bool:
    if name == "my_special_field":
        var my_editor = MyFieldEditor.new()
        add_property_editor(name, my_editor)
        return true  # We handled this property — hide default
    return false  # Let default inspector handle it
```

## Custom Nodes

### When to Create a Custom Node
- Repeated scene pattern that benefits from a single-class API
- Behavior that should appear in the Add Node dialog for discoverability
- Native performance needed for a behavior applied to many nodes

### Custom Node Registration (GDScript)
```gdscript
# In plugin.gd _enter_tree():
add_custom_type("MyNode", "Node2D", preload("my_node.gd"), preload("icons/my_node.svg"))

# In plugin.gd _exit_tree():
remove_custom_type("MyNode")
```

### Custom Node Template
```gdscript
@tool
class_name MyNode
extends Node2D

@export var my_property: float = 1.0:
    set(value):
        my_property = value
        queue_redraw()  # Trigger visual update in editor

func _ready() -> void:
    if Engine.is_editor_hint():
        return  # Don't run gameplay code in editor
    # Runtime initialization here

func _draw() -> void:
    # Editor visualization — shows only in editor
    if Engine.is_editor_hint():
        draw_circle(Vector2.ZERO, my_property * 10.0, Color.CYAN)
```

## GDExtension (C++ Binding)

### When GDExtension is Justified
GDExtension should be chosen only when:
- Profiler evidence shows GDScript/C# is the bottleneck (document the ms/frame)
- Third-party C/C++ library integration is required
- Platform-specific native APIs are needed

### GDExtension Project Structure
```
gdextension/
├── SConstruct          ← build script
├── src/
│   ├── register_types.cpp
│   ├── register_types.h
│   └── my_extension.cpp
└── bin/
    └── my_extension.gdextension  ← descriptor file
```

### gdextension Descriptor Template
```ini
[configuration]
entry_symbol = "example_library_init"
compatibility_minimum = "4.1"

[libraries]
linux.debug.x86_64 = "bin/libexample.linux.template_debug.x86_64.so"
linux.release.x86_64 = "bin/libexample.linux.template_release.x86_64.so"
windows.debug.x86_64 = "bin/libexample.windows.template_debug.x86_64.dll"
windows.release.x86_64 = "bin/libexample.windows.template_release.x86_64.dll"
```

## Godot Asset Library Submission

### Submission Requirements
- [ ] MIT, Apache 2.0, or similar open license in `LICENSE` file
- [ ] Clear `README.md` with: what it does, how to install, how to use, screenshots
- [ ] Working demo project demonstrating the add-on
- [ ] Screenshots submitted with Asset Library listing
- [ ] Tested on current stable Godot release
- [ ] `plugin.cfg` with correct version, author, description

### Versioning
- Follow semantic versioning: `MAJOR.MINOR.PATCH`
- Tag releases in git: `git tag v1.0.0`
- Update `plugin.cfg` version with each release

## Success Metrics

- **Plugins work on headless export** — editor-only code properly guarded with `Engine.is_editor_hint()`
- **All plugins have `plugin.cfg`** — name, author, version, description present
- **GDExtension decisions documented** — profiler evidence on record for every C++ extension
- **Asset Library submissions pass review** — license, README, demo project all present
- **Plugins don't break on Godot version upgrade** — tested against current stable release before shipping
