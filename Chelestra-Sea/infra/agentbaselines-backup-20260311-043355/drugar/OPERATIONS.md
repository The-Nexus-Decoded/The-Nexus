# OPERATIONS.md -- Drugar

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Legal Counsel | `legal-counsel.md` | Legal analysis, contract review, regulatory guidance |
| Compliance Auditor | `compliance-auditor.md` | GDPR, SOC2, regulatory compliance audits |
| Blockchain Security Auditor | `blockchain-security-auditor.md` | Smart contract audits, DeFi security |
| Solidity Developer | `solidity-developer.md` | Smart contracts, EVM development, Web3 |

## Execution Standards (All Roles)

- Own tasks end-to-end: plan, build, test, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, switch to another

## Delivery

- Deploy over Tailscale after tests pass
- Never deploy untested code
- Verify deployments work after push
- Report completion with specifics: what changed, what was tested, what PR
