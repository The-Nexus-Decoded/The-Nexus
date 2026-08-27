import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import "dotenv/config";

const fetchLpPositions = async (
  connection: Connection,
  wallet: PublicKey
) => {
  console.log(`🔎 Fetching LP positions for wallet: ${wallet.toBase58()}...`);
  const allPositions = await DLMM.getAllLbPairPositionsByUser(connection, wallet);

  if (Object.keys(allPositions).length === 0) {
    console.log("❎ No active DLMM positions found for this wallet.");
    return;
  }

  console.log(`✅ Found ${Object.keys(allPositions).length} DLMM positions:`);
  for (const [lbPair, position] of allPositions) {
    console.log(`\n--- Position in ${lbPair} ---`);
    position.lbPairPositionsData.forEach((pos) => {
      console.log(
        `  - Lower Bin: ${pos.positionData.lowerBinId}, Upper Bin: ${pos.positionData.upperBinId}`
      );
    });
  }
};

// The entry point for the Meteora Trader service.
const main = async () => {
  console.log("🔥 Initializing Meteora Trader Service...");

  const rpcUrl = process.env.HELIUS_RPC_URL;
  const walletPk = process.env.TRADING_WALLET_PUBLIC_KEY;

  if (!rpcUrl || !walletPk) {
    console.error(
      "❌ HELIUS_RPC_URL or TRADING_WALLET_PUBLIC_KEY is not defined in the environment variables."
    );
    process.exit(1);
  }

  console.log(`📡 Connecting to Solana RPC: ${rpcUrl.substring(0, 50)}...`);
  const connection = new Connection(rpcUrl, "confirmed");
  const walletPublicKey = new PublicKey(walletPk);

  try {
    const epochInfo = await connection.getEpochInfo();
    console.log(`✅ Connection successful. Current epoch: ${epochInfo.epoch}`);
  } catch (error) {
    console.error("❌ Failed to connect to Solana RPC.", error);
    process.exit(1);
  }

  // Fetch and display LP positions
  await fetchLpPositions(connection, walletPublicKey);
};

main().catch((err) => {
  console.error("An unexpected error occurred:", err);
  process.exit(1);
});
