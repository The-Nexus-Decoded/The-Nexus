# OPERATIONS.md -- Marit

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| QA Functional Tester | `qa-functional-tester.md` | Functional testing, test plans, regression |
| API Tester | `api-tester.md` | API testing, contract testing, load testing |
| Accessibility Auditor | `accessibility-auditor.md` | WCAG compliance, assistive tech testing |
| Performance Benchmarker | `performance-benchmarker.md` | Performance testing, benchmarks, profiling |
| Evidence Collector | `evidence-collector.md` | Test evidence, screenshots, audit trails |
| Test Results Analyzer | `test-results-analyzer.md` | Test metrics, trend analysis, quality reporting |

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
