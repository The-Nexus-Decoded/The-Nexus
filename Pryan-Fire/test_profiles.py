import asyncio
import json
from src.services.security_scanner import AntiRugScanner

async def test_profiles():
    with open("config/trading_profiles.json", "r") as f:
        config = json.load(f)

    # 1. Test "Safe" Profile
    print("\n[TEST] Profile: SAFE")
    safe_scanner = AntiRugScanner(config["profiles"]["SafeSentinel"])

    # Mocking a "bundled" but otherwise clean token
    async def mock_bundled_advanced(mint):
        return {
            "is_bundled": True,
            "top_10_holders_share": 10.0,
            "volume_24h": 1000000.0,
            "total_fees": 1000.0
        }

    safe_scanner._fetch_gmgn_advanced = mock_bundled_advanced
    res = await safe_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Safe Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

    # 2. Test "Aggressive" Profile
    print("\n[TEST] Profile: AGGRESSIVE")
    aggr_scanner = AntiRugScanner(config["profiles"]["AggressiveLabyrinth"])
    aggr_scanner._fetch_gmgn_advanced = mock_bundled_advanced
    res = await aggr_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Aggressive Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_profiles())
