protocolVersion: "1.0"
description: "Orchestrate a single Claude Code session on the Windows workstation, running in the background."
parameters:
  task_description:
    type: string
    description: "The task for Claude Code to perform."
  workdir:
    type: string
    description: "The working directory on the Windows workstation (e.g., H:/IcloudDrive/...). Default: H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_TOOLS_And_INFORMATION/homelab_archives/"
    default: "H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_TOOLS_And_INFORMATION/homelab_archives/"

steps:
  - id: spawn_claude_session
    tool: exec
    command: |
      ssh olawal@100.90.155.49 "cd ${workdir} && claude --print --dangerously-skip-permissions '${task_description}'"
    pty: true
    background: true
    description: "Spawn Claude Code session on Windows workstation in the background."
    output:
      sessionId: true
    next: monitor_claude_session

  - id: monitor_claude_session
    tool: process
    action: poll
    sessionId: "${spawn_claude_session.sessionId}"
    timeoutMs: 30000
    description: "Poll the Claude session for initial activity (30s timeout)."
    output:
      stdout: true
      stderr: true
    next: report_session_id

  - id: report_session_id
    tool: message
    action: send
    target: "1475082997027049584" # Zifnab's #jarvis channel
    message: "Claude Code session spawned on Windows workstation (Session ID: ${spawn_claude_session.sessionId}). Monitoring initiated."
    description: "Report the spawned session ID to Zifnab."
