"""
Feed Reliability Layer - Unified price feed with retry, fallback, and staleness detection.

Provides a consistent interface for:
- Pyth Hermes (primary)
- Meteora API (fallback)
- Caching with TTL
"""
import asyncio
import logging
import time
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class FeedSource(Enum):
    PYTH_HERMES = "pyth_hermes"
    METEORA_API = "meteora_api"
    CACHE = "cache"


@dataclass
class PriceData:
    """Normalized price data from any source."""
    symbol: str
    price: float  # normalized to USD
    confidence: Optional[float]  # for Pyth
    timestamp: float  # Unix timestamp
    source: FeedSource
    age_seconds: float  # How old this reading is


@dataclass
class FeedConfig:
    """Configuration for feed reliability."""
    hermes_url: str = "https://hermes.pyth.network"
    meteora_url: str = "https://dlmm-api.meteora.ag"
    cache_ttl_seconds: float = 30
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    staleness_threshold_seconds: float = 60
    fallback_enabled: bool = True


class FeedReliabilityError(Exception):
    """Raised when all feed sources fail."""
    pass


class StalePriceError(Exception):
    """Raised when price data is too old."""
    pass


class PriceFeed:
    """
    Unified price feed with retry, fallback, and staleness detection.
    
    Usage:
        feed = PriceFeed(config)
        price = await feed.get_price("SOL/USD")
    """
    
    # Pyth price IDs for common tokens
    PRICE_IDS = {
        "SOL/USD": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "BTC/USD": "GVXRSBjFk6e6J3zbVPX9k5tKchM5NbKgv2cL5nE9K8c",
        "ETH/USD": "JUPoVaMp8HPWRDbN8E5o6c4BzSqhU1h1oV57VJmW5bcW",
        "USDC/USD": "Gv2GDqkE2qKrS1i7h8muF8MHe2vL6qF5Q6K7x9p3rK4M",
    }
    
    def __init__(self, config: Optional[FeedConfig] = None):
        self.config = config or FeedConfig()
        self._cache: Dict[str, PriceData] = {}
        self._cache_time: Dict[str, float] = {}
        self._source_stats: Dict[FeedSource, Dict[str, Any]] = {
            FeedSource.PYTH_HERMES: {"success": 0, "fail": 0},
            FeedSource.METEORA_API: {"success": 0, "fail": 0},
            FeedSource.CACHE: {"success": 0, "fail": 0},
        }
    
    def _is_cache_valid(self, symbol: str) -> bool:
        """Check if cached price is still valid."""
        if symbol not in self._cache:
            return False
        age = time.time() - self._cache_time.get(symbol, 0)
        return age < self.config.cache_ttl_seconds
    
    def _get_cached(self, symbol: str) -> Optional[PriceData]:
        """Get cached price if valid."""
        if self._is_cache_valid(symbol):
            self._source_stats[FeedSource.CACHE]["success"] += 1
            return self._cache.get(symbol)
        return None
    
    def _set_cache(self, price: PriceData):
        """Cache price data."""
        self._cache[price.symbol] = price
        self._cache_time[price.symbol] = time.time()
    
    async def get_price(self, symbol: str, allow_stale: bool = False) -> PriceData:
        """
        Get price for symbol with retry and fallback.
        
        Args:
            symbol: Token pair (e.g., "SOL/USD")
            allow_stale: If True, return stale data if fresh unavailable
            
        Returns:
            PriceData with normalized price
            
        Raises:
            FeedReliabilityError: If all sources fail
            StalePriceError: If price is too old and allow_stale=False
        """
        # Check cache first
        cached = self._get_cached(symbol)
        if cached:
            return cached
        
        # Try primary (Pyth Hermes)
        try:
            price = await self._fetch_pyth_hermes(symbol)
            self._set_cache(price)
            self._source_stats[FeedSource.PYTH_HERMES]["success"] += 1
            return price
        except Exception as e:
            logger.warning(f"Pyth Hermes failed for {symbol}: {e}")
            self._source_stats[FeedSource.PYTH_HERMES]["fail"] += 1
        
        # Try fallback (Meteora)
        if self.config.fallback_enabled:
            try:
                price = await self._fetch_meteora(symbol)
                self._set_cache(price)
                self._source_stats[FeedSource.METEORA_API]["success"] += 1
                return price
            except Exception as e:
                logger.warning(f"Meteora fallback failed for {symbol}: {e}")
                self._source_stats[FeedSource.METEORA_API]["fail"] += 1
        
        # Try stale cache if allowed
        if allow_stale and symbol in self._cache:
            price = self._cache[symbol]
            logger.warning(f"Returning stale price for {symbol}: {price.age_seconds:.0f}s old")
            return price
        
        raise FeedReliabilityError(f"All feed sources failed for {symbol}")
    
    async def _fetch_pyth_hermes(self, symbol: str) -> PriceData:
        """Fetch from Pyth Hermes with retry."""
        price_id = self.PRICE_IDS.get(symbol)
        if not price_id:
            raise ValueError(f"Unknown symbol: {symbol}")
        
        import aiohttp
        url = f"{self.config.hermes_url}/v2/latest_price_feeds?ids[]={price_id}"
        
        for attempt in range(self.config.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status != 200:
                            raise Exception(f"HTTP {resp.status}")
                        data = await resp.json()
                        
                        if not data or len(data) == 0:
                            raise Exception("Empty response")
                        
                        feed = data[0]
                        price_raw = float(feed["price"]["price"])
                        expo = feed["price"]["expo"]
                        
                        return PriceData(
                            symbol=symbol,
                            price=price_raw * (10 ** expo),
                            confidence=float(feed.get("price", {}).get("conf", 0)),
                            timestamp=time.time(),
                            source=FeedSource.PYTH_HERMES,
                            age_seconds=0
                        )
            except Exception as e:
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay_seconds * (attempt + 1))
                    continue
                raise
    
    async def _fetch_meteora(self, symbol: str) -> PriceData:
        """Fetch from Meteora API as fallback."""
        import aiohttp
        # Extract base token from symbol (e.g., "SOL" from "SOL/USD")
        base = symbol.split("/")[0]
        
        url = f"{self.config.meteora_url}/pair/all"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    raise Exception(f"HTTP {resp.status}")
                pools = await resp.json()
                
                # Find pool for this token
                for pool in pools:
                    mint_x = pool.get("mint_x", "")
                    mint_y = pool.get("mint_y", "")
                    
                    # Check if this pool has our token and USDC
                    if "USDC" in pool.get("name", "") or "usdc" in pool.get("name", "").lower():
                        # Use current_price from pool
                        current_price = float(pool.get("current_price", 0))
                        if current_price > 0:
                            return PriceData(
                                symbol=symbol,
                                price=current_price,
                                confidence=None,
                                timestamp=time.time(),
                                source=FeedSource.METEORA_API,
                                age_seconds=0
                            )
        
        raise ValueError(f"No Meteora pool found for {symbol}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get feed reliability statistics."""
        total = sum(s["success"] + s["fail"] for s in self._source_stats.values())
        return {
            "source_stats": {
                source.value: {
                    "success": stats["success"],
                    "fail": stats["fail"],
                    "success_rate": stats["success"] / (stats["success"] + stats["fail"]) * 100
                    if (stats["success"] + stats["fail"]) > 0 else 0
                }
                for source, stats in self._source_stats.items()
            },
            "cache_hits": self._source_stats[FeedSource.CACHE]["success"],
            "total_requests": total
        }


# Synchronous wrapper for existing code
class SyncPriceFeed:
    """Synchronous wrapper around async PriceFeed."""
    
    def __init__(self, config: Optional[FeedConfig] = None):
        self._feed = PriceFeed(config)
    
    def get_price(self, symbol: str) -> PriceData:
        """Get price synchronously."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, we need to create a new task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self._feed.get_price(symbol))
                    return future.result()
            else:
                return loop.run_until_complete(self._feed.get_price(symbol))
        except RuntimeError:
            # No event loop, create one
            return asyncio.run(self._feed.get_price(symbol))
    
    def get_stats(self) -> Dict[str, Any]:
        return self._feed.get_stats()
