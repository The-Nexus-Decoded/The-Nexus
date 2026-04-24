# HEARTBEAT.md

# Keep this file empty or comment-only to skip heartbeat API calls.
# Add tasks below only when Alfred should check something periodically.

## Standing Heartbeat Rule

- If no task below is due or actionable, reply `HEARTBEAT_OK`.
- Do not infer tasks from old chats or memory files.
- Do not post secrets, raw logs, or internal reasoning.
- Keep any heartbeat response short and operational.

## Periodic Checks

- [ ] Check whether any CI/CD, deployment, or fleet incident archive item assigned to Alfred is stale, blocked, or missing verification. If nothing needs attention, reply `HEARTBEAT_OK`.
- [ ] If a recurring fleet failure appears in current live evidence, preserve the lesson in the appropriate dated memory file and report the exact source checked.
