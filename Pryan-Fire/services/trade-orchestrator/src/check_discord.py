import asyncio
import aiohttp
import sys

async def check():
    print("Testing Discord Gateway Connectivity...")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("https://discord.com/api/v9/gateway") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"SUCCESS: Discord Gateway URL: {data.get('url')}")
                else:
                    print(f"FAILED: Status {resp.status}")
        except Exception as e:
            print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check())
