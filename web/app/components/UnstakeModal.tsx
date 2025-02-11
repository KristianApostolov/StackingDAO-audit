// @ts-nocheck

import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { InputAmount } from './InputAmount';
import { Alert } from './Alert';
import { useAppContext } from './AppContext/AppContext';
import {
  uintCV,
  contractPrincipalCV,
  FungibleConditionCode,
  createFungiblePostCondition,
  createAssetInfo,
} from '@stacks/transactions';
import { useSTXAddress } from '../common/use-stx-address';
import { stacksNetwork, currency } from '../common/utils';

export const UnstakeModal = ({ showUnstakeModal, setShowUnstakeModal, stakedAmount }) => {
  const stxAddress = useSTXAddress();

  const [errors, setErrors] = useState<string[]>([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [isUnstakeButtonDisabled, setIsUnstakeButtonDisabled] = useState(false);
  const contractAddress = process.env.NEXT_PUBLIC_STSTX_ADDRESS || '';
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCurrentTxId, setCurrentTxStatus } = useAppContext();

  const unstake = async () => {
    const amount = uintCV(Number((parseFloat(stakeAmount) * 1000000).toFixed(0)));
    const postConditions = [
      createFungiblePostCondition(
        stxAddress!,
        FungibleConditionCode.LessEqual,
        amount.value,
        createAssetInfo(contractAddress, 'sdao-token', 'sdao')
      ),
    ];

    await makeContractCall(
      {
        contractAddress,
        contractName: 'staking-v1',
        functionName: 'unstake',
        functionArgs: [contractPrincipalCV(contractAddress, 'sdao-token'), amount],
        postConditionMode: 0x01,
        network: stacksNetwork,
      },
      async (error?, txId?) => {
        setCurrentTxId(txId);
        setCurrentTxStatus('pending');
        setShowUnstakeModal(false);
      }
    );
  };

  const unstakeMaxAmount = () => {
    setStakeAmount(stakedAmount);
  };

  const onInputStakeChange = (event: any) => {
    const value = event.target.value;
    // trying to unstake
    if (value > stakedAmount) {
      if (errors.length < 1) {
        setErrors(errors.concat(['You cannot unstake more than currently staking']));
      }
      setIsUnstakeButtonDisabled(true);
    } else {
      setErrors([]);
      setIsUnstakeButtonDisabled(false);
    }
    setStakeAmount(value);
  };

  return (
    <Modal
      open={showUnstakeModal}
      title="Unstake sDAO"
      icon={<img className="w-10 h-10 rounded-full" src="./sdao-logo.jpg" alt="sDAO logo" />}
      closeModal={() => setShowUnstakeModal(false)}
      buttonText="Unstake"
      buttonAction={() => unstake()}
      buttonDisabled={isUnstakeButtonDisabled || errors.length > 0}
      initialFocus={inputRef}
    >
      {errors.length > 0 ? (
        <div className="mb-4">
          <Alert type={Alert.type.ERROR}>
            {errors.map(txt => (
              <p key={txt}>{txt}</p>
            ))}
          </Alert>
        </div>
      ) : null}

      <p className="mt-3 text-sm text-center text-gray-500">
        You are currently staking {currency.long.format(stakedAmount)} sDAO
      </p>
      <div className="mt-6">
        <InputAmount
          balance={currency.default.format(stakedAmount)}
          token="sDAO"
          inputName="unstakesDAO"
          inputId="unstakeAmount"
          inputValue={stakeAmount}
          inputLabel="Unstake sDAO"
          onInputChange={onInputStakeChange}
          onClickMax={unstakeMaxAmount}
          ref={inputRef}
        />
      </div>
    </Modal>
  );
};
