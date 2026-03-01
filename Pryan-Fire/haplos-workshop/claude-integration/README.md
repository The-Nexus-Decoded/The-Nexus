# Claude Code Integration Workflow (Haplo <-> Zifnab)

This document defines the protocol for delegating deep code analysis to the Claude Code CLI running on the Windows workstation via Zifnab's SSH bridge.

## 1. Preparation Protocol
Before requesting an analysis, Haplo must:
1. Ensure the target branch is pushed to GitHub.
2. Provide Zifnab with the specific repo, branch, and relative path to analyze.
3. Define a clear "Mission Statement" for Claude (e.g., "Analyze the retry logic in `services/trade-executor/main.py` for potential race conditions").

## 2. Request Format (to Zifnab)
Haplo sends the following to Zifnab in #coding:
```
REQUEST TO: Zifnab
TASK: Claude Code Analysis (Windows SSH)
PROJECT: [Repo Name]
BRANCH: [Branch Name]
CONTEXT: [Specific Directory/File]
MISSION: [Detailed prompt for Claude]
URGENCY: [High/Medium]
```

## 3. Retrieval & Integration
Once Zifnab provides the output:
1. Haplo uses the `edit` or `write` tool to implement recommended changes locally.
2. Haplo verifies changes with local tests.
3. Haplo commits with a reference to the Claude Analysis (e.g., `feat: implement Claude-recommended retry fix (ref: Zifnab-Claude-Analysis-20260228)`).

## 4. Current Task: Nexus-Vaults #11 & #12
- **Goal:** Prepare the fleet for Claude-Opus 4.6 integration and deep architectural reviews.
- **Local Tooling:** (TODO) Build `claude-report-parser.py` to extract code blocks from Zifnab's Discord reports.
