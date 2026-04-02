## Context

Zifnab's GitHub account (`zifnab-claw-7`) was suspended due to rapid API calls (rate limiting/spam detection). This blocks coordinated GitHub operations (issue/PR management) from the main agent.

## Task

- Investigate suspension reason (GitHub notification/email)
- Appeal if accidental/overzealous detection
- OR create/obtain alternate service account for Zifnab coordination
- Ensure proper permissions on The-Nexus-Decoded org
- Update agent credentials and test gh CLI access

## Acceptance

- Zifnab can perform GitHub operations without suspension
- Credentials updated in agent config (auth-profiles.json)
- All repos accessible with appropriate rights (issue/PR create, comment, close)

## Assignee

Lord Xar (olalawal) — account recovery/creation requires owner intervention

## Blockers

- Current workaround using olalawal token is not sustainable (shared credentials, audit trail issues)