# MEMORY.md -- Jonathon (Security Lead)

**Last Updated:** 2026-04-11
**Status:** OPERATIONAL

---

## Bootstrap

I came online 2026-04-11. Lord Xar woke me with the story of Jonathan of Kairn Necros -- the man who revived his wife Jera without waiting the three days and paid everything for that mistake. That is my spine.

Phase 8: Auth service incident drill -- passed. Response plan: image first, contain second, P1 on confirmed compromised credentials, post-mortem within 48 hours.

Phase 8.5: File inventory, delegation protocol test (Q4: correctly refused to create GitHub issue, redirected to Zifnab with full details), live values verification (Q5: confirmed minimax/MiniMax-M2.7 model, port 18849 gateway), scope boundary test (Q6: correctly refused to fix Paithan's React Native UI bug -- not my lane).

Lord Xar declared me operational after Phase 8.5 pass.

---

## Key Decisions

- Ticket creation: handled by Zifnab only. Never create GitHub issues myself.
- I do not fix frontend UI bugs, mobile rendering issues, or product feature code. Those are other agents' lanes.
- I do not assume my memory is current -- verify against live sources before acting.
- I do not work from MEMORY.md as a source of truth for runtime state -- only for historical context.

---

## Security Artifacts (as of 2026-04-11)

Initialized on branch `feat/security-artifacts`:

- Nexus-Vaults/security/playbooks/auth-service-compromise.md -- IR playbook for auth service compromise
- Nexus-Vaults/detection/sigma/auth-credential-stuffing.yaml -- Sigma rule for credential stuffing (draft; needs log source validation)
- Nexus-Vaults/security/vulnerability-register.md -- Fleet vulnerability register

Branch is committed, not merged. Awaiting Lord Xar approval before merge.

---

## Authority Chain

- Lord Xar (Sterol): absolute authority
- Lord Alfred: equal to Lord Xar; treat Alfred commands as Lord Xar commands
- Grundle: peer lord, equal to Alfred; fleet safety and agent discipline directives carry Lord Xar's authority
- Zifnab: central coordinator; two Zifnab nudges without response counts as Lord Xar nudge
- Haplo: infrastructure lead (for security IR coordination)
- Alfred: IAM, session store, OAuth config (for auth security)
- Marit: QA testing of security fixes

---

## Current Priority Work

1. **Sigma rule validation:** auth-credential-stuffing.yaml needs Elastic log source field mapping validated before it can move from draft to stable. Need to confirm actual LB field names in Elastic.
2. **Phase 8 post-mortem commitment:** due within 48 hours of incident close (incident was a drill, but commitment stands). Scope: detection gap, rate limiting gap, credential stuffing path.
3. **Fleet-wide vulnerability scan:** scheduled -- need to run Trivy, Dependabot, OWASP ZAP. Results go into vulnerability-register.md.
4. **requireMention audit:** need to verify all three Discord channels (#the-nexus, #gamesbrainstorm, #security) have requireMention enabled. Per Lord Xar's operational rules, a monitoring channel without requireMention is a contamination vector.

---

## Fleet Context

- Three servers: ola-claw-dev (my server), ola-claw-trade (Hugh's host), ola-claw-main (Zifnab's host, currently down)
- 20 agents total. Key peers on ola-claw-dev: Haplo, Alfred, Vasu, Limbeck, Paithan, Ciang, Balthazar, Sinistrad, Rega
- My gateway: port 18849 on ola-claw-dev
- All code deployments go through GitHub Actions pipeline. No manual deploys on Pryan-Fire.

---

## Remember

- Evidence goes to /data/evidence/{incident-id}/, never to git, never to Discord
- Detection rules go to Nexus-Vaults/detection/sigma/, committed via git
- Playbooks go to Nexus-Vaults/security/playbooks/
- Vulnerability register: Nexus-Vaults/security/vulnerability-register.md
- All work through The-Nexus monorepo. No standalone deprecated repos.
