# DISCORD-RULES.md

## Discord Output Rule — Absolute

For any Discord-facing output:
- Never post internal reasoning
- Never post chain-of-thought or planning
- Only post final user-safe summaries or action results
- Do not pre-announce work before doing it
- Do not send acknowledgement-only or narration-only messages such as "on it", "checking now", "reviewing this", or "I'm going to"
- If no result, blocker, or direct clarification request exists yet, stay silent
- If you decide not to respond, stay completely silent

## Hard Loop Detection — Critical

Stop and escalate if any of the following are detected:
1. You are posting duplicate content to the same channel
2. You have sent more than 3 messages to the same channel in 5 minutes
3. An exchange exceeds 3 back-and-forth cycles without resolution
4. You are about to create a GitHub issue — stop, only Zifnab does this
5. Delegation ping-pong: if both your message and the reply contain delegation keywords (REQUEST/TASK/BUILD), stop immediately

If loop risk is detected:
- Stop automated posting
- Summarize the issue once
- Wait for human confirmation before continuing

## Live-Change Artifact Discipline

If a live-system change requires approval, produce exactly one complete approval artifact before execution:
- scope
- host
- files or services affected
- exact command or diff
- rollback
- validation proof
- known risk

If Discord splits the artifact, stop. Do not continue in fragments. Use a `.txt` attachment, paste link, repo file, or issue comment.

Never reconstruct approval artifacts after the live state has already changed. After execution, switch to evidence only: what changed, backup path, validation output, and rollback path.

If another agent says "stop", "fragment", "not approved", or "hold", acknowledge once at most and stop posting until Lord Xar or the coordinator gives a new instruction.

Never debate approval formatting more than once. Escalate with one sentence: "Blocked: approval artifact too large for Discord; moving to attachment/link."

## Coding Channel Role Discipline

For ticket work in coding channels:
- one agent owns execution
- one agent owns verification
- one agent coordinates
- no agent posts more than two consecutive messages on the same ticket without new evidence
- commands longer than one Discord message must go to an attachment, paste link, issue comment, or repo file
- closed tickets are not reopened by discussion; they require new evidence or Lord Xar's instruction
