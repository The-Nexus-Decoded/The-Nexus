# OpenClaw Discord Channel Access Control

**Purpose:** How to configure which agents can read/respond in each Discord channel.

## Channel Config Structure

In `openclaw.json` under `channels.discord.guilds.<guild_id>.channels.<channel_id>`:

```json
{
  "allow": true,
  "requireMention": true,
  "systemPrompt": "...",
  "roles": ["<role_id>", ...],
  "users": ["<user_id>", ...]
}
```

## Access Rules

An agent can access a channel if **ALL** of the following are satisfied:

1. **`allow: true`** — Channel is enabled for this agent
2. **Role membership** — The agent's Discord user has **at least one** role listed in the `roles` array
3. **User whitelist (optional)** — If `users` array is present, the agent's Discord user ID **must be in that list**
4. **Mentions** — If `requireMention: true`, the agent only responds when @mentioned or when its name appears in the message

### The `users` Whitelist

- If `users` is **absent or empty**, any user with an allowed role can access the channel
- If `users` is **present**, the agent's Discord user ID **must be explicitly listed**
- This is a **hard filter**: even if the role check passes, missing from `users` = no access

### The `roles` Whitelist

- Lists Discord **role IDs** (not names) that are permitted
- The agent's Discord account must have **at least one** of these roles assigned in the server
- Format: `"<@&ROLE_ID>"` in Discord mentions, but in config use just the numeric ID string

## Common Pitfalls

| Symptom | Likely Cause |
|---------|--------------|
| Agent not seeing any messages | `users` array missing the agent's user ID |
| Agent sees messages but doesn't respond | `requireMention: true` and no @mention or name in message |
| Gateway logs show "skipping guild message" with `reason: "no-mention"` | Normal behavior when `requireMention: true` and message doesn't mention the agent |
| Gateway logs show "permission denied" or "not in allowlist" | Role not in `roles` array, or user not in `users` array |
| Changes don't take effect | Gateway not reloaded (use `systemctl --user reload openclaw-gateway` or restart) |

## Debugging Checklist

1. **Check config** (`openclaw.json`):
   - `allow: true`
   - `roles` includes the agent's Discord role ID(s)
   - `users` either absent OR includes the agent's Discord user ID

2. **Verify Discord role assignment**:
   - The agent's Discord user must actually have the role in the server (Discord UI or API)
   - Role ID in config must match exactly

3. **Verify `users` whitelist**:
   - If `users` is set, the agent's user ID must be in that list
   - Mistaking `users` for `roles` is a common error

4. **Check `requireMention`**:
   - If `true`, agent only responds to @mentions or when its name appears in message text
   - Test by explicitly @mentioning the agent

5. **Check gateway logs** (`/data/openclaw/logs/openclaw.log`):
   - Look for "discord: skipping guild message" with reason codes
   - Look for permission/allowlist errors
   - Confirm channel resolution succeeded

6. **Reload gateway** after config changes:
   ```bash
   systemctl --user reload openclaw-gateway
   # or restart if reload doesn't pick up changes
   systemctl --user restart openclaw-gateway
   ```

## Example Configs

### Single agent, unrestricted within role
```json
{
  "1475083038810443878": {
    "allow": true,
    "requireMention": true,
    "roles": ["1475083950501400781"]  // Zifnab's role
    // no "users" means any user with that role can access
  }
}
```

### Multiple roles, user whitelist enforced
```json
{
  "1475083038810443878": {
    "allow": true,
    "requireMention": false,
    "roles": ["1475667296188891350", "1475083950501400781"],
    "users": ["316308517520801793"]  // Only Sterol's user ID
  }
}
```

### Trade channel (Hugh only)
```json
{
  "1475082964156157972": {
    "allow": true,
    "requireMention": true,
    "roles": ["1475667296188891350"],  // HughTheHand role
    "users": []  // empty means any user with that role
  }
}
```

## Role vs User IDs

- **Role ID**: Found in Discord Developer Mode or via mentions `<@&ROLE_ID>`
- **User ID**: Found in Discord Developer Mode or via mentions `<@USER_ID>`
- In config: use plain numeric strings, no angle brackets or @ symbols

## Gateway Reload vs Restart

- **Reload** (`systemctl --user reload openclaw-gateway`): picks up config changes, keeps sessions
- **Restart** (`systemctl --user restart openclaw-gateway`): full restart, clears all sessions
- If an agent still doesn't respond after config fix, restart to clear any cached session state

## Agent-Specific System Prompts

Each channel can have its own `systemPrompt` that overrides the agent's default. This is independent of access control.

## Troubleshooting Flow

1. Is the agent online? Check `fleet sessions` or gateway logs
2. Does `openclaw.json` have `allow: true`? 
3. Is the agent's Discord role in the `roles` array?
4. Is the agent's Discord user in the `users` array (if present)?
5. Is `requireMention` satisfied? @mention the agent explicitly
6. Reload/restart the gateway
7. Check logs for error messages

---

**Last updated:** 2026-03-04  
**Applies to:** OpenClaw v2026.2.22-2
