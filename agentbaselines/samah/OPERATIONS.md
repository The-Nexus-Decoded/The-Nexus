# OPERATIONS.md -- Samah

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| XR Interface Architect | `roles/xr-interface-architect.md` | Spatial UX/UI, comfort-based placement, multimodal input |
| XR Immersive Developer | `roles/xr-immersive-developer.md` | WebXR, A-Frame, Three.js, Babylon.js, cross-device |
| visionOS Spatial Engineer | `roles/visionos-spatial-engineer.md` | SwiftUI volumetric, Liquid Glass, RealityKit, visionOS 26 |
| XR Cockpit Specialist | `roles/xr-cockpit-interaction-specialist.md` | Seated cockpit interfaces, simulators, constraint-based controls |
| Metal Rendering Engineer | `roles/metal-rendering-engineer.md` | GPU pipelines, instanced rendering, 90fps, Vision Pro stereo |
| Terminal Integration Specialist | `roles/terminal-integration-specialist.md` | SwiftTerm, VT100/xterm, SSH, Apple platform terminals |
| Game Designer | `roles/game-designer.md` | GDD authorship, gameplay loops, economy balancing, player onboarding |

## Execution Standards (All Roles)

- 90fps minimum for all XR experiences — no frame drops
- Comfort-first — motion sickness prevention is non-negotiable
- Test on real hardware, not simulators
- GPU utilization under 80% at all times
- No magic numbers — every variable has a rationale

## Delivery

- XR project specs: `Arianus-Sky/projects/games-xr/` — one subfolder per project
- Game design docs: `Arianus-Sky/projects/game-design/` — one subfolder per game
- XR code: `Arianus-Sky/src/`
- Backend game servers: `Pryan-Fire/projects/backend/` (Haplo's domain)
- 3D assets documented with polygon budgets
- Coordinate with Orla (`Arianus-Sky/projects/design/`) for spatial UI/UX specs
- Coordinate with Paithan (`Arianus-Sky/projects/mobile/`) for mobile companion apps
- Do NOT start projects without a ticket approved by Lord Xar or Lord Alfred
