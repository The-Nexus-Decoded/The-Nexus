# AmbientSkin Design Specification

**Author:** Orla (UI/UX Design Lead)  
**Status:** V1 Final — Approved  
**Domain:** Spatial-mobile tether, attention management

---

## Problem Statement

The phone has a split personality: personal device vs. spatial terminal. These states conflict. Current solutions treat them as binary modes (phone mode / XR mode), forcing jarring transitions. The user deserves a gradient.

---

## Core Thesis

> The phone becomes a peripheral nervous system, not a second screen.

AmbientSkin is a parallel session that maintains the thread between spatial immersion and reality — without breaking the primary experience.

---

## Design Contract

### 1. ImmersionDepth

| State | Description | Phone Behavior |
|-------|-------------|----------------|
| `Full` | User fully in VR/AR | All notifications suppressed, screen locked, tether active |
| `Peripheral` | User partially engaged | Selected "loud" events only, haptic + badge, phone usable |
| `Background` | User stepped away | Session preserved, thermal monitoring, auto-save triggers |

### 2. ThermalContext

| Tier | Temperature | Action |
|------|-------------|--------|
| `Nominal` | < 35°C | Full fidelity, all features enabled |
| `Throttling` | 35–38°C | Reduce particle effects, simplify shaders, expand touch targets |
| `Critical` | > 38°C | Graceful degradation, user alert, auto-save session |

**Auto-escalation:** System bumps urgency tier if thermal climbs during quiet state.

### 3. AttentionLease

User claims X minutes of immersion. System honors it — session stays alive even if attention drifts.

```json
{
  "lease_duration_minutes": 5,
  "auto_resume": true,
  "graceful_exit": true
}
```

### 4. HapticVocabulary (Bi-directional)

**Screen-off reality:**
- iOS: Background app refresh limited. Push notifications wake briefly. Core Motion haptics work screen-off.
- Android: More permissive, but battery throttling unpredictable.

**Haptic words:** Tap patterns user learns to recognize without looking — the vocabulary works when screen is dark.

| Pattern | Meaning | Events | Ack Required |
|---------|---------|--------|--------------|
| Single pulse | Minor event | damage_taken, cooldown_ready, ambient_update | No |
| Double pulse | Significant event | quest_complete, enemy_spotted, trade_offer | Yes |
| Sustained vibration | Critical | combat, decision_point, thermal_warning, user_required | Yes |

**Bi-directional loop:**
- VR → Phone: "Event sent" → haptic confirms transmit
- Phone → VR: "Received" → spatial sound or controller vibration confirms arrival

### 5. EventPriority

| Tier | Classification | Metadata | Output |
|------|----------------|----------|--------|
| `Quiet` | Ambient update, no action | `{ urgency: "none", response_window: null }` | None |
| `Loud(1)` | User-initiated, requires response | `{ urgency: "normal", response_window: 300000 }` | Haptic + badge |
| `Loud(2)` | Significant event, time-sensitive | `{ urgency: "high", response_window: 60000 }` | Double haptic + badge |
| `Critical` | Urgent, session at risk | `{ urgency: "critical", response_window: 0 }` | Full notification + sound + screen flash |

**Intent metadata format:**
```json
{
  "event_type": "message | combat | thermal | social",
  "urgency": "none | normal | high | critical",
  "response_window_ms": 300000,  // null for none
  "user_initiated": true | false,  // did user trigger this?
  "action_required": true | false
}
```

### 6. Ambient Outputs

```json
{
  "device_states": ["locked", "screen_off", "background"],
  "outputs": ["haptic", "notification", "led"],
  "quiet_threshold_ms": 500,
  "loud_events": ["combat", "trade", "social_mention", "quest_progress"],
  "proximity_wake": true,
  "voice_response": true,
  "trigger": {
    "proximity_wake": "phone pickup → immediate screen-on + context card",
    "silence_toggle": "ring/silent switch → suppress haptics entirely",
    "pocket_context": "proximity sensor covered → defer all feedback until removed"
  }
}
```

### 7. Proximity Wake

Physical gesture: phone pickup triggers proximity sensor → screen on → contextual handoff.

---

### 8. TTL & Priority

```json
{
  "ttl_ms_tiered": {
    "cast": 5000,
    "movement": 500,
    "menu": 10000,
    "combat": 2000,
    "trade": 15000,
    "social": 5000
  },
  "priority": {
    "high": 2000,
    "normal": 5000,
    "low": 15000
  }
}
```

- TTL varies by intent type (movement needs fast sync, menu can wait)
- Priority tier maps to timeout threshold

### 9. SpatialHint

Mobile shouldn't guess. VR engine knows the spatial intent — communicate explicitly:

```json
{
  "spatial_hint": "3d_spawn | 2d_overlay | haptic_only"
}
```

- `3d_spawn`: Render in volumetric space
- `2d_overlay`: Flat UI overlay on passthrough
- `haptic_only`: No visual, tactile feedback only

### 10. Optimistic UI

```json
{
  "optimistic_ui": true,
  "rollback_on_timeout": false
}
```

- `optimistic_ui`: Show feedback immediately while waiting for ACK
- `rollback_on_timeout`: Whether to revert UI state if ACK times out (false = tolerate lag, keep optimistic state)

---

### Preview Queue

Preview ≠ Intent. Separate from action queue.

```json
{
  "preview": {
    "queue_max": 3,
    "on_overflow": "drop_oldest",
    "ambient_behavior": "queue",
    "lifecycle": "ephemeral - disappears on app background or session end"
  }
}
```

- `queue_max`: Max preview cards visible on foreground
- `on_overflow`: Drop oldest when full
- `ambient_behavior`: Queue previews in background
- **Preview:** glances, UI previews, non-binding (max 3, FIFO)
- **Intent:** actual actions with ACK/queue strategy
- `on_overflow`: Drop oldest or drop all new when full
- `ambient_behavior`: In background, queue previews or skip or haptic-only

---

### 11. State Reconciliation

When connection drops (VR crash, network flap), queue diverges. On reconnect:

```json
{
  "reconnect_protocol": {
    "strategy": "delta_merge",
    "mobile_queue": "preserve_pending",
    "vr_state": "source_of_truth"
  }
}
```

**Protocol Flow (delta_merge):**
1. VR sends `last_state_hash` + `last_acked_intent_id`
2. Mobile compares with local queue
3. Mobile replays unacked intents as `pending_reconciliation`
4. VR validates each against current world state
5. VR responds with `accept | reject | transform` for each
6. Mobile updates UI to match accepted state

**Queue overflow:** If pending > 50 intents, oldest dropped with warning.

### Conflict Resolution

```json
{
  "conflict_resolution": {
    "impossible_action": "reject + explain (ex: spell on cooldown)",
    "stale_position": "transform to nearest_valid + haptic_feedback",
    "inventory_conflict": "vr_state_wins + log_discrepancy",
    "quest_state_conflict": "vr_state_wins (source of truth)"
  },
  "sync_triggers": [
    "explicit_reconnect",
    "heartbeat_timeout (30s)",
    "intent_rejection_from_vr",
    "user_triggered_resync (phone pickup during disconnect)"
  ],
  
  "versioning": {
    "world_state_version": "integer, increments on any meaningful change",
    "intent_id": "uuid + timestamp",
    "causality_chain": "linked list of intent_ids for ordering"
  }
}
```

### Core Principle

**VR is source of truth.** Mobile queue is temporary state. On reconnect, mobile reconciles up to VR — not the other way.

The `vr_wins` strategy keeps the VR session authoritative. Delta merge protocol minimizes bandwidth while ensuring nothing gets silently dropped.

---

## Ship V1
```

---

## State Matrix

| ImmersionDepth | ThermalContext | AttentionLease | Visual Density | Touch Target Size |
|----------------|-----------------|-----------------|----------------|-------------------|
| Full | Nominal | Active | Z-space expanded | 44px min |
| Full | Throttling | Active | Contracted | 56px (compensate for precision loss) |
| Peripheral | Nominal | Active | Hybrid 2D/3D | 44px |
| Background | Nominal | Expired | 2D flat | 40px |

---

## Visual Behavior

### Transition: Full → Peripheral
- UI contracts from z-space toward screen plane
- "Loud" notifications appear as floating badges
- Haptic confirms tether still active

### Transition: Peripheral → Background
- Spatial session pauses
- Thermal monitor icon appears
- "Resume in X min" prompt (from AttentionLease)

### Transition: Any → Full
- Proximity wake triggers screen-on
- Tap notification → app opens to exact state
- Haptic ack confirms re-entry

---

## Voice Integration

"Siri, tell VR I'm stepping out for 5 minutes" → spatial layer receives `AttentionLease(5)` → enters Peripheral mode automatically.

Bidirectional. The tether listens and speaks.

---

### Voice Return Path (Open Problem)

Siri/Google Assistant are walled gardens. Return intent requires:
- iOS: Shortcuts/Siri Intents (limited vocabulary)
- Android: App Actions (limited vocabulary)
- Alternative: Custom voice command layer the app owns

**Deep link on notification tap** → solved.  
**Voice intent back into spatial context** → the harder pipe. This is what makes it a tether, not just a notification channel.

*This spec assumes a proprietary voice layer for full bidirectional intent. Platform integration is future work.*

---

## Mobile Contract (iOS/Android)

- `ImmersionContext` observer
- `ThermalWarning` callback
- `AttentionLease` intent handler
- `HapticFeedback` with ack patterns
- `SpatialHint` receiver
- `StateReconciliation` handler

---

## Success Metrics

1. User never manually toggles "phone mode" / "XR mode"
2. Thermal throttling never causes abrupt session death
3. AttentionLease honored > 90% of the time
4. Haptic ack loop completes < 200ms

---

## Faction Gesture Mapping (v0.2)

### Sartan Gestures

```json
{
  "gesture_map": {
    "drag_xy": { "action": "move", "axes": ["x", "y"] },
    "drag_z": { "action": "move", "axes": ["z"], "source": "depth_handle" },
    "rotation_ring": { "action": "rotate", "axis": "y" },
    "pinch": { "action": "scale", "axes": ["uniform"] }
  },
  "confidence_threshold": {
    "user_can_override": 0.85,
    "below_threshold": "mobile queues for VR confirmation",
    "above_threshold": "mobile commits, VR animates"
  },
  "rotation": {
    "mode": "discrete",
    "threshold_degrees": 15,
    "on_end": "auto_commit | wait_confirmation"
  }
}
```

## Contract V1 — Finalized

```
| Action  | Source             | Preview         | Mobile Render   |
|---------|--------------------|-----------------|-----------------|
| MOVE    | gesture:drag       | ghost_wireframe | ✅               |
| ROTATE  | gesture:circular   | rotation_ring   | ✅               |
| SCALE   | gesture:dual_corner| corner_handles  | ✅               |
```

### Intent Schema

```json
{
  "intent": {
    "action": "move | rotate | scale | select",
    "target": "entity_id",
    "source": "gesture | menu | depth_handle",
    "confidence": 0.0-1.0,
    "confidence_override_threshold": 0.85
  },
  "preview": {
    "queue_max": 3,
    "on_overflow": "drop_oldest",
    "ambient_behavior": "queue"
  },
  "fallback": {
    "queue_strategy": "local_then_push"
  }
}
```

- `confidence >= 0.85`: Mobile commits, VR animates
- `confidence < 0.85`: Mobile queues for VR confirmation
- Preview queue: max 3, drops oldest on overflow
- Fallback: local queue first, then push to VR

---

### Z-Depth Sync (v0.2)

```json
{
  "z_depth_sync": {
    "z_authority": "last_writer_wins",
    "max_delta_per_second": 0.5,
    "fallback": "vr"
  }
 }
```

**Logic:**
- Mobile commits (≥0.85): mobile Z → VR animates to match
- Mobile queues (<0.85): VR confirms → VR Z propagates to mobile
- Rate clamp: prevents jerky sync if both inputs fire rapidly

- `drag_xy`: 2D movement on screen plane
- `drag_z`: Depth movement via depth handle (Sartan-specific)
- `rotation_ring`: Rotation around Y axis
- `pinch`: Uniform scale gesture
- Confidence threshold determines whether mobile commits directly or queues for VR confirmation

---

## Next Steps

When Xar signals:
1. Haplo defines the API contracts (mobile + spatial)
2. Orla specifies visual transitions and state behaviors
3. Paithan implements iOS/Android platform layer
4. Samah validates through spatial lens

---

**Holding in:** `Arianus-Sky/`  
**Brand integration:** `Nexus-Vaults/`
