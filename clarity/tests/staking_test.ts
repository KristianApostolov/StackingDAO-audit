import { Account, Chain, Clarinet, Tx, types } from "https://deno.land/x/clarinet/index.ts";
import { qualifiedName } from "./helpers/tests-utils.ts";

import { DAO } from './helpers/dao-helpers.ts';
import { Staking } from './helpers/staking-helpers.ts';
import { Core } from './helpers/core-helpers.ts';

//-------------------------------------
// Core 
//-------------------------------------

Clarinet.test({
  name: "staking: can stake and unstake, variables are updated",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;

    let staking = new Staking(chain, deployer);

    let result = await staking.stake(wallet_1, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    let call = await staking.getStakeAmountOf(wallet_1.address);
    call.result.expectUintWithDecimals(1000);

    call = await staking.getTotalStaked();
    call.result.expectUintWithDecimals(1000);

    call = await staking.getStakeOf(wallet_1.address)
    call.result.expectTuple()["amount"].expectUintWithDecimals(1000);

    result = await staking.unstake(wallet_1, 800);
    result.expectOk().expectUintWithDecimals(800);

    call = await staking.getStakeAmountOf(wallet_1.address);
    call.result.expectUintWithDecimals(200);

    call = await staking.getTotalStaked();
    call.result.expectUintWithDecimals(200);

    call = await staking.getStakeOf(wallet_1.address)
    call.result.expectTuple()["amount"].expectUintWithDecimals(200);
  }
});

Clarinet.test({
  name: "staking: stake and unstake next block",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;

    let staking = new Staking(chain, deployer);
    let core = new Core(chain, deployer);

    // 2100 STX so 1 STX per block
    let result = await staking.addRewards(deployer, 2100);
    result.expectOk().expectUintWithDecimals(2100);

    result = await staking.stake(wallet_1, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    let call = await core.getStxBalance(wallet_2.address);
    call.result.expectUintWithDecimals(100000000);

    result = await staking.stake(wallet_2, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    // Got half of 1 block rewards
    call = await staking.getPendingRewards(wallet_2.address);
    call.result.expectOk().expectUintWithDecimals(0.5);

    result = await staking.unstake(wallet_2, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    // Got rewards
    call = await core.getStxBalance(wallet_2.address);
    call.result.expectUintWithDecimals(100000000.5);
  }
});

Clarinet.test({
  name: "staking: add and claim rewards",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let wallet_3 = accounts.get("wallet_3")!;

    let staking = new Staking(chain, deployer);
    let core = new Core(chain, deployer);

    let result = await staking.stake(wallet_1, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    result = await staking.stake(wallet_2, 2000);
    result.expectOk().expectUintWithDecimals(2000);

    result = await staking.stake(wallet_3, 3000);
    result.expectOk().expectUintWithDecimals(3000);

    result = await staking.addRewards(deployer, 100);
    result.expectOk().expectUintWithDecimals(100);

    // 100 STX per 2100 blocks = 0.047619 STX per block
    let call = await staking.getRewardsPerBlock();
    call.result.expectUintWithDecimals(0.047619);

    // Advance half cycle
    chain.mineEmptyBlock(1050);

    // 50 STX * 16.66% = 8.3 STX
    call = await staking.getPendingRewards(wallet_1.address);
    call.result.expectOk().expectUintWithDecimals(8.341);

    // 50 STX * 33.33% = 8.3 STX
    call = await staking.getPendingRewards(wallet_2.address);
    call.result.expectOk().expectUintWithDecimals(16.682);

    // 50 STX * 50% = 25 STX
    call = await staking.getPendingRewards(wallet_3.address);
    call.result.expectOk().expectUintWithDecimals(25.023);

    call = await core.getStxBalance(wallet_1.address);
    call.result.expectUintWithDecimals(100000000);

    result = await staking.claimPendingRewards(wallet_1);
    result.expectOk().expectUintWithDecimals(8.341);

    call = await core.getStxBalance(wallet_1.address);
    call.result.expectUintWithDecimals(100000008.341);

    call = await core.getStxBalance(wallet_2.address);
    call.result.expectUintWithDecimals(100000000);

    result = await staking.claimPendingRewards(wallet_2);
    result.expectOk().expectUintWithDecimals(16.696);

    call = await core.getStxBalance(wallet_2.address);
    call.result.expectUintWithDecimals(100000016.696);

    result = await staking.claimPendingRewards(wallet_3);
    result.expectOk().expectUintWithDecimals(25.065);
  }
});

Clarinet.test({
  name: "staking: reward tracking",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;

    let staking = new Staking(chain, deployer);

    // Cumm reward per stake still 0
    let call = await staking.getCummRewardPerStake();
    call.result.expectUintWithDecimals(0);

    let result = await staking.calculateCummRewardPerStake(deployer);
    result.expectOk().expectUintWithDecimals(0);

    // Last increase block
    call = staking.getLastRewardIncreaseBlock();
    call.result.expectUint(1);

    // Pending rewards should be 0
    call = await staking.getPendingRewards(wallet_1.address);
    call.result.expectOk().expectUintWithDecimals(0);

    // Initial stake should be 0
    call = await staking.getStakeAmountOf(wallet_1.address);
    call.result.expectUintWithDecimals(0);

    call = await staking.getTotalStaked();
    call.result.expectUintWithDecimals(0);

    // Stake 1000 STX
    result = await staking.stake(wallet_1, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    // Last increase block
    call = staking.getLastRewardIncreaseBlock();
    call.result.expectUint(4);

    // New stake amounts
    call = await staking.getStakeAmountOf(wallet_1.address);
    call.result.expectUintWithDecimals(1000);

    call = await staking.getTotalStaked();
    call.result.expectUintWithDecimals(1000);

    // Not advanced blocks yet.  
    call = await staking.getCummRewardPerStake();
    call.result.expectUintWithDecimals(0);

    // Add 2100 STX, which is 1 STX per block
    result = await staking.addRewards(deployer, 2100);
    result.expectOk().expectUintWithDecimals(2100);

    // 1 STX reward per block, over 1000 STX staked = 0.001 STX rewards per STX staked
    result = await staking.calculateCummRewardPerStake(deployer);
    result.expectOk().expectUintWithDecimals(0.001);

    // Start at 0
    call = staking.getStakeCummRewardPerStakeOf(wallet_1.address);
    call.result.expectUintWithDecimals(0);

    // Advanced 1 block after staking (because of adding rewards)
    // Taking into account the extra block, so 2 STX rewards
    call = staking.getPendingRewards(wallet_1.address);
    call.result.expectOk().expectUintWithDecimals(2);

    // Advance 3 blocks
    chain.mineEmptyBlock(3);

    // Total stake did not change, so cumm reward per stake should not change either
    call = staking.getCummRewardPerStake();
    call.result.expectUintWithDecimals(0);

    // Advanced 5 blocks. 
    // 5 blocks / 1000 STX staked = 0.005
    result = await staking.calculateCummRewardPerStake(deployer);
    result.expectOk().expectUintWithDecimals(0.005);

    // Advanced 5 blocks, taking into account 1 extra block
    // 6 blocks * 1 STX = 6 STX
    call = staking.getPendingRewards(wallet_1.address);
    call.result.expectOk().expectUintWithDecimals(6);

    // Stake with wallet_2
    result = await staking.stake(wallet_2, 2000);
    result.expectOk().expectUintWithDecimals(2000);

    // Total staked
    call = await staking.getTotalStaked();
    call.result.expectUintWithDecimals(3000);

    // Cummulative reward per stake was 0.005
    // One extra block so becomes 0.006 (1 STX / 1000 STX extra)
    call = staking.getStakeCummRewardPerStakeOf(wallet_2.address);
    call.result.expectUintWithDecimals(0.006);

    // Should be same as previous check (get-stake-cumm-reward-per-stake-of)
    call = await staking.getCummRewardPerStake();
    call.result.expectUintWithDecimals(0.006);

    // Started with 0.006
    // Adding (1 STX per block / 3000 STX staked) = 0.000333
    result = await staking.increaseCummRewardPerStake(deployer);
    result.expectOk().expectUintWithDecimals(0.006333);

    // Wallet_1 has 33%, so gets 33% of 1 STX
    // For 2 blocks that's 0.666 STX extra
    call = staking.getPendingRewards(wallet_1.address);
    call.result.expectOk().expectUintWithDecimals(6.666);

    // Wallet_2 has 66%, so gets 66% of 1 STX
    // For 2 blocks that's 1.333 STX extra
    call = staking.getPendingRewards(wallet_2.address);
    call.result.expectOk().expectUintWithDecimals(1.332);

    // Unstake 700 STX
    result = staking.unstake(wallet_1, 700);
    result.expectOk().expectUintWithDecimals(700);

    // Last increase block
    call = staking.getLastRewardIncreaseBlock();
    call.result.expectUint(13);

    // New cumm reward per stake
    // Was 0.006333, adding 0.000333 (1 STX per block / 3000 STX staked)
    call = staking.getCummRewardPerStake();
    call.result.expectUintWithDecimals(0.006666);

    // New cumm reward per stake
    // Was 0.006666, adding 0.000434 (1 STX per block / 2300 STX staked)
    result = await staking.calculateCummRewardPerStake(deployer);
    result.expectOk().expectUintWithDecimals(0.0071);
  }
});

Clarinet.test({
  name: "staking: calculate rewards per block again if rewards added",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let staking = new Staking(chain, deployer);

    // Add 2100 STX, so 1 STX per block
    let result = await staking.addRewards(deployer, 2100);
    result.expectOk().expectUintWithDecimals(2100);

    let call = await staking.getRewardsPerBlock();
    call.result.expectUintWithDecimals(1);

    // Add 1050 STX, which is 0.5 STX per block
    result = await staking.addRewards(deployer, 1050);
    result.expectOk().expectUintWithDecimals(1050);

    // Total is now 1.5 STX per block
    call = await staking.getRewardsPerBlock();
    call.result.expectUintWithDecimals(1.5);
  }
});

//-------------------------------------
// Errors 
//-------------------------------------

Clarinet.test({
  name: "staking: can not stake/unstake with wrong token",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let block = chain.mineBlock([
      Tx.contractCall("staking-v1", "stake", [
        types.principal(qualifiedName("ststx-token")),
        types.uint(10 * 1000000),
      ], deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(12002);

    block = chain.mineBlock([
      Tx.contractCall("staking-v1", "unstake", [
        types.principal(qualifiedName("ststx-token")),
        types.uint(10 * 1000000),
      ], deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(12002);
  }
});

Clarinet.test({
  name: "staking: can not unstake more than staked",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let staking = new Staking(chain, deployer);

    let result = await staking.stake(deployer, 1000);
    result.expectOk().expectUintWithDecimals(1000);

    result = await staking.unstake(deployer, 1001);
    result.expectErr().expectUint(12003);
  }
});

Clarinet.test({
  name: "staking: can not stake, unstake or claim pending rewards when protocol disabled",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let staking = new Staking(chain, deployer);
    let dao = new DAO(chain, deployer);

    let result = await dao.setContractsEnabled(deployer, false);
    result.expectOk().expectBool(true);

    result = await staking.stake(deployer, 1000);
    result.expectErr().expectUint(20002);

    result = await staking.unstake(deployer, 1001);
    result.expectErr().expectUint(20002);

    result = await staking.claimPendingRewards(deployer);
    result.expectErr().expectUint(20002);
  }
});
