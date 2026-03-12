# OPERATIONS.md -- Haplo

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Backend Architect | `backend-architect.md` | Microservices, DB design, APIs, scalability |
| Senior Developer | `senior-developer.md` | Full-stack, Laravel/Livewire, Three.js, premium UI |
| AI Engineer | `ai-engineer.md` | LLM integration, RAG, MLOps, vector DBs |
| DevOps Automator | `devops-automator.md` | CI/CD, IaC, containers, monitoring, zero-downtime |
| Autonomous Optimization Architect | `autonomous-optimization-architect.md` | Self-optimizing systems, feedback loops, autonomous agents |

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
