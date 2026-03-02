#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))

from core.rpc_integration import RpcIntegrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('test_jupiter')

def main():
    TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112'
    AMOUNT = 0.01

    if not os.getenv('JUPITER_API_KEY'):
        jupiter_env = Path('/data/openclaw/keys/jupiter.env')
        if jupiter_env.exists():
            for line in jupiter_env.read_text().splitlines():
                if line.strip() and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    os.environ[k] = v

    try:
        integrator = RpcIntegrator(dry_run=False)
        logger.info(f'Wallet: {integrator.wallet.pubkey()}')
        logger.info(f'RPC: {integrator.solana_rpc}')
    except Exception as e:
        logger.error(f'Init failed: {e}', exc_info=True)
        sys.exit(1)

    logger.info(f'Executing Jupiter trade: {AMOUNT} SOL -> wSOL')
    success = integrator.execute_jupiter_trade(TOKEN_ADDRESS, AMOUNT)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
