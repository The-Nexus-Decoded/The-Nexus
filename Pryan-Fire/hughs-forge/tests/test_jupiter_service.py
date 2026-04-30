import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src")))

import asyncio

from services.jupiter_service import JupiterService


def test_get_quote_preserves_slippage_and_taker(monkeypatch):
    service = JupiterService()
    captured = {}

    async def fake_get_order(params):
        captured.update(params)
        return {"transaction": "tx", "requestId": "req", "outAmount": "100"}

    monkeypatch.setattr(service, "_get_order", fake_get_order)

    result = asyncio.run(service.get_quote("A", "B", 123, slippage_bps=77, taker="Wallet111"))

    assert result["transaction"] == "tx"
    assert captured == {
        "inputMint": "A",
        "outputMint": "B",
        "amount": "123",
        "slippageBps": 77,
        "taker": "Wallet111",
    }


def test_get_swap_transaction_reuses_validated_order_without_refetch(monkeypatch):
    service = JupiterService()

    async def fail_refetch(_params):
        raise AssertionError("execution must not re-fetch /order")

    monkeypatch.setattr(service, "_get_order", fail_refetch)

    tx = asyncio.run(service.get_swap_transaction({"transaction": "tx", "requestId": "req"}, "Wallet111"))

    assert tx == "tx"


def test_get_swap_transaction_fails_closed_without_transaction_or_request_id(monkeypatch):
    service = JupiterService()

    async def fail_refetch(_params):
        raise AssertionError("execution must not re-fetch malformed order")

    monkeypatch.setattr(service, "_get_order", fail_refetch)

    assert asyncio.run(service.get_swap_transaction({"requestId": "req"}, "Wallet111")) is None
    assert asyncio.run(service.get_swap_transaction({"transaction": "tx"}, "Wallet111")) is None
