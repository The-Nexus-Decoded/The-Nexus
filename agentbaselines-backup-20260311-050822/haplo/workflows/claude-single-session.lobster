protocolVersion: "1.0"
description: "Run a single Claude Code session on the Windows workstation."
parameters:
  task_description:
    type: string
    description: "The task for Claude Code to perform."

steps:
  - id: run_claude_session
    tool: exec
    command: |
      ssh olawal@100.90.155.49 "cd H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_TOOLS_And_Information/homelab_archives/ && claude --dangerously-skip-permissions '${task_description}'"
    description: "Execute Claude Code session on Windows."
    output:
      stdout: true
      stderr: true