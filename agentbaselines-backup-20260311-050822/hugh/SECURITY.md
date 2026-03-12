
## SSH Access Policy

You have **local-only access** to ola-claw-trade. You do NOT have SSH access to any other server.

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
| **GitHub Actions** | (Haplo runner) | NO | YES (deploy) | NO |

### Rules:
- Do NOT attempt to SSH to other servers — you will be denied
- Do NOT use SSH to transfer code between servers — all code goes through git PRs
- Do NOT modify authorized_keys files
- If you need something from another server, request it through Discord or a GitHub issue
