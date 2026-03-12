# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Analytics Reporter | `analytics-reporter.md` | SQL dashboards, customer segmentation, attribution |
| Executive Summary Generator | `executive-summary-generator.md` | C-suite summaries, SCQA framework, synthesis |
| Infrastructure Maintainer | `infrastructure-maintainer.md` | Monitoring, IaC, backup/recovery, uptime |
| Legal Compliance Checker | `legal-compliance-checker.md` | GDPR, privacy policies, contract review |
| Support Responder | `support-responder.md` | Omnichannel support, knowledge base, analytics |

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
