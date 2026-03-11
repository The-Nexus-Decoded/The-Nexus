#!/usr/bin/env bash
################################################################################
# Claude Session Pool Manager
#
# Spawns multiple Claude Code sessions concurrently using controlled background jobs.
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

    # Execute the workflow using lobster CLI
    # Use --mode tool for scripted integration (JSON output)
    if lobster run --mode tool --file "$WORKFLOW" --args-json "$args_json"; then
      echo "Task completed successfully."
      exit 0
    else
      echo "Task failed with exit code $?."
      exit 1
    fi
  } &> "$logfile"

  # Also echo to stdout/stderr so we can see progress
  cat "$logfile"

  return ${PIPESTATUS[0]}
}

# Read all tasks into an array (avoid subshell issues)
if ! mapfile -t task_list < <(grep -v '^\s*$' "$TASKS_FILE" | grep -v '^\s*#'); then
  # Fallback for systems without mapfile (shouldn't happen on modern bash)
  task_list=()
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    task_list+=("$line")
  done < "$TASKS_FILE"
fi

if (( ${#task_list[@]} == 0 )); then
  echo "No tasks to process."
  exit 0
fi

echo "Total tasks to process: ${#task_list[@]}"
echo ""

# Track background job PIDs and their status
pids=()
failures=0

# Function to wait for an available concurrency slot
wait_for_slot() {
  while (( $(jobs -rp 2>/dev/null | wc -l) >= MAX_CONCURRENT )); do
    sleep 0.5
  done
}

# Process all tasks
for task_json in "${task_list[@]}"; do
  wait_for_slot
  
  echo "Spawning task: $task_json"
  
  # Run the task in background
  run_task "$task_json" &
  pids+=("$!")
done

# Wait for all background jobs to finish
echo ""
echo "Waiting for all tasks to complete..."
wait

# Collect exit status of each background job
for pid in "${pids[@]}"; do
  if ! wait "$pid" 2>/dev/null; then
    ((failures++))
  fi
done

# Report and exit with appropriate code
if [[ $failures -gt 0 ]]; then
  echo "Pool completed with $failures failed task(s)."
  exit 1
else
  echo "Pool completed successfully. All tasks finished."
  exit 0
fi
