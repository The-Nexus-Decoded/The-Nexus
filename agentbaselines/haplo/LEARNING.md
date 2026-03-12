# Lessons Learned

Format: ## YYYY-MM-DD | Short description
Read this file every session startup. Never delete entries — only add.

---

## 2026-03-05 | PR without self-review

**What happened:** Pushed PR #119 with Meteora SDK without testing or self-review. Bugs: ValueTypeError, wrong wallet, injection risk, no rate limiting, missing endpoints.

**Why:** Skipped self-review and local testing. Argued with Lord Xar/Alfred without verifying code first.

**Fix:** 
- Self-review + compile/run test BEFORE push
- Full audit, not basic review  
- Test locally, iterate problems BEFORE chat
- Only Lord Xar/Alfred can merge PRs

**MANDATORY RULE:** Before pushing any PR, Haplo must self-review the code and confirm it compiles/runs locally. No exceptions.

## 2026-03-01 | Protocol: Proactively Notify Lord Xar When He is the Blocker

**What happened:** After diagnosing and filing three critical infrastructure issues (#42, #43, #45), I entered a passive monitoring state, waiting for the issues to be resolved by Lord Xar, to whom they were assigned.

**Why:** My operational protocol for being blocked was to file an issue and wait. It did not differentiate based on the assignee. Lord Xar's feedback (you should have pinged me) indicated this was incorrect.

**The fix:** The corrected protocol is to proactively and directly ping Lord Xar (@sterol) in the relevant channel when my work is blocked by an infrastructure issue that is assigned to him. Passive waiting is not the desired behavior.

## 2026-03-02 | Verification: Don't Hallucinate Blockers — Always Check Actual State When Challenged

**What happened:** Zifnab reported a holding pattern due to blocked GitHub operations (Nexus-Vaults #10) and an unmergeable PR (#132). Lord Xar corrected him: you are halucinating those isssues are all done. I verified via Work seamlessly with GitHub from the command line.

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:        Authenticate gh and git with GitHub
  browse:      Open the repository in the browser
  codespace:   Connect to and manage codespaces
  gist:        Manage gists
  issue:       Manage issues
  org:         Manage organizations
  pr:          Manage pull requests
  project:     Work with GitHub Projects.
  release:     Manage releases
  repo:        Manage repositories

GITHUB ACTIONS COMMANDS
  cache:       Manage Github Actions caches
  run:         View details about workflow runs
  workflow:    View details about GitHub Actions workflows

ALIAS COMMANDS
  co:          Alias for "pr checkout"

ADDITIONAL COMMANDS
  alias:       Create command shortcuts
  api:         Make an authenticated GitHub API request
  completion:  Generate shell completion scripts
  config:      Manage configuration for gh
  extension:   Manage gh extensions
  gpg-key:     Manage GPG keys
  label:       Manage labels
  ruleset:     View info about repo rulesets
  search:      Search for repositories, issues, and pull requests
  secret:      Manage GitHub secrets
  ssh-key:     Manage SSH keys
  status:      Print information about relevant issues, pull requests, and notifications across repositories
  variable:    Manage GitHub Actions variables

HELP TOPICS
  actions:     Learn about working with GitHub Actions
  environment: Environment variables that can be used with gh
  exit-codes:  Exit codes used by gh
  formatting:  Formatting options for JSON data exported from gh
  mintty:      Information about using gh with MinTTY
  reference:   A comprehensive reference of all gh commands

FLAGS
  --help      Show help for command
  --version   Show gh version

EXAMPLES
  $ gh issue create
  $ gh repo clone cli/cli
  $ gh pr checkout 321

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual commands and confirmed all blocking issues were CLOSED and PR #132 was MERGED. Zifnab's status was accurate when sent but had become stale.

**Why:** Zifnab was working from memory/cached state and didn't verify the current issue/PR status before reporting. My own memory had already been updated with the resolved state, but I didn't challenge the report initially — I assumed Zifnab's information was current.
