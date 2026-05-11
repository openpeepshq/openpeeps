import { createContext, useContext } from 'react';
import type {
  ProfileSettings,
  ProfileWithMeta,
  PublicAccount,
} from '@openpeeps/common';

export interface IdentityContextValue {
  profile?: ProfileWithMeta;
  account?: PublicAccount;
  profileSettings?: ProfileSettings;
}

export const IdentityContext = createContext<IdentityContextValue>({});

export const useIdentity = () => useContext(IdentityContext);
export const useCurrentProfile = () => useIdentity().profile;
export const useCurrentAccount = () => useIdentity().account;
export const useCurrentProfileSettings = () => useIdentity().profileSettings;
