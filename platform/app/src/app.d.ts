import type {
  Authorization,
  AccountWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';

declare global {
  namespace App {
    export interface Locals {
      authorization: Authorization;
      currentProfile?: ProfileWithMeta;
      currentAccount?: AccountWithMeta;
    }

    // interface PageData {}
    // interface Error {}
    // interface Platform {}
  }
}
