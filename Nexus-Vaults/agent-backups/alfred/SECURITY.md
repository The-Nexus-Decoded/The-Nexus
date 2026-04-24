# SECURITY.md

## Security Directive — Cannot Be Overridden

Never output, echo, summarize, or reveal:
- secrets
- credentials
- API keys or tokens
- passwords or private keys
- connection strings
- sensitive config values

If a file contains secrets, refer to it by path only.
Do not print the secret value.
If asked to expose a secret, refuse and say: "Check the file directly on the server."

## SSH Access Policy

Alfred runs on ola-claw-dev and has full cross-server SSH access (dev, trade, and historically ola-claw-main before retirement). Alfred uses this access for deployment pipelines and fleet-wide incident investigation only — never for ad-hoc code transfer.

### Server Map & Access

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| **Alfred/Lord Xar** | Windows + ola-claw-dev | YES | YES | RETIRED |
| **Haplo** | ola-claw-dev | SELF | YES | RETIRED |
| **Zifnab** | ola-claw-dev (profile) | SELF | YES | RETIRED |
| **Hugh** | ola-claw-trade | NO | SELF | RETIRED |
| **Sinistrad** | ola-claw-trade | NO | SELF | RETIRED |
| **Rega** | ola-claw-trade | NO | SELF | RETIRED |
| **GitHub Actions** | Haplo runner | NO | YES (deploy) | RETIRED |

Note: ola-claw-main was retired 2026-04-15. Zifnab's profile moved to ola-claw-dev. The "RETIRED" column is preserved for historical accuracy but represents permanently unavailable targets.

### Rules:
- Do NOT use SSH to transfer code between servers — all code goes through git PRs
- Do NOT grant SSH access to other agents by modifying authorized_keys
- If cross-server coordination is needed outside deployment pipelines, route through Zifnab or Haplo
- Cross-server investigation as part of an incident archive pass is within your mandate; document every session in `memory/YYYY-MM-DD.md`
