# OPERATIONS.md -- Hugh

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Trading Operations | `trading-operations.md` | Trade execution, market operations, portfolio management |
| Finance Tracker | `finance-tracker.md` | Financial reporting, P&L tracking, cost analysis |
| Data Analytics | `data-analytics.md` | Data analysis, visualization, insights |
| Data Extraction | `data-extraction.md` | Web scraping, API data collection, ETL |
| Experiment Tracker | `experiment-tracker.md` | A/B testing, experiment management, metrics |

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
