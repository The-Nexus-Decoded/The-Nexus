import httpx
import asyncio

async def fetch_solana_pools():
    """Fetches, filters, and logs high-quality Solana pools from DexScreener with Price Action Delta."""
    api_url = "https://api.dexscreener.com/latest/dex/search/?q=solana" 
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            
            if data is None:
                print("Error: API returned empty or invalid JSON response.")
                return []

            pools = data.get('pairs', [])
            
            # Golden Filter: Liquidity > $50,000 and Volume (24h) > $100,000
            filtered_pools = []
            for p in pools:
                liq = float(p.get('liquidity', {}).get('usd') or 0)
                vol = float(p.get('volume', {}).get('h24') or 0)
                
                if liq > 50000 and vol > 100000:
                    filtered_pools.append(p)

            # Sort by 24h volume
            sorted_pools = sorted(
                filtered_pools,
                key=lambda x: float(x.get('volume', {}).get('h24') or 0),
                reverse=True
            )
            
            print(f"Fetched {len(pools)} total Solana-related pools.")
            print(f"Found {len(filtered_pools)} '🚨 MOMENTUM-FILTERED WHALES 🚨' matching Liq > $50k and Vol > $100k.")

            if sorted_pools:
                print("=" * 45)
                print("🚨 MOMENTUM-FILTERED WHALES (Sorted by 24h Vol) 🚨")
                print("=" * 45)
                for pool in sorted_pools[:5]:
                    base = pool.get('baseToken', {}).get('symbol', 'N/A')
                    quote = pool.get('quoteToken', {}).get('symbol', 'N/A')
                    name = f"{base}/{quote}"
                    price = pool.get('priceUsd', 'N/A')
                    liq = pool.get('liquidity', {}).get('usd', 'N/A')
                    vol = pool.get('volume', {}).get('h24', 'N/A')
                    address = pool.get('pairAddress', 'N/A')
                    
                    # Price Change Delta
                    change_1h = pool.get('priceChange', {}).get('h1', '0')
                    change_24h = pool.get('priceChange', {}).get('h24', '0')
                    
                    print(f"Pair: {name}")
                    print(f"  Price: ${price}")
                    print(f"  Liquidity: ${liq}")
                    print(f"  24h Volume: ${vol}")
                    print(f"  Change (1h): {change_1h}%")
                    print(f"  Change (24h): {change_24h}%")
                    print(f"  Address: {address}")
                    print("-" * 45)
            else:
                print("No high-quality signals found in this cycle.")
            
            return sorted_pools
    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e.response.status_code}")
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []

async def main():
    print("Executing Signal Intelligence - Price Action Delta...")
    await fetch_solana_pools()

if __name__ == "__main__":
    asyncio.run(main())
