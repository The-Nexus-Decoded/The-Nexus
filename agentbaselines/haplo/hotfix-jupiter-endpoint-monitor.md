# Jupiter Endpoint Hotfix

## Scope

Hotfix target: position monitor automation path and trade orchestrator Jupiter client.

Files to patch in `The-Nexus`:

- `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/scripts/automation_engine.py`
- `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py`
- `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json`

## Why

Current stale endpoints in repo:

- `automation_engine.py` uses `https://quote-api.jup.ag/v6/quote`
- `automation_engine.py` uses `https://quote-api.jup.ag/v6/swap`
- `rpc_integration.py` hardcodes `https://api.jup.ag/ultra/v1`

Official Jupiter docs now use:

- Swap API: `https://api.jup.ag/swap/v1/*`
- Temporary compatibility/fallback: `https://lite-api.jup.ag/swap/v1/*`
- Ultra API: `https://api.jup.ag/ultra/v1/*`
- Temporary compatibility/fallback: `https://lite-api.jup.ag/ultra/v1/*`

## Patch

### 1. `automation_engine.py`

Add:

```python
JUPITER_API_KEY = os.getenv("JUPITER_API_KEY")
DEFAULT_JUPITER_SWAP_BASES = [
    "https://api.jup.ag/swap/v1",
    "https://lite-api.jup.ag/swap/v1",
]
```

Change calls in `execute_position_close(...)`:

```python
quote = _get_jupiter_quote(config, swap_from_mint, USDC_MINT, 1000000)
swap_tx = _get_jupiter_swap_transaction(config, quote, swap_from_mint, USDC_MINT, swap_slippage)
```

Replace the legacy Jupiter helpers with:

```python
def _get_jupiter_headers() -> Dict[str, str]:
    headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
    if JUPITER_API_KEY:
        headers["x-api-key"] = JUPITER_API_KEY
    return headers


def _get_jupiter_swap_bases(config: Dict[str, Any]) -> List[str]:
    configured = os.getenv("JUPITER_SWAP_API_BASE") or config.get("execution", {}).get("jupiter_swap_api_base")
    bases: List[str] = []

    if configured:
        bases.append(configured.rstrip("/"))

    for base in DEFAULT_JUPITER_SWAP_BASES:
        normalized = base.rstrip("/")
        if normalized not in bases:
            bases.append(normalized)

    return bases


def _get_jupiter_quote(config: Dict[str, Any], input_mint: str, output_mint: str, amount: int) -> Optional[Dict]:
    params = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": str(amount),
        "slippageBps": "50",
    }
    try:
        for base_url in _get_jupiter_swap_bases(config):
            url = f"{base_url}/quote"
            resp = requests.get(url, params=params, headers=_get_jupiter_headers(), timeout=10)
            if resp.status_code != 200:
                logger.warning(f"Jupiter quote error from {url}: {resp.status_code} {resp.text[:200]}")
                continue

            quote = resp.json()
            if isinstance(quote, list):
                if not quote:
                    logger.warning(f"No Jupiter quotes returned from {url}")
                    continue
                return quote[0]

            if isinstance(quote, dict) and quote.get("outAmount"):
                return quote

            logger.warning(f"Unexpected Jupiter quote payload from {url}: {quote}")
    except Exception as e:
        logger.error(f"Failed to get Jupiter quote: {e}")
        return None
    return None


def _get_jupiter_swap_transaction(
    config: Dict[str, Any],
    quote: Dict,
    input_mint: str,
    output_mint: str,
    slippage_bps: int,
) -> Optional[str]:
    try:
        payload = {
            "quoteResponse": quote,
            "userPublicKey": "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x",
            "slippageBps": slippage_bps,
        }

        for base_url in _get_jupiter_swap_bases(config):
            url = f"{base_url}/swap"
            resp = requests.post(url, json=payload, headers=_get_jupiter_headers(), timeout=15)
            if resp.status_code != 200:
                logger.warning(f"Jupiter swap API error from {url}: {resp.status_code} {resp.text[:200]}")
                continue

            data = resp.json()
            swap_tx = data.get("swapTransaction")
            if swap_tx:
                return swap_tx
            logger.warning(f"Missing swapTransaction in Jupiter response from {url}: {data}")
    except Exception as e:
        logger.error(f"Failed to build Jupiter transaction: {e}")
        return None
    return None
```

### 2. `rpc_integration.py`

Add:

```python
DEFAULT_JUPITER_ULTRA_ENDPOINTS = (
    "https://api.jup.ag/ultra/v1",
    "https://lite-api.jup.ag/ultra/v1",
)
```

Replace hardcoded endpoint init with:

```python
configured_ultra_base = os.getenv("JUPITER_ULTRA_API_BASE")
self.jupiter_endpoints = []
if configured_ultra_base:
    self.jupiter_endpoints.append(configured_ultra_base.rstrip("/"))
for endpoint in DEFAULT_JUPITER_ULTRA_ENDPOINTS:
    if endpoint not in self.jupiter_endpoints:
        self.jupiter_endpoints.append(endpoint)
self.jupiter_endpoint = self.jupiter_endpoints[0]
self.jupiter_api_key = os.getenv("JUPITER_API_KEY")
```

Add helpers:

```python
def _jupiter_headers(self, with_json: bool = False) -> Dict[str, str]:
    headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
    if with_json:
        headers["Content-Type"] = "application/json"
    if self.jupiter_api_key:
        headers["x-api-key"] = self.jupiter_api_key
    return headers


def _request_jupiter(
    self,
    method: str,
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_payload: Optional[Dict[str, Any]] = None,
    timeout: float = 15.0,
) -> Optional[Dict[str, Any]]:
    for endpoint in self.jupiter_endpoints:
        url = f"{endpoint}/{path}"
        try:
            response = httpx.request(
                method,
                url,
                params=params,
                json=json_payload,
                headers=self._jupiter_headers(with_json=json_payload is not None),
                timeout=timeout,
            )
            if response.status_code == 200:
                return response.json()
            self.logger.warning(f"Jupiter endpoint {url} returned {response.status_code}: {response.text[:500]}")
        except httpx.HTTPError as e:
            self.logger.warning(f"Jupiter request failed for {url}: {e}")
    return None
```

Then replace `_fetch_ultra_order(...)` and `_execute_ultra_order(...)` internals with:

```python
return self._request_jupiter("get", "order", params=params, timeout=15.0)
```

and

```python
return self._request_jupiter("post", "execute", json_payload=payload, timeout=15.0)
```

### 3. `position_monitor_config.json`

Under `execution`, add:

```json
"jupiter_swap_api_base": "https://api.jup.ag/swap/v1"
```

## Verification

Run from `/data/repos/The-Nexus`:

```bash
git checkout -b hotfix/jupiter-endpoint-monitor
pytest Pryan-Fire/hughs-forge/services/trade-orchestrator/tests/test_rpc_integration.py
python3 -m py_compile \
  Pryan-Fire/hughs-forge/scripts/automation_engine.py \
  Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py \
  Pryan-Fire/hughs-forge/scripts/position_monitor.py
rg -n "quote-api\\.jup\\.ag/v6|https://api\\.jup\\.ag/ultra/v1" Pryan-Fire/hughs-forge
```

Expected result after patch:

- no remaining `quote-api.jup.ag/v6` references in `hughs-forge`
- monitor automation uses `/swap/v1`
- Ultra client supports env override plus `api` then `lite-api` fallback

## Sources

- Jupiter Legacy/Swap docs: `https://dev.jup.ag/docs/swap/get-quote`
- Jupiter deprecation update: `https://dev.jup.ag/updates`
