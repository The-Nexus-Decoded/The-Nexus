# Spatial Hints Web Renderer

**Domain:** VR/XR Spatial Experiences  
**Module:** `Arianus-Sky/src/spatial-hints-web`  
**Consumer:** Mobile XR Bridge (`xr-mobile-bridge`)  
**Status:** Draft  

---

## Purpose

Web-based renderer that displays spatial hint overlays for VR experiences. Consumed by the mobile XR bridge layer to provide contextual guidance in spatial environments.

## Architecture

- **Renderer:** Web component-based rendering
- **Communication:** Event-driven via XR Mobile Bridge
- **Target:** Embedded WebView in mobile XR companion app

## Interface

```typescript
interface SpatialHint {
  id: string;
  position: { x: number; y: number; z: number };
  content: string;
  triggerDistance: number;
  fadeDistance: number;
}
```

## Dependencies

- `@arianus-sky/xr-mobile-bridge` — Mobile XR communication layer

---

*Created for soul-drifter VR experience*
