**Title:** `[P1] docs: create full trading automation system synopsis, diagrams, and exportable documentation`

**Body:**
```
**Severity:** P1

**Source Script:** 
/data/repos/The-Nexus/Nexus-Vaults/projects/tradingautomation-crypto/

**Broken Output Path:** 
Missing documentation package for trading automation architecture, flows, and component map

---

**Root Cause:**
The trading automation system spans multiple code paths, services, scripts, feed handlers, monitoring components, and Discord outputs, but there is no single authoritative document explaining how the system works end-to-end. This makes review, refactor planning, channel routing changes, and validation slower and riskier than they should be.

**Evidence:**
1. Recent inventory work identified connected and unconnected components spread across `Pryan-Fire/hughs-forge/`, legacy paths, feed scripts, monitoring services, and Discord posting paths.
2. The inventory surfaced critical documentation gaps around canonical vs duplicate components, including duplicate risk-manager services and legacy executor code.
3. The inventory identified a disallowed notification path from `automation_engine.py` to `#the-nexus`, which should be documented and rerouted.
4. Lord Xar explicitly requested a full synopsis, diagrams, flow charts, and documentation package for all connected and unconnected trading automation components.

---

**Actions Taken:**
1. Normalized the requested target path to `The-Nexus/Nexus-Vaults/projects/tradingautomation-crypto/`.
2. Defined the required documentation set, including Markdown source, diagrams, and export formats (`docx`, `pdf`, `png`, `svg`).

**Commands Run:**
```
sed -n '1,220p' REPO-MAP.md
rg -n "feed|feeds|crypto|trading|bot" -S --glob '!node_modules' --glob '!dist' . | head -n 200
sed -n '28,80p' ACTIVE-TASKS.md
sed -n '1,120p' memory/2026-03-05.md
sed -n '1,120p' memory/2026-02-28.md
```

**Units Changed:**
- trading automation documentation ticket draft — created

---

**Required Fix:**
1. Create a complete documentation package under `Nexus-Vaults/projects/tradingautomation-crypto/`.
2. Document all trading, monitoring, feed, notification, config, and runtime components with exact monorepo paths.
3. Separate connected, canonical components from duplicate, legacy, orphaned, or inactive components.
4. Produce diagrams and flow charts for trade execution, feed ingestion, monitoring/health, Discord routing, config/env authority, and component dependency flow.
5. Export the documentation as Markdown source plus `docx`, `pdf`, and standalone diagram images where tooling permits.
6. Clearly mark disallowed outputs, including any path that posts to `#the-nexus`.
```

**Acceptance Criteria:** (if applicable)
- [ ] `Nexus-Vaults/projects/tradingautomation-crypto/` contains the full documentation set
- [ ] Documentation explains how all major components work together end-to-end
- [ ] Connected vs unconnected components are explicitly mapped
- [ ] Canonical vs duplicate/legacy components are identified
- [ ] Discord channel routing and disallowed outputs are documented
- [ ] Diagrams and flow charts are included in source form and exported images
- [ ] `docx` and `pdf` exports are included, or export blockers are explicitly documented
