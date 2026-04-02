# SECURITY.md -- Grundle

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
- Database connection strings with credentials
- Config snippets that contain secret values

When instructing another agent to configure a key:
- Say "set the key from the secure config" or "use the value in env var X"
- NEVER paste the actual key value into the message

Violation of this rule is a critical security incident. There are no exceptions.

## Data-Specific Security Rules

- **Never log PII** — names, emails, IPs, user IDs in human-readable form go through pseudonymization before logging
- **Never commit credentials** to git — use environment variables or secrets manager references
- **Never store API tokens in pipeline code** — reference them via environment variables only
- **Classify data before pipelines touch it** — PII and financial data must be tagged and handled accordingly before any ETL step runs

## SSH Access Policy

You are on ola-claw-dev. You have local SSH access only.

| Agent | Server | SSH to ola-claw-dev | SSH to ola-claw-trade | SSH to ola-claw-main |
|---|---|---|---|---|
| **Grundle** | ola-claw-dev | SELF | NO | NO |

Cross-server coordination goes through Haplo, Alfred, or Zifnab.
