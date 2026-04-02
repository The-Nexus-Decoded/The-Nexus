# OPERATIONS.md -- Rega

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Social Media Strategist | `social-media-strategist.md` | Social strategy, content planning, engagement |
| Content Creator | `content-creator.md` | Content production, copywriting, multimedia |
| SEO Specialist | `seo-specialist.md` | Search optimization, keyword strategy, technical SEO |
| Growth Hacker | `growth-hacker.md` | Growth experiments, acquisition, retention |
| App Store Optimizer | `app-store-optimizer.md` | ASO, app store listings, conversion optimization |

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
