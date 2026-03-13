name: claude-session-pool
description: "Orchestrate multiple Claude Code sessions with controlled concurrency. Uses claude-session-pool.sh to manage a pool of single-session workflow runs."
parameters:
  tasks:
    description: "Array of task descriptions to execute via Claude Code"
    type: array
    items:
      type: string
  max_concurrent:
    description: "Maximum number of concurrent Claude Code sessions"
    type: integer
    default: 3
steps:
  - id: prepare_tasks_file
    description: "Write tasks to temporary file for pool script"
    command: |
      TMPFILE=$(mktemp)
      # Expand the tasks JSON array into newline-separated lines using jq (POSIX-compatible)
      echo '${tasks}' | jq -r '.[]' > "$TMPFILE"
      echo "$TMPFILE"
    output:
      stdout: true
    timeoutMs: 10000

  - id: run_pool
    description: "Execute the session pool"
    command: |
      TMPFILE="${prepare_tasks_file.stdout}"
      /data/openclaw/workspace/Pryan-Fire/zifnabs-scriptorium/scripts/claude-session-pool.sh \
        --max-concurrent "${max_concurrent}" \
        --tasks "$TMPFILE"
      rm -f "$TMPFILE"
    timeoutMs: 86400000  # 24h max
    output:
      stdout: true
      stderr: true

  - id: report_completion
    description: "Report pool completion summary to Zifnab"
    command: |
      echo "========================================="
      echo "  CLAUDE SESSION POOL - COMPLETE"
      echo "========================================="
      echo ""
      echo "Max concurrent: ${max_concurrent}"
      echo ""
      echo "Pool output:"
      cat
      echo ""
      echo "Individual session results have been reported separately during execution."
    stdin: $run_pool.stdout
    timeoutMs: 10000
