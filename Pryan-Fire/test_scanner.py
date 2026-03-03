import asyncio
import json
from src.services.security_scanner import AntiRugScanner

async def test_anti_rug():
    with open("config/trading_profiles.json", "r") as f:
        config = json.load(f)
    scanner = AntiRugScanner(config["profiles"]["SafeSentinel"])

    # Test 1: "Verified" Token Pattern
    print("\n[TEST] Pattern: Verified Launch (Clean)")
    res = await scanner.scan_token("CLEAN_MINT_123")
    print(f"Result: {res}")

    # Test 2: "Rug" Pattern: High Concentration + Low Fee Ratio
    print("\n[TEST] Pattern: Rug Hazard (Bundled + High Concentration + Low Fees)")

    async def mock_bad_baseline(mint):
        return {"is_mintable": False, "is_freezable": True, "is_lp_burned": False, "rugcheck_score": 50}
    async def mock_bad_advanced(mint):
        return {
            "is_bundled": True,
            "top_10_holders_share": 45.0,
            "volume_24h": 5000000.0,
            "total_fees": 500.0  # 0.01% ratio, below threshold
        }

    scanner._fetch_rugcheck_baseline = mock_bad_baseline
    scanner._fetch_gmgn_advanced = mock_bad_advanced

    res = await scanner.scan_token("RUG_MINT_456")
    print(f"Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_anti_rug())
