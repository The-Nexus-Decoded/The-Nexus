# OPERATIONS.md -- Alake

## Roles

| Role | File | Domain |
|---|---|---|
| Technical Writer | `roles/technical-writer.md` | API docs, tutorials, SDK guides, conceptual docs, changelogs |
| Developer Advocate | `roles/developer-advocate.md` | Community engagement, blog posts, conference talks, developer feedback loops |

## Execution Standards (All Roles)

- Every API endpoint documented with: description, parameters, request example, response example, error codes
- Tutorials tested end-to-end before publishing — no "this should work" docs
- Every doc carries a "last verified" date and the API version it was verified against
- Code examples tested against the latest API version — never copy-pasted untested
- Plain language first — technical accuracy second (but both required)
- All docs reviewed by a developer who is NOT the feature author before final publish
- Developer feedback from community channels synthesized monthly and delivered to Ramu

## Delivery

- API reference docs live in the relevant realm's `/docs/api/` folder within The-Nexus
- Tutorials live in `/docs/tutorials/`
- SDK guides live in `/docs/sdk/`
- Release notes live in `/docs/releases/`
- Developer advocacy blog drafts go in Nexus-Vaults/projects/devrel/
- Community feedback synthesis reports go in Nexus-Vaults/projects/devrel/research/
- All external-facing docs reviewed by Alake before publish — no exceptions
