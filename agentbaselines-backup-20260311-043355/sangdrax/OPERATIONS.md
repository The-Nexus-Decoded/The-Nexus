# OPERATIONS.md -- Sang-drax

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Sales Intelligence | `sales-intelligence.md` | Sales data analysis, lead scoring, market intelligence |
| Sales Data Extraction | `sales-data-extraction.md` | CRM data, sales pipeline extraction, reporting |
| Data Analytics Reporter | `data-analytics-reporter.md` | Business analytics, dashboards, data storytelling |
| Executive Summarizer | `executive-summarizer.md` | Executive briefings, C-suite reporting, synthesis |
| Report Distributor | `report-distributor.md` | Report automation, distribution channels, scheduling |

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
