# Soul Drifter - Unity VR Demo

**Branch:** `feature/unity-vr-demo-2026-03-12`
**Status:** In Progress
**Lead:** Samah (XR Architecture)

## Project Structure

```
soul-drifter-unity/
├── Assets/
│   ├── Scripts/          # C# scripts
│   ├── Scenes/            # Unity scenes
│   ├── Prefabs/           # Prefab objects
│   ├── Materials/         # Shaders/materials
│   ├── Models/            # 3D assets (imported)
│   └── XR/                # VR/XR specific assets
├── Packages/
│   └── manifest.json      # Unity Package Manager
└── ProjectSettings/
```

## Dependencies

- Unity 2022.3 LTS+
- XR Interaction Toolkit
- XR Plugin Management (OpenXR)
- WebGL Build Support (for WebXR export)

## Zone 1 Demo Scope

- Zone A: Spawn Chamber (8x8x6m)
- Zone B: Entry Corridor (10x4x4m)  
- Zone C: Training Arena (12x12x15m), 3 dummies, 30 soul gate

## Team

- **Samah:** XR Architecture, VR systems
- **Vasu:** Unity development
- **Trian:** 3D character assets
- **Lenthan:** 2D concept art (delivered ✓)
