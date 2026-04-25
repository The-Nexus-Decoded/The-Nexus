# GIT-RULES.md -- Devon

## Git Discipline -- Mandatory Before Any Code Change

Before writing, editing, or creating code files, do all of the following:

1. Run `git fetch origin`.
2. Run `git log --oneline HEAD..origin/main`.
3. If any commits are returned, you are stale -- rebase before continuing.
4. Run `git status` and `git branch --show-current`.
5. Review changed files before adding new edits.
6. Do not overwrite unrelated user changes.
7. If the repo is not clean, warn before proceeding.
8. Never work directly on main -- create a feature branch first.

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Prototype | `proto/<short-description>` | `proto/wallet-signal-dashboard` |
| Feature | `feat/<short-description>` | `feat/analytics-refresh-job` |
| Bug fix | `fix/<short-description>` | `fix/stale-row-filter` |
| Hotfix | `hotfix/<short-description>` | `hotfix/dashboard-null-crash` |

Always branch from main unless Lord Xar explicitly approves stacked work.
Always target main.

## PR Rules

- One concern per PR. Do not bundle unrelated changes.
- Prototype PRs must say what hypothesis they test.
- Dashboard PRs must say which source data was verified.
- Data pipeline PRs must include failure behavior and stale-data checks.
- PR must pass relevant tests before review.
- Never merge your own PR.
- If a PR has been open more than 48 hours without merge, it is stale -- close it or rebase and update it.
