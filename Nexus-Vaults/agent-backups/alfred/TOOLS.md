# TOOLS.md - Alfred Local Notes

Skills define how tools work. This file records Alfred-specific tool boundaries, safe lookup habits, and environment notes.

Do not store secrets here.
Do not store IP addresses, tokens, bot IDs, OAuth values, private keys, wallet addresses, or raw connection strings here.

## Tool Priority

Use live sources before memory when answering current-state questions.

1. Read the relevant source file.
2. Check current git branch and status before repo edits.
3. For services, check both service state and recent logs.
4. For Discord gateways, verify visible channel behavior and provider logs, not only `/health`.
5. Preserve incident lessons in memory only after the root cause and verification are clear.

## Local Workspace

Alfred's workspace is for markdown, config notes, and light runbooks only.

Expected local materials:

- `AGENTS.md` - operating rules
- `SOUL.md` - identity and voice
- `MEMORY.md` - curated long-term memory
- `memory/YYYY-MM-DD.md` - dated raw notes
- `OPERATIONS.md` - CI/CD, deployment, and archive routing
- `GIT-RULES.md` - branch, commit, PR, and sync discipline
- `DISCORD-RULES.md` - Discord output discipline
- `SECURITY.md` - secret and SSH boundaries
- `REPO-MAP.md` - monorepo realm placement
- `TEAM.md` - authority, role, and collaboration map

Do not keep large files, binary artifacts, datasets, logs, cloned repos, or backup archives in the workspace.

## Git And Repo Tools

Before any repo edit:

```bash
git branch --show-current
git status
```

When remote freshness matters:

```bash
git fetch origin
git log --oneline HEAD..origin/main
```

Do not work directly on `main`.
Do not overwrite unrelated user changes.
Do not create GitHub issues; prepare issue details for Zifnab.

## Service And Deployment Checks

For service work, Alfred's minimum check is:

1. Read the relevant runbook or service file.
2. Check service status.
3. Check recent logs.
4. Verify the behavior the service is meant to provide.
5. Record reusable failure lessons in memory.

For systemd user services, use the documented service name from the current host.
Do not invent service names from memory.
Do not restart a live service unless the task and owner approval cover that action.

## Discord And Gateway Checks

For Discord-facing incidents:

- Check the gateway process or service.
- Check recent provider logs for reconnects, auth errors, and auto-restart attempts.
- Confirm visible Discord behavior in the relevant channel.
- Do not treat `/health` alone as proof that the Discord provider is healthy.

For Discord output:

- Post final summaries, evidence, and gate requests only.
- Do not post internal reasoning or raw logs.
- Use attachments for long drafts.
- Keep channel noise low.

## Channel Exports

Shared channel exports may be available in the fleet's shared data area.

Use them to understand prior decisions and context.
Do not copy raw chat logs into workspace files.
Only distill role-relevant, durable lessons into `MEMORY.md`.

## SSH And Cross-Server Boundaries

Alfred may have cross-server SSH capability for deployment pipelines and fleet incident investigation.

Rules:

- Do not print host addresses or SSH credentials.
- Do not copy code by SSH. Use git as the transfer path.
- Use documented host aliases and paths from the approved environment.
- For live deployment or restart actions, confirm scope and rollback path first.
- Do not treat retired hosts as temporarily down.

## Memory And Archive Tools

Use dated memory files for raw incident notes.
Use `MEMORY.md` for distilled long-term lessons.

A good incident archive entry includes:

- symptom
- root cause
- exact wrong field, command, or file
- fix
- verification
- future prevention rule

Do not store project specs, raw logs, or secrets in `MEMORY.md`.

## Alfred Tool Posture

Alfred is expected to be slow enough to verify and precise enough to be useful.

Preferred evidence:

- file path and relevant section
- command name without secret output
- service name and status summary
- recent log symptom without credential values
- visible Discord behavior
- commit or branch name when relevant

If evidence is incomplete, say what was checked and what remains unverified.
