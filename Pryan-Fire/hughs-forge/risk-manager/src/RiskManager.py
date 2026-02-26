import asyncio
import json
import logging
from typing import Dict, Any
import discord
from discord.ext import commands

# The Warden: Risk Management Gating logic.
# Inscribed by Haplo (ola-claw-dev) for the Patryn Trading Pipeline.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Warden")

class RiskManager:
    def __init__(self, discord_token: str, channel_id: int):
        self.token = discord_token
        self.channel_id = channel_id
        self.bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
        self.lock = asyncio.Lock()
        self.pending_trades: Dict[str, asyncio.Event] = {}
        self.trade_approvals: Dict[str, bool] = {}

    async def check_trade(self, trade_id: str, trade_details: Dict[str, Any]) -> bool:
        """
        Gates a trade until human confirmation via Discord.
        """
        async with self.lock:
            logger.info(f"Checking trade: {trade_id}")
            
            # Post to Discord
            channel = self.bot.get_channel(self.channel_id)
            if not channel:
                logger.error("Trading channel not found!")
                return False

            message_text = (
                f"🛡️ **TRADE APPROVAL REQUIRED** 🛡️\n"
                f"**ID:** `{trade_id}`\n"
                f"**Action:** {trade_details.get('action')}\n"
                f"**Pool:** `{trade_details.get('pool')}`\n"
                f"**Size:** {trade_details.get('amount')} SOL\n\n"
                f"React with ✅ to APPROVE or ❌ to REJECT."
            )
            
            message = await channel.send(message_text)
            await message.add_reaction("✅")
            await message.add_reaction("❌")

            # Setup wait state
            event = asyncio.Event()
            self.pending_trades[trade_id] = event
            
            try:
                # Wait for interaction (Timeout after 5 mins)
                await asyncio.wait_for(event.wait(), timeout=300.0)
                return self.trade_approvals.get(trade_id, False)
            except asyncio.TimeoutError:
                logger.warning(f"Trade {trade_id} timed out.")
                return False
            finally:
                self.pending_trades.pop(trade_id, None)

    async def on_reaction(self, reaction: discord.Reaction, user: discord.User):
        """
        Handles the reaction-based approval logic.
        """
        if user.bot:
            return

        # Simple ID lookup via message content for MVP
        if "TRADE APPROVAL REQUIRED" in reaction.message.content:
            trade_idLine = [l for l in reaction.message.content.split('\n') if "**ID:**" in l]
            if not trade_idLine: return
            
            trade_id = trade_idLine[0].split('`')[1]
            
            if trade_id in self.pending_trades:
                if str(reaction.emoji) == "✅":
                    self.trade_approvals[trade_id] = True
                    self.pending_trades[trade_id].set()
                elif str(reaction.emoji) == "❌":
                    self.trade_approvals[trade_id] = False
                    self.pending_trades[trade_id].set()
