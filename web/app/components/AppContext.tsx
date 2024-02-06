// @ts-nocheck

import { createContext, useContext, useEffect, useState } from 'react';
import { coreApiUrl, getRPCClient } from '../common/utils'
import { callReadOnlyFunction, contractPrincipalCV } from '@stacks/transactions';
import { stacksNetwork } from '../common/utils';
import { UserData } from '@stacks/auth';

interface AppContextProps {
  stxAddress: string | undefined;
  stxBalance: number;
  setStxBalance: (balance: string | undefined) => void;
  stStxBalance: number;
  setStStxBalance: (balance: number | undefined) => void;
  sDaoBalance: string | undefined;
  setSDaoBalance: (balance: string | undefined) => void;
  stxPrice: string | undefined;
  setStxPrice: (price: string | undefined) => void;
  stxRatio: string | undefined;
  setStxRatio: (ratio: string | undefined) => void;
  stackingApy: number;
  setStackingApy: (apy: number | undefined) => void;

  stackedStx: string | undefined;
  setStackedStx: (stackedStx: string | undefined) => void;
  stackingCycle: string | undefined;
  setStackingCycle: (stackingCycle: string | undefined) => void;
  cycleDaysLeft: string | undefined;
  setCycleDaysLeft: (cycleDaysLeft: string | undefined) => void;
  nextRewardCycleBlocks: number | undefined;
  setNextRewardCycleBlocks: (nextRewardCycleBlocks: number | undefined) => void;
  bitcoinBlocksLeft: string | undefined;
  setBitcoinBlocksLeft: (bitcoinBlocksLeft: string | undefined) => void;

  currentTxStatus: string | undefined;
  setCurrentTxStatus: (status: string | undefined) => void;
  currentTxId: string | undefined;
  setCurrentTxId: (id: string | undefined) => void;
  currentTxMessage: string | undefined;
  setCurrentTxMessage: (message: string | undefined) => void;

  userData: UserData | undefined;
  okProvider: hash | undefined;
}

export const AppContext = createContext<AppContextProps>({
  stxBalance: 0,
  setStxBalance: () => {},
  stStxBalance: 0,
  setStStxBalance: () => {},
  sDaoBalance: undefined,
  setSDaoBalance: () => {},
  stxPrice: undefined,
  setStxPrice: () => {},
  stxRatio: undefined,
  setStxRatio: () => {},
  stackingApy: 0,
  setStackingApy: () => {},

  stackedStx: undefined,
  setStackedStx: () => {},
  stackingCycle: undefined,
  setStackingCycle: () => {},
  cycleDaysLeft: undefined,
  setCycleDaysLeft: () => {},
  bitcoinBlocksLeft: undefined,
  setBitcoinBlocksLeft: () => {},

  currentTxStatus: undefined,
  setCurrentTxStatus: () => {},
  currentTxId: undefined,
  setCurrentTxId: () => {},
  currentTxMessage: undefined,
  setCurrentTxMessage: () => {},

  userData: undefined,
  okxProvider: undefined
});

const DENOMINATOR = 1000000;

export const AppContextProvider = (props: any) => {
  const [userData, setUserData] = useState<UserData>({});
  const [stxAddress, setStxAddress] = useState('');
  const [okxProvider, setOkxProvider] = useState({});
  const [stxBalance, setStxBalance] = useState(0);
  const [stStxBalance, setStStxBalance] = useState(0);
  const [sDaoBalance, setSDaoBalance] = useState(0);
  const [stxPrice, setStxPrice] = useState(0);
  const [stxRatio, setStxRatio] = useState(0);
  const [stackedStx, setStackedStx] = useState(0);
  const [stackingCycle, setStackingCycle] = useState(0);
  const [cycleDaysLeft, setCycleDaysLeft] = useState(0);
  const [nextRewardCycleBlocks, setNextRewardCycleBlocks] = useState(0);
  const [bitcoinBlocksLeft, setBitcoinBlocksLeft] = useState(0);
  const [stackingApy, setStackingApy] = useState(6.35); // TODO: make dynamic
  const [currentTxStatus, setCurrentTxStatus] = useState('');
  const [currentTxId, setCurrentTxId] = useState('');
  const [currentTxMessage, setCurrentTxMessage] = useState('');

  useEffect(() => {
    if (props.userData) {
      const userData = props.userData;
      setUserData(userData);
      const env = process.env.NEXT_PUBLIC_NETWORK_ENV;
      const isMainnet = env == 'mainnet';

      if (isMainnet) {
        setStxAddress(userData?.profile?.stxAddress?.mainnet);
      } else {
        setStxAddress(userData?.profile?.stxAddress?.testnet);
      }
    }
  }, [props.userData])

  useEffect(() => {
    const fetchBalances = async () => {
      const client = getRPCClient();
      const stStxAddress = `${process.env.NEXT_PUBLIC_STSTX_ADDRESS}.ststx-token::ststx`;
      const sDaoAddress = `${process.env.NEXT_PUBLIC_STSTX_ADDRESS}.sdao-token::sdao`;
      const url = `${client.url}/extended/v1/address/${stxAddress}/balances`;
      const response = await fetch(url, { credentials: 'omit' });
      const data = await response.json();

      const balance = Number(data['stx']['balance']);
      const lockedBalance = Number(data['stx']['locked']);
      const totalBalance = (balance - lockedBalance) / DENOMINATOR;
      setStxBalance(totalBalance);

      let stackedBalance = 0;
      if (data['fungible_tokens'][stStxAddress]) {
        stackedBalance = data['fungible_tokens'][stStxAddress]['balance'] / DENOMINATOR;
        setStStxBalance(stackedBalance);
      }
      let sDaoBalance = 0;
      if (data['fungible_tokens'][sDaoAddress]) {
        sDaoBalance = data['fungible_tokens'][sDaoAddress]['balance'] / DENOMINATOR;
        setSDaoBalance(sDaoBalance);
      }
    };

    const fetchRatio = async () => {
      const result = await callReadOnlyFunction({
        contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS || '',
        contractName: 'stacking-dao-core-v1',
        functionName: 'get-stx-per-ststx',
        functionArgs: [
          contractPrincipalCV(`${process.env.NEXT_PUBLIC_STSTX_ADDRESS}`, 'reserve-v1')
        ],
        senderAddress: stxAddress,
        network: stacksNetwork
      });

      setStxRatio(parseFloat(result?.value?.value) / 1000000.0);
    };

    const fetchStxPrice = async () => {
      // Fetch STX price
      const bandUrl = 'https://laozi1.bandchain.org/api/oracle/v1/request_prices?ask_count=16&min_count=10&symbols=STX';
      const result = await fetch(bandUrl);
      const res = await result.json();
      if (res['price_results']?.length > 0) {
        setStxPrice(res['price_results'][0]['px'] / Number(res['price_results'][0]['multiplier']));
      }
    }

    const fetchStackingCycle = async () => {
      const metaInfoUrl = coreApiUrl + `/v2/pox`; 
      fetch(metaInfoUrl)
        .then(res => res.json())
        .then(response => {
          setStackingCycle(response['current_cycle']['id']);
          setStackedStx(response['current_cycle']['stacked_ustx']);
          const blocksUntilNextCycle = response['next_cycle']['blocks_until_prepare_phase'];
          setBitcoinBlocksLeft(Math.max(0, blocksUntilNextCycle));
          setNextRewardCycleBlocks(response['next_reward_cycle_in']);

          const blocksSinceStart = 2100 - blocksUntilNextCycle;  // 2100 blocks in a cycle
          const currentTimestamp = Date.now(); // in milliseconds
          const startTimestamp = currentTimestamp - blocksSinceStart*10*60000; // 10 minutes per block time 60,000 milliseconds per minute
          const endTimestamp = currentTimestamp + blocksUntilNextCycle*10*60000;
          // const daysPassed = Math.round(
          //   (currentTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)
          // );
          const daysLeft = Math.max(
            0,
            Math.round((endTimestamp - currentTimestamp) / (1000 * 60 * 60 * 24))
          );
          setCycleDaysLeft(daysLeft);
        });
    };

    const fetchStackingApy = async () => {
      // TODO: fix on mainnet
      return;

      const result = await callReadOnlyFunction({
        contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS,
        contractName: 'reserve-v1',
        functionName: 'get-stx-stacking-at-block',
        functionArgs: [
          uintCV(600000)
        ],
        senderAddress: stxAddress,
        network: stacksNetwork
      });

      setStackingApy(parseFloat(result?.value?.value) / 1000000.0);
    }

    fetchStackingCycle();
    fetchStxPrice();
    if (stxAddress) {
      fetchBalances();
      fetchRatio();
      fetchStackingApy();
    }
  }, [stxAddress]);

  return (
    <AppContext.Provider
      value={{
        stxBalance: stxBalance,
        stStxBalance: stStxBalance,
        sDaoBalance: sDaoBalance,
        stxPrice: stxPrice,
        stxRatio: stxRatio,
        stxAddress: stxAddress,
        setStxAddress: setStxAddress,
        okxProvider: okxProvider,
        setOkxProvider: setOkxProvider,
        stackingApy: stackingApy,
        stackingCycle: stackingCycle,
        stackedStx: stackedStx,
        cycleDaysLeft: cycleDaysLeft,
        bitcoinBlocksLeft: bitcoinBlocksLeft,
        nextRewardCycleBlocks: nextRewardCycleBlocks,
        currentTxId: currentTxId,
        currentTxStatus: currentTxStatus,
        currentTxMessage: currentTxMessage,
        setCurrentTxId: setCurrentTxId,
        setCurrentTxStatus: setCurrentTxStatus,
        setCurrentTxMessage: setCurrentTxMessage,
        userData: userData
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
