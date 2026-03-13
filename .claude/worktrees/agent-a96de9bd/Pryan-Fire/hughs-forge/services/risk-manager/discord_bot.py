import os
import asyncio
import httpx
from discord.ext import commands

DISCORD_TOKEN = os.getenv("RISK_MANAGER_DISCORD_TOKEN")
TARGET_CHANNEL_ID = int(os.getenv("DISCORD_TRADING_CHANNEL_ID", "0"))
API_BASE_URL = os.getenv("RISK_MANAGER_API_BASE_URL", "http://localhost:8000")

bot = commands.Bot(command_prefix="!")

@bot.event
async def on_ready():
    print(f"Risk Manager Discord Bot has connected to Discord!")
    print(f"Monitoring channel: {TARGET_CHANNEL_ID}")

@bot.command(name="approve_trade")
async def approve_trade(ctx, trade_id: str):
    if ctx.channel.id != TARGET_CHANNEL_ID:
        return await ctx.send(f"Please use the designated trading channel <#{TARGET_CHANNEL_ID}> for trade approvals.")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE_URL}/resolve_trade",
                json={"trade_id": trade_id, "approved": True, "user": str(ctx.author)}
            )
            response.raise_for_status()
            await ctx.send(f"Trade {trade_id} approved by {ctx.author}.")
    except httpx.HTTPStatusError as e:
        await ctx.send(f"Error approving trade {trade_id}: {e.response.text}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred: {e}")

@bot.command(name="deny_trade")
async def deny_trade(ctx, trade_id: str):
    if ctx.channel.id != TARGET_CHANNEL_ID:
        return await ctx.send(f"Please use the designated trading channel <#{TARGET_CHANNEL_ID}> for trade denials.")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE_URL}/resolve_trade",
                json={"trade_id": trade_id, "approved": False, "user": str(ctx.author)}
            )
            response.raise_for_status()
            await ctx.send(f"Trade {trade_id} denied by {ctx.author}.")
    except httpx.HTTPStatusError as e:
        await ctx.send(f"Error denying trade {trade_id}: {e.response.text}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred: {e}")

async def send_trade_request(trade_details: Dict[str, Any], trade_id: str):
    channel = bot.get_channel(TARGET_CHANNEL_ID)
    if not channel:
        print(f"Error: Discord channel with ID {TARGET_CHANNEL_ID} not found.")
        return

    embed = discord.Embed(
        title="Trade Approval Request",
        description=f"A new trade requires your approval. Use `!approve_trade {trade_id}` or `!deny_trade {trade_id}`.",
        color=discord.Color.blue()
    )
    for key, value in trade_details.items():
        embed.add_field(name=key.replace('_', ' ').title(), value=str(value), inline=True)
    
    await channel.send(embed=embed)

def run_bot():
    if not DISCORD_TOKEN:
        print("RISK_MANAGER_DISCORD_TOKEN environment variable not set.")
        return
    bot.run(DISCORD_TOKEN)

if __name__ == "__main__":
    # This block is for local testing/running. In production, it might be run via a systemd service.
    # Ensure DISCORD_TOKEN and DISCORD_TRADING_CHANNEL_ID are set in your environment.
    run_bot()
