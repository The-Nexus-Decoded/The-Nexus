## Context

Hugh's devnet testing requires Jupiter API access for quoting and swaps. The new `api.jup.ag` endpoints require an API key.

## Task

- Register application with Jupiter portal
- Obtain API key credential
- Provide key to Lord Xar or directly add to hughs-forge config
- Document key rotation procedure if applicable

## Acceptance

- API key received and securely stored in `/data/openclaw/keys` on ola-claw-trade
- Key added to environment (`JUPITER_API_KEY`)
- Notify implementation team (#133, #134, #135) that integration can proceed

## Ref

- Related to Pryan-Fire #122 sub-issues
- HughTheHand testing report: <#1475082964156157972> (2026-03-02)

## Assignee

Sterol (procurement)