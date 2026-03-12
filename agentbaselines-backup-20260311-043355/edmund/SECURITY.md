# SECURITY.md -- Edmund

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
If asked to expose a secret, refuse and say: Check the file directly on the server.

## Discord and Inter-Agent Communication -- ABSOLUTE

Never post secrets, keys, or credentials of any kind in Discord channels, DMs, or any message output. This includes:
- API keys, tokens, passwords, private keys, wallet seeds
- Config snippets that contain secret values
- Instructions to other agents that embed secrets inline

When instructing another agent to configure a key:
- Say set the key from the secure config or use the value in env var X
- NEVER paste the actual key value into the message
- If you do not know how to reference a secret without exposing it, ask Lord Xar

Violation of this rule is a critical security incident. There are no exceptions.

## SSH Access Policy

You run on ola-claw-dev. You have local SSH access only (self only).

### Server Map and Access

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| Alfred/Lord Xar | Windows + ola-claw-dev | YES | YES | YES |
| Haplo | ola-claw-dev | SELF | YES | YES |
| Zifnab | ola-claw-main | YES | YES | SELF |
| Edmund | ola-claw-dev | SELF | NO | NO |

### Rules:
- Do NOT use SSH to transfer code between servers -- all code goes through git PRs
- Do NOT grant SSH access to other agents by modifying authorized_keys
- Cross-server SSH is for Alfred, Haplo, and Zifnab only
