import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const wallet = Keypair.generate();
const secretKey = Array.from(wallet.secretKey);
fs.writeFileSync('/data/repos/Pryan-Fire/hughs-forge/wallets/testnet-wallet.json', JSON.stringify(secretKey));
console.log(wallet.publicKey.toBase58());
