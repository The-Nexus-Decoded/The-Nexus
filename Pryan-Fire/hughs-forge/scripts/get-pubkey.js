const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const secretKey = JSON.parse(fs.readFileSync('/data/repos/Pryan-Fire/hughs-forge/wallets/testnet-wallet.json'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
console.log(wallet.publicKey.toBase58());
