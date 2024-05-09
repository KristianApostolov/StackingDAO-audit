import type { SNSEvent, Context } from "aws-lambda";
import * as db from "@repo/database/src/actions";

export async function updateLeaderboard(event: SNSEvent, _: Context): Promise<void> {
  for (const record of event.Records) {
    const block_hash = JSON.parse(record.Sns.Message) as string;

    await recalculateLeaderboard(block_hash);
  }
}

export async function recalculateLeaderboard(block_hash: string): Promise<void> {
  // 1. Re-calculate leaderboard from db.
  console.log("updating leaderboard for block", block_hash);
  const newLeaderboard = await db.getTopDailyPointHolders();

  // 2. Write new leaderboard to db.
  console.log("writing new leaderboard to db");

  const chunkSize = 50;
  for (let i = 0; i < newLeaderboard.length; i += chunkSize) {
    const chunk = newLeaderboard.slice(i, i + chunkSize);
    const recordsWritten = await db.updateLeaderboard(chunk);

    console.log(`Updated leaderboard with ${recordsWritten} new rows`);
  }
}
