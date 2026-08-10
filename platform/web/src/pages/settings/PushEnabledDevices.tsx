import { useEffect, useState } from 'react';
import { Laptop, Smartphone, Trash2 } from 'lucide-react';
import type { PushSubscription } from '@openpeepshq/common/types';
import {
  pushSubscriptionDeviceName,
  pushSubscriptionEndpoint,
  pushSubscriptionIsMobile,
} from '@openpeepshq/common/lib';
import {
  getPushSubscription,
  unsubscribePushNotifications,
  useT,
  useOpenpeeps,
  useSetPageHeader,
} from '@openpeepshq/react';
import { Button, Toast } from '@openpeepshq/react-ui';

export function PushEnabledDevices() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const subscriptionsQuery = openpeepsApi.usePushSubscriptions();
  const deleteSubscription = openpeepsApi.deletePushSubscriptionAction();

  useSetPageHeader(
    t('settings.notifications.pushEnabledDevices.title', {
      defaultValue: 'Push-enabled devices',
    }),
  );

  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const subscriptions = subscriptionsQuery.data ?? [];

  useEffect(() => {
    void getPushSubscription().then((sub) => {
      if (sub?.endpoint) setCurrentEndpoint(sub.endpoint);
    });
  }, []);

  const isCurrentDevice = (endpoint: string | undefined) =>
    !!endpoint && currentEndpoint === endpoint;

  const remove = async (subscription: PushSubscription) => {
    setStatus(null);
    setDeletingId(subscription.id);
    try {
      await deleteSubscription({ pushSubscriptionId: subscription.id });
      if (
        isCurrentDevice(pushSubscriptionEndpoint(subscription) ?? undefined)
      ) {
        await unsubscribePushNotifications();
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

  return (
    <div className="p-4">
      {subscriptions.length === 0 ? (
        <div className="flex w-full items-center justify-center p-4">
          <h2 className="text-lg">
            {t('settings.notifications.pushEnabledDevices.noDevicesFound', {
              defaultValue: 'No push-enabled devices found.',
            })}
          </h2>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <ul className="divide-y">
            {subscriptions.map((subscription) => {
              const endpoint = pushSubscriptionEndpoint(subscription) ?? '';
              const current = isCurrentDevice(endpoint);
              const confirming = confirmId === subscription.id;

              return (
                <li
                  key={subscription.id}
                  className="hover:bg-surface-100 flex items-center justify-between p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {pushSubscriptionIsMobile(subscription) ? (
                        <Smartphone size={20} />
                      ) : (
                        <Laptop size={20} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {pushSubscriptionDeviceName(subscription)}
                        </p>
                        {current ? (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                            {t('common.thisDevice', {
                              defaultValue: 'This device',
                            })}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {subscription.type}
                      </p>
                    </div>
                  </div>

                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="variant-filled-error"
                        disabled={deletingId === subscription.id}
                        action={() => remove(subscription)}
                      >
                        {t(
                          'settings.notifications.pushEnabledDevices.delete.confirm',
                          {
                            defaultValue: 'Delete',
                          },
                        )}
                      </Button>
                      <Button
                        variant="variant-ghost-primary"
                        action={() => setConfirmId(null)}
                      >
                        {t(
                          'settings.notifications.pushEnabledDevices.delete.cancel',
                          {
                            defaultValue: 'Cancel',
                          },
                        )}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground p-2 transition-colors hover:text-red-600"
                      title={t('common.actions.delete', {
                        defaultValue: 'Delete',
                      })}
                      onClick={() => setConfirmId(subscription.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
