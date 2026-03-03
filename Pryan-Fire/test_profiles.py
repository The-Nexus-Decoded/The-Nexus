import asyncio
import json
from src.services.security_scanner import AntiRugScanner

async def test_profiles():
    with open("config/trading_profiles.json", "r") as f:
        config = json.load(f)

    # 1. Test "SafeSentinel" Profile
    print("\n[TEST] Profile: SAFE SENTINEL")
    safe_scanner = AntiRugScanner(config["profiles"]["SafeSentinel"])

    # Mocking a "bundled" token for SafeSentinel (should reject due to use_bundle_check=True)
    async def mock_gmgn_advanced(mint):
        return {
            "is_bundled": True,
            "top_10_holders_share": 10.0,
            "volume_24h": 1000000.0,
            "total_fees": 1200.0
        }

    safe_scanner._fetch_gmgn_advanced = mock_gmgn_advanced
    res = await safe_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Safe Sentinel Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

    # 2. Test "AggressiveLabyrinth" Profile
    print("\n[TEST] Profile: AGGRESSIVE LABYRINTH")
    aggr_scanner = AntiRugScanner(config["profiles"]["AggressiveLabyrinth"])
    aggr_scanner._fetch_gmgn_advanced = mock_gmgn_advanced
    res = await aggr_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Aggressive Labyrinth Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_profiles())
