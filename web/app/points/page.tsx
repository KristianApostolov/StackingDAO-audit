// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '../components/Container';
import { useSTXAddress } from '../common/use-stx-address';
import { PointsModal } from '../components/PointsModal';
import { callReadOnlyFunction, uintCV } from '@stacks/transactions';
import { stacksNetwork, coreApiUrl } from '../common/utils';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { PlaceholderBar } from '../components/PlaceholderBar';
import { Tooltip } from 'react-tooltip';
import { ExternalLinkIcon } from '@heroicons/react/outline';

export default function Points() {
  const stxAddress = useSTXAddress();

  const [isLoading, setIsLoading] = useState(true);
  const [buttonText, setButtonText] = useState('Copy your referral link');
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [pointsInfo, setPointsInfo] = useState({ user_points: 0, boost_points: 0, referral_points: 0 });
  const [userRank, setUserRank] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [nftType, setNftType] = useState(-1);
  const [lastUpdateBlock, setLastUpdateBlock] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [boostPoints, setBoostPoints] = useState(0);


  const copyLink = async () => {
    await navigator.clipboard.writeText(`https://app.stackingdao.com/stack?referral=${stxAddress}`);
    setButtonText('Link copied!');
  };

  const addUserToFrontOfList = (searchValue: string, allUsers: any[], list: any[]) => {
    if (stxAddress) {
      const currentUser = allUsers.filter(user => user[0] == stxAddress);
      const currentIndex = list.indexOf(currentUser[0]);

      if (stxAddress != searchValue && (currentIndex > 2 || currentIndex < 0)) {
        return currentUser.concat(list);
      }
    }
    return list;
  };

  const searchValueChangedHelper = async (value: string) => {
    setSearchValue(value);
    if (value == '') {
      setTopUsers(addUserToFrontOfList(value, allUsers, allUsers.slice(0, 100)));
    } else {
      const user = allUsers.filter(user => user[0] == value);
      const index = allUsers.indexOf(user[0]);
      setTopUsers(
        addUserToFrontOfList(value, allUsers, allUsers.slice(Math.max(0, index - 3), index + 97))
      );
    }
  };

  const searchValueChanged = (event: { target: { value: SetStateAction<string> } }) => {
    searchValueChangedHelper(event.target.value);
  };

  const clearUser = async () => {
    searchValueChangedHelper('');
  };

  async function fetchBlockInfo() {
    const lastBlockResponse = await fetch(
      'https://stackingdao-points.s3.amazonaws.com/points-last-block-10.json'
    );
    const lastBlock = (await lastBlockResponse.json()).last_block;

    const blockHeightResponse = await fetch(`${coreApiUrl}/extended/v2/blocks/${lastBlock}`, {
      json: true,
    });
    const blockTime = (await blockHeightResponse.json())['burn_block_time_iso'];

    console.log('lastBlock:', lastBlock, 'blockTime:', blockTime), setLastUpdateBlock(blockTime);
  }

  async function fetchBoostPoints() {
    const url = 'https://stackingdao-points.s3.amazonaws.com/points-aggregate-11.json';
    const response = await fetch(url);
    const data = await response.json();

    const userInfo = data[stxAddress];
    console.log("userInfo", userInfo);
    console.log("test", userInfo.boost_points_2 ?? 0);

    setBoostPoints((userInfo.boost_points_2 ?? 0) + (userInfo.boost_points_3 ?? 0))
  }

  async function fetchPointsInfo() {
    const url = 'https://stackingdao-points.s3.amazonaws.com/points-aggregate-10.json';
    const response = await fetch(url);
    const data = await response.json();

    for (const key of Object.keys(data)) {
      data[key] = {
        "user_points": data[key].user_points,
        "referral_points": data[key].referral_points,
        "boost_points_1": data[key].boost_points_1 ?? 0,
        "boost_points_2": data[key].boost_points_2 ?? 0,
        "boost_points_3": data[key].boost_points_3 ?? 0,
        "new_points": data[key].new_points
      }
    }

    const sumWithInitial = Object.values(data).reduce(
      (accumulator, currentValue) =>
        accumulator + currentValue['user_points'] + currentValue['referral_points'] + currentValue['boost_points_1'] + currentValue['boost_points_2'] + currentValue['boost_points_3'],
      0
    );
    setTotalPoints(sumWithInitial);

    // Sort the data for the leaderboard
    var items = Object.keys(data).map(function (key) {
      return [key, data[key]];
    });
    items.sort(function (first, second) {
      return (
        (second[1].user_points + second[1].referral_points + second[1].boost_points_1 + second[1].boost_points_2 + second[1].boost_points_3) -
        (first[1].user_points + first[1].referral_points + first[1].boost_points_1 + first[1].boost_points_2 + first[1].boost_points_3)
      );
    });
    setAllUsers(items);
    setTopUsers(items.slice(0, 100));

    if (!stxAddress) return;
    const userData = data[stxAddress];
    setPointsInfo(userData || { user_points: 0, boost_points_1: 0, boost_points_2: 0, boost_points_3: 0, referral_points: 0 });

    const currentUser = items.filter(user => user[0] == stxAddress);
    const currentIndex = items.indexOf(currentUser[0]);
    setUserRank(currentIndex + 1);
    setTopUsers(addUserToFrontOfList(searchValue, items, items.slice(0, 100)));
  }

  const fetchNftType = async (id: string) => {
    const result = await callReadOnlyFunction({
      contractAddress: process.env.NEXT_PUBLIC_STSTX_ADDRESS || '',
      contractName: 'stacking-dao-genesis-nft',
      functionName: 'get-genesis-type',
      functionArgs: [uintCV(id)],
      senderAddress: stxAddress,
      network: stacksNetwork,
    });

    return Number(result?.value);
  };

  const fetchNftBalance = async () => {
    const identifier = `${process.env.NEXT_PUBLIC_STSTX_ADDRESS}.stacking-dao-genesis-nft::stacking-dao-genesis`;
    const url =
      coreApiUrl +
      `/extended/v1/tokens/nft/holdings?principal=${stxAddress}&asset_identifiers[]=${identifier}`;
    const response = await fetch(url, { credentials: 'omit' });
    const data = await response.json();

    if (data['results']?.length > 0) {
      const ids = data['results'].map(el => el['value']['repr'].replace('u', ''));
      const types = await Promise.all(ids.map(id => fetchNftType(id)));
      const maxType = Math.max(...types);
      setNftType(maxType);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);

    if (stxAddress) {
      await fetchNftBalance();
      await fetchBoostPoints();
    }

    await Promise.all([fetchPointsInfo(), fetchBlockInfo()]);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [stxAddress]);

  return (
    <Container className="mt-12">
      <div className="grid grid-cols-1 gap-9 lg:grid-cols-2">
        <div className="p-8 md:p-12 bg-white rounded-xl flex items-center justify-center shadow-[0px_10px_10px_-5px_#00000003,0px_20px_25px_-5px_#0000000A]">
          <div className="flex flex-col w-full min-h-full md:max-w-xl">
            <h1 className="text-2xl font-headings">StackingDAO Points</h1>
            <div className="mt-6">
              <p className="text-sm text-sd-gray">
                We reserve the right to update point calculations at any time. Points are updated
                every 2 days. Last updated on{' '}
                {isLoading ? (
                  <PlaceholderBar className="inline-flex w-10" />
                ) : (
                  <>
                    <span className="font-semibold">
                      {new Date(lastUpdateBlock).toLocaleString('en-US')}
                    </span>{' '}
                    ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                  </>
                )}
              </p>
            </div>

            {stxAddress ? (
              <dl className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2">
                <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                  <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                    Your Points
                    <div
                      className="relative flex flex-col items-center justify-center mx-1 cursor-pointer max-w-max"
                      id="yourPoints"
                    >
                      <Tooltip anchorSelect="#yourPoints" place="top">
                        The sum of Your Stacking Points, Boost Points and Referral Points
                      </Tooltip>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none">
                        <g
                          stroke="#797C80"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          clipPath="url(#clip0_321_1078)"
                        >
                          <path d="M6 11c2.76142 0 5-2.23858 5-5S8.76142 1 6 1 1 3.23858 1 6s2.23858 5 5 5Z" />
                          <path d="M4.54504 4.50004c.11756-.33417.34958-.61595.65498-.79543.3054-.17949.66447-.2451 1.01361-.18521.34914.05988.66582.2414.89395.5124.22813.27101.35299.614.35246.96824 0 1-1.5 1.5-1.5 1.5M6 8.5h.00556" />
                        </g>
                        <defs>
                          <clipPath id="clip0_321_1078">
                            <path fill="#fff" d="M0 0h12v12H0z" />
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                  </dt>
                  <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                    {isLoading ? (
                      <PlaceholderBar className="inline-flex w-20 h-4" />
                    ) : (
                      <div className="flex items-center">
                        {(pointsInfo.user_points + pointsInfo.referral_points + boostPoints).toLocaleString(
                          'en-US',
                          {
                            maximumFractionDigits: 0,
                          }
                        )}

                        {nftType >= 0 ? (
                          <>
                            <div className="ml-2 text-gray-500 text-bottom">*</div>
                            <span className="relative flex flex-col items-center justify-center mx-1 text-gray-500 max-w-max bg-gray hover:text-sd-gray">
                              <Tooltip anchorSelect="#multiplier" place="top">
                                {nftType == 1 ? (
                                  <>LFG! You&apos;re holding a Stacking DAO OG Genesis NFT.</>
                                ) : nftType == 2 ? (
                                  <>
                                    Wow, you&apos;re lucky! You&apos;re holding a 1 of 100 Stacking
                                    DAO Gold Genesis NFT.
                                  </>
                                ) : nftType == 3 ? (
                                  <>
                                    OMG. You&apos;re the special one! You&apos;re holding a 1 of 1 a
                                    Stacking DAO Diamond Genesis NFT.
                                  </>
                                ) : (
                                  <>LFG! You&apos;re holding a Stacking DAO Genesis NFT.</>
                                )}{' '}
                                A secret multiplier will be applied on your points later!
                              </Tooltip>
                              <div id="multiplier">
                                {nftType == 1 ? (
                                  <>😎</>
                                ) : nftType == 2 ? (
                                  <>✨</>
                                ) : nftType == 3 ? (
                                  <>💎</>
                                ) : (
                                  <>🚀</>
                                )}
                              </div>
                            </span>
                          </>
                        ) : null}
                      </div>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                  <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                    Your Stacking Points
                  </dt>
                  <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                    {isLoading ? (
                      <PlaceholderBar className="inline-flex w-20 h-4" />
                    ) : (
                      <>
                        <div>{pointsInfo.user_points.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>

                        {boostPoints > 0 ? (
                          <>
                            <span className="text-gray-500 text-bottom px-1">+</span>
                            <Tooltip anchorSelect="#boost" place="top">
                              Extra point boosts!
                            </Tooltip>
                            <span id="boost">
                              {/* {(pointsInfo.boost_points_1 + pointsInfo.boost_points_2 + pointsInfo.boost_points_3).toLocaleString('en-US', { maximumFractionDigits: 0 })} */}
                              {boostPoints.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              <span className='pl-2'>🚀</span>
                            </span>
                          </>
                        ): null}
                      </>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                  <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                    Your Referral Points
                  </dt>
                  <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                    {isLoading ? (
                      <PlaceholderBar className="inline-flex w-20 h-4" />
                    ) : (
                      pointsInfo.referral_points.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                  <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                    Your Rank
                  </dt>
                  <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                    {isLoading ? (
                      <PlaceholderBar className="inline-flex w-20 h-4" />
                    ) : (
                      <>
                        {userRank == -1 ? (
                          <>N/A</>
                        ) : (
                          <>#{userRank.toLocaleString('en-US', { maximumFractionDigits: 0 })}</>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <>
                <div className="flex flex-wrap p-4 mt-6 rounded-lg bg-sd-gray-light">
                  <p>Connect your wallet to view your points.</p>
                </div>
                <div className="mt-6">
                  <WalletConnectButton />
                </div>
              </>
            )}

            <dl className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2">
              <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                  Total Points
                  <div
                    className="relative flex flex-col items-center justify-center mx-1 cursor-pointer group max-w-max"
                    id="totalPoints"
                  >
                    <Tooltip anchorSelect="#totalPoints" place="top">
                      Total Points accumulated in the protocol so far
                    </Tooltip>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none">
                      <g
                        stroke="#797C80"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath="url(#clip0_321_1078)"
                      >
                        <path d="M6 11c2.76142 0 5-2.23858 5-5S8.76142 1 6 1 1 3.23858 1 6s2.23858 5 5 5Z" />
                        <path d="M4.54504 4.50004c.11756-.33417.34958-.61595.65498-.79543.3054-.17949.66447-.2451 1.01361-.18521.34914.05988.66582.2414.89395.5124.22813.27101.35299.614.35246.96824 0 1-1.5 1.5-1.5 1.5M6 8.5h.00556" />
                      </g>
                      <defs>
                        <clipPath id="clip0_321_1078">
                          <path fill="#fff" d="M0 0h12v12H0z" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </dt>
                <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                  {isLoading ? (
                    <PlaceholderBar className="inline-flex w-20 h-4" />
                  ) : (
                    totalPoints.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  )}
                </dd>
              </div>
              <div className="flex flex-wrap p-4 rounded-lg bg-sd-gray-light">
                <dt className="flex items-center gap-1 text-sm font-medium leading-6 text-sd-gray">
                  Total users
                </dt>
                <dd className="flex-none w-full text-2xl font-medium text-sd-gray-darker">
                  {isLoading ? (
                    <PlaceholderBar className="inline-flex w-20 h-4" />
                  ) : (
                    allUsers.length.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  )}
                </dd>
              </div>
            </dl>

            {stxAddress && (
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  className="flex items-center justify-center w-full gap-2 px-6 py-4 text-base font-semibold text-white rounded-lg focus:outline-none sm:text-xl bg-dark-green-600 active:bg-button-active hover:bg-button-hover disabled:bg-opacity-50"
                  onClick={() => copyLink()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="18" fill="none">
                    <path
                      stroke="#fff"
                      strokeLinecap="square"
                      strokeLinejoin="bevel"
                      strokeWidth="2"
                      d="M15.5 6H8c-.82843 0-1.5.67157-1.5 1.5V15c0 .8284.67157 1.5 1.5 1.5h7.5c.8284 0 1.5-.6716 1.5-1.5V7.5c0-.82843-.6716-1.5-1.5-1.5Z"
                    />
                    <path
                      stroke="#fff"
                      strokeLinecap="square"
                      strokeLinejoin="bevel"
                      strokeWidth="2"
                      d="M3.5 12c-.825 0-1.5-.675-1.5-1.5V3c0-.825.675-1.5 1.5-1.5H11c.825 0 1.5.675 1.5 1.5"
                    />
                  </svg>
                  {buttonText}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-8 md:p-12 bg-dark-green-600 rounded-xl shadow-[0px_10px_10px_-5px_#00000003,0px_20px_25px_-5px_#0000000A]">
          <div className="flex flex-col">
            <h2 className="text-2xl text-white font-headings">How do points work?</h2>

            <p className="mt-6 text-white/70">
              StackingDAO Points are designed to quantify and reward your contributions to the
              ever-growing StackingDAO ecosystem.
            </p>
            <p className="mt-4 text-white/70">
              You can earn points through holding stSTX, participating in DeFi activities or making
              referrals, and more. The math is simple, transparent, and designed to benefit everyone
              from long-term holders to active DeFi users.
            </p>

            <h2 className="mt-8 text-2xl text-white font-headings">How to earn points?</h2>

            <dl className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2">
              <ol>
                <li className="flex items-center gap-x-4">
                  <div className="bg-fluor-green-500/[0.15] flex items-center justify-center w-6 h-6 text-fluor-green-500 text-sm rounded-full font-semibold shrink-0">
                    1
                  </div>
                  <div className="flex-none w-full text-sm font-medium leading-6 text-white">
                    Holding stSTX
                  </div>
                </li>
                <li className="flex items-center mt-8 gap-x-4">
                  <div className="bg-fluor-green-500/[0.15] flex items-center justify-center w-6 h-6 text-fluor-green-500 text-sm rounded-full font-semibold shrink-0">
                    2
                  </div>
                  <div className="flex-none w-full text-sm font-medium leading-6 text-white">
                    DeFi activities stSTX
                  </div>
                </li>
                <li className="flex items-center mt-8 gap-x-4">
                  <div className="bg-fluor-green-500/[0.15] flex items-center justify-center w-6 h-6 text-fluor-green-500 text-sm rounded-full font-semibold shrink-0">
                    3
                  </div>
                  <div className="flex-none w-full text-sm font-medium leading-6 text-white">
                    Referrals
                  </div>
                </li>
                <li className="flex items-center mt-8 gap-x-4">
                  <div className="bg-fluor-green-500/[0.15] flex items-center justify-center w-6 h-6 text-fluor-green-500 text-sm rounded-full font-semibold shrink-0">
                    4
                  </div>
                  <div className="flex-none w-full text-sm font-medium leading-6 text-white">
                    OG and Genesis NFTs
                  </div>
                </li>
              </ol>
              <button
                type="button"
                className="flex flex-col justify-end p-4 text-left rounded-lg shrink-0 hover:cursor-pointer group bg-white/10"
                onClick={() => setShowPointsInfo(true)}
              >
                <div className="relative flex items-center justify-center w-8 h-8 text-base font-semibold rounded-full bg-fluor-green-500 text-dark-green-600">
                  <svg
                    className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                  >
                    <path
                      stroke="#000"
                      strokeLinecap="square"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M3 9h12M9 3v12"
                    />
                  </svg>
                </div>
                <p className="mt-6 text-xl font-semibold text-white">
                  Learn more about earning points
                </p>
              </button>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-white rounded-xl flex items-center justify-center shadow-[0px_10px_10px_-5px_#00000003,0px_20px_25px_-5px_#0000000A]">
        <div className="flex flex-col w-full min-h-full">
          <div className="p-8 pb-0 md:p-12 md:pb-0">
            <div className="w-full mb-3 text-2xl font-headings">Leaderboard</div>
            <p className="text-sm text-gray-500">
              A list of users sorted by points earned. Enter an address below to view its
              information.
            </p>

            <div className="relative flex mt-6">
              <input
                type="text"
                name="last-name"
                id="last-name"
                autoComplete="family-name"
                placeholder="SP...."
                value={searchValue}
                onChange={evt => searchValueChanged(evt)}
                className="block w-full py-3 pl-3 text-gray-900 border-0 rounded-md ring-1 ring-inset ring-sd-gray-light placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
              />
              <button
                type="button"
                className="absolute items-center justify-center px-2 py-1 text-sm font-bold text-white -translate-y-1/2 rounded-lg top-1/2 right-2 focus:outline-none bg-dark-green-600 active:bg-button-active hover:bg-button-hover disabled:bg-opacity-50"
                onClick={() => clearUser()}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flow-root mt-8">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden border-t border-sd-gray-light rounded-b-xl">
                  <table className="min-w-full divide-y divide-sd-gray-light">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-sd-gray sm:pl-12"
                        >
                          Rank
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-sd-gray"
                        >
                          User
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-sd-gray"
                        >
                          Stacking Points
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-sd-gray"
                        >
                          Referral Points
                        </th>
                        
                        {/* 
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-sd-gray"
                        >
                          Boosts Points
                        </th> 
                        */}
                        
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-sd-gray"
                        >
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topUsers.map(user => (
                        <tr
                          key={topUsers.indexOf(user) + Math.random()}
                          className={
                            user[0] == searchValue || user[0] == stxAddress
                              ? 'bg-fluor-green-500/10'
                              : 'bg-white'
                          }
                        >
                          <td className="pl-6 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-10">
                            {allUsers.indexOf(user) == 0 ? (
                              <span className="text-2xl">🥇</span>
                            ) : allUsers.indexOf(user) == 1 ? (
                              <span className="text-2xl">🥈</span>
                            ) : allUsers.indexOf(user) == 2 ? (
                              <span className="text-2xl">🥉</span>
                            ) : (
                              <span className="pl-2">{allUsers.indexOf(user) + 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap">
                            <Link
                              href={`https://explorer.hiro.so/address/${user[0]}?chain=mainnet`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <div
                                className={
                                  user[0] == stxAddress
                                    ? 'flex text-dark-green-500 font-medium'
                                    : 'flex text-gray-500 font-normal'
                                }
                              >
                                <span className="sm:hidden">{`${user[0].slice(
                                  0,
                                  4
                                )}...${user[0].slice(-4)}`}</span>
                                <span className="hidden sm:inline">{user[0]}</span>
                                {user[0] == stxAddress ? <> (You)</> : null}
                                <div className="pt-1 pl-2">
                                  <ExternalLinkIcon className="w-3 h-3 opacity-80" />
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {user[1].user_points.toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {user[1].referral_points.toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          {/* 
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {(user[1].boost_points_1 + user[1].boost_points_2 + user[1].boost_points_3).toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          */}
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {(user[1].user_points + user[1].referral_points + user[1].boost_points_1 + user[1].boost_points_2 + user[1].boost_points_3).toLocaleString(
                              'en-US',
                              { maximumFractionDigits: 0 }
                            )}
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
      </div>

      {showPointsInfo && <PointsModal open={showPointsInfo} setOpen={setShowPointsInfo} />}
    </Container>
  );
}
