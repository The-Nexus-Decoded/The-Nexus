# Lessons Learned

Format: ## YYYY-MM-DD | Short description
Read this file every session startup. Never delete entries — only add.

---

## 2026-03-05 | PR without self-review (fleet-wide)

**What happened:** Haplo pushed PR #119 with Meteora SDK without testing or self-review. Bugs: ValueTypeError, wrong wallet, injection risk, no rate limiting, missing endpoints.

**Why:** Skipped self-review and local testing. Argued with Lord Xar/Alfred without verifying code first.

**Fix:** 
- Self-review + compile/run test BEFORE push
- Full audit, not basic review  
- Test locally, iterate problems BEFORE chat
- Only Lord Xar/Alfred can merge PRs
