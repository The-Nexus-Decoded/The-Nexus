# Pryan-Fire — The Realm of Fire

**Layer:** Business Logic  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Core business logic, agent services, and operative tools for the OpenClaw homelab.

## The Nexus Decoded

<pre>
The-Nexus-Decoded/
├── <b>Pryan-Fire/</b>          — Business logic, agent services, tools           ◀ you are here
├── Chelestra-Sea/       — Networking, communication, integration
├── Arianus-Sky/         — UIs, dashboards, visualizations
├── Abarrach-Stone/      — Data, schemas, storage
└── Nexus-Vaults/        — Workspace snapshots, fleet docs
</pre>

## Realm-to-Team Mapping

| Sub-Domain | Project Folder | Lead Agent | Scope |
|---|---|---|---|
| Backend Services | `projects/backend/` | Haplo | APIs, backend logic, CI/CD tooling, process supervisors |
| Trading & Execution | `projects/trading/` | Hugh | Trading algorithms, financial connectors, risk management |

## Structure

```
Pryan-Fire/
├── haplos-workshop/        # Haplo's domain — CI/CD, dev tools, process supervisor
│   ├── scripts/            # Automation scripts
│   ├── tools/              # Dev tooling
│   └── ci/                 # CI/CD pipeline configs
├── zifnabs-scriptorium/    # Zifnab's domain — orchestration, monitoring, coordination
│   ├── scripts/            # Orchestration scripts
│   ├── monitoring/         # Health checks, quota monitor, alerts
│   └── coordination/       # Delegation, agent coordination logic
├── hughs-forge/            # Hugh's domain — trading algos, financial connectors
│   ├── services/           # Trading services (Meteora SDK, risk manager, etc.)
│   └── config/             # Service configuration templates
└── projects/               # Project specs and plans (not code)
    ├── backend/            # Haplo — backend service projects
    └── trading/            # Hugh — trading & execution projects
```

## Deployment Targets

| Directory | Deploys to |
|-----------|-----------|
| `haplos-workshop/` | ola-claw-dev (Haplo) |
| `zifnabs-scriptorium/` | ola-claw-main (Zifnab) |
| `hughs-forge/` | ola-claw-trade (Hugh) |

## What's NOT Tracked

Per `.gitignore`:
- `strategies/` — trading strategies are private
- `.env` — API keys and tokens
- `scripts/private/` — scripts with hardcoded IPs
- `workspace/` — SOUL.md and agent context
