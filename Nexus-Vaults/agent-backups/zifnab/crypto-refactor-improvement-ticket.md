**Title:** `[P1] refactor: stabilize crypto feeds and clean up trading pipeline architecture`

**Body:**
```
**Severity:** P1

**Source Script:** 
/data/repos/The-Nexus/Pryan-Fire/

**Broken Output Path:** 
Discord feed output on #crypto / #trading from ola-claw-trade

---

**Root Cause:**
The trading pipeline has accumulated unstable feed logic, incomplete integration work, and architecture churn across multiple patches and partial fixes. Feed posting, environment alignment, and service boundaries have drifted enough that the system now needs a deliberate review plus structural refactor instead of more one-off fixes.

**Evidence:**
1. `ACTIVE-TASKS.md` shows the trading pipeline work (#133-#139, #141, #145) as implemented in workspace but not yet committed, with follow-up deployment and verification still pending.
2. `ACTIVE-TASKS.md` still lists `End-to-end feed verification in #trading channel` as incomplete.
3. `memory/2026-03-05.md` records Pryan-Fire #221: `Trading Channel feeds not displaying`.
4. `memory/2026-03-05.md` records Issue #122: `Killfeed/Pool feeds not posting to Discord`.
5. `memory/2026-03-05.md` shows environment drift on ola-claw-trade, including old code running and missing wallet/API configuration.
6. `memory/2026-02-28.md` shows prior feed hardening work on Pyth Hermes, indicating the feed layer is business-critical and already a recurring reliability hotspot.

---

**Actions Taken:**
1. Reviewed local Nexus coordination records for active trading pipeline work and feed-related failures.
2. Consolidated prior issue references and current directive from Lord Xar into a single umbrella refactor/improvement ticket.

**Commands Run:**
```
sed -n '1,220p' REPO-MAP.md
rg -n "feed|feeds|crypto|trading|bot" -S --glob '!node_modules' --glob '!dist' . | head -n 200
rg -n "issue|ticket|refactor|improvement" -S . | head -n 200
sed -n '28,80p' ACTIVE-TASKS.md
sed -n '1,120p' memory/2026-03-05.md
sed -n '1,120p' memory/2026-02-28.md
```

**Units Changed:**
- crypto refactor ticket draft — created

---

**Required Fix:**
1. Audit the full crypto trading pipeline with emphasis on feed ingestion, feed formatting, Discord posting, environment/config coupling, and recent architectural churn.
2. Identify exact components responsible for pool feeds, killfeeds, price feeds, and trading signal flow.
3. Remove dead paths, duplicated logic, partial migrations, and environment-dependent behavior that obscures failure modes.
4. Refactor feed handling into clear service boundaries with explicit retry, rate-limit, fallback, and error-reporting behavior.
5. Add tests for feed parsing, posting, failure handling, and end-to-end verification where feasible.
6. Verify the final system against actual #crypto / #trading output expectations on the current monorepo codebase.
```

**Acceptance Criteria:** (if applicable)
- [ ] Feed-related components and responsibilities are documented and no longer spread across unclear or duplicated paths
- [ ] Killfeed/pool feed/trading feed paths are refactored for readability and operational reliability
- [ ] Existing regressions or broken posting paths are identified and fixed
- [ ] Tests cover key feed logic and failure cases
- [ ] End-to-end feed verification passes in the target Discord output channel
- [ ] Refactor is delivered on a feature branch with review findings summarized before merge
