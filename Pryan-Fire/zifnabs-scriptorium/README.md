# zifnabs-scriptorium

Zifnab's domain. Orchestration, monitoring, and coordination scripts for the OpenClaw homelab.

Deploys to: **ola-claw-main** (Zifnab)

## Contents

- `scripts/` — Orchestration and automation scripts
- `monitoring/` — Health checks, quota monitor, ntfy alert scripts
- `coordination/` — Delegation protocol, agent coordination logic
- `workflows/` — Lobster pipelines for multi-agent coordination

## Claude Code Session Orchestration

These workflows enable running multiple Claude Code sessions concurrently on the Windows workstation via background SSH sessions.

### Single-Session Orchestrator

**Workflow:** `workflows/claude-session-orchestrator.lobster`

Spawning a single Claude Code session with monitoring and notification.

**Parameters:**
- `task_description` (string) — The task to send to Claude Code.
- `workdir` (string, optional) — Windows working directory. Default: `H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_TOOLS_And_INFORMATION/homelab_archives/`

**Behavior:**
1. SSH to Windows workstation and start `claude` in the background.
2. Poll for 30s to confirm session launch.
3. Report the session ID to Zifnab in `#jarvis`.

### Multi-Session Pool

**Workflow:** `workflows/claude-session-pool.lobster`  
**Helper script:** `scripts/claude-session-pool.sh`

Run many Claude Code tasks concurrently with controlled parallelism.

**Parameters:**
- `tasks` (array of strings) — Task descriptions to execute.
- `max_concurrent` (integer, default: 3) — Maximum parallel sessions.

**How it works:**
- The workflow writes the tasks array to a temporary file (one task per line).
- Calls `claude-session-pool.sh` with the tasks file and max concurrency.
- The shell script uses `xargs -P` to run N tasks in parallel, each invoking `claude-session-orchestrator.lobster` via `lobster run`.
- Each task logs to `logs/task-<timestamp>-<pid>.log`.
- The pool waits for all tasks to complete and reports a summary.

**Usage example:**

```bash
# Create a JSON array of tasks
tasks='["Task A", "Task B", "Task C"]'

# Run via lobster
lobster run \
  --pipeline /data/repos/The-Nexus/Pryan-Fire/zifnabs-scriptorium/workflows/claude-session-pool.lobster \
  --argsJson "$(jq -n --argjson tasks "$tasks" '{tasks: $tasks, max_concurrent: 2}')"
```

**Notes:**
- The Windows workstation must have passwordless SSH configured (`olawal@100.90.155.49`).
- The Claude CLI must be installed and available in PATH on Windows.
- Logs are written to `logs/` within this directory.

## Integration

To integrate these workflows into job queues or other orchestrators, invoke the pool workflow from any agent with the appropriate task list. The workflows report status to `#jarvis` automatically.
