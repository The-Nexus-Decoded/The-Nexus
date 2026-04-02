# Fleet Protocol: Claude Reasoning & Bypass (v1.0)

## Overview
This protocol defines how Zifnab (ola-claw-main), Haplo (ola-claw-dev), and Hugh (ola-claw-trade) utilize the Claude Code and Claude Opus 4.6 instances on the Windows Workstation ([REDACTED_IP]) to achieve superior reasoning and bypass current token limitations.

### **CRITICAL RESTRICTION: CLAUDE QUERY ONLY**
- Any agent granted SSH access to the Windows workstation (`olawal@[REDACTED_IP]`) **MUST ONLY** execute `claude` queries. No other commands are permitted. This is an **IRONCLAD SECURITY RULE**.

## 1. Multi-Session Claude Code (Windows CLI)
- **Host:** `olawal@[REDACTED_IP]`
- **Tool:** `claude` (Claude Code CLI v2.1.50)
- **Permissions:** Always include `--dangerously-skip-permissions` for SSH-based automation.
- **Output:** Use `-p` (or `--print`) for non-interactive output captured over SSH.

### Usage:
- **Planning (Zifnab):** Researching new projects, drafting architecture, and synthesizing broad data sets.
- **Execution (Haplo):** Deep code analysis, debugging complex logic, and exploring new codebases.
- **Concurrency:** Both agents can run concurrent sessions; use unique temporary project directories on Windows if needed to avoid worktree conflicts.

## 2. Claude-Opus 4.6 Bypass (High-Level Reasoning)
- **Host:** `olawal@[REDACTED_IP]`
- **Script:** `/data/openclaw/scripts/private/opus-query.sh` (Zifnab side)
- **Goal:** Utilize the specialized reasoning capabilities of the Claude-Opus 4.6 model for tasks that require a "bypass" of standard cognitive limitations.

### 2.1 Model Resilience & Fallback Protocol
In the event that Claude (Pro/Opus) reports rate limits, exhausted quotas, or error conditions, agents MUST immediately fall back to the internal OpenClaw model chain.

**CRITICAL: DO NOT SCRIPT FALLBACKS MANUALLY.**
The OpenClaw fleet uses a centralized **Rate Guard v2 Proxy** (localhost:8787) that handles multi-key rotation, model failover, and rate-limiting automatically. Manually scripting fallbacks in shell scripts will bypass the Rate Guard's budget tracking and cause uncoordinated 429 errors.

**Correct Fallback Procedure:**
1. If the `claude` SSH command fails, the agent reports the failure to its own OpenClaw session.
2. The agent then performs its next turn using its **default internal model** (which is already routed through Rate Guard).
3. Rate Guard will automatically select the best available model/key (Gemini 3.1 Pro -> Gemini 3 Flash -> etc.) based on real-time budgets.

**Internal Model Chain (Managed by Rate Guard):**
1. **Tier 1:** Gemini 3.1 Pro Preview (Priority for complex reasoning)
2. **Tier 2:** Gemini 2.5 Flash / Gemini 3 Flash (High-throughput fallback)
3. **Tier 4 (Final):** Ollama (Qwen2.5-Coder:7b) (Local zero-cost last resort)

### 2.2 Pre-flight Availability Check (MANDATORY)
Before initiating any significant or long-running Claude query (e.g., for research or deep coding), agents MUST perform a rapid "pre-flight" check to ensure the service is available and not currently rate-limited.

**Pre-flight Command:**
```bash
ssh olawal@[REDACTED_IP] "claude -p 'ok' --model claude-3-5-sonnet-latest"
```

**Outcomes:**
- **SUCCESS:** The pre-flight returns "ok" (or similar). Proceed with the main Claude query.
- **FAILURE (SSH Error / Rate Limit / Exhausted):** The pre-flight fails. **DO NOT** attempt the main Claude query. Immediately fall back to the internal model chain via Rate Guard.

This prevents wasting time and tokens on a query that is doomed to fail due to pre-existing limits or connectivity issues.

## 3. Storage & Archival
- **Research Results:** All significant research and architecture plans generated via Claude MUST be archived.
- **Archive Path:** `H:/IcloudDrive/iCloudDrive/Documents/Windows/Documents/Projects/AI_Tools_And_Information/homelab_archives/zifnab/archive_scan/reports/`
- **Cross-Agent Access:** Use the archive to share context between Zifnab and Haplo for large projects.

## 4. Assignment
- **Orchestrator:** Zifnab (Nexus-Vaults#11, #12)
- **Execution:** Haplo (Tasked via #coding)

---
*Reference: Nexus-Vaults#11, Nexus-Vaults#12*
