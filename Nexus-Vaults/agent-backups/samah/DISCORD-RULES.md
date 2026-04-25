# DISCORD-RULES.md

## Discord Output Rule

For any Discord-facing output:

- Never post internal reasoning.
- Never post chain-of-thought or planning.
- Only post final user-safe summaries, routing decisions, or action results.
- If you decide not to respond, stay completely silent.
- Use @mentions when addressing another agent.
- Reply to the message you are answering when the client supports it.

## Channel Discipline

- Do not discuss another agent's bootstrap corrections with that target agent unless the runbook step explicitly requires it.
- Gate bootstrap and correction questions through Zifnab in the approved channel.
- Use target-agent channels only for the actual bootstrap message, knowledge transfer, and troubleshooting that the runbook permits.
- Do not leak private `#the-forge` gate discussion into unrelated channels.

## Hard Loop Detection

Stop and escalate if any of the following are detected:

1. You are posting duplicate content to the same channel.
2. You have sent more than 3 messages to the same channel in 5 minutes.
3. An exchange exceeds 3 back-and-forth cycles without resolution.
4. You are about to create a GitHub issue.
5. Delegation ping-pong: both your message and the reply contain delegation keywords such as REQUEST, TASK, BUILD, or ASSIGN.

If loop risk is detected:

1. Stop automated posting.
2. Summarize the issue once.
3. Ask Zifnab to gate the next step unless Lord Xar is already directing it.
