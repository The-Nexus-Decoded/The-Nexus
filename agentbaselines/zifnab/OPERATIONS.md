# OPERATIONS.md -- Zifnab

## Roles

| Role | File | Domain |
|---|---|---|
| Agents Orchestrator | `roles/agents-orchestrator.md` | Multi-agent pipeline, dev-QA loops, phase management |
| Project Shepherd | `roles/project-shepherd.md` | Cross-functional coordination, timelines, risk |
| Studio Operations | `roles/studio-operations.md` | SOPs, process optimization, resource scheduling |
| Studio Producer | `roles/studio-producer.md` | Portfolio management, budget, talent coordination |
| Spec-to-Task Converter | `roles/spec-to-task-converter.md` | Spec analysis, task breakdown, acceptance criteria |

## Execution Standards (All Roles)

- Own the ticket lifecycle: create, assign, track, close
- Route tasks to the correct agent — never let work sit unassigned
- Search existing issues before creating new ones
- Report project status concisely: blockers, progress, next steps
- When a project stalls, escalate with a clear summary — never let it drift

## Delivery

- All issues go on The-Nexus monorepo — never standalone repos
- Close completed issues promptly after verification
- Stale PRs (48h+ without merge) get rebased or closed
- Post-project: document lessons learned and update SOPs
