/// <reference lib="dom" />

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../contexts/openpeeps';
import { usePushSubscription } from '../push/usePushSubscription';

export interface NotificationPermissionPromptProps {
  /** VAPID application server key (base64). Usually from server info. */
  applicationServerKey?: string;
  className?: string;
  message?: ReactNode;
  enableLabel?: string;
  dismissLabel?: string;
  /** Persist dismissal in localStorage under this key. */
  storageKey?: string;
}

/**
 * Asks the user to enable push notifications. Hidden when:
 * - notifications are not supported,
 * - permission is already granted/denied,
 * - the user dismissed it previously (persisted in localStorage),
 * - or the app already has an active subscription.
 *
 * Requires `<OpenpeepsProvider>` to be mounted up the tree (uses `useOpenpeeps`
 * to obtain the API client).
 */
export function NotificationPermissionPrompt({
  applicationServerKey,
  className,
  message = 'Get notified when something new happens.',
  enableLabel = 'Enable notifications',
  dismissLabel = 'Not now',
  storageKey = 'op:notif-prompt-dismissed',
}: NotificationPermissionPromptProps) {
  const { client } = useOpenpeeps();
  const { isSubscribed, permission, subscribe } = usePushSubscription({
    client,
    applicationServerKey,
  });

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  // Re-check `Notification.permission` after a successful subscribe call
  const [browserPermission, setBrowserPermission] = useState(permission);
  useEffect(() => {
    setBrowserPermission(permission);
  }, [permission, isSubscribed]);

  if (
    browserPermission === 'unsupported' ||
    browserPermission !== 'default' ||
    dismissed ||
    isSubscribed
  ) {
    return null;
  }

  return (
    <div
      className={
        className ??
        'border-border bg-card flex w-full items-center justify-between gap-3 rounded border p-3 text-sm shadow-sm'
      }
    >
      <div>{message}</div>
      <div className="flex items-center gap-2">
        <Button
          variant="variant-soft"
          action={() => {
            try {
              window.localStorage.setItem(storageKey, '1');
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          {dismissLabel}
        </Button>
        <Button
          variant="variant-filled-primary"
          action={async () => {
            await subscribe();
          }}
        >
          {enableLabel}
        </Button>
      </div>
    </div>
  );
}
