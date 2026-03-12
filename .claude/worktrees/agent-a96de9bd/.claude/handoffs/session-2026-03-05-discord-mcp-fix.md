# Session Handoff: Discord MCP Fix (2026-03-05)

**Status:** Fix committed, awaiting VS Code restart to test
**Context at pause:** checkpoint save

---

## What We Fixed

**Problem:** `mcp__discord__send_message` (and all other Discord MCP tools) were throwing:
> `Timeout context manager should be used inside a task`

**Root Cause:** The mcp-discord server ran the Discord bot in a separate thread with its own event loop. discord.py 3.11+ uses `asyncio.timeout()` internally, which must run in the same event loop as the calling coroutine. Cross-loop calls = error.

**Fix:** Removed threading entirely. Bot now runs as `asyncio.create_task()` in the same event loop as the MCP stdio server.

**File changed:**
`H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_Tools_And_Information/mcp-servers/mcp-discord/src/discord_mcp/server.py`

**Committed as:** `88b5e98` in the mcp-discord local repo (NOT pushed to upstream — intentional, local fix only)

---

## Next Step

1. Restart VS Code to reload the MCP server with the fix
2. I send test message to #coding channel (ID: `1475083038810443878`) as Alfred
3. Confirm it works

---

## Context: Why We Were Here

Working to get Alfred (Claude bot, Discord ID `1478214532324393010`) active in Discord. The Discord MCP tool is how Alfred sends/reads messages from Windows side. Once this works, Alfred is operational in the server.

---

## Other Pending Work (lower priority)

From the jupiter-fix handoff — still open:
- Ticket #212: Jupiter trade execution fix (rpc_integration.py)
- Close 16 stale/junk issues: #93, #78, #77, #69, #68, #79, #76, #33, #40, #39, #38, #36, #35, #27, #26, #7
- Relabel #31 and #30 from area:sea → area:fire
