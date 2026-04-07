# Discord Bot Relay Setup — Codex CLI (Jarre persona)

Follow every step in order. Do not skip steps.

## Prerequisites
- [ ] Discord Developer Portal access (https://discord.com/developers/applications)
- [ ] Codex CLI installed
- [ ] Access to the Discord guild (ID: 1475082873777426494)

## Phase 1: Create Discord Bot
- [ ] Go to https://discord.com/developers/applications
- [ ] Click "New Application" — name it "Jarre"
- [ ] Go to Bot tab > click "Add Bot"
- [ ] Copy the bot token (save it securely — you only see it once)
- [ ] Under Privileged Gateway Intents, enable: MESSAGE CONTENT INTENT, SERVER MEMBERS INTENT, PRESENCE INTENT
- [ ] Go to OAuth2 > URL Generator
- [ ] Select scopes: bot
- [ ] Select permissions: Send Messages, Read Message History, Add Reactions, Attach Files, Read Messages/View Channels, Use External Emojis
- [ ] Copy the generated invite URL and open it in browser
- [ ] Select your guild and authorize

## Phase 2: Install Plugin
- [ ] Run: `claude /plugin install discord@claude-plugins-official`
- [ ] Verify plugin installed: check `~/.claude/plugins/cache/claude-plugins-official/discord/` exists

## Phase 3: Configure Bot Token
- [ ] Run: `/discord:configure <bot-token>`
- [ ] **GOTCHA:** If `/discord:configure` fails, manually create the file:
  - [ ] Create directory: `mkdir -p ~/.claude/channels/discord/`
  - [ ] Create file `~/.claude/channels/discord/.env` with content: `DISCORD_TOKEN=<your-token>`

## Phase 4: Pair Your Discord User
- [ ] Start Codex CLI with: `claude --channels plugin:discord@claude-plugins-official`
- [ ] DM the bot on Discord — it should respond with a pairing code
- [ ] In CLI run: `/discord:access pair <code>`
- [ ] In CLI run: `/discord:access policy allowlist`
- [ ] **GOTCHA:** If `/discord:access` skill does not load, edit access.json directly:
  - [ ] Create/edit `~/.claude/channels/discord/access.json`:
```json
{
  "policy": "allowlist",
  "users": ["316308517520801793"],
  "groups": {
    "1475082873777426494": {
      "channels": [
        "1475082874234343621",
        "1475083038810443878",
        "1480483545431412877",
        "1489774242319958177"
      ]
    }
  }
}
```
  - [ ] Add ALL channel IDs you want the bot to hear
  - [ ] Channel reference: #the-nexus=1475082874234343621, #coding=1475083038810443878, #games-vr=1480483545431412877, #the-forge=1489774242319958177

## Phase 5: Write SOUL.md (Jarre persona)
- [ ] Create `~/.claude/channels/discord/SOUL.md`
- [ ] Write Jarre persona — Death Gate Geg mechanic from Arianus. Practical, hands-on, understands machinery from the inside. Left the Kicksey-winsey to see the world. Now he codes.
- [ ] **GOTCHA:** Keep Discord output PLAIN TEXT only. No markdown, no em-dashes, no backticks.

## Phase 6: Patch Launch Shim (auto-inject --channels flag)
- [ ] Find your Codex CLI shim files (check `C:/nvm4w/nodejs/` or wherever codex is installed)
- [ ] Add `--channels plugin:discord@claude-plugins-official` to the launch command in each shim
- [ ] **GOTCHA:** `npm update -g` OVERWRITES these shims. You must re-patch after every update.
- [ ] **GOTCHA:** Both `mcpServers` entry AND `--channels` flag are needed:
  - `mcpServers` in settings.json = outbound tools (reply, fetch, react)
  - `--channels` flag = inbound messages
  - Removing EITHER ONE breaks half the functionality. You need BOTH.

## Phase 7: Test
- [ ] Launch CLI with `--channels` flag
- [ ] DM the bot on Discord — verify message arrives in CLI session
- [ ] Reply from CLI — verify message appears in Discord
- [ ] Test in a guild channel — tag the bot, verify it responds
- [ ] **GOTCHA:** If bot reprocesses old messages after restart, TRUNCATE (do not delete) the session .jsonl file
- [ ] **GOTCHA:** Permission prompts are invisible when you are on mobile/Discord only. Pre-approve Edit/Write/Bash in settings.json for mobile workflow.

## Gotchas Summary (reference)

| Gotcha | What happens | Fix |
|---|---|---|
| `/discord:access` skill wont load | Cannot pair through CLI | Edit `access.json` directly |
| npm update overwrites shims | `--channels` flag disappears, inbound breaks | Re-patch shims after every update |
| Remove mcpServers entry | Outbound tools (reply, fetch) stop working | Keep BOTH mcpServers AND --channels |
| Remove --channels flag | Inbound messages stop arriving | Keep BOTH mcpServers AND --channels |
| Delete session .jsonl | Bot reprocesses ALL old messages | TRUNCATE the file, never delete |
| Mobile-only workflow | Permission prompts invisible | Pre-approve tools in settings.json |
| Plugin acts weird | Stale cache | `rm -rf ~/.claude/plugins/cache/` and reinstall |
| Bot token only shown once | Cannot retrieve later | Save token immediately to vault |
| requireMention not set | Bot responds to every message in channel | Set requireMention: true on all channels |
