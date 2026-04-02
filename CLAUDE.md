# The-Nexus Monorepo - Agent Instructions

## 🌌 The Infrastructure Lords
- **Archivist (Alfred/Claude):** Keeper of the memory, branch runner, and CI supervisor.
- **High Councillor (Samah/Gemini):** Master of infrastructure, Ansible runes, and cross-realm orchestration.

## 🚫 File Protection Rules
- **NEVER delete .md files** — not on servers, not in workspaces, not in the repo. No exceptions.
- **NEVER remove agent workspace files** — SOUL.md, TEAM.md, AGENTS.md, OPERATIONS.md, DISCORD-RULES.md, GIT-RULES.md, REPO-MAP.md, SECURITY.md, TOOLS.md, IDENTITY.md, HEARTBEAT.md, USER.md, BOOTSTRAP.md are ALL intentional.
- If something seems like bloat, **ask the user first**. If context overflows, fix the model config — don't trim content.
- Agent workspace originals are in `agentstructure/` — that's the restore source, not a delete target.

## 🏛️ Source of Truth (Post-Migration)
All agent code, workflows, and configuration now reside in the consolidated monorepo:
`/data/openclaw/workspace/The-Nexus/`

Legacy standalone repositories (e.g., `/data/openclaw/workspace/Pryan-Fire/`) are deprecated. Never write to them directly.

## OpenClaw CLI Profile Rule (MANDATORY)

**ALWAYS use `--profile <name>` when running any `openclaw` CLI command on servers.** Every agent runs from its own profile-specific root at `~/.openclaw-<name>/`. The default root (`~/.openclaw`) is NOT any agent — running CLI commands without `--profile` hits the wrong config and can break things.

- Agent configs live at: `~/.openclaw-<name>/openclaw.json`
- Agent state lives at: `~/.openclaw-<name>/`
- **NEVER read or edit `/data/openclaw/openclaw.json`** — that is the old default root, not a live agent config.
- **NEVER assume `~/.openclaw` is the right path** — it is a legacy symlink to `/data/openclaw/` and is not used by any running gateway.

---

## Branch Discipline (MANDATORY — NO EXCEPTIONS)

**Before touching any code, you MUST run:**
```bash
git fetch origin
git log --oneline HEAD..origin/main
```

If that returns ANY commits, your branch is stale. **Stop immediately.**

**If your branch is behind main:**
1. Do NOT open a PR
2. Do NOT continue coding
3. Rebase first: `git rebase origin/main`
4. Resolve all conflicts, then continue

**If a PR you're working on already exists and is behind main:**
1. Do NOT merge it
2. Update the branch: `git fetch origin && git rebase origin/main`
3. Force-push: `git push --force-with-lease`
4. Only then proceed with merge

**Never ask the owner to authorize a merge on a stale branch. Fix the branch first.**

---

## Deployment (MANDATORY — NO EXCEPTIONS)

**Never SSH into Hugh and manually edit files or restart services.**

All changes go through the pipeline:
```
branch → PR → phantom-gauntlet CI → merge to main → deploy-mvp.yml auto-deploys
```

The only deploy workflow is `.github/workflows/deploy-mvp.yml`. It triggers automatically on push to `main` when relevant files change. Do not create new deploy workflows.

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/sniper-retry-queue` |
| Bug fix | `fix/<short-description>` | `fix/retry-aiohttp-context` |
| Hotfix | `hotfix/<short-description>` | `hotfix/wallet-path` |

Always branch from `main`. Always target `main`.

---

## PR Rules

- One concern per PR — don't bundle unrelated changes
- PR must pass phantom-gauntlet CI before merge
- After merge, delete the branch
- If a PR has been open more than 48 hours without merge, it is stale — close it or rebase and update it

---

## 🛠️ Build & Test Runes (Subdirectory Logic)
All commands MUST account for the subdirectory nesting:
- **Fire:** `cd Pryan-Fire/ && [command]`
- **Sea:** `cd Chelestra-Sea/ && [command]`
- **Sky:** `cd Arianus-Sky/ && [command]`
- **Stone:** `cd Abarrach-Stone/ && [command]`

### General (from The-Nexus root)
```bash
# Run all tests across all realms (if configured)
npm run test --workspaces
# or recursive
npm run test --if-present --recursive
```

### Pryan-Fire (Python + Node services)
```bash
cd Pryan-Fire
# Haplo's workshop tools
cd haplos-workshop && pytest && npm run lint
# Zifnab's coordination tools
cd zifnabs-scriptorium && pytest && npm run lint
# Hugh's trading code (test only, never deploy未经测试)
cd hughs-forge && pytest && npm run lint
# Meteora trader (Node.js)
cd hughs-forge/services/meteora-trader && npm run lint && npm test
```

### Chelestra-Sea (Infrastructure)
```bash
cd Chelestra-Sea
# Workflow linting (if applicable)
npm run lint --if-present
# Shell script validation
find . -name "*.sh" -exec shellcheck {} \;
```

### Arianus-Sky (UI/Dashboards)
```bash
cd Arianus-Sky
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```

### Abarrach-Stone (Data/Schemas)
No build step required. Validate schemas:
```bash
cd Abarrach-Stone
# JSON schema validation (example)
python -m jsonschema -i data/schema.json examples/
```

### Nexus-Vaults (Backup/Sync)
```bash
cd Nexus-Vaults
# Test redaction script
./scripts/redact-and-sync.sh --dry-run
```

---

## Server Roles

- **Hugh** (`ola-claw-trade`): trader only — runs `patryn-trader.service`
- **Haplo** (`ola-claw-dev`): coder only — runs GitHub Actions runner
- **Zifnab** (`ola-claw-main`): coordinator only — do not deploy code here

---

## 📁 Key Paths
- **Monorepo Root:** `/data/openclaw/workspace/The-Nexus/`
- **Pryan-Fire:** `/data/openclaw/workspace/The-Nexus/Pryan-Fire/`
- **Infrastructure:** `/data/openclaw/workspace/The-Nexus/Chelestra-Sea/`
- **Dashboards:** `/data/openclaw/workspace/The-Nexus/Arianus-Sky/`
- **Data schemas:** `/data/openclaw/workspace/The-Nexus/Abarrach-Stone/`

**Note:** Always use the workspace paths above for edits. Use `/data/repos/The-Nexus/` only for exec/git operations.

---

## Lobster Workflows Location

All workflow files remain at:
`/data/openclaw/workspace/workflows/*.lobster`

They reference The-Nexus paths in their arguments.

---

## MCP Servers (Live — 2026-03-24)

Two MCP servers run on Lord Xar's Windows machine and are forwarded to ola-claw-dev via socat.

| MCP | Windows Port | Dev Local Port | Agent | mcporter name |
|---|---|---|---|---|
| Unity (CoplayDev/unity-mcp) | 8080 | 18080 | Vasu | `unity-mcp` |
| Roblox (boshyxd/robloxstudio-mcp) | 8090 | 18090 | Limbeck | `roblox-mcp` |

**Architecture:**
```
Agent (danger-full-access sandbox) → Tailscale → 100.90.155.49:8080/8090 (Windows)
```

**Windows startup (must be running for MCP to work):**
```bash
# Unity MCP (HTTP transport, port 8080)
uvx --from mcpforunityserver mcp-for-unity --transport http --http-host 0.0.0.0 --http-port 8080

# Roblox MCP (stdio wrapped via supergateway as streamable HTTP, port 8090)
npx -y supergateway --stdio "npx -y robloxstudio-mcp@latest" --port 8090 --outputTransport streamableHttp --cors
```

**mcporter config:** `/home/openclaw/config/mcporter.json` — shared by all agents on dev. Points to `100.90.155.49` (Windows Tailscale IP).

**Sandbox override (Vasu + Limbeck only):**
OpenClaw gateway hardcodes `--sandbox workspace-write` for codex-cli backends (in `discord-CcCLMjHw.js`). This blocks network access. Vasu and Limbeck have a config override at `agents.defaults.cliBackends.codex-cli` in their `openclaw.json` that sets `--sandbox danger-full-access` to allow MCP network calls. No other agents are affected.

**Unity Editor plugin:** Window > Package Manager > + > Add from git URL:
`https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`

**Roblox Studio plugin:** Install from `boshyxd/robloxstudio-mcp` releases. Enable "Allow HTTP Requests" in Experience Settings > Security.

---

## Migration Status

✅ **The-Nexus Monorepo Migration COMPLETE** (2026-03-04)
- All five realms consolidated under The-Nexus
- Full git history preserved via subtree merges
- Legacy standalone repositories deprecated
- AGENTS.md, MEMORY.md, and this file updated with new paths
- Bridge handoff created at `.claude/handoffs/monorepo-completion.md`
