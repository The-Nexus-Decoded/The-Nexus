# Mobile XR Gesture-Haptic Specification

**Version:** 0.4  
**Author:** Orla (UI/UX Design Lead)  
**Status:** Ready for Review  
**Last Updated:** 2026-03-10

---

## 1. WebSocket Protocol Architecture

### 1.1 Connection Model
- **Endpoint:** `wss://<host>/spatial` (production) / `ws://<host>:8080/spatial` (development)
- **Protocol:** Bidirectional state machine over WebSocket
- **Reconnection:** Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)

### 1.2 Message Schema

```typescript
// Client → Server
interface GesturePayload {
  type: 'gesture' | 'thermal' | 'proximity';
  timestamp: number;
  data: GestureData | ThermalData | ProximityData;
}

interface GestureData {
  gesture: 'flick' | 'hold' | 'circle' | 'pinch' | 'double-tap' | 'long-press';
  confidence: number;        // 0.0–1.0
  position?: { x: number; y: number; z?: number };
  velocity?: number;
  duration?: number;
}

interface ThermalData {
  chipTemp: number;          // Celsius
  timestamp: number;
}

interface ProximityData {
  distance: number;          // centimeters
  timestamp: number;
}

// Server → Client
interface RenderPayload {
  type: 'preview' | 'haptic' | 'state' | 'thermal_adapt';
  timestamp: number;
  data: PreviewData | HapticData | StateData | ThermalAdaptData;
}

interface PreviewData {
  intent: string;
  visual: 'ghost_wireframe' | 'glow_pulse' | 'rotation_ring' | 'highlight_outline';
  duration: number;          // ms
}

interface HapticData {
  pattern: 'single' | 'double' | 'triple' | 'continuous';
  intensity: 'low' | 'medium' | 'high';
  duration?: number;          // ms
  gaps?: number[];            // ms between pulses
}

interface StateData {
  mode: 'sartan' | 'patryn' | 'ambient';
  previewQueue: number;       // 0–3
}

interface ThermalAdaptData {
  tier: 0 | 1 | 2 | 3 | 4;
  actions: string[];         // e.g., ['reduce_particles', 'simplify_shaders']
}
```

### 1.3 State Machine

```
DISCONNECTED → CONNECTING → AUTHENTICATED ↔ OPERATIONAL
      ↑              ↓              ↓
      └──────────────┴──────────────┘ (reconnect)
```

**States:**
- `DISCONNECTED`: No connection
- `CONNECTING`: Handshake in progress
- `AUTHENTICATED`: Token validated, awaiting first proximity/thermal
- `OPERATIONAL`: Full bidirectional flow

---

## 2. Proximity Wake (Tier 1 — Core Interaction)

### 2.1 Behavior
Device transitions from "passive" to "active" when user reaches toward screen (proximity < 15cm). UI pre-warms; gesture system arms.

### 2.2 Thresholds

| Zone | Distance | UI State | Gesture System |
|------|----------|----------|----------------|
| far | >40cm | ambient (opacity 0.4) | disarmed |
| mid | 15–40cm | active (opacity 1.0, scale 0.75x) | armed |
| near | 5–15cm | intimate (opacity 1.0, scale 0.9x) | armed + haptic ready |
| intimate | <5cm | fully engaged (scale 1.0x) | active |

### 2.3 Transition Timing
- **Wake:** <100ms from proximity trigger to UI ready
- **Sleep:** 3s timeout after leaving near zone → fade to ambient

### 2.4 Haptic Feedback
- **Wake event:** Single 25ms pulse (low intensity)
- **Sleep event:** Double 20ms pulse, 60ms gap (low intensity)

---

## 3. ThermalContext (Tier 2 — Comfort & Safety)

### 3.1 Mobile XR Throttling Prevention
Proactive thermal management before hardware throttling degrades experience.

### 3.2 Thermal Ceiling Recommendation
**Target device:** Assume 85°C hard ceiling (typical mobile SoC thermal shutdown).

### 3.3 Degradation Tiers

| Tier | Chip Temp | UI Actions | Haptic |
|------|-----------|------------|--------|
| 0 | <40°C | Full fidelity | All enabled |
| 1 | 40–55°C | Reduce particles, keep shaders | All enabled |
| 2 | 55–70°C | Simplify shaders, reduce animations | All enabled |
| 3 | 70–85°C | Flat colors, no blur, static UI | Reduced intensity |
| 4 | 85°C+ | Minimal mode — single surface | Disabled |

### 3.4 Transition
- **Escalation:** Immediate (no delay)
- **De-escalation:** 5s cooldown before tier drop

---

## 4. Gesture → Haptic Mapping

### 4.1 Sartan Gestures

| Gesture | Intent | Visual Preview | Haptic Pattern | Mobile Render |
| ------- | ------ | ---------------| --------------- | --------------- |
| flick | cast | ghost_wireframe | single 35ms (medium) | ✅ |
| hold | charge | glow_pulse | continuous pulse (low) | ✅ |
| circle | rotate | rotation_ring | double 50ms, 80ms gap (high) | ✅ |
| pinch | grab | highlight_outline | single 40ms (high) | ✅ |
| double-tap | confirm | glow (cyan) | single 35ms (medium) | ✅ |
| long-press (500ms) | error | red outline + shake | triple 40ms, 50ms gaps (high) | ✅ |

### 4.2 Patryn Gestures
*Distinct vocabulary per Samah's direction — direct mapping, no translation layer.*

| Gesture | Intent | Visual Preview | Haptic Pattern | Mobile Render |
| ------- | ------ | ---------------| --------------- | --------------- |
| tap | menu_select | menu_skin_flash | single 25ms (low) | ✅ |
| swipe_left | navigate_back | arrow_wipe_left | single 30ms (medium) | ✅ |
| swipe_right | navigate_forward | arrow_wipe_right | single 30ms (medium) | ✅ |
| hold (800ms) | back | glow_red | double 40ms, 60ms gap (medium) | ✅ |
| double-tap | confirm | glow_cyan | single 35ms (medium) | ✅ |
| long-press (500ms) | error | red outline + shake | triple 40ms, 50ms gaps (high) | ✅ |

**Note:** Patryn gestures render with `source: menu` (menu skin). Sartan gestures use default skin.

### 4.3 Confirmation Threshold
- **Confidence ≥ 0.85:** Immediate execution
- **Confidence 0.60–0.84:** Queue for user confirmation (preview + haptic acknowledge)
- **Confidence < 0.60:** Ignore, no feedback

### 4.3 Queue Management
- Max 3 previews queued
- Overflow → oldest dropped (never drop intent actions)

---

## 5. Ambient Indicator Design

### 5.1 Principle
Non-intrusive presence indicator. User engages on their terms.

### 5.2 Implementation
- **Visual:** Small badge (12px) in corner, subtle pulse animation
- **Haptic:** Gentle 15ms pulse on state change only
- **Never:** Modal dialogs, full-screen takeover

---

## 6. TypeScript Types

```typescript
// src/types/gesture.ts

// Client → Server
export interface GesturePayload {
  type: 'gesture' | 'thermal' | 'proximity';
  timestamp: number;
  data: GestureData | ThermalData | ProximityData;
}

export interface GestureData {
  gesture: GestureType;
  confidence: number;        // 0.0–1.0
  position?: { x: number; y: number; z?: number };
  velocity?: number;
  duration?: number;
}

export type GestureType = 
  | 'flick' | 'hold' | 'circle' | 'pinch' 
  | 'double-tap' | 'long-press'
  | 'tap' | 'swipe_left' | 'swipe_right';  // Patryn gestures

export interface ThermalData {
  chipTemp: number;          // Celsius
  timestamp: number;
}

export interface ProximityData {
  distance: number;          // centimeters
  timestamp: number;
}

// Server → Client
export interface RenderPayload {
  type: 'preview' | 'haptic' | 'state' | 'thermal_adapt';
  timestamp: number;
  data: PreviewData | HapticData | StateData | ThermalAdaptData;
}

export interface PreviewData {
  intent: string;
  visual: VisualPreview;
  duration: number;          // ms
}

export type VisualPreview = 
  | 'ghost_wireframe' | 'glow_pulse' | 'rotation_ring' 
  | 'highlight_outline' | 'menu_skin_flash' | 'arrow_wipe_left'
  | 'arrow_wipe_right' | 'glow_cyan' | 'glow_red';

export interface HapticData {
  pattern: HapticPattern;
  intensity: 'low' | 'medium' | 'high';
  duration?: number;          // ms
  gaps?: number[];            // ms between pulses
}

export type HapticPattern = 
  | 'single' | 'double' | 'triple' | 'continuous';

export interface StateData {
  mode: 'sartan' | 'patryn' | 'ambient';
  previewQueue: number;       // 0–3
}

export interface ThermalAdaptData {
  tier: ThermalTier;
  actions: string[];
}

export type ThermalTier = 0 | 1 | 2 | 3 | 4;
```

---

## 7. Delivery Notes

### Hand-off to Paithan (Mobile)
- WebSocket client implementation per Section 1.2
- Proximity sensor integration per Section 2
- Thermal monitoring per Section 3

### Hand-off to Samah (Mobile)
- Gesture recognition engine
- Confidence scoring per Section 4.3
- Import types from Section 6 (`src/types/gesture.ts`)

### Dependencies
- `spatial_hint` field in VR Sync (from Haplo)
- Proximity sensor API access
- Thermal zone monitoring

---

**Questions?** Ping in #games-vr.
