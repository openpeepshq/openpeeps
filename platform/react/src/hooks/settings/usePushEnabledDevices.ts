import { useEffect, useState } from 'react';
import type { PushSubscription } from '@openpeepshq/common/types';
import { pushSubscriptionEndpoint } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import type { SettingsStatus } from './useTimezonePreference';

/** Web-push rows are identified by endpoint, FCM rows by token. */
const subscriptionKey = (subscription: PushSubscription) =>
  subscription.type === 'fcm'
    ? subscription.fcmToken
    : pushSubscriptionEndpoint(subscription);

export type UsePushEnabledDevicesArgs = {
  /** Endpoint (web push) or FCM token of this device's subscription, if any. */
  getCurrentEndpoint: () => Promise<string | null | undefined>;
  /** Drop this device's local push registration after its row is deleted. */
  unsubscribeCurrent: () => Promise<void>;
};

export const usePushEnabledDevices = ({
  getCurrentEndpoint,
  unsubscribeCurrent,
}: UsePushEnabledDevicesArgs) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const subscriptionsQuery = openpeepsApi.usePushSubscriptions();
  const deleteSubscription = openpeepsApi.deletePushSubscriptionAction();

  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [status, setStatus] = useState<SettingsStatus>(null);

  const subscriptions = subscriptionsQuery.data ?? [];

  useEffect(() => {
    void getCurrentEndpoint().then((endpoint) => {
      if (endpoint) setCurrentEndpoint(endpoint);
    });
    // Resolve once on mount; the platform getter is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCurrentDevice = (endpoint: string | undefined) =>
    !!endpoint && currentEndpoint === endpoint;

  const remove = async (subscription: PushSubscription) => {
    setStatus(null);
    setDeletingId(subscription.id);
    try {
      await deleteSubscription({ pushSubscriptionId: subscription.id });
      if (isCurrentDevice(subscriptionKey(subscription))) {
        await unsubscribeCurrent();
      }
      setConfirmId(null);
      await subscriptionsQuery.refetch();
      setStatus({
        type: 'success',
        message: t('settings.notifications.pushEnabledDevices.delete.success', {
          defaultValue: 'Device removed.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setDeletingId(null);
    }
  };

  return {
    subscriptions,
    isCurrentDevice,
    isCurrentSubscription: (subscription: PushSubscription) =>
      isCurrentDevice(subscriptionKey(subscription)),
    deletingId,
    confirmId,
    setConfirmId,
    status,
    clearStatus: () => setStatus(null),
    remove,
  };
};
