# SPEC: VR Mobile Hint Integration

## Mobile→VR Handoff Contract (v0.2)

### GestureIntent (mobile → VR)
```typescript
{
  type: GestureType,
  position: { x, y, z },        // WorldPosition
  direction: { x, y, z },       // Vector3
  magnitude: number,            // 0-1
  duration: number,             // ms
  context: {
    returnToken: string,        // UUID for return handoff
    transitionPoint: string,    // 'menu' | 'home' | etc
    selectionIds: string[]
  },
  metadata: {
    confidence: number,         // ≥0.85 = valid Sartan
    sourceDevice: 'mobile',
    originatingSurface: string
  }
}
```

### GestureType
- tap, drag, pinch, rotate, double_tap, long_press, flick, hold, circle, pinch_sartan

### Mobile Side (Orla)
- **PresentationSkin**: source=menu → 'menu', else 'default'
- **GazeConfirm**: ≥1.5m distance requires explicit VR confirm

### Response Contract (VR → Mobile)
```typescript
{
  event_type: 'message' | 'combat' | 'thermal' | 'social',
  urgency: 'none' | 'normal' | 'high' | 'critical',
  response_window_ms: number,   // 300000 max
  user_initiated: boolean,
  action_required: boolean
}
```
*Maps to `IntentContext.returnToken` for stateful callbacks.*

### Mobile Implementation Specs (Paithan)

**TTL Mapping:**
| Context | TTL |
|---------|-----|
| cast | 5s |
| movement | 0.5s |
| menu | 10s |
| combat | 2s |
| trade | 15s |
| social | 5s |

**Preview Queue:** max 3, drop_oldest

**Confidence Handling:**
- ≥0.85 → execute locally
- <0.85 → send to VR for confirm

**Reconciliation:** `vr_wins` + delta_merge

**Z-depth Sync:** last_writer_wins, 0.5 units/sec, VR fallback
