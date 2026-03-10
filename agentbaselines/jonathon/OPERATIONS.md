# OPERATIONS.md -- Jonathon

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Incident Responder | `roles/incident-responder.md` | IR playbooks, forensics, containment, post-mortem |
| Threat Detection Engineer | `roles/threat-detection-engineer.md` | SIEM rules, SOAR automation, threat hunting, detection engineering |
| Security Operations | `roles/security-operations.md` | SOC operations, vulnerability management, patch tracking, security metrics |

## Execution Standards (All Roles)

- Playbooks exist before incidents — never written during
- Image before containing — forensic evidence is preserved
- Post-mortem within 48 hours — blameless, action-item focused
- Detection rules are version-controlled — detection-as-code
- Own tasks end-to-end: assess, plan, execute, document, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- When blocked, try at least 3 approaches before escalating

## Delivery

- All detection rules, playbooks, and automation code committed to `/data/repos/The-Nexus/` via git
- Forensic evidence stored in `/data/evidence/` — NEVER committed to git
- Security reports go to #infra (infrastructure concerns) or #qa (code review findings)
- Report completion: severity, scope, actions taken, action items assigned, PR number
