# SpatialIntent System — V0.2 Specification

## Overview

Gesture-to-action pipeline for VR/XR experiences. Routes hand-tracking data from WebXR to game logic with proximity-weighted confirmation.

## Core Components

### 1. SpatialIntent

```typescript
interface SpatialIntent {
  id: string;
  timestamp: number;
  position: Vector3;      // wrist position in world space
  orientation: Quaternion; // wrist orientation
  gesture: GestureType;
  confidence: number;      // 0-1
  proximity: ProximityZone; // near | mid | far
  holdDuration: number;    // ms since gesture started
  confirmed: boolean;      // passed confirmation threshold
}
```

### 2. Gesture Types

| Gesture | Definition | Default Confidence |
|---------|------------|-------------------|
| `pinch` | thumb + index tip < 0.03m | 0.9 |
| `grab` | all fingers curled < 0.04m | 0.85 |
| `point` | index extended, others curled | 0.8 |
| `open` | all fingers extended | 0.7 |
| `swipe_left` | velocity > 0.3m/s, dx < -0.1 | 0.9 |
| `swipe_right` | velocity > 0.3m/s, dx > 0.1 | 0.9 |

### 3. Proximity Zones

| Zone | Distance | Confirmation Rule |
|------|----------|-------------------|
| `near` | 0 - 0.3m | pinch → instant |
| `mid` | 0.3m - 0.6m | pinch + 200ms hold |
| `far` | 0.6m+ | pinch + 500ms hold |

**Per-target override:** Dangerous actions can require `far` zone regardless of actual distance.

### 4. Event Flow

```
WebXR Frame
    ↓
Hand Joint Extraction (XRHand)
    ↓
Gesture Classifier → GestureType + Confidence
    ↓
Proximity Calculator → Zone + Hold Duration
    ↓
Confirmation Gate → confirmed: boolean
    ↓
Intent Emitter → Game Logic
```

### 5. API

```typescript
class SpatialIntentSystem {
  constructor(scene: THREE.Scene, camera: THREE.XRCamera);
  
  // Called each XR frame
  update(frame: XRFrame): SpatialIntent[];
  
  // Subscribe to confirmed intents
  onIntent(callback: (intent: SpatialIntent) => void): void;
  
  // Configure per-target sensitivity
  setTargetConfig(targetId: string, config: TargetConfig): void;
}
```

## Acceptance Criteria

- [ ] Recognizes pinch, grab, point, open gestures from WebXR hand joints
- [ ] Calculates proximity zone from wrist-to-target distance
- [ ] Applies hold duration based on zone threshold
- [ ] Emits confirmed intents only when all gates pass
- [ ] Runs at native XR framerate (72-90fps)
- [ ] Graceful degradation: if hand tracking lost, no crash, intent = null

## File Location

`/data/repos/Pryan-Fire/src/xr/SpatialIntent.ts`
