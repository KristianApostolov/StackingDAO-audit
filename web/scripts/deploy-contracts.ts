// TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","target":"es2019"}' ts-node deploy-contracts.ts
import { readFile as readFileFn } from 'fs';
import { promisify } from 'util';
import { RPCClient } from '@stacks/rpc-client';
import {
  getAddressFromPrivateKey,
  TransactionVersion,
  makeContractDeploy,
  StacksTestnet,
} from '@blockstack/stacks-transactions';
import BN from 'bn.js';
require('dotenv').config();

const readFile = promisify(readFileFn);

interface Contract {
  name: string;
  file?: string;
}

const contracts: Contract[] = [
  // Traits
  { name: 'sip-010-trait-ft-standard' },
  { name: 'nft-trait' },
  { name: 'commission-trait' },
  { name: 'reserve-trait-v1' },
  { name: 'staking-trait-v1' },
  { name: 'commission-trait-v1' },

  // Contracts
  // Only needed for testnet
  { name: 'pox-3-mock', file: 'tests/pox-3-mock' },

  { name: 'dao' },
  { name: 'commission-v1' },
  { name: 'reserve-v1' },
  { name: 'sdao-token' },
  { name: 'ststx-token' },
  { name: 'ststx-withdraw-nft' },
  { name: 'staking-v1' },
  { name: 'stacking-dao-core-v1' },

  { name: 'stacker-1' },
  { name: 'stacker-2', file: 'stacker-1' },
  { name: 'stacker-3', file: 'stacker-1' },
  { name: 'stacker-4', file: 'stacker-1' },
  { name: 'stacker-5', file: 'stacker-1' },
  { name: 'stacker-6', file: 'stacker-1' },
  { name: 'stacker-7', file: 'stacker-1' },
  { name: 'stacker-8', file: 'stacker-1' },
  { name: 'stacker-9', file: 'stacker-1' },
  { name: 'stacker-10', file: 'stacker-1' },
  { name: 'strategy-v0' },
  // { name: 'tax-v1' },
];

const rpcClient = new RPCClient(process.env.API_SERVER || 'http://localhost:3999');
const privateKey = process.env.CONTRACT_PRIVATE_KEY;
if (!privateKey) {
  console.error('Provide a private key with `process.env.CONTRACT_PRIVATE_KEY`');
  process.exit(1);
}
const address = getAddressFromPrivateKey(privateKey, TransactionVersion.Testnet);

const network = new StacksTestnet();
network.coreApiUrl = rpcClient.url;

const run = async () => {
  const account = await rpcClient.fetchAccount(address);
  console.log(`Account balance: ${account.balance.toString()} mSTX`);
  console.log(`Account nonce: ${account.nonce}`);

  const txResults: string[] = [];
  let index = 0;
  for (const contract of contracts) {
    let exists: boolean;
    const contractId = `${address}.${contract.name}`;
    try {
      await rpcClient.fetchContractInterface({
        contractAddress: address,
        contractName: contract.name,
      });
      exists = true;
    } catch (error) {
      // console.error(error);
      exists = false;
    }
    if (exists) {
      console.log(`Contract ${contractId} already exists.`);
      continue;
    }

    console.log(`Deploying ${contractId}`);

    const source = await readFile(`../clarity/contracts/${contract.file || contract.name}.clar`);
    const tx = await makeContractDeploy({
      contractName: contract.name,
      codeBody: source.toString('utf8'),
      senderKey: privateKey,
      nonce: new BN(account.nonce + index, 10),
      fee: new BN(100000, 10),
      network,
    });

    const result = await rpcClient.broadcastTX(tx.serialize());

    if (result.ok) {
      index += 1;

      const txId = (await result.text()).replace(/"/g, '');
      console.log(`${rpcClient.url}/extended/v1/tx/${txId}`);

      txResults.push(txId);
    } else {
      const errorMsg = await result.text();
      throw new Error(errorMsg);
    }
  }

  if (txResults.length > 0) console.log('Broadcasted transactions:');
  txResults.forEach(txId => {
    console.log(`${rpcClient.url}/extended/v1/tx/0x${txId}`);
  });
};

run()
  .then(() => {
    console.log('Finished successfully.');
    process.exit();
  })
  .catch(error => {
    console.error('Error while running:');
    console.error(error);
    process.exit(1);
  });
  