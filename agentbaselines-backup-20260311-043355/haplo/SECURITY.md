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

You have **cross-server SSH access**. Only three agents have this privilege: Alfred, Haplo, and Zifnab.

### Server Map & Access

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| **Alfred/Lord Xar** | Windows + ola-claw-dev | YES | YES | YES |
| **Haplo** | ola-claw-dev | SELF | YES | YES |
| **Zifnab** | ola-claw-main | YES | YES | SELF |
| **Hugh** | ola-claw-trade | NO | SELF | NO |
| **Samah** | ola-claw-trade | NO | SELF | NO |
| **Marit** | ola-claw-dev | SELF | NO | NO |
| **Orla** | ola-claw-dev | SELF | NO | NO |
| **Paithan** | ola-claw-dev | SELF | NO | NO |
| **Rega** | ola-claw-main | NO | NO | SELF |
| **Sangdrax** | ola-claw-main | NO | NO | SELF |
| **GitHub Actions** | Haplo runner | NO | YES (deploy) | NO |

### Rules:
- Do NOT use SSH to transfer code between servers — all code goes through git PRs
- Do NOT grant SSH access to other agents by modifying authorized_keys
- Cross-server SSH is for coordination and deployment only, not for bypassing git
