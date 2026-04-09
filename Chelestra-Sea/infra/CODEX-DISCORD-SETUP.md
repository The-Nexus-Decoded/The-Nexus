# Codex Discord MCP Setup

This guide sets up Discord access for Codex CLI using an MCP server.

This is not the same integration model as Claude Code's Discord channel relay.
Codex can use Discord tools through MCP to read messages, inspect servers and channels, and send messages into Discord. Codex does not currently expose the Claude-style `/plugin install`, `/discord:configure`, `/discord:access`, or `--channels plugin:discord@...` flow.

## What You Get

- Codex can read Discord message history through MCP tools.
- Codex can send messages into Discord through MCP tools.
- Codex can inspect guilds, channels, members, and related Discord metadata.
- Messages sent by Codex appear in Discord as normal bot messages.

## What You Do Not Get

- Inbound Discord messages do not appear as a live Codex chat session the way they do in Claude's Discord relay.
- There is no native Codex equivalent of `claude --channels plugin:discord@claude-plugins-official`.
- There is no Codex-side `/discord:access` pairing flow in the local CLI surface.

If the goal is "Codex can talk into Discord and read Discord state", this setup works.
If the goal is "Discord becomes the primary Codex conversation UI", this setup does not currently provide that.

## Recommended Bot Model

Use a dedicated Discord bot for Codex.

- Do not reuse the Claude relay bot token unless you intentionally want both tools sharing one bot identity.
- Give Codex its own bot token, channel permissions, and operational identity.
- Keep the token out of the repo and out of committed config files.

## Prerequisites

- Discord Developer Portal access: `https://discord.com/developers/applications`
- Codex CLI installed and working
- `uv` installed locally
- Local checkout of the Discord MCP server
- Access to the target Discord guild

## Phase 1: Create The Discord Bot

- [ ] Go to the Discord Developer Portal.
- [ ] Create a new application for the Codex bot persona.
- [ ] Add a bot user.
- [ ] Copy the bot token and store it in a password manager or vault immediately.
- [ ] Enable all required privileged intents:
- [ ] `MESSAGE CONTENT INTENT`
- [ ] `SERVER MEMBERS INTENT`
- [ ] `PRESENCE INTENT`
- [ ] Use OAuth2 URL Generator to invite the bot to the target guild.
- [ ] Grant the bot the permissions it needs at minimum:
- [ ] Send Messages
- [ ] Read Message History
- [ ] Read Messages / View Channels
- [ ] Add Reactions
- [ ] Attach Files
- [ ] Use External Emojis

## Phase 2: Prepare The Discord MCP Server

This environment already uses the Python `mcp-discord` server pattern.

Reference server:
- `H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord`

Expected launch shape:

```powershell
uv --directory H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord run mcp-discord
```

If you need to bootstrap a fresh checkout:

```powershell
git clone https://github.com/hanweg/mcp-discord.git H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord
cd H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord
uv venv
uv pip install -e .
```

## Phase 3: Register The MCP Server In Codex

Codex supports MCP servers directly. The simplest path is `codex mcp add`.

Example:

```powershell
codex mcp add discord --env DISCORD_TOKEN=your_bot_token_here -- uv --directory H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord run mcp-discord
```

You can inspect the configured server with:

```powershell
codex mcp list
codex mcp get discord
```

## Phase 4: Persist Configuration In `~/.codex/config.toml`

Codex stores MCP configuration in:

- `C:\Users\<you>\.codex\config.toml` on Windows

Expected TOML shape:

```toml
[mcp_servers.discord]
command = "uv"
args = ["--directory", 'H:\Projects\AI_Tools_And_Information\mcp-servers\mcp-discord', "run", "mcp-discord"]

[mcp_servers.discord.env]
DISCORD_TOKEN = "your_bot_token_here"
```

Rules:

- Never commit the real token.
- Keep the token only in local user config.
- Prefer a dedicated bot token for Codex.

## Phase 5: Verify Codex Sees The Server

Use Codex MCP inspection commands:

```powershell
codex mcp list
codex mcp get discord
```

You should see:

- the `discord` server registered
- `transport: stdio`
- command `uv`
- args pointing at `mcp-discord`
- masked `DISCORD_TOKEN`

## Phase 6: Verify The Discord Bot Connection

Start a Codex session after the MCP server is configured.

Then test through Codex:

- Ask Codex to list Discord servers.
- Ask Codex to get channels for the target guild.
- Ask Codex to read recent messages from a known test channel.
- Ask Codex to send a test message into that channel.

Representative tool-backed requests:

- "Use the Discord MCP to list servers."
- "Use the Discord MCP to read the last 10 messages in channel `<channel_id>`."
- "Use the Discord MCP to send a message to channel `<channel_id>` saying `Codex Discord MCP is online.`"

## Phase 7: Operational Notes

- Codex uses Discord through tools, not through a live Discord-native chat surface.
- If you want visible Discord output, have Codex use `send_message`.
- If you want Codex to see recent context from Discord, have Codex use `read_messages`.
- This is a pull/send model, not a push/relay model.

## Common Failure Modes

| Problem | Likely Cause | Fix |
|---|---|---|
| `codex mcp list` does not show `discord` | MCP server not registered | Re-run `codex mcp add ...` or fix `config.toml` |
| `discord` is registered but not usable | Bad `uv` path or bad `mcp-discord` checkout | Verify the server path and run command manually |
| Discord bot appears offline | Token invalid or bot not invited | Re-check token and guild invite |
| Tools load but messages fail | Missing Discord permissions | Re-check bot permissions in the guild |
| Codex can send messages but does not "receive chats" | Expected limitation | Codex MCP is not Claude's inbound Discord relay |
| Shared bot identity causes confusion | Claude and Codex use same token | Split into separate bot identities |

## Recommended Next Step For This Repo

Treat this document as the source of truth for Codex Discord access in the monorepo.

If the owner later wants true inbound Discord-to-Codex chat sessions, that will require a separate bridge design or a different runtime surface than the current Codex CLI MCP model.
