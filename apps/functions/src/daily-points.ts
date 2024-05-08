import type { ScheduledEvent, Context } from "aws-lambda";
import { BlocksApi, InfoApi, NakamotoBlock } from "@stacks/blockchain-api-client";
import { userInfoAtBlock } from "@repo/stacks/src/user_info";
import { NewPointsRecord } from "@repo/database/src/models";
import * as db from "@repo/database/src/actions";

const info = new InfoApi();
const blocks = new BlocksApi();

export async function updateDailyPoints(_: ScheduledEvent, __: Context): Promise<void> {
  const coreInfo = await info.getCoreApiInfo();
  const block = await blocks.getBlock({ heightOrHash: coreInfo.stacks_tip_height });

  await recordPointsAtBlock(block);
}

export async function recordPointsAtBlock(day_block: NakamotoBlock): Promise<void> {
  console.log("recording balances at block", day_block);
  const wallets = await db.getAllWallets();
  const addresses = wallets.map<string>((wallet) => wallet.address);

  console.log(`updating balances for ${addresses.length} addresses`);
  const size = Math.ceil(addresses.length / 50);
  const chunks = Array.from({ length: 50 }, (v, i) => addresses.slice(i * size, i * size + size));

  for (const chunk of chunks) {
    const points: NewPointsRecord[] = [];
    for (const address of chunk) {
      const balances = await userInfoAtBlock(address, day_block.height);

      if (balances.ststx_balance > 0)
        points.push({
          wallet: address,
          source: "ststx",
          amount: balances.ststx_balance.toString(),
          block: day_block.hash,
          multiplier: 1,
        });

      if (balances.bitflow > 0)
        points.push({
          wallet: address,
          source: "bitflow",
          amount: balances.bitflow.toString(),
          block: day_block.hash,
          multiplier: 2.5,
        });

      if (balances.arkadiko > 0)
        points.push({
          wallet: address,
          source: "arkadiko",
          amount: balances.arkadiko.toString(),
          block: day_block.hash,
          multiplier: 1.5,
        });

      if (balances.velar > 0)
        points.push({
          wallet: address,
          source: "velar",
          amount: balances.velar.toString(),
          block: day_block.hash,
          multiplier: 1.5,
        });

      if (balances.hermetica > 0)
        points.push({
          wallet: address,
          source: "hermetica",
          amount: balances.hermetica.toString(),
          block: day_block.hash,
          multiplier: 1.5,
        });
    }

    console.log(`appending ${points.length} point records to db`);

    const recordsWritten = await db.addPointRecords(points);

    console.log(`Updated leaderboard with ${recordsWritten} new rows`);
  }
}
