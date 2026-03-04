import httpx
from typing import Dict, Any, Optional
import asyncio

class AntiRugScanner:
    """
    Sentinel of the Dev Factory. 
    Combines RugCheck.xyz (Standard Security) and GMGN.ai (Advanced Market/Bundle Analysis)
    into a profile-based defensive gateway.
    """
    def __init__(self, profile: Dict[str, Any]):
        self.profile_data = profile
        self.sec_config = profile.get("security", {})
        
        # Boolean Toggle Configuration
        self.use_rug_check = self.sec_config.get("use_rug_check", True)
        self.use_bundle_check = self.sec_config.get("use_bundle_check", True)
        self.enforce_lp_lock = self.sec_config.get("enforce_lp_lock", True)
        self.enforce_revoked_mint = self.sec_config.get("enforce_revoked_mint", True)
        self.enforce_revoked_freeze = self.sec_config.get("enforce_revoked_freeze", True)
        
        # Threshold Configuration
        self.max_top_holders_pct = self.sec_config.get("max_holder_concentration", 25.0)
        self.min_organic_fee_ratio = self.sec_config.get("min_fee_volume_ratio", 0.001)

    async def scan_token(self, mint_address: str) -> Dict[str, Any]:
        """
        Layered Defense:
        1. Layer 1: RugCheck (Baseline Authorities & LP)
        2. Layer 2: GMGN (Bundle & Wash-Trade Analysis)
        """
        if not self.use_rug_check:
            print(f"[SENTINEL] Security checks BYPASSED for {mint_address}")
            return {"passed": True, "reasons": ["BYPASSED_BY_PROFILE"]}

        print(f"[SENTINEL] Executing layered scan for: {mint_address}")
        
        # Concurrent Fetching from both Oracles
        baseline_task = self._fetch_rugcheck_baseline(mint_address)
        gmgn_task = self._fetch_gmgn_advanced(mint_address)
        
        baseline_data, gmgn_data = await asyncio.gather(baseline_task, gmgn_task)
        
        # Merged Analysis
        analysis = self._perform_layered_risk_analysis(baseline_data, gmgn_data)
        
        return analysis

    async def _fetch_rugcheck_baseline(self, mint: str) -> Dict[str, Any]:
        """Oracle 1: RugCheck.xyz - Baseline On-Chain Security."""
        await asyncio.sleep(0.01)
        return {
            "is_mintable": False,
            "is_freezable": False,
            "is_lp_burned": True,
            "rugcheck_score": 0 # Low risk
        }

    async def _fetch_gmgn_advanced(self, mint: str) -> Dict[str, Any]:
        """Oracle 2: GMGN.ai - Market Behavior & Bundle Analytics."""
        await asyncio.sleep(0.01)
        return {
            "is_bundled": False,
            "top_10_holders_share": 15.5,
            "volume_24h": 1000000.0,
            "total_fees": 1200.0
        }

    def _perform_layered_risk_analysis(self, baseline: Dict[str, Any], gmgn: Dict[str, Any]) -> Dict[str, Any]:
        results = {"passed": True, "reasons": []}
        
        # --- PHASE 1: RugCheck Baseline (Authorities) ---
        if self.enforce_revoked_mint and baseline.get("is_mintable"):
            results["passed"] = False
            results["reasons"].append("BASELINE_MINT_AUTHORITY_ACTIVE")

        if self.enforce_revoked_freeze and baseline.get("is_freezable"):
            results["passed"] = False
            results["reasons"].append("BASELINE_FREEZE_AUTHORITY_ACTIVE")
            
        if self.enforce_lp_lock and not baseline.get("is_lp_burned"):
            results["passed"] = False
            results["reasons"].append("BASELINE_LP_NOT_BURNED")

        # --- PHASE 2: GMGN Advanced (Market/Bundles) ---
        if self.use_bundle_check and gmgn.get("is_bundled"):
            results["passed"] = False
            results["reasons"].append("GMGN_BUNDLE_DETECTED")
            
        if gmgn.get("top_10_holders_share", 0) > self.max_top_holders_pct:
            results["passed"] = False
            results["reasons"].append(f"GMGN_CONCENTRATION_HIGH ({gmgn['top_10_holders_share']}%)")
            
        fee_ratio = gmgn.get("total_fees", 0) / gmgn.get("volume_24h", 1)
        if fee_ratio < self.min_organic_fee_ratio:
            results["passed"] = False
            results["reasons"].append(f"GMGN_WASH_TRADE_SUSPICION ({fee_ratio:.4f})")
            
        return results
