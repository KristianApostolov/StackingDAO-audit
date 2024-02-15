import { Account, Chain, Clarinet, Tx, types } from "https://deno.land/x/clarinet/index.ts";
import { qualifiedName } from "../wrappers/tests-utils.ts";

import { Rewards } from '../wrappers/rewards-helpers.ts';
import { Reserve } from '../wrappers/reserve-helpers.ts';

//-------------------------------------
// Core 
//-------------------------------------

Clarinet.test({
  name: "rewards: add rewards and process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let rewards = new Rewards(chain, deployer);
    let reserve = new Reserve(chain, deployer);

    let call = await rewards.getTotalCommission();
    call.result.expectUintWithDecimals(0);
    call = await rewards.getTotalRewardsLeft();
    call.result.expectUintWithDecimals(0);

    let result = await rewards.addRewards(deployer, qualifiedName("stacking-pool-v1"), 100);
    result.expectOk().expectBool(true);

    call = await rewards.getTotalCommission();
    call.result.expectUintWithDecimals(5);
    call = await rewards.getTotalRewardsLeft();
    call.result.expectUintWithDecimals(95);

    // Go to end of cycle
    await chain.mineEmptyBlockUntil(19);

    result = await rewards.processRewards(deployer);
    result.expectOk().expectBool(true);

    call = await rewards.getTotalCommission();
    call.result.expectUintWithDecimals(0);
    call = await rewards.getTotalRewardsLeft();
    call.result.expectUintWithDecimals(0);

    call = await reserve.getTotalStx();
    call.result.expectOk().expectUintWithDecimals(95);
  }
});

Clarinet.test({
  name: "rewards: next rewards unlock",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let rewards = new Rewards(chain, deployer);

    let result = await rewards.addRewards(deployer, qualifiedName("stacking-pool-v1"), 100);
    result.expectOk().expectBool(true);

    let call = await rewards.nextRewardsUnlock();
    call.result.expectUint(21 - 10);

    // Go to end of cycle
    await chain.mineEmptyBlockUntil(21 - 10 + 2);

    call = await rewards.nextRewardsUnlock();
    call.result.expectUint(21 - 10);

    // Go to begin of next cycle
    await chain.mineEmptyBlockUntil(21 + 10);

    call = await rewards.nextRewardsUnlock();
    call.result.expectUint(42 - 10);
  }
});

//-------------------------------------
// Errors 
//-------------------------------------

Clarinet.test({
  name: "rewards: can only process rewards at end of cycle",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let rewards = new Rewards(chain, deployer);

    let result = await rewards.addRewards(deployer, qualifiedName("stacking-pool-v1"), 100);
    result.expectOk().expectBool(true);

    let call = await rewards.getRewardsUnlock();
    call.result.expectUint(21 - 10);

    // Can not process rewards
    result = await rewards.processRewards(deployer);
    result.expectErr().expectUint(45001);

    // Go to end of cycle
    await chain.mineEmptyBlockUntil(21 - 10 + 2);

    // Can process rewards
    result = await rewards.processRewards(deployer);
    result.expectOk().expectBool(true);
  }
});
