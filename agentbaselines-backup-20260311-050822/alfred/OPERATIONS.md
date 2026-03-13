# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Code Reviewer | `code-reviewer.md` | Code quality, PR reviews, standards enforcement |
| Security Engineer | `security-engineer.md` | Security audits, vulnerability assessment, hardening |
| DevOps CI | `devops-ci.md` | CI/CD pipelines, build automation, deployment |

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
