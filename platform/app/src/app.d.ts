import type {
  Authorization,
  AccountWithMeta,
  AuthorizationData,
  ProfileWithMeta,
} from '@openpeeps/common/types';

declare global {
  interface RequestInit {
    duplex?: 'half';
  }

  namespace App {
    export interface Locals {
      authorization: Authorization;
      currentProfile?: ProfileWithMeta;
      currentAccount?: AccountWithMeta;
      authData: AuthorizationData;
    }

    // interface PageData {}
    // interface Error {}
    // interface Platform {}
  }
}
