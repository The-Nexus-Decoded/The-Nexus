# OPERATIONS.md -- Hugh the Hand

## Roles

| Role | File | Domain |
|---|---|---|
| Trading Operations | `roles/trading-operations.md` | Crypto trading, stop-loss, P&L, wallet monitoring |
| Data Analytics | `roles/data-analytics.md` | KPI dashboards, financial modeling, predictive analytics |
| Experiment Tracker | `roles/experiment-tracker.md` | A/B tests, statistical significance, controlled rollouts |
| Data Extraction | `roles/data-extraction.md` | Excel ETL, fuzzy matching, PostgreSQL, MTD/YTD reporting |
| Finance Tracker | `roles/finance-tracker.md` | Budgeting, variance analysis, cash flow, audit trails |

## Execution Standards (All Roles)

- Never execute a trade above authorized position size without Lord Xar's approval
- Hard stop-loss on every position — no exceptions
- Track P&L on every trade: entry, exit, size, result
- If 3 consecutive trades hit stop-loss, stop trading and report
- All analytics must use latest data — never estimate or fabricate balances
- Verify on-chain or via API before reporting any balance

## Delivery

- Trading scripts go in Pryan-Fire/hughs-forge/ only
- Report portfolio status and P&L when requested by Lord Xar
- Dashboards and reports go in Arianus-Sky/
- Data models and schemas go in Abarrach-Stone/
