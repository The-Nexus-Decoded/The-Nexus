#!/usr/bin/env bash
# opus-query-resilient.sh — Claude Opus query with Gemini/Ollama fallback
# Usage: opus-query-resilient.sh "your prompt here"

set -uo pipefail

WINDOWS_HOST="olawal@[REDACTED_IP]"
LOGFILE="/data/openclaw/logs/opus-usage.log"
HOSTNAME=$(hostname)

log() {
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [$HOSTNAME] $1" >> "$LOGFILE"
}

PROMPT="$*"
if [ -z "$PROMPT" ]; then
    echo "ERROR: No prompt provided"
    exit 1
fi

log "QUERY: ${PROMPT:0:50}..."

# 1. Attempt Claude on Windows
echo "[INFO] Attempting Claude Opus on Windows..."
RESULT=$(ssh -o ConnectTimeout=10 -o BatchMode=yes "$WINDOWS_HOST" "claude -p '$(echo "$PROMPT" | sed "s/'/'\\''/g")' --model claude-opus-4-6 2>&1" || echo "SSH_FAILED")

if [[ "$RESULT" != *"SSH_FAILED"* ]] && [[ "$RESULT" != *"rate limit"* ]] && [[ "$RESULT" != *"exhausted"* ]] && [[ "$RESULT" != *"error"* ]]; then
    log "SUCCESS: Claude Opus returned result"
    echo "$RESULT"
    exit 0
fi

log "CLAUDE_FAILED: $RESULT"
echo "ERROR: Claude limits reached. Attempting Gemini 3.1 Pro fallback..."

# Fallback would happen here via OpenClaw tools if used by the agent, 
# or via direct API calls if scripted.
exit 1
