// @ts-nocheck

import { useAuth, useAccount } from '@micro-stacks/react'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

export const WalletConnectButton = ({ className }) => {
  className = clsx(
    className,
    'inline-flex rounded-full px-4 py-1.5 text-sm font-semibold transition',
    'bg-neutral-950 text-white hover:bg-neutral-800'
  )

  const { openAuthRequest, isRequestPending, signOut, isSignedIn } = useAuth();
  const { stxAddress } = useAccount();
  const [truncatedAddress, setTruncatedAddress] = useState(stxAddress);
  const [buttonLabel, setButtonLabel] = useState('Connect');

  const signOutAction = async () => {
    await signOut();
    window.location = '/';
  }

  const updateButtonLabel = (entered: boolean) => {
    if (entered) {
      const label = isSignedIn ? 'Sign out' : 'Connect';
      setButtonLabel(label);
    } else {
      const truncatedAddress = stxAddress ? `${stxAddress.slice(0, 4)}...${stxAddress.slice(-4)}` : '';
      const label = isRequestPending ? 'Loading...' : isSignedIn ? truncatedAddress : 'Connect';
      setButtonLabel(label);
    }
  };

  useEffect(() => {
    if (!stxAddress) return;

    setTruncatedAddress(`${stxAddress.slice(0, 4)}...${stxAddress.slice(-4)}`);
    updateButtonLabel(false);
  }, [isRequestPending, isSignedIn, stxAddress]);

  return (
    <button
      className={className}
      onClick={async () => {
        if (isSignedIn) await signOutAction();
        else await openAuthRequest();
      }}
      onMouseEnter={() => updateButtonLabel(true)}
      onMouseLeave={() => updateButtonLabel(false)}
    >
      {buttonLabel}
    </button>
  );
};
