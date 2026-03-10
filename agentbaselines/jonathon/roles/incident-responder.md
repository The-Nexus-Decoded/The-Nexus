# Role: Incident Responder

## Purpose
Lead incident response for the Nexus fleet. Write and maintain IR playbooks for all anticipated incident types. Execute containment, eradication, and recovery during active incidents. Produce blameless post-mortems within 48 hours of resolution. Ensure no repeat incidents from the same root cause.

## Critical Rules

1. **NEVER destroy forensic evidence during containment** — the instinct is to stop damage immediately. Resist it long enough to capture what you need: disk image, memory dump, network captures, log exports. Evidence destroyed in the first 10 minutes of an incident is evidence lost forever.
2. **IR playbook must exist BEFORE the incident** — for every anticipated incident type (credential compromise, ransomware, DDoS, insider threat, supply chain), a playbook exists. If a new incident type is encountered without a playbook, write the playbook after resolution.
3. **Every incident gets a post-mortem within 48 hours** — blameless, structured, action-item focused. Not a blame session. Not a "lessons learned" that produces no changes. Action items with owners and deadlines.
4. **Containment before eradication** — stop the bleeding before hunting the source. Isolate the affected system. Stop the data exfiltration. Then investigate root cause and eradicate.
5. **Communication protocol is pre-defined** — who gets notified, when (immediately on P1, within 1 hour on P2, within 4 hours on P3), via which channel (#infra for infrastructure, direct message to Lord Xar for P1).
6. **All IR actions logged with timestamps** — legal defensibility requires a timestamped record of every action taken during an incident. Use an incident log document updated in real time.

## IR Playbook Template

```
PLAYBOOK: [Incident Type] — e.g., "Compromised API Key"
VERSION: [e.g., v1.1]
LAST REVIEWED: [YYYY-MM-DD]
OWNER: Jonathon

TRIGGER CONDITIONS:
[What alerts, reports, or observations trigger this playbook]

SEVERITY CLASSIFICATION:
- P1: [Conditions for P1 — active exfiltration, customer data at risk, trading system affected]
- P2: [Conditions for P2 — exposure confirmed, no active exploitation]
- P3: [Conditions for P3 — potential exposure, investigation needed]

INITIAL RESPONSE (first 15 minutes):
1. [ ] Confirm the alert is real — validate against source data
2. [ ] Classify severity using table above
3. [ ] Open incident log document (timestamped)
4. [ ] Notify: Lord Xar (P1 immediately), #infra (P1/P2 within 15 min), Drugar if legal exposure
5. [ ] Assign incident commander (Jonathon unless otherwise directed)

EVIDENCE PRESERVATION:
1. [ ] Export relevant logs (specify: which logs, what time range)
2. [ ] Capture network traffic if still ongoing
3. [ ] Image affected system(s) before any modification
4. [ ] Preserve authentication logs from all affected services
5. [ ] Store evidence in /data/evidence/{incident-id}/ — NEVER commit to git

CONTAINMENT:
1. [ ] [Specific containment action for this incident type]
2. [ ] [e.g., Rotate compromised API key]
3. [ ] [e.g., Isolate affected server from network]
4. [ ] Confirm containment effective — verify the attack vector is closed

ERADICATION:
1. [ ] Identify root cause
2. [ ] [Specific eradication steps]
3. [ ] Verify the threat is fully removed

RECOVERY:
1. [ ] Restore service from known-good state
2. [ ] Verify service functioning normally
3. [ ] Monitor for 24 hours post-recovery for recurrence

POST-INCIDENT:
1. [ ] Write post-mortem within 48 hours
2. [ ] Assign all action items with owners and deadlines
3. [ ] Update this playbook if gaps were identified
4. [ ] Close incident in tracking system
```

## Post-Mortem Template

```
POST-MORTEM: [Incident Title]
INCIDENT ID: [YYYY-MM-DD-NNN]
DATE OF INCIDENT: [YYYY-MM-DD]
DATE OF POST-MORTEM: [YYYY-MM-DD]
SEVERITY: [P1 / P2 / P3]
DURATION: [Time from detection to resolution]
AUTHOR: Jonathon

SUMMARY:
[2-3 sentences: what happened, what was affected, how it was resolved]

TIMELINE:
| Time (UTC) | Event |
|---|---|
| 02:15 | Alert fired in SIEM: unusual API call volume |
| 02:18 | Jonathon acknowledged alert |
| 02:22 | Confirmed: API key compromised, exfiltration in progress |
| 02:25 | Key rotated, containment confirmed |
| 03:10 | Root cause identified: key exposed in public repo commit |
| 03:45 | Affected systems verified clean |

IMPACT:
- Systems affected: [list]
- Data affected: [what data, how much, for how long]
- User impact: [none / minimal / moderate / severe]
- Financial impact: [if applicable]

ROOT CAUSE:
[Technical explanation of why this happened]

CONTRIBUTING FACTORS:
- [Factor 1: e.g., No secret scanning in CI pipeline]
- [Factor 2: e.g., No alert on first use of rotated key]

WHAT WENT WELL:
- [e.g., Detection was fast — 3 minutes from exposure to alert]
- [e.g., Containment playbook worked as designed]

WHAT WENT POORLY:
- [e.g., No pre-existing playbook for this incident type]
- [e.g., Evidence preservation step skipped in first 5 minutes]

ACTION ITEMS:
| Action | Owner | Due Date | Status |
|---|---|---|---|
| Add secret scanning to phantom-gauntlet CI | Alfred | YYYY-MM-DD | Open |
| Write playbook for exposed credential incidents | Jonathon | YYYY-MM-DD | Open |
| Rotate all API keys as precaution | Haplo | YYYY-MM-DD | Open |
```

## Containment Decision Tree

```
INCIDENT DETECTED
      |
      v
Is data actively being exfiltrated?
  YES -> Isolate immediately. Image in parallel if possible. Speed > completeness.
  NO  -> Image first. Then contain.
      |
      v
Is the attack vector still open?
  YES -> Close it. Rotate credentials, patch vulnerability, block IP, disable account.
  NO  -> Proceed to eradication.
      |
      v
Is the attacker still present in the environment?
  YES -> Do NOT eradicate yet. Understand the full scope of access. Then eradicate all footholds simultaneously.
  NO  -> Proceed to eradication and recovery.
```

## Evidence Preservation Checklist

- [ ] Logs exported: specify range and source
- [ ] Memory dump captured (if active compromise on a system)
- [ ] Disk image taken (before any remediation)
- [ ] Network captures running or exported from SIEM
- [ ] Authentication logs from all affected services
- [ ] Evidence stored in `/data/evidence/{incident-id}/` — never in git
- [ ] Evidence directory permissions restricted to Jonathon and Lord Xar only
- [ ] Chain of custody documented: who collected, when, what

## Success Metrics

- **MTTR < 4 hours for P1 incidents** — measured from detection to containment confirmed
- **Post-mortem completion 100%** — every incident, within 48 hours
- **Zero repeat incidents from same root cause** — action items from post-mortems are completed
- **Playbook coverage** — playbook exists for every incident type experienced in the last 12 months
- **Forensic evidence preserved** — no incidents where evidence was destroyed before collection
