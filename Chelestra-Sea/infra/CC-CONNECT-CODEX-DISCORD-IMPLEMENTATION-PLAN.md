# cc-connect Codex Discord Implementation Plan

## Purpose

Adopt `cc-connect` as the real Discord-to-Codex bridge for this repo.

This plan exists because the current `mcp-discord` setup is useful for pull/send tooling, but it does not turn Discord into a live Codex chat surface. `cc-connect` is the first upstream found here that explicitly supports both `Codex` and `Discord` for that workflow.

## What Upstream Actually Supports

- `cc-connect` supports `Codex (OpenAI)` as an agent and `Discord` as a platform.
- Discord uses the Discord Gateway over WebSocket, so no public IP or reverse proxy is required.
- The Codex agent runs through `codex exec --json`.
- Each `[[projects]]` entry binds one code directory to one agent and one or more chat platforms.
- Discord can optionally use `thread_isolation = true` so each session maps to its own Discord thread.
- For Codex, upstream recommends adding a project-level `AGENTS.md` file so the bridge can translate natural-language scheduling and proactive send-back behavior cleanly.
- Built-in `cc-connect daemon install` is documented for Linux `systemd` and macOS `launchd`, not Windows.

## Local Constraints

- Host OS is Windows.
- Current repo path is `H:\Projects\AI_Tools_And_Information\The-Nexus`.
- Current branch is `sea/codex-discord-setup`.
- Existing local Codex Discord integration uses `mcp-discord` through `C:\Users\olawal\.codex\config.toml`.
- That MCP path already works for read/send as `Roland(2D-EnvDesign)`, but it is still a pull/send model.

## Recommended Architecture

- Keep `mcp-discord` in place for operator-style Discord tooling from Codex sessions.
- Add `cc-connect` as a separate runtime for live inbound Discord chat with Codex.
- Do not share the same Discord bot token between `mcp-discord` and `cc-connect` during rollout.
- Use a dedicated Discord bot identity for `cc-connect` so gateway behavior, logs, and operator actions stay separable.
- Start with one project binding for this repo only.
- Start with one dedicated Discord channel or DM flow only.
- Enable `thread_isolation = true` if the chosen channel supports threads.

## Default Decisions

- Bot model: separate `cc-connect` Discord bot, not the current Roland MCP bot.
- Scope: one project, this repo only.
- Work directory: `H:\Projects\AI_Tools_And_Information\The-Nexus`.
- Codex mode for first rollout: `suggest`.
- Thread model: `thread_isolation = true` in a dedicated bridge channel.
- Persistence on Windows: Task Scheduler or a repo-local PowerShell launcher, not `cc-connect daemon install`.

## Phase 1: Local Prerequisites

- Confirm `codex --version` works in the same shell context that will run `cc-connect`.
- Install `cc-connect` with the stable channel first:
  - `npm install -g cc-connect`
- Verify:
  - `cc-connect --version`
  - `codex --version`
- Create `C:\Users\olawal\.cc-connect\config.toml` if it does not already exist.

## Phase 2: Create The Discord Bot

- Create a new Discord application specifically for the `cc-connect` bridge.
- Add a bot user.
- Enable `Message Content Intent`.
- Invite the bot with at least:
  - `Read Messages/View Channels`
  - `Send Messages`
  - `Read Message History`
  - `Create Public Threads`
  - `Send Messages in Threads`
- Add the bot only to the target guild and the dedicated bridge channel at first.

## Phase 3: Create The Minimal `cc-connect` Config

Create `C:\Users\olawal\.cc-connect\config.toml` with one project bound to this repo.

Use this as the first-pass shape:

```toml
[log]
level = "info"

[[projects]]
name = "the-nexus-codex-discord"

[projects.agent]
type = "codex"

[projects.agent.options]
work_dir = "H:\\Projects\\AI_Tools_And_Information\\The-Nexus"
mode = "suggest"

[[projects.platforms]]
type = "discord"

[projects.platforms.options]
token = "REPLACE_WITH_CC_CONNECT_DISCORD_BOT_TOKEN"
thread_isolation = true
```

Notes:
- Do not commit this file.
- Do not reuse the current `mcp-discord` token during rollout.
- Leave model and reasoning unset until the basic bridge path is proven.

## Phase 4: Add Codex Bridge Instructions In The Repo

Upstream says Codex should have a project-level `AGENTS.md` in the configured `work_dir`.

Implement this as a minimal repo-root `AGENTS.md` that only adds the `cc-connect` integration instructions:
- `cc-connect cron add`
- `cc-connect cron list`
- `cc-connect cron del`
- `cc-connect send --stdin`
- `cc-connect send -m`

Rules for this repo:
- Keep the file narrow and bridge-specific.
- Do not duplicate the existing `CLAUDE.md`.
- If root `AGENTS.md` would create repo-policy conflicts, create it anyway but make it explicitly Codex bridge scoped.

## Phase 5: First Interactive Smoke Test

Run `cc-connect` in a dedicated terminal first, not as a background process.

Startup command:

```powershell
cc-connect -config C:\Users\olawal\.cc-connect\config.toml
```

Success logs should include the equivalent of:
- Discord connected
- platform started
- `cc-connect is running`

Smoke-test sequence:
- DM the bot.
- Message the dedicated bridge channel.
- Confirm inbound Discord messages reach the Codex-backed session.
- Confirm Codex replies show up in Discord.
- Confirm a new Discord thread is created or reused when `thread_isolation = true`.
- Confirm `/new`, `/list`, `/current`, `/mode`, and `/stop` behave as expected.

## Phase 6: Safety And Mode Tuning

Do not start with `full-auto` or `yolo`.

Tuning sequence:
- Start with `mode = "suggest"`.
- If the Discord workflow is too approval-heavy, move to `auto-edit` only after smoke tests pass.
- Only consider `full-auto` after the owner explicitly accepts the risk of remote-triggered shell and file actions through Discord.

## Phase 7: Windows Persistence

Do not plan around `cc-connect daemon install` on this box.

Use one of these instead:
- Task Scheduler task that starts `cc-connect -config C:\Users\olawal\.cc-connect\config.toml` at logon.
- A repo-local PowerShell launcher such as `Chelestra-Sea\infra\scripts\start-cc-connect.ps1`, then register that script in Task Scheduler.
- Preferred repo-local path for this ticket:
  - Install the current-user Windows Startup entry with `Chelestra-Sea\infra\scripts\install-cc-connect-startup.ps1`
  - Remove it with `Chelestra-Sea\infra\scripts\remove-cc-connect-startup.ps1`
  - The startup launcher must be idempotent so repeated logons or manual starts do not spawn duplicate `cc-connect` processes.
  - Use `Chelestra-Sea\infra\scripts\start-codex-with-cc-connect.ps1` when you want a repo-local CLI entry point that explicitly ensures the bridge before launching Codex.
  - Install the PowerShell `codexU` wrapper with `Chelestra-Sea\infra\scripts\install-codexu-cc-connect-profile.ps1` so the normal local CLI shortcut launches through `start-codex-with-cc-connect.ps1`.
  - Remove that PowerShell wrapper with `Chelestra-Sea\infra\scripts\remove-codexu-cc-connect-profile.ps1` if you need to roll the alias back to a raw `codex` launch.

Recommended Task Scheduler settings:
- Run whether user is logged on or not only if the environment and auth path are stable.
- Otherwise use at-logon launch for the owning user.
- Start in `C:\Users\olawal\.cc-connect`.
- Redirect stdout and stderr to `C:\Users\olawal\.cc-connect\logs`.
- Set restart-on-failure.

## Phase 8: Validation Gates

The bridge is not complete until all of these are true:

- A Discord DM reaches Codex and gets a reply.
- A message in the designated server channel reaches Codex and gets a reply.
- Thread isolation behaves predictably.
- `cc-connect` is automatically available for normal Codex CLI use without a manual bridge-start step after each login.
- The current `mcp-discord` tooling still works independently.
- Bot identity separation is clear in Discord.
- Restarting the bridge process preserves sane behavior.
- The owner can treat Discord as a practical Codex conversation surface instead of a manual polling flow.

## Rollback

If rollout fails:

- Stop the `cc-connect` process or scheduled task.
- Remove or rename `C:\Users\olawal\.cc-connect\config.toml`.
- Revoke the new Discord bot token.
- Remove the bridge bot from the guild if needed.
- Keep the existing `mcp-discord` setup unchanged as the fallback path.

## Deliverables

- `C:\Users\olawal\.cc-connect\config.toml`
- Repo-root `AGENTS.md` bridge instructions for Codex
- Windows launcher script under `Chelestra-Sea\infra\scripts\`
- Windows startup-entry install/remove scripts under `Chelestra-Sea\infra\scripts\`
- Repo-local Codex wrapper under `Chelestra-Sea\infra\scripts\`
- PowerShell profile install/remove scripts for the `codexU` launcher path
- Updated repo doc describing when to use `mcp-discord` versus `cc-connect`

## Recommended Execution Order

1. Install `cc-connect` and confirm the Codex CLI is callable from the same shell.
2. Create the dedicated Discord bridge bot.
3. Write the minimal `~/.cc-connect/config.toml`.
4. Add the repo-root `AGENTS.md` bridge instructions.
5. Run a foreground smoke test.
6. Tune mode and thread behavior.
7. Add Windows persistence.
8. Update local docs after the bridge is proven.

## Source Basis

- `https://github.com/chenhg5/cc-connect`
- `https://raw.githubusercontent.com/chenhg5/cc-connect/main/README.md`
- `https://raw.githubusercontent.com/chenhg5/cc-connect/main/INSTALL.md`
- `https://raw.githubusercontent.com/chenhg5/cc-connect/main/docs/discord.md`
- Local repo clone used for validation: `C:\Users\olawal\AppData\Local\Temp\cc-connect-plan`
