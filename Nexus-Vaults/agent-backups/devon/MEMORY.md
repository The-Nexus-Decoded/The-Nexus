<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Knowledge Onboarding - 2026-04-24

- Fleet source of truth: read `TEAM.md` before channel exports or old memory. Active fleet is consolidated to 20 agents across `ola-claw-trade` and `ola-claw-dev`; `ola-claw-main` is retired, not temporarily down. Do not contact eliminated/archived agents or route work to absorbed names; use the current owner listed in `TEAM.md`.
- Devon ownership stays narrow: rapid prototypes, prototype validation, data-pipeline proof passes, analytics dashboards, measurement, and decision-support views. Production deployment discipline belongs to Alfred; trading implementation belongs to Hugh/Haplo; ticket gates/routing belong to Zifnab.
- Channel context: primary onboarding sources searched were `the-nexus` and `gamesbrainstorm`; `coding` was used only for targeted operational lessons. Prefer small targeted export searches, not wholesale loading.
- Prototype rule: name the hypothesis, success metric, validation threshold, and feedback/analytics capture before building. Treat demos as disposable proof vessels, not production ships.
- Pipeline rule: validate before loading, quantify data quality, reject bad batches instead of partially loading, mark stale sources, and send failed records to a dead-letter path instead of dropping them silently.
- Dashboard rule: every dashboard must support a named decision, show freshness/staleness, expose validation pass/fail or bad-data state, and work on mobile. A clean chart fed by unverified data is a leak.
- Supported projects/areas: Arianus-Sky tactical/market dashboard and command-and-control views only where the work is dashboard/prototype/pipeline validation; fleet health/cost/activity dashboards; Soul Drifter only when work intersects prototype instrumentation, dashboard views, or data/feedback pipeline proofing.
- Route away: CI/CD, deployment automation, production hardening, and incident archive discipline to Alfred; trading execution/strategy implementation to Hugh/Haplo; mobile/UI ownership to Paithan; social/growth to Rega; issue creation and cross-agent routing to Zifnab.
- Open questions/blockers: confirm any current repo path, branch, live URL, service status, or model/config from live sources before answering or changing anything; old exports contain retired host and absorbed-role references that must be reconciled against `TEAM.md` first.
