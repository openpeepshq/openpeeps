import type { OpenpeepsClient } from '@openpeepshq/client';
import {
  payloadMutation,
  retrieveAccount,
  retrieveProfile,
  updateCredentialsWrapper,
} from '../helpers';
import type { ProfileWithMeta, PublicAccount } from '@openpeepshq/common';
import { useQueryClient } from '@tanstack/react-query';
import { useCredentialsStore } from '../../credentialsStore';
import { unsubscribePushNotifications } from '../push/webPush';

export const authHooks = (
  client: OpenpeepsClient,
  setCurrentProfile: (profile: ProfileWithMeta | undefined) => void,
  setCurrentAccount: (account: PublicAccount | undefined) => void,
) => ({
  // Auth
  loginAction: updateCredentialsWrapper(
    client.auth.login,
    retrieveProfile(client),
    setCurrentProfile,
    retrieveAccount(client),
    setCurrentAccount,
  ),
  logoutAction: async () => {
    const { credentialsStore } = useCredentialsStore();
    const queryClient = useQueryClient();
    await credentialsStore.clear();
    await unsubscribePushNotifications();
    queryClient?.clear();
    setCurrentProfile(undefined);
    setCurrentAccount(undefined);
  },
  registerAction: updateCredentialsWrapper(
    client.auth.register,
    retrieveProfile(client),
    setCurrentProfile,
    retrieveAccount(client),
    setCurrentAccount,
  ),
  requestResetPasswordAction: payloadMutation(client.auth.requestResetPassword),
  resetPasswordAction: payloadMutation(client.auth.resetPassword),
  guestPassAction: updateCredentialsWrapper(
    client.auth.guestPass,
    retrieveProfile(client),
    setCurrentProfile,
    retrieveAccount(client),
    setCurrentAccount,
  ),
  refreshAction: updateCredentialsWrapper<undefined>(
    () => client.auth.refresh({}),
    retrieveProfile(client),
    setCurrentProfile,
    retrieveAccount(client),
    setCurrentAccount,
  ),
});

export type AuthHooks = ReturnType<typeof authHooks>;
