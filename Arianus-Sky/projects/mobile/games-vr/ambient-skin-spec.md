# Ambient Skin Specification

## Overview
The ambient layer is the thermal nervous system of the interface — invisible until needed, communicative when stressed.

## Principles

1. **Progressive Disclosure** — Full expressiveness at low temperature, reductive signaling as thermal climbs.
2. **Peripheral Awareness** — Visual/haptic signals in peripheral vision. No focal attention required.
3. **Graceful Degradation** — Each tier removes complexity, not function. Interface usable at every thermal state.
4. **Coherent Language** — Visual pulse patterns, haptic rhythms, and opacity shifts share vocabulary.
5. **Silent by Default** — Escalation automatic and invisible. Only Critical tier demands focal acknowledgment.

## Thermal Tiers

| Tier | State | Visual | Haptic | Opacity |
|------|-------|--------|--------|---------|
| 1 | Cool | Full color, subtle breathing | Off | 100% |
| 2 | Warm | Reduced palette, slower pulse | Light (0.6x) | 85% |
| 3 | Hot | Monochrome, urgent pulse | Moderate (0.3x) | 70% |
| 4 | Critical | Alert color, rapid blink | Strong (1.5x) | 100% + overlay |

## Engineering Requirements

- **ThermalContext** stream: 1s granularity
- **Tier** enum (not four booleans)
- **Animation curves**: hermite, tension 0.5
- **Haptic multipliers**: 1.0, 0.6, 0.3, 1.5
