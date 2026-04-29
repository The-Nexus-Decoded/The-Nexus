#!/usr/bin/env python3
"""Tests for trade-orchestrator health server position enrichment."""

import health_server


def test_enrich_positions_uses_position_value_not_pool_tvl(monkeypatch):
    pool = {
        "name": "SOL-USDC",
        "reserve_x_amount": 100_000_000_000,
        "reserve_y_amount": 50_000_000_000,
        "mint_y": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "current_price": 100,
        "today_fees": 99,
        "trade_volume_24h": 1000,
    }
    position = {"fee_apy_24h": 12.3, "total_fee_usd_claimed": 4.5, "liquidity_usd": 123.45}

    def fake_get(url, timeout=10):
        class Response:
            status_code = 200

            def json(self):
                return position if "/position/" in url else pool

        return Response()

    monkeypatch.setattr(health_server.requests, "get", fake_get)
    monkeypatch.setattr(health_server, "_rpc_call", lambda *_: None)

    enriched = health_server._enrich_positions([
        {"position": "pos123", "lb_pair": "pool123", "lower_bin_id": 1, "upper_bin_id": 2}
    ])

    result = enriched[0]
    assert result["liquidity_usd"] == 123.45
    assert result["liquidity_value_source"] == "liquidity_usd"
    assert result["pnl_value_unavailable"] is False
    assert result["pool_liquidity_usd"] > 50_000


def test_enrich_positions_does_not_fallback_to_pool_tvl_for_position_value(monkeypatch):
    pool = {
        "name": "SOL-USDC",
        "reserve_x_amount": 100_000_000_000,
        "reserve_y_amount": 50_000_000_000,
        "mint_y": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "current_price": 100,
        "today_fees": 99,
        "trade_volume_24h": 1000,
    }

    def fake_get(url, timeout=10):
        class Response:
            status_code = 200

            def json(self):
                return {} if "/position/" in url else pool

        return Response()

    monkeypatch.setattr(health_server.requests, "get", fake_get)
    monkeypatch.setattr(health_server, "_rpc_call", lambda *_: None)

    enriched = health_server._enrich_positions([
        {"position": "pos123", "lb_pair": "pool123", "lower_bin_id": 1, "upper_bin_id": 2}
    ])

    result = enriched[0]
    assert result["liquidity_usd"] == 0
    assert result["liquidity_value_source"] == "unavailable"
    assert result["pnl_value_unavailable"] is True
    assert result["pool_liquidity_usd"] > 50_000


def test_wallet_fees_processes_wallets_concurrently(monkeypatch):
    calls = []
    monkeypatch.setattr(health_server, "TRACKED_WALLETS", {"owner": "owner_addr", "bot": "bot_addr"})

    def fake_payload(address):
        calls.append(address)
        return {"wallet": address, "positions": [], "count": 0, "sol_balance": 1.0}

    class ImmediateFuture:
        def __init__(self, result):
            self._result = result

        def result(self):
            return self._result

    class FakeExecutor:
        def __init__(self, max_workers):
            self.max_workers = max_workers
            self.futures = []

        def __enter__(self):
            created["executor"] = self
            return self

        def __exit__(self, *_exc):
            return False

        def submit(self, fn, address):
            future = ImmediateFuture(fn(address))
            self.futures.append(future)
            return future

    created = {}
    monkeypatch.setattr(health_server, "_wallet_fees_payload", fake_payload)
    monkeypatch.setattr(health_server, "ThreadPoolExecutor", FakeExecutor)
    monkeypatch.setattr(health_server, "as_completed", lambda futures: list(futures))

    response = health_server.get_wallet_fees()

    assert created["executor"].max_workers == 2
    assert set(calls) == {"owner_addr", "bot_addr"}
    assert response["wallets"]["owner"]["wallet"] == "owner_addr"
    assert response["wallets"]["bot"]["wallet"] == "bot_addr"
