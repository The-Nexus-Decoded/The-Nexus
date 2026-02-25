import httpx
from typing import Dict, Any, Optional
import asyncio

class AntiRugScanner:
    """
    Sentinel of the Dev Factory. 
    Uses GMGN.ai and profile-based metrics to filter out high-risk tokens.
    """
    def __init__(self, profile: Dict[str, Any]):
        self.profile_data = profile
        self.sec_config = profile.get("security", {})
        
        # Load constraints from profile
        self.max_top_holders_pct = self.sec_config.get("max_top_holders_pct", 25.0)
        self.min_organic_fee_ratio = self.sec_config.get("min_organic_fee_ratio", 0.001)
        self.require_lp_burned = self.sec_config.get("require_lp_burned", True)
        self.require_revoked_mint = self.sec_config.get("require_revoked_mint", True)
        self.require_revoked_freeze = self.sec_config.get("require_revoked_freeze", True)
        self.allow_bundled = self.sec_config.get("allow_bundled", False)

    async def scan_token(self, mint_address: str) -> Dict[str, Any]:
        """
        Executes a pre-flight security scan for a token.
        """
        print(f"[SENTINEL] Scanning token: {mint_address}")
        
        # 1. Fetch GMGN Security Data (Bundle & Security check)
        security_data = await self._fetch_gmgn_security(mint_address)
        
        # 2. Fetch GMGN Volume/Fees (Wash-trade check)
        market_data = await self._fetch_gmgn_market(mint_address)
        
        # 3. Analyze Risks
        analysis = self._perform_risk_analysis(security_data, market_data)
        
        return analysis

    async def _fetch_gmgn_security(self, mint: str) -> Dict[str, Any]:
        """Simulated fetch for security flags: LP, Mint, Freeze, Bundles."""
        await asyncio.sleep(0.01)
        return {
            "is_mintable": False,
            "is_freezable": False,
            "is_lp_burned": True,
            "is_bundled": False,
            "top_10_holders_share": 15.5
        }

    async def _fetch_gmgn_market(self, mint: str) -> Dict[str, Any]:
        """Simulated fetch for market health: Volume and Fees."""
        await asyncio.sleep(0.01)
        return {
            "volume_24h": 1000000.0,
            "total_fees": 1200.0 # 0.12% ratio
        }

    def _perform_risk_analysis(self, security: Dict[str, Any], market: Dict[str, Any]) -> Dict[str, Any]:
        results = {"passed": True, "reasons": []}
        
        # Ward 1: Authorities
        if self.require_revoked_mint and security.get("is_mintable"):
            results["passed"] = False
            results["reasons"].append("MINT_AUTHORITY_ACTIVE")
        if self.require_revoked_freeze and security.get("is_freezable"):
            results["passed"] = False
            results["reasons"].append("FREEZE_AUTHORITY_ACTIVE")
            
        # Ward 2: Liquidity
        if self.require_lp_burned and not security.get("is_lp_burned"):
            results["passed"] = False
            results["reasons"].append("LP_NOT_BURNED")
            
        # Ward 3: Bundles (GMGN Special)
        if not self.allow_bundled and security.get("is_bundled"):
            results["passed"] = False
            results["reasons"].append("BUNDLED_LAUNCH_DETECTED")
            
        # Ward 4: Holder Concentration
        if security.get("top_10_holders_share", 0) > self.max_top_holders_pct:
            results["passed"] = False
            results["reasons"].append(f"HIGH_HOLDER_CONCENTRATION ({security['top_10_holders_share']}%)")
            
        # Ward 5: Wash-Trading (GMGN Special)
        fee_ratio = market.get("total_fees", 0) / market.get("volume_24h", 1)
        if fee_ratio < self.min_organic_fee_ratio:
            results["passed"] = False
            results["reasons"].append(f"WASH_TRADE_SUSPICION (Fee Ratio: {fee_ratio:.4f})")
            
        return results
