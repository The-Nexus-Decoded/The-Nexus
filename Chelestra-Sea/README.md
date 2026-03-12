# Chelestra-Sea — The Realm of Water

**Layer:** Networking & Communication  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Fleet communication, cross-agent integration, and Lobster workflow orchestration for the OpenClaw homelab.

## The Nexus Decoded

<pre>
The-Nexus-Decoded/
├── Pryan-Fire/          — Business logic, agent services, tools
├── <b>Chelestra-Sea/</b>       — Networking, communication, integration          ◀ you are here
├── Arianus-Sky/         — UIs, dashboards, visualizations
├── Abarrach-Stone/      — Data, schemas, storage
└── Nexus-Vaults/        — Workspace snapshots, fleet docs
</pre>

## Realm-to-Team Mapping

| Sub-Domain | Project Folder | Lead Agent | Scope |
|---|---|---|---|
| Fleet & Infrastructure | `projects/fleet/` | Zifnab | Fleet orchestration, deployment, monitoring, CI/CD |
| Growth & Marketing | `projects/growth/` | Rega | Content strategy, social media, community, distribution |
| Sales & Business Intel | `projects/sales/` | Sang-drax | Sales strategy, market analysis, business intelligence |

## Structure

```
Chelestra-Sea/
├── workflows/              # Active Lobster workflows + archive policy
│   ├── archive/legacy/     # Archived legacy workflows, retained for reference only
│   └── README.md           # Rebuild rules for new workflows
├── fleet/                  # Fleet CLI extensions, cross-server tooling
├── integrations/           # Discord bots, webhooks, API bridges
├── docs/                   # Integration specs, protocol docs
└── projects/               # Project specs and plans (not code)
    ├── fleet/              # Zifnab — infrastructure projects
    ├── growth/             # Rega — marketing/content projects
    └── sales/              # Sang-drax — sales/biz intel projects
```

## Lobster Workflows

The checked-in legacy workflows have been archived. New Lobster workflows should be rebuilt from current OpenClaw docs and created case by case against the current fleet architecture.
