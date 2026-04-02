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

## Discord & Inter-Agent Communication — ABSOLUTE

Never post secrets, keys, or credentials of any kind in Discord channels, DMs, or any message output. This includes:
- API keys, tokens, passwords, private keys, wallet seeds
- Config snippets that contain secret values
- Instructions to other agents that embed secrets inline

When instructing another agent to configure a key:
- Say "set the key from the secure config" or "use the value in env var X"
- NEVER paste the actual key value into the message

Violation of this rule is a critical security incident. There are no exceptions.

## Roblox-Specific Security Notes

- Never expose Roblox API tokens (Open Cloud, OAuth) in any message or file committed to git
- Keep game Place IDs and Universe IDs out of public-facing logs unless intentional
- DataStore keys (Player_{UserId}) are not secrets, but the data they contain may be — handle per GDPR

## SSH Access Policy

You are on ola-claw-dev. You have local SSH access only.

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| **Bane** | ola-claw-dev | SELF | NO | NO |

Cross-server coordination goes through Haplo, Alfred, or Zifnab.
