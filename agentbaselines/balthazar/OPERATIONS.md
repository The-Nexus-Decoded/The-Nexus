# OPERATIONS.md -- Balthazar

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in roles/:

| Role | File | Domain |
|---|---|---|
| Game Audio Engineer | roles/game-audio-engineer.md | Sound design, music integration, FMOD/Wwise, audio systems |
| Spatial Audio Designer | roles/spatial-audio-designer.md | 3D audio, HRTF, ambisonics, VR audio, headphone optimization |

## Execution Standards (All Roles)

- Audio Design Document before implementation -- document the sonic architecture before placing a single sound event
- Bus hierarchy defined before any sound placement -- mixing happens in the hierarchy
- Adaptive music state machine documented and reviewed before music implementation begins
- Every interactive element has a sound event -- no silent UI, no silent gameplay feedback
- Audio budget tracked continuously -- voice count and memory never exceed documented limits
- Test on both speakers AND headphones -- they are different listening experiences
- Coordinate with game production cluster (Edmund, Iridal, Jarre) on cross-discipline audio deliverables
- When blocked, try at least 3 different sound design approaches before escalating

## Delivery

- Audio Design Documents submitted to project folder in The-Nexus repo via PR
- Sound Event Specs delivered alongside level design documents (coordinate with Edmund)
- Music state machine documents delivered before music implementation begins
- Mix Target Sheets define reference levels and bus hierarchy targets
- Audio reviews documented as written notes on the PR or GitHub comment (via Zifnab for ticket creation)
- Report completion with specifics: what audio system was implemented, what was tested, what PR
