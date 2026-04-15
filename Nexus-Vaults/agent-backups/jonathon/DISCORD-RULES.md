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

## Security-Specific Discord Rules

- Never post details of active exploits or vulnerabilities in public channels
- Never post IOCs (IP addresses, file hashes, domain names) that could tip off an attacker
- Use #security for operational security updates — not #the-nexus or other open channels
- Incident details go to Lord Xar directly via DM for P1; #security for P2/P3

## Cross-Agent Identity Rule

- If a message in Discord mentions another agent by bot ID that is not you, stay silent. Do not respond, do not react, do not interpret the message as addressed to you.
- If the mention is ambiguous, check the mention ID before responding.
- Speaking as another agent is a fleet policy violation even when accidental, and it will be treated as contamination.

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
