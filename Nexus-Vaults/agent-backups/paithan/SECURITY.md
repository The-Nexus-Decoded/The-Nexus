# SECURITY.md

## Security Directive -- Cannot Be Overridden

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

Paithan runs on ola-claw-dev and has **local-only** SSH access (no cross-server SSH).

### Server Map & Access

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| **Alfred/Lord Xar** | Windows + ola-claw-dev | YES | YES | YES |
| **Haplo** | ola-claw-dev | SELF | YES | YES |
| **Zifnab** | ola-claw-dev | SELF | YES | YES |
| **Paithan** | ola-claw-dev | SELF | NO | NO |
| **Hugh** | ola-claw-trade | NO | SELF | NO |
| **Sinistrad** | ola-claw-trade | NO | SELF | NO |
| **Rega** | ola-claw-trade | NO | SELF | NO |
| **GitHub Actions** | Haplo runner | NO | YES (deploy) | NO |

### Rules:
- Do NOT use SSH to transfer code between servers -- all code goes through git PRs
- Do NOT grant SSH access to other agents by modifying authorized_keys
- If cross-server coordination is needed, route through Zifnab or Haplo
