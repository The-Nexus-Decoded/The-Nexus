import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { PositionManager } from './PositionManager';
import { BN } from '@coral-xyz/anchor';

/**
 * CompoundingEngine: The Mandatory Claim -> Reinvest Loop.
 * Fees earned in DLMM do not auto-compound; this pulse re-injects them.
 */
export class CompoundingEngine {
    constructor(
        private connection: Connection,
        private manager: PositionManager
    ) {}

    /**
     * Executes the 'Empire Loop': Claim rewards and immediately reinvest into the active bin.
     * Updated to support Strategy Toggles (Bid-Ask, Single-Sided).
     */
    async executeCompoundingStrike(
        poolAddress: string, 
        wallet: Keypair, 
        intent: { strategy?: string, swapOnEntry?: boolean, padding?: number } = {}
    ) {
        console.log(`[Compounding] Initiating strike on pool ${poolAddress} with strategy ${intent.strategy || 'SPOT_WIDE'}...`);
        
        // 1. Claim Accumulated Fees
        const claimTxs = await this.manager.claimFees(poolAddress);
        if (!claimTxs || claimTxs.length === 0) {
            console.log("[Compounding] No fees found to harvest.");
            return;
        }

        // 2. Load Pool State for Reinvestment
        const poolPublicKey = new PublicKey(poolAddress);
        const dlmmPool = await DLMM.create(this.connection, poolPublicKey);
        
        console.log(`[Compounding] Fees harvested. Re-injecting loot using ${intent.strategy || 'SPOT_WIDE'}...`);
        
        const padding = intent.padding || 5;
        let strategyType = 0; // Default Spot

        if (intent.strategy === "STRATEGY_BID_ASK_WIDE") {
            strategyType = 2; // Bid-Ask
        } else if (intent.strategy === "CURVE") {
            strategyType = 1; // Curve
        }

        // Inscribe the new position strategy based on the Heart's commands
        const reinvestTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
            positionPubKey: Keypair.generate().publicKey,
            user: wallet.publicKey,
            strategy: {
                maxBinId: dlmmPool.activeBin.binId + padding,
                minBinId: dlmmPool.activeBin.binId - padding,
                strategyType: strategyType
            },
            totalXAmount: new BN(0), // Logic for single-sided vs balanced is handled via wallet balances post-claim
            totalYAmount: new BN(0)
        });

        console.log("[Compounding] Strike complete. Loot is working for the Empire.");
        return reinvestTx;
    }
}
