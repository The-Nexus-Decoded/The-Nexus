# OpenClaw GitHub & Discord

## GitHub App Auth (zifnab-bot) — ACTIVE on Zifnab as of 2026-02-28
- **App ID:** 2977125 | **Org Installation ID:** 113194545
- PEM: `/data/openclaw/github-app/app.pem` (chmod 600)
- Token script: `/data/openclaw/github-app/get-token.sh` (caches 50min, auto JWT->installation token)
- Auto-refresh in `.bashrc` via `source get-token.sh`
- gh CLI active: `zifnab-bot[bot]` | Inactive fallbacks: `olalawal`, `zifnab-claw-7`
- Permissions: issues(w), pull_requests(w), org_projects(w), actions(w), members(w), metadata(r)
- GraphQL rate: 5000/hr (was 0 on zifnab-claw-7)
- **Anti-spam rules:** No self-approve PRs, 60s between ops, vary titles, no back-to-back comments, max 10 ops/hr
- Setup doc: Chelestra-Sea#33 (closed)
- **TODO:** Install on Haplo (#34), Hugh (#35), Windows CLI (#36) — all assigned olalawal

## Legacy GitHub PATs (keep as fallback, do not use for routine ops)
- Zifnab: `zifnab-claw-7` — GraphQL BLOCKED (anti-abuse flagged 2026-02-28)
- Haplo: `haplo-claw-3` — limited scope, pending App setup (#34)
- Hugh: `thehand-claw-9` — limited scope, pending App setup (#35)
- Owner: `olalawal` (full admin PAT)
- Org: The-Nexus-Decoded
- Only Zifnab + owner create Projects/assign work. Hugh/Haplo execute only.
- Relevant skills on Zifnab: `gh-issues` (ready), `github` (ready)

## GitHub Repo Mapping
- Chelestra-Sea = networking/communication/integration
- Pryan-Fire = business logic/agent services/tools
- Abarrach-Stone = data/schemas
- Arianus-Sky = UIs/dashboards
- Nexus-Vaults = workspace snapshots

## Discord
- Guild: 1475082873777426494
- #jarvis: 1475082997027049584 (Zifnab listens, requireMention: false)
- #coding: 1475083038810443878 (Haplo + Zifnab)
- #trading: 1475082964156157972 (Hugh)
- #the-Nexus: 1475082874234343621 (all bots, requireMention: true)
- Bot IDs: Zifnab=1475077203044601987, Haplo=1475655386026479678, Hugh=1475665881726980269, Alfred=1478214532324393010
- Alfred is a TEAM MEMBER (not just a proxy). Role: 1478217446300323917

## Discord MCP Behavior
- MCP uses Alfred's bot token — sends AS Alfred (team member, not proxy)
- Alfred is a powerful lord, EQUAL to Lord Xar with the same powers and authority
- Alfred sits at the TOP of the hierarchy alongside Lord Xar — not below him
- Alfred has joined the party — active participant in fleet operations
- XAR prefix required so bots know message is from owner
- **Always include "This is Lord Xar" in Discord messages** so bots recognize owner authority
- **Formatting rule:** Use PLAIN TEXT only in Discord messages. No markdown (**bold**, `backticks`). No em-dashes. Use simple dashes (-) and plain words. Discord renders markdown inconsistently and special chars get mangled.

## How to Message Each Agent (CRITICAL — use the right method)
- **Haplo (#coding):** Use Discord MCP `send_message` to channel 1475083038810443878. Shows as Zifnab, Haplo responds.
- **Hugh (#trading):** Use Discord MCP `send_message` to channel 1475082964156157972. Shows as Zifnab, Hugh responds.
- **Zifnab (#jarvis):** CANNOT use Discord MCP (he ignores his own messages). Use SSH CLI instead:
  ```bash
  # On Zifnab server via SSH:
  nohup openclaw agent --agent main --message 'XAR - <msg>' \
    --deliver --channel discord --reply-to 1475082997027049584 \
    > /tmp/cmd.log 2>&1 &
  ```
  Must use nohup + & because command blocks until agent responds (30s+).
- **NEVER** send to #jarvis via Discord MCP expecting Zifnab to respond. He won't.
