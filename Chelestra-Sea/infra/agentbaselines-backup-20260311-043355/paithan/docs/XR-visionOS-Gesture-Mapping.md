# XR-visionOS Gesture Mapping

## Overview
Maps raw hand gesture types from Vision Pro sensors to semantic **GestureAction** values, with intensity curves factored by device thermal state.

## Raw Gesture Types (Vision Pro Confidence)

| Gesture      | Confidence |
| ------------ | ---------- |
| tap          | 0.95       |
| double_tap   | 0.92       |
| drag         | 0.90       |
| pinch        | 0.88       |
| pinch_sartan | 0.85       |
| rotate       | 0.88       |
| flick        | 0.80       |
| long_press   | 0.85       |
| hold         | 0.85       |
| circle       | 0.75       |

## Semantic GestureAction Mapping

| Raw Gesture   | GestureAction | Description                          |
| -------------- | ------------- | ------------------------------------ |
| tap            | move          | Select / confirm                    |
| double_tap     | cast          | Secondary action / ability          |
| drag           | move          | Drag virtual object                 |
| pinch          | grab          | Grab and manipulate                 |
| pinch_sartan   | grab          | Two-hand grab (Sartan-specific)     |
| rotate         | rotate        | Rotate object in place              |
| flick          | move          | Quick throw / flick                 |
| long_press     | charge        | Hold to charge ability              |
| hold           | charge        | Sustained hold (extended charge)    |
| circle         | cast          | Gesture-based spell/ability cast    |

## Thermal Tiers (from thermal-haptic-state-machine.md)

| Tier | State        | Description                          |
| ---- | ------------ | ------------------------------------ |
| 1    | Nominal      | Device operating normally            |
| 2    | Warm         | Slightly elevated, no performance impact |
| 3    | Throttling   | Reduced performance, noticeable heat |
| 4    | Critical     | Safety risk, minimal function        |

## Gesture Intensity Curves by Thermal Tier

| Gesture      | Tier 1 (Nominal) | Tier 2 (Warm) | Tier 3 (Throttling) | Tier 4 (Critical) |
| ------------ | ---------------- | -------------- | ------------------- | ------------------ |
| tap          | 1.0              | 1.0            | 0.70                | 0.40               |
| double_tap   | 1.0              | 0.75           | 0.60                | disabled           |
| drag         | 1.0              | 0.90           | 0.75                | 0.50               |
| pinch        | 1.0              | 0.90           | 0.80                | 0.55               |
| pinch_sartan | 1.0              | 0.85           | 0.70                | disabled           |
| rotate       | 1.0              | 0.90           | 0.75                | 0.50               |
| flick        | 1.0              | 0.85           | 0.65                | 0.35               |
| long_press   | 1.0              | 0.95           | 0.80                | disabled           |
| hold         | 1.0              | 0.90           | 0.75                | disabled           |
| circle       | 1.0              | 0.85           | 0.60                | disabled           |

## Intensity Curve Rationale

- **Tier 1-2**: Full or near-full fidelity — minimal impact on gesture responsiveness
- **double_tap**: Reduced at Warm (0.75) — second tap carries percussive weight, doubling feels aggressive
- **Tier 3**: Moderate throttling — reduce continuous haptics (drag, rotate, hold) more than discrete (tap, double_tap)
- **Tier 3**: Moderate throttling — reduce continuous haptics (drag, rotate, hold) more than discrete (tap, double_tap)
- **Tier 4**: Safety mode — only tap (confirmation) and basic drag/rotate remain at reduced intensity; sustained gestures disabled to prevent thermal runaway

## XR-Specific Considerations

- **pinch_sartan** (two-hand grab): Higher thermal cost — disabled at Tier 4 due to dual-sensor overhead
- **flick**: Lowest confidence (0.80) — further reduced at high thermal tiers to prevent misfire feedback
- **circle**: Complex multi-point gesture — highest overhead, disabled at Tier 4

## Implementation

### Core Types

```swift
enum RawGestureType: String, CaseIterable {
    case tap, double_tap, drag, pinch, pinch_sartan
    case rotate, flick, long_press, hold, circle
}

enum GestureAction: String {
    case move, rotate, scale, cast, charge, grab
}

enum ThermalTier: Int, Comparable {
    case nominal = 1, warm, throttling, critical
    static func < (lhs: ThermalTier, rhs: ThermalTier) -> Bool { lhs.rawValue < rhs.rawValue }
}

struct GestureIntensityConfig {
    let gesture: RawGestureType
    let action: GestureAction
    let baseIntensity: Float
    let thermalMultipliers: [ThermalTier: Float]
}
```

### Full Configuration Table

```swift
let GESTURE_CONFIGS: [RawGestureType: GestureIntensityConfig] = [
    .tap:          GestureIntensityConfig(.tap,          .move,   1.0, [.nominal: 1.0, .warm: 1.0, .throttling: 0.70, .critical: 0.40]),
    .double_tap:  GestureIntensityConfig(.double_tap,   .cast,   1.0, [.nominal: 1.0, .warm: 0.75, .throttling: 0.60, .critical: 0.0]),
    .drag:        GestureIntensityConfig(.drag,         .move,   1.0, [.nominal: 1.0, .warm: 0.90, .throttling: 0.75, .critical: 0.50]),
    .pinch:       GestureIntensityConfig(.pinch,        .grab,   1.0, [.nominal: 1.0, .warm: 0.90, .throttling: 0.80, .critical: 0.55]),
    .pinch_sartan:GestureIntensityConfig(.pinch_sartan, .grab,   1.0, [.nominal: 1.0, .warm: 0.85, .throttling: 0.70, .critical: 0.0]),
    .rotate:      GestureIntensityConfig(.rotate,       .rotate, 1.0, [.nominal: 1.0, .warm: 0.90, .throttling: 0.75, .critical: 0.50]),
    .flick:       GestureIntensityConfig(.flick,        .move,   1.0, [.nominal: 1.0, .warm: 0.85, .throttling: 0.65, .critical: 0.35]),
    .long_press:  GestureIntensityConfig(.long_press,   .charge, 1.0, [.nominal: 1.0, .warm: 0.95, .throttling: 0.80, .critical: 0.0]),
    .hold:        GestureIntensityConfig(.hold,         .charge, 1.0, [.nominal: 1.0, .warm: 0.90, .throttling: 0.75, .critical: 0.0]),
    .circle:      GestureIntensityConfig(.circle,       .cast,   1.0, [.nominal: 1.0, .warm: 0.85, .throttling: 0.60, .critical: 0.0]),
]
```

### Resolver Contract

```swift
protocol GestureActionResolver {
    func resolve(rawGesture: RawGestureType, thermalState: ThermalState) -> GestureAction?
    func intensity(for gesture: RawGestureType, thermalState: ThermalState) -> Float
}

final class VisionOSGestureResolver: GestureActionResolver {
    private let configs = GESTURE_CONFIGS
    private var currentTier: ThermalTier = .nominal

    func updateThermalState(_ state: ThermalState) {
        currentTier = mapToTier(state)
    }

    func resolve(rawGesture: RawGestureType, thermalState: ThermalState) -> GestureAction? {
        updateThermalState(thermalState)
        guard let config = configs[rawGesture] else { return nil }
        return config.action
    }

    func intensity(for gesture: RawGestureType, thermalState: ThermalState) -> Float {
        updateThermalState(thermalState)
        guard let config = configs[gesture],
              let multiplier = config.thermalMultipliers[currentTier] else { return 0.0 }
        return config.baseIntensity * multiplier
    }

    private func mapToTier(_ state: ThermalState) -> ThermalTier {
        switch state {
        case .nominal: return .nominal
        case .fair:   return .warm
        case .serious: return .throttling
        case .critical: return .critical
        @unknown default: return .nominal
        }
    }
}
```

### Usage

```swift
let resolver = VisionOSGestureResolver()

func handleGesture(_ gesture: RawGestureType, thermalState: ThermalState) {
    guard let action = resolver.resolve(rawGesture: gesture, thermalState: thermalState) else { return }
    let intensity = resolver.intensity(for: gesture, thermalState: thermalState)
    
    if intensity > 0 {
        HapticEngine.play(gesture: action, intensity: intensity)
    }
    // Dispatch to game action handler...
}
```

## Gaps & Future Work

- [ ] Real-world thermal profiling under sustained XR session loads
- [ ] Per-gesture latency budgets tied to thermal tier
- [ ] Accessibility overrides for reduced haptic feedback

## Smooth Tier Transitions

To prevent jarring intensity jumps during thermal state changes, interpolate over a **500ms** window:

```swift
func interpolatedIntensity(for gesture: RawGestureType, targetTier: ThermalTier) -> Float {
    let current = currentIntensity[gesture] ?? 1.0
    let target = configs[gesture]?.thermalMultipliers[targetTier] ?? 1.0
    
    // Smooth lerp over 500ms
    return lerp(current, target, t: min(1.0, elapsedMs / 500.0))
}
```

## Latency Budget by Tier

| Gesture Type | Nominal (ms) | Throttling (ms) | Critical (ms) |
| ------------ | ------------ | --------------- | --------------|
| tap          | 16           | 20              | 30            |
| double_tap   | 16           | 25              | —             |
| drag         | 16           | 33              | 50            |
| pinch        | 16           | 33              | 50            |
| rotate       | 16           | 33              | 50            |
