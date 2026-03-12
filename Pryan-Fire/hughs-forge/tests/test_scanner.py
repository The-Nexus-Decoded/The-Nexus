import asyncio
from src.services.security_scanner import AntiRugScanner

async def test_anti_rug():
    scanner = AntiRugScanner()
    
    # Test 1: "Verified" Token Pattern
    print("\n[TEST] Pattern: Verified Launch (Clean)")
    res = await scanner.scan_token("CLEAN_MINT_123")
    print(f"Result: {res}")
    
    # Test 2: "Rug" Pattern: High Concentration + Low Fee Ratio
    print("\n[TEST] Pattern: Rug Hazard (Bundled + High Concentration + Low Fees)")
    
    async def mock_bad_security(mint): 
        return {"is_mintable": False, "is_freezable": True, "is_lp_burned": False, "is_bundled": True, "top_10_holders_share": 45.0}
    async def mock_bad_market(mint): 
        return {"volume_24h": 5000000.0, "total_fees": 500.0} # 0.01% ratio
    
    scanner._fetch_gmgn_security = mock_bad_security
    scanner._fetch_gmgn_market = mock_bad_market
    
    res = await scanner.scan_token("RUG_MINT_456")
    print(f"Outcome: {'PASSED' if res['passed'] else 'REJECTED'}")
    print(f"Reasons: {res['reasons']}")

if __name__ == "__main__":
    asyncio.run(test_anti_rug())
