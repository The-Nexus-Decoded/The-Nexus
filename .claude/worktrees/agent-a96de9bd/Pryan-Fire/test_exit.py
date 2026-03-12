import asyncio
from src.data.ledger import LedgerDB
from src.executor.exit_strategy import ExitStrategist

async def test_exit():
    # Setup test DB
    db_path = "src/data/test_exit.db"
    import os
    if os.path.exists(db_path): os.remove(db_path)
    
    ledger = LedgerDB(db_path)
    
    # Simulate a position: JUP at $1.00
    ledger.record_trade({
        'action': 'BUY',
        'mint': 'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH',
        'symbol': 'JUP',
        'amount_atoms': 1000000000,
        'price_usd': 1.00,
        'total_usd': 1000.00,
        'status': 'SUCCESS'
    })

    strategist = ExitStrategist(ledger, tp_percent=20.0, sl_percent=-10.0)

    # Test 1: No signal (Price $1.10)
    print("\n[TEST] Price $1.10 (+10%):")
    prices = {'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH': 1.10}
    signals = await strategist.check_all_positions(prices)
    print(f"Signals: {signals}")

    # Test 2: Take Profit (Price $1.25)
    print("\n[TEST] Price $1.25 (+25%):")
    prices = {'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH': 1.25}
    signals = await strategist.check_all_positions(prices)
    print(f"Signals: {signals}")

    # Test 3: Stop Loss (Price $0.85)
    print("\n[TEST] Price $0.85 (-15%):")
    prices = {'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH': 0.85}
    signals = await strategist.check_all_positions(prices)
    print(f"Signals: {signals}")

if __name__ == "__main__":
    asyncio.run(test_exit())
