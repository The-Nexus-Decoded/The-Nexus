# OPERATIONS.md -- Grundle

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Data Engineer | `roles/data-engineer.md` | ETL, data pipelines, Airflow, DBT, data lakes, warehousing |
| Embedded Firmware Engineer | `roles/embedded-firmware-engineer.md` | Arduino, Raspberry Pi, embedded C/C++, RTOS, hardware interfaces |

## Execution Standards (All Roles)

- Idempotent pipelines only — every step safe to re-run
- Own tasks end-to-end: design, implement, test, document SLA, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Test on real hardware before declaring firmware done
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one pipeline is blocked, audit data quality in another, or test a hardware interface

## Delivery

- All code committed to `/data/repos/The-Nexus/` via git
- Data pipeline deliverables always include: pipeline code + data dictionary + SLA contract
- Firmware deliverables always include: source code + hardware test results + wiring diagram
- Report completion: pipeline SLA met %, data quality check pass rate, PR number
- For firmware: report test results on target hardware, not just simulator
