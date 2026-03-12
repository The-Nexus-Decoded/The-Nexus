import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import { HermesClient } from './HermesClient';

/**
 * PositionManager - Manages DLMM positions
 * Refactored to use working HermesClient from services/meteora-trader
 */
export class PositionManager {
    private connection: Connection;
    private owner: PublicKey;
    private hermesClient: HermesClient;

    constructor(rpcUrl: string, ownerPublicKey: string, hermesUrl: string = "https://hermes.pyth.network") {
        this.connection = new Connection(rpcUrl, "confirmed");
        this.owner = new PublicKey(ownerPublicKey);
        this.hermesClient = new HermesClient(hermesUrl);
    }

    async fetchActivePositions() {
        try {
            // @ts-ignore - DLMM types incomplete
            const positions = await DLMM.getAllLbPairPositionsByUser(this.connection, this.owner);
            return Array.from(positions.values());
        } catch (error) {
            console.error("Failed to fetch positions:", error);
            return [];
        }
    }

    async claimFees(poolAddress: string): Promise<(Transaction[] | null)[]> {
        try {
            // @ts-ignore - DLMM types incomplete
            const dlmmPool = await DLMM.create(this.connection, new PublicKey(poolAddress));
            const positions = await dlmmPool.getPositionsByUserAndLbPair(this.owner);
            
            const claimTxs = await Promise.all(
                positions.userPositions.map(async (pos: any) => {
                    try {
                        return await dlmmPool.claimSwapFee({
                            owner: this.owner,
                            position: pos
                        });
                    } catch {
                        return null;
                    }
                })
            );
            return claimTxs;
        } catch (error) {
            console.error("Failed to claim fees:", error);
            return [];
        }
    }

    async fetchSolanaPrice(): Promise<number | null> {
        // SOL/USD price ID from Pyth
        const SOL_USD_ID = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
        return this.hermesClient.getPrice(SOL_USD_ID);
    }

    getConnection(): Connection {
        return this.connection;
    }

    getOwner(): PublicKey {
        return this.owner;
    }
}
