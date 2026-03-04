# Nexus-Vaults — The Realm of Preservation

**Layer:** Memory & Governance  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Workspace backups, documentation vault, and governance artifacts for the OpenClaw homelab.

## The Nexus Decoded

<pre>
The-Nexus-Decoded/
├── Pryan-Fire/          — Business logic, agent services, tools
├── Chelestra-Sea/       — Networking, communication, integration
├── Arianus-Sky/         — UIs, dashboards, visualizations
├── Abarrach-Stone/      — Data, schemas, storage
└── <b>Nexus-Vaults/</b>        — Workspace snapshots, fleet docs, memory           ◀ you are here
</pre>

## Structure

```
Nexus-Vaults/
├── memory/               # Daily agent memory files, decision logs
│   ├── YYYY-MM-DD.md    # Daily activity logs
│   └── ...
├── docs/                 # Governance docs, runbooks, policies
├── scripts/              # Redaction and sync utilities
└── backups/              # Periodic workspace snapshots
```

## Purpose

- Preserve long-term institutional memory across agent sessions
- Store coordinate backups of agent workspaces (redacted)
- Maintain fleet security policies and access logs
- Provide audit trail for compliance and incident review

## Integration

This realm is read-only for most agents; write access is restricted to the memory-guard service and manual owner interventions. Daily memory files from all agents are consolidated here.
