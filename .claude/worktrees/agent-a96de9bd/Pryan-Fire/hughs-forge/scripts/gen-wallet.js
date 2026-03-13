const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function main() {
    const wallet = Keypair.generate();
    const secretKey = Array.from(wallet.secretKey);
    const walletPath = '/data/repos/Pryan-Fire/hughs-forge/wallets/testnet-wallet.json';
    fs.mkdirSync(path.dirname(walletPath), { recursive: true });
    fs.writeFileSync(walletPath, JSON.stringify(secretKey));
    console.log(wallet.publicKey.toBase58());
}

main().catch(console.error);
