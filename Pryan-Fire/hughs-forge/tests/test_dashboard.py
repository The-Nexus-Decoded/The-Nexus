import asyncio
import json
from src.services.security_scanner import AntiRugScanner

async def test_dashboard_logic():
    with open("config/trading_profiles.json", "r") as f:
        config = json.load(f)
    
    # Mock data for a "Bundled" token
    bundled_mock = {"is_mintable": False, "is_freezable": False, "is_lp_burned": True, "is_bundled": True, "top_10_holders_share": 10.0}

    # 1. Test "SafeSentinel" (Checkbox for bundle check is TRUE)
    print("\n[TEST] Profile: SafeSentinel (Bundle Check = ON)")
    safe_scanner = AntiRugScanner(config["profiles"]["SafeSentinel"])
    safe_scanner._fetch_gmgn_security = lambda m: asyncio.sleep(0, result=bundled_mock)
    res = await safe_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Safe Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")
    
    # 2. Test "SniperDegen" (Master Rug Check Checkbox is FALSE)
    print("\n[TEST] Profile: SniperDegen (Master Check = OFF)")
    sniper_scanner = AntiRugScanner(config["profiles"]["SniperDegen"])
    sniper_scanner._fetch_gmgn_security = lambda m: asyncio.sleep(0, result=bundled_mock)
    res = await sniper_scanner.scan_token("BUNDLED_TOKEN")
    print(f"Sniper Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Outcome: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_dashboard_logic())
