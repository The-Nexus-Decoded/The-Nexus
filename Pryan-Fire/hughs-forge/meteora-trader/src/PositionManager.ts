import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import { PythHermesClient } from './pyth-hermes-client';

export class PositionManager {
    private connection: Connection;
    private owner: PublicKey;
    private pythHermesClient: PythHermesClient;

    constructor(rpcUrl: string, ownerPublicKey: string, hermesUrl: string) {
        this.connection = new Connection(rpcUrl, "confirmed");
        this.owner = new PublicKey(ownerPublicKey);
        this.pythHermesClient = new PythHermesClient(hermesUrl);
    }

    async fetchActivePositions() {
        const positions = await DLMM.getAllLbPairPositionsByUser(this.connection, this.owner);
        return Array.from(positions.values());
    }

    async claimFees(poolAddress: string) {
        const dlmmPool = await DLMM.create(this.connection, new PublicKey(poolAddress));
        const positions = await dlmmPool.getPositionsByUserAndLbPair(this.owner);
        const claimTxs = await Promise.all(
            positions.userPositions.map(pos => dlmmPool.claimSwapFee({
                owner: this.owner,
                position: pos
            }))
        );
        return claimTxs;
    }

    async fetchSolanaPrice() {
        return this.pythHermesClient.fetchPrice('SOL/USD');
    }

    // async getPoolBins(poolAddress: string) {
    //     const dlmmPool = await DLMM.create(this.connection, new PublicKey(poolAddress));
    //     const poolData = await dlmmPool.getLbPair();
    //     return poolData.bins;
    // }
}
