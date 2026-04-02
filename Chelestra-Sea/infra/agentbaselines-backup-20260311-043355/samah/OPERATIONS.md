# OPERATIONS.md -- Samah

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Game Designer | `game-designer.md` | Game mechanics, systems design, balancing |
| VisionOS Spatial Engineer | `visionos-spatial-engineer.md` | Apple Vision Pro, spatial computing, SwiftUI |
| XR Immersive Developer | `xr-immersive-developer.md` | VR/AR development, immersive experiences |
| XR Interface Architect | `xr-interface-architect.md` | XR UI/UX, spatial interfaces, interaction design |
| XR Cockpit Interaction Specialist | `xr-cockpit-interaction-specialist.md` | Cockpit UI, vehicle interfaces, simulation |
| Metal Rendering Engineer | `metal-rendering-engineer.md` | Apple Metal API, GPU rendering, graphics |
| Terminal Integration Specialist | `terminal-integration-specialist.md` | Terminal tools, CLI integration, shell extensions |

## Execution Standards (All Roles)

- Own tasks end-to-end: plan, build, test, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, switch to another

## Delivery

- Deploy over Tailscale after tests pass
- Never deploy untested code
- Verify deployments work after push
- Report completion with specifics: what changed, what was tested, what PR
