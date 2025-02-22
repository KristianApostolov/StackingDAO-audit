require('dotenv').config();
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_NAME = 'stacking-dao-core-v1';
const FUNCTION_NAME = 'add-rewards';
const tx = require('@stacks/transactions');
const utils = require('./utils');
const network = utils.resolveNetwork();
const BN = require('bn.js');

const txOptions = {
  contractAddress: CONTRACT_ADDRESS,
  contractName: CONTRACT_NAME,
  functionName: FUNCTION_NAME,
  functionArgs: [
    tx.contractPrincipalCV(CONTRACT_ADDRESS, 'commission-v1'),
    tx.contractPrincipalCV(CONTRACT_ADDRESS, 'staking-v0'),
    tx.contractPrincipalCV(CONTRACT_ADDRESS, 'reserve-v1'),
    tx.uintCV(106010 * 1000000),
    tx.uintCV(83)
  ],
  fee: new BN(100000, 10),
  senderKey: process.env.STACKS_PRIVATE_KEY,
  postConditionMode: 1,
  network
};

async function transact() {
  const transaction = await tx.makeContractCall(txOptions);
  const result = await tx.broadcastTransaction(transaction, network);
  console.log(result);
};

transact();
