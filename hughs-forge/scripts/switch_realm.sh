#!/bin/bash

# The Chasm-Shifter: Sentinel Test Mode Toggle
# Use: ./switch_realm.sh [testnet|mainnet]

REALM=$1
WORKSHOP_ROOT="/data/repos/Pryan-Fire/hughs-forge"
TARGET_CONFIG="$WORKSHOP_ROOT/services/trade-orchestrator/src/orchestrator_config.json"

if [ "$REALM" == "testnet" ]; then
    echo "🗡️ Shifting Sentinel to the Phantom Realm (Devnet)..."
    cp "$WORKSHOP_ROOT/config/testnet/orchestrator_config.json" "$TARGET_CONFIG"
    # Ensure current test vault is exported to the environment
    echo 'export TRADING_WALLET_PUBLIC_KEY="7YjVFZjQtEaRSepkjJ4JJwpupkeYvb31D4XNNDXioL9k"' > "$WORKSHOP_ROOT/config/testnet/.env.devnet"
    echo "✅ Sentinel is now seeing the shadow-lands."
elif [ "$REALM" == "mainnet" ]; then
    echo "🔱 Restoring Sentinel to the Eternal Realm (Mainnet)..."
    # Assuming we keep a backup of the 'true' bedrock
    if [ -f "$WORKSHOP_ROOT/config/mainnet/orchestrator_config.json" ]; then
        cp "$WORKSHOP_ROOT/config/mainnet/orchestrator_config.json" "$TARGET_CONFIG"
        echo "✅ Sentinel is now seeing the True Empire."
    else
        echo "❌ Error: Mainnet bedrock backup not found!"
    fi
else
    echo "Usage: ./switch_realm.sh [testnet|mainnet]"
fi
