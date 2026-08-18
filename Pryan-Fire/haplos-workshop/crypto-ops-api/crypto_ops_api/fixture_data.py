"""Safe fixture-backed data for the crypto ops API facade.

No live-money connectors are imported here. V1 is explicitly read-only and dry-run.
"""

from __future__ import annotations

from datetime import datetime, timezone

VALIDATION_CHAIN = [
    "monitor",
    "trigger",
    "close executor",
    "alert",
    "state persistence",
]


REVENUE_STRATEGIES = [
    {
        "id": "capped-dlmm-volume-momentum",
        "name": "Capped DLMM volume/momentum fee lane",
        "phase": "first revenue lane after gates",
        "mode": "strategy/sim-go-live-no-go",
        "entrySignals": [
            "sustained 5m/15m volume",
            "safe liquidity and fee/TVL edge",
            "clean token-risk profile",
            "quote-confirmed entry and exit",
            "readable DLMM position state",
            "real owner approval gate",
        ],
        "sizeCap": "lower of Lord-Xar-approved cap, $25, or 0.25% verified bot-wallet trading equity",
        "exitRules": [
            "+1.0% net after costs",
            "+0.50% fees with weakening momentum",
            "exit to stable/USDC route",
        ],
        "stops": [
            "-3% net position value",
            "10% liquidity drain",
            "50% volume collapse",
            "exit impact >2%",
            "two failed position reads",
            "risk flag or 30min no-progress timer",
        ],
    },
    {
        "id": "quote-only-route-spread",
        "name": "Quote-only arbitrage / route-spread lane",
        "phase": "scanner/sim first, live later",
        "mode": "quote-only-no-submit",
        "entrySignals": [
            "route spread survives fees, slippage, priority buffer, and latency",
            "positive spread persists across 3 quote samples",
            "quote age <3s",
            "expected net >=0.50%",
            "both legs confirmed",
            "per-leg impact <0.80%",
            "real owner approval gate",
        ],
        "sizeCap": "$0 quote phase, $100 paper sim default, live canary uses approved cap rule",
        "exitRules": ["immediate completion; arbitrage is not a hold", "compare realized net to quote expectation"],
        "stops": [
            "spread <0.50%",
            "quote stale",
            "impact too high",
            "route drift",
            "inconsistent quote source",
            "mock/missing approval",
        ],
    },
]

REVENUE_READINESS = {
    "leadIssue": "#291",
    "compileGate": "#384",
    "liveExecution": "NO-GO",
    "strategySimWork": "GO",
    "recoveryOrder": [
        "Jupiter Ultra auth entitlement",
        "real Lord Xar approval gate",
        "signer path verification without exposing key material",
        "Meteora pool feed + timers + RPC/rate-limit repair",
        "full dry-run/sim lane",
        "capped canary only after explicit Lord Xar command",
    ],
    "currentBlockers": [
        "Jupiter Ultra /order unauthorized",
        "approval gate must fail closed; no mock auto-approve",
        "signer path not live-verified",
        "pool feed/timers/RPC still need repair",
        "execution bridge needs dry-run proof before live canary",
    ],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fixture_summary() -> dict:
    generated_at = utc_now()
    return {
        "generatedAt": generated_at,
        "mode": "read-only-fixture",
        "portfolio": {
            "wallet": "Hugh runtime wallet",
            "equityUsd": 12840.55,
            "pnl24hUsd": 316.42,
            "pnl24hPct": 2.53,
            "openExposureUsd": 4210.18,
            "riskPosture": "SAFE_TEST_ONLY",
        },
        "risk": {
            "killSwitch": "ARMED",
            "liveTrading": False,
            "walletAuth": "not-connected",
            "gates": [
                {"name": "Hugh validation", "state": "passed-safe-mode"},
                {"name": "Live executor", "state": "disabled"},
                {"name": "Wallet authorization", "state": "blocked"},
                {"name": "Kill switch visibility", "state": "visible"},
            ],
        },
        "dlmmPositions": [
            {
                "id": "dlmm-001",
                "pair": "SOL/USDC",
                "poolId": "pool-sol-usdc-demo",
                "liquidityUsd": 2480.12,
                "feesUsd": 41.82,
                "pnlUsd": 128.34,
                "state": "open",
                "closeState": "dry-run-ready",
                "lastTx": "none submitted",
            },
            {
                "id": "dlmm-002",
                "pair": "BONK/SOL",
                "poolId": "pool-bonk-sol-demo",
                "liquidityUsd": 1730.06,
                "feesUsd": 18.94,
                "pnlUsd": -22.7,
                "state": "watching",
                "closeState": "risk-gated",
                "lastTx": "none submitted",
            },
        ],
        "stopLossTakeProfit": {
            "issue": "#277",
            "status": "safe-mode-passed",
            "chain": [{"step": step, "state": "verified-safe-mode"} for step in VALIDATION_CHAIN],
            "latestEvidence": "Hugh validated PR #295 in clean runtime checkout; 17 regression tests passed.",
        },
        "sniper": {
            "status": "dry-run",
            "candidates": [
                {"symbol": "DEMO1/SOL", "score": 82, "reason": "liquidity rising; dry-run only"},
                {"symbol": "DEMO2/USDC", "score": 74, "reason": "fee velocity; blocked until risk gates pass"},
            ],
            "rejected": [
                {"symbol": "RUG/SOL", "reason": "authority risk"},
                {"symbol": "THIN/USDC", "reason": "liquidity below threshold"},
            ],
        },
        "topPools": [
            {"rank": 1, "pair": "SOL/USDC", "liquidityUsd": 12200000, "volume24hUsd": 8400000, "fees24hUsd": 18200, "risk": "low"},
            {"rank": 2, "pair": "JUP/SOL", "liquidityUsd": 4100000, "volume24hUsd": 2600000, "fees24hUsd": 7400, "risk": "medium"},
            {"rank": 3, "pair": "BONK/SOL", "liquidityUsd": 2200000, "volume24hUsd": 1900000, "fees24hUsd": 6100, "risk": "medium"},
        ],
        "killFeed": [
            {"time": "00:17 CDT", "severity": "info", "message": "#295 safe-mode validation passed; no live tx submitted."},
            {"time": "00:13 CDT", "severity": "warn", "message": "Remote pytest unavailable on Hugh until pytest is installed."},
            {"time": "00:11 CDT", "severity": "safe", "message": "Live-money automation remains disabled."},
        ],
        "revenueStrategies": REVENUE_STRATEGIES,
        "revenueReadiness": REVENUE_READINESS,
        "prValidation": [
            {"pr": "#295", "issue": "#277", "result": "passed-safe-mode", "evidence": "17 tests passed; fake executor success/failure persisted."},
            {"pr": "#296", "issue": "#296", "result": "pending", "evidence": "Read-only dashboard and API facade under construction."},
            {"pr": "#387", "issue": "#291", "result": "pending", "evidence": "Capped revenue-lane dry-run gate under review; no live tx."},
        ],
    }
