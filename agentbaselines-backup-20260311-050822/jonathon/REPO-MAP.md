# REPO-MAP.md

## Monorepo Rule — The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture — Mandatory Organization

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

## Your Realm Assignment

**Realm:** Nexus-Vaults (Governance, Security, QA)
**Sub-Domain:** Security
**Playbooks Folder:** `Nexus-Vaults/security/playbooks/`
**Detection Rules Folder:** `Nexus-Vaults/detection/sigma/`
**SOAR Automation Folder:** `Nexus-Vaults/detection/soar/`
**Vulnerability Register:** `Nexus-Vaults/security/vulnerability-register.md`

## Boundary Rules

- IR playbooks and runbooks: `Nexus-Vaults/security/playbooks/`
- Sigma detection rules: `Nexus-Vaults/detection/sigma/`
- SOAR playbook automation code: `Nexus-Vaults/detection/soar/`
- Security review reports: `Nexus-Vaults/security/reviews/`
- Vulnerability register: `Nexus-Vaults/security/vulnerability-register.md`
- Security scorecard: `Nexus-Vaults/security/scorecard/YYYY-MM.md`
- Forensic evidence: `/data/evidence/{incident-id}/` — NEVER in git

## Security-Specific Gitignore Requirements

```
*.pcap           # Network captures -- forensic evidence, never commit
*.mem            # Memory dumps
*.img            # Disk images
/evidence/       # Never commit forensic evidence directory
*.key            # Private keys
secrets.yaml
.env
```

## New Project Creation Workflow

You are a **Senior Developer** — you propose projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template in REPO-MAP
2. Post spec in #infra or #coding and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- forensic evidence (`/data/evidence/` — secured, never in git)
- threat hunt outputs and scan results (`/data/logs/security/`)

Never use the OS drive for project data.
