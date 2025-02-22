// @ts-nocheck

'use client';

import React, { useEffect, useState } from 'react';
import { Container } from '../components/Container';
import { callReadOnlyFunction, uintCV } from '@stacks/transactions';
import { stacksNetwork } from '../common/utils';

export default function Cycles() {
  const [cyclesInfo, setCyclesInfo] = useState<any[]>([]);
  const [inflow, setInflow] = useState(0.0);

  async function getNextCycle() {
    const url = 'https://api.mainnet.hiro.so/v2/pox';
    const response = await fetch(url, { credentials: 'omit' });
    const data = await response.json();

    return {
      cycle: data['current_cycle']['id'] + 1,
      startBlock: data['next_cycle']['prepare_phase_start_block_height'],
    };
  }

  async function getBlockHeightFromBurnHeight(burnHeight: number) {
    try {
      const url = `https://api.mainnet.hiro.so/extended/v2/burn-blocks/${burnHeight}/blocks`;
      const response = await fetch(url, { credentials: 'omit' });
      if (response.ok) {
        const data = await response.json();
        return data.results[0].height;
      } else {
        return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  async function fetchCycleInfo(cycle: number) {
    const result = await callReadOnlyFunction({
      contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
      contractName: 'stacking-dao-core-v1',
      functionName: 'get-cycle-info',
      functionArgs: [uintCV(cycle)],
      senderAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
      network: stacksNetwork,
    });

    return {
      number: cycle,
      commission: Number(result.data.commission.value) / 1000000,
      deposited: Number(result.data.deposited.value) / 1000000,
      rewards: Number(result.data.rewards.value) / 1000000,
      withrdaw_init: Number(result.data['withdraw-init'].value) / 1000000,
      withdraw_out: Number(result.data['withdraw-out'].value) / 1000000,
    };
  }

  async function getTotalStacked(blockHeight: number) {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
        contractName: 'block-info-v1',
        functionName: 'get-reserve-stacking-at-block',
        functionArgs: [uintCV(blockHeight)],
        senderAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
        network: stacksNetwork,
      });
      return Number(result.value.value) / 1000000;
    } catch (error) {
      return 0;
    }
  }

  async function getInflow() {
    const result = await callReadOnlyFunction({
      contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
      contractName: 'strategy-v0',
      functionName: 'get-outflow-inflow',
      functionArgs: [],
      senderAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
      network: stacksNetwork,
    });

    const inflow = Number(result.data.inflow.value) / 1000000;
    const outflow = Number(result.data.outflow.value) / 1000000;
    return inflow - outflow;
  }

  async function fetchAll() {
    const inflow = await getInflow();
    setInflow(inflow);

    //
    // Cycle info
    //
    const nextCycle = await getNextCycle();
    var startBlock = nextCycle.startBlock - 5;
    var allCyclesInfo = [];

    const cycles = Array.from({length:(nextCycle.cycle-73+1)},(v,k)=>73+k).reverse();
    for (const cycle of cycles) {
      // Get cycle info
      const info = await fetchCycleInfo(cycle);

      if (cycle != nextCycle.cycle) {
        // Get stacks block height from burn height
        let stacksBlock = await getBlockHeightFromBurnHeight(startBlock);
        if (stacksBlock == 0) {
          stacksBlock = await getBlockHeightFromBurnHeight(startBlock+1);
        }
        // Get amount stacked at given stacks block
        let stacked = 0;
        if (stacksBlock != 0) {
          stacked = await getTotalStacked(stacksBlock);
        }
        info['stacked'] = stacked;
      } else {
        info['stacked'] = 0;
      }

      allCyclesInfo.push(info);

      startBlock -= 2100;
    }

    setCyclesInfo(allCyclesInfo);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <Container className="mt-12">
      <div className="bg-white rounded-xl flex items-center justify-center shadow-[0px_10px_10px_-5px_#00000003,0px_20px_25px_-5px_#0000000A]">
        <div className="flex flex-col w-full min-h-full">
          <div className="p-8 pb-0 md:p-12 md:pb-0">
            <div className="w-full text-4xl font-semibold font-headings">StackingDAO Cycles</div>

            {inflow > 0 ? (
              <p className="block w-full mt-4 text-base">
                Net inflow for next cycle:{' '}
                <span className="font-semibold">
                  {inflow.toLocaleString('en-US', { maximumFractionDigits: 0 })} STX
                </span>
              </p>
            ) : (
              <p className="block w-full mt-4 text-base">
                Net outflow for next cycle:{' '}
                <span className="font-semibold">
                  {Math.abs(inflow).toLocaleString('en-US', { maximumFractionDigits: 0 })} STX
                </span>
              </p>
            )}
          </div>

          <div className="flow-root mt-8">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr className="border-t border-b border-sd-gray-light">
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm text-sd-gray font-normal sm:pl-12"
                      >
                        Cycle #
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Deposits
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Withdrawal Init
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Withdrawal Out
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Stacked
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Commission
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm text-sd-gray font-normal"
                      >
                        Rewards
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {cyclesInfo.map(cycle => (
                      <tr key={cycle.number}>
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-sd-gray text-sd-gray-darker font-semibold whitespace-nowrap sm:pl-12">
                          {cycle.number}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.deposited.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.withrdaw_init.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.withdraw_out.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.stacked.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.commission.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-sd-gray-darker whitespace-nowrap">
                          {cycle.rewards.toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
