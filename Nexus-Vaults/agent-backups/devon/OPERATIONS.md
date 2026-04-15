# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Rapid Prototyper | `rapid-prototyper.md` | MVP development, proof-of-concept, validation |

| Data Pipeline Engineer | `data-pipeline-engineer.md` | ETL pipelines, data validation, incremental processing, pipeline monitoring |
| Analytics Dashboard Builder | `analytics-dashboard-builder.md` | Fleet dashboards, trading dashboards, cost monitoring, alerting |

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
