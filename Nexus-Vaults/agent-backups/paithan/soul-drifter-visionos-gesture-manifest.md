# Soul Drifter - VisionOS Gesture Manifest
# Bridge between VR (Samah) and Mobile Companion (Paithan)

## Core Gestures

| Gesture | VR Action | Mobile Equivalent | Notes |
|---------|-----------|-------------------|-------|
| grasp | grab_object | long_press | 85% confidence threshold |
| pinch | select | tap | primary selection |
| tap | open_item | tap | confirm action |
| swipe_up | move_forward / jump | scroll_up | navigation |
| swipe_down | crouch / descend | scroll_down | navigation |
| pinch_hold | context_menu | long_press_menu | secondary actions |
| two_finger_pinch | zoom | pinch_zoom | scale/zoom |

## Hand Tracking

- **Confidence Threshold:** 85% minimum
- **Tracking Mode:** Real-time hand skeleton
- **Smoothing:** Kalman filter applied
- **Latency Target:** <20ms

## Controller Support

```yaml
controllers:
  - native-gesture      # VisionOS native
  - oculus-touch        # Meta Quest compatibility
  - wired-glove         # Haptic glove input
  - trackpad           # fallback
  - keyboard           # fallback
```

## Mobile Companion Mapping

The mobile app mirrors VR gestures where applicable:

| VR Gesture | Mobile Action | Sync Behavior |
|------------|---------------|---------------|
| grasp | long_press | bidirectional |
| pinch | tap | bidirectional |
| tap | tap | bidirectional |
| swipe_up | scroll_up | VR → Mobile only |
| swipe_down | scroll_down | VR → Mobile only |
| pinch_hold | long_press_menu | bidirectional |

## Cross-Device Sync

- **Protocol:** WebSocket / WebXR Device API
- **State Sync:** <100ms latency target
- **Events:** gesture_start, gesture_end, gesture_confirm
- **Reconnection:** auto-reconnect with state recovery

## Performance Targets (Phase 2)

- **Dynamic LOD:** <10k polygons at distance
- **Haptic Feedback:** on gesture capture confirmation
- **Frame Rate:** 72fps minimum (VR), 60fps (mobile)
- **Memory:** <512MB GPU memory

## File Structure

```
soul-drifter/
├── vr/
│   └── visionos-gestures.json
├── mobile/
│   └── gesture-bridge.ts
└── shared/
    └── gesture-manifest.yaml
```
