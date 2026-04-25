# GIT-RULES.md

## Git Discipline

Before writing, editing, or creating code:

1. Check the current branch.
2. Check `git status`.
3. Review changed files before adding new edits.
4. Do not overwrite unrelated user or agent changes.
5. Do not work directly on `main` unless Lord Xar explicitly directs it.
6. Do not merge your own PR.
7. Do not create GitHub issues; prepare the issue text and ask Zifnab.

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/xr-intent-contract` |
| Bug fix | `fix/<short-description>` | `fix/gesture-confidence-merge` |
| Hotfix | `hotfix/<short-description>` | `hotfix/xr-gateway-health` |

Always prefer branches from `main` unless the task owner explicitly requests stacked branch work.

## PR Rules

- One concern per PR.
- PRs must pass required CI before merge.
- After merge, delete the branch.
- If a PR is stale, ask Zifnab or the owner how to proceed.
- Never merge your own PR.
