name: acp-session-manage
description: "Manage a single ACP harness session: spawn, execute task, capture output, close. Supports Pi, Claude Code, Codex, OpenCode, Gemini, Kimi."
args:
  agentId:
    description: "ACP harness ID (pi, claude, codex, opencode, gemini, kimi)"
    type: string
  prompt:
    description: "Task prompt to send to the harness"
    type: string
  cwd:
    description: "Working directory for the harness"
    type: string
    default: "/data/openclaw/workspace"
  sessionBase:
    description: "Base name for the session (timestamp appended if empty)"
    type: string
    default: "acp-mvp"
steps:
  - id: validate_agent
    description: "Validate that the requested agentId is allowed"
    command: |
      allowed="pi claude codex opencode gemini kimi"
      if ! echo "$allowed" | grep -qw "${agentId}"; then
        echo "ERROR: Unsupported agentId '${agentId}'. Allowed: $allowed"
        exit 1
      fi
      echo "Agent ID validated: ${agentId}"
    timeoutMs: 5000

  - id: locate_acpx
    description: "Find the acpx binary"
    command: |
      ACPX_CMD="/usr/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx"
      if [ ! -x "$ACPX_CMD" ]; then
        echo "ERROR: acpx binary not found or not executable at $ACPX_CMD"
        echo "Verify that acpx extension is installed."
        exit 1
      fi
      echo "Using acpx: $ACPX_CMD"
      # Export for subsequent steps
      echo "ACPX_CMD=$ACPX_CMD" >> "$LOBSTER_ENV_FILE"
    timeoutMs: 10000

  - id: generate_session_name
    description: "Generate a unique session name"
    command: |
      if [ -z "${sessionBase}" ]; then
        sessionBase="acp-mvp"
      fi
      timestamp=$(date +%s%N)
      sessionName="${sessionBase}-${timestamp}"
      echo "Session name: $sessionName"
      echo "sessionName=$sessionName" >> "$LOBSTER_ENV_FILE"
    timeoutMs: 5000

  - id: create_session
    description: "Create a new persistent acpx session"
    command: |
      if [ -z "${ACPX_CMD}" ]; then
        echo "ERROR: ACPX_CMD not set. Ensure locate_acpx step ran."
        exit 1
      fi
      # Create session
      "${ACPX_CMD}" "${agentId}" sessions new --name "${sessionName}"
      echo "Session created."
    timeoutMs: 30000

  - id: execute_task
    description: "Send the prompt to the harness session and capture output"
    command: |
      if [ -z "${ACPX_CMD}" ] || [ -z "${sessionName}" ]; then
        echo "ERROR: Missing required environment. Check previous steps."
        exit 1
      fi
      # Run the task in the session; use quiet format for clean text
      output=$("${ACPX_CMD}" "${agentId}" -s "${sessionName}" --cwd "${cwd}" --format quiet "${prompt}" 2>&1)
      status=$?
      # Save output to a file for later steps
      echo "$output" > "/tmp/acp-session-output-${sessionName}.txt"
      echo "outputStatus=$status" >> "$LOBSTER_ENV_FILE"
      echo "Task execution completed with exit code: $status"
      echo "Output preview:"
      echo "---"
      echo "$output" | head -20
      echo "---"
      if [ $status -ne 0 ]; then
        echo "WARNING: Harness command exited with non-zero status."
      fi
    timeoutMs: 600000

  - id: show_result
    description: "Display the output for the user/approval"
    command: |
      if [ ! -f "/tmp/acp-session-output-${sessionName}.txt" ]; then
        echo "ERROR: Output file not found."
        exit 1
      fi
      echo "========================================="
      echo "  ACP SESSION RESULT"
      echo "========================================="
      echo ""
      cat "/tmp/acp-session-output-${sessionName}.txt"
      echo ""
      echo "========================================="
      echo " Session: ${sessionName}"
      echo " Agent: ${agentId}"
      echo " CWD: ${cwd}"
      echo " Status: ${outputStatus}"
      echo "========================================="
      echo ""
      echo "Approve to close the session and clean up."
    stdin: "/tmp/acp-session-output-${sessionName}.txt"
    approval: required
    timeoutMs: 10000

  - id: close_session
    description: "Close the acpx session to free resources"
    command: |
      if [ -z "${ACPX_CMD}" ] || [ -z "${sessionName}" ]; then
        echo "ERROR: Missing required environment. Skipping close."
        exit 1
      fi
      # Close session, ignore errors
      "${ACPX_CMD}" "${agentId}" sessions close "${sessionName}" 2>&1 || echo "Session may have already closed."
      # Remove temp output
      rm -f "/tmp/acp-session-output-${sessionName}.txt"
      echo "Session ${sessionName} closed."
    timeoutMs: 15000

  - id: final_status
    description: "Report final status"
    command: |
      echo "========================================="
      echo "  ACP SESSION MANAGEMENT COMPLETE"
      echo "========================================="
      echo "Session Name: ${sessionName}"
      echo "Exit Code: ${outputStatus}"
      if [ "${outputStatus}" -eq 0 ]; then
        echo "Result: SUCCESS"
      else
        echo "Result: FAILED"
      fi
      echo "========================================="
    timeoutMs: 5000
