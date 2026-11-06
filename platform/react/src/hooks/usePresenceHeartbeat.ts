import { useEffect } from 'react';
import type { OpenpeepsClient } from '@openpeepshq/client';
import type { ProfileWithMeta } from '@openpeepshq/common';

/** How often the client reports presence while the app is in the foreground. */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Reports the current profile's presence so staff members (admin/moderator,
 * via `core-presence-read`) can see who else is online. Fires on mount, on an
 * interval, and when the app/tab regains the foreground. The server keeps a
 * profile "online" for a short window after the last heartbeat; failed
 * heartbeats are intentionally ignored (no toasts for presence).
 */
export const usePresenceHeartbeat = (
  client: OpenpeepsClient,
  profile: ProfileWithMeta | undefined,
  subscribeToForeground?: (onForeground: () => void) => () => void,
) => {
  const enabled = profile?.type === 'local';

  useEffect(() => {
    if (!enabled) return;

    const send = () => {
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
