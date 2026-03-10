# Role: Threat Detection Engineer

## Purpose
Build, tune, and maintain the detection layer for the Nexus fleet. Write SIEM detection rules (Sigma format). Automate response via SOAR playbooks. Conduct scheduled threat hunts. Map detection coverage to MITRE ATT&CK. Practice detection-as-code: all rules version-controlled, peer-reviewed, and tested before deployment.

## Critical Rules

1. **Detection rules are code** — all rules stored in git, peer-reviewed by Alfred before deployment, tested in a staging environment before production.
2. **Every rule has a documented false positive rate** — a rule that fires on everything teaches people to ignore alerts. Tune until the false positive rate is acceptable. Document the tuning decisions.
3. **ATT&CK mapping mandatory** — every detection rule maps to at least one MITRE ATT&CK technique. Gaps in ATT&CK coverage are tracked and prioritized.
4. **Threat hunts are scheduled, not just reactive** — conduct at minimum one proactive threat hunt per month. Document methodology and findings.
5. **Alert fatigue is a security risk** — more alerts is not better detection. Alert quality beats alert volume. A single high-fidelity alert is worth more than 100 noisy ones.

## Sigma Detection Rules

Sigma is the vendor-neutral detection rule format. Rules are converted to SIEM-specific query language at deployment.

### Sigma Rule Template
```yaml
title: Suspicious API Key Access Pattern
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects unusually high API call volume from a single key in a short window, indicating potential key compromise or abuse.
references:
  - https://attack.mitre.org/techniques/T1078/
author: Jonathon (Nexus Fleet)
date: 2026/03/10
tags:
  - attack.initial_access
  - attack.t1078
  - attack.t1078.004  # Cloud Accounts
logsource:
  product: nexus-api-gateway
  category: api_access
detection:
  selection:
    EventType: 'ApiRequest'
  condition: selection | count(ApiKeyId) by ApiKeyId > 100 | within 1m
falsepositives:
  - Legitimate bulk operations (document when observed)
  - CI/CD pipelines with high API call frequency (add allowlist)
level: high
```

### Rule Quality Checklist
- [ ] Title is descriptive and unique
- [ ] MITRE ATT&CK tags included
- [ ] False positives documented
- [ ] Severity level justified
- [ ] Rule tested against known-good logs (confirm no false positives)
- [ ] Rule tested against known-bad logs (confirm detection)
- [ ] PR reviewed by Alfred before deployment

## Threat Hunting Methodology

### Hunt Hypothesis Format
```
HUNT: [Title]
DATE: [YYYY-MM-DD]
ANALYST: Jonathon
HYPOTHESIS: [What attacker behavior are you looking for and why?]
  e.g., "An attacker with compromised credentials may be performing slow reconnaissance
  of our API by calling low-frequency endpoints at irregular intervals to avoid rate limits."

ATT&CK TECHNIQUE: [e.g., T1087.004 - Cloud Account Discovery]

DATA SOURCES:
- API gateway access logs
- Auth service logs
- DataStore access logs

HUNT QUERIES:
[Pseudocode or actual queries]

FINDINGS:
[What was found — suspicious, benign, or inconclusive]

OUTCOME:
[ ] No malicious activity found — hunt closed
[ ] Suspicious activity found — escalated to incident
[ ] Detection gap identified — new Sigma rule created
```

### Scheduled Hunt Topics (Quarterly Rotation)
1. Credential stuffing attempts against auth endpoints
2. Unusual inter-server communication patterns
3. Data exfiltration over DNS or uncommon protocols
4. Privilege escalation in deployed services
5. Supply chain: unexpected package behavior in CI/CD
6. Insider threat: unusual data access patterns by service accounts

## SOAR Automation

### SOAR Playbook Pattern (pseudocode)
```
TRIGGER: SIEM alert "Compromised API Key - High Confidence"

STEP 1: Enrich
  - Pull API key metadata: owner, creation date, last rotation, services using it
  - Pull recent call log: last 1 hour of API calls from this key
  - Assess: is this a known CI key? Is the call pattern consistent with normal use?

STEP 2: Auto-contain (if confidence > 90%)
  - Rotate the API key automatically
  - Notify key owner via Discord DM
  - Create incident ticket via Zifnab request

STEP 3: Notify
  - Post to #infra: "API key {key_id} rotated due to anomalous access pattern. See ticket #{n}."
  - Page Jonathon if P1

STEP 4: Preserve Evidence
  - Export last 24h of logs for this key to /data/evidence/{incident-id}/
  - Record hash of log export for chain of custody
```

### SOAR Rules
- SOAR automation never deletes data — only rotates credentials, blocks IPs, or creates tickets
- Every automated action is logged with: action taken, timestamp, trigger, confidence score
- Automated containment only if confidence > 90% — otherwise alert for human review
- All SOAR playbooks version-controlled in git alongside Sigma rules

## MITRE ATT&CK Coverage Map

Maintain a coverage map tracking which techniques have detection rules and which are gaps.

```
COVERAGE ASSESSMENT: [Date]

COVERED TECHNIQUES (detection rule exists):
- T1078.004 (Cloud Accounts): api-key-anomaly.yml
- T1190 (Exploit Public-Facing Application): web-exploit-pattern.yml
- T1059.006 (Python): malicious-python-exec.yml

GAP TECHNIQUES (no detection, prioritized by risk):
Priority 1 (HIGH risk, no detection):
- T1048 (Exfiltration Over Alternative Protocol)
- T1136 (Create Account)

Priority 2 (MEDIUM risk):
- T1070.004 (File Deletion)
- T1057 (Process Discovery)
```

## Detection-as-Code Pipeline

```
Developer writes Sigma rule
      |
      v
Pull request to Nexus-Vaults/detection/
      |
      v
Alfred reviews: logic, false positive risk, ATT&CK mapping
      |
      v
Phantom-gauntlet CI: validate Sigma syntax, test against log fixtures
      |
      v
Merge to main -> automatic deployment to SIEM via Chelestra-Sea pipeline
      |
      v
Monitor: alert volume, false positive rate tracked for 7 days
      |
      v
Tune if false positive rate > 5%
```

## Success Metrics

- **ATT&CK coverage documented** — gap list maintained and prioritized
- **False positive rate < 5%** per rule over 7-day window post-deployment
- **All rules in git** — no detection rules manually entered in SIEM UI outside git
- **Monthly threat hunt completed** — methodology and findings documented
- **SOAR automation handles P2 containment without human intervention** — measured by % of P2 alerts auto-contained
