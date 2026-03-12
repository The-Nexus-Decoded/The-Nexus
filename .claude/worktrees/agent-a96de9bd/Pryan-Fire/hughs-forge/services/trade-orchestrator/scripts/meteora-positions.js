#!/usr/bin/env node
/**
 * Meteora DLMM Position Fetcher
 * Uses @meteora-ag/dlmm SDK to get positions by wallet
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { positionOwnerFilter, positionV2Filter } = require('@meteora-ag/dlmm');

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DLMM_PROGRAM_ID = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';

async function getPositions(walletAddress) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new PublicKey(walletAddress);
  const programId = new PublicKey(DLMM_PROGRAM_ID);
  
  try {
    // Get V2 positions using SDK filters
    const filters = [
      positionOwnerFilter(wallet),
      positionV2Filter(),
    ];
    
    const accounts = await connection.getProgramAccounts(programId, {
      filters,
    });
    
    // Also try V1 positions
    const v1Filters = [positionOwnerFilter(wallet)];
    const v1Accounts = await connection.getProgramAccounts(programId, {
      filters: v1Filters,
    });
    
    const allAccounts = [...accounts, ...v1Accounts];
    
    // Remove duplicates (same pubkey)
    const seen = new Set();
    const unique = allAccounts.filter(acc => {
      const key = acc.pubkey.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const positions = unique.map(acc => ({
      pubkey: acc.pubkey.toString(),
      lamports: acc.account.lamports,
      dataLength: acc.account.data.length,
      // Return base64 encoded data for later decoding
      dataBase64: acc.account.data.toString('base64'),
    }));
    
    return {
      success: true,
      wallet: walletAddress,
      count: positions.length,
      positions: positions,
      v2_count: accounts.length,
      v1_count: v1Accounts.length,
    };
  } catch (error) {
    return {
      success: false,
      wallet: walletAddress,
      error: error.message
    };
  }
}

// CLI interface
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node meteora-positions.js <wallet_address>');
  process.exit(1);
}

const wallet = args[0];
getPositions(wallet).then(result => {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
