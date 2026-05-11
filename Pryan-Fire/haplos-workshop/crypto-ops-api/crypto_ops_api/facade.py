"""Stdlib HTTP facade for read-only Pryan-Fire crypto ops state."""

from __future__ import annotations

import argparse
import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

from .fixture_data import fixture_summary, utc_now

MAX_POST_BYTES = 32 * 1024
DEFAULT_RESULTS_PATH = "/data/openclaw/crypto-ops/validation-results.jsonl"
VALIDATION_FIELDS = {"result", "evidence", "riskNotes", "tester", "screen", "blockedReason"}
REVENUE_PLAN_FIELDS = {"strategyId", "token", "pair", "amountUsd", "profitTargetBps", "stopLossBps", "maxSlippageBps", "source"}
MAX_REVENUE_PLAN_USD = 25.0
FORBIDDEN_VALIDATION_FIELDS = {
    "amount",
    "execute",
    "liveTrading",
    "order",
    "privateKey",
    "secret",
    "submitTx",
    "trade",
    "tx",
    "walletAction",
}


def build_revenue_plan(payload: dict) -> dict:
    keys = set(payload)
    forbidden = sorted(keys & FORBIDDEN_VALIDATION_FIELDS)
    unknown = sorted(keys - REVENUE_PLAN_FIELDS)
    if forbidden:
        raise ValueError(f"revenue plan cannot include trading fields: {', '.join(forbidden)}")
    if unknown:
        raise ValueError(f"unsupported revenue plan fields: {', '.join(unknown)}")

    try:
        amount_usd = float(payload.get("amountUsd", 0))
    except (TypeError, ValueError) as exc:
        raise ValueError("amountUsd must be numeric") from exc

    if amount_usd <= 0:
        raise ValueError("amountUsd must be greater than zero")

    status = "DRY_RUN_PLAN_READY" if amount_usd <= MAX_REVENUE_PLAN_USD else "AWAITING_OWNER_APPROVAL"
    return {
        "status": status,
        "liveExecution": "disabled",
        "submitTransaction": False,
        "strategyId": payload.get("strategyId", "capped-dlmm-volume-momentum"),
        "signal": {
            "token": payload.get("token", "candidate-redacted"),
            "pair": payload.get("pair", "candidate/USDC"),
            "amountUsd": amount_usd,
            "source": payload.get("source", "operator-tool"),
        },
        "risk": {
            "maxCappedLaneUsd": MAX_REVENUE_PLAN_USD,
            "requiresOwnerApproval": amount_usd > MAX_REVENUE_PLAN_USD,
            "reason": "below capped dry-run limit" if amount_usd <= MAX_REVENUE_PLAN_USD else "amountUsd exceeds capped dry-run limit",
        },
        "orderProbe": {
            "endpoint": "/ultra/v1/order",
            "mode": "non-executing probe/sim",
            "requiresAuthorizedJupiterKey": True,
        },
        "executionPlan": {
            "profitTargetBps": int(payload.get("profitTargetBps", 100)),
            "stopLossBps": int(payload.get("stopLossBps", 300)),
            "maxSlippageBps": int(payload.get("maxSlippageBps", 50)),
            "hardRejects": [
                "missing_exit_quote",
                "stale_feed",
                "rpc_read_failure",
                "mock_approval_gate",
                "unsafe_liquidity_profile",
                "unreconciled_accounting",
            ],
        },
        "accounting": {
            "preTradeSnapshotRequired": True,
            "postTradeSnapshotRequired": True,
            "positionReconciliationRequired": True,
            "pnlAsset": "USDC",
        },
    }


def build_app_payloads() -> dict[str, dict | list]:
    """Return API-contract payloads from safe fixture data.

    This is the adapter seam for later real read-only integrations. It intentionally
    imports no executor, wallet, or transaction code.
    """

    summary = fixture_summary()
    risk = summary["risk"]
    return {
        "/api/crypto/health": {
            "ok": True,
            "mode": summary["mode"],
            "source": "fixture",
            "generatedAt": summary["generatedAt"],
            "liveExecution": "disabled",
        },
        "/api/crypto/portfolio": summary["portfolio"] | {"generatedAt": summary["generatedAt"], "source": "fixture"},
        "/api/crypto/positions/dlmm": {"positions": summary["dlmmPositions"], "source": "fixture"},
        "/api/crypto/positions/monitor": summary["stopLossTakeProfit"] | {"source": "fixture"},
        "/api/crypto/close/state": {
            "mode": "read-only",
            "txStatus": "none submitted",
            "chain": summary["stopLossTakeProfit"]["chain"],
            "source": "fixture",
        },
        "/api/crypto/sniper/status": {
            "status": summary["sniper"]["status"],
            "rejected": summary["sniper"]["rejected"],
            "source": "fixture",
        },
        "/api/crypto/sniper/candidates": {"candidates": summary["sniper"]["candidates"], "source": "fixture"},
        "/api/crypto/pools/top": {"pools": summary["topPools"], "source": "fixture"},
        "/api/crypto/risk/feed": {"events": summary["killFeed"], "source": "fixture"},
        "/api/crypto/kill-switch": {
            "state": risk["killSwitch"],
            "liveTrading": risk["liveTrading"],
            "walletAuth": risk["walletAuth"],
            "gates": risk["gates"],
            "source": "fixture",
        },
        "/api/crypto/validation/prs": {"records": summary["prValidation"], "source": "fixture"},
        "/api/crypto/revenue/strategies": {"strategies": summary["revenueStrategies"], "source": "fixture"},
        "/api/crypto/revenue/readiness": summary["revenueReadiness"] | {"source": "fixture"},
        "/api/crypto-ops/summary.json": summary | {"source": "fixture"},
    }


def persist_validation_result(validation_id: str, payload: dict, path: str = DEFAULT_RESULTS_PATH) -> dict:
    keys = set(payload)
    forbidden = sorted(keys & FORBIDDEN_VALIDATION_FIELDS)
    unknown = sorted(keys - VALIDATION_FIELDS)
    if forbidden:
        raise ValueError(f"validation result cannot include trading fields: {', '.join(forbidden)}")
    if unknown:
        raise ValueError(f"unsupported validation fields: {', '.join(unknown)}")

    record = {
        "id": validation_id,
        "recordedAt": utc_now(),
        "kind": "validation-result",
        "liveExecution": "disabled",
        **payload,
    }
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")
    return record


def create_handler(results_path: str = DEFAULT_RESULTS_PATH) -> type[BaseHTTPRequestHandler]:
    payloads_factory: Callable[[], dict[str, dict | list]] = build_app_payloads

    class CryptoOpsHandler(BaseHTTPRequestHandler):
        server_version = "CryptoOpsFacade/0.1"

        def log_message(self, format: str, *args) -> None:  # noqa: A002 - stdlib signature
            if os.environ.get("CRYPTO_OPS_API_LOG") == "1":
                super().log_message(format, *args)

        def _json(self, status: HTTPStatus, payload: dict | list) -> None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status.value)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib method name
            self.send_response(HTTPStatus.NO_CONTENT.value)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "content-type")
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802 - stdlib method name
            path = urlparse(self.path).path.rstrip("/") or "/"
            payloads = payloads_factory()
            if path in payloads:
                self._json(HTTPStatus.OK, payloads[path])
                return
            self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "unknown endpoint"})

        def do_POST(self) -> None:  # noqa: N802 - stdlib method name
            path = urlparse(self.path).path.rstrip("/")
            length = int(self.headers.get("Content-Length", "0") or "0")
            if length <= 0 or length > MAX_POST_BYTES:
                self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid payload size"})
                return

            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if not isinstance(payload, dict):
                    raise ValueError("payload must be an object")
            except (json.JSONDecodeError, ValueError) as exc:
                self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
                return

            if path == "/api/crypto/revenue/plan":
                try:
                    plan = build_revenue_plan(payload)
                except ValueError as exc:
                    self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
                    return
                self._json(HTTPStatus.OK, {"ok": True, "plan": plan})
                return

            prefix = "/api/crypto/validation/"
            suffix = "/result"
            if path.startswith(prefix) and path.endswith(suffix):
                try:
                    validation_id = path[len(prefix) : -len(suffix)]
                    record = persist_validation_result(validation_id, payload, results_path)
                except ValueError as exc:
                    self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
                    return
                self._json(HTTPStatus.CREATED, {"ok": True, "record": record})
                return

            self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "unknown endpoint"})

    return CryptoOpsHandler


def run(host: str = "127.0.0.1", port: int = 8787, results_path: str = DEFAULT_RESULTS_PATH) -> None:
    server = ThreadingHTTPServer((host, port), create_handler(results_path))
    print(f"crypto ops read-only facade listening on http://{host}:{port}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the read-only Pryan-Fire crypto ops API facade")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--results-path", default=DEFAULT_RESULTS_PATH)
    args = parser.parse_args()
    run(args.host, args.port, args.results_path)


if __name__ == "__main__":
    main()
