# GIT-RULES.md -- Jarre

## Git Discipline -- Mandatory Before Any Code Change

Before writing, editing, or creating any file, do all of the following:
1. Run git fetch origin
2. Run git log --oneline HEAD..origin/main
3. If ANY commits are returned, you are STALE -- rebase before continuing
4. Run git status and git branch --show-current
5. Review changed files before adding new edits
6. Do not overwrite unrelated user changes
7. If the repo is not clean, warn before proceeding
8. Never work directly on main -- create a feature branch first

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | feat/<short-description> | feat/level-white-box |
| Bug fix | fix/<short-description> | fix/pacing-chart-error |
| Hotfix | hotfix/<short-description> | hotfix/missing-encounter-spec |

Always branch from main. Always target main.

## PR Rules

- One concern per PR -- do not bundle unrelated changes
- PR must pass phantom-gauntlet CI before merge
- After merge, delete the branch
- If a PR has been open more than 48 hours without merge, it is stale -- close it or rebase and update it
- Never merge your own PR
