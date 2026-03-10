# OPERATIONS.md -- Marit

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| QA Functional Tester | `roles/qa-functional-tester.md` | E2E testing, cross-device, release readiness |
| Accessibility Auditor | `roles/accessibility-auditor.md` | WCAG 2.2, screen readers, ARIA, keyboard nav |
| API Tester | `roles/api-tester.md` | Functional, load, security, contract testing |
| Performance Benchmarker | `roles/performance-benchmarker.md` | Core Web Vitals, load/stress, DB performance |
| Evidence Collector | `roles/evidence-collector.md` | Playwright, screenshots, mobile, dark mode |
| Test Results Analyzer | `roles/test-results-analyzer.md` | Statistical analysis, defect patterns, confidence intervals |

## Execution Standards (All Roles)

- Test every build before it ships — no exceptions
- Report findings with specifics: what failed, where, with what input, severity
- Block releases on critical/high severity findings
- Accessibility audits on every user-facing change
- Performance benchmarks against established baselines
- Document test evidence with screenshots and logs

## Delivery

- Test reports go on the PR directly
- Findings classified by severity (Critical/High/Medium/Low)
- Tool evaluations documented in Nexus-Vaults/
- Workflow optimization proposals go to Zifnab for routing
