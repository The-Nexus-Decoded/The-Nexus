from src.data.ledger import LedgerDB
import os

def test_ledger():
    db_path = "src/data/test_ledger.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        
    ledger = LedgerDB(db_path)
    
    # 1. Simulate a BUY
    print("[TEST] Recording BUY of 1000 JUP at $1.00")
    buy_data = {
        'action': 'BUY',
        'mint': 'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH',
        'symbol': 'JUP',
        'amount_atoms': 1000000000, # 1000 tokens (9 dec)
        'price_usd': 1.00,
        'total_usd': 1000.00,
        'status': 'SUCCESS'
    }
    ledger.record_trade(buy_data)
    
    # 2. Check position
    positions = ledger.get_active_positions()
    print(f"[TEST] Current Positions: {positions}")
    
    # 3. Simulate another BUY (Average price check)
    print("[TEST] Recording BUY of 1000 JUP at $2.00")
    buy_data_2 = buy_data.copy()
    buy_data_2['price_usd'] = 2.00
    ledger.record_trade(buy_data_2)
    
    positions = ledger.get_active_positions()
    print(f"[TEST] Updated Positions: {positions}")
    # Expected Avg: $1.50
    
    # 4. Simulate a partial SELL
    print("[TEST] Recording SELL of 500 JUP")
    sell_data = {
        'action': 'SELL',
        'mint': 'JUPyiwrYJFv1mHvxHecCzpM2reSMMJCrMdh5okWFPdH',
        'amount_atoms': 500000000,
        'price_usd': 2.50,
        'total_usd': 1250.00
    }
    ledger.record_trade(sell_data)
    positions = ledger.get_active_positions()
    print(f"[TEST] Positions after SELL: {positions}")

if __name__ == "__main__":
    test_ledger()
