import httpx
import asyncio

async def fetch_solana_pools():
    """Fetches and logs the top 5 Solana pools by 24h volume from DexScreener."""
    api_url = "https://api.dexscreener.com/latest/dex/search/?q=solana" 
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, timeout=10.0) # Added a 10-second timeout
            response.raise_for_status()  # Raise an exception for HTTP errors
            data = response.json()
            pools = data.get('pairs', [])
            
            # Filter out pools without 24h volume data and sort by volume
            sorted_pools = sorted(
                [p for p in pools if p.get('volume', {}).get('h24') is not None],
                key=lambda x: x['volume']['h24'],
                reverse=True
            )
            
            print(f"Fetched {len(pools)} Solana pools from DexScreener.")
            if sorted_pools:
                print("Top 5 pools by 24h volume:")
                for pool in sorted_pools[:5]:
                    pair_name = f"{pool.get('baseToken', {}).get('symbol', 'N/A')}/{pool.get('quoteToken', {}).get('symbol', 'N/A')}"
                    price_usd = pool.get('priceUsd', 'N/A')
                    volume_h24 = pool.get('volume', {}).get('h24', 'N/A')
                    
                    print(f"  Pair: {pair_name}, Price (USD): {price_usd}, 24h Volume: {volume_h24}")
            else:
                print("No pools with 24h volume data found.")
            return sorted_pools
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching pools: {e.response.status_code} - {e.response.text}")
        return []
    except httpx.RequestError as e:
        print(f"Request error fetching pools: {e}")
        return []

async def main():
    print("Starting Solana Pool Monitor proto-scaffold...")
    await fetch_solana_pools()
    print("Solana Pool Monitor proto-scaffold finished.")

if __name__ == "__main__":
    asyncio.run(main())