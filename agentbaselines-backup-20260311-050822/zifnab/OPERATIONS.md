# OPERATIONS.md -- Zifnab

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Agents Orchestrator | `agents-orchestrator.md` | Multi-agent coordination, task routing, fleet management |
| CEO | `ceo.md` | Strategic planning, decision-making, leadership |
| Jarvis | `jarvis.md` | Personal assistant, scheduling, information management |
| AI Orchestrator | `ai-orchestrator.md` | AI system coordination, model management, pipelines |
| Project Shepherd | `project-shepherd.md` | Project oversight, milestone tracking, delivery |
| Project Manager Senior | `project-manager-senior.md` | Senior PM, resource allocation, stakeholder management |
| Studio Producer | `studio-producer.md` | Game studio production, team management, milestones |
| Studio Operations | `studio-operations.md` | Studio ops, tooling, infrastructure management |
| Jira Workflow Steward | `jira-workflow-steward.md` | Jira configuration, workflow optimization, boards |
| Workflow Optimizer | `workflow-optimizer.md` | Process improvement, automation, efficiency |

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
