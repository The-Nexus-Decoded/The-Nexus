import asyncio
from src.services.security_scanner import AntiRugScanner

async def test_anti_rug():
    # Minimal profile for testing scanner functionality
    TEST_PROFILE = {
        "security": {
            "use_rug_check": True,
            "use_bundle_check": True,
            "enforce_lp_lock": True,
            "enforce_revoked_mint": True,
            "enforce_revoked_freeze": True,
            "min_fee_volume_ratio": 0.001,
            "max_holder_concentration": 25.0
        }
    }
    scanner = AntiRugScanner(TEST_PROFILE)

    # Test 1: "Verified" Token Pattern
    print("\n[TEST] Pattern: Verified Launch (Clean)")
    res = await scanner.scan_token("CLEAN_MINT_123")
    print(f"Result: {res}")

    # Test 2: "Rug" Pattern: Baseline failures + advanced failures
    print("\n[TEST] Pattern: Rug Hazard (Freeze Auth + LP not burned + Bundle + Concentration + Wash trade)")

    async def mock_bad_baseline(mint):
        # Baseline security failures: freeze authority present, LP not burned
        return {"is_mintable": False, "is_freezable": True, "is_lp_burned": False, "rugcheck_score": 20}

    async def mock_bad_advanced(mint):
        # Advanced market failures: bundled, high concentration, low fee ratio
        return {"is_bundled": True, "top_10_holders_share": 45.0, "volume_24h": 5000000.0, "total_fees": 500.0}  # fee ratio 0.0001

    scanner._fetch_rugcheck_baseline = mock_bad_baseline
    scanner._fetch_gmgn_advanced = mock_bad_advanced

    res = await scanner.scan_token("RUG_MINT_456")
    print(f"Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_anti_rug())
