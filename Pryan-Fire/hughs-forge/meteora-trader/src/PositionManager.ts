import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";

export class PositionManager {
    private connection: Connection;
    private owner: PublicKey;

    constructor(rpcUrl: string, ownerPublicKey: string) {
        this.connection = new Connection(rpcUrl, "confirmed");
        this.owner = new PublicKey(ownerPublicKey);
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

    async getPoolBins(poolAddress: string) {
        const dlmmPool = await DLMM.create(this.connection, new PublicKey(poolAddress));
        const bins = await dlmmPool.getBinsAroundActiveBin(10, 10);
        return bins;
    }
}
