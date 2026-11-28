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
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
// Import the ToastProvider file, not the `components/layout` barrel: the
// barrel eagerly loads `Root` → `navigation` → `sideBarNavLinkClass`, which
// imports `cn` from `@openpeepshq/react-ui` at module scope. authHooks is
// wired into every consumer via buildOpenpeepsApi, so that edge would drag
// the react-ui dependency into every test that only partial-mocks it.
import { useToast } from '../../../components/layout/ToastProvider';
import { useT } from '../../../i18n/context';
import { isReactNative, unsubscribePushNotifications } from '../../../push';

export interface LogoutResult {
  /** Outcome of the best-effort server-side push cleanup. */
  pushCleanup: 'ok' | 'failed';
}

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
  logoutAction: () => {
    const { credentialsStore } = useCredentialsStore();
    const queryClient = useQueryClient();
    const t = useT();
    // ToastProvider is web-only (the RN provider tree never mounts one) and
    // useToast() throws outside it, so resolve it defensively — the shared
    // hook must stay safe for both consumers (RN surfaces failures itself).
    let toastError: ((message: string) => void) | undefined;
    try {
      toastError = useToast().error;
    } catch {
      // No toast host: failures stay visible through the LogoutResult.
    }
    return async (): Promise<LogoutResult> => {
      // Push cleanup must run while the auth token still exists: it removes
      // this device's subscription server-side, so the logged-out device
      // stops receiving pushes for this account. It must never block logout
      // though. On a hard failure (e.g. a network error) both the server row
      // and the local registration are kept — the local unsubscribe runs
      // after the server delete, so an error there short-circuits before it —
      // which mirrors the RN logout helper and lets the delivery-time 404
      // cleanup in doPush reclaim the leftover row on the next push.
      let pushCleanupError: unknown;
      await unsubscribePushNotifications({
        client,
        skip: isReactNative(),
      }).catch((err) => {
        pushCleanupError = err;
      });
      await credentialsStore.clear();
      queryClient?.clear();
      setCurrentProfile(undefined);
      setCurrentAccount(undefined);
      if (pushCleanupError === undefined) {
        return { pushCleanup: 'ok' };
      }
      // Reported after the local reset so cleanup can never prevent logout,
      // but still surfaces to the user and the caller.
      // The mapper's `fallback` is a *display copy* (used verbatim, not
      // re-translated), so it must be passed as an already-translated string —
      // hence the `t(...)` here rather than a raw i18n key.
      toastError?.(
        apiErrorMessage(
          pushCleanupError,
          t,
          t('settings.notifications.pushCleanupFailed', {
            defaultValue:
              'Could not remove push notifications for this device.',
          }),
        ),
      );
      return { pushCleanup: 'failed' };
    };
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
