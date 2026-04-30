# Adult-Only Manual Validation Outside Git

This repository must not contain explicit sexual images, unknown risky image datasets, production image dumps, secrets, or raw user PII.

If adult-content validation is approved later, run it outside git with a controlled adult-only data source:

1. Use a private, access-controlled machine and storage path outside this repository.
2. Confirm all participants are adults and that the dataset is legally usable for moderation validation.
3. Keep secrets in the operator environment only; do not print them in logs.
4. Run `photo-sweeper` with mock or approved adapter responses first.
5. Capture only sanitized aggregate counts and redacted case ids in repo notes.
6. Delete local transient copies according to the approved data handling policy.

Manual moderation remains final. AI output is recommendation-only evidence.
