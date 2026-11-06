import { useEffect } from 'react';
import type { OpenpeepsClient } from '@openpeepshq/client';
import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import type { ProfileWithMeta } from '@openpeepshq/common';

/** How often the client reports presence while the app is in the foreground. */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Reports the current profile's presence so staff members (admin/moderator,
 * via `core-presence-read`) can see who else is online. Only profiles whose
 * presence someone may actually see send heartbeats — ordinary members'
 * activity has no consumer. Fires on mount, on an interval, and when the
 * app/tab regains the foreground. The server keeps a profile "online" for a
 * short window after the last heartbeat; failed heartbeats are
 * intentionally ignored (no toasts for presence).
 */
export const usePresenceHeartbeat = (
  client: OpenpeepsClient,
  profile: ProfileWithMeta | undefined,
  subscribeToForeground?: (onForeground: () => void) => () => void,
) => {
  const enabled =
    profile !== undefined &&
    profile.type === 'local' &&
    checkRoleCapabilities(profile.roles, ['core-presence-read']).success;

  useEffect(() => {
    if (!enabled) return;

    const send = () => {
      // Browsers still fire throttled background timers (~once a minute),
      // which would keep a hidden tab "online" past the 2-minute server
      // window. Skip while hidden; the visibilitychange listener below
      // re-sends when the tab comes back.
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      void client.profiles.current.presence();
    };
    send();
    const interval = setInterval(send, PRESENCE_HEARTBEAT_INTERVAL_MS);
    const cleanups: Array<() => void> = [() => clearInterval(interval)];

    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') send();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      cleanups.push(() =>
        document.removeEventListener('visibilitychange', onVisibilityChange),
      );
    } else if (subscribeToForeground) {
      cleanups.push(subscribeToForeground(send));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [enabled, client, subscribeToForeground]);
};
