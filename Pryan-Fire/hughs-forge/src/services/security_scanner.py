from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Mapping


DEFAULT_PROFILE: Dict[str, Any] = {
    "enabled": True,
    "check_mintable": True,
    "check_freezable": True,
    "require_lp_burned": True,
    "check_bundled": True,
    "max_top_10_holders_share": 35.0,
    "min_fee_volume_ratio": 0.0005,
}


@dataclass
class ScanFinding:
    reason: str
    severity: str = "block"


class AntiRugScanner:
    """Read-only token risk scanner used by Hugh validation tests.

    Network fetchers are intentionally isolated methods so tests and dry-runs can
    inject fixtures without ever requiring wallet/trade execution.
    """

    def __init__(self, profile: Mapping[str, Any] | None = None):
        merged = dict(DEFAULT_PROFILE)
        if profile:
            merged.update(profile)
        self.profile = merged

    async def _fetch_gmgn_security(self, mint: str) -> Dict[str, Any]:
        return {
            "is_mintable": False,
            "is_freezable": False,
            "is_lp_burned": True,
            "is_bundled": False,
            "top_10_holders_share": 10.0,
        }

    async def _fetch_gmgn_market(self, mint: str) -> Dict[str, Any]:
        return {"volume_24h": 1_000_000.0, "total_fees": 2_000.0}

    async def scan_token(self, mint: str) -> Dict[str, Any]:
        if not self.profile.get("enabled", True):
            return {"mint": mint, "passed": True, "reasons": ["risk checks disabled by profile"]}

        security = await self._fetch_gmgn_security(mint)
        market = await self._fetch_gmgn_market(mint)
        reasons: List[str] = []

        if self.profile.get("check_mintable", True) and security.get("is_mintable"):
            reasons.append("mint authority still active")
        if self.profile.get("check_freezable", True) and security.get("is_freezable"):
            reasons.append("freeze authority still active")
        if self.profile.get("require_lp_burned", True) and not security.get("is_lp_burned", False):
            reasons.append("LP is not burned/locked")
        if self.profile.get("check_bundled", True) and security.get("is_bundled"):
            reasons.append("bundled launch detected")

        holder_share = float(security.get("top_10_holders_share") or 0)
        max_holder_share = float(self.profile.get("max_top_10_holders_share", 35.0))
        if holder_share > max_holder_share:
            reasons.append(f"top 10 holders concentration {holder_share:.1f}% > {max_holder_share:.1f}%")

        volume = float(market.get("volume_24h") or 0)
        fees = float(market.get("total_fees") or 0)
        min_ratio = float(self.profile.get("min_fee_volume_ratio", 0.0005))
        if volume > 0 and fees / volume < min_ratio:
            reasons.append("fee/volume ratio below profile threshold")

        return {
            "mint": mint,
            "passed": not reasons,
            "reasons": reasons or ["risk checks passed"],
            "security": security,
            "market": market,
        }
