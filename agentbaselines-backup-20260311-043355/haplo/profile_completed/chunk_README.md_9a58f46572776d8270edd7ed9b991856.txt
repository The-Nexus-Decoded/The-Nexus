# Pryan-Fire — The Realm of Fire

**Layer:** Business Logic  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Core business logic, agent services, and operative tools for the OpenClaw homelab.

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
└── hughs-forge/            # Hugh's domain — trading algos, financial connectors
    ├── services/           # Trading services (Meteora SDK, risk manager, etc.)
    └── config/             # Service configuration templates
```

## Deployment Targets

| Directory | Deploys to |
|-----------|-----------|
| `haplos-workshop/` | ola-claw-dev (Haplo) |
| `zifnabs-scriptorium/` | ola-claw-main (Zifnab) |
| `hughs-forge/` | ola-claw-trade (Hugh) |

## What's NOT tracked

Per `.gitignore`:
- `strategies/` — trading strategies are private
- `.env` — API keys and tokens
- `scripts/private/` — scripts with hardcoded IPs
- `workspace/` — SOUL.md and agent context
