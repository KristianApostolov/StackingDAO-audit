import { Account, Chain, Clarinet, Tx, types } from "https://deno.land/x/clarinet/index.ts";
import { qualifiedName } from "../wrappers/tests-utils.ts";

import { StackingDelegate } from '../wrappers/stacking-delegate-helpers.ts';
import { StackingPool } from '../wrappers/stacking-pool-helpers.ts';

import { StrategyV3, StrategyV3PoolsV1, StrategyV3DelegatesV1, StrategyV3AlgoV1 } from '../wrappers/strategy-helpers.ts';

//-------------------------------------
// Algo V1 
//-------------------------------------

Clarinet.test({
  name: "strategy-v3-algo-v1: calculate reach target",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let strategyV3AlgoV1 = new StrategyV3AlgoV1(chain, deployer)

    let call = await strategyV3AlgoV1.calculateReachTarget(
      [120000, 210000, 230000, 130000, 90000],
      [210000, 110000, 180000, 130000, 120000]
    );
    call.result.expectList()[0].expectUintWithDecimals(210000);
    call.result.expectList()[1].expectUintWithDecimals(129999.9998);
    call.result.expectList()[2].expectUintWithDecimals(189999.9999);
    call.result.expectList()[3].expectUintWithDecimals(130000);
    call.result.expectList()[4].expectUintWithDecimals(120000);  // Outflow so stay at locked

    call = await strategyV3AlgoV1.calculateReachTarget(
      [110000, 80000, 120000, 110000, 90000],
      [100000, 100000, 100000, 100000, 100000]
    );
    call.result.expectList()[0].expectUintWithDecimals(102500);
    call.result.expectList()[1].expectUintWithDecimals(100000); // Outflow so stay at locked
    call.result.expectList()[2].expectUintWithDecimals(105000);
    call.result.expectList()[3].expectUintWithDecimals(102500);
    call.result.expectList()[4].expectUintWithDecimals(100000); // Outflow so stay at locked

  }
});

Clarinet.test({
  name: "strategy-v3-algo-v1: calculate lowest combination",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let strategyV3AlgoV1 = new StrategyV3AlgoV1(chain, deployer)

    // Stop 1
    let call = await strategyV3AlgoV1.calculateLowestCombination(19000, [65000, 26000, 19500, 11000, 6500]);
    call.result.expectList()[0].expectUintWithDecimals(65000);
    call.result.expectList()[1].expectUintWithDecimals(26000);
    call.result.expectList()[2].expectUintWithDecimals(0);
    call.result.expectList()[3].expectUintWithDecimals(11000);
    call.result.expectList()[4].expectUintWithDecimals(6500);

    // Stop at beginning
    call = await strategyV3AlgoV1.calculateLowestCombination(70000, [65000, 26000, 19500, 13000, 6500]);
    call.result.expectList()[0].expectUintWithDecimals(0);
    call.result.expectList()[1].expectUintWithDecimals(0);
    call.result.expectList()[2].expectUintWithDecimals(19500);
    call.result.expectList()[3].expectUintWithDecimals(13000);
    call.result.expectList()[4].expectUintWithDecimals(6500);

    // Stop at end
    call = await strategyV3AlgoV1.calculateLowestCombination(38000, [65000, 26000, 19500, 13000, 6500]);
    call.result.expectList()[0].expectUintWithDecimals(65000);
    call.result.expectList()[1].expectUintWithDecimals(26000);
    call.result.expectList()[2].expectUintWithDecimals(0);
    call.result.expectList()[3].expectUintWithDecimals(0);
    call.result.expectList()[4].expectUintWithDecimals(0);
  }
});

//-------------------------------------
// Pools V1 
//-------------------------------------

Clarinet.test({
  name: "strategy-v3-pools-v1: calculate stacking per pool",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let strategyV3PoolsV1 = new StrategyV3PoolsV1(chain, deployer)

    // 150k STX to reserve
    let block = chain.mineBlock([
      Tx.transferSTX(150000 * 1000000, qualifiedName("reserve-v1"), deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // 70% to stacking pool, 20% to fast pool
    let call = await strategyV3PoolsV1.calculateStackingPerPool()
    call.result.expectList()[0].expectTuple()["pool"].expectPrincipal(qualifiedName("stacking-pool-v1"))
    call.result.expectList()[0].expectTuple()["stacking-amount"].expectUintWithDecimals(105000)
    call.result.expectList()[1].expectTuple()["pool"].expectPrincipal(qualifiedName("pox-fast-pool-v2-mock"))
    call.result.expectList()[1].expectTuple()["stacking-amount"].expectUintWithDecimals(45000)

    // TODO: once already stacking
  }
});

//-------------------------------------
// Delegates V1 
//-------------------------------------

Clarinet.test({
  name: "strategy-v3-delegates-v1: calculate stacking per delegate",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;

    let strategyV3DelegatesV1 = new StrategyV3DelegatesV1(chain, deployer)

    // 150k STX to reserve
    let block = chain.mineBlock([
      Tx.transferSTX(150000 * 1000000, qualifiedName("reserve-v1"), deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // 50% to first, 30% to second, 20% to third
    let call = await strategyV3DelegatesV1.calculateStackingPerDelegate(qualifiedName("stacking-pool-v1"), 150000);
    call.result.expectList()[0].expectTuple()["delegate"].expectPrincipal(qualifiedName("stacking-delegate-1-1"))
    call.result.expectList()[0].expectTuple()["stacking-amount"].expectUintWithDecimals(75000)
    call.result.expectList()[1].expectTuple()["delegate"].expectPrincipal(qualifiedName("stacking-delegate-1-2"))
    call.result.expectList()[1].expectTuple()["stacking-amount"].expectUintWithDecimals(45000)
    call.result.expectList()[2].expectTuple()["delegate"].expectPrincipal(qualifiedName("stacking-delegate-1-3"))
    call.result.expectList()[2].expectTuple()["stacking-amount"].expectUintWithDecimals(30000)

    // TODO: once already stacking
  }
});

//-------------------------------------
// Core 
//-------------------------------------

Clarinet.test({
  name: "strategy-v3: ",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;

    let stackingDelegate = new StackingDelegate(chain, deployer);
    let stackingPool = new StackingPool(chain, deployer);
    let strategyV3AlgoV1 = new StrategyV3AlgoV1(chain, deployer)
    let strategyV3 = new StrategyV3(chain, deployer)


    let block = chain.mineBlock([
      Tx.transferSTX(150000 * 1000000, qualifiedName("reserve-v1"), deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);


    let result = await strategyV3.preparePools(deployer);
    result.expectOk().expectBool(true);

    result = await strategyV3.prepareDelegates(deployer, qualifiedName("stacking-pool-v1"));
    result.expectOk().expectBool(true);

    result = await strategyV3.prepareDelegates(deployer, qualifiedName("pox-fast-pool-v2-mock"));
    result.expectOk().expectBool(true);


    result = await strategyV3.execute(
      deployer, 
      qualifiedName("stacking-pool-v1"),
      [qualifiedName("stacking-delegate-1-1"), qualifiedName("stacking-delegate-1-2"), qualifiedName("stacking-delegate-1-3")]
    );
    result.expectOk().expectBool(true);

    // let call = await strategyV3AlgoV1.calculateLowestCombination(38000, [65000, 26000, 19500, 13000, 6500, 65000, 26000, 19500, 13000, 6500, 65000, 26000, 19500, 13000, 6500, 65000, 26000, 19500, 13000, 6500, 65000, 26000, 19500, 13000, 6500, 65000, 26000, 19500, 13000, 6500]);
    // call.result.expectOk().expectBool(true);



    // let call = await strategyV3AlgoV1.calculateReachTarget(
    //   [120000, 210000, 230000, 130000, 90000],
    //   [210000, 110000, 180000, 130000, 120000]
    // );
    // call.result.expectOk().expectBool(true);



    // let block = chain.mineBlock([
    //   Tx.transferSTX(150000 * 1000000, qualifiedName("reserve-v1"), deployer.address)
    // ]);
    // block.receipts[0].result.expectOk().expectBool(true);


    // let result = await stackingDelegate.revokeAndDelegate(deployer, 150000, qualifiedName("stacking-pool-v1"), 99999999);
    // result.expectOk().expectBool(true);

    // let call = await stackingDelegate.getStxAccount(qualifiedName("stacking-delegate-1-1"));
    // call.result.expectTuple()["locked"].expectUintWithDecimals(0);
    // call.result.expectTuple()["unlocked"].expectUintWithDecimals(150000);
    // call.result.expectTuple()["unlock-height"].expectUint(0);

    // result = await stackingPool.prepare(deployer);
    // result.expectOk().expectBool(true);


    // call = await stackingDelegate.getStxAccount(qualifiedName("stacking-delegate-1-1"));
    // call.result.expectTuple()["locked"].expectUintWithDecimals(150000);
    // call.result.expectTuple()["unlocked"].expectUintWithDecimals(0);
    // call.result.expectTuple()["unlock-height"].expectUint(42);

    // // TODO: wait for unlock & unlock

    // // 


    // block = chain.mineBlock([
    //   Tx.transferSTX(20000 * 1000000, qualifiedName("reserve-v1"), deployer.address)
    // ]);
    // block.receipts[0].result.expectOk().expectBool(true);

    // // stacking-pool-v1 has already locked 150k
    // // There is now an extra pool, and extra inflow of 20k
    // // Targets are 70% and 30% for new pool. New pool target is 30% * 170k = 51k
    // // So first pool has overlocked, and can only add the idle 20k to new pool

    // call = await strategyInflow.getNewStacking();
    // call.result.expectList()[0].expectTuple()["new-stacking"].expectUintWithDecimals(150000);
    // call.result.expectList()[0].expectTuple()["pool"].expectPrincipal(qualifiedName("stacking-pool-v1"));
    // call.result.expectList()[1].expectTuple()["new-stacking"].expectUintWithDecimals(20000);
    // call.result.expectList()[1].expectTuple()["pool"].expectPrincipal(qualifiedName("pox-fast-pool-v2-mock"));
  }
});


//-------------------------------------
// Errors 
//-------------------------------------

//-------------------------------------
// Access 
//-------------------------------------
