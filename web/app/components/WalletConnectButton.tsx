// @ts-nocheck

import { useConnect } from '@stacks/connect-react';
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useSTXAddress } from '../common/use-stx-address';
import { resolveProvider } from '../common/utils';
import { ChooseWalletModal } from './ChooseWalletModal';

export const WalletConnectButton = ({ className, signOut }) => {
  className = clsx(
    className,
    'inline-flex rounded-full px-4 py-1.5 text-sm font-semibold transition',
    'bg-neutral-950 text-white hover:bg-neutral-800'
  )

  const { doOpenAuth } = useConnect();
  const stxAddress = useSTXAddress();
  const [truncatedAddress, setTruncatedAddress] = useState(stxAddress);
  const [buttonLabel, setButtonLabel] = useState('Connect');
  const [showChooseWalletModal, setShowChooseWalletModal] = useState(false);

  const showModalOrConnectWallet = async () => {
    const provider = resolveProvider();
    if (provider) {
      await doOpenAuth(true, undefined, provider);
    } else {
      setShowChooseWalletModal(true);
    }
  };

  const onProviderChosen = async (providerString: string) => {
    localStorage.setItem('stacking-sign-provider', providerString);
    setShowChooseWalletModal(false);

    const provider = resolveProvider();
    await doOpenAuth(true, undefined, provider);
  };

  const updateButtonLabel = (entered: boolean) => {
    if (entered) {
      const label = stxAddress ? 'Sign out' : 'Connect';
      setButtonLabel(label);
    } else {
      const truncatedAddress = stxAddress ? `${stxAddress.slice(0, 4)}...${stxAddress.slice(-4)}` : '';
      const label = stxAddress ? truncatedAddress : 'Connect';
      setButtonLabel(label);
    }
  };

  useEffect(() => {
    if (!stxAddress) return;

    setTruncatedAddress(`${stxAddress.slice(0, 4)}...${stxAddress.slice(-4)}`);
    updateButtonLabel(false);
  }, [stxAddress]);

  return (
    <>
      <ChooseWalletModal
        open={showChooseWalletModal}
        closeModal={() => setShowChooseWalletModal(false)}
        onProviderChosen={onProviderChosen}
      />

      <button
        className={className}
        onClick={async () => {
          if (stxAddress) await signOut();
          else showModalOrConnectWallet();
        }}
        onMouseEnter={() => updateButtonLabel(true)}
        onMouseLeave={() => updateButtonLabel(false)}
      >
        {buttonLabel}
      </button>
    </>
  );
};
