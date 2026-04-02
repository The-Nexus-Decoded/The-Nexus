# Coding Conventions

**Analysis Date:** 2026-04-02

## Overview

The Nexus monorepo spans five realms with distinct tech stacks. TypeScript/React lives in Arianus-Sky, Python dominates Pryan-Fire and Chelestra-Sea, and Abarrach-Stone contains data schemas. Conventions vary by realm but share common principles: explicit error handling, structured logging, and type safety where applicable.

## Naming Patterns

### Files

**TypeScript/JavaScript:**
- PascalCase for React components: `RiskManager.tsx`, `PositionManager.ts`
- camelCase for utility modules: `useXRMobileBridge.ts`, `HapticEngine.ts`
- Snake_case for configuration files: `orchestrator_config.json`

**Python:**
- snake_case consistently: `exit_strategy.py`, `trade_orchestrator.py`, `security_scanner.py`
- Class definitions inside files: multiple classes per file is common
- No strict separation of test vs production (tests can import from src directly)

Examples from codebase:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-executor\main.py` (service entry point)
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\src\app\layout.tsx` (React layout)

### Functions

**Python:**
- snake_case: `check_trade()`, `report_trade_result()`, `get_active_positions()`
- Async methods prefixed with pattern: `async def check_all_positions()`, `async def exit_monitor_loop()`
- Private/internal: Single leading underscore: `_format_approval_message()`, `_setup_bot()`, `_add_position()`

**TypeScript:**
- camelCase for methods/functions: `fetchActivePositions()`, `claimFees()`, `fetchSolanaPrice()`
- Async functions naturally use async/await: `async fetchActivePositions()`
- Constructor patterns: `constructor(rpcUrl: string, ownerPublicKey: string)`

Examples:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 60-125
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\meteora-trader\src\PositionManager.ts` lines 16-35

### Variables

**Python:**
- snake_case consistently: `daily_loss_limit`, `circuit_breaker_active`, `consecutive_losses`, `max_trade_size`
- Class attributes: private with underscore: `self._discord_enabled`, `self._setup_bot()`, `self.lock`
- Constants: SCREAMING_SNAKE_CASE: `RPC_ENDPOINT`, `TOKEN_PROGRAM_ID`, `TRADING_WALLET_PUBLIC_KEY`
- Dictionaries and maps: lowercase with underscores: `self.pending_trades`, `self.trade_approvals`

**TypeScript:**
- camelCase: `connection`, `owner`, `pythHermesClient`
- Private fields: prefixed with underscore in class definitions: (not heavily used in sampled code)
- Type annotations always present in function signatures

Examples:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 31-33
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\meteora-trader\src\PositionManager.ts` lines 6-8

### Types

**Python:**
- Type hints in function signatures: `def check_trade(self, trade_details: Dict[str, Any]) -> bool:`
- Union types: `Optional[Dict[str, float]]`, `List[Dict[str, Any]]`
- Enum for state machines: `class ExecutorState(Enum):` with `auto()` values
- Pydantic models for API contracts: `class TradeDetails(BaseModel):`

**TypeScript:**
- Explicit return types required: `async fetchActivePositions()` should be `async fetchActivePositions(): Promise<any[]>`
- Interfaces for data structures (rare in sampled code, but available via tsconfig paths)
- Generic types used in service classes

Examples:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 27-36
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\executor\state_machine.py` lines 10-17

## Code Style

### Formatting

**Python:**
- No strict formatter configured (no Black, Ruff, or isort config found)
- Observed: 4-space indentation, max line length ~100-120 characters
- String formatting: f-strings used: `f"Trade {trade_id} auto-approved (mock mode)."`
- Docstrings: Triple-quoted, single-line for simple methods, multi-line for complex: `"""Monitors open positions and executes automatic sell signals based on Take-Profit (TP) and Stop-Loss (SL) thresholds."""`

**TypeScript/JavaScript:**
- ESLint configured: `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\eslint.config.mjs`
- Config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Next.js specific rules enforced (proper image handling, component patterns)
- No Prettier config, likely using Next.js defaults

### Linting

**Python:**
- No linting config found (no pyproject.toml, setup.cfg, or pylintrc)
- Practices suggest PEP 8 adherence: snake_case, 4-space indentation
- Type hints used but not strictly enforced

**TypeScript:**
- ESLint via `eslint: "^9"` in `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\package.json`
- Run with: `npm run lint` (from Arianus-Sky)
- Next.js core vitals and TypeScript rules applied automatically

## Import Organization

### Python

**Order observed:**
1. Standard library: `import asyncio`, `import json`, `import logging`
2. Third-party async: `import aiohttp`, `import httpx`
3. Third-party typed: `from typing import Dict, Any, Optional`
4. Domain-specific: `from solders.keypair import Keypair`
5. Local imports: `from src.data.ledger import LedgerDB`, `from .kill_switch import KILL_SWITCH`

**Relative vs absolute:**
- Relative imports for sibling modules: `from .guards import TradingGuards`
- Absolute imports for cross-service: `from src.data.ledger import LedgerDB`
- No wildcard imports observed

Examples:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 1-11
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 1-6

### TypeScript

**Order observed:**
1. Type imports: `import type { Metadata } from "next";`
2. Framework/runtime: `import { useState, useEffect } from "react";`
3. Third-party packages: `import { Connection, PublicKey } from "@solana/web3.js";`
4. Local imports: `import "./globals.css";`, `import { PythHermesClient } from './pyth-hermes-client/index.js';`

**Path aliases:**
- Configured in `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\tsconfig.json`: `"@/*": ["./src/*"]`
- Not observed in sampled files (likely reserved for larger projects)

## Error Handling

### Python Patterns

**Try/except blocks with logging:**
```python
try:
    trade_id = content.split("**ID:** `")[1].split("`")[0]
except IndexError:
    return
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 47-49

**Timeout handling with asyncio:**
```python
try:
    await asyncio.wait_for(event.wait(), timeout=300.0)
    return self.trade_approvals.get(trade_id, False)
except asyncio.TimeoutError:
    logger.warning(f"Trade {trade_id} timed out. ABORTING strike.")
    await channel.send(f"⚠️ **ABORTED**: Trade `{trade_id}` timed out (5m).")
    return False
finally:
    self.pending_trades.pop(trade_id, None)
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 114-123

**Return tuples for error propagation:**
```python
def check_position_size(self, trade_details: dict) -> tuple[bool, str]:
    max_size = self.config.get("max_trade_size_usd", 1000.0)
    if trade_details.get("amount_usd", 0) > max_size:
        return False, f"Trade size exceeds limit of {max_size} USD."
    return True, "Position size is within limits."
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 59-63

### TypeScript Patterns

**Minimal error handling in sampled code** — mostly relies on type system and calling code to handle failures. Exception: asyncio equivalents wrap in try/catch.

## Logging

### Framework

**Python: Built-in logging module**
- `logging.basicConfig()` sets up handlers and level
- Named loggers: `logger = logging.getLogger(__name__)`
- Multiple handlers: file + stderr simultaneously

**Structured JSON logging:**
```python
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if hasattr(record, 'extra_info'):
            log_record.update(record.extra_info)
        return json.dumps(log_record)
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\logger.py` lines 6-15

### Logging Patterns

**Info-level for state transitions:**
```python
logger.info(f"Checking trade: {trade_id}")
logger.info(f"Discord bot connected. Monitoring channel: {self.channel_id}")
```

**Warning for recoverable issues:**
```python
logger.warning(f"Trade {trade_id} timed out. ABORTING strike.")
logger.warning("RiskManager initialized in MOCK mode (no Discord credentials). All trades will be auto-approved.")
```

**Error for rejections and failures:**
```python
logger.error(f"Trading channel {self.channel_id} not found!")
audit_logger.error("Trade REJECTED", extra={'extra_info': {"reason": reason, **log_context}})
```

**Critical for circuit breakers:**
```python
audit_logger.critical("CIRCUIT BREAKER TRIPPED due to excessive losses.", extra={'extra_info': {"max_losses": max_losses}})
```

**Extra context logging:**
```python
audit_logger.info("Checking trade.", extra={'extra_info': log_context})
```

Examples:
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 11-12, 38-39, 94, 98
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 34-43

**Print statements in async loops (for immediate feedback):**
```python
print(f"[EXIT] Starting exit monitor (TP: {self.tp_percent}%, SL: {self.sl_percent}%)")
print(f"[REAPER] Signal Triggered: {signal['trigger']} for {signal['symbol']} ({signal['pnl_percent']:.2f}%)")
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\executor\exit_strategy.py` lines 59, 68

## Comments

### When to Comment

**State machine logic and non-obvious behavior:**
```python
async def get_jupiter_route(self):
    self.transition(ExecutorState.ROUTING)
    
    # Pull mints and amount from Meteora LP data
    input_mint = self.current_trade["meteora"].get("input_mint")
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\executor\state_machine.py` lines 44-49

**Inline comments for configuration:**
```python
# Check Law 2: Threshold
if not TradingGuards.check_trade_value(usd_value):
    print(f"[ALERT] Opportunity ${usd_value} exceeds limit. Moving to AWAITING_AUTH.")
```

**Section dividers with context:**
```python
# Discord Alerting (Telemetry Phase 48)
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_TRADE_ALERTS_WEBHOOK")
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-executor\main.py` lines 46-47

### JSDoc/TSDoc

**Python docstrings: Triple-quoted, present on classes and public methods**
```python
class ExitStrategist:
    """
    Monitors open positions and executes automatic sell signals 
    based on Take-Profit (TP) and Stop-Loss (SL) thresholds.
    """
```

**Method docstrings:**
```python
async def check_all_positions(self, current_prices: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Compares ledger positions against current market prices.
    Returns a list of signal triggers.
    """
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\executor\exit_strategy.py` lines 6-20

**TypeScript: Minimal docstrings observed in sampled code** — type signatures serve as documentation

## Function Design

### Size Guidelines

**Python:**
- Observed: Functions range 5-50 lines
- Pattern: Smaller async functions with orchestration in caller
- Example: `check_position_size()` is 4 lines; `check_trade()` is 28 lines
- State machines use async/await to decompose: `get_jupiter_route()` → `verify_trade()` → `request_manual_approval()`

**TypeScript:**
- Observed: Methods 5-30 lines
- Pattern: Simple, constructor-based dependency injection
- Example: `fetchActivePositions()` is 3 lines; `claimFees()` is 8 lines

### Parameters

**Python:**
- Explicit types: `def check_trade(self, trade_details: Dict[str, Any]) -> bool:`
- Dict unpacking common: `trade_dict = trade.model_dump()`
- Optional parameters with defaults: `def __init__(self, discord_token: str = None, channel_id: int = None):`

**TypeScript:**
- Constructor params: `constructor(rpcUrl: string, ownerPublicKey: string, hermesUrl: string)`
- Type annotations required
- No default parameters observed (constructor patterns used instead)

### Return Values

**Python:**
- Single values: `async def check_all_positions(...) -> List[Dict[str, Any]]:`
- Tuples for success/error: `def check_position_size(...) -> tuple[bool, str]:`
- None for void operations: `async def on_reaction(...)` returns implicitly None

**TypeScript:**
- Promises for async: `async fetchActivePositions(): Promise<any[]>` (implicit in sampled code)
- Single values or arrays
- No union return types observed in samples

## Module Design

### Exports

**Python:**
- Classes: Public classes defined at module level, importable
- Functions: Public functions at module level
- No explicit `__all__` lists observed
- Init files (`__init__.py`) kept minimal

**TypeScript:**
- Named exports: `export class PositionManager { ... }`
- Default exports rare (not observed in samples)
- No barrel files (index.ts exports) observed

### Barrel Files

**Not used** — single-class-per-file pattern or minimal exports. No `src/index.ts` re-exports observed.

## Configuration and Constants

**Environment-driven:**
```python
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_TRADE_ALERTS_WEBHOOK")
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"
```

**Config classes/dicts:**
```python
RISK_CONFIG = {
    "max_trade_size_usd": 1000.00,
    "max_open_positions": 5,
    "circuit_breaker": {
        "max_consecutive_losses": 3,
        "cooldown_period_seconds": 300,
    },
}
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 14-22

**Config loading from JSON:**
```python
def load_scanner_config() -> Dict[str, Any]:
    config = { ... }  # defaults
    # Load from JSON, override with env vars
    if os.getenv("METEORA_MIN_APY"):
        config["min_apy"] = float(os.getenv("METEORA_MIN_APY"))
```
Location: `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\signals\meteora_dlmm_scanner.py` lines 32-91

---

*Convention analysis: 2026-04-02*
