#!/usr/bin/env bash
################################################################################
# Claude Session Pool Manager
#
# Spawns multiple Claude Code sessions concurrently using xargs.
# Each task is executed via the claude-session-orchestrator.lobster workflow.
#
# Usage:
#   claude-session-pool.sh --max-concurrent N --tasks tasks.txt
#
# tasks.txt: newline-separated JSON strings (each is a full task description).
################################################################################

set -euo pipefail

MAX_CONCURRENT=3
TASKS_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-concurrent)
      MAX_CONCURRENT="${2:?missing value}"
      shift 2
      ;;
    --tasks)
      TASKS_FILE="${2:?missing value}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$TASKS_FILE" ]]; then
  echo "Error: --tasks argument is required"
  exit 1
fi

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Error: Tasks file not found: $TASKS_FILE"
  exit 1
  fi

# Resolve repo root (assume script lives in .../zifnabs-scriptorium/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WORKFLOW="$REPO_ROOT/workflows/claude-session-orchestrator.lobster"
LOGDIR="$REPO_ROOT/logs"

# Validate workflow exists
if [[ ! -f "$WORKFLOW" ]]; then
  echo "Error: Workflow not found at $WORKFLOW"
  exit 1
fi

mkdir -p "$LOGDIR"

echo "Claude Session Pool"
echo "-------------------"
echo "Max concurrent: $MAX_CONCURRENT"
echo "Tasks file: $TASKS_FILE"
echo "Workflow: $WORKFLOW"
echo "Log directory: $LOGDIR"
echo ""

# Function to process a single task
run_task() {
  local task_json="$1"
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local logfile
  logfile="$LOGDIR/task-${timestamp}-${BASHPID}.log"

  # Start logging
  {
    echo "=== TASK STARTED ==="
    echo "Timestamp: $(date -u --iso-8601=seconds)"
    echo "Task JSON: $task_json"
    echo "-------------------"

    # Build args JSON for the workflow
    # Use jq to ensure proper JSON encoding
    local args_json
    args_json=$(jq -n --arg desc "$task_json" '{"task_description": $desc}')

    echo "Args JSON: $args_json"
    echo "Running workflow..."

    # Execute the workflow
    if lobster run --pipeline "$WORKFLOW" --argsJson "$args_json"; then
      echo "Task completed successfully."
      exit 0
    else
      echo "Task failed with exit code $?."
      exit 1
    fi
  } &> "$logfile"

  # Also echo to stdout/stderr so xargs can capture
  cat "$logfile"

  return ${PIPESTATUS[0]}
}

export REPO_ROOT WORKFLOW LOGDIR

# Use xargs to manage concurrency
# Read tasks line by line; empty lines and lines starting with # are ignored
failures=0
cat "$TASKS_FILE" | \
  grep -v '^\s*$' | \
  grep -v '^\s*#' | \
  xargs -n1 -P "$MAX_CONCURRENT" -I {} bash -c 'run_task "$1"' _ {} || failures=$?

if [[ $failures -gt 0 ]]; then
  echo "Pool completed with $failures failed task(s)."
  exit 1
else
  echo "Pool completed successfully. All tasks finished."
  exit 0
fi
