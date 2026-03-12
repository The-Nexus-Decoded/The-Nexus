# visionOS Gesture Pipeline → Mobile→VR Contract Mapping

**Version:** 1.0  
**Status:** Ready for Implementation  
**Owner:** Samah (Spatial)

---

## 1. Overview

This document maps the visionOS gesture pipeline (GestureRecognizer) to the Mobile→VR Handoff Contract (v0.2).

**Pipeline flow:**
```
visionOS GestureRecognizer → RawGesture → IntentBuilder → GestureIntent → VR Spatial Layer
```

---

## 2. GestureType Mapping

| visionOS Gesture | → Paithan GestureType | Confidence Base |
|------------------|----------------------|-----------------|
| UITapGestureRecognizer | `tap` | 0.95 |
| UIDragGestureRecognizer | `drag` | 0.90 |
| UIPinchGestureRecognizer | `pinch` | 0.88 |
| UIRotationGestureRecognizer | `rotate` | 0.88 |
| UITapGestureRecognizer (2x) | `double_tap` | 0.92 |
| UILongPressGestureRecognizer | `long_press` | 0.85 |
| UIPanGestureRecognizer (velocity) | `flick` | 0.80 |
| UILongPressGestureRecognizer (>1s) | `hold` | 0.85 |
| Custom UIBezierPath tracking | `circle` | 0.75 |
| **Custom Sartan gesture** | `pinch_sartan` | 0.85 |

---

## 3. Field Mapping

### 3.1 position (WorldPosition)

```swift
// visionOS: CGPoint in screen space
// Convert via:

func toWorldPosition(screenPoint: CGPoint, cameraPose: CameraPose) -> vec3 {
    let normalized = vec2(
        screenPoint.x / screenBounds.width,
        screenPoint.y / screenBounds.height
    )
    
    // Ray from camera through screen point
    let ray = cameraPose.unproject(normalized)
    let distance = rayPlaneIntersection(
        ray: ray,
        plane: Plane(normal: cameraPose.forward, distance: 1.0)
    )
    
    return ray.origin + ray.direction * distance
}
```

### 3.2 direction (Vector3)

| Gesture | Direction Calculation |
|---------|----------------------|
| `drag` | velocity.normalized |
| `flick` | velocity.normalized |
| `pinch` | (center of two fingers).direction_from_previous |
| `rotate` | tangent of rotation arc |
| `circle` | tangent of circle path |
| `pinch_sartan` | outward from Sartan symbol center |

### 3.3 magnitude (0-1)

| Gesture | Magnitude Calculation |
|---------|----------------------|
| `pinch` | `scaleFactor - 1.0` normalized to 0-1 |
| `rotate` | `rotationRadians / π` capped at 1.0 |
| `drag` | `distance / max_drag_distance` |
| `flick` | `velocity.magnitude / max_velocity` |
| `circle` | `arcLength / (2π * radius)` |

### 3.4 duration (ms)

```swift
let duration = gesture.endTime - gesture.startTime
// Tracked in GestureRecognizer state
```

---

## 4. Context Injection

### 4.1 returnToken

```swift
let returnToken = UUID()
// Stored in gesture.userInfo, propagated through pipeline
```

### 4.2 transitionPoint

| App State | transitionPoint |
|-----------|-----------------|
| Menu visible | `menu` |
| Home/World view | `home` |
| Entity selected | `selected` |
| Manipulation active | `manipulating` |
| Casting/Charging | `casting` / `charging` |

### 4.3 selectionIds

```swift
let selectionIds: [String] = hitTestResult.map { $0.entityId }
// Empty array if no entity targeted
```

---

## 5. Metadata Injection

### 5.1 confidence

```swift
let baseConfidence = gestureTypeToConfidence[gesture.type]!
let modifiers: Double = 0.0

// Modifiers
if gesture.isPreciseLocation { modifiers += 0.05 }
if gesture.fingerCount >= 3 { modifiers += 0.03 }
if user.hasSartanHeritage { modifiers += 0.10 }  // Sartan touch

let confidence = min(1.0, baseConfidence + modifiers)
```

### 5.2 sourceDevice

```swift
let sourceDevice: String = "mobile"  // Always "mobile" from visionOS
```

### 5.3 originatingSurface

```swift
let originatingSurface: String = gestureRecognizer.view?.restorationIdentifier ?? "unknown"
```

---

## 6. End-to-End Example

### Input (visionOS GestureRecognizer)

```swift
let gesture = UIPinchGestureRecognizer()
gesture.location = CGPoint(x: 400, y: 300)
gesture.scale = 1.5
gesture.velocity = 0.3
gesture.state: .changed
gesture.startTime = 1700... // unix_ms
```

### Output (GestureIntent)

```swift
let intent = GestureIntent(
    type: "pinch",
    position: vec3(0.5, 1.2, -2.0),  // WorldPosition from unproject
    direction: vec3(0.0, 0.0, 1.0),   // Forward (pinch is scale, not directional)
    magnitude: 0.5,                   // (1.5 - 1.0) = 0.5
    duration: 150,                    // ms since start
    context: Context(
        returnToken: "a1b2c3d4-...",
        transitionPoint: "manipulating",
        selectionIds: ["cube_001"]
    ),
    metadata: Metadata(
        confidence: 0.93,             // base 0.88 + precise location
        sourceDevice: "mobile",
        originatingSurface: "world_view"
    )
)
```

---

## 7. Error Handling

| Failure | Response |
|---------|----------|
| Camera pose unavailable | Emit with `confidence: 0.0`, reject downstream |
| Hit test timeout | Return `selectionIds: []`, continue |
| Confidence < 0.85 | Attach warning flag, allow VR to reject |
| Return token collision | Regenerate UUID |

---

## 8. GazeConfirm Integration

For distance ≥ 1.5m, the VR layer will request explicit confirmation. Pipeline adds:

```swift
var requiresVRConfirm: Bool {
    return position.distance(from: cameraPose.position) >= 1.5
}
```

If true, VR sends `GazeConfirm` request. Mobile displays Sartan rune confirmation UI.

---

*Mapping complete. Ready for integration with Paithan's Mobile→VR contract.*
