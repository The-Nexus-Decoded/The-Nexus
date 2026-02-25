import { Connection } from "@solana/web3.js";
import "dotenv/config";

// The entry point for the Meteora Trader service.
const main = async () => {
  console.log("🔥 Initializing Meteora Trader Service...");

  const rpcUrl = process.env.HELIUS_RPC_URL;

  if (!rpcUrl) {
    console.error(
      "❌ HELIUS_RPC_URL is not defined in the environment variables."
    );
    process.exit(1);
  }

  console.log(`📡 Connecting to Solana RPC: ${rpcUrl.substring(0, 50)}...`);

  const connection = new Connection(rpcUrl, "confirmed");

  try {
    const epochInfo = await connection.getEpochInfo();
    console.log(`✅ Connection successful. Current epoch: ${epochInfo.epoch}`);
    console.log(
      ` Solana slot: ${epochInfo.slotIndex}/${epochInfo.slotsInEpoch}`
    );
  } catch (error) {
    console.error("❌ Failed to connect to Solana RPC.", error);
    process.exit(1);
  }

  // TODO: Implement core trading logic
};

main().catch((err) => {
  console.error("An unexpected error occurred:", err);
  process.exit(1);
});
