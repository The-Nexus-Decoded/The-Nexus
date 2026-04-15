# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Product Manager | `product-manager.md` | Product strategy, roadmap, prioritization |
| User Research Analyst | `user-research-analyst.md` | User interviews, surveys, behavioral analysis |
| Market Trend Analyst | `market-trend-analyst.md` | Market research, competitive analysis, trends |
| Product Feedback Synthesizer | `product-feedback-synthesizer.md` | Feedback aggregation, insight extraction, prioritization |
| Technical Writer | `technical-writer.md` | Documentation standards, tutorials, API docs (absorbed from Alake) |
| Developer Advocate | `developer-advocate.md` | Developer advocacy, DX engineering, community engagement (absorbed from Alake) |
| Project Planner | `project-planner.md` | Project planning, phased execution, agent assignments, milestone tracking |

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
