# Manual Setup Guide for ola-claw-trade

Lord Xar, if the Tailscale Bridge remains blocked, perform these runes on `ola-claw-trade` (100.104.166.53) to finalize the forge.

## 1. Code Manifest
```bash
mkdir -p /data/repos && cd /data/repos
git clone https://github.com/The-Nexus-Decoded/Pryan-Fire.git hughs-forge
cd hughs-forge
```

## 2. Environment Forge
```bash
# Python Sentinel
python3 -m venv venv
./venv/bin/pip install aiohttp discord.py base58 solders solana

# TypeScript Armory
cd hughs-forge/meteora-trader
npm install
```

## 3. Persistent Wakefulness
```bash
# Install the systemd unit
sudo cp hughs-forge/services/trade-orchestrator/patryn-trader.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable patryn-trader
sudo systemctl start patryn-trader
```
