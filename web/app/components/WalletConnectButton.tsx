// @ts-nocheck

import { useConnect } from '@stacks/connect-react';
import { useAppContext } from './AppContext/AppContext';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSTXAddress } from '../common/use-stx-address';
import { resolveProvider } from '../common/utils';
import { ChooseWalletModal } from './ChooseWalletModal';

export const WalletConnectButton = ({ className, signOut }) => {
  className = clsx(
    className,
    'w-36 justify-center inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
    'bg-dark-green-600 text-white hover:bg-neutral-800'
  )

  const { setStxAddress, setOkxProvider } = useAppContext();
  const { doOpenAuth } = useConnect();
  const stxAddress = useSTXAddress();
  const [truncatedAddress, setTruncatedAddress] = useState(stxAddress);
  const [buttonLabel, setButtonLabel] = useState('Connect');
  const [showChooseWalletModal, setShowChooseWalletModal] = useState(false);

  const showModalOrConnectWallet = async () => {
    const provider = resolveProvider();
    if (provider?.isOkxWallet) {
      const resp = await provider.connect();
      setStxAddress(resp['address']);
      setOkxProvider(provider);
    } else if (provider) {
      doOpenAuth(true, undefined, provider);
    } else {
      setShowChooseWalletModal(true);
    }
  };

  const onProviderChosen = async (providerString: string) => {
    localStorage.setItem('stacking-sign-provider', providerString);
    setShowChooseWalletModal(false);

    const provider = resolveProvider();

    if (providerString == 'okx') {
      const resp = await provider.connect();
      setStxAddress(resp['address']);
      setOkxProvider(provider);
    } else {
      doOpenAuth(true, undefined, provider);
    }
  };

  const updateButtonLabel = (entered: boolean) => {
    if (entered) {
      const label = stxAddress ? 'Sign out' : 'Connect';
      setButtonLabel(label);
    } else {
      const truncatedAddress = stxAddress ? (
        <>
          <svg className="inline-block w-2 h-2 text-fluor-green-500" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="4" fill="currentColor"/>
          </svg>
          {`${stxAddress.slice(0, 4)}...${stxAddress.slice(-4)}`}
        </>
      ) : '';

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
