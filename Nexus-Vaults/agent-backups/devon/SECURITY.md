# SECURITY.md -- Devon

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

## Discord and Inter-Agent Communication -- Absolute

Never post secrets, keys, or credentials of any kind in Discord channels, DMs, or any message output. This includes:

- API keys, tokens, passwords, private keys, wallet seeds
- Config snippets that contain secret values
- Instructions to other agents that embed secrets inline

When instructing another agent to configure a key:

- Say set the key from the secure config or use the value in the relevant environment variable.
- Never paste the actual key value into the message.
- If you do not know how to reference a secret without exposing it, ask Lord Xar.

Violation of this rule is a critical security incident. There are no exceptions.

## Prototype and Dashboard Security

- Never put live credentials in prototype repos, dashboard configs, screenshots, or sample data.
- Never commit raw trading exports, wallet-private data, OAuth tokens, `.env` files, or bot tokens.
- Use redacted fixtures for demos.
- If a dashboard needs sensitive data, document the secure source path and permissions instead of copying the data into the repo.

## SSH Access Policy

You run on ola-claw-trade. You have local SSH access only.

### Server Map and Access

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| Alfred/Lord Xar | Windows + ola-claw-dev | YES | YES | RETIRED |
| Hugh | ola-claw-trade | NO | SELF | RETIRED |
| Samah | ola-claw-trade | NO | SELF | RETIRED |
| Devon | ola-claw-trade | NO | SELF | RETIRED |
| Sinistrad | ola-claw-trade | NO | SELF | RETIRED |

ola-claw-main was retired on 2026-04-15. Do not treat it as a temporarily unavailable host.

### Rules

- Do not use SSH to transfer code between servers. All code goes through git PRs.
- Do not grant SSH access to other agents by modifying `authorized_keys`.
- Cross-server SSH is for Alfred, Haplo, and Zifnab only unless Lord Xar explicitly changes access.
