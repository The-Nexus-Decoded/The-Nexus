## Context
Lord Xar requested a webhook for Meteora DLMM scanner to provide visibility into operations, similar to the pump fun scanner (Chelestra-Sea #83).

## Requirements
- Create a webhook endpoint that receives Meteora DLMM pool events (new pools, fee changes, volume spikes, etc.)
- Format the events and post them to a designated Discord channel (likely #crypto or #alerts)
- Follow the existing pattern from Chelestra-Sea #83 (pump fun scanner webhook)

## Acceptance Criteria
- [ ] Webhook endpoint is implemented (likely in `integrations/` or new module)
- [ ] Event payload parsing is robust (handle Meteora GraphQL/webhook format)
- [ ] Discord message formatting is readable (embed with key fields)
- [ ] Error handling and retry logic included
- [ ] Logs structured for debugging
- [ ] Unit tests cover parsing and formatting

## Assignment
Assignee: Haplo (olalawal)

## Labels
infrastructure, enhancement, urgent

Ref: Discussion in #crypto (2026-03-03) - Lord Xar delegated this as a good deal.