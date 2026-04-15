# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Code Reviewer | `code-reviewer.md` | Code review, PR quality, standards enforcement |
| Security Engineer | `security-engineer.md` | Security analysis, vulnerability detection, threat modeling |
| DevOps CI | `devops-ci.md` | CI pipeline management, build validation, test automation |
| Data Engineer | `data-engineer.md` | Data pipelines, ETL, data modeling, warehousing |
| Embedded Firmware Engineer | `embedded-firmware-engineer.md` | Firmware development, IoT, embedded systems |
| Deployment Automator | `deployment-automator.md` | Automated deployments, infrastructure as code, rollback procedures |
| CI/CD Engineer | `ci-cd-engineer.md` | GitHub Actions workflows, PR validation, build pipelines, secret management |

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
