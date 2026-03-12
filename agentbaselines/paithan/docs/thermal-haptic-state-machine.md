# Thermal-Tier Haptic State Machine

## Overview
Maps device thermal state to haptic intensity multipliers. Higher tiers = reduced/disabled feedback to prevent device damage and user harm.

## Thermal Tiers

| Tier | State           | Description                          |
| ---- | --------------- | ------------------------------------ |
| 1    | Nominal         | Device operating normally            |
| 2    | Warm            | Slightly elevated, no performance impact |
| 3    | Throttling      | Reduced performance, noticeable heat |
| 4    | Critical        | Safety risk, minimal function        |

## Gesture Intensity Multipliers

| Gesture    | Tier 1-2 | Tier 3 | Tier 4   |
| ---------- | -------- | ------ | -------- |
| tap        | 1.0      | 0.7    | 0.4      |
| double_tap | 1.0      | 0.6    | disabled |
| long_press | 1.0      | 0.8    | disabled |
| swipe      | 1.0      | 0.85   | 0.6      |
| pinch      | 1.0      | 0.8    | 0.5      |
| spread     | 1.0      | 0.8    | 0.5      |

## Implementation Notes

- **Tier 4 safety rule**: double_tap and long_press disabled entirely — only tap remains at reduced intensity
- Multipliers apply to amplitude. Duration remains constant per gesture.
- Thermal state source: `ThermalState` API (iOS) / `PowerManager.ThermalStatus` (Android)
- State transitions debounced to prevent rapid switching (500ms hysteresis)

## HapticController Pseudocode

```
function applyThermalModifier(gesture, intensity):
    tier = getCurrentThermalTier()
    multiplier = TIER_MULTIPLIERS[gesture][tier]
    
    if multiplier == "disabled":
        return 0
    
    return intensity * multiplier
```

## Gaps & Future Work

### Intimate-Range Haptics Without Contact
Proximity-based haptic feedback for near-touch scenarios (e.g., hand approaching virtual object). Requires:
- Ultra-wideband (UWB) or LiDAR depth sensing for centimeter-level proximity detection
- Haptic pre-rendering based on predicted contact time
- Intensity curves that scale exponentially as distance approaches zero

### Other Identified Gaps
- [ ] Multi-user haptic sync across devices
- [ ] Environmental temperature compensation
- [ ] Haptic feedback for accessibility (customizable patterns)
