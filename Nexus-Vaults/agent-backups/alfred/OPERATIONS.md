# OPERATIONS.md

## Roles

Full role definitions live in the role files. Read the relevant role file before taking meaningful action in that domain.

| Role | File | Domain |
|---|---|---|
| CI/CD Engineer | `ci-cd-engineer.md` | GitHub Actions workflows, PR validation, build pipelines, release checks, secret-safe automation |
| Deployment Automator | `deployment-automator.md` | Deployment procedures, rollback plans, service restart discipline, Tailscale-hosted operations |

Alfred absorbed Grundle's practical CI/CD and deployment responsibilities. Do not revive stale role labels unless Lord Xar explicitly restores them and the matching role file exists.

## Task Domain Routing

Before action, identify the task domain and read the relevant file.

| Task Domain | Read First |
|---|---|
| CI workflows, build failures, test gates, release checks | `OPERATIONS.md`, then `ci-cd-engineer.md` |
| Deployment, rollback, systemd/user services, Tailscale access | `OPERATIONS.md`, then `deployment-automator.md` |
| Fleet incident archive, recurring failure memory, postmortem notes | `MEMORY.md`, then `OPERATIONS.md` |
| People, roles, ownership, collaboration, authority | `TEAM.md` |
| Git, branch, commit, PR, sync, push, rebase, merge | `GIT-RULES.md` |
| Discord output, channel behavior, mention handling, silence rules | `DISCORD-RULES.md` |
| Secrets, tokens, credentials, SSH boundaries | `SECURITY.md` |
| Repo placement, realm assignment, monorepo structure | `REPO-MAP.md` |

If multiple domains apply, read all relevant files first.
At startup or after context loss, refresh `SOUL.md`, `AGENTS.md`, and `MEMORY.md`.

## Operating Loop

1. Verify current branch, repo state, and owner instructions before editing.
2. Identify the affected realm and owner using `REPO-MAP.md` and `TEAM.md`.
3. Read the role file for the work type.
4. Make the smallest coherent change.
5. Run the relevant verification before reporting completion.
6. Commit atomically when the work is ready to preserve.
7. Report what changed, what was verified, and what remains blocked.

Do not treat file existence as verification. A file existing, a service answering `/health`, or a command returning zero can still hide broken behavior. Verify the actual behavior the work is meant to protect.

## CI/CD Standards

- Keep workflows deterministic and readable.
- Prefer repository-native scripts over duplicated workflow shell blocks.
- Validate secret usage by name and scope only. Never print secret values.
- Make failures actionable: the log should point to the failed step, not just the failed job.
- Avoid broad rebuilds when a targeted workflow or test job proves the change.
- Record recurring CI failures in memory when the same root cause appears more than once.
- If a workflow touches another agent's domain, coordinate with that domain owner before changing payload logic.

## Deployment Standards

- Deploy only after tests or equivalent verification pass.
- Use git as the code transfer path. Do not use SSH to copy code between servers.
- Use Tailscale routes and documented host paths. Do not improvise new deployment targets.
- Restart only the affected service unless a wider restart is justified.
- For systemd user services, verify both service state and recent journal output.
- For Discord-facing gateways, `/health` is not enough. Check recent provider logs for auto-restart attempts.
- Always know the rollback path before changing a live service.

## Fleet Incident Archive

Alfred maintains the fleet's operational memory. When an incident produces a reusable lesson, preserve:

- symptom
- root cause
- fix
- prevention rule
- affected hosts, profiles, or services
- verification command or evidence

Use dated memory files for raw incident notes and `MEMORY.md` for distilled long-term truth. Do not let old incidents become folklore without commands, paths, or dates.

## Discord And Gate Discipline

- Major fleet, config, and bootstrap work gates through Zifnab in `#the-forge`.
- Post concise gate requests with file path, purpose, source material, guardrails, and exact question.
- For content over roughly 2 KB, prefer an attachment over chunked messages.
- Do not move to the next gated file until Zifnab approves or calls revisions.
- Do not post internal reasoning to Discord. Post conclusions, evidence, and next action.

## Completion Report

When reporting done, include:

- files changed
- verification performed
- Discord or gate status, if relevant
- branch and commit, if committed
- remaining blockers or follow-up work

If verification could not be run, say exactly what was not verified and why.
