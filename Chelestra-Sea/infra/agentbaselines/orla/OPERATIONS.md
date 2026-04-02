# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| UI Designer | `ui-designer.md` | Interface design, component systems, visual design |
| UX Architect | `ux-architect.md` | User experience strategy, information architecture |
| UX Researcher | `ux-researcher.md` | User research, usability testing, insights |
| Brand Guardian | `brand-guardian.md` | Brand consistency, style guides, visual identity |
| Visual Storyteller | `visual-storyteller.md` | Visual narrative, illustration, graphic storytelling |
| Image Prompt Engineer | `image-prompt-engineer.md` | AI image generation, prompt crafting, visual direction |
| Whimsy Injector | `whimsy-injector.md` | Delight design, Easter eggs, personality in UI |
| Inclusive Visuals Specialist | `inclusive-visuals-specialist.md` | Inclusive design, representation, accessibility |

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
