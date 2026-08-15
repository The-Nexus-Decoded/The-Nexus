# SoulDrifter Lighting Profile Contract

Last updated: 2026-08-09

SoulDrifter uses real-time Three.js lighting and shadows. The current renderer includes ACES tone mapping, exponential fog, hemisphere and ambient fill, a shadow-casting directional key, a directional rim, room and prop point lights, and meshes configured to cast and receive shadows.

The active profile is loaded from `public/config/lighting-tuning.json`. A backend or future admin screen can serve the same versioned JSON through `VITE_LIGHTING_TUNING_URL` without scattering new constants through room code.

## Editable fields

- `exposure` and `paperDollExposure`
- `fogDensity`
- `shadowQuality`: `off`, `basic`, `pcf`, or `pcf-soft`
- `shadowMapSize`: `256`, `512`, `1024`, or `2048`
- `hemisphereIntensity`, `ambientIntensity`, `keyIntensity`, and `rimIntensity`
- `localLightMultiplier` for all point lights
- `roomOverrides.<roomId>.localLightMultiplier`

Every value is normalized and clamped by `src/game/lightingTuning.ts`. Unknown schema versions fall back to the built-in cinematic profile instead of breaking the renderer.

## Current visual direction

The POC profile lowers broad ambient/fill light, strengthens the warm key and cool rim, enables soft PCF shadows, and reduces the combined local-light wash. This preserves readable characters while making walls, props, pillars, and floor contact shadows visible.

The next admin implementation should edit a draft profile, preview it in a protected QA room, then publish a new `revision`. Production should never accept arbitrary light counts or unbounded shadow sizes from an admin form.
