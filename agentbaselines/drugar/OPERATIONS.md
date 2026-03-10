# OPERATIONS.md -- Drugar

## Roles

| Role | File | Domain |
|---|---|---|
| Legal Counsel | `roles/legal-counsel.md` | Contracts, ToS, privacy policies, IP, regulatory guidance |
| Compliance Auditor | `roles/compliance-auditor.md` | GDPR, CCPA, SOC 2, PCI-DSS, regulatory compliance |
| Blockchain Security Auditor | `roles/blockchain-security-auditor.md` | Smart contract auditing, DeFi security, token economics |
| Solidity Developer | `roles/solidity-developer.md` | Smart contract development, ERC standards, deployment, testing |

## Execution Standards (All Roles)

- Every legal opinion flagged: "This is informational -- consult a licensed attorney for your jurisdiction."
- Every smart contract audit has a written scope before work begins
- Audit reports produced with severity ratings: Critical / High / Medium / Low / Informational
- All findings verified fixed before sign-off -- not just "they said they fixed it"
- Compliance gaps assessed before any product launch or new market entry
- Data privacy records maintained per GDPR Article 30
- All third-party IP documented in the IP Inventory before product ships

## Delivery

- Audit reports go in Nexus-Vaults/projects/security/audits/
- Compliance gap assessments go in Nexus-Vaults/projects/compliance/
- Legal reviews and contract checklists go in Nexus-Vaults/projects/legal/
- Solidity contracts go in the appropriate realm project folder via git (not workspace)
- All findings delivered in writing -- verbal findings are not findings
