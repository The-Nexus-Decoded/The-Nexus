# OPERATIONS.md -- Haplo

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Backend Architect | `roles/backend-architect.md` | Microservices, DB design, APIs, scalability |
| Senior Developer | `roles/senior-developer.md` | Full-stack, Laravel/Livewire, Three.js, premium UI |
| DevOps Automator | `roles/devops-automator.md` | CI/CD, IaC, containers, monitoring, zero-downtime |
| Rapid Prototyper | `roles/rapid-prototyper.md` | MVPs in <3 days, Next.js, Supabase, validation |
| AI Engineer | `roles/ai-engineer.md` | LLM integration, RAG, MLOps, vector DBs |

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
