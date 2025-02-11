require('dotenv').config();
const network = require('@stacks/network');
const env = process.env.NETWORK_ENV;
const request = require('request-promise');
const fs = require('fs');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3 } = require('@aws-sdk/client-s3');

// ----------------------------------------------
// TX
// ----------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Wait for transaction to complete
async function waitForTransactionCompletion(transactionId) {

  process.stdout.write("Waiting on TX .")

  // Wait 15 sec so API is updated
  // TODO: update for mainnet
  await sleep(5 * 1000);

  const url = `${resolveUrl()}/extended/v1/tx/${transactionId}`;

  return new Promise((resolve, reject) => {

    let retries = 0;
    const poll = async function() {

      var result = await fetch(url);
      var value = await result.json();
      
      if (value.tx_status === "success") {
        console.log(" Success:", value.tx_result.repr)
        resolve(value.tx_result.repr);
      } else if (value.tx_status === "pending") {
        process.stdout.write(".")
        retries = 0;

        // TODO: update for mainnet
        setTimeout(poll, 3 * 1000);
      } else if (value.error && value.error.includes("could not find transaction by ID")) {
        retries += 1;
        console.log("Dould not find TX, retries:", retries);
        if (retries < 8) {
          // TODO: update for mainnet
          setTimeout(poll, 1 * 1000);
        } else {
          console.log("Could not find TX:", value)
          resolve(value);
        }
      } else {
        console.log(" Error:", value.tx_result.repr)
        resolve(value.tx_result.repr);
      }
    }

    poll();
  })
}

async function processing(broadcastedResult, tx, count) {
  const url = `${resolveUrl()}/extended/v1/tx/${tx}`;
  var result = await fetch(url);
  var value = await result.json();

  if (value.tx_status === "success") {
    console.log(`Transaction ${tx} processed:`);
    console.log(value.tx_result.repr);
    return;

  } else if (value.tx_status === "abort_by_response") {
    console.log(`Transaction ${tx} failed!!`);
    console.log(value.tx_result.repr);  
    return;

  } else if (value.tx_status === "pending") {
    // console.log(value);
    console.log(count);

  } else if (value.tx_status === "abort_by_response") {
    console.log(`Transaction ${tx} failed!!`);
    console.log(value.tx_result.repr);  
  }

  if (count > 20) {
    console.log("failed after 20 tries");
    console.log(value);
    return false;
  }

  setTimeout(function() {
    return processing(broadcastedResult, tx, count + 1);
  }, 3000);
}

// ----------------------------------------------
// API
// ----------------------------------------------

async function getNonce(address) {
  const url = `${resolveUrl()}/v2/accounts/${address}?proof=0`;
  const result = await request(url, { json: true });
  return result.nonce;
}

async function getBlockHeight() {
  const url = `${resolveUrl()}/v2/info`;
  const result = await request(url, { json: true });
  const currentBlock = result['stacks_tip_height'];
  return currentBlock;
}
async function getBurnBlockHeight() {
  const url = `${resolveUrl()}/v2/info`;
  const result = await request(url, { json: true });
  const currentBlock = result['burn_block_height'];
  return currentBlock;
}

async function getAllEvents(contract) {
  var allEvents = [];

  var offset = 0;
  var shouldRun = true;

  while (shouldRun) {

    var promises = [];
    for (let i = 0; i < 200; i++) {
      promises.push(getEvents(contract, offset))
      offset += 50;
    }

    const eventsArray = await Promise.all(promises);
    for (const events of eventsArray) {
      allEvents = allEvents.concat(events);
      if (events.length == 0) {
        shouldRun = false;
      }
    }
  }

  return allEvents;
}

async function getEvents(contract, offset) {
  console.log("[utils] Fetch events for contract:", contract, "- offset:", offset);
  try {
    const url = `${resolveUrl()}/extended/v1/contract/${contract}/events?limit=50&unanchored=false&offset=${offset}`;
    const result = await request(url, { json: true });
    return result.results;
  } catch (error) {
    console.log("[utils] Fetch failed, retry in 5 seconds. Error:", error);
    await new Promise(r => setTimeout(r, 5 * 1000));
    return getEvents(contract, offset);
  }
}

async function getAllTransactions(contract) {
  var allTransactions = [];

  var offset = 0;
  var shouldRun = true;

  while (shouldRun) {

    var promises = [];
    for (let i = 0; i < 200; i++) {
      promises.push(getTransactions(contract, offset))
      offset += 50;
    }

    const txsArray = await Promise.all(promises);
    for (const transactions of txsArray) {
      allTransactions = allTransactions.concat(transactions);
      if (transactions.length == 0) {
        shouldRun = false;
      }
    }
  }

  return allTransactions;
}


async function getTransactions(contract, offset) {
  console.log("[utils] Fetch transactions for contract:", contract, "- offset:", offset);
  try {
    const url = `${resolveUrl()}/extended/v1/address/${contract}/transactions?limit=50&unanchored=false&offset=${offset}`;
    const result = await request(url, { json: true });
    return result.results;
  } catch (error) {
    console.log("[utils] Fetch failed, retry in 5 seconds. Error:", error);
    await new Promise(r => setTimeout(r, 5 * 1000));
    return getEvents(contract, offset);
  }
}

// ----------------------------------------------
// Network
// ----------------------------------------------

function resolveUrl() {
  if (process.env.STACKS_API) {
    return process.env.STACKS_API
  }

  if (env === 'mocknet') {
    return `http://localhost:${process.env.LOCAL_STACKS_API_PORT}`;
  } else if (env === 'testnet') {
    return 'https://api.testnet.hiro.so';
  } else if (env === 'regtest') {
    return 'https://stacks-node-api.regtest.stacks.co';
  } else {
    return 'https://api.hiro.so';
  }
}

function resolveNetwork() {
  if (env === 'mainnet') {
    const stacksNetwork = new network.StacksMainnet();
    stacksNetwork.coreApiUrl = resolveUrl();

    return stacksNetwork;
  } else {
    const stacksNetwork = new network.StacksTestnet();
    stacksNetwork.coreApiUrl = resolveUrl();

    return stacksNetwork;
  }
}

// ----------------------------------------------
// File management
// ----------------------------------------------

async function readFile(filename) {
  if (process.env.FILE_ENV == "remote") {
    const s3 = new S3({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
      },
      region: 'eu-central-1'
    });

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: filename + '.json',
    };
  
    // Check if file exists
    try {
      await s3.headObject(params);
    } catch (e) {
      return {};
    }
  
    const result = await s3.getObject(params);
    const jsonString = await result.Body?.transformToString()
    const json = JSON.parse(jsonString ?? '')

    return json;
  }

  // Local
  const data = fs.readFileSync("files/" + filename + ".json");
  return JSON.parse(data);
}

async function writeFile(filename, json) {
  if (process.env.FILE_ENV == "remote") {
    const s3 = new S3({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
      },
      region: 'eu-central-1'
    });

    const params = {
      ACL: "public-read",
      Bucket: process.env.AWS_BUCKET,
      Key: filename + '.json',
      Body: Buffer.from(JSON.stringify(json))
    };
  
    const result = await new Upload({
      client: s3,
      params,
    }).done();
    return result;
  }

  // Local
  fs.writeFileSync("files/" + filename + ".json", JSON.stringify(json, undefined, 2));
  return true;
}

// ----------------------------------------------
// Exports
// ----------------------------------------------

exports.resolveUrl = resolveUrl;
exports.resolveNetwork = resolveNetwork;
exports.waitForTransactionCompletion = waitForTransactionCompletion;
exports.processing = processing;
exports.getNonce = getNonce;
exports.getBlockHeight = getBlockHeight;
exports.getBurnBlockHeight = getBurnBlockHeight;
exports.getAllEvents = getAllEvents;
exports.getAllTransactions = getAllTransactions;
exports.readFile = readFile;
exports.writeFile = writeFile;
