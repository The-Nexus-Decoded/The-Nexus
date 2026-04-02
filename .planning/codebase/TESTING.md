# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

### Python

**Runner:**
- `unittest` (Python standard library) — no external test runner configured
- `pytest` available but not enforced in config

**No test runner config found:**
- No `pytest.ini`, `setup.cfg`, or `pyproject.toml` with test configuration
- Tests discoverable by convention: `test_*.py` or `*_test.py` files
- Assertion library: Python `unittest.TestCase` with `assert` methods

**Run commands (inferred from structure):**
```bash
python -m pytest Pryan-Fire/hughs-forge/services/trade-executor/test_risk_manager.py
python -m unittest tests/test_scanner.py
```

### TypeScript/React

**No test framework configured in Arianus-Sky:**
- ESLint configured but no Jest, Vitest, or test runner
- `package.json` has no test scripts

**Manual testing approach:**
```bash
npm run lint              # ESLint only
npm run dev              # Manual verification in browser
```

## Test File Organization

### Location

**Python: Co-located with code or in tests/ directory**

**Pattern 1: Sibling tests directory**
```
Pryan-Fire/
├── hughs-forge/
│   ├── services/trade-executor/
│   │   ├── main.py
│   │   ├── test_anchorpy.py
│   │   ├── test_memcmp.py
│   │   ├── test_raw_async.py
│   │   └── test_risk_manager.py
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\`

**Pattern 2: Separate tests/ directory at realm level**
```
Pryan-Fire/
├── tests/
│   ├── test_scanner.py
│   ├── test_exit.py
│   ├── test_ledger.py
│   ├── test_gas.py
│   ├── test_profiles.py
│   └── test_dashboard.py
├── src/
│   └── (main code)
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\tests\`

**Pattern 3: Nested in services**
```
Pryan-Fire/
├── hughs-forge/
│   ├── services/trade-orchestrator/
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   └── (code)
│   │   │   └── (code)
│   │   └── tests/
│   │       └── test_rpc_integration.py
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\`

### Naming

**Convention: `test_<module>.py` or `<module>_test.py`**
- `test_risk_manager.py` — tests for RiskManager class
- `test_scanner.py` — tests for scanner functionality
- `test_rpc_integration.py` — integration tests

## Test Structure

### Python unittest Pattern

**Basic suite organization:**
```python
import unittest
from main import RiskManager

class TestRiskManager(unittest.TestCase):
    def setUp(self):
        self.rm = RiskManager(daily_loss_limit=-500.0, max_trade_size=50.0)

    def test_initialization(self):
        self.assertEqual(self.rm.daily_loss_limit, -500.0)
        self.assertEqual(self.rm.max_trade_size, 50.0)
        self.assertFalse(self.rm.circuit_breaker_active)

    def test_check_strategy_risk(self):
        # Conservative strategy should pass even in HIGH volatility
        self.assertTrue(self.rm.check_strategy_risk("Spot", "HIGH"))
        self.assertFalse(self.rm.check_strategy_risk("BidAsk", "HIGH"))

    def test_circuit_breaker(self):
        self.rm.activate_circuit_breaker()
        self.assertTrue(self.rm.circuit_breaker_active)
        self.assertFalse(self.rm.check_trade(25.0))
        
        self.rm.deactivate_circuit_breaker()
        self.assertTrue(self.rm.check_trade(25.0))

if __name__ == '__main__':
    unittest.main()
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-executor\test_risk_manager.py` (full file, 50 lines)

**Key patterns:**
- `setUp()` method: Initialize fixtures before each test
- `test_*()` methods: One concern per test
- Assertions: `self.assertTrue()`, `self.assertFalse()`, `self.assertEqual()`
- No explicit teardown observed (cleanup implicit)

### Pytest-compatible patterns

**Async tests with mocks:**
```python
"""Tests for RpcIntegrator — Jupiter trade execution (ticket #212)."""

import json
import os
import base64
from unittest.mock import patch, MagicMock
import pytest

# Mock dependencies before import
mock_keypair = MagicMock()
mock_keypair.pubkey.return_value = "FakePublicKey11111111111111111111111111111111"

import sys
sys.modules.setdefault("solders", MagicMock())
sys.modules.setdefault("solders.keypair", MagicMock(Keypair=MagicMock(from_secret_key=MagicMock(return_value=mock_keypair))))
# ... more mocks ...

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from core.rpc_integration import RpcIntegrator, TX_CONFIRM_TIMEOUT


class TestDryRunMode:
    """Verify dry_run mode skips wallet and trade execution."""

    def test_init_dry_run_no_wallet(self):
        rpc = RpcIntegrator(dry_run=True)
        assert rpc.dry_run is True
        assert rpc.wallet is None

    def test_execute_trade_returns_dry_run_error(self):
        rpc = RpcIntegrator(dry_run=True)
        result = rpc.execute_jupiter_trade(
            input_mint="So11111111111111111111111111111111111111112",
            output_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            amount=1.0,
        )
        assert result["success"] is False
        assert result["error"] == "dry_run"
        assert result["signature"] is None


class TestWalletLoading:
    """Verify wallet loading behaviour."""

    def test_init_missing_wallet_raises(self, tmp_path):
        os.environ["TRADING_WALLET_PATH"] = str(tmp_path / "nonexistent.json")
        with pytest.raises(FileNotFoundError):
            RpcIntegrator(dry_run=False)
        del os.environ["TRADING_WALLET_PATH"]

    @patch("core.rpc_integration.httpx")
    def test_quote_failure_returns_error(self, mock_httpx):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_httpx.get.return_value = mock_resp

        result = self.rpc.execute_jupiter_trade(...)
        assert result["success"] is False
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` (lines 1-100)

**Key patterns:**
- Pytest class-based test organization: `class TestFeature:`
- Setup via `tmp_path` fixture (pytest)
- Assertions using `assert` (pytest style)
- `setup_method()` for per-test initialization (pytest convention)
- Mocking via `@patch` decorator

## Mocking

### Framework

**unittest.mock (Python built-in):**
- `MagicMock()` — create mock objects
- `patch()` — decorator or context manager for mocking modules
- `MagicMock.return_value` — set return values

### Mocking Patterns

**Pre-test mock setup (mocking unavailable dependencies):**
```python
# Mock dependencies before import to avoid ImportError
mock_keypair = MagicMock()
mock_keypair.pubkey.return_value = "FakePublicKey11111111111111111111111111111111"

mock_versioned_tx_cls = MagicMock()
mock_legacy_tx_cls = MagicMock()

sys.modules.setdefault("solders", MagicMock())
sys.modules.setdefault("solders.keypair", MagicMock(Keypair=MagicMock(from_secret_key=MagicMock(return_value=mock_keypair))))
sys.modules.setdefault("solders.transaction", MagicMock(VersionedTransaction=mock_versioned_tx_cls, Transaction=mock_legacy_tx_cls))
# ... more mocks ...

# Now safe to import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from core.rpc_integration import RpcIntegrator
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 10-34

**Method-level mocking (replace internal methods):**
```python
async def mock_bad_security(mint): 
    return {"is_mintable": False, "is_freezable": True, "is_lp_burned": False, "is_bundled": True, "top_10_holders_share": 45.0}

async def mock_bad_market(mint): 
    return {"volume_24h": 5000000.0, "total_fees": 500.0}

scanner._fetch_gmgn_security = mock_bad_security
scanner._fetch_gmgn_market = mock_bad_market

res = await scanner.scan_token("RUG_MINT_456")
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\tests\test_scanner.py` lines 15-25

**Patch decorator for module functions:**
```python
@patch("core.rpc_integration.httpx")
def test_quote_failure_returns_error(self, mock_httpx):
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"
    mock_httpx.get.return_value = mock_resp
    
    result = self.rpc.execute_jupiter_trade(...)
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 90-95

### What to Mock

**Mock external dependencies:**
- Network calls (httpx, aiohttp requests)
- Third-party SDKs (solders, solana.rpc)
- File system operations (when testing logic, not I/O)
- Discord bot interactions

**Do NOT mock:**
- Your own business logic classes (import and test directly)
- Standard library (datetime, logging, json) unless specifically testing error handling
- Internal state machines (test via public API)

## Fixtures and Factories

### Test Data

**Manual setup in setUp():**
```python
def setUp(self):
    self.rm = RiskManager(daily_loss_limit=-500.0, max_trade_size=50.0)
```

**Inline test functions (no formal fixture framework):**
```python
async def test_anti_rug():
    scanner = AntiRugScanner()
    
    # Test 1: "Verified" Token Pattern
    print("\n[TEST] Pattern: Verified Launch (Clean)")
    res = await scanner.scan_token("CLEAN_MINT_123")
    print(f"Result: {res}")
```
Location: `H:\Projects\AI_Tools_AND_Information\The-Nexus\Pryan-Fire\hughs-forge\tests\test_scanner.py` lines 4-28

**No formal fixture factory pattern** — objects constructed inline or via test helper methods. Data kept simple (strings, dicts, small objects).

### Location

Test data embedded in test functions. No separate `fixtures/` or `factories/` directory observed.

## Coverage

### Requirements

**No coverage tool configured:**
- No pytest-cov, coverage.py, or Istanbul config found
- No coverage thresholds specified
- Coverage measurement not automated

### View Coverage

**Manual measurement (if implemented):**
```bash
# For pytest (if configured)
pytest --cov=Pryan-Fire --cov-report=html

# For unittest (basic)
python -m coverage run -m unittest discover
python -m coverage report
```

**Current state:** Coverage not tracked or enforced.

## Test Types

### Unit Tests

**Scope:** Individual class/function behavior in isolation

**Approach:** Direct instantiation with mocked dependencies
```python
def test_check_trade_within_limits(self):
    self.assertTrue(self.rm.check_trade(25.0))
    self.assertTrue(self.rm.check_trade(50.0))

def test_check_trade_exceeds_limits(self):
    self.assertFalse(self.rm.check_trade(51.0))
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-executor\test_risk_manager.py` lines 32-37

**Coverage:** Most tests in codebase are unit tests

### Integration Tests

**Scope:** Multiple components working together (RPC + wallet + trade execution)

**Approach:** Mocked external services (RPC, HTTP), real internal logic
```python
class TestWalletLoading:
    """Verify wallet loading behaviour."""

    def test_init_missing_wallet_raises(self, tmp_path):
        os.environ["TRADING_WALLET_PATH"] = str(tmp_path / "nonexistent.json")
        with pytest.raises(FileNotFoundError):
            RpcIntegrator(dry_run=False)
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 57-64

**Dry-run mode heavily used:**
```python
class TestDryRunMode:
    """Verify dry_run mode skips wallet and trade execution."""

    def test_init_dry_run_no_wallet(self):
        rpc = RpcIntegrator(dry_run=True)
        assert rpc.dry_run is True
        assert rpc.wallet is None
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 37-43

### E2E Tests

**Not used** — high-risk trading systems avoid end-to-end automation. Manual verification + dry-run modes preferred.

## Common Patterns

### Async Testing

**Pattern: async test function with asyncio.run()**
```python
import asyncio

async def test_anti_rug():
    scanner = AntiRugScanner()
    res = await scanner.scan_token("CLEAN_MINT_123")
    print(f"Result: {res}")

if __name__ == "__main__":
    asyncio.run(test_anti_rug())
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\tests\test_scanner.py` (full file, 29 lines)

**No async test framework** (pytest-asyncio not configured) — tests wrap async code manually or use unittest.TestCase sync methods with event loop setup.

### Error Testing

**Expected exception patterns:**
```python
def test_init_missing_wallet_raises(self, tmp_path):
    os.environ["TRADING_WALLET_PATH"] = str(tmp_path / "nonexistent.json")
    with pytest.raises(FileNotFoundError):
        RpcIntegrator(dry_run=False)
    del os.environ["TRADING_WALLET_PATH"]
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 60-64

**Error response assertions (no exception):**
```python
def test_execute_trade_returns_dry_run_error(self):
    rpc = RpcIntegrator(dry_run=True)
    result = rpc.execute_jupiter_trade(...)
    assert result["success"] is False
    assert result["error"] == "dry_run"
    assert result["signature"] is None
```
Location: `H:\Projects\AI_Tools_AND_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-orchestrator\tests\test_rpc_integration.py` lines 45-54

## Test Execution

### Manual Test Scripts

Some tests are standalone scripts (not part of unittest/pytest):
```python
async def test_anti_rug():
    scanner = AntiRugScanner()
    # ...

if __name__ == "__main__":
    asyncio.run(test_anti_rug())
```

Run with:
```bash
cd Pryan-Fire/hughs-forge/tests
python test_scanner.py
```

### Inferred CI/Testing Strategy

Based on CLAUDE.md and directory structure:
- No Jest/Vitest for TypeScript
- No automated test runs in package.json
- Manual verification likely required before merge
- Dry-run modes used in place of full E2E tests
- Hugo (trading bot) tests via micro-trade: 0.001 SOL post-merge verification

---

*Testing analysis: 2026-04-02*
