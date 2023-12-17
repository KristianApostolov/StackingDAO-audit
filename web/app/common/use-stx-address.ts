import { useContext } from 'react';
import { UserData } from '@stacks/auth';
import { useAppContext } from '../components/AppContext';

export const useSTXAddress = (): string | undefined => {
  const { userData } = useAppContext();
  const env = process.env.NEXT_PUBLIC_NETWORK_ENV;
  const isMainnet = env == 'mainnet';

  if (isMainnet) {
    return userData?.profile?.stxAddress?.mainnet as string;
  }
  return userData?.profile?.stxAddress?.testnet as string;
};

export const resolveSTXAddress = (userData: UserData | null) => {
  const env = process.env.NEXT_PUBLIC_NETWORK_ENV;
  const isMainnet = env == 'mainnet';

  if (isMainnet) {
    return userData?.profile?.stxAddress?.mainnet as string;
  }
  return userData?.profile?.stxAddress?.testnet as string;
};
